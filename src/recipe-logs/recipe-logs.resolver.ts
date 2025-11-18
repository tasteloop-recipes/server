import { Args, Query, Resolver } from '@nestjs/graphql';
import { RecipeLogModel } from './models/recipe-log.model';
import { RecipeLogsService } from './recipe-logs.service';

@Resolver(() => RecipeLogModel)
export class RecipeLogsResolver {
  constructor(private readonly recipeLogsService: RecipeLogsService) {}

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
