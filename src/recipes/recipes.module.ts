import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RecipesResolver } from './recipes.resolver';
import { RecipesService } from './recipes.service';
import { PubSubModule } from '../pubsub/pubsub.module';

@Module({
  imports: [PrismaModule, PubSubModule],
  providers: [RecipesService, RecipesResolver],
})
export class RecipesModule {}
