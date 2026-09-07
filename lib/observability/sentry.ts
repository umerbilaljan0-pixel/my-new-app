import "server-only";
import { randomUUID } from "node:crypto";

/**
 * Minimal Sentry error reporting (Section 14) with no SDK dependency: it posts a
 * Sentry "envelope" over HTTP when SENTRY_DSN is set, and is a no-op otherwise.
 * Image URLs and emails are scrubbed before anything leaves the process. Always
 * best-effort — reporting must never throw into the caller.
 */

interface Dsn {
  host: string;
  projectId: string;
  publicKey: string;
  protocol: string;
}

function parseDsn(dsn: string): Dsn | null {
  try {
    const u = new URL(dsn);
    const projectId = u.pathname.replace(/^\//, "");
    if (!u.username || !projectId) return null;
    return { host: u.host, projectId, publicKey: u.username, protocol: u.protocol.replace(":", "") };
  } catch {
    return null;
  }
}

/** Redact emails, data: URIs and http(s)/storage URLs. */
function scrub(input: string): string {
  return input
    .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, "[email]")
    .replace(/data:[^\s"']+/gi, "[data-uri]")
    .replace(/https?:\/\/[^\s"']+/gi, "[url]");
}

function scrubDeep(value: unknown): unknown {
  if (typeof value === "string") return scrub(value);
  if (Array.isArray(value)) return value.map(scrubDeep);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = scrubDeep(v);
    return out;
  }
  return value;
}

export async function captureException(
  error: unknown,
  extra?: Record<string, unknown>,
): Promise<void> {
  const dsnRaw = process.env.SENTRY_DSN;
  if (!dsnRaw) return;
  const dsn = parseDsn(dsnRaw);
  if (!dsn) return;

  try {
    const err = error instanceof Error ? error : new Error(String(error));
    const eventId = randomUUID().replace(/-/g, "");
    const event = {
      event_id: eventId,
      timestamp: new Date().toISOString(),
      platform: "node",
      level: "error",
      environment: process.env.NODE_ENV,
      exception: {
        values: [
          {
            type: err.name,
            value: scrub(err.message),
            stacktrace: err.stack ? { frames: [{ function: scrub(err.stack.split("\n")[1] ?? "") }] } : undefined,
          },
        ],
      },
      extra: extra ? (scrubDeep(extra) as Record<string, unknown>) : undefined,
    };

    const url = `${dsn.protocol}://${dsn.host}/api/${dsn.projectId}/envelope/?sentry_key=${dsn.publicKey}&sentry_version=7`;
    const body =
      JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() }) +
      "\n" +
      JSON.stringify({ type: "event" }) +
      "\n" +
      JSON.stringify(event);

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-sentry-envelope" },
      body,
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    /* reporting is best-effort */
  }
}
