import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { RecipeLogType, RecipeStatus, type Prisma } from '@prisma/client';
import type { Job } from 'bullmq';
import type { Queue } from 'bullmq';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { createTimeoutGuard } from '../common/timeout.util';
import { normalizeAllergies } from '../common/allergy.util';
import { RecipeLogsService } from '../recipe-logs/recipe-logs.service';

export interface RecipeGenerationJobData {
  workerId: string;
  timeoutMs?: number;
}

const ALLOWED_STATUSES = new Set<RecipeStatus>([
  RecipeStatus.CREATED,
  RecipeStatus.ERROR,
  RecipeStatus.PROCESSING_RECIPE,
]);

// Default timeout for recipe generation jobs (5 minutes, in milliseconds)
const DEFAULT_TIMEOUT_MS = 300000;

@Injectable()
@Processor('recipe-generation')
export class RecipeGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(RecipeGenerationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    @InjectQueue('recipe-image-generation')
    private readonly recipeImageQueue: Queue<{ workerId: string }>,
    private readonly recipeLogsService: RecipeLogsService,
  ) {
    super();
  }

  async process(job: Job<RecipeGenerationJobData>): Promise<void> {
    const { workerId, timeoutMs = DEFAULT_TIMEOUT_MS } = job.data;

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

    const timeoutGuard = createTimeoutGuard(
      timeoutMs,
      () =>
        new Error(
          `Recipe generation timed out after ${timeoutMs / 60000} minutes`,
        ),
    );

    try {
      const recipeData = await Promise.race([
        this.aiService.generateRecipeData(worker.prompt),
        timeoutGuard.promise,
      ]);

      const createdRecipe = await this.prisma.$transaction(async (tx) => {
        const existingRecipeId = worker.recipe?.id;
        if (existingRecipeId != null) {
          await tx.recipe.delete({ where: { id: existingRecipeId } });
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
          allergies: normalizeAllergies(recipeData.allergies),
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

        return tx.recipe.create({
          data: recipeCreateInput,
        });
      });

      await this.recipeLogsService.createLog({
        recipeId: createdRecipe.id,
        ...(createdRecipe.authorId != null
          ? { userId: createdRecipe.authorId }
          : {}),
        type: RecipeLogType.RECIPE_CREATED,
        message: recipeData.descriptionOfUpdates,
      });

      await this.prisma.recipeWorker.update({
        where: { id: worker.id },
        data: { status: RecipeStatus.RECIPE_CREATED },
      });

      await this.enqueueImageGenerationJob(worker.id);
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        await this.prisma.recipeWorker.update({
          where: { id: worker.id },
          data: { status: RecipeStatus.INVALID },
        });
        this.logger.warn(
          `Worker ${worker.id} prompt rejected: ${error.message}`,
        );
        return;
      }

      await this.prisma.recipeWorker.update({
        where: { id: worker.id },
        data: { status: RecipeStatus.ERROR },
      });

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to generate recipe for worker ${worker.id}: ${errorMessage}`,
      );

      throw error;
    } finally {
      timeoutGuard.cancel();
    }
  }

  private async enqueueImageGenerationJob(workerId: string): Promise<void> {
    try {
      await this.recipeImageQueue.add(
        'generate-recipe-image',
        { workerId },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    } catch (error: unknown) {
      await this.prisma.recipeWorker.update({
        where: { id: workerId },
        data: { status: RecipeStatus.ERROR },
      });

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to enqueue image generation for worker ${workerId}: ${errorMessage}`,
      );

      throw error;
    }
  }
}
