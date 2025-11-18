import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from './queue.module';
import { RecipeGenerationProcessor } from '../recipe-worker/recipe-generation.processor';
import { RecipeImageGenerationProcessor } from '../recipe-worker/recipe-image-generation.processor';
import { RecipeModificationProcessor } from '../recipe-worker/recipe-modification.processor';
import { RecipeLogsModule } from '../recipe-logs/recipe-logs.module';

@Module({
  imports: [
    QueueModule,
    PrismaModule,
    AiModule,
    BullModule.registerQueue({
      name: 'recipe-generation',
    }),
    BullModule.registerQueue({
      name: 'recipe-image-generation',
    }),
    BullModule.registerQueue({
      name: 'recipe-modification',
    }),
    RecipeLogsModule,
  ],
  providers: [
    RecipeGenerationProcessor,
    RecipeImageGenerationProcessor,
    RecipeModificationProcessor,
  ],
})
export class RecipeWorkerQueueModule {}
