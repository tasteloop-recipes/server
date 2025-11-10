import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MealType, RecipeDifficulty } from '@prisma/client';
import type { Allergy } from '@prisma/client';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { RecipesService } from './recipes.service';

interface ExpectedRecipeCreateData {
  name: string;
  prompt: string;
  difficulty: RecipeDifficulty;
  mealTypes: MealType[];
  countriesOfOrigin: string[];
  diets: string[];
  allergies: Allergy[];
  proteinType: string[];
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  description: string;
  preparation: string[];
  instructions: string[];
  servingSize: string;
}

describe('RecipesService', () => {
  let moduleRef: TestingModule | null = null;
  let service: RecipesService | null = null;
  let transactionMock: jest.Mock = jest.fn();
  let findManyMock: jest.Mock = jest.fn();
  let countMock: jest.Mock = jest.fn();
  let findUniqueMock: jest.Mock = jest.fn();
  let createMock: jest.Mock = jest.fn();

  const getService = (): RecipesService => {
    if (!service) {
      throw new Error('RecipesService not initialized');
    }

    return service;
  };

  const mockRecipe = {
    id: '1',
    name: 'Test Recipe',
    prompt: 'Test prompt',
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

  const buildExpectedRecipeData = (
    prompt: string,
  ): ExpectedRecipeCreateData => ({
    name: 'Generated recipe (pending details)',
    prompt,
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
  });

  beforeEach(async () => {
    transactionMock = jest.fn();
    findManyMock = jest.fn();
    countMock = jest.fn();
    findUniqueMock = jest.fn();
    createMock = jest.fn();

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
              create: createMock,
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

  describe('create', () => {
    it('should create a recipe with valid prompt', async () => {
      const createdRecipe = {
        ...mockRecipe,
        prompt: 'Create a pasta recipe',
      };
      createMock.mockResolvedValueOnce(createdRecipe);

      const result = await getService().create('Create a pasta recipe');

      expect(result).toEqual(createdRecipe);
      expect(createMock).toHaveBeenCalledWith({
        data: buildExpectedRecipeData('Create a pasta recipe'),
      });
    });

    it('should throw BadRequestException when prompt is empty', async () => {
      await expect(getService().create('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when prompt is only whitespace', async () => {
      await expect(getService().create('   ')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when prompt is undefined', async () => {
      await expect(getService().create(undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should include correct error message for empty prompt', async () => {
      await expect(getService().create('')).rejects.toThrow(
        'Prompt is required to generate a recipe',
      );
    });

    it('should trim whitespace from prompt', async () => {
      const createdRecipe = {
        ...mockRecipe,
        prompt: 'Trimmed prompt',
      };
      createMock.mockResolvedValueOnce(createdRecipe);

      await getService().create('  Trimmed prompt  ');

      expect(createMock).toHaveBeenCalledWith({
        data: buildExpectedRecipeData('Trimmed prompt'),
      });
    });

    it('should create recipe with placeholder values', async () => {
      const createdRecipe = mockRecipe;
      createMock.mockResolvedValueOnce(createdRecipe);

      await getService().create('Test prompt');

      expect(createMock).toHaveBeenCalledWith({
        data: buildExpectedRecipeData('Test prompt'),
      });
    });
  });
});
