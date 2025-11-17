import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
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

      let errorMessage = 'Failed to enqueue recipe generation job';
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }
      throw new InternalServerErrorException(errorMessage, {
        cause: error instanceof Error ? error : undefined,
      });
    }

    return worker;
  }

  async findManyWithFilters(
    limit = 50,
    statuses?: RecipeStatus[],
  ): Promise<RecipeWorker[]> {
    const sanitizedLimit = Math.min(Math.max(limit, 1), MAX_WORKERS_PAGE_SIZE);
    const statusFilter =
      statuses !== undefined && statuses.length > 0
        ? { status: { in: statuses } }
        : undefined;

    return this.prisma.recipeWorker.findMany({
      where: statusFilter,
      take: sanitizedLimit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<RecipeWorker> {
    const worker = await this.prisma.recipeWorker.findUnique({
      where: { id },
    });

    if (!worker) {
      throw new NotFoundException(`Recipe worker with id "${id}" not found`);
    }

    return worker;
  }
}
