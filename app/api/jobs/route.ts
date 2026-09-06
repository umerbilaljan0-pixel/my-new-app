import { type NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api/respond";
import { getStorage } from "@/lib/storage";
import { getSession, setSessionCookie } from "@/lib/session";
import { clientIpFromHeaders, hashIp } from "@/lib/security";
import { limit } from "@/lib/ratelimit";
import { jobStore } from "@/lib/db/store";
import { dispatch } from "@/lib/jobs/dispatch";
import { OBJECT_TTL_HOURS } from "@/lib/jobs/config";
import {
  createJobSchema,
  paramsHash as computeParamsHash,
  type CreateJobResponse,
} from "@/lib/validation/jobs";

export const runtime = "nodejs";

function mimeFromKey(key: string): string {
  if (/\.png$/i.test(key)) return "image/png";
  if (/\.jpe?g$/i.test(key)) return "image/jpeg";
  if (/\.webp$/i.test(key)) return "image/webp";
  return "image/png";
}

/**
 * POST /api/jobs — create a job (Section 7.2). Checks the content-addressed
 * cache first (returns a done job, charges nothing); otherwise inserts a queued
 * job and dispatches it. Never blocks on inference.
 */
export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return errorResponse("INTERNAL", { message: "That request was malformed." });
  }

  const parsed = createJobSchema.safeParse(raw);
  if (!parsed.success) {
    return errorResponse("UNSUPPORTED_FORMAT", { message: "That job request wasn't valid." });
  }
  const body = parsed.data;
  const tool = body.params.tool;

  // Basic abuse limit (the 3-free-per-day freemium rule lands with credits in
  // Phase 5). 20 job creations/min per IP+session.
  const ip = clientIpFromHeaders(req.headers);
  const { id: sid, isNew } = getSession(req);
  const rl = limit(`jobs:${hashIp(ip)}:${sid}`, 20, 60);
  if (!rl.success) {
    return errorResponse("RATE_LIMITED", {
      message: `Slow down a moment — try again in ${rl.resetSeconds} seconds.`,
      retryAfter: rl.resetSeconds,
    });
  }

  const storage = getStorage();
  const head = await storage.head("inputs", body.inputKey);
  if (!head.exists) {
    return errorResponse("UPLOAD_FAILED", {
      message: "We can't find that upload. Try uploading the image again.",
    });
  }

  const store = await jobStore();
  const pHash = computeParamsHash(body.params);
  const expiresAt = new Date(Date.now() + OBJECT_TTL_HOURS * 3600_000).toISOString();

  // Cache lookup — content-addressed reuse, charge nothing (Section 7.2).
  const cached = await store.findCached(body.inputHash, tool, pHash);
  if (cached) {
    const job = await store.create({
      userId: null,
      sessionId: sid,
      tool,
      params: body.params,
      paramsHash: pHash,
      inputKey: body.inputKey,
      inputHash: body.inputHash,
      inputWidth: body.inputWidth ?? cached.inputWidth,
      inputHeight: body.inputHeight ?? cached.inputHeight,
      status: "done",
      outputKey: cached.outputKey,
      outputWidth: cached.outputWidth,
      outputHeight: cached.outputHeight,
      outputBytes: cached.outputBytes,
      previewKey: cached.previewKey,
      provider: cached.provider,
      expiresAt,
    });
    const payload: CreateJobResponse = { jobId: job.id, status: "done", cached: true };
    const res = jsonResponse(payload);
    if (isNew) setSessionCookie(res, sid);
    return res;
  }

  const job = await store.create({
    userId: null,
    sessionId: sid,
    tool,
    params: body.params,
    paramsHash: pHash,
    inputKey: body.inputKey,
    inputHash: body.inputHash,
    inputWidth: body.inputWidth ?? null,
    inputHeight: body.inputHeight ?? null,
    status: "queued",
    expiresAt,
  });
  // Record the input mime so the processor hands the right type to inference.
  await store.update(job.id, { inputMime: mimeFromKey(body.inputKey) });

  dispatch(job.id);

  const payload: CreateJobResponse = { jobId: job.id, status: "queued", cached: false };
  const res = jsonResponse(payload);
  if (isNew) setSessionCookie(res, sid);
  return res;
}
