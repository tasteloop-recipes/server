import { NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { MealType, RecipeDifficulty } from '@prisma/client';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { RecipesService } from './recipes.service';

describe('RecipesService', () => {
  let moduleRef: TestingModule | null = null;
  let service: RecipesService | null = null;
  let transactionMock: jest.Mock = jest.fn();
  let findManyMock: jest.Mock = jest.fn();
  let countMock: jest.Mock = jest.fn();
  let findUniqueMock: jest.Mock = jest.fn();
  let findRecipeImageMock: jest.Mock = jest.fn();
  let findUniqueWorkerMock: jest.Mock = jest.fn();
  let findMiscNutritionFactMock: jest.Mock = jest.fn();

  const getService = (): RecipesService => {
    if (!service) {
      throw new Error('RecipesService not initialized');
    }

    return service;
  };

  const mockRecipe = {
    id: '1',
    name: 'Test Recipe',
    authorId: null,
    difficulty: RecipeDifficulty.MEDIUM,
    mealTypes: [MealType.DINNER],
    countriesOfOrigin: [],
    diets: [],
    allergies: [],
    proteinType: [],
    prepTimeMinutes: 30,
    cookTimeMinutes: 45,
    description: 'Test description',
    preparation: [],
    instructions: [],
    servingSize: '4 servings',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    transactionMock = jest.fn();
    findManyMock = jest.fn();
    countMock = jest.fn();
    findUniqueMock = jest.fn();
    findRecipeImageMock = jest.fn();
    findUniqueWorkerMock = jest.fn();
    findMiscNutritionFactMock = jest.fn();

    moduleRef = await Test.createTestingModule({
      providers: [
        RecipesService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: transactionMock,
            recipe: {
              findMany: findManyMock,
              count: countMock,
              findUnique: findUniqueMock,
            },
            recipeImage: {
              findUnique: findRecipeImageMock,
            },
            recipeWorker: {
              findUnique: findUniqueWorkerMock,
            },
            miscNutritionFact: {
              findMany: findMiscNutritionFactMock,
            },
          },
        },
      ],
    }).compile();

    service = moduleRef.get<RecipesService>(RecipesService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    service = null;
    await moduleRef?.close();
    moduleRef = null;
  });

  describe('findAll', () => {
    it('should return paginated recipes with default values', async () => {
      const mockRecipes = [mockRecipe];
      transactionMock.mockResolvedValueOnce([mockRecipes, 1]);

      const result = await getService().findAll(1, 10);

      expect(result).toEqual({
        data: mockRecipes,
        meta: {
          totalItems: 1,
          totalPages: 1,
          page: 1,
          limit: 10,
        },
      });
      expect(transactionMock).toHaveBeenCalledTimes(1);
    });

    it('should calculate totalPages correctly', async () => {
      const MOCK_RECIPE_PAGE_SIZE = 50;
      const mockRecipes = Array(MOCK_RECIPE_PAGE_SIZE)
        .fill(null)
        .map((_, i) => ({ ...mockRecipe, id: String(i) }));
      transactionMock.mockResolvedValueOnce([mockRecipes, 150]);

      const result = await getService().findAll(1, MOCK_RECIPE_PAGE_SIZE);

      expect(result.meta.totalPages).toBe(3);
    });

    const TOTAL_RECIPES_COUNT = 20;
    it('should calculate skip correctly for pagination', async () => {
      const mockRecipes = [mockRecipe];
      transactionMock.mockResolvedValueOnce([mockRecipes, TOTAL_RECIPES_COUNT]);
      findManyMock.mockResolvedValueOnce(mockRecipes);

      await getService().findAll(3, 10);

      expect(findManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: (3 - 1) * 10,
          take: 10,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a recipe by id', async () => {
      findUniqueMock.mockResolvedValueOnce(mockRecipe);

      const result = await getService().findOne('1');

      expect(result).toEqual(mockRecipe);
      expect(findUniqueMock).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException when recipe does not exist', async () => {
      findUniqueMock.mockResolvedValueOnce(null);

      await expect(getService().findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include correct error message', async () => {
      findUniqueMock.mockResolvedValueOnce(null);

      await expect(getService().findOne('123')).rejects.toThrow(
        'Recipe with id "123" not found',
      );
    });
  });

  describe('findImage', () => {
    it('should return image for recipe id', async () => {
      const recipeId = 'recipe-1';
      const image = { id: 'img-1' };
      findRecipeImageMock.mockResolvedValueOnce(image);

      const result = await getService().findImage(recipeId);

      expect(result).toEqual(image);
      expect(findRecipeImageMock).toHaveBeenCalledWith({
        where: { recipeId },
      });
    });
  });

  describe('findWorker', () => {
    it('should return worker for recipe id', async () => {
      const recipeId = 'recipe-1';
      const workerId = 'worker-1';
      const mockWorker = { id: workerId, name: 'Test Worker' };

      findUniqueMock.mockResolvedValueOnce({ workerId });
      findUniqueWorkerMock.mockResolvedValueOnce(mockWorker);

      const result = await getService().findWorker(recipeId);

      expect(result).toEqual(mockWorker);
      expect(findUniqueMock).toHaveBeenCalledWith({
        where: { id: recipeId },
        select: { workerId: true },
      });
      expect(findUniqueWorkerMock).toHaveBeenCalledWith({
        where: { id: workerId },
      });
    });

    it('should throw NotFoundException when recipe does not exist', async () => {
      const recipeId = 'nonexistent-recipe';
      findUniqueMock.mockResolvedValueOnce(null);

      await expect(getService().findWorker(recipeId)).rejects.toThrow(
        NotFoundException,
      );
      expect(findUniqueMock).toHaveBeenCalledWith({
        where: { id: recipeId },
        select: { workerId: true },
      });
      expect(findUniqueWorkerMock).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException with correct message when recipe not found', async () => {
      const recipeId = 'recipe-123';
      findUniqueMock.mockResolvedValueOnce(null);

      await expect(getService().findWorker(recipeId)).rejects.toThrow(
        `Recipe with id "${recipeId}" not found`,
      );
    });

    it('should throw NotFoundException when worker does not exist', async () => {
      const recipeId = 'recipe-1';
      const workerId = 'worker-1';

      findUniqueMock.mockResolvedValueOnce({ workerId });
      findUniqueWorkerMock.mockResolvedValueOnce(null);

      await expect(getService().findWorker(recipeId)).rejects.toThrow(
        NotFoundException,
      );
      expect(findUniqueWorkerMock).toHaveBeenCalledWith({
        where: { id: workerId },
      });
    });

    it('should throw NotFoundException with correct message when worker not found', async () => {
      const recipeId = 'recipe-1';
      const workerId = 'worker-123';

      findUniqueMock.mockResolvedValueOnce({ workerId });
      findUniqueWorkerMock.mockResolvedValueOnce(null);

      await expect(getService().findWorker(recipeId)).rejects.toThrow(
        `RecipeWorker with id "${workerId}" not found`,
      );
    });
  });

  describe('findMiscNutritionFacts', () => {
    it('should return nutrition facts for recipe id', async () => {
      const recipeId = 'recipe-1';
      const nutritionFacts = [
        {
          id: 'fact-1',
          recipeId,
          label: 'Calories',
          value: new Decimal('100.50'),
          unit: 'kcal',
        },
        {
          id: 'fact-2',
          recipeId,
          label: 'Protein',
          value: new Decimal('25.00'),
          unit: 'g',
        },
      ];
      findMiscNutritionFactMock.mockResolvedValueOnce(nutritionFacts);

      const result = await getService().findMiscNutritionFacts(recipeId);

      expect(result).toEqual(nutritionFacts);
      expect(findMiscNutritionFactMock).toHaveBeenCalledWith({
        where: { recipeId },
      });
    });

    it('should return empty array when no nutrition facts exist', async () => {
      const recipeId = 'recipe-1';
      findMiscNutritionFactMock.mockResolvedValueOnce([]);

      const result = await getService().findMiscNutritionFacts(recipeId);

      expect(result).toEqual([]);
      expect(findMiscNutritionFactMock).toHaveBeenCalledWith({
        where: { recipeId },
      });
    });
  });
});
