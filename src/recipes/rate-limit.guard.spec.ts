import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { RateLimitGuard } from './rate-limit.guard';

const createExecutionContext = (request: Partial<Request>): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => request as Request,
    }),
    getClass: () => undefined,
    getHandler: () => undefined,
    getArgs: () => [],
    getArgByIndex: () => undefined,
    getType: () => 'http',
    switchToRpc: () => ({
      getContext: () => undefined,
      getData: () => undefined,
    }),
    switchToWs: () => ({
      getClient: () => undefined,
      getData: () => undefined,
    }),
  }) as unknown as ExecutionContext;

describe('RateLimitGuard', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows requests under the rate limit', () => {
    const guard = new RateLimitGuard();
    const request: Partial<Request> = { ip: '127.0.0.1', socket: { remoteAddress: '127.0.0.1' } as never };
    const context = createExecutionContext(request);
    const nowSpy = jest.spyOn(Date, 'now');
    let currentTime = 0;
    nowSpy.mockImplementation(() => currentTime);
    jest.spyOn(Math, 'random').mockReturnValue(1);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      currentTime = attempt * 1000;
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    }
  });

  it('denies requests when the rate limit is exceeded for the same IP', () => {
    const guard = new RateLimitGuard();
    const request: Partial<Request> = { ip: '10.0.0.1', socket: { remoteAddress: '10.0.0.1' } as never };
    const context = createExecutionContext(request);
    const nowSpy = jest.spyOn(Date, 'now');
    let currentTime = 0;
    nowSpy.mockImplementation(() => currentTime);
    jest.spyOn(Math, 'random').mockReturnValue(1);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      currentTime = attempt * 1000;
      expect(guard.canActivate(context)).toBe(true);
    }

    currentTime = 11_000;
    expect(guard.canActivate(context)).toBe(false);
  });

  it('falls back to socket remote address when request IP is missing', () => {
    const guard = new RateLimitGuard();
    const request: Partial<Request> = {
      socket: { remoteAddress: '192.168.1.5' } as never,
    };
    const context = createExecutionContext(request);
    jest.spyOn(Date, 'now').mockReturnValue(0);
    jest.spyOn(Math, 'random').mockReturnValue(1);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('cleans up empty IP buckets when cleanup runs', () => {
    const guard = new RateLimitGuard();
    const guardWithStore = guard as unknown as { store: Map<string, number[]> };
    guardWithStore.store.set('stale-ip', []);

    const request: Partial<Request> = { ip: 'fresh-ip', socket: { remoteAddress: 'fresh-ip' } as never };
    const context = createExecutionContext(request);
    jest.spyOn(Date, 'now').mockReturnValue(0);
    jest.spyOn(Math, 'random').mockReturnValue(0);

    expect(guard.canActivate(context)).toBe(true);
    expect(guardWithStore.store.has('stale-ip')).toBe(false);
  });
});
