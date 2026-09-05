import "server-only";
import { createHmac, timingSafeEqual, createHash } from "node:crypto";

/**
 * Server-side security helpers. Never imported by client bundles.
 */

const DEV_SECRET = "cleanplate-dev-secret-do-not-use-in-production";

/** The signing secret. In production AUTH_SECRET must be set; a fixed dev value
 * keeps local development working with no configuration. */
export function serverSecret(): string {
  return process.env.AUTH_SECRET || DEV_SECRET;
}

/** Deterministic HMAC-SHA256 signature (base64url) over a canonical payload. */
export function hmacSign(payload: string): string {
  return createHmac("sha256", serverSecret())
    .update(payload)
    .digest("base64url");
}

/** Constant-time verification of a payload signature. */
export function hmacVerify(payload: string, signature: string): boolean {
  const expected = hmacSign(payload);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Hash an IP with a salt before any storage (Section 14 — never store raw IPs). */
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT || serverSecret();
  return createHash("sha256").update(`${ip}:${salt}`).digest("hex");
}

/**
 * Best-effort client IP from the standard proxy headers. Returns "unknown" when
 * none are present (local dev) — callers should degrade to a soft limit rather
 * than block, per Section 12.
 */
export function clientIpFromHeaders(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip") || "unknown";
}
