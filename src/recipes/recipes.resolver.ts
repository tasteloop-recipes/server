import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { RecipesPage } from './models/recipes-page.model';
import { RecipeModel } from './models/recipe.model';
import { RecipesService } from './recipes.service';
import { RecipesInput } from './dto/recipes.input';
import { RecipeImageModel } from './models/recipe-image.model';
import { RecipeIngredientModel } from './models/recipe-ingredient.model';

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

  @ResolveField(() => [RecipeIngredientModel], {
    description: 'Retrieve the ingredients associated with the recipe',
  })
  async ingredients(
    @Parent() recipe: RecipeModel,
  ): Promise<RecipeIngredientModel[]> {
    return this.recipesService.findIngredients(recipe.id);
  }

  @ResolveField(() => RecipeImageModel, {
    nullable: true,
    description: 'Retrieve the image associated with the recipe',
  })
  async image(@Parent() recipe: RecipeModel): Promise<RecipeImageModel | null> {
    return this.recipesService.findImage(recipe.id);
  }
}
