import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import OpenAI from 'openai';
import {
  RecipeData,
  recipeResponseFormat,
  recipeValidFormat,
} from './ai.types';

@Injectable()
export class AiService {
  constructor(@Inject(OpenAI) private readonly openai: OpenAI | undefined) {}

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

  // @todo: OpenAI generated images are temporary, will need to be stored in a proper object storage later
  async generateRecipeImage(recipe: RecipeData): Promise<string> {
    if (this.openai == null) {
      throw new InternalServerErrorException(
        'OpenAI client is not initialized. Please check your configuration.',
      );
    }

    const prompt = this.buildImagePrompt(recipe);

    try {
      const imageResponse = await this.openai.images.generate({
        model: 'gpt-image-1',
        size: '1024x1024',
        prompt,
      });

      const imageUrl = imageResponse.data?.[0]?.url;

      if (typeof imageUrl !== 'string') {
        throw new InternalServerErrorException(
          'OpenAI did not return an image URL.',
        );
      }

      return imageUrl;
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
}
