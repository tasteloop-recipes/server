import { Args, Query, Resolver } from '@nestjs/graphql';
import { RecipesPage } from './models/recipes-page.model';
import { RecipeModel } from './models/recipe.model';
import { RecipesService } from './recipes.service';
import { RecipesInput } from './dto/recipes.input';

@Resolver(() => RecipeModel)
export class RecipesResolver {
  constructor(private readonly recipesService: RecipesService) {}

  @Query(() => RecipesPage, {
    description: 'Retrieve a paginated list of recipes',
  })
  async recipes(@Args('input') input: RecipesInput): Promise<RecipesPage> {
    return this.recipesService.findAll(input.page, input.limit);
  }

  @Query(() => RecipeModel, {
    description: 'Retrieve a recipe by its identifier',
  })
  async recipe(
    @Args('id', { type: () => String }) id: string,
  ): Promise<RecipeModel> {
    return this.recipesService.findOne(id);
  }
}
