-- Remove ProteinType.NONE from enum
ALTER TYPE "ProteinType" RENAME TO "ProteinType_old";
CREATE TYPE "ProteinType" AS ENUM ('PORK', 'TOFU', 'BEEF', 'CHICKEN', 'SEAFOOD', 'OTHER');
ALTER TABLE "Recipe" ALTER COLUMN "proteinType" DROP DEFAULT;
ALTER TABLE "Recipe" ALTER COLUMN "proteinType" TYPE "ProteinType"[] USING ARRAY["proteinType"]::"ProteinType"[];
ALTER TABLE "Recipe" ALTER COLUMN "proteinType" SET DEFAULT ARRAY[]::("ProteinType")[];
DROP TYPE "ProteinType_old";

-- Update Recipe table: remove nutrition fields and change description type
ALTER TABLE "Recipe" ADD COLUMN "description_new" TEXT;
UPDATE "Recipe" SET "description_new" = "description";
ALTER TABLE "Recipe" DROP COLUMN "description";
ALTER TABLE "Recipe" RENAME COLUMN "description_new" TO "description";
ALTER TABLE "Recipe" DROP COLUMN "calories";
ALTER TABLE "Recipe" DROP COLUMN "carbs";
ALTER TABLE "Recipe" DROP COLUMN "fat";
ALTER TABLE "Recipe" DROP COLUMN "protein";
ALTER TABLE "Recipe" DROP COLUMN "fiber";

-- Update RecipeNutritionFact table to include specific nutrition fields
ALTER TABLE "RecipeNutritionFact" DROP COLUMN "label";
ALTER TABLE "RecipeNutritionFact" DROP COLUMN "value";
ALTER TABLE "RecipeNutritionFact" DROP COLUMN "unit";
ALTER TABLE "RecipeNutritionFact" ADD COLUMN "calories" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "RecipeNutritionFact" ADD COLUMN "carbs" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "RecipeNutritionFact" ADD COLUMN "fat" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "RecipeNutritionFact" ADD COLUMN "protein" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "RecipeNutritionFact" ADD COLUMN "fiber" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Create MiscNutritionFact table
CREATE TABLE "MiscNutritionFact" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,

    CONSTRAINT "MiscNutritionFact_pkey" PRIMARY KEY ("id")
);

-- Create index
CREATE INDEX "MiscNutritionFact_recipeId_idx" ON "MiscNutritionFact"("recipeId");

-- Add foreign key
ALTER TABLE "MiscNutritionFact" ADD CONSTRAINT "MiscNutritionFact_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
