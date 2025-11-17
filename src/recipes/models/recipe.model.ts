import {
  Field,
  GraphQLISODateTime,
  ID,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import {
  Allergy,
  Diet,
  MealType,
  ProteinType,
  RecipeDifficulty,
} from '@prisma/client';
import { RecipeImageModel } from './recipe-image.model';
import { RecipeIngredientModel } from './recipe-ingredient.model';
import { RecipeWorkerModel } from '../../recipe-worker/models/recipe-worker.model';
import { MiscNutritionFactModel } from './misc-nutrition-fact.model';

registerEnumType(RecipeDifficulty, { name: 'RecipeDifficulty' });
registerEnumType(MealType, { name: 'MealType' });
registerEnumType(Diet, { name: 'Diet' });
registerEnumType(Allergy, { name: 'Allergy' });
registerEnumType(ProteinType, { name: 'ProteinType' });

@ObjectType()
export class RecipeModel {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field(() => ID, { nullable: true })
  authorId!: string | null;

  @Field(() => RecipeDifficulty)
  difficulty!: RecipeDifficulty;

  @Field(() => [MealType])
  mealTypes!: MealType[];

  @Field(() => [String])
  countriesOfOrigin!: string[];

  @Field(() => [Diet])
  diets!: Diet[];

  @Field(() => [Allergy])
  allergies!: Allergy[];

  @Field(() => [ProteinType])
  proteinType!: ProteinType[];

  @Field(() => Number)
  prepTimeMinutes!: number;

  @Field(() => Number)
  cookTimeMinutes!: number;

  @Field()
  description!: string;

  @Field(() => [String])
  preparation!: string[];

  @Field(() => [String])
  instructions!: string[];

  @Field()
  servingSize!: string;

  @Field(() => [RecipeIngredientModel])
  ingredients?: RecipeIngredientModel[];

  @Field(() => RecipeWorkerModel, { nullable: true })
  worker?: RecipeWorkerModel | null;

  @Field(() => [MiscNutritionFactModel])
  miscNutritionFacts?: MiscNutritionFactModel[];

  @Field(() => RecipeImageModel, { nullable: true })
  image?: RecipeImageModel | null;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}
