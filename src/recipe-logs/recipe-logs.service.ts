import { Injectable } from '@nestjs/common';
import { RecipeLog, RecipeLogType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface CreateRecipeLogParams {
  recipeId: string;
  type: RecipeLogType;
  message: string;
  userId?: string | null;
}

@Injectable()
export class RecipeLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForRecipe(recipeId: string): Promise<RecipeLog[]> {
    return this.prisma.recipeLog.findMany({
      where: { recipeId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createLog({
    recipeId,
    type,
    message,
    userId,
  }: CreateRecipeLogParams): Promise<void> {
    const sanitizedMessage = message.trim();
    if (sanitizedMessage.length === 0) {
      return;
    }

    await this.prisma.recipeLog.create({
      data: {
        recipeId,
        userId: userId ?? null,
        type,
        message: sanitizedMessage,
      },
    });
  }
}
