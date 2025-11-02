import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);

    // Mock Prisma Client methods to avoid actual database connections in unit tests
    service.$connect = jest.fn().mockResolvedValue(undefined);
    service.$disconnect = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should connect to the database', async () => {
      await service.onModuleInit();

      expect(service.$connect).toHaveBeenCalledTimes(1);
    });

    it('should throw error if connection fails', async () => {
      const connectionError = new Error('Database connection failed');
      service.$connect = jest.fn().mockRejectedValue(connectionError);

      await expect(service.onModuleInit()).rejects.toThrow('Database connection failed');
    });

    it('should log success message on successful connection', async () => {
      const logSpy = jest.spyOn(service['logger'], 'log');

      await service.onModuleInit();

      expect(logSpy).toHaveBeenCalledWith('Successfully connected to database');
    });

    it('should log error message on connection failure', async () => {
      const connectionError = new Error('Database connection failed');
      const errorSpy = jest.spyOn(service['logger'], 'error');
      service.$connect = jest.fn().mockRejectedValue(connectionError);

      await expect(service.onModuleInit()).rejects.toThrow();

      expect(errorSpy).toHaveBeenCalledWith('Failed to connect to database', connectionError);
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from the database', async () => {
      await service.onModuleDestroy();

      expect(service.$disconnect).toHaveBeenCalledTimes(1);
    });

    it('should throw error if disconnection fails', async () => {
      const disconnectionError = new Error('Database disconnection failed');
      service.$disconnect = jest.fn().mockRejectedValue(disconnectionError);

      await expect(service.onModuleDestroy()).rejects.toThrow('Database disconnection failed');
    });

    it('should log success message on successful disconnection', async () => {
      const logSpy = jest.spyOn(service['logger'], 'log');

      await service.onModuleDestroy();

      expect(logSpy).toHaveBeenCalledWith('Successfully disconnected from database');
    });

    it('should log error message on disconnection failure', async () => {
      const disconnectionError = new Error('Database disconnection failed');
      const errorSpy = jest.spyOn(service['logger'], 'error');
      service.$disconnect = jest.fn().mockRejectedValue(disconnectionError);

      await expect(service.onModuleDestroy()).rejects.toThrow();

      expect(errorSpy).toHaveBeenCalledWith('Failed to disconnect from database', disconnectionError);
    });
  });

  describe('Prisma Client methods', () => {
    it('should inherit all Prisma Client methods', () => {
      // Verify that the service has Prisma Client properties
      expect(service.$connect).toBeDefined();
      expect(service.$disconnect).toBeDefined();
      expect(typeof service.$connect).toBe('function');
      expect(typeof service.$disconnect).toBe('function');
    });
  });
});
