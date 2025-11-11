import { BadRequestException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { RecipeStatus } from '@prisma/client';
import { RecipeWorkerResolver } from './recipe-worker.resolver';
import { RecipeWorkerService } from './recipe-worker.service';

type RecipeWorkerServiceMock = {
  [K in 'create' | 'findMany']: jest.MockedFunction<RecipeWorkerService[K]>;
};

describe('RecipeWorkerResolver', () => {
  let moduleRef: TestingModule | null = null;
  let resolver: RecipeWorkerResolver | null = null;
  let serviceMock: RecipeWorkerServiceMock = {
    create: jest.fn(),
    findMany: jest.fn(),
  } as RecipeWorkerServiceMock;

  const getResolver = (): RecipeWorkerResolver => {
    if (!resolver) {
      throw new Error('RecipeWorkerResolver not initialized');
    }

    return resolver;
  };

  const mockWorker = {
    id: 'worker-1',
    prompt: 'Create something tasty',
    status: RecipeStatus.CREATED,
  };

  beforeEach(async () => {
    serviceMock = {
      create: jest.fn(),
      findMany: jest.fn(),
    } as RecipeWorkerServiceMock;

    moduleRef = await Test.createTestingModule({
      providers: [
        RecipeWorkerResolver,
        {
          provide: RecipeWorkerService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    resolver = moduleRef.get(RecipeWorkerResolver);
  });

  afterEach(async () => {
    resolver = null;
    serviceMock.create.mockReset();
    serviceMock.findMany.mockReset();
    await moduleRef?.close();
    moduleRef = null;
  });

  describe('create', () => {
    it('delegates to service and returns worker', async () => {
      serviceMock.create.mockResolvedValueOnce(mockWorker);

      const result = await getResolver().create({ prompt: 'Prompt' });

      expect(result).toEqual(mockWorker);
      expect(serviceMock.create).toHaveBeenCalledWith('Prompt');
    });

    it('surfaced service errors', async () => {
      serviceMock.create.mockRejectedValueOnce(
        new BadRequestException('Prompt required'),
      );

      await expect(getResolver().create({ prompt: '' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('workers', () => {
    it('returns workers with default args', async () => {
      serviceMock.findMany.mockResolvedValueOnce([mockWorker]);

      const result = await getResolver().workers();

      expect(result).toEqual([mockWorker]);
      expect(serviceMock.findMany).toHaveBeenCalledWith(50, undefined);
    });

    it('passes through limit and status args', async () => {
      serviceMock.findMany.mockResolvedValueOnce([mockWorker]);

      const statuses = [RecipeStatus.PROCESSING_RECIPE, RecipeStatus.READY];
      await getResolver().workers(5, statuses);

      expect(serviceMock.findMany).toHaveBeenCalledWith(5, statuses);
    });
  });
});
