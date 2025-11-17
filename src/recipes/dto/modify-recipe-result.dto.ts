import { Field, ObjectType } from '@nestjs/graphql';
import { RecipeModel } from '../models/recipe.model';

@ObjectType()
export class ModifyRecipeResultDto {
  @Field(() => RecipeModel)
  recipe!: RecipeModel;

  @Field()
  descriptionOfUpdates!: string;
}
