import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class JobResult {
  @Field(() => ID)
  recipeId: string;

  @Field()
  imageUrl: string;
}
