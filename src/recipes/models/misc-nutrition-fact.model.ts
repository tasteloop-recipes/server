import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class MiscNutritionFactModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  recipeId!: string;

  @Field()
  label!: string;

  @Field()
  value!: number;

  @Field(() => String, { nullable: true })
  unit?: string | null;
}
