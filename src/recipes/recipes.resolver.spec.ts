import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { MealType, RecipeDifficulty } from '@prisma/client';
import type { CreateRecipeInput } from './dto/create-recipe.input';
import { RecipesResolver } from './recipes.resolver';
import { RecipesService } from './recipes.service';

type RecipesServiceMock = {
  [K in 'findAll' | 'findOne' | 'create']: jest.MockedFunction<
    RecipesService[K]
  >;
};

describe('RecipesResolver', () => {
  let moduleRef: TestingModule | null = null;
  let resolver: RecipesResolver | null = null;
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

  const getResolver = (): RecipesResolver => {
    if (!resolver) {
      throw new Error('RecipesResolver not initialized');
    }

    return resolver;
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
      providers: [
        RecipesResolver,
        {
          provide: RecipesService,
          useValue: recipesServiceMock,
        },
      ],
    }).compile();

    resolver = moduleRef.get<RecipesResolver>(RecipesResolver);
  });

  afterEach(async () => {
    resolver = null;
    recipesServiceMock.findAll.mockReset();
    recipesServiceMock.findOne.mockReset();
    recipesServiceMock.create.mockReset();
    await moduleRef?.close();
    moduleRef = null;
  });

  describe('recipes query', () => {
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

      const result = await getResolver().recipes(1, 10);

      expect(result).toEqual(paginatedRecipes);
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

      const result = await getResolver().recipes(2, 10);

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

      const result = await getResolver().recipes(1, 20);

      expect(result.meta.limit).toBe(20);
      expect(recipesServiceMock.findAll).toHaveBeenCalledWith(1, 20);
    });
  });

  describe('recipe query', () => {
    it('should return a recipe by id', async () => {
      recipesServiceMock.findOne.mockResolvedValueOnce(mockRecipe);

      const result = await getResolver().recipe('1');

      expect(result).toEqual(mockRecipe);
      expect(recipesServiceMock.findOne).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException for invalid id', async () => {
      recipesServiceMock.findOne.mockRejectedValueOnce(
        new NotFoundException('Recipe with id "invalid" not found'),
      );

      await expect(getResolver().recipe('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should work with different id formats', async () => {
      const customRecipe = { ...mockRecipe, id: 'custom-uuid-123' };
      recipesServiceMock.findOne.mockResolvedValueOnce(customRecipe);

      const result = await getResolver().recipe('custom-uuid-123');

      expect(result).toEqual(customRecipe);
      expect(recipesServiceMock.findOne).toHaveBeenCalledWith(
        'custom-uuid-123',
      );
    });
  });

  describe('createRecipe mutation', () => {
    it('should create a recipe with valid prompt', async () => {
      recipesServiceMock.create.mockResolvedValueOnce(mockRecipe);

      const input: CreateRecipeInput = { prompt: 'Test prompt' };
      const result = await getResolver().createRecipe(input);

      expect(result).toEqual(mockRecipe);
      expect(recipesServiceMock.create).toHaveBeenCalledWith('Test prompt');
    });

    it('should throw BadRequestException for empty prompt', async () => {
      recipesServiceMock.create.mockRejectedValueOnce(
        new BadRequestException('Prompt is required to generate a recipe'),
      );

      await expect(getResolver().createRecipe({ prompt: '' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should pass prompt to service', async () => {
      const createdRecipe = { ...mockRecipe, prompt: 'Custom prompt' };
      recipesServiceMock.create.mockResolvedValueOnce(createdRecipe);

      await getResolver().createRecipe({ prompt: 'Custom prompt' });

      expect(recipesServiceMock.create).toHaveBeenCalledWith('Custom prompt');
    });

    it('should handle whitespace in prompt', async () => {
      recipesServiceMock.create.mockResolvedValueOnce(mockRecipe);

      await getResolver().createRecipe({ prompt: '  Test prompt  ' });

      expect(recipesServiceMock.create).toHaveBeenCalledWith('  Test prompt  ');
    });

    it('should work with complex prompts', async () => {
      const complexPrompt =
        'Create a vegan, gluten-free pasta recipe that serves 4 people and takes less than 30 minutes to prepare';
      const createdRecipe = { ...mockRecipe, prompt: complexPrompt };
      recipesServiceMock.create.mockResolvedValueOnce(createdRecipe);

      const result = await getResolver().createRecipe({
        prompt: complexPrompt,
      });

      expect(result).toEqual(createdRecipe);
      expect(recipesServiceMock.create).toHaveBeenCalledWith(complexPrompt);
    });
  });
});
