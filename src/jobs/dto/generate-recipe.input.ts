import { InputType, Field } from '@nestjs/graphql';
import { IsArray, IsString, ArrayMinSize } from 'class-validator';

@InputType()
export class GenerateRecipeInput {
  @Field(() => [String])
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  ingredients: string[];
}
