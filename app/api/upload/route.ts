import { type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { errorResponse, jsonResponse } from "@/lib/api/respond";
import { getStorage } from "@/lib/storage";
import { inputKey } from "@/lib/storage/keys";
import { clientIpFromHeaders, hashIp } from "@/lib/security";
import { limit } from "@/lib/ratelimit";
import {
  ACCEPTED_MIME,
  MAX_BYTES,
  uploadRequestSchema,
  type UploadResponse,
} from "@/lib/validation/upload";

export const runtime = "nodejs";

const SESSION_COOKIE = "cp_sid";
const PRESIGN_TTL = 300; // 5 minutes (Section 14)

/** Anonymous per-browser session id, used for rate-limit and (later) ownership. */
function sessionId(req: NextRequest): { id: string; isNew: boolean } {
  const existing = req.cookies.get(SESSION_COOKIE)?.value;
  if (existing) return { id: existing, isNew: false };
  return { id: randomUUID(), isNew: true };
}

/**
 * POST /api/upload — validates type + size, rate limits, then issues a
 * single-purpose presigned PUT URL (Section 7.2). The client uploads directly;
 * this endpoint never touches image bytes.
 */
export async function POST(req: NextRequest) {
  // ── Parse ──────────────────────────────────────────────────────────────
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return errorResponse("UNSUPPORTED_FORMAT", {
      message: "That upload request was malformed.",
    });
  }

  // Friendly, specific errors for the two cases users actually hit.
  const rawObj = (raw ?? {}) as Record<string, unknown>;
  if (typeof rawObj.bytes === "number" && rawObj.bytes > MAX_BYTES) {
    const mb = (rawObj.bytes / (1024 * 1024)).toFixed(0);
    return errorResponse("FILE_TOO_LARGE", {
      message: `That file is ${mb}MB — the limit is 25MB. Try exporting it smaller.`,
    });
  }
  if (
    typeof rawObj.contentType !== "string" ||
    !(ACCEPTED_MIME as readonly string[]).includes(rawObj.contentType)
  ) {
    return errorResponse("UNSUPPORTED_FORMAT");
  }

  const parsed = uploadRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return errorResponse("UNSUPPORTED_FORMAT", {
      message: "That upload request wasn't valid.",
    });
  }
  const body = parsed.data;

  // ── Rate limit (Section 14): 10/min, 60/hour, 200/day per IP+session ─────
  const ip = clientIpFromHeaders(req.headers);
  const { id: sid, isNew } = sessionId(req);
  const bucketKey = `${hashIp(ip)}:${sid}`;
  const windows: Array<[string, number, number]> = [
    [`upload:min:${bucketKey}`, 10, 60],
    [`upload:hr:${bucketKey}`, 60, 3600],
    [`upload:day:${bucketKey}`, 200, 86400],
  ];
  for (const [key, max, win] of windows) {
    const res = limit(key, max, win);
    if (!res.success) {
      return errorResponse("RATE_LIMITED", {
        message: `Slow down a moment — try again in ${res.resetSeconds} seconds.`,
        retryAfter: res.resetSeconds,
      });
    }
  }

  // ── Issue presigned PUT ──────────────────────────────────────────────────
  const key = inputKey(body.sha256, body.contentType);
  try {
    const storage = getStorage();
    const { url, expiresIn } = await storage.presignPut({
      bucket: "inputs",
      key,
      contentType: body.contentType,
      bytes: body.bytes,
      expiresIn: PRESIGN_TTL,
    });
    const payload: UploadResponse = { uploadUrl: url, key, expiresIn };
    const res = jsonResponse(payload);
    if (isNew) {
      res.cookies.set(SESSION_COOKIE, sid, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return res;
  } catch (err) {
    console.error("[upload] presign failed", err);
    return errorResponse("UPLOAD_FAILED");
  }
}
