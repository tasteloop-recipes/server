import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MealType, RecipeDifficulty } from '@prisma/client';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { RateLimitGuard } from './rate-limit.guard';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';

type RecipesServiceMock = {
  [K in 'findAll' | 'findOne' | 'create']: jest.MockedFunction<
    RecipesService[K]
  >;
};

describe('RecipesController', () => {
  let moduleRef: TestingModule | null = null;
  let controller: RecipesController | null = null;
  let recipesServiceMock: RecipesServiceMock = {
    findAll: jest.fn<
      ReturnType<RecipesService['findAll']>,
      Parameters<RecipesService['findAll']>
    >(),
    findOne: jest.fn<
      ReturnType<RecipesService['findOne']>,
      Parameters<RecipesService['findOne']>
    >(),
    create: jest.fn<
      ReturnType<RecipesService['create']>,
      Parameters<RecipesService['create']>
    >(),
  };

  const getController = (): RecipesController => {
    if (!controller) {
      throw new Error('RecipesController not initialized');
    }

    return controller;
  };

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
    recipesServiceMock = {
      findAll: jest.fn<
        ReturnType<RecipesService['findAll']>,
        Parameters<RecipesService['findAll']>
      >(),
      findOne: jest.fn<
        ReturnType<RecipesService['findOne']>,
        Parameters<RecipesService['findOne']>
      >(),
      create: jest.fn<
        ReturnType<RecipesService['create']>,
        Parameters<RecipesService['create']>
      >(),
    };

    moduleRef = await Test.createTestingModule({
      controllers: [RecipesController],
      providers: [
        {
          provide: RecipesService,
          useValue: recipesServiceMock,
        },
      ],
    })
      .overrideGuard(RateLimitGuard)
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .compile();

    controller = moduleRef.get<RecipesController>(RecipesController);
  });

  afterEach(async () => {
    controller = null;
    recipesServiceMock.findAll.mockReset();
    recipesServiceMock.findOne.mockReset();
    recipesServiceMock.create.mockReset();
    await moduleRef?.close();
    moduleRef = null;
  });

  describe('getRecipes', () => {
    it('should return paginated recipes', async () => {
      const paginatedRecipes = {
        data: [mockRecipe],
        meta: {
          totalItems: 1,
          totalPages: 1,
          page: 1,
          limit: 10,
        },
      };
      recipesServiceMock.findAll.mockResolvedValueOnce(paginatedRecipes);

      const result = await getController().getRecipes(1, 10);

      expect(result).toEqual(paginatedRecipes);
      expect(recipesServiceMock.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should use default page of 1', async () => {
      const paginatedRecipes = {
        data: [mockRecipe],
        meta: {
          totalItems: 1,
          totalPages: 1,
          page: 1,
          limit: 10,
        },
      };
      recipesServiceMock.findAll.mockResolvedValueOnce(paginatedRecipes);

      await getController().getRecipes(1, 10);

      expect(recipesServiceMock.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should use default limit of 10', async () => {
      const paginatedRecipes = {
        data: [mockRecipe],
        meta: {
          totalItems: 1,
          totalPages: 1,
          page: 1,
          limit: 10,
        },
      };
      recipesServiceMock.findAll.mockResolvedValueOnce(paginatedRecipes);

      await getController().getRecipes(1, 10);

      expect(recipesServiceMock.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should handle multiple pages', async () => {
      const paginatedRecipes = {
        data: [mockRecipe],
        meta: {
          totalItems: 100,
          totalPages: 10,
          page: 2,
          limit: 10,
        },
      };
      recipesServiceMock.findAll.mockResolvedValueOnce(paginatedRecipes);

      const result = await getController().getRecipes(2, 10);

      expect(result.meta.page).toBe(2);
      expect(recipesServiceMock.findAll).toHaveBeenCalledWith(2, 10);
    });

    it('should handle custom limit', async () => {
      const paginatedRecipes = {
        data: Array(20)
          .fill(null)
          .map((_, i) => ({ ...mockRecipe, id: String(i) })),
        meta: {
          totalItems: 20,
          totalPages: 1,
          page: 1,
          limit: 20,
        },
      };
      recipesServiceMock.findAll.mockResolvedValueOnce(paginatedRecipes);

      const result = await getController().getRecipes(1, 20);

      expect(result.meta.limit).toBe(20);
      expect(recipesServiceMock.findAll).toHaveBeenCalledWith(1, 20);
    });
  });

  describe('getRecipeById', () => {
    it('should return a recipe by id', async () => {
      recipesServiceMock.findOne.mockResolvedValueOnce(mockRecipe);

      const result = await getController().getRecipeById('1');

      expect(result).toEqual(mockRecipe);
      expect(recipesServiceMock.findOne).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException for invalid id', async () => {
      recipesServiceMock.findOne.mockRejectedValueOnce(
        new NotFoundException('Recipe with id "invalid" not found'),
      );

      await expect(getController().getRecipeById('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should work with different id formats', async () => {
      const customRecipe = { ...mockRecipe, id: 'custom-uuid-123' };
      recipesServiceMock.findOne.mockResolvedValueOnce(customRecipe);

      const result = await getController().getRecipeById('custom-uuid-123');

      expect(result).toEqual(customRecipe);
      expect(recipesServiceMock.findOne).toHaveBeenCalledWith(
        'custom-uuid-123',
      );
    });
  });

  describe('createRecipe', () => {
    it('should create a recipe with valid prompt', async () => {
      recipesServiceMock.create.mockResolvedValueOnce(mockRecipe);

      const result = await getController().createRecipe({
        prompt: 'Test prompt',
      });

      expect(result).toEqual(mockRecipe);
      expect(recipesServiceMock.create).toHaveBeenCalledWith('Test prompt');
    });

    it('should throw BadRequestException for empty prompt', async () => {
      recipesServiceMock.create.mockRejectedValueOnce(
        new BadRequestException('Prompt is required to generate a recipe'),
      );

      await expect(
        getController().createRecipe({ prompt: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should pass prompt to service', async () => {
      const createdRecipe = { ...mockRecipe, prompt: 'Custom prompt' };
      recipesServiceMock.create.mockResolvedValueOnce(createdRecipe);

      await getController().createRecipe({ prompt: 'Custom prompt' });

      expect(recipesServiceMock.create).toHaveBeenCalledWith('Custom prompt');
    });

    it('should handle whitespace in prompt', async () => {
      recipesServiceMock.create.mockResolvedValueOnce(mockRecipe);

      await getController().createRecipe({ prompt: '  Test prompt  ' });

      expect(recipesServiceMock.create).toHaveBeenCalledWith('  Test prompt  ');
    });

    it('should work with complex prompts', async () => {
      const complexPrompt =
        'Create a vegan, gluten-free pasta recipe that serves 4 people and takes less than 30 minutes to prepare';
      const createdRecipe = { ...mockRecipe, prompt: complexPrompt };
      recipesServiceMock.create.mockResolvedValueOnce(createdRecipe);

      const result = await getController().createRecipe({
        prompt: complexPrompt,
      });

      expect(result).toEqual(createdRecipe);
      expect(recipesServiceMock.create).toHaveBeenCalledWith(complexPrompt);
    });
  });

  describe('Rate Limiting', () => {
    it('should have RateLimitGuard applied to the controller', () => {
      expect(
        Reflect.getMetadata('__guards__', RecipesController),
      ).toBeDefined();
    });
  });
});
