import { BadRequestException } from '@nestjs/common';
import { RecipeStatus } from '@prisma/client';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { RecipeWorkerService } from './recipe-worker.service';

describe('RecipeWorkerService', () => {
  let moduleRef: TestingModule | null = null;
  let service: RecipeWorkerService | null = null;
  let createMock: jest.Mock = jest.fn();
  let findManyMock: jest.Mock = jest.fn();

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

    moduleRef = await Test.createTestingModule({
      providers: [
        RecipeWorkerService,
        {
          provide: PrismaService,
          useValue: {
            recipeWorker: {
              create: createMock,
              findMany: findManyMock,
            },
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
    it('creates a worker with trimmed prompt', async () => {
      const expectedWorker = { ...mockWorker, prompt: 'Create pasta' };
      createMock.mockResolvedValueOnce(expectedWorker);

      const result = await getService().create('  Create pasta  ');

      expect(result).toEqual(expectedWorker);
      expect(createMock).toHaveBeenCalledWith({
        data: { prompt: 'Create pasta' },
      });
    });

    it.each([undefined, '', '   '])(
      'throws BadRequestException for invalid prompt: %p',
      async (input) => {
        await expect(getService().create(input)).rejects.toThrow(
          BadRequestException,
        );
        expect(createMock).not.toHaveBeenCalled();
      },
    );
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
        orderBy: { id: 'desc' },
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
        orderBy: { id: 'desc' },
      });
    });

    it('caps limit at the maximum page size', async () => {
      findManyMock.mockResolvedValueOnce([]);

      await getService().findMany(500);

      expect(findManyMock).toHaveBeenCalledWith({
        where: undefined,
        take: 100,
        orderBy: { id: 'desc' },
      });
    });
  });
});
