import { Args, Query, Resolver } from '@nestjs/graphql';
import { Throttle } from '@nestjs/throttler';
import { RecipeLogModel } from './models/recipe-log.model';
import { RecipeLogsService } from './recipe-logs.service';
import { QUERY_THROTTLE } from '../common/throttling/throttling.constants';

@Resolver(() => RecipeLogModel)
export class RecipeLogsResolver {
  constructor(private readonly recipeLogsService: RecipeLogsService) {}

  @Throttle(QUERY_THROTTLE)
  @Query(() => [RecipeLogModel], {
    name: 'recipeLogs',
    description: 'Retrieve all logs associated with a recipe',
  })
  async getRecipeLogs(
    @Args('recipeId', { type: () => String }) recipeId: string,
  ): Promise<RecipeLogModel[]> {
    return this.recipeLogsService.listForRecipe(recipeId);
  }
}
