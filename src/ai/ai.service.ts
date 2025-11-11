import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { RecipeImage } from '@prisma/client';
import OpenAI from 'openai';
import {
  RecipeData,
  recipeResponseFormat,
  recipeValidFormat,
} from './ai.types';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'node:crypto';

@Injectable()
export class AiService {
  constructor(
    @Inject(OpenAI) private readonly openai: OpenAI | undefined,
    private readonly prisma: PrismaService,
    @Inject(S3Client) private readonly objectStorage: S3Client,
  ) {}

  async generateRecipeData(
    prompt: string,
  ): Promise<typeof recipeResponseFormat.__output> {
    if (this.openai == null) {
      throw new InternalServerErrorException(
        'OpenAI client is not initialized. Please check your configuration.',
      );
    }

    const sanitizedPrompt = prompt.trim();

    if (!sanitizedPrompt) {
      throw new BadRequestException(
        'Prompt is required to generate recipe data',
      );
    }

    try {
      // Step 1: Check moderation
      const moderation = await this.openai.moderations.create({
        model: 'omni-moderation-latest',
        input: sanitizedPrompt,
      });

      if (moderation.results[0].flagged) {
        throw new BadRequestException(
          'The provided prompt violates content policies.',
        );
      }

      // Step 2: Determine if prompt is related to recipes
      const validRecipe = await this.openai.responses.parse({
        model: 'gpt-5-nano',
        input: sanitizedPrompt,
        instructions:
          'Determine if the user prompt is related to food and cooking recipes. The prompt will be used to generate a cooking recipe if it is relevant.',
        text: { format: recipeValidFormat },
      });

      if (validRecipe.output_parsed?.isRecipeRelated === false) {
        throw new BadRequestException(
          'The provided prompt does not seem to be related to recipes.',
        );
      }

      // Step 3: Generate recipe data
      const response = await this.openai.responses.parse({
        model: 'gpt-5-mini',
        input: sanitizedPrompt,
        instructions:
          'You are a helpful assistant that provides detailed cooking recipes based on user prompts. All the instructions and details should be should be clear, concise, and easy to follow.',
        text: { format: recipeResponseFormat },
      });

      const parsedRecipe = response.output_parsed;

      if (parsedRecipe == null) {
        throw new InternalServerErrorException(
          'OpenAI did not return recipe data in the expected format.',
        );
      }

      return parsedRecipe;
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(error);
    }
  }

  async generateRecipeImage(
    recipeId: string,
    recipe: RecipeData,
  ): Promise<RecipeImage> {
    if (this.openai == null) {
      throw new InternalServerErrorException(
        'OpenAI client is not initialized. Please check your configuration.',
      );
    }

    const bucket = process.env.SPACES_BUCKET;
    const region = process.env.SPACES_REGION;
    const acl = process.env.SPACES_OBJECT_ACL ?? 'public-read';

    if (bucket == null || region == null) {
      throw new InternalServerErrorException(
        'Object storage is not configured correctly. Please set SPACES_BUCKET and SPACES_REGION environment variables.',
      );
    }

    const prompt = this.buildImagePrompt(recipe);

    try {
      const imageResponse = await this.openai.images.generate({
        model: 'gpt-image-1',
        size: '1024x1024',
        prompt,
        response_format: 'b64_json',
      });

      const b64Image = imageResponse.data?.[0]?.b64_json;

      if (typeof b64Image !== 'string') {
        throw new InternalServerErrorException(
          'OpenAI did not return image data.',
        );
      }

      const imageBuffer = Buffer.from(b64Image, 'base64');
      const fileName = this.buildImageFileName(recipe.name);
      const objectKey = `recipes/${recipeId}/${fileName}`;
      const contentType = 'image/png';

      await this.objectStorage.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          Body: imageBuffer,
          ContentType: contentType,
          ACL: acl,
        }),
      );

      return await this.prisma.recipeImage.create({
        data: {
          recipe: {
            connect: {
              id: recipeId,
            },
          },
          spaceName: bucket,
          region,
          objectKey,
          fileName,
          contentType,
        },
      });
    } catch (error: unknown) {
      throw new InternalServerErrorException(error);
    }
  }

  private buildImagePrompt(recipe: RecipeData): string {
    const ingredientList = recipe.ingredients
      .map((ing) => `${ing.name} (${ing.amount})`)
      .join(', ');

    return [
      `A high-quality, cinematic food photograph of "${recipe.name}"`,
      recipe.description,
      `Key ingredients: ${ingredientList}.`,
      'Style: natural light, shallow depth of field, vibrant colors, soft shadows, no text, no labels, no people, professional food styling.',
    ].join('\n');
  }

  private buildImageFileName(recipeName: string): string {
    const normalizedName = recipeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    return `${normalizedName || 'recipe'}-${randomUUID()}.png`;
  }
}
