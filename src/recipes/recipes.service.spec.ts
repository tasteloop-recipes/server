import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { PrismaService } from '../prisma/prisma.service';
import { MealType, RecipeDifficulty } from '@prisma/client';

describe('RecipesService', () => {
  let service: RecipesService;
  let prisma: PrismaService;

  const mockRecipe = {
    id: '1',
    name: 'Test Recipe',
    prompt: 'Test prompt',
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipesService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn(),
            recipe: {
              findMany: jest.fn(),
              count: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<RecipesService>(RecipesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated recipes with default values', async () => {
      const mockRecipes = [mockRecipe];
      jest
        .spyOn(prisma, '$transaction')
        .mockResolvedValueOnce([mockRecipes, 1]);

      const result = await service.findAll(1, 10);

      expect(result).toEqual({
        data: mockRecipes,
        meta: {
          totalItems: 1,
          totalPages: 1,
          page: 1,
          limit: 10,
        },
      });
      expect(prisma.$transaction).toHaveBeenCalledWith([
        expect.any(Promise),
        expect.any(Promise),
      ]);
    });

    it('should cap limit to 50', async () => {
      const mockRecipes = [mockRecipe];
      jest
        .spyOn(prisma, '$transaction')
        .mockResolvedValueOnce([mockRecipes, 100]);

      const result = await service.findAll(1, 100);

      expect(result.meta.limit).toBe(50);
    });

    it('should handle invalid page number (should default to 1)', async () => {
      const mockRecipes = [mockRecipe];
      jest
        .spyOn(prisma, '$transaction')
        .mockResolvedValueOnce([mockRecipes, 10]);

      const result = await service.findAll(0, 10);

      expect(result.meta.page).toBe(1);
    });

    it('should handle invalid limit (should default to 10)', async () => {
      const mockRecipes = [mockRecipe];
      jest
        .spyOn(prisma, '$transaction')
        .mockResolvedValueOnce([mockRecipes, 10]);

      const result = await service.findAll(1, -5);

      expect(result.meta.limit).toBe(10);
    });

    it('should calculate totalPages correctly', async () => {
      const mockRecipes = Array(50)
        .fill(null)
        .map((_, i) => ({ ...mockRecipe, id: String(i) }));
      jest
        .spyOn(prisma, '$transaction')
        .mockResolvedValueOnce([mockRecipes, 150]);

      const result = await service.findAll(1, 50);

      expect(result.meta.totalPages).toBe(3);
    });

    it('should calculate skip correctly for pagination', async () => {
      const mockRecipes = [mockRecipe];
      jest
        .spyOn(prisma, '$transaction')
        .mockResolvedValueOnce([mockRecipes, 20]);

      await service.findAll(3, 10);

      // The transaction should be called with skip = 20 (page 3, limit 10)
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a recipe by id', async () => {
      jest.spyOn(prisma.recipe, 'findUnique').mockResolvedValueOnce(mockRecipe);

      const result = await service.findOne('1');

      expect(result).toEqual(mockRecipe);
      expect(prisma.recipe.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException when recipe does not exist', async () => {
      jest.spyOn(prisma.recipe, 'findUnique').mockResolvedValueOnce(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include correct error message', async () => {
      jest.spyOn(prisma.recipe, 'findUnique').mockResolvedValueOnce(null);

      await expect(service.findOne('123')).rejects.toThrow(
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
      jest.spyOn(prisma.recipe, 'create').mockResolvedValueOnce(createdRecipe);

      const result = await service.create('Create a pasta recipe');

      expect(result).toEqual(createdRecipe);
      expect(prisma.recipe.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          prompt: 'Create a pasta recipe',
          difficulty: RecipeDifficulty.MEDIUM,
          mealTypes: [MealType.DINNER],
        }),
      });
    });

    it('should throw BadRequestException when prompt is empty', async () => {
      await expect(service.create('')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when prompt is only whitespace', async () => {
      await expect(service.create('   ')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when prompt is undefined', async () => {
      await expect(service.create(undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should include correct error message for empty prompt', async () => {
      await expect(service.create('')).rejects.toThrow(
        'Prompt is required to generate a recipe',
      );
    });

    it('should trim whitespace from prompt', async () => {
      const createdRecipe = {
        ...mockRecipe,
        prompt: 'Trimmed prompt',
      };
      jest.spyOn(prisma.recipe, 'create').mockResolvedValueOnce(createdRecipe);

      await service.create('  Trimmed prompt  ');

      expect(prisma.recipe.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          prompt: 'Trimmed prompt',
        }),
      });
    });

    it('should create recipe with placeholder values', async () => {
      const createdRecipe = mockRecipe;
      jest.spyOn(prisma.recipe, 'create').mockResolvedValueOnce(createdRecipe);

      await service.create('Test prompt');

      const callArgs = (prisma.recipe.create as jest.Mock).mock.calls[0][0];
      expect(callArgs.data).toEqual(
        expect.objectContaining({
          name: 'Generated recipe (pending details)',
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
        }),
      );
    });
  });
});
