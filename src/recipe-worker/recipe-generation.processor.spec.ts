import { BadRequestException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { RecipeStatus } from '@prisma/client';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { Job } from 'bullmq';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  RecipeGenerationProcessor,
  type RecipeGenerationJobData,
} from './recipe-generation.processor';

describe('RecipeGenerationProcessor', () => {
  let moduleRef: TestingModule | null = null;
  let processor: RecipeGenerationProcessor | null = null;
  // Mocks
  let updateManyMock: jest.Mock = jest.fn();
  let findUniqueMock: jest.Mock = jest.fn();
  let updateMock: jest.Mock = jest.fn();
  let transactionMock: jest.Mock = jest.fn();
  let generateRecipeDataMock: jest.Mock = jest.fn();

  type TransactionCallback = (tx: {
    recipe: {
      delete: jest.Mock;
      create?: jest.Mock;
    };
    recipeWorker: {
      update: jest.Mock;
    };
  }) => Promise<void> | void;

  const isJobLike = (value: unknown): value is Job<RecipeGenerationJobData> => {
    return typeof value === 'object' && value !== null && 'data' in value;
  };

  const createJob = (
    data: RecipeGenerationJobData,
  ): Job<RecipeGenerationJobData> => {
    const job: unknown = { data };

    if (!isJobLike(job)) {
      throw new Error('Invalid job data');
    }

    return job;
  };

  const getProcessor = (): RecipeGenerationProcessor => {
    if (!processor) {
      throw new Error('RecipeGenerationProcessor not initialized');
    }
    return processor;
  };

  const mockRecipeData = {
    name: 'Test Recipe',
    description: 'Test description',
    difficulty: 'MEDIUM',
    mealTypes: ['DINNER'],
    countriesOfOrigin: ['USA'],
    diets: [],
    allergies: ['PEANUTS'],
    proteinType: ['CHICKEN'],
    prepTimeMinutes: 20,
    cookTimeMinutes: 30,
    preparation: ['Step 1', 'Step 2'],
    instructions: ['Instruction 1', 'Instruction 2'],
    servingSize: '4 servings',
    ingredients: [
      { name: 'Chicken', amount: '500g' },
      { name: 'Salt', amount: '1 tsp' },
    ],
    nutritionFacts: {
      calories: 500,
      carbs: 50,
      fat: 15,
      protein: 40,
      fiber: 3,
    },
    miscNutritionFacts: [{ label: 'Sodium', value: '300', unit: 'mg' }],
  };

  const mockWorker = {
    id: 'worker-1',
    prompt: 'Generate a recipe',
    status: RecipeStatus.CREATED,
    recipe: null,
  };

  beforeEach(async () => {
    updateManyMock = jest.fn();
    findUniqueMock = jest.fn();
    updateMock = jest.fn();
    transactionMock = jest.fn();
    generateRecipeDataMock = jest.fn();

    moduleRef = await Test.createTestingModule({
      providers: [
        RecipeGenerationProcessor,
        {
          provide: PrismaService,
          useValue: {
            recipeWorker: {
              findUnique: findUniqueMock,
              updateMany: updateManyMock,
              update: updateMock,
            },
            $transaction: transactionMock,
            recipe: {
              delete: jest.fn(),
              create: jest.fn(),
            },
            miscNutritionFacts: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: AiService,
          useValue: {
            generateRecipeData: generateRecipeDataMock,
          },
        },
        {
          provide: getQueueToken('recipe-image-generation'),
          useValue: {
            add: jest.fn(),
          },
        },
      ],
    }).compile();

    processor = moduleRef.get<RecipeGenerationProcessor>(
      RecipeGenerationProcessor,
    );
  });

  afterEach(async () => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    processor = null;
    await moduleRef?.close();
    moduleRef = null;
  });

  describe('process', () => {
    it('should return early if worker not found', async () => {
      findUniqueMock.mockResolvedValueOnce(null);

      const job = createJob({ workerId: 'nonexistent' });

      await getProcessor().process(job);

      expect(updateManyMock).not.toHaveBeenCalled();
      expect(generateRecipeDataMock).not.toHaveBeenCalled();
    });

    it('should skip processing if worker is in invalid status', async () => {
      const invalidStatusWorker = {
        ...mockWorker,
        status: RecipeStatus.RECIPE_CREATED,
      };
      findUniqueMock.mockResolvedValueOnce(invalidStatusWorker);

      const job = createJob({ workerId: mockWorker.id });

      await getProcessor().process(job);

      expect(updateManyMock).not.toHaveBeenCalled();
      expect(generateRecipeDataMock).not.toHaveBeenCalled();
    });

    it('should return early if updateMany finds no workers to update', async () => {
      findUniqueMock.mockResolvedValueOnce(mockWorker);
      updateManyMock.mockResolvedValueOnce({ count: 0 });

      const job = createJob({ workerId: mockWorker.id });

      await getProcessor().process(job);

      expect(generateRecipeDataMock).not.toHaveBeenCalled();
      expect(updateMock).not.toHaveBeenCalled();
    });

    it('should successfully generate recipe with timeout handling', async () => {
      jest.useFakeTimers();

      findUniqueMock.mockResolvedValueOnce(mockWorker);
      updateManyMock.mockResolvedValueOnce({ count: 1 });
      generateRecipeDataMock.mockResolvedValueOnce(mockRecipeData);
      transactionMock.mockImplementation(
        async (callback: TransactionCallback) => {
          await callback({
            recipe: {
              delete: jest.fn(),
              create: jest.fn(),
            },
            recipeWorker: {
              update: jest.fn(),
            },
          });
        },
      );
      updateMock.mockResolvedValueOnce({
        id: mockWorker.id,
        status: RecipeStatus.RECIPE_CREATED,
      });

      const job = createJob({ workerId: mockWorker.id });

      await getProcessor().process(job);

      expect(generateRecipeDataMock).toHaveBeenCalledWith(mockWorker.prompt);
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockWorker.id },
          data: { status: RecipeStatus.RECIPE_CREATED },
        }),
      );

      jest.useRealTimers();
    });

    it('should use provided timeout value', async () => {
      jest.useFakeTimers();

      findUniqueMock.mockResolvedValueOnce(mockWorker);
      updateManyMock.mockResolvedValueOnce({ count: 1 });
      generateRecipeDataMock.mockResolvedValueOnce(mockRecipeData);
      transactionMock.mockImplementation(
        async (callback: TransactionCallback) => {
          await callback({
            recipe: {
              delete: jest.fn(),
              create: jest.fn(),
            },
            recipeWorker: {
              update: jest.fn(),
            },
          });
        },
      );
      updateMock.mockResolvedValueOnce({
        id: mockWorker.id,
        status: RecipeStatus.RECIPE_CREATED,
      });

      const customTimeout = 60000;
      const job = createJob({
        workerId: mockWorker.id,
        timeoutMs: customTimeout,
      });

      await getProcessor().process(job);

      expect(generateRecipeDataMock).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should timeout and reject if AI service takes too long', async () => {
      findUniqueMock.mockResolvedValueOnce(mockWorker);
      updateManyMock.mockResolvedValueOnce({ count: 1 });

      // Simulate a promise that never resolves
      generateRecipeDataMock.mockReturnValueOnce(
        new Promise(() => {
          /* never resolves */
        }),
      );
      updateMock.mockResolvedValueOnce({
        id: mockWorker.id,
        status: RecipeStatus.ERROR,
      });

      const customTimeout = 10; // keep test fast
      const job = createJob({
        workerId: mockWorker.id,
        timeoutMs: customTimeout,
      });

      await expect(getProcessor().process(job)).rejects.toThrow(
        'Recipe generation timed out after',
      );

      // Verify error status was set
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockWorker.id },
          data: { status: RecipeStatus.ERROR },
        }),
      );
    });

    it('should clear timeout when AI service completes successfully', async () => {
      jest.useFakeTimers();

      findUniqueMock.mockResolvedValueOnce(mockWorker);
      updateManyMock.mockResolvedValueOnce({ count: 1 });
      generateRecipeDataMock.mockResolvedValueOnce(mockRecipeData);
      transactionMock.mockImplementation(
        async (callback: TransactionCallback) => {
          await callback({
            recipe: {
              delete: jest.fn(),
              create: jest.fn(),
            },
            recipeWorker: {
              update: jest.fn(),
            },
          });
        },
      );
      updateMock.mockResolvedValueOnce({
        id: mockWorker.id,
        status: RecipeStatus.RECIPE_CREATED,
      });

      const job = createJob({ workerId: mockWorker.id, timeoutMs: 5000 });

      await getProcessor().process(job);

      // At this point, the timeout should have been cleared
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: RecipeStatus.RECIPE_CREATED },
        }),
      );

      jest.useRealTimers();
    });

    it('should handle BadRequestException from AI service', async () => {
      findUniqueMock.mockResolvedValueOnce(mockWorker);
      updateManyMock.mockResolvedValueOnce({ count: 1 });
      generateRecipeDataMock.mockRejectedValueOnce(
        new BadRequestException('Invalid prompt'),
      );
      updateMock.mockResolvedValueOnce({
        id: mockWorker.id,
        status: RecipeStatus.INVALID,
      });

      const job = createJob({ workerId: mockWorker.id });

      await getProcessor().process(job);

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockWorker.id },
          data: { status: RecipeStatus.INVALID },
        }),
      );
    });

    it('should handle generic errors from AI service', async () => {
      findUniqueMock.mockResolvedValueOnce(mockWorker);
      updateManyMock.mockResolvedValueOnce({ count: 1 });
      generateRecipeDataMock.mockRejectedValueOnce(new Error('Network error'));
      updateMock.mockResolvedValueOnce({
        id: mockWorker.id,
        status: RecipeStatus.ERROR,
      });

      const job = createJob({ workerId: mockWorker.id });

      await expect(getProcessor().process(job)).rejects.toThrow(
        'Network error',
      );

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockWorker.id },
          data: { status: RecipeStatus.ERROR },
        }),
      );
    });

    it('should normalize allergies correctly', async () => {
      findUniqueMock.mockResolvedValueOnce(mockWorker);
      updateManyMock.mockResolvedValueOnce({ count: 1 });

      const recipeDataWithAllergies = {
        ...mockRecipeData,
        allergies: ['peanuts', 'TREE_NUTS', 'tree nuts'],
      };
      generateRecipeDataMock.mockResolvedValueOnce(recipeDataWithAllergies);

      transactionMock.mockImplementation(
        async (callback: TransactionCallback) => {
          await callback({
            recipe: {
              delete: jest.fn(),
              create: jest.fn(),
            },
            recipeWorker: {
              update: jest.fn(),
            },
          });
        },
      );
      updateMock.mockResolvedValueOnce({
        id: mockWorker.id,
        status: RecipeStatus.RECIPE_CREATED,
      });

      const job = createJob({ workerId: mockWorker.id });

      await getProcessor().process(job);

      expect(transactionMock).toHaveBeenCalled();
    });

    it('should delete existing recipe before creating new one', async () => {
      const workerWithRecipe = {
        ...mockWorker,
        recipe: { id: 'recipe-1' },
      };
      findUniqueMock.mockResolvedValueOnce(workerWithRecipe);
      updateManyMock.mockResolvedValueOnce({ count: 1 });
      generateRecipeDataMock.mockResolvedValueOnce(mockRecipeData);

      const deleteRecipeMock = jest.fn();
      const createRecipeMock = jest.fn();

      transactionMock.mockImplementation(
        async (callback: TransactionCallback) => {
          await callback({
            recipe: {
              delete: deleteRecipeMock,
              create: createRecipeMock,
            },
            recipeWorker: {
              update: jest.fn(),
            },
          });
        },
      );
      updateMock.mockResolvedValueOnce({
        id: mockWorker.id,
        status: RecipeStatus.RECIPE_CREATED,
      });

      const job = createJob({ workerId: mockWorker.id });

      await getProcessor().process(job);

      expect(deleteRecipeMock).toHaveBeenCalledWith({
        where: { id: 'recipe-1' },
      });
      expect(createRecipeMock).toHaveBeenCalled();
    });

    it('should not attempt to delete when worker has no recipe', async () => {
      findUniqueMock.mockResolvedValueOnce(mockWorker);
      updateManyMock.mockResolvedValueOnce({ count: 1 });
      generateRecipeDataMock.mockResolvedValueOnce(mockRecipeData);

      const deleteRecipeMock = jest.fn();
      transactionMock.mockImplementation(
        async (callback: TransactionCallback) => {
          await callback({
            recipe: {
              delete: deleteRecipeMock,
              create: jest.fn(),
            },
            recipeWorker: {
              update: jest.fn(),
            },
          });
        },
      );

      updateMock.mockResolvedValueOnce({
        id: mockWorker.id,
        status: RecipeStatus.RECIPE_CREATED,
      });

      const job = createJob({ workerId: mockWorker.id });

      await getProcessor().process(job);

      expect(deleteRecipeMock).not.toHaveBeenCalled();
    });
  });
});
