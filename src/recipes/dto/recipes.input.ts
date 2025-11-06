import { Field, InputType, Int } from '@nestjs/graphql';
import { Min } from 'class-validator';

@InputType()
export class RecipesInput {
  @Field(() => Int)
  @Min(1, { message: 'Page must be greater than 0' })
  page!: number;

  @Field(() => Int)
  @Min(1, { message: 'Limit must be greater than 0' })
  limit!: number;
}
