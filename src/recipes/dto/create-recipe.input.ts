import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MaxLength, Min, IsInt } from 'class-validator';

@InputType()
export class CreateRecipeInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000, { message: 'Prompt must not exceed 1000 characters' })
  prompt!: string;
}

@InputType()
export class PaginationInput {
  @Field(() => Int, { defaultValue: 1 })
  @IsInt()
  @Min(1, { message: 'Page must be greater than 0' })
  page!: number;

  @Field(() => Int, { defaultValue: 10 })
  @IsInt()
  @Min(1, { message: 'Limit must be greater than 0' })
  limit!: number;
}
