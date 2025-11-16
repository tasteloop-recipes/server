import {
  Args,
  Parent,
  ResolveField,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { RecipesPage } from './models/recipes-page.model';
import { RecipeModel } from './models/recipe.model';
import { RecipesService } from './recipes.service';
import { RecipesInput } from './dto/recipes.input';
import { RecipeImageModel } from './models/recipe-image.model';
import { PubSubService } from '../pubsub/pubsub.service';
import {
  RECIPES_UPDATED_EVENT,
  RECIPE_UPDATED_EVENT,
} from '../pubsub/pubsub.constants';

@Resolver(() => RecipeModel)
export class RecipesResolver {
  constructor(
    private readonly recipesService: RecipesService,
    private readonly pubSub: PubSubService,
  ) {}

  @Subscription(() => RecipesPage, {
    description: 'Retrieve a paginated list of recipes',
  })
  recipes(@Args('input') input: RecipesInput): AsyncIterable<RecipesPage> {
    const iterator = this.pubSub.asyncIterator(RECIPES_UPDATED_EVENT);
    const { recipesService } = this;
    const { page, limit } = input;

    const stream =
      async function* recipesStream(): AsyncGenerator<RecipesPage> {
        yield await recipesService.findAll(page, limit);
        for await (const event of iterator) {
          void event;
          yield await recipesService.findAll(page, limit);
        }
      };

    return stream();
  }

  @Subscription(() => RecipeModel, {
    description: 'Retrieve a recipe by its identifier',
  })
  recipe(
    @Args('id', { type: () => String }) id: string,
  ): AsyncIterable<RecipeModel> {
    const iterator = this.pubSub.asyncIterator<{ recipeId: string }>(
      RECIPE_UPDATED_EVENT,
    );
    const { recipesService } = this;

    const stream = async function* recipeStream(): AsyncGenerator<RecipeModel> {
      yield await recipesService.findOne(id);
      for await (const payload of iterator) {
        if (payload.recipeId !== id) {
          continue;
        }
        yield await recipesService.findOne(id);
      }
    };

    return stream();
  }

  @ResolveField(() => RecipeImageModel, {
    nullable: true,
    description: 'Retrieve the image associated with the recipe',
  })
  async image(@Parent() recipe: RecipeModel): Promise<RecipeImageModel | null> {
    return this.recipesService.findImage(recipe.id);
  }
}
