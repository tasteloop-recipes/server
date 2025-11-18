import { minutes, type ThrottlerOptions } from '@nestjs/throttler';

type ThrottleConfig = Record<string, Pick<ThrottlerOptions, 'limit' | 'ttl'>>;

export const MUTATION_THROTTLE: ThrottleConfig = {
  default: {
    limit: 1,
    ttl: minutes(1),
  },
};
