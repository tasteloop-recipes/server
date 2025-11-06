import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AppResolver } from './app.resolver';
import { AppService } from './app.service';

describe('AppResolver', () => {
  let appResolver: AppResolver | undefined = undefined;
  let appService: AppService | undefined = undefined;
  let module: TestingModule | undefined = undefined;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [AppResolver, AppService],
    }).compile();

    appResolver = module.get<AppResolver>(AppResolver);
    appService = module.get<AppService>(AppService);
  });

  afterEach(async () => {
    await module?.close();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(appResolver).toBeDefined();
    });

    it('should have AppService injected', () => {
      expect(appService).toBeDefined();
    });
  });

  describe('getHello', () => {
    it('should return "Hello World!"', () => {
      expect(appResolver?.getHello()).toBe('Hello World!');
    });

    it('should call AppService.getHello()', () => {
      if (!appService) return;
      const spy = jest.spyOn(appService, 'getHello');
      appResolver?.getHello();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should return same value as AppService', () => {
      const serviceResult = appService?.getHello();
      const resolverResult = appResolver?.getHello();
      expect(resolverResult).toBe(serviceResult);
    });

    it('should return a non-empty string', () => {
      const result = appResolver?.getHello();
      expect(result).toBeDefined();
      expect(result?.length).toBeGreaterThan(0);
    });

    it('should consistently return the same value', () => {
      const result1 = appResolver?.getHello();
      const result2 = appResolver?.getHello();
      const result3 = appResolver?.getHello();
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });
  });
});
