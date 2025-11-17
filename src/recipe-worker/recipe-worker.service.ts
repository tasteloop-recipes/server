import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { type RecipeWorker, RecipeStatus } from '@prisma/client';
import type { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

const MAX_WORKERS_PAGE_SIZE = 100;

@Injectable()
export class RecipeWorkerService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('recipe-generation')
    private readonly recipeGenerationQueue: Queue<{ workerId: string }>,
  ) {}

  async create(prompt?: string): Promise<RecipeWorker> {
    const trimmedPrompt = prompt?.trim();

    if (trimmedPrompt === undefined || trimmedPrompt === '') {
      throw new BadRequestException('Prompt is required to generate a recipe');
    }

    const worker = await this.prisma.recipeWorker.create({
      data: {
        prompt: trimmedPrompt,
      },
    });

    try {
      await this.recipeGenerationQueue.add(
        'generate-recipe',
        { workerId: worker.id },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    } catch (error: unknown) {
      await this.prisma.recipeWorker.update({
        where: { id: worker.id },
        data: { status: RecipeStatus.ERROR },
      });

      throw new InternalServerErrorException(
        'Failed to enqueue recipe generation job',
        { cause: error instanceof Error ? error : undefined },
      );
    }

    return worker;
  }

  async findManyWithFilters(
    limit = 50,
    statuses?: RecipeStatus[],
  ): Promise<RecipeWorker[]> {
    const sanitizedLimit = Math.min(Math.max(limit, 1), MAX_WORKERS_PAGE_SIZE);

    return this.prisma.recipeWorker.findMany({
      where:
        statuses?.length > 0
          ? { status: { in: statuses } }
          : undefined,
      take: sanitizedLimit,
      orderBy: { createdAt: 'desc' },
    });
  }
}
