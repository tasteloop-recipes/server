import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PubSubService implements OnModuleDestroy {
  private pubsub: PubSub | RedisPubSub;
  private redisClients: { publisher?: Redis; subscriber?: Redis } = {};

  constructor(private configService: ConfigService) {
    const useRedis = this.configService.get<boolean>('USE_REDIS_PUBSUB', false);

    if (useRedis) {
      const redisUrl = this.configService.get<string>('REDIS_URL');

      if (!redisUrl) {
        console.warn(
          'USE_REDIS_PUBSUB is true but REDIS_URL is not set. Falling back to in-memory PubSub.',
        );
        this.pubsub = new PubSub();
      } else {
        const options = {
          retryStrategy: (times: number) => {
            return Math.min(times * 50, 2000);
          },
        };

        this.redisClients.publisher = new Redis(redisUrl, options);
        this.redisClients.subscriber = new Redis(redisUrl, options);

        this.pubsub = new RedisPubSub({
          publisher: this.redisClients.publisher,
          subscriber: this.redisClients.subscriber,
        });

        console.log('Using Redis PubSub for subscriptions');
      }
    } else {
      this.pubsub = new PubSub();
      console.log('Using in-memory PubSub for subscriptions');
    }
  }

  publish(triggerName: string, payload: any): Promise<void> {
    return this.pubsub.publish(triggerName, payload);
  }

  asyncIterator<T>(triggers: string | string[]): AsyncIterator<T> {
    return this.pubsub.asyncIterator<T>(triggers);
  }

  async onModuleDestroy() {
    if (this.redisClients.publisher) {
      await this.redisClients.publisher.quit();
    }
    if (this.redisClients.subscriber) {
      await this.redisClients.subscriber.quit();
    }
  }
}
