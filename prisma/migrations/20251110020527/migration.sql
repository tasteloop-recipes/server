/*
  Warnings:

  - The `allergies` column on the `Recipe` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Allergy" AS ENUM ('PEANUTS', 'TREE_NUTS', 'DAIRY', 'EGGS', 'SHELLFISH', 'SOY', 'WHEAT', 'FISH', 'SESAME', 'GLUTEN');

-- AlterTable
ALTER TABLE "Recipe" DROP COLUMN "allergies",
ADD COLUMN     "allergies" "Allergy"[] DEFAULT ARRAY[]::"Allergy"[];
