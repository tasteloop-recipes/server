import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RecipeIngredientModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  recipeId!: string;

  @Field()
  name!: string;

  @Field()
  amount!: string;
}
