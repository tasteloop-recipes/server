import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { JobsService } from './jobs.service';
import { PubSubService } from '../graphql/pubsub.service';
import { PrismaService } from '../common/prisma.service';
import { ImagesService } from '../images/images.service';
import { JobState } from './entities/job.entity';
import * as Sentry from '@sentry/node';

@Processor('recipes', {
  concurrency: 6,
  lockDuration: 90000,
})
export class JobsProcessor extends WorkerHost {
  constructor(
    private jobsService: JobsService,
    private pubSubService: PubSubService,
    private prisma: PrismaService,
    private imagesService: ImagesService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { jobId, ingredients } = job.data;

    try {
      // Update to processing state
      await this.updateAndPublish(jobId, JobState.processing);

      // Step 1: Generate recipe using AI (mocked for now)
      const recipe = await this.generateRecipe(ingredients);

      // Create recipe in database
      const dbRecipe = await this.prisma.recipe.create({
        data: {
          jobId,
          imageUrl: '', // Will be updated later
          title: recipe.title,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
        },
      });

      await this.updateAndPublish(jobId, JobState.recipe_generated, {
        result: { recipeId: dbRecipe.id, imageUrl: '' },
      });

      // Step 2: Generate image for the recipe
      const imageUrl = await this.generateAndUploadImage(
        dbRecipe.id,
        recipe.title,
      );

      // Update recipe with image URL
      await this.prisma.recipe.update({
        where: { id: dbRecipe.id },
        data: { imageUrl },
      });

      await this.updateAndPublish(jobId, JobState.image_generated, {
        result: { recipeId: dbRecipe.id, imageUrl },
      });

      // Mark as succeeded
      await this.updateAndPublish(jobId, JobState.succeeded, {
        result: { recipeId: dbRecipe.id, imageUrl },
      });

      return { recipeId: dbRecipe.id, imageUrl };
    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);

      // Report to Sentry
      Sentry.captureException(error, {
        tags: { job_id: jobId },
      });

      await this.updateAndPublish(jobId, JobState.failed, {
        error: {
          message: error.message,
          stack: error.stack,
        },
      });

      throw error;
    }
  }

  private async updateAndPublish(jobId: string, state: JobState, data?: any) {
    const updatedJob = await this.jobsService.updateState(jobId, state, data);
    await this.pubSubService.publish('jobUpdated', { jobUpdated: updatedJob });
  }

  private async generateRecipe(ingredients: string[]): Promise<any> {
    // TODO: Integrate with actual AI service (OpenAI, etc.)
    // For now, return a mock recipe
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate AI processing

    return {
      title: `Recipe with ${ingredients.join(', ')}`,
      ingredients: ingredients.map((ing) => `1 cup of ${ing}`),
      instructions: [
        'Preheat oven to 350°F',
        'Mix all ingredients together',
        'Bake for 30 minutes',
        'Serve hot and enjoy!',
      ],
    };
  }

  private async generateAndUploadImage(
    recipeId: string,
    recipeTitle: string,
  ): Promise<string> {
    // TODO: Integrate with actual image generation service (DALL-E, Midjourney, etc.)
    // For now, generate a simple placeholder and upload it
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate image generation

    const imageBuffer = this.createPlaceholderImage(recipeTitle);
    const imageUrl = await this.imagesService.uploadImage(
      imageBuffer,
      `recipe-${recipeId}.png`,
      'image/png',
    );

    return imageUrl;
  }

  private createPlaceholderImage(text: string): Buffer {
    // Simple placeholder - in production, this would be replaced with actual image generation
    const svg = `
      <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
        <rect width="512" height="512" fill="#4A5568"/>
        <text x="50%" y="50%" font-family="Arial" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">
          ${text}
        </text>
      </svg>
    `;
    return Buffer.from(svg);
  }
}
