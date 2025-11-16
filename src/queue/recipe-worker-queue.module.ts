import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from './queue.module';
import { RecipeGenerationProcessor } from '../recipe-worker/recipe-generation.processor';

@Module({
  imports: [
    QueueModule,
    PrismaModule,
    AiModule,
    BullModule.registerQueue({
      name: 'recipe-generation',
    }),
  ],
  providers: [RecipeGenerationProcessor],
})
export class RecipeWorkerQueueModule {}
