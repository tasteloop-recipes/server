import {
  Resolver,
  Query,
  Mutation,
  Args,
  Subscription,
  ID,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { Job } from './entities/job.entity';
import { GenerateRecipeInput } from './dto/generate-recipe.input';
import { GqlAuthGuard } from '../graphql/gql-auth.guard';
import { PubSubService } from '../graphql/pubsub.service';
import { RateLimitGuard } from '../common/rate-limit.guard';
import { ConfigService } from '@nestjs/config';

@Resolver(() => Job)
export class JobsResolver {
  constructor(
    private jobsService: JobsService,
    private pubSubService: PubSubService,
    private configService: ConfigService,
  ) {}

  @Query(() => Job, { nullable: true })
  async job(@Args('id', { type: () => ID }) id: string): Promise<Job | null> {
    return this.jobsService.findById(id);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Job)
  async generateRecipe(
    @Args('input') input: GenerateRecipeInput,
  ): Promise<Job> {
    return this.jobsService.createAndEnqueue(input);
  }

  @UseGuards(RateLimitGuard)
  @Mutation(() => Job, { nullable: true })
  async generateRecipeDemo(
    @Args('input') input: GenerateRecipeInput,
  ): Promise<Job | null> {
    const enableDemo = this.configService.get<string>('ENABLE_DEMO') === 'true';

    if (!enableDemo) {
      return null;
    }

    return this.jobsService.createAndEnqueue(input, { demo: true });
  }

  @Subscription(() => Job, {
    filter: (payload, variables) => {
      return payload.jobUpdated.id === variables.id;
    },
  })
  jobUpdated(@Args('id', { type: () => ID }) id: string) {
    return this.pubSubService.asyncIterator('jobUpdated');
  }
}
