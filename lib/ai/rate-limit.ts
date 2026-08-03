import 'server-only';

/**
 * Rate limiting for AI requests.
 *
 * The interface is the point: the in-memory limiter below is correct for a
 * single instance, and a Redis- or database-backed limiter can replace it
 * without touching a caller. Limits are per user, so one person cannot spend
 * everyone else's allowance.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** When the current window resets, as epoch milliseconds. */
  resetAt: number;
}

export interface RateLimiter {
  check(key: string): Promise<RateLimitResult>;
}

export interface FixedWindowOptions {
  limit: number;
  windowMs: number;
}

/** Generous enough for real use, low enough to bound cost and abuse. */
export const AI_RATE_LIMIT: FixedWindowOptions = {
  limit: 20,
  windowMs: 5 * 60 * 1000,
};

interface WindowState {
  count: number;
  resetAt: number;
}

const STORE_KEY = Symbol.for('applypilot.ratelimit');

function store(): Map<string, WindowState> {
  const scope = globalThis as typeof globalThis & { [STORE_KEY]?: Map<string, WindowState> };
  scope[STORE_KEY] ??= new Map();
  return scope[STORE_KEY];
}

export class InMemoryRateLimiter implements RateLimiter {
  constructor(private readonly options: FixedWindowOptions = AI_RATE_LIMIT) {}

  async check(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const windows = store();
    const existing = windows.get(key);

    if (!existing || existing.resetAt <= now) {
      const resetAt = now + this.options.windowMs;
      windows.set(key, { count: 1, resetAt });
      this.evictExpired(now);
      return { allowed: true, remaining: this.options.limit - 1, resetAt };
    }

    if (existing.count >= this.options.limit) {
      return { allowed: false, remaining: 0, resetAt: existing.resetAt };
    }

    existing.count += 1;
    return {
      allowed: true,
      remaining: this.options.limit - existing.count,
      resetAt: existing.resetAt,
    };
  }

  private evictExpired(now: number): void {
    const windows = store();
    if (windows.size < 1000) return;
    for (const [key, state] of windows) {
      if (state.resetAt <= now) windows.delete(key);
    }
  }
}

let limiter: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  limiter ??= new InMemoryRateLimiter();
  return limiter;
}

/** Test seam. */
export function setRateLimiter(next: RateLimiter | null): void {
  limiter = next;
}
