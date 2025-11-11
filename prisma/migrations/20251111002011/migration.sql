/*
  Warnings:

  - You are about to drop the column `prompt` on the `Recipe` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[workerId]` on the table `Recipe` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `workerId` to the `Recipe` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RecipeStatus" AS ENUM ('CREATED', 'PROCESSING_RECIPE', 'RECIPE_CREATED', 'PROCESSING_IMAGE', 'PENDING_MODIFICATIONS', 'READY');

-- AlterTable
ALTER TABLE "Recipe" DROP COLUMN "prompt",
ADD COLUMN     "workerId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "RecipeWorker" (
    "id" TEXT NOT NULL,
    "status" "RecipeStatus" NOT NULL DEFAULT 'CREATED',
    "prompt" VARCHAR(1000) NOT NULL,

    CONSTRAINT "RecipeWorker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_workerId_key" ON "Recipe"("workerId");

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "RecipeWorker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
