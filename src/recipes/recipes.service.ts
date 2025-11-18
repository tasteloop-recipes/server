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
  RecipeLogType,
} from '@prisma/client';
import type { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { RecipesPage } from './models/recipes-page.model';
import { RecipeLogsService } from '../recipe-logs/recipe-logs.service';
import type { RecipeModificationJobData } from '../recipe-worker/recipe-modification.processor';

const MAX_PAGE_SIZE = 50;

@Injectable()
export class RecipesService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('recipe-modification')
    private readonly recipeModificationQueue: Queue<RecipeModificationJobData>,
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

  async modifyRecipe(recipeId: string, prompt: string): Promise<Recipe> {
    const sanitizedPrompt = prompt.trim();

    if (!sanitizedPrompt) {
      throw new BadRequestException('Prompt is required to modify a recipe');
    }

    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        worker: true,
      },
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe with id "${recipeId}" not found`);
    }

    const worker = recipe.worker as RecipeWorker | null;
    if (!worker) {
      throw new NotFoundException(
        `RecipeWorker for recipe "${recipeId}" not found`,
      );
    }

    await this.prisma.recipeWorker.update({
      where: { id: worker.id },
      data: { status: RecipeStatus.PENDING_MODIFICATIONS },
    });

    await this.recipeLogsService.createLog({
      recipeId: recipe.id,
      ...(recipe.authorId != null ? { userId: recipe.authorId } : {}),
      type: RecipeLogType.MODIFICATION_REQUESTED,
      message: sanitizedPrompt,
    });

    try {
      await this.recipeModificationQueue.add(
        'modify-recipe',
        {
          recipeId: recipe.id,
          prompt: sanitizedPrompt,
        },
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
    } catch (error) {
      await this.prisma.recipeWorker.update({
        where: { id: worker.id },
        data: { status: RecipeStatus.READY },
      });
      throw error;
    }

    return recipe;
  }
}
