-- CreateEnum
CREATE TYPE "RecipeLogType" AS ENUM ('RECIPE_CREATED', 'IMAGE_GENERATED', 'RECIPE_MODIFIED', 'MODIFICATION_REQUESTED');

-- CreateTable
CREATE TABLE "RecipeLog" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "RecipeLogType" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecipeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecipeLog_recipeId_idx" ON "RecipeLog"("recipeId");

-- AddForeignKey
ALTER TABLE "RecipeLog" ADD CONSTRAINT "RecipeLog_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeLog" ADD CONSTRAINT "RecipeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
