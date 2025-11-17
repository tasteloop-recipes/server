import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { RecipesPage } from './models/recipes-page.model';
import { RecipeModel } from './models/recipe.model';
import { RecipesService } from './recipes.service';
import { RecipesInput } from './dto/recipes.input';
import { RecipeImageModel } from './models/recipe-image.model';
import { MiscNutritionFactModel } from './models/misc-nutrition-fact.model';

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

  @ResolveField(() => [MiscNutritionFactModel], {
    description:
      'Retrieve the miscellaneous nutrition facts associated with the recipe',
  })
  async miscNutritionFacts(
    @Parent() recipe: RecipeModel,
  ): Promise<MiscNutritionFactModel[]> {
    return this.recipesService.findMiscNutritionFacts(recipe.id);
  }

  @ResolveField(() => RecipeImageModel, {
    nullable: true,
    description: 'Retrieve the image associated with the recipe',
  })
  async image(@Parent() recipe: RecipeModel): Promise<RecipeImageModel | null> {
    return this.recipesService.findImage(recipe.id);
  }
}
