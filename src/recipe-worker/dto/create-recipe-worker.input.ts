import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

@InputType()
export class CreateRecipeWorkerInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000, { message: 'Prompt must not exceed 1000 characters' })
  prompt!: string;
}
