import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RecipeLogsService } from './recipe-logs.service';
import { RecipeLogsResolver } from './recipe-logs.resolver';

@Module({
  imports: [PrismaModule],
  providers: [RecipeLogsService, RecipeLogsResolver],
  exports: [RecipeLogsService],
})
export class RecipeLogsModule {}
