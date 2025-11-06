import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MealType, Recipe, RecipeDifficulty } from '@prisma/client';
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
