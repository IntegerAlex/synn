/**
 * Exponential backoff utility for handling rate-limited API calls.
 * Retries fetch requests with increasing delays when rate limits are hit.
 */

interface RetryOptions {
  /** Maximum number of retries (default: 3) */
  maxRetries?: number;
  /** Base delay in milliseconds (default: 1000) */
  baseDelay?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelay?: number;
  /** Jitter factor 0-1 to randomize delay (default: 0.1) */
  jitter?: number;
}

/**
 * Calculate delay for a given retry attempt using exponential backoff with jitter.
 */
export function calculateBackoffDelay(
  attempt: number,
  options: RetryOptions = {},
): number {
  const { baseDelay = 1000, maxDelay = 30000, jitter = 0.1 } = options;
  const exponentialDelay = Math.min(baseDelay * 2 ** attempt, maxDelay);
  const jitterAmount = exponentialDelay * jitter * Math.random();
  return exponentialDelay + jitterAmount;
}

/**
 * Fetch wrapper with exponential backoff for rate-limited requests.
 * Automatically retries on 429 (Rate Limit) and 503 (Service Unavailable) responses.
 */
export async function fetchWithBackoff(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: RetryOptions = {},
): Promise<Response> {
  const { maxRetries = 3 } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(input, init);

    if (response.status === 429 || response.status === 503) {
      if (attempt === maxRetries) {
        return response;
      }

      // Check for Retry-After header
      const retryAfter = response.headers.get("Retry-After");
      let delay: number;

      if (retryAfter) {
        const retryAfterSeconds = Number.parseInt(retryAfter, 10);
        delay = Number.isNaN(retryAfterSeconds)
          ? calculateBackoffDelay(attempt, options)
          : retryAfterSeconds * 1000;
      } else {
        delay = calculateBackoffDelay(attempt, options);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }

    return response;
  }

  // This should not be reached, but TypeScript needs it
  return fetch(input, init);
}
