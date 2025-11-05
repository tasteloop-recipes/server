import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateRecipeDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000, { message: 'Prompt must not exceed 1000 characters' })
  prompt!: string;
}
