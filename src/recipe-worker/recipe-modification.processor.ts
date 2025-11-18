import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Prisma, RecipeLogType, RecipeStatus } from '@prisma/client';
import type { Queue, Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { RecipeLogsService } from '../recipe-logs/recipe-logs.service';
import { normalizeAllergies } from '../common/allergy.util';
import type { RecipeData } from '../ai/ai.types';

export interface RecipeModificationJobData {
  recipeId: string;
  prompt: string;
}

// Allowed statuses for processing modification jobs (idempotent pattern)
// PENDING_MODIFICATIONS is included to allow retries if the process crashes during modification
const ALLOWED_STATUSES = new Set<RecipeStatus>([
  RecipeStatus.READY,
  RecipeStatus.ERROR,
  RecipeStatus.PENDING_MODIFICATIONS,
]);

@Injectable()
@Processor('recipe-modification')
export class RecipeModificationProcessor extends WorkerHost {
  private readonly logger = new Logger(RecipeModificationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    @InjectQueue('recipe-image-generation')
    private readonly recipeImageQueue: Queue<{ workerId: string }>,
    private readonly recipeLogsService: RecipeLogsService,
  ) {
    super();
  }

  async process(job: Job<RecipeModificationJobData>): Promise<void> {
    const { recipeId, prompt } = job.data;

    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      include: { ingredients: true, worker: true },
    });

    if (!recipe) {
      this.logger.warn(
        `Recipe ${recipeId} not found, skipping modification job.`,
      );
      return;
    }

    const { worker } = recipe;
    const workerId = worker.id;

    // Validate worker status before processing
    if (!ALLOWED_STATUSES.has(worker.status)) {
      this.logger.warn(
        `Worker ${workerId} is in status ${worker.status}; skipping job processing.`,
      );
      return;
    }

    // Atomically update status to PENDING_MODIFICATIONS to prevent concurrent processing
    // This also serves as an idempotent check - if another instance updates first, count will be 0
    const { count: updatedWorkers } = await this.prisma.recipeWorker.updateMany(
      {
        where: {
          id: worker.id,
          status: { in: Array.from(ALLOWED_STATUSES) },
        },
        data: { status: RecipeStatus.PENDING_MODIFICATIONS },
      },
    );

    if (updatedWorkers === 0) {
      this.logger.warn(
        `Worker ${workerId} status changed before processing; skipping job processing.`,
      );
      return;
    }

    try {
      const aiPrompt = this.buildModificationPrompt(recipe, prompt);
      const generatedRecipe = await this.aiService.generateRecipeData(aiPrompt);

      await this.replaceRecipeData(recipe.id, generatedRecipe);

      await this.prisma.recipeWorker.update({
        where: { id: workerId },
        data: {
          status: RecipeStatus.RECIPE_CREATED,
          prompt,
        },
      });

      await this.enqueueImageGenerationJob(workerId);

      await this.recipeLogsService.createLog({
        recipeId: recipe.id,
        ...(recipe.authorId != null ? { userId: recipe.authorId } : {}),
        type: RecipeLogType.RECIPE_MODIFIED,
        message: generatedRecipe.descriptionOfUpdates,
      });
    } catch (error: unknown) {
      // Set status to ERROR instead of READY to preserve error state
      // This allows for visibility into what failed and prevents accidental reprocessing
      await this.prisma.recipeWorker.update({
        where: { id: workerId },
        data: { status: RecipeStatus.ERROR },
      });

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to modify recipe ${recipeId} for worker ${workerId}: ${errorMessage}`,
      );
      throw error;
    }
  }

  private buildModificationPrompt(
    recipe: Prisma.RecipeGetPayload<{ include: { ingredients: true } }>,
    userPrompt: string,
  ): string {
    const ingredientDetails = recipe.ingredients
      .map((ingredient) => `- ${ingredient.name}: ${ingredient.amount}`)
      .join('\n');

    return [
      'You are updating an existing recipe. Adjust the dish based on the user request while keeping instructions concise and safe.',
      `Current recipe: ${recipe.name}`,
      `Description: ${recipe.description}`,
      'Ingredients:',
      ingredientDetails || '- No ingredients listed.',
      'User request for modifications:',
      userPrompt,
    ].join('\n\n');
  }

  private async replaceRecipeData(
    recipeId: string,
    recipeData: RecipeData,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.recipeIngredient.deleteMany({ where: { recipeId } });
      await tx.recipeNutritionFact.deleteMany({ where: { recipeId } });
      await tx.miscNutritionFact.deleteMany({ where: { recipeId } });

      const { nutritionFacts } = recipeData;

      await tx.recipe.update({
        where: { id: recipeId },
        data: {
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
        },
      });

      await tx.recipeIngredient.createMany({
        data: recipeData.ingredients.map((ingredient) => ({
          recipeId,
          name: ingredient.name,
          amount: ingredient.amount,
        })),
      });

      await tx.recipeNutritionFact.create({
        data: {
          recipeId,
          calories: nutritionFacts.calories,
          carbs: nutritionFacts.carbs,
          fat: nutritionFacts.fat,
          protein: nutritionFacts.protein,
          fiber: nutritionFacts.fiber,
        },
      });

      if (recipeData.miscNutritionFacts.length > 0) {
        await tx.miscNutritionFact.createMany({
          data: recipeData.miscNutritionFacts.map((fact) => ({
            recipeId,
            label: fact.label,
            value: fact.value,
            unit: fact.unit ?? null,
          })),
        });
      }
    });
  }

  private async enqueueImageGenerationJob(workerId: string): Promise<void> {
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
  }
}
