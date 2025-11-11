import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { RecipeStatus } from '@prisma/client';
import { RecipeWorkerService } from './recipe-worker.service';
import { RecipeWorkerModel } from './models/recipe-worker.model';
import { CreateRecipeWorkerInput } from './dto/create-recipe-worker.input';

@Resolver(() => RecipeWorkerModel)
export class RecipeWorkerResolver {
  constructor(private readonly recipeWorkerService: RecipeWorkerService) {}

  @Mutation(() => RecipeWorkerModel, {
    name: 'create',
    description: 'Create a new recipe worker that will process an AI prompt',
  })
  async create(
    @Args('input') input: CreateRecipeWorkerInput,
  ): Promise<RecipeWorkerModel> {
    return this.recipeWorkerService.create(input.prompt);
  }

  @Query(() => [RecipeWorkerModel], {
    name: 'workers',
    description: 'Retrieve a list of recent recipe workers',
  })
  async workers(
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
  ): Promise<RecipeWorkerModel[]> {
    return this.recipeWorkerService.findMany(limit ?? 50, statuses);
  }
}
