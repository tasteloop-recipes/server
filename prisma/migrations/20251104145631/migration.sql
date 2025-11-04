-- CreateEnum
CREATE TYPE "RecipeDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'BRUNCH', 'LUNCH', 'DINNER', 'SNACK', 'DESSERT');

-- CreateEnum
CREATE TYPE "Diet" AS ENUM ('KETO', 'GLUTEN_FREE', 'VEGAN', 'VEGETARIAN', 'PALEO', 'PESCATARIAN', 'DAIRY_FREE', 'LOW_CARB', 'LOW_FAT', 'MEDITERRANEAN', 'WHOLE30');

-- CreateEnum
CREATE TYPE "ProteinType" AS ENUM ('PORK', 'TOFU', 'BEEF', 'CHICKEN', 'SEAFOOD', 'OTHER');

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "authorId" TEXT,
    "difficulty" "RecipeDifficulty" NOT NULL,
    "mealTypes" "MealType"[],
    "countriesOfOrigin" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "diets" "Diet"[] DEFAULT ARRAY[]::"Diet"[],
    "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "proteinType" "ProteinType"[] DEFAULT ARRAY[]::"ProteinType"[],
    "prepTimeMinutes" INTEGER NOT NULL,
    "cookTimeMinutes" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "preparation" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "instructions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "servingSize" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeIngredient" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" TEXT NOT NULL,

    CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeNutritionFact" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "calories" DECIMAL(10,2) NOT NULL,
    "carbs" DECIMAL(10,2) NOT NULL,
    "fat" DECIMAL(10,2) NOT NULL,
    "protein" DECIMAL(10,2) NOT NULL,
    "fiber" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "RecipeNutritionFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MiscNutritionFact" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "unit" TEXT,

    CONSTRAINT "MiscNutritionFact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Recipe_authorId_idx" ON "Recipe"("authorId");

-- CreateIndex
CREATE INDEX "RecipeIngredient_recipeId_idx" ON "RecipeIngredient"("recipeId");

-- CreateIndex
CREATE INDEX "RecipeNutritionFact_recipeId_idx" ON "RecipeNutritionFact"("recipeId");

-- CreateIndex
CREATE INDEX "MiscNutritionFact_recipeId_idx" ON "MiscNutritionFact"("recipeId");

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeNutritionFact" ADD CONSTRAINT "RecipeNutritionFact_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiscNutritionFact" ADD CONSTRAINT "MiscNutritionFact_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
