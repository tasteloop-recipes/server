import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import type { Recipe, MiscNutritionFact } from '@prisma/client';
import { RecipesPage } from './models/recipes-page.model';
import { RecipeModel } from './models/recipe.model';
import { RecipesService } from './recipes.service';
import { RecipesInput } from './dto/recipes.input';
import { RecipeImageModel } from './models/recipe-image.model';
import { RecipeIngredientModel } from './models/recipe-ingredient.model';
import { RecipeWorkerModel } from '../recipe-worker/models/recipe-worker.model';
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

  @ResolveField(() => [RecipeIngredientModel], {
    description: 'Retrieve the ingredients associated with the recipe',
  })
  async ingredients(
    @Parent() recipe: RecipeModel,
  ): Promise<RecipeIngredientModel[]> {
    return this.recipesService.findIngredients(recipe.id);
  }

  @ResolveField(() => RecipeWorkerModel, {
    description: 'Retrieve the worker associated with the recipe',
  })
  async worker(@Parent() recipe: RecipeModel): Promise<RecipeWorkerModel> {
    return this.recipesService.findWorker(recipe.id);
  }

  @ResolveField(() => [MiscNutritionFactModel], {
    description:
      'Retrieve the miscellaneous nutrition facts associated with the recipe',
  })
  async miscNutritionFacts(
    @Parent() recipe: Recipe,
  ): Promise<MiscNutritionFactModel[]> {
    const facts = await this.recipesService.findMiscNutritionFacts(recipe.id);

    return facts.map<MiscNutritionFactModel>((fact: MiscNutritionFact) => ({
      ...fact,
      value: fact.value.toNumber(),
    }));
  }

  @ResolveField(() => RecipeImageModel, {
    nullable: true,
    description: 'Retrieve the image associated with the recipe',
  })
  async image(@Parent() recipe: Recipe): Promise<RecipeImageModel | null> {
    return this.recipesService.findImage(recipe.id);
  }
}
