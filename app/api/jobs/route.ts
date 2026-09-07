import { type NextRequest } from "next/server";
import { createHash } from "node:crypto";
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

interface Source {
  inputKey: string;
  inputHash: string;
  inputWidth: number | null;
  inputHeight: number | null;
  inputMime: string;
}

/**
 * POST /api/jobs — create a job (Sections 7.2 / 8.4). Resolves the input from a
 * fresh upload or, when chaining, from a previous job's output (promoted into
 * the inputs bucket). Checks the content-addressed cache, then queues.
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
  const store = await jobStore();

  // Resolve the input source: a fresh upload, or a prior job's output (chaining).
  let source: Source;
  if (body.fromJobId) {
    const prior = await store.getById(body.fromJobId);
    if (!prior || (prior.sessionId && prior.sessionId !== sid)) {
      return errorResponse("JOB_NOT_FOUND");
    }
    if (prior.status !== "done" || !prior.outputKey) {
      return errorResponse("JOB_NOT_FOUND", { message: "That result isn't ready to chain from." });
    }
    const bytes = await storage.get("outputs", prior.outputKey);
    if (!bytes) return errorResponse("JOB_NOT_FOUND", { message: "That result has expired." });
    const sha = createHash("sha256").update(bytes).digest("hex");
    const key = `${sha}.png`;
    await storage.put("inputs", key, bytes, "image/png");
    source = {
      inputKey: key,
      inputHash: sha,
      inputWidth: prior.outputWidth,
      inputHeight: prior.outputHeight,
      inputMime: "image/png",
    };
  } else {
    const head = await storage.head("inputs", body.inputKey!);
    if (!head.exists) {
      return errorResponse("UPLOAD_FAILED", {
        message: "We can't find that upload. Try uploading the image again.",
      });
    }
    source = {
      inputKey: body.inputKey!,
      inputHash: body.inputHash!,
      inputWidth: body.inputWidth ?? null,
      inputHeight: body.inputHeight ?? null,
      inputMime: mimeFromKey(body.inputKey!),
    };
  }

  // ERASE needs its mask object present.
  if (body.params.tool === "erase") {
    const maskHead = await storage.head("inputs", body.params.maskKey);
    if (!maskHead.exists) {
      return errorResponse("UPLOAD_FAILED", { message: "The mask didn't upload. Try again." });
    }
  }

  const pHash = computeParamsHash(body.params);
  const expiresAt = new Date(Date.now() + OBJECT_TTL_HOURS * 3600_000).toISOString();

  const cached = await store.findCached(source.inputHash, tool, pHash);
  if (cached) {
    const job = await store.create({
      userId: null,
      sessionId: sid,
      tool,
      params: body.params,
      paramsHash: pHash,
      inputKey: source.inputKey,
      inputHash: source.inputHash,
      inputWidth: source.inputWidth,
      inputHeight: source.inputHeight,
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
    inputKey: source.inputKey,
    inputHash: source.inputHash,
    inputWidth: source.inputWidth,
    inputHeight: source.inputHeight,
    status: "queued",
    expiresAt,
  });
  await store.update(job.id, { inputMime: source.inputMime });

  dispatch(job.id);

  const payload: CreateJobResponse = { jobId: job.id, status: "queued", cached: false };
  const res = jsonResponse(payload);
  if (isNew) setSessionCookie(res, sid);
  return res;
}
