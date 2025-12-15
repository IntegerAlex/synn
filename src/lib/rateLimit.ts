/**
 * In-memory rate limiter for API routes
 * Note: This is a simple implementation that works for single-server deployments
 * For multi-server deployments, consider using Redis or a similar distributed store
 */

interface RateLimitEntry {
  requests: number[];
  resetTime: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in milliseconds
}

class InMemoryRateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private windowMs: number = 60 * 1000, // 1 minute default window
    private maxRequests: number = 100, // 100 requests per window
    private cleanupMs: number = 5 * 60 * 1000 // Clean up every 5 minutes
  ) {
    this.startCleanup();
  }

  /**
   * Check if a request should be allowed
   */
  check(identifier: string): RateLimitResult {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    if (!entry) {
      // First request from this identifier
      const newEntry: RateLimitEntry = {
        requests: [now],
        resetTime: now + this.windowMs,
      };
      this.requests.set(identifier, newEntry);
      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - 1,
        reset: newEntry.resetTime,
      };
    }

    // Clean up old requests outside the current window
    const validRequests = entry.requests.filter((time) => now - time < this.windowMs);

    if (validRequests.length >= this.maxRequests) {
      // Rate limit exceeded
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        reset: entry.resetTime,
      };
    }

    // Add current request and update entry
    validRequests.push(now);
    const updatedEntry: RateLimitEntry = {
      requests: validRequests,
      resetTime: entry.resetTime,
    };
    this.requests.set(identifier, updatedEntry);

    return {
      success: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - validRequests.length,
      reset: updatedEntry.resetTime,
    };
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const toDelete: string[] = [];

      for (const [identifier, entry] of this.requests.entries()) {
        // Remove entries where all requests are outside the window
        const validRequests = entry.requests.filter((time) => now - time < this.windowMs);
        if (validRequests.length === 0) {
          toDelete.push(identifier);
        } else {
          // Update the entry with cleaned requests
          entry.requests = validRequests;
        }
      }

      // Remove expired entries
      toDelete.forEach((id) => this.requests.delete(id));
    }, this.cleanupMs);
  }

  /**
   * Stop cleanup interval (useful for testing)
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get current stats (useful for monitoring)
   */
  getStats(): { totalIdentifiers: number; memoryUsage: number } {
    return {
      totalIdentifiers: this.requests.size,
      memoryUsage: JSON.stringify(Array.from(this.requests.entries())).length,
    };
  }
}

// Create global rate limiter instance
export const rateLimiter = new InMemoryRateLimiter();

// Export types
export type { RateLimitResult };

// Helper function for API routes
export function checkRateLimit(identifier: string): RateLimitResult {
  return rateLimiter.check(identifier);
}

// Different rate limit configurations for different endpoints
export const rateLimitConfigs = {
  // General API rate limit
  api: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 requests per minute

  // Stricter limit for auth endpoints
  auth: { windowMs: 5 * 60 * 1000, maxRequests: 10 }, // 10 requests per 5 minutes

  // Stricter limit for webhook endpoints
  webhook: { windowMs: 60 * 1000, maxRequests: 30 }, // 30 requests per minute

  // Very strict limit for admin endpoints
  admin: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 requests per 15 minutes

  // GitHub API proxy (respect GitHub's rate limits)
  github: { windowMs: 60 * 1000, maxRequests: 50 }, // 50 requests per minute
};

// Specialized rate limiters for different endpoints
export const authRateLimiter = new InMemoryRateLimiter(
  rateLimitConfigs.auth.windowMs,
  rateLimitConfigs.auth.maxRequests
);

export const webhookRateLimiter = new InMemoryRateLimiter(
  rateLimitConfigs.webhook.windowMs,
  rateLimitConfigs.webhook.maxRequests
);

export const adminRateLimiter = new InMemoryRateLimiter(
  rateLimitConfigs.admin.windowMs,
  rateLimitConfigs.admin.maxRequests
);

export const githubRateLimiter = new InMemoryRateLimiter(
  rateLimitConfigs.github.windowMs,
  rateLimitConfigs.github.maxRequests
);