import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RecipeNutritionFactModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  recipeId!: string;

  @Field()
  calories!: number;

  @Field()
  carbs!: number;

  @Field()
  fat!: number;

  @Field()
  protein!: number;

  @Field()
  fiber!: number;
}
