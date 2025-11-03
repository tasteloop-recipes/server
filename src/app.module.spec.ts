import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppModule', () => {
  let module: TestingModule | undefined = undefined;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  describe('module initialization', () => {
    it('should be defined', () => {
      expect(module).toBeDefined();
    });

    it('should have AppController', () => {
      const controller = module?.get<AppController>(AppController);
      expect(controller).toBeDefined();
    });

    it('should have AppService', () => {
      const service = module?.get<AppService>(AppService);
      expect(service).toBeDefined();
    });

    it('should instantiate AppService singleton', () => {
      const service1 = module?.get<AppService>(AppService);
      const service2 = module?.get<AppService>(AppService);
      expect(service1).toBe(service2);
    });

    it('should provide AppService to AppController', () => {
      const controller = module?.get<AppController>(AppController);
      const service = module?.get<AppService>(AppService);
      expect(controller).toBeDefined();
      expect(service).toBeDefined();
    });
  });

  describe('module functionality', () => {
    it('should have working controller and service', () => {
      const controller = module?.get<AppController>(AppController);
      const result = controller?.getHello();
      expect(result).toBe('Hello World!');
    });
  });

  afterEach(async () => {
    await module?.close();
  });
});
