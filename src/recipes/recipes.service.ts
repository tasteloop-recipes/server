import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MealType, Recipe, RecipeDifficulty } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface PaginatedRecipesMeta {
  totalItems: number;
  totalPages: number;
  page: number;
  limit: number;
}

export interface PaginatedRecipes {
  data: Recipe[];
  meta: PaginatedRecipesMeta;
}

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page: number, limit: number): Promise<PaginatedRecipes> {
    const currentLimit = Math.min(limit, 50);
    const skip = (page - 1) * currentLimit;

    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.recipe.findMany({
        skip,
        take: currentLimit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.recipe.count(),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / currentLimit));

    return {
      data,
      meta: {
        totalItems,
        totalPages,
        page,
        limit: currentLimit,
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

  async create(prompt?: string): Promise<Recipe> {
    const trimmedPrompt = prompt?.trim();

    if (trimmedPrompt === undefined || trimmedPrompt === '') {
      throw new BadRequestException('Prompt is required to generate a recipe');
    }

    // Placeholder recipe data; will be replaced with AI-generated content later.
    return this.prisma.recipe.create({
      data: {
        name: 'Generated recipe (pending details)',
        prompt: trimmedPrompt,
        difficulty: RecipeDifficulty.MEDIUM,
        mealTypes: [MealType.DINNER],
        countriesOfOrigin: [],
        diets: [],
        allergies: [],
        proteinType: [],
        prepTimeMinutes: 0,
        cookTimeMinutes: 0,
        description: 'Recipe details will be generated shortly.',
        preparation: [],
        instructions: [],
        servingSize: 'To be determined',
      },
    });
  }
}
