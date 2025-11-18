import type { ThrottlerOptions } from '@nestjs/throttler';

const ONE_MINUTE_IN_MS = 60_000;

type ThrottleConfig = Record<string, Pick<ThrottlerOptions, 'limit' | 'ttl'>>;

export const QUERY_THROTTLE: ThrottleConfig = {
  default: {
    limit: 100,
    ttl: ONE_MINUTE_IN_MS,
  },
  queryGlobal: {
    limit: 1500,
    ttl: ONE_MINUTE_IN_MS,
  },
};

export const MUTATION_THROTTLE: ThrottleConfig = {
  default: {
    limit: 1,
    ttl: ONE_MINUTE_IN_MS,
  },
  mutationGlobal: {
    limit: 15,
    ttl: ONE_MINUTE_IN_MS,
  },
};
