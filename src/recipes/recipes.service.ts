import { Injectable, NotFoundException } from '@nestjs/common';
import { Recipe, RecipeImage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RecipesPage } from './models/recipes-page.model';

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page: number, limit: number): Promise<RecipesPage> {
    const calculatedLimit = Math.min(Math.max(limit, 1), 50);
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

  async findImage(recipeId: string): Promise<RecipeImage | null> {
    return this.prisma.recipeImage.findUnique({
      where: { recipeId },
    });
  }
}
