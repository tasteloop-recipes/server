import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { JobResult } from './job-result.entity';

export enum JobState {
  queued = 'queued',
  processing = 'processing',
  recipe_generated = 'recipe_generated',
  image_generated = 'image_generated',
  succeeded = 'succeeded',
  failed = 'failed',
}

registerEnumType(JobState, {
  name: 'JobState',
});

@ObjectType()
export class Job {
  @Field(() => ID)
  id: string;

  @Field(() => JobState)
  state: JobState;

  @Field(() => JobResult, { nullable: true })
  result?: JobResult;

  @Field({ nullable: true })
  error?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
