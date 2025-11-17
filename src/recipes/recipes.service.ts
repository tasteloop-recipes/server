import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Recipe,
  RecipeImage,
  RecipeWorker,
  MiscNutritionFact,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RecipesPage } from './models/recipes-page.model';

const MAX_PAGE_SIZE = 50;

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

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

  async findWorker(recipeId: string): Promise<RecipeWorker> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      select: { workerId: true },
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe with id "${recipeId}" not found`);
    }

    const worker = await this.prisma.recipeWorker.findUnique({
      where: { id: recipe.workerId },
    });

    if (!worker) {
      throw new NotFoundException(
        `RecipeWorker with id "${recipe.workerId}" not found`,
      );
    }

    return worker;
  }

  async findMiscNutritionFacts(recipeId: string): Promise<MiscNutritionFact[]> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
    });
    if (!recipe) {
      throw new NotFoundException(`Recipe with id "${recipeId}" not found`);
    }
    return this.prisma.miscNutritionFact.findMany({
      where: { recipeId },
    });
  }

  async findImage(recipeId: string): Promise<RecipeImage | null> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
    });
    if (!recipe) {
      throw new NotFoundException(`Recipe with id "${recipeId}" not found`);
    }
    return this.prisma.recipeImage.findUnique({
      where: { recipeId },
    });
  }
}
