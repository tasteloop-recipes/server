import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { S3Client } from '@aws-sdk/client-s3';
import { AppModule } from './app.module';
import { AppService } from './app.service';
import { AppResolver } from './app.resolver';

describe('AppModule', () => {
  let module: TestingModule | undefined = undefined;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(S3Client)
      .useValue({})
      .compile();
  });

  describe('module initialization', () => {
    it('should be defined', () => {
      expect(module).toBeDefined();
    });

    it('should have AppResolver', () => {
      const resolver = module?.get<AppResolver>(AppResolver);
      expect(resolver).toBeDefined();
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

    it('should provide AppService to AppResolver', () => {
      const resolver = module?.get<AppResolver>(AppResolver);
      const service = module?.get<AppService>(AppService);
      expect(resolver).toBeDefined();
      expect(service).toBeDefined();
    });
  });

  describe('module functionality', () => {
    it('should have working controller and service', () => {
      const resolver = module?.get<AppResolver>(AppResolver);
      const result = resolver?.getHello();
      expect(result).toBe('Hello World!');
    });
  });

  afterEach(async () => {
    await module?.close();
  });
});
