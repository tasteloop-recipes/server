import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { RecipesResolver } from './recipes.resolver';
import { RecipesService } from './recipes.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    BullModule.registerQueue({ name: 'recipe-image-generation' }),
  ],
  providers: [RecipesService, RecipesResolver],
})
export class RecipesModule {}
