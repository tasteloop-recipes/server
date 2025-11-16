import { Processor, WorkerHost } from '@nestjs/bullmq';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Allergy, RecipeStatus, type Prisma } from '@prisma/client';
import type { Job } from 'bullmq';
import { AiService } from '../ai/ai.service';
import { recipeResponseFormat } from '../ai/ai.types';
import { PrismaService } from '../prisma/prisma.service';
import { PubSubService } from '../pubsub/pubsub.service';
import {
  RECIPES_UPDATED_EVENT,
  RECIPE_UPDATED_EVENT,
  WORKERS_UPDATED_EVENT,
} from '../pubsub/pubsub.constants';

interface RecipeGenerationJobData {
  workerId: string;
  timeoutMs?: number;
}

const ALLOWED_STATUSES = new Set<RecipeStatus>([
  RecipeStatus.CREATED,
  RecipeStatus.ERROR,
  RecipeStatus.PROCESSING_RECIPE,
]);

const allergyLookup = new Map<string, Allergy>(
  Object.values(Allergy).map((value) => [value.toUpperCase(), value]),
);

@Injectable()
@Processor('recipe-generation')
export class RecipeGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(RecipeGenerationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly pubSub: PubSubService,
  ) {
    super();
  }

  async process(job: Job<RecipeGenerationJobData>): Promise<void> {
    const { workerId, timeoutMs = 300000 } = job.data; // 5 minutes default

    const worker = await this.prisma.recipeWorker.findUnique({
      where: { id: workerId },
      include: { recipe: true },
    });

    if (worker == null) {
      this.logger.warn(`Worker ${workerId} not found, discarding job.`);
      return;
    }

    if (!ALLOWED_STATUSES.has(worker.status)) {
      this.logger.warn(
        `Worker ${workerId} is in status ${worker.status}; skipping job processing.`,
      );
      return;
    }

    const { count: updatedWorkers } = await this.prisma.recipeWorker.updateMany(
      {
        where: {
          id: worker.id,
          status: { in: Array.from(ALLOWED_STATUSES) },
        },
        data: { status: RecipeStatus.PROCESSING_RECIPE },
      },
    );

    if (updatedWorkers === 0) {
      this.logger.warn(
        `Worker ${workerId} status changed before processing; skipping job processing.`,
      );
      return;
    }

    await this.publishWorkerStatus(worker.id, RecipeStatus.PROCESSING_RECIPE);

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => {
          reject(new Error('Recipe generation timed out after 5 minutes'));
        }, timeoutMs),
      );

      const recipeData = await Promise.race<
        typeof recipeResponseFormat.__output
      >([this.aiService.generateRecipeData(worker.prompt), timeoutPromise]);

      const recipe = await this.prisma.$transaction(async (tx) => {
        if (worker.recipe) {
          await tx.recipe.delete({ where: { id: worker.recipe.id } });
        }

        const { nutritionFacts } = recipeData;
        const miscFacts = recipeData.miscNutritionFacts;

        const recipeCreateInput: Prisma.RecipeCreateInput = {
          name: recipeData.name,
          description: recipeData.description,
          difficulty: recipeData.difficulty,
          mealTypes: recipeData.mealTypes,
          countriesOfOrigin: recipeData.countriesOfOrigin,
          diets: recipeData.diets,
          allergies: this.normalizeAllergies(recipeData.allergies),
          proteinType: recipeData.proteinType,
          prepTimeMinutes: recipeData.prepTimeMinutes,
          cookTimeMinutes: recipeData.cookTimeMinutes,
          preparation: recipeData.preparation,
          instructions: recipeData.instructions,
          servingSize: recipeData.servingSize,
          worker: { connect: { id: worker.id } },
          ingredients: {
            create: recipeData.ingredients.map((ingredient) => ({
              name: ingredient.name,
              amount: ingredient.amount,
            })),
          },
          nutritionFacts: {
            create: {
              calories: nutritionFacts.calories,
              carbs: nutritionFacts.carbs,
              fat: nutritionFacts.fat,
              protein: nutritionFacts.protein,
              fiber: nutritionFacts.fiber,
            },
          },
          miscNutritionFacts: {
            create: miscFacts.map((misc) => ({
              label: misc.label,
              value: misc.value,
              unit: misc.unit ?? null,
            })),
          },
        };

        return tx.recipe.create({ data: recipeCreateInput });
      });

      await this.publishRecipeUpdates(recipe.id);

      const updatedWorker = await this.prisma.recipeWorker.update({
        where: { id: worker.id },
        data: { status: RecipeStatus.RECIPE_CREATED },
      });

      await this.publishWorkerStatus(updatedWorker.id, updatedWorker.status);
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        const invalidWorker = await this.prisma.recipeWorker.update({
          where: { id: worker.id },
          data: { status: RecipeStatus.INVALID },
        });
        await this.publishWorkerStatus(invalidWorker.id, invalidWorker.status);
        this.logger.warn(
          `Worker ${worker.id} prompt rejected: ${error.message}`,
        );
        return;
      }

      const erroredWorker = await this.prisma.recipeWorker.update({
        where: { id: worker.id },
        data: { status: RecipeStatus.ERROR },
      });

      await this.publishWorkerStatus(erroredWorker.id, erroredWorker.status);

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to generate recipe for worker ${worker.id}: ${errorMessage}`,
      );

      throw error;
    }
  }

  private async publishWorkerStatus(
    workerId: string,
    status: RecipeStatus,
  ): Promise<void> {
    await this.pubSub.publish(WORKERS_UPDATED_EVENT, { workerId, status });
  }

  private async publishRecipeUpdates(recipeId: string): Promise<void> {
    await Promise.all([
      this.pubSub.publish(RECIPES_UPDATED_EVENT, { recipeId }),
      this.pubSub.publish(RECIPE_UPDATED_EVENT, { recipeId }),
    ]);
  }

  private normalizeAllergies(values: string[]): Allergy[] {
    const normalized = new Set<Allergy>();

    for (const value of values) {
      const formatted = value.trim().toUpperCase().replace(/\s+/g, '_');
      const match = allergyLookup.get(formatted);

      if (match) {
        normalized.add(match);
      }
    }

    return [...normalized];
  }
}
