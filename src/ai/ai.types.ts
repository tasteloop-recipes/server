import { Diet, MealType, ProteinType, RecipeDifficulty } from '@prisma/client';
import { zodTextFormat } from 'openai/helpers/zod.js';
import { z } from 'zod';

const ingredientSchema = z
  .object({
    name: z.string().min(1, 'Ingredient name cannot be empty'),
    amount: z.string().min(1, 'Ingredient amount cannot be empty'),
  })
  .describe('Describes an ingredient with its name and amount');

const nutritionFactSchema = z.object({
  calories: z.number().nonnegative(),
  carbs: z.number().nonnegative().describe('Total carbohydrates in grams'),
  fat: z.number().nonnegative().describe('Total fat in grams'),
  protein: z.number().nonnegative().describe('Total protein in grams'),
  fiber: z.number().nonnegative().describe('Dietary fiber in grams'),
});

const miscNutritionFactSchema = z
  .object({
    label: z.string().min(1, 'Nutrition fact label cannot be empty'),
    value: z.number().nonnegative(),
    unit: z.string().min(1).optional().nullable(),
  })
  .describe(
    'Describes a miscellaneous nutrition fact with label, value, and optional unit. These are additional nutrition facts that do not fall under calories, carbs, fat, protein, or fiber.',
  );

const recipeDifficultyEnum = z
  .enum([
    RecipeDifficulty.EASY,
    RecipeDifficulty.MEDIUM,
    RecipeDifficulty.HARD,
  ] as const)
  .describe('Enum representing the difficulty level of a recipe');

const mealTypeEnum = z
  .enum([
    MealType.BREAKFAST,
    MealType.BRUNCH,
    MealType.LUNCH,
    MealType.DINNER,
    MealType.SNACK,
    MealType.DESSERT,
  ] as const)
  .describe('Enum representing the meal types this recipe is suitable for');

const dietEnum = z
  .enum([
    Diet.KETO,
    Diet.GLUTEN_FREE,
    Diet.VEGAN,
    Diet.VEGETARIAN,
    Diet.PALEO,
    Diet.PESCATARIAN,
    Diet.DAIRY_FREE,
    Diet.LOW_CARB,
    Diet.LOW_FAT,
    Diet.MEDITERRANEAN,
    Diet.WHOLE30,
  ] as const)
  .describe('Enum representing the dietary preferences this recipe adheres to');

const proteinTypeEnum = z
  .enum([
    ProteinType.PORK,
    ProteinType.TOFU,
    ProteinType.BEEF,
    ProteinType.CHICKEN,
    ProteinType.SEAFOOD,
    ProteinType.OTHER,
  ] as const)
  .describe('Enum representing the types of protein used in the recipe');

export const recipeDataSchema = z
  .object({
    name: z.string().min(1),
    prompt: z.string().min(1),
    description: z.string().min(1),
    difficulty: recipeDifficultyEnum,
    mealTypes: z.array(mealTypeEnum).min(1),
    countriesOfOrigin: z.array(z.string()),
    diets: z.array(dietEnum),
    allergies: z.array(z.string()),
    proteinType: z.array(proteinTypeEnum),
    prepTimeMinutes: z.number().int().nonnegative(),
    cookTimeMinutes: z.number().int().nonnegative(),
    preparation: z.array(z.string()),
    instructions: z.array(z.string()),
    servingSize: z.string().min(1),
    ingredients: z.array(ingredientSchema).min(1),
    nutritionFacts: nutritionFactSchema,
    miscNutritionFacts: z.array(miscNutritionFactSchema),
  })
  .strict()
  .describe('Formatted schema for generated recipe data');

export const recipeResponseFormat = zodTextFormat(
  recipeDataSchema,
  'recipe_generation',
);
