import { NotFoundException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { MealType, RecipeDifficulty } from '@prisma/client';
import { RecipesResolver } from './recipes.resolver';
import { RecipesService } from './recipes.service';

type RecipesServiceMock = {
  [K in 'findAll' | 'findOne']: jest.MockedFunction<RecipesService[K]>;
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

      const result = await getResolver().recipes({ page: 1, limit: 10 });

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

      const result = await getResolver().recipes({ page: 2, limit: 10 });

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

      const result = await getResolver().recipes({ page: 1, limit: 20 });

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
});
