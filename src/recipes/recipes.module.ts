import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RecipesResolver } from './recipes.resolver';
import { RecipesService } from './recipes.service';

@Module({
  imports: [PrismaModule],
  providers: [RecipesService, RecipesResolver],
})
export class RecipesModule {}
