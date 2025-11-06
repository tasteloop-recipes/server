/* istanbul ignore file */

import { Field, Int, ObjectType } from '@nestjs/graphql';
import type {
  PaginatedRecipes,
  PaginatedRecipesMeta,
} from '../recipes.service';
import { RecipeModel } from './recipe.model';

@ObjectType()
export class RecipesPageMeta implements PaginatedRecipesMeta {
  @Field(() => Int)
  totalItems!: number;

  @Field(() => Int)
  totalPages!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  limit!: number;
}

@ObjectType()
export class RecipesPage implements PaginatedRecipes {
  @Field(() => [RecipeModel])
  data!: RecipeModel[];

  @Field(() => RecipesPageMeta)
  meta!: RecipesPageMeta;
}
