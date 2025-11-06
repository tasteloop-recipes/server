import { Field, Int, ObjectType } from '@nestjs/graphql';
import type {
  PaginatedRecipes,
  PaginatedRecipesMeta,
} from '../recipes.service';
import { RecipeModel } from './recipe.model';
import { Min } from 'class-validator';

@ObjectType()
export class RecipesPageMeta implements PaginatedRecipesMeta {
  @Field(() => Int)
  totalItems!: number;

  @Field(() => Int)
  totalPages!: number;

  @Field(() => Int)
  @Min(1, { message: 'Page must be greater than 0' })
  page!: number;

  @Field(() => Int)
  @Min(1, { message: 'Limit must be greater than 0' })
  limit!: number;
}

@ObjectType()
export class RecipesPage implements PaginatedRecipes {
  @Field(() => [RecipeModel])
  data!: RecipeModel[];

  @Field(() => RecipesPageMeta)
  meta!: RecipesPageMeta;
}
