import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { RecipesResolver } from './recipes.resolver';
import { RecipesService } from './recipes.service';
import { AiModule } from '../ai/ai.module';
import { RecipeLogsModule } from '../recipe-logs/recipe-logs.module';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    BullModule.registerQueue({ name: 'recipe-image-generation' }),
    RecipeLogsModule,
  ],
  providers: [RecipesService, RecipesResolver],
})
export class RecipesModule {}
