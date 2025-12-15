/**
 * Retry utility with exponential backoff for transient failures
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'retryableErrors'>> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Check if an error is retryable (transient failure)
 */
function isRetryableError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const err = error as { code?: string; message?: string; cause?: unknown };

  // Database timeout errors
  if (err.code === 'ETIMEDOUT' || err.message?.includes('ETIMEDOUT')) {
    return true;
  }

  // Network errors
  if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    return true;
  }

  // Rate limiting (429) - retryable
  if (err.message?.includes('rate limit') || err.message?.includes('429')) {
    return true;
  }

  // Database connection errors
  if (err.message?.includes('connection') || err.message?.includes('timeout')) {
    return true;
  }

  // Check nested cause
  if (err.cause) {
    return isRetryableError(err.cause);
  }

  return false;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries,
    initialDelayMs,
    maxDelayMs,
    backoffMultiplier,
    retryableErrors = isRetryableError,
  } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  let lastError: unknown;
  let delay = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if it's the last attempt or error is not retryable
      if (attempt === maxRetries || !retryableErrors(error)) {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      const currentDelay = Math.min(delay, maxDelayMs);
      await sleep(currentDelay);
      delay *= backoffMultiplier;
    }
  }

  throw lastError;
}
