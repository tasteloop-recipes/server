import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';
import { RateLimitGuard } from './rate-limit.guard';

@Module({
  imports: [PrismaModule],
  controllers: [RecipesController],
  providers: [RecipesService, RateLimitGuard],
})
export class RecipesModule {}
