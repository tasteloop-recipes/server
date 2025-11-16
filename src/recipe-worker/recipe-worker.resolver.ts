import { Args, Int, Mutation, Resolver, Subscription } from '@nestjs/graphql';
import { RecipeStatus } from '@prisma/client';
import { RecipeWorkerService } from './recipe-worker.service';
import { RecipeWorkerModel } from './models/recipe-worker.model';
import { CreateRecipeWorkerInput } from './dto/create-recipe-worker.input';
import { PubSubService } from '../pubsub/pubsub.service';
import { WORKERS_UPDATED_EVENT } from '../pubsub/pubsub.constants';

@Resolver(() => RecipeWorkerModel)
export class RecipeWorkerResolver {
  constructor(
    private readonly recipeWorkerService: RecipeWorkerService,
    private readonly pubSub: PubSubService,
  ) {}

  @Mutation(() => RecipeWorkerModel, {
    name: 'create',
    description: 'Create a new recipe worker that will process an AI prompt',
  })
  async create(
    @Args('input') input: CreateRecipeWorkerInput,
  ): Promise<RecipeWorkerModel> {
    return this.recipeWorkerService.create(input.prompt);
  }

  @Subscription(() => [RecipeWorkerModel], {
    name: 'workers',
    description: 'Retrieve a list of recent recipe workers',
  })
  workers(
    @Args('limit', {
      type: () => Int,
      nullable: true,
      description: 'Maximum number of workers to return (default 50, max 100)',
    })
    limit?: number,
    @Args('statuses', {
      type: () => [RecipeStatus],
      nullable: true,
      description: 'Optional statuses to filter workers by',
    })
    statuses?: RecipeStatus[],
  ): AsyncIterable<RecipeWorkerModel[]> {
    const iterator = this.pubSub.asyncIterator(WORKERS_UPDATED_EVENT);
    const { recipeWorkerService } = this;

    const stream = async function* workersStream(): AsyncGenerator<
      RecipeWorkerModel[]
    > {
      yield await recipeWorkerService.findMany(limit, statuses);
      for await (const event of iterator) {
        void event;
        yield await recipeWorkerService.findMany(limit, statuses);
      }
    };

    return stream();
  }
}
