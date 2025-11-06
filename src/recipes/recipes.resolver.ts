import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CreateRecipeInput } from './dto/create-recipe.input';
import { RecipesPage } from './models/recipes-page.model';
import { RecipeModel } from './models/recipe.model';
import { RecipesService } from './recipes.service';

@Resolver(() => RecipeModel)
export class RecipesResolver {
  constructor(private readonly recipesService: RecipesService) {}

  @Query(() => RecipesPage, {
    description: 'Retrieve a paginated list of recipes',
  })
  async recipes(
    @Args('page', {
      type: () => Int,
      defaultValue: 1,
    })
    page: number,
    @Args('limit', {
      type: () => Int,
      defaultValue: 10,
    })
    limit: number,
  ): Promise<RecipesPage> {
    return this.recipesService.findAll(page, limit);
  }

  @Query(() => RecipeModel, {
    description: 'Retrieve a recipe by its identifier',
  })
  async recipe(
    @Args('id', { type: () => String }) id: string,
  ): Promise<RecipeModel> {
    return this.recipesService.findOne(id);
  }

  @Mutation(() => RecipeModel, {
    description: 'Create a new recipe',
  })
  async createRecipe(
    @Args('input') input: CreateRecipeInput,
  ): Promise<RecipeModel> {
    return this.recipesService.create(input.prompt);
  }
}
