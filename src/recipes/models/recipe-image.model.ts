import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RecipeImageModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID, { nullable: true })
  recipeId!: string | null;

  @Field()
  spaceName!: string;

  @Field()
  region!: string;

  @Field()
  objectKey!: string;

  @Field()
  fileName!: string;

  @Field()
  contentType!: string;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}
