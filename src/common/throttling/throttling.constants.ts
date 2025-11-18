import { minutes, type ThrottlerOptions } from '@nestjs/throttler';

// These presets mirror the named throttler definitions registered in AppModule.
// Each key (default, queryGlobal, mutation, mutationGlobal) must match a Throttler
// definition so that the @Throttle decorator can override both the per-IP and
// the global budgets in tandem (see https://github.com/nestjs/throttler#usage).

type ThrottleConfig = Record<string, Pick<ThrottlerOptions, 'limit' | 'ttl'>>;

export const MUTATION_THROTTLE: ThrottleConfig = {
  default: {
    limit: 1,
    ttl: minutes(1),
  },
};
