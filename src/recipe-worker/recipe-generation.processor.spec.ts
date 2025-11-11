import { BadRequestException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { RecipeStatus, type Allergy, type Prisma } from '@prisma/client';
import type { Job } from 'bull';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { RecipeGenerationProcessor } from './recipe-generation.processor';

type MinimalJob = Pick<Job<{ workerId: string }>, 'data'>;

describe('RecipeGenerationProcessor', () => {
  let moduleRef: TestingModule | null = null;
  let processor: RecipeGenerationProcessor | null = null;
  let prismaMock: {
    recipeWorker: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  } = {
    recipeWorker: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  let aiServiceMock: { generateRecipeData: jest.Mock } = {
    generateRecipeData: jest.fn(),
  };
  let recipeDeleteMock: jest.Mock<
    Promise<unknown>,
    [Prisma.RecipeWhereUniqueInput]
  > = jest.fn<Promise<unknown>, [Prisma.RecipeWhereUniqueInput]>();
  let recipeCreateMock: jest.Mock<
    Promise<unknown>,
    [Prisma.RecipeCreateArgs]
  > = jest.fn<Promise<unknown>, [Prisma.RecipeCreateArgs]>();
  let capturedCreateArgs: Prisma.RecipeCreateArgs | null = null;

  const getProcessor = (): RecipeGenerationProcessor => {
    if (!processor) {
      throw new Error('RecipeGenerationProcessor not initialized');
    }

    return processor;
  };

  const buildJob = (workerId = 'worker-1'): MinimalJob => ({
    data: { workerId },
  });

  const toBullJob = (job: MinimalJob): Job<{ workerId: string }> => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    return job as unknown as Job<{ workerId: string }>;
  };

  beforeEach(async () => {
    capturedCreateArgs = null;

    recipeDeleteMock = jest.fn<
      Promise<unknown>,
      [Prisma.RecipeWhereUniqueInput]
    >();
    recipeCreateMock = jest
      .fn<Promise<unknown>, [Prisma.RecipeCreateArgs]>()
      .mockImplementation(async (args) => {
        capturedCreateArgs = args;
        return Promise.resolve();
      });

    const transactionContext = {
      recipe: {
        delete: recipeDeleteMock,
        create: recipeCreateMock,
      },
    } as const;

    prismaMock = {
      recipeWorker: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest
        .fn<Promise<unknown>, Parameters<PrismaService['$transaction']>>()
        .mockImplementation(async (callback) => callback(transactionContext)),
    };

    aiServiceMock = {
      generateRecipeData: jest.fn(),
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        RecipeGenerationProcessor,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AiService, useValue: aiServiceMock },
      ],
    }).compile();

    processor = moduleRef.get(RecipeGenerationProcessor);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    processor = null;
    await moduleRef?.close();
    moduleRef = null;
  });

  it('skips processing when the worker does not exist', async () => {
    prismaMock.recipeWorker.findUnique.mockResolvedValueOnce(null);

    await getProcessor().handle(toBullJob(buildJob()));

    expect(prismaMock.recipeWorker.update).not.toHaveBeenCalled();
  });

  it('skips processing when the worker status is not eligible', async () => {
    prismaMock.recipeWorker.findUnique.mockResolvedValueOnce({
      id: 'worker-1',
      status: RecipeStatus.RECIPE_CREATED,
      recipe: null,
    });

    await getProcessor().handle(toBullJob(buildJob()));

    expect(prismaMock.recipeWorker.update).not.toHaveBeenCalled();
  });

  it('creates a recipe and updates status when processing succeeds', async () => {
    prismaMock.recipeWorker.findUnique.mockResolvedValueOnce({
      id: 'worker-1',
      status: RecipeStatus.CREATED,
      prompt: 'Make pasta',
      recipe: { id: 'recipe-1' },
    });

    const expectedAllergies: Allergy[] = ['PEANUTS'];

    aiServiceMock.generateRecipeData.mockResolvedValueOnce({
      name: 'AI Pasta',
      prompt: 'Make pasta',
      description: 'Delicious pasta',
      difficulty: 'EASY',
      mealTypes: ['DINNER'],
      countriesOfOrigin: ['Italy'],
      diets: ['VEGETARIAN'],
      allergies: ['PEANUTS', 'INVALID_ALLERGY'],
      proteinType: ['OTHER'],
      prepTimeMinutes: 10,
      cookTimeMinutes: 20,
      preparation: ['Boil water'],
      instructions: ['Serve'],
      servingSize: '2',
      ingredients: [{ name: 'Pasta', amount: '200g' }],
      nutritionFacts: {
        calories: 500,
        carbs: 60,
        fat: 10,
        protein: 15,
        fiber: 5,
      },
      miscNutritionFacts: [{ label: 'Sodium', value: 100, unit: 'mg' }],
    });

    await getProcessor().handle(toBullJob(buildJob()));

    expect(prismaMock.recipeWorker.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'worker-1' },
      data: { status: RecipeStatus.PROCESSING_RECIPE },
    });

    expect(recipeDeleteMock).toHaveBeenCalledWith({
      where: { id: 'recipe-1' },
    });

    if (capturedCreateArgs === null) {
      throw new Error('Recipe creation arguments were not captured');
    }
    expect(capturedCreateArgs.data.name).toBe('AI Pasta');
    expect(capturedCreateArgs.data.allergies).toEqual(expectedAllergies);

    expect(prismaMock.recipeWorker.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'worker-1' },
      data: { status: RecipeStatus.RECIPE_CREATED },
    });
  });

  it('marks the worker as invalid when AI rejects the prompt', async () => {
    prismaMock.recipeWorker.findUnique.mockResolvedValueOnce({
      id: 'worker-1',
      status: RecipeStatus.ERROR,
      prompt: 'Bad prompt',
      recipe: null,
    });

    aiServiceMock.generateRecipeData.mockRejectedValueOnce(
      new BadRequestException('invalid prompt'),
    );

    await getProcessor().handle(toBullJob(buildJob()));

    expect(prismaMock.recipeWorker.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'worker-1' },
      data: { status: RecipeStatus.PROCESSING_RECIPE },
    });
    expect(prismaMock.recipeWorker.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'worker-1' },
      data: { status: RecipeStatus.INVALID },
    });
  });

  it('marks the worker as error and rethrows for unexpected failures', async () => {
    prismaMock.recipeWorker.findUnique.mockResolvedValueOnce({
      id: 'worker-1',
      status: RecipeStatus.CREATED,
      prompt: 'Make pasta',
      recipe: null,
    });

    const failure = new Error('queue failure');
    aiServiceMock.generateRecipeData.mockRejectedValueOnce(failure);

    await expect(getProcessor().handle(toBullJob(buildJob()))).rejects.toThrow(
      failure,
    );

    expect(prismaMock.recipeWorker.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'worker-1' },
      data: { status: RecipeStatus.PROCESSING_RECIPE },
    });
    expect(prismaMock.recipeWorker.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'worker-1' },
      data: { status: RecipeStatus.ERROR },
    });
  });
});
