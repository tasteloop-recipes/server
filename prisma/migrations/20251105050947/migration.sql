/*
  Warnings:

  - You are about to alter the column `prompt` on the `Recipe` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(1000)`.

*/
-- AlterTable
ALTER TABLE "Recipe" ALTER COLUMN "prompt" SET DATA TYPE VARCHAR(1000);
