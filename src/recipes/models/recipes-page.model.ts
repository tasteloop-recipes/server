import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Recipe } from '@prisma/client';
import { RecipeModel } from './recipe.model';

@ObjectType()
export class RecipesPageMeta {
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
export class RecipesPage {
  @Field(() => [RecipeModel])
  data!: Recipe[];

  @Field(() => RecipesPageMeta)
  meta!: RecipesPageMeta;
}
