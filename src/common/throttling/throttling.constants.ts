import type { ThrottlerOptions } from '@nestjs/throttler';

const ONE_MINUTE_IN_MS = 60_000;

// These presets mirror the named throttler definitions registered in AppModule.
// Each key (default, queryGlobal, mutation, mutationGlobal) must match a Throttler
// definition so that the @Throttle decorator can override both the per-IP and
// the global budgets in tandem (see https://github.com/nestjs/throttler#usage).

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
