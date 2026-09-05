import "server-only";

/**
 * Rate limiting (Sections 7.2 / 14). A process-local fixed-window limiter is the
 * default so the app works with no external services; when REDIS_URL (Upstash)
 * is configured in Phase 7 a distributed limiter slots in behind the same
 * `limit()` signature. In-memory state is per-instance and resets on restart —
 * acceptable for dev and a soft backstop in production.
 */

export interface RateLimitResult {
  success: boolean;
  /** Requests remaining in the current window. */
  remaining: number;
  /** Seconds until the window resets. */
  resetSeconds: number;
}

interface Window {
  count: number;
  resetAt: number; // epoch ms
}

const store = new Map<string, Window>();
let lastSweep = 0;

function sweep(now: number) {
  // Opportunistic cleanup so the map can't grow unbounded.
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, win] of store) {
    if (win.resetAt <= now) store.delete(key);
  }
}

/**
 * Fixed-window limiter. `key` identifies the caller (e.g. `upload:<ipHash>`),
 * `max` requests per `windowSeconds`.
 */
export function limit(
  key: string,
  max: number,
  windowSeconds: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowSeconds * 1000;
    store.set(key, { count: 1, resetAt });
    return { success: true, remaining: max - 1, resetSeconds: windowSeconds };
  }

  const resetSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  if (existing.count >= max) {
    return { success: false, remaining: 0, resetSeconds };
  }
  existing.count += 1;
  return { success: true, remaining: max - existing.count, resetSeconds };
}
