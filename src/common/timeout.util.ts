export interface TimeoutGuard {
  /**
   * Promise that rejects after the configured timeout.
   * Intended to be raced alongside the async operation that needs protection.
   */
  readonly promise: Promise<never>;

  /**
   * Cancels the scheduled timeout so Node.js can reclaim the timer handle.
   */
  cancel: () => void;
}

/**
 * Creates a cancelable timeout promise. When raced with another async task, the
 * guard ensures we surface a descriptive error if the task takes too long while
 * still allowing the timer to be cleared when the task finishes early.
 */
export function createTimeoutGuard(
  timeoutMs: number,
  errorFactory: () => Error,
): TimeoutGuard {
  let timeoutHandle: NodeJS.Timeout | undefined = undefined;

  const promise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(errorFactory());
    }, timeoutMs);
  });

  return {
    promise,
    cancel: (): void => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = undefined;
      }
    },
  };
}
