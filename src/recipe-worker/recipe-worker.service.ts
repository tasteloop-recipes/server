import { BadRequestException, Injectable } from '@nestjs/common';
import { type RecipeWorker, RecipeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const MAX_WORKERS_PAGE_SIZE = 100;

@Injectable()
export class RecipeWorkerService {
  constructor(private readonly prisma: PrismaService) {}

  async create(prompt?: string): Promise<RecipeWorker> {
    const trimmedPrompt = prompt?.trim();

    if (trimmedPrompt === undefined || trimmedPrompt === '') {
      throw new BadRequestException('Prompt is required to generate a recipe');
    }

    return this.prisma.recipeWorker.create({
      data: {
        prompt: trimmedPrompt,
      },
    });
  }

  async findMany(
    limit = 50,
    statuses?: RecipeStatus[],
  ): Promise<RecipeWorker[]> {
    const sanitizedLimit = Math.min(Math.max(limit, 1), MAX_WORKERS_PAGE_SIZE);

    return this.prisma.recipeWorker.findMany({
      where:
        statuses && statuses.length > 0
          ? { status: { in: statuses } }
          : undefined,
      take: sanitizedLimit,
      orderBy: { createdAt: 'desc' },
    });
  }
}
