import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RecipeWorkerResolver } from './recipe-worker.resolver';
import { RecipeWorkerService } from './recipe-worker.service';

@Module({
  imports: [PrismaModule],
  providers: [RecipeWorkerResolver, RecipeWorkerService],
  exports: [RecipeWorkerService],
})
export class RecipeWorkerModule {}
