import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController | undefined = undefined;
  let appService: AppService | undefined = undefined;
  let module: TestingModule | undefined = undefined;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = module.get<AppController>(AppController);
    appService = module.get<AppService>(AppService);
  });

  afterEach(async () => {
    await module?.close();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(appController).toBeDefined();
    });

    it('should have getHello method', () => {
      expect(appController).toBeDefined();
      if (appController) {
        expect(typeof appController.getHello).toBe('function');
      }
    });

    it('should have AppService injected', () => {
      expect(appService).toBeDefined();
    });
  });

  describe('getHello', () => {
    it('should return "Hello World!"', () => {
      expect(appController?.getHello()).toBe('Hello World!');
    });

    it('should call AppService.getHello()', () => {
      if (!appService) return;
      const spy = jest.spyOn(appService, 'getHello');
      appController?.getHello();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should return same value as AppService', () => {
      const serviceResult = appService?.getHello();
      const controllerResult = appController?.getHello();
      expect(controllerResult).toBe(serviceResult);
    });

    it('should return a non-empty string', () => {
      const result = appController?.getHello();
      expect(result).toBeDefined();
      expect(result?.length).toBeGreaterThan(0);
    });

    it('should consistently return the same value', () => {
      const result1 = appController?.getHello();
      const result2 = appController?.getHello();
      const result3 = appController?.getHello();
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });
  });
});
