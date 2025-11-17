import { createTimeoutGuard } from './timeout.util';

describe('createTimeoutGuard', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('rejects with the provided error when the timeout elapses', async () => {
    const guard = createTimeoutGuard(5000, () => new Error('boom'));

    const pendingPromise = expect(guard.promise).rejects.toThrow('boom');

    jest.advanceTimersByTime(5000);

    await pendingPromise;
  });

  it('cancels the underlying timeout when cancel is invoked', async () => {
    const guard = createTimeoutGuard(5000, () => new Error('boom'));

    guard.cancel();

    jest.advanceTimersByTime(5000);

    // The promise should still be pending because the timer never fires.
    const settled = Promise.race([
      guard.promise.then(() => 'resolved'),
      Promise.resolve('pending check'),
    ]);

    await expect(settled).resolves.toBe('pending check');
  });
});
