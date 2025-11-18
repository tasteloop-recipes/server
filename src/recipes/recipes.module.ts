import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { RecipesResolver } from './recipes.resolver';
import { RecipesService } from './recipes.service';
import { RecipeLogsModule } from '../recipe-logs/recipe-logs.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: 'recipe-modification' }),
    RecipeLogsModule,
  ],
  providers: [RecipesService, RecipesResolver],
})
export class RecipesModule {}
