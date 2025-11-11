import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { RecipeStatus } from '@prisma/client';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { RecipeWorkerService } from './recipe-worker.service';

describe('RecipeWorkerService', () => {
  let moduleRef: TestingModule | null = null;
  let service: RecipeWorkerService | null = null;
  let createMock: jest.Mock = jest.fn();
  let findManyMock: jest.Mock = jest.fn();
  let updateMock: jest.Mock = jest.fn();
  let queueAddMock: jest.MockedFunction<Queue<{ workerId: string }>['add']> =
    jest.fn();

  const getService = (): RecipeWorkerService => {
    if (!service) {
      throw new Error('RecipeWorkerService not initialized');
    }

    return service;
  };

  const mockWorker = {
    id: 'worker-1',
    status: RecipeStatus.CREATED,
    prompt: 'Test prompt',
  };

  beforeEach(async () => {
    createMock = jest.fn();
    findManyMock = jest.fn();
    updateMock = jest.fn();
    queueAddMock = jest.fn<
      ReturnType<Queue<{ workerId: string }>['add']>,
      Parameters<Queue<{ workerId: string }>['add']>
    >();

    moduleRef = await Test.createTestingModule({
      providers: [
        RecipeWorkerService,
        {
          provide: PrismaService,
          useValue: {
            recipeWorker: {
              create: createMock,
              findMany: findManyMock,
              update: updateMock,
            },
          },
        },
        {
          provide: getQueueToken('recipe-generation'),
          useValue: {
            add: queueAddMock,
          },
        },
      ],
    }).compile();

    service = moduleRef.get(RecipeWorkerService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    service = null;
    await moduleRef?.close();
    moduleRef = null;
  });

  describe('create', () => {
    it('creates a worker with trimmed prompt and enqueues a job', async () => {
      const expectedWorker = { ...mockWorker, prompt: 'Create pasta' };
      createMock.mockResolvedValueOnce(expectedWorker);
      queueAddMock.mockResolvedValueOnce(undefined);

      const result = await getService().create('  Create pasta  ');

      expect(result).toEqual(expectedWorker);
      expect(createMock).toHaveBeenCalledWith({
        data: { prompt: 'Create pasta' },
      });
      expect(queueAddMock).toHaveBeenCalledWith(
        'generate-recipe',
        { workerId: expectedWorker.id },
        expect.anything(),
      );

      const jobOptions = queueAddMock.mock.calls[0]?.[2];
      expect(jobOptions).toBeDefined();
      expect(jobOptions?.attempts).toBe(3);

      const backoff = jobOptions?.backoff;
      const isBackoffObject = backoff != null && typeof backoff === 'object';
      expect(isBackoffObject).toBe(true);

      if (isBackoffObject) {
        expect(backoff).toMatchObject({ type: 'exponential' });
      }
    });

    it.each([undefined, '', '   '])(
      'throws BadRequestException for invalid prompt: %p',
      async (input) => {
        await expect(getService().create(input)).rejects.toThrow(
          BadRequestException,
        );
        expect(createMock).not.toHaveBeenCalled();
        expect(queueAddMock).not.toHaveBeenCalled();
      },
    );

    it('marks the worker as error if enqueueing fails', async () => {
      const expectedWorker = { ...mockWorker, prompt: 'Create pasta' };
      createMock.mockResolvedValueOnce(expectedWorker);
      queueAddMock.mockRejectedValueOnce(new Error('connection failed'));

      await expect(getService().create('Create pasta')).rejects.toThrow(
        InternalServerErrorException,
      );

      expect(updateMock).toHaveBeenCalledWith({
        where: { id: expectedWorker.id },
        data: { status: RecipeStatus.ERROR },
      });
    });
  });

  describe('findMany', () => {
    it('defaults to returning up to 50 workers', async () => {
      const workers = [mockWorker];
      findManyMock.mockResolvedValueOnce(workers);

      const result = await getService().findMany();

      expect(result).toEqual(workers);
      expect(findManyMock).toHaveBeenCalledWith({
        where: undefined,
        take: 50,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('applies custom limit and status filters', async () => {
      const workers = [mockWorker];
      findManyMock.mockResolvedValueOnce(workers);

      const result = await getService().findMany(10, [
        RecipeStatus.PROCESSING_IMAGE,
        RecipeStatus.READY,
      ]);

      expect(result).toEqual(workers);
      expect(findManyMock).toHaveBeenCalledWith({
        where: {
          status: { in: [RecipeStatus.PROCESSING_IMAGE, RecipeStatus.READY] },
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('caps limit at the maximum page size', async () => {
      findManyMock.mockResolvedValueOnce([]);

      await getService().findMany(500);

      expect(findManyMock).toHaveBeenCalledWith({
        where: undefined,
        take: 100,
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
