import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import {
  RecipeStatus,
  type Recipe,
  type RecipeIngredient,
  type RecipeNutritionFact,
  type MiscNutritionFact,
} from '@prisma/client';
import type { Job } from 'bullmq';
import { AiService } from '../ai/ai.service';
import type { RecipeData } from '../ai/ai.types';
import { PrismaService } from '../prisma/prisma.service';

interface RecipeImageGenerationJobData {
  workerId: string;
  timeoutMs?: number;
}

const ALLOWED_STATUSES = new Set<RecipeStatus>([
  RecipeStatus.ERROR,
  RecipeStatus.RECIPE_CREATED,
  RecipeStatus.PROCESSING_IMAGE,
]);

@Injectable()
@Processor('recipe-image-generation')
export class RecipeImageGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(RecipeImageGenerationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {
    super();
  }

  async process(job: Job<RecipeImageGenerationJobData>): Promise<void> {
    const { workerId, timeoutMs = 300000 } = job.data;

    const worker = await this.prisma.recipeWorker.findUnique({
      where: { id: workerId },
      include: {
        recipe: {
          include: {
            ingredients: true,
            nutritionFacts: true,
            miscNutritionFacts: true,
          },
        },
      },
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

    if (worker.recipe == null) {
      this.logger.warn(
        `Worker ${workerId} does not have an associated recipe; skipping job processing.`,
      );
      return;
    }

    const { count: updatedWorkers } = await this.prisma.recipeWorker.updateMany(
      {
        where: {
          id: worker.id,
          status: { in: Array.from(ALLOWED_STATUSES) },
        },
        data: { status: RecipeStatus.PROCESSING_IMAGE },
      },
    );

    if (updatedWorkers === 0) {
      this.logger.warn(
        `Worker ${workerId} status changed before processing; skipping job processing.`,
      );
      return;
    }

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => {
          reject(
            new Error('Recipe image generation timed out after 5 minutes'),
          );
        }, timeoutMs),
      );

      const recipeData = this.buildRecipeData(worker.recipe, worker.prompt);

      await Promise.race([
        this.aiService.generateRecipeImage(worker.recipe.id, recipeData),
        timeoutPromise,
      ]);

      await this.prisma.recipeWorker.update({
        where: { id: worker.id },
        data: { status: RecipeStatus.READY },
      });
    } catch (error: unknown) {
      await this.prisma.recipeWorker.update({
        where: { id: worker.id },
        data: { status: RecipeStatus.ERROR },
      });

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to generate recipe image for worker ${worker.id}: ${errorMessage}`,
      );

      throw error;
    }
  }

  private buildRecipeData(
    recipe: RecipeWithDetails,
    prompt: string,
  ): RecipeData {
    const nutritionFacts = recipe.nutritionFacts.at(0);

    if (nutritionFacts == null) {
      throw new Error(`Recipe ${recipe.id} is missing nutrition facts.`);
    }

    return {
      name: recipe.name,
      prompt,
      description: recipe.description,
      difficulty: recipe.difficulty,
      mealTypes: recipe.mealTypes,
      countriesOfOrigin: recipe.countriesOfOrigin,
      diets: recipe.diets,
      allergies: recipe.allergies,
      proteinType: recipe.proteinType,
      prepTimeMinutes: recipe.prepTimeMinutes,
      cookTimeMinutes: recipe.cookTimeMinutes,
      preparation: recipe.preparation,
      instructions: recipe.instructions,
      servingSize: recipe.servingSize,
      ingredients: recipe.ingredients.map((ingredient) => ({
        name: ingredient.name,
        amount: ingredient.amount,
      })),
      nutritionFacts: {
        calories: Number(nutritionFacts.calories),
        carbs: Number(nutritionFacts.carbs),
        fat: Number(nutritionFacts.fat),
        protein: Number(nutritionFacts.protein),
        fiber: Number(nutritionFacts.fiber),
      },
      miscNutritionFacts: recipe.miscNutritionFacts.map((fact) => ({
        label: fact.label,
        value: Number(fact.value),
        unit: fact.unit ?? null,
      })),
    };
  }
}

type RecipeWithDetails = Recipe & {
  ingredients: RecipeIngredient[];
  nutritionFacts: RecipeNutritionFact[];
  miscNutritionFacts: MiscNutritionFact[];
};
