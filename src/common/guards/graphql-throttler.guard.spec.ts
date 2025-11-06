import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import type {
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { GraphqlThrottlerGuard } from './graphql-throttler.guard';

const createGuard = (): GraphqlThrottlerGuard => {
  const options: ThrottlerModuleOptions = {
    throttlers: [
      {
        name: 'default',
        ttl: 60_000,
        limit: 10,
      },
    ],
  };

  const storageService: ThrottlerStorage = {
    increment: jest.fn(async () =>
      Promise.resolve({
        totalHits: 0,
        timeToExpire: 0,
        isBlocked: false,
        timeToBlockExpire: 0,
      }),
    ),
  };

  return new GraphqlThrottlerGuard(options, storageService, new Reflector());
};

describe('GraphqlThrottlerGuard', () => {
  it('should extract the HTTP request/response pair from the GraphQL context', () => {
    const guard = createGuard();
    const req = { id: 'request' };
    const res = { id: 'response' };
    const args = [null, null, { req, res }, null] as const;
    const executionContextHost = new ExecutionContextHost(
      [...args],
      class {},
      () => undefined,
    );
    executionContextHost.setType('graphql');
    const executionContext: ExecutionContext = executionContextHost;

    const getTypeSpy = jest.spyOn(executionContextHost, 'getType');
    const getArgsSpy = jest.spyOn(executionContextHost, 'getArgs');

    const result = guard.getRequestResponse(executionContext);

    expect(getTypeSpy).toHaveBeenCalledTimes(1);
    expect(getArgsSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ req, res });
  });
});
