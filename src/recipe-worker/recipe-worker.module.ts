import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../prisma/prisma.module';
import { RecipeWorkerResolver } from './recipe-worker.resolver';
import { RecipeWorkerService } from './recipe-worker.service';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    PrismaModule,
    QueueModule,
    BullModule.registerQueue({
      name: 'recipe-generation',
    }),
  ],
  providers: [RecipeWorkerResolver, RecipeWorkerService],
  exports: [RecipeWorkerService],
})
export class RecipeWorkerModule {}
