import 'server-only';

/**
 * In-memory sliding-window rate limiter.
 *
 * ⚠️ Production deployments running multiple Node instances (serverless,
 * multi-region, etc.) MUST replace this with Redis/Upstash (`@upstash/ratelimit`
 * or equivalent). This implementation only enforces limits per process; it is
 * a defense-in-depth baseline, not a distributed solution.
 */

interface Bucket {
  /** Number of requests counted in the current window. */
  count: number;
  /** Epoch ms at which the bucket resets. */
  resetAt: number;
}

interface FailureBucket {
  count: number;
  blockedUntil: number;
}

const buckets = new Map<string, Bucket>();
const failures = new Map<string, FailureBucket>();

/**
 * Periodically evict expired entries so the maps don't grow unbounded.
 * Runs lazily on each consume() call rather than via setInterval to play nice
 * with serverless cold starts.
 */
function gc(now: number): void {
  if (buckets.size > 1000) {
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
  }
  if (failures.size > 1000) {
    for (const [k, b] of failures) {
      if (b.blockedUntil <= now && b.count === 0) failures.delete(k);
    }
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs: number;
}

/**
 * Consume one unit from the bucket identified by `key`.
 * Returns `{ ok: false }` if the limit has been hit.
 *
 * @param key      stable identifier (e.g. `signin:<email>` or `ip:<addr>`)
 * @param limit    max requests per window
 * @param windowMs window length in milliseconds
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  gc(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const fresh: Bucket = { count: 1, resetAt: now + windowMs };
    buckets.set(key, fresh);
    return { ok: true, remaining: limit - 1, resetAt: fresh.resetAt, retryAfterMs: 0 };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterMs: existing.resetAt - now,
    };
  }

  existing.count += 1;
  return {
    ok: true,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
    retryAfterMs: 0,
  };
}

/**
 * Record a failed attempt (e.g. wrong OTP). After `maxFailures` within
 * `windowMs`, the key is blocked for `blockMs`.
 */
export function recordFailure(
  key: string,
  maxFailures: number,
  blockMs: number,
): { blocked: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const existing = failures.get(key);

  // If currently blocked, surface that
  if (existing && existing.blockedUntil > now) {
    return { blocked: true, remaining: 0, retryAfterMs: existing.blockedUntil - now };
  }

  const next: FailureBucket = existing && existing.blockedUntil > now - blockMs
    ? { count: existing.count + 1, blockedUntil: existing.blockedUntil }
    : { count: 1, blockedUntil: 0 };

  if (next.count >= maxFailures) {
    next.blockedUntil = now + blockMs;
    failures.set(key, next);
    return { blocked: true, remaining: 0, retryAfterMs: blockMs };
  }

  failures.set(key, next);
  return { blocked: false, remaining: maxFailures - next.count, retryAfterMs: 0 };
}

/** Clear failure counter on success (e.g. correct OTP entered). */
export function clearFailures(key: string): void {
  failures.delete(key);
}

/** Returns `true` if the key is currently in a blocked window. */
export function isBlocked(key: string): { blocked: boolean; retryAfterMs: number } {
  const now = Date.now();
  const existing = failures.get(key);
  if (!existing || existing.blockedUntil <= now) {
    return { blocked: false, retryAfterMs: 0 };
  }
  return { blocked: true, retryAfterMs: existing.blockedUntil - now };
}

// ============================================================
// Preset limits (single source of truth across action files)
// ============================================================

export const LIMITS = {
  signIn:    { limit: 10, windowMs: 15 * 60 * 1000 }, // 10 / 15 min
  signUp:    { limit: 5,  windowMs: 60 * 60 * 1000 }, // 5  / hour
  forgotPwd: { limit: 3,  windowMs: 60 * 60 * 1000 }, // 3  / hour
  verifyCode:{ limit: 10, windowMs: 15 * 60 * 1000 }, // 10 / 15 min
  sendMessage:{ limit: 30, windowMs: 60 * 1000 },     // 30 / min
  ai:        { limit: 20, windowMs: 60 * 1000 },      // 20 / min
} as const;

/** OTP brute-force counter: 5 failures → 15-minute lockout. */
export const OTP_MAX_FAILURES = 5;
export const OTP_BLOCK_MS = 15 * 60 * 1000;
