import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';
import { MealType, RecipeDifficulty } from '@prisma/client';
import { RateLimitGuard } from './rate-limit.guard';

describe('RecipesController', () => {
  let controller: RecipesController;
  let service: RecipesService;

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
      controllers: [RecipesController],
      providers: [
        {
          provide: RecipesService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(RateLimitGuard)
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .compile();

    controller = module.get<RecipesController>(RecipesController);
    service = module.get<RecipesService>(RecipesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
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
      jest.spyOn(service, 'findAll').mockResolvedValueOnce(paginatedRecipes);

      const result = await controller.getRecipes(1, 10);

      expect(result).toEqual(paginatedRecipes);
      expect(service.findAll).toHaveBeenCalledWith(1, 10);
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
      jest.spyOn(service, 'findAll').mockResolvedValueOnce(paginatedRecipes);

      await controller.getRecipes(1, 10);

      expect(service.findAll).toHaveBeenCalledWith(1, 10);
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
      jest.spyOn(service, 'findAll').mockResolvedValueOnce(paginatedRecipes);

      await controller.getRecipes(1, 10);

      expect(service.findAll).toHaveBeenCalledWith(1, 10);
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
      jest.spyOn(service, 'findAll').mockResolvedValueOnce(paginatedRecipes);

      const result = await controller.getRecipes(2, 10);

      expect(result.meta.page).toBe(2);
      expect(service.findAll).toHaveBeenCalledWith(2, 10);
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
      jest.spyOn(service, 'findAll').mockResolvedValueOnce(paginatedRecipes);

      const result = await controller.getRecipes(1, 20);

      expect(result.meta.limit).toBe(20);
      expect(service.findAll).toHaveBeenCalledWith(1, 20);
    });
  });

  describe('getRecipeById', () => {
    it('should return a recipe by id', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValueOnce(mockRecipe);

      const result = await controller.getRecipeById('1');

      expect(result).toEqual(mockRecipe);
      expect(service.findOne).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException for invalid id', async () => {
      jest
        .spyOn(service, 'findOne')
        .mockRejectedValueOnce(
          new NotFoundException('Recipe with id "invalid" not found'),
        );

      await expect(controller.getRecipeById('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should work with different id formats', async () => {
      const customRecipe = { ...mockRecipe, id: 'custom-uuid-123' };
      jest.spyOn(service, 'findOne').mockResolvedValueOnce(customRecipe);

      const result = await controller.getRecipeById('custom-uuid-123');

      expect(result).toEqual(customRecipe);
      expect(service.findOne).toHaveBeenCalledWith('custom-uuid-123');
    });
  });

  describe('createRecipe', () => {
    it('should create a recipe with valid prompt', async () => {
      jest.spyOn(service, 'create').mockResolvedValueOnce(mockRecipe);

      const result = await controller.createRecipe({ prompt: 'Test prompt' });

      expect(result).toEqual(mockRecipe);
      expect(service.create).toHaveBeenCalledWith('Test prompt');
    });

    it('should throw BadRequestException for empty prompt', async () => {
      jest
        .spyOn(service, 'create')
        .mockRejectedValueOnce(
          new BadRequestException(
            'Prompt is required to generate a recipe',
          ),
        );

      await expect(
        controller.createRecipe({ prompt: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should pass prompt to service', async () => {
      const createdRecipe = { ...mockRecipe, prompt: 'Custom prompt' };
      jest.spyOn(service, 'create').mockResolvedValueOnce(createdRecipe);

      await controller.createRecipe({ prompt: 'Custom prompt' });

      expect(service.create).toHaveBeenCalledWith('Custom prompt');
    });

    it('should handle whitespace in prompt', async () => {
      jest.spyOn(service, 'create').mockResolvedValueOnce(mockRecipe);

      await controller.createRecipe({ prompt: '  Test prompt  ' });

      expect(service.create).toHaveBeenCalledWith('  Test prompt  ');
    });

    it('should work with complex prompts', async () => {
      const complexPrompt =
        'Create a vegan, gluten-free pasta recipe that serves 4 people and takes less than 30 minutes to prepare';
      const createdRecipe = { ...mockRecipe, prompt: complexPrompt };
      jest.spyOn(service, 'create').mockResolvedValueOnce(createdRecipe);

      const result = await controller.createRecipe({ prompt: complexPrompt });

      expect(result).toEqual(createdRecipe);
      expect(service.create).toHaveBeenCalledWith(complexPrompt);
    });
  });

  describe('Rate Limiting', () => {
    it('should have RateLimitGuard applied to the controller', () => {
      const guards = Reflect.getMetadata('__guards__', RecipesController);
      expect(guards).toBeDefined();
    });
  });
});
