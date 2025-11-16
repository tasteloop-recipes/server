import { NotFoundException } from '@nestjs/common';
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
      const mockRecipes = Array(50)
        .fill(null)
        .map((_, i) => ({ ...mockRecipe, id: String(i) }));
      transactionMock.mockResolvedValueOnce([mockRecipes, 150]);

      const result = await getService().findAll(1, 50);

      expect(result.meta.totalPages).toBe(3);
    });

    it('should calculate skip correctly for pagination', async () => {
      const mockRecipes = [mockRecipe];
      transactionMock.mockResolvedValueOnce([mockRecipes, 20]);
      findManyMock.mockResolvedValueOnce(mockRecipes);

      await getService().findAll(3, 10);

      expect(findManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
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
});
