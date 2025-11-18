import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ObjectCannedACL,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { RecipeImage } from '@prisma/client';
import OpenAI from 'openai';
import { RecipeData, recipeResponseFormat } from './ai.types';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'node:crypto';

@Injectable()
export class AiService {
  constructor(
    @Inject(OpenAI) private readonly openai: OpenAI | undefined,
    private readonly prisma: PrismaService,
    @Inject(S3Client) private readonly objectStorage: S3Client,
  ) {}

  async generateRecipeData(prompt: string): Promise<RecipeData> {
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
      // Generate recipe data with moderation and relevance validation
      const response = await this.openai.responses.parse({
        model: 'gpt-5.1-mini',
        input: sanitizedPrompt,
        instructions:
          'You are a helpful assistant that provides detailed cooking recipes based on user prompts. Before creating a recipe, you must determine if the prompt is safe, complies with moderation policies, and is clearly about food or cooking. If it violates policies or is not recipe-related, respond with isValid set to false and recipeData as null. Only when the prompt is safe and recipe-related should you set isValid to true and populate recipeData with the detailed recipe. All the instructions and details should be clear, concise, and easy to follow.',
        text: { format: recipeResponseFormat },
      });

      const parsedRecipe = response.output_parsed;

      if (parsedRecipe == null) {
        throw new InternalServerErrorException(
          'OpenAI did not return recipe data in the expected format.',
        );
      }

      if (!parsedRecipe.isValid) {
        throw new BadRequestException(
          'The provided prompt violates content policies or is not related to recipes.',
        );
      }

      if (parsedRecipe.recipeData == null) {
        throw new InternalServerErrorException(
          'OpenAI indicated the prompt was valid but did not return recipe data.',
        );
      }

      return parsedRecipe.recipeData;
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
    const acl = this.resolveObjectAcl(process.env.SPACES_OBJECT_ACL);

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

      return await this.prisma.recipeImage.upsert({
        where: {
          recipeId,
        },
        create: {
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
        update: {
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

  private resolveObjectAcl(value: string | undefined): ObjectCannedACL {
    if (value == null) {
      return ObjectCannedACL.public_read;
    }

    return (
      Object.values(ObjectCannedACL).find(
        (allowedAcl) => allowedAcl === value,
      ) ?? ObjectCannedACL.public_read
    );
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
