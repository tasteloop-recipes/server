import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Recipe,
  RecipeImage,
  RecipeIngredient,
  RecipeWorker,
  MiscNutritionFact,
  RecipeStatus,
  Prisma,
  RecipeLogType,
} from '@prisma/client';
import type { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { RecipesPage } from './models/recipes-page.model';
import { AiService } from '../ai/ai.service';
import type { RecipeData } from '../ai/ai.types';
import { normalizeAllergies } from '../common/allergy.util';
import { ModifyRecipeResultDto } from './dto/modify-recipe-result.dto';
import { RecipeLogsService } from '../recipe-logs/recipe-logs.service';

const MAX_PAGE_SIZE = 50;

@Injectable()
export class RecipesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    @InjectQueue('recipe-image-generation')
    private readonly recipeImageQueue: Queue<{ workerId: string }>,
    private readonly recipeLogsService: RecipeLogsService,
  ) {}

  async findAll(page: number, limit: number): Promise<RecipesPage> {
    const calculatedLimit = Math.min(Math.max(limit, 1), MAX_PAGE_SIZE);
    const calculatedPage = Math.max(page, 1);

    const skip = (calculatedPage - 1) * calculatedLimit;

    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.recipe.findMany({
        skip,
        take: calculatedLimit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.recipe.count(),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / calculatedLimit));

    return {
      data,
      meta: {
        totalItems,
        totalPages,
        page: calculatedPage,
        limit: calculatedLimit,
      },
    };
  }

  async findOne(id: string): Promise<Recipe> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe with id "${id}" not found`);
    }

    return recipe;
  }

  async findIngredients(recipeId: string): Promise<RecipeIngredient[]> {
    return this.prisma.recipeIngredient.findMany({
      where: { recipeId },
    });
  }

  async findWorker(recipeId: string): Promise<RecipeWorker> {
    const recipeWithWorker = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      include: { worker: true },
    });

    if (!recipeWithWorker) {
      throw new NotFoundException(`Recipe with id "${recipeId}" not found`);
    }

    const worker = recipeWithWorker.worker as RecipeWorker | null;
    if (!worker) {
      throw new NotFoundException(
        `RecipeWorker for recipe "${recipeId}" not found`,
      );
    }

    return worker;
  }

  async findMiscNutritionFacts(recipeId: string): Promise<MiscNutritionFact[]> {
    return this.prisma.miscNutritionFact.findMany({
      where: { recipeId },
    });
  }

  async findImage(recipeId: string): Promise<RecipeImage | null> {
    return this.prisma.recipeImage.findUnique({
      where: { recipeId },
    });
  }

  async modifyRecipe(
    recipeId: string,
    prompt: string,
  ): Promise<ModifyRecipeResultDto> {
    const sanitizedPrompt = prompt.trim();

    if (!sanitizedPrompt) {
      throw new BadRequestException('Prompt is required to modify a recipe');
    }

    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: true,
        worker: true,
      },
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe with id "${recipeId}" not found`);
    }

    await this.prisma.recipeWorker.update({
      where: { id: recipe.worker.id },
      data: { status: RecipeStatus.PENDING_MODIFICATIONS },
    });

    await this.recipeLogsService.createLog({
      recipeId: recipe.id,
      userId: recipe.authorId ?? undefined,
      type: RecipeLogType.MODIFICATION_REQUESTED,
      message: sanitizedPrompt,
    });

    try {
      const aiPrompt = this.buildModificationPrompt(recipe, sanitizedPrompt);
      const generatedRecipe = await this.aiService.generateRecipeData(aiPrompt);

      await this.replaceRecipeData(recipe.id, generatedRecipe);

      await this.prisma.recipeWorker.update({
        where: { id: recipe.worker.id },
        data: {
          status: RecipeStatus.RECIPE_CREATED,
          prompt: sanitizedPrompt,
        },
      });

      await this.restartImageGenerationQueue(recipe.worker.id);

      await this.recipeLogsService.createLog({
        recipeId: recipe.id,
        userId: recipe.authorId ?? undefined,
        type: RecipeLogType.RECIPE_MODIFIED,
        message: generatedRecipe.descriptionOfUpdates,
      });

      const updatedRecipe = await this.findOne(recipe.id);

      return {
        recipe: updatedRecipe,
        descriptionOfUpdates: generatedRecipe.descriptionOfUpdates,
      };
    } catch (error) {
      await this.prisma.recipeWorker.update({
        where: { id: recipe.worker.id },
        data: { status: RecipeStatus.READY },
      });

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

  private async restartImageGenerationQueue(workerId: string): Promise<void> {
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
