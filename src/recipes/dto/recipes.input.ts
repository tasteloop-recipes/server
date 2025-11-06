import { Field, InputType, Int } from '@nestjs/graphql';
import { Max, Min } from 'class-validator';

@InputType()
export class RecipesInput {
  @Field(() => Int)
  @Min(1, { message: 'Page must be greater than 0' })
  page!: number;

  @Field(() => Int)
  @Min(1, { message: 'Limit must be greater than 0' })
  @Max(50, { message: 'Limit must not exceed 50' })
  limit!: number;
}
