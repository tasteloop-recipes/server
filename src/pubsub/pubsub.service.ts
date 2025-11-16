import { Injectable } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';

@Injectable()
export class PubSubService extends PubSub {
  override asyncIterator<T>(
    triggers: string | readonly string[],
  ): AsyncIterableIterator<T> {
    return this.asyncIterableIterator<T>(triggers);
  }
}
