import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { RecipeWorkerQueueModule } from './recipe-worker-queue.module';

async function bootstrap(): Promise<void> {
  const appContext = await NestFactory.createApplicationContext(
    RecipeWorkerQueueModule,
  );
  const logger = new Logger('RecipeWorkerQueue');
  logger.log('Recipe worker queue is running');

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    logger.log(`Received ${signal}. Shutting down recipe worker queue.`);
    await appContext.close();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

bootstrap().catch((error: unknown) => {
  const logger = new Logger('RecipeWorkerQueue');
  if (error instanceof Error) {
    logger.error('Failed to start recipe worker queue', error.stack);
  } else {
    logger.error(`Failed to start recipe worker queue: ${String(error)}`);
  }
  process.exit(1);
});
