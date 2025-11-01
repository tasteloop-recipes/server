import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../common/prisma.service';
import { GenerateRecipeInput } from './dto/generate-recipe.input';
import { JobState } from './entities/job.entity';

@Injectable()
export class JobsService {
  constructor(
    @InjectQueue('recipes') private recipesQueue: Queue,
    private prisma: PrismaService,
  ) {}

  async createAndEnqueue(
    input: GenerateRecipeInput,
    options?: { demo?: boolean },
  ) {
    // Create job in database
    const job = await this.prisma.job.create({
      data: {
        state: 'queued',
        input: { ingredients: input.ingredients },
      },
    });

    // Enqueue job to BullMQ
    await this.recipesQueue.add(
      'generate-recipe',
      {
        jobId: job.id,
        ingredients: input.ingredients,
        demo: options?.demo || false,
      },
      {
        jobId: job.id,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );

    return this.formatJob(job);
  }

  async findById(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      return null;
    }

    return this.formatJob(job);
  }

  async updateState(
    id: string,
    state: JobState,
    data?: { result?: any; error?: any },
  ) {
    const job = await this.prisma.job.update({
      where: { id },
      data: {
        state,
        result: data?.result,
        error: data?.error,
      },
    });

    return this.formatJob(job);
  }

  private formatJob(job: any) {
    return {
      id: job.id,
      state: job.state,
      result: job.result
        ? {
            recipeId: job.result.recipeId,
            imageUrl: job.result.imageUrl,
          }
        : undefined,
      error: job.error ? JSON.stringify(job.error) : undefined,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}
