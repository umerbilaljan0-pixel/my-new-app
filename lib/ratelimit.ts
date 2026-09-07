import "server-only";

/**
 * Rate limiting (Sections 7.2 / 14). Uses Upstash Redis (REST) when configured
 * for a distributed fixed-window limiter; otherwise a process-local in-memory
 * limiter so the app works with no external services. Both share one shape.
 */

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetSeconds: number;
}

/* ── In-memory fallback ──────────────────────────────────────────────────── */

interface Window {
  count: number;
  resetAt: number;
}
const store = new Map<string, Window>();
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, win] of store) if (win.resetAt <= now) store.delete(key);
}

export function limit(key: string, max: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { success: true, remaining: max - 1, resetSeconds: windowSeconds };
  }
  const resetSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  if (existing.count >= max) return { success: false, remaining: 0, resetSeconds };
  existing.count += 1;
  return { success: true, remaining: max - existing.count, resetSeconds };
}

/* ── Upstash REST (distributed) ──────────────────────────────────────────── */

function upstashConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function upstashLimit(key: string, max: number, windowSeconds: number): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, String(windowSeconds), "NX"],
      ["TTL", key],
    ]),
    // Never let a slow limiter stall a request for long.
    signal: AbortSignal.timeout(2000),
  });
  if (!res.ok) throw new Error(`upstash ${res.status}`);
  const out = (await res.json()) as Array<{ result: number }>;
  const count = out[0]?.result ?? 1;
  const ttl = out[2]?.result ?? windowSeconds;
  const resetSeconds = ttl > 0 ? ttl : windowSeconds;
  return { success: count <= max, remaining: Math.max(0, max - count), resetSeconds };
}

/**
 * The async limiter used by API routes. Prefers Upstash; on any error falls back
 * to the in-memory limiter (fail-soft — a limiter outage must not take the API
 * down).
 */
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<RateLimitResult> {
  if (upstashConfigured()) {
    try {
      return await upstashLimit(key, max, windowSeconds);
    } catch {
      return limit(key, max, windowSeconds);
    }
  }
  return limit(key, max, windowSeconds);
}
