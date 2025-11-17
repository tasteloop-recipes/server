import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { RecipeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RecipeWorkerService } from './recipe-worker.service';

describe('RecipeWorkerService', () => {
  let moduleRef: TestingModule | null = null;
  let service: RecipeWorkerService | null = null;
  let mockQueueAdd: jest.Mock = jest.fn();
  let mockPrismaCreate: jest.Mock = jest.fn();
  let mockPrismaUpdate: jest.Mock = jest.fn();
  let mockPrismaFindMany: jest.Mock = jest.fn();

  const getService = (): RecipeWorkerService => {
    if (!service) {
      throw new Error('RecipeWorkerService not initialized');
    }

    return service;
  };

  const mockWorker = {
    id: '1',
    prompt: 'Make me a pizza recipe',
    status: RecipeStatus.CREATED,
    createdAt: new Date(),
    updatedAt: new Date(),
    imageUrl: null,
  };

  beforeEach(async () => {
    mockQueueAdd = jest.fn().mockResolvedValue(undefined);
    mockPrismaCreate = jest.fn();
    mockPrismaUpdate = jest.fn();
    mockPrismaFindMany = jest.fn();

    moduleRef = await Test.createTestingModule({
      providers: [
        RecipeWorkerService,
        {
          provide: PrismaService,
          useValue: {
            recipeWorker: {
              create: mockPrismaCreate,
              update: mockPrismaUpdate,
              findMany: mockPrismaFindMany,
            },
          },
        },
        {
          provide: 'BullQueue_recipe-generation',
          useValue: {
            add: mockQueueAdd,
          },
        },
      ],
    }).compile();

    service = moduleRef.get<RecipeWorkerService>(RecipeWorkerService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    service = null;
    await moduleRef?.close();
    moduleRef = null;
  });

  describe('create', () => {
    it('should create a recipe worker and enqueue the job', async () => {
      mockPrismaCreate.mockResolvedValueOnce(mockWorker);
      mockQueueAdd.mockResolvedValueOnce({});

      const result = await getService().create('Make me a pizza recipe');

      expect(result).toEqual(mockWorker);
      expect(mockPrismaCreate).toHaveBeenCalledWith({
        data: { prompt: 'Make me a pizza recipe' },
      });
      expect(mockQueueAdd).toHaveBeenCalledWith(
        'generate-recipe',
        { workerId: '1' },
        expect.objectContaining({
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        }),
      );
    });

    it('should throw BadRequestException when prompt is empty', async () => {
      await expect(getService().create('')).rejects.toThrow(
        BadRequestException,
      );
      await expect(getService().create('   ')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaCreate).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when prompt is undefined', async () => {
      await expect(getService().create(undefined)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaCreate).not.toHaveBeenCalled();
    });

    it('should trim whitespace from prompt', async () => {
      mockPrismaCreate.mockResolvedValueOnce(mockWorker);

      await getService().create('  Make me a pizza recipe  ');

      expect(mockPrismaCreate).toHaveBeenCalledWith({
        data: { prompt: 'Make me a pizza recipe' },
      });
    });

    it('should handle queue enqueue failure and update worker status to ERROR', async () => {
      mockPrismaCreate.mockResolvedValueOnce(mockWorker);
      const queueError = new Error('Queue connection failed');
      mockQueueAdd.mockRejectedValueOnce(queueError);
      mockPrismaUpdate.mockResolvedValueOnce({
        ...mockWorker,
        status: RecipeStatus.ERROR,
      });

      await expect(
        getService().create('Make me a pizza recipe'),
      ).rejects.toThrow(InternalServerErrorException);

      expect(mockPrismaUpdate).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: RecipeStatus.ERROR },
      });
    });

    it('should include error message in exception when queue fails', async () => {
      mockPrismaCreate.mockResolvedValueOnce(mockWorker);
      const queueError = new Error('Queue connection failed');
      mockQueueAdd.mockRejectedValueOnce(queueError);
      mockPrismaUpdate.mockResolvedValueOnce({
        ...mockWorker,
        status: RecipeStatus.ERROR,
      });

      try {
        await getService().create('Make me a pizza recipe');
      } catch (error) {
        if (error instanceof InternalServerErrorException) {
          const response = error.getResponse();
          const responseMessage =
            typeof response === 'string' ? response : JSON.stringify(response);

          expect(responseMessage).toContain(
            'Failed to enqueue recipe generation job',
          );
          expect(responseMessage).toContain('Queue connection failed');
        }
      }
    });

    it('should handle non-Error exceptions gracefully', async () => {
      mockPrismaCreate.mockResolvedValueOnce(mockWorker);
      mockQueueAdd.mockRejectedValueOnce('Some unknown error');
      mockPrismaUpdate.mockResolvedValueOnce({
        ...mockWorker,
        status: RecipeStatus.ERROR,
      });

      await expect(
        getService().create('Make me a pizza recipe'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findManyWithFilters', () => {
    it('should return all workers with default pagination', async () => {
      const mockWorkers = [mockWorker];
      mockPrismaFindMany.mockResolvedValueOnce(mockWorkers);

      const result = await getService().findManyWithFilters();

      expect(result).toEqual(mockWorkers);
      expect(mockPrismaFindMany).toHaveBeenCalledWith({
        where: undefined,
        take: 50,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should respect custom limit', async () => {
      const mockWorkers = [mockWorker];
      mockPrismaFindMany.mockResolvedValueOnce(mockWorkers);

      const result = await getService().findManyWithFilters(25);

      expect(result).toEqual(mockWorkers);
      expect(mockPrismaFindMany).toHaveBeenCalledWith({
        where: undefined,
        take: 25,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should enforce maximum page size of 100', async () => {
      const mockWorkers = [mockWorker];
      mockPrismaFindMany.mockResolvedValueOnce(mockWorkers);

      await getService().findManyWithFilters(200);

      expect(mockPrismaFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });

    it('should enforce minimum limit of 1', async () => {
      const mockWorkers = [mockWorker];
      mockPrismaFindMany.mockResolvedValueOnce(mockWorkers);

      await getService().findManyWithFilters(0);

      expect(mockPrismaFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 1,
        }),
      );
    });

    it('should filter by statuses when provided', async () => {
      const mockWorkers = [{ ...mockWorker, status: RecipeStatus.READY }];
      mockPrismaFindMany.mockResolvedValueOnce(mockWorkers);

      const result = await getService().findManyWithFilters(50, [
        RecipeStatus.READY,
      ]);

      expect(result).toEqual(mockWorkers);
      expect(mockPrismaFindMany).toHaveBeenCalledWith({
        where: {
          status: { in: [RecipeStatus.READY] },
        },
        take: 50,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by multiple statuses', async () => {
      const mockWorkers = [mockWorker];
      mockPrismaFindMany.mockResolvedValueOnce(mockWorkers);

      await getService().findManyWithFilters(50, [
        RecipeStatus.CREATED,
        RecipeStatus.PROCESSING_RECIPE,
      ]);

      expect(mockPrismaFindMany).toHaveBeenCalledWith({
        where: {
          status: {
            in: [RecipeStatus.CREATED, RecipeStatus.PROCESSING_RECIPE],
          },
        },
        take: 50,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should not filter by status when empty array is provided', async () => {
      const mockWorkers = [mockWorker];
      mockPrismaFindMany.mockResolvedValueOnce(mockWorkers);

      await getService().findManyWithFilters(50, []);

      expect(mockPrismaFindMany).toHaveBeenCalledWith({
        where: undefined,
        take: 50,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should use optional chaining for safe length check', async () => {
      const mockWorkers = [mockWorker];
      mockPrismaFindMany.mockResolvedValueOnce(mockWorkers);

      // This tests that optional chaining handles undefined gracefully
      await getService().findManyWithFilters(50, undefined);

      expect(mockPrismaFindMany).toHaveBeenCalledWith({
        where: undefined,
        take: 50,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should order by createdAt descending', async () => {
      const mockWorkers = [mockWorker];
      mockPrismaFindMany.mockResolvedValueOnce(mockWorkers);

      await getService().findManyWithFilters();

      expect(mockPrismaFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });
});
