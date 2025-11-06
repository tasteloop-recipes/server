import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CreateRecipeInput } from './dto/create-recipe.input';
import { RecipesPage } from './models/recipes-page.model';
import { RecipeModel } from './models/recipe.model';
import { RecipesService } from './recipes.service';

@Resolver(() => RecipeModel)
export class RecipesResolver {
  constructor(private readonly recipesService: RecipesService) {}

  @Query(/* istanbul ignore next */ () => RecipesPage, {
    description: 'Retrieve a paginated list of recipes',
  })
  async recipes(
    @Args('page', {
      type: /* istanbul ignore next */ () => Int,
      defaultValue: 1,
    })
    page: number,
    @Args('limit', {
      type: /* istanbul ignore next */ () => Int,
      defaultValue: 10,
    })
    limit: number,
  ): Promise<RecipesPage> {
    return this.recipesService.findAll(page, limit);
  }

  @Query(/* istanbul ignore next */ () => RecipeModel, {
    description: 'Retrieve a recipe by its identifier',
  })
  async recipe(
    @Args('id', { type: /* istanbul ignore next */ () => String }) id: string,
  ): Promise<RecipeModel> {
    return this.recipesService.findOne(id);
  }

  @Mutation(/* istanbul ignore next */ () => RecipeModel, {
    description: 'Create a new recipe',
  })
  async createRecipe(
    @Args('input') input: CreateRecipeInput,
  ): Promise<RecipeModel> {
    return this.recipesService.create(input.prompt);
  }
}
