import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import OpenAI from 'openai';
import { RecipeData, recipeResponseFormat } from './ai.types';

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
      const response = await this.openai.responses.parse({
        model: 'gpt-5',
        input: prompt,
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
