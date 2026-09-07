import { type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import sharp from "sharp";
import { errorResponse, jsonResponse } from "@/lib/api/respond";
import { authenticateApiKey } from "@/lib/apikeys";
import { rateLimit } from "@/lib/ratelimit";
import { getStorage } from "@/lib/storage";
import { inputKey } from "@/lib/storage/keys";
import { sniffImageMime } from "@/lib/storage/magic";
import { jobStore } from "@/lib/db/store";
import { dispatch } from "@/lib/jobs/dispatch";
import { OBJECT_TTL_HOURS } from "@/lib/jobs/config";
import { chargeCredits } from "@/lib/credits";
import { jobParamsSchema, paramsHash, MAX_BYTES, MIN_DIMENSION, MAX_DIMENSION } from "@/lib/validation";
import type { JobParams } from "@/lib/validation/jobs";

export const runtime = "nodejs";

const bodySchema = z.object({
  /** An https URL, a data: URI, or raw base64 of the image. */
  image: z.string().min(1),
  params: jobParamsSchema,
  webhookUrl: z.string().url().optional(),
});

function costFor(params: JobParams): number {
  return params.tool === "uplift" && params.target === "4k" ? 2 : 1;
}

async function loadImage(image: string): Promise<Uint8Array | null> {
  try {
    if (/^https?:\/\//.test(image)) {
      const res = await fetch(image, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return null;
      const buf = new Uint8Array(await res.arrayBuffer());
      return buf.byteLength <= MAX_BYTES ? buf : null;
    }
    const b64 = image.startsWith("data:") ? image.split(",")[1] ?? "" : image;
    const buf = new Uint8Array(Buffer.from(b64, "base64"));
    return buf.byteLength > 0 && buf.byteLength <= MAX_BYTES ? buf : null;
  } catch {
    return null;
  }
}

/**
 * POST /api/v1/jobs — public API (Studio tier, Section 7.2). Bearer-key auth.
 * Accepts an image URL or base64, runs a tool, and charges credits at creation
 * (refunded automatically if the job fails). CUTOUT and UPLIFT are supported;
 * ERASE needs an interactive mask and isn't exposed here.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth) return errorResponse("UNAUTHORIZED", { message: "Provide a valid API key." });

  const rl = await rateLimit(`v1:${auth.keyId}`, 60, 60);
  if (!rl.success) {
    return errorResponse("RATE_LIMITED", { message: `Rate limited. Try again in ${rl.resetSeconds}s.`, retryAfter: rl.resetSeconds });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorResponse("UNSUPPORTED_FORMAT", { message: "Invalid request body." });
  const { image, params } = parsed.data;

  if (params.tool === "erase") {
    return errorResponse("UNSUPPORTED_FORMAT", { message: "ERASE isn't available via the API (it needs an interactive mask)." });
  }

  const bytes = await loadImage(image);
  if (!bytes) return errorResponse("UPLOAD_FAILED", { message: "Couldn't load that image (bad URL, too large, or invalid base64)." });

  const mime = sniffImageMime(bytes);
  if (!mime) return errorResponse("UNSUPPORTED_FORMAT", { message: "That doesn't look like a supported image." });

  const meta = await sharp(Buffer.from(bytes)).metadata().catch(() => null);
  const w = meta?.width ?? 0;
  const h = meta?.height ?? 0;
  if (Math.min(w, h) < MIN_DIMENSION) return errorResponse("IMAGE_TOO_SMALL");
  if (Math.max(w, h) > MAX_DIMENSION) return errorResponse("IMAGE_DIMENSIONS_EXCEEDED");

  const sha = createHash("sha256").update(bytes).digest("hex");
  const key = inputKey(sha, mime);
  const storage = getStorage();
  await storage.put("inputs", key, bytes, mime);

  const store = await jobStore();
  const cost = costFor(params);
  const expiresAt = new Date(Date.now() + OBJECT_TTL_HOURS * 3600_000).toISOString();

  const job = await store.create({
    userId: auth.userId,
    sessionId: null,
    tool: params.tool,
    params,
    paramsHash: paramsHash(params),
    inputKey: key,
    inputHash: sha,
    inputWidth: w,
    inputHeight: h,
    status: "queued",
    expiresAt,
  });
  await store.update(job.id, { inputMime: mime });

  // Charge up front; refunded by the processor if the job fails.
  try {
    await chargeCredits(auth.userId, cost, job.id);
    await store.update(job.id, { creditsCharged: cost });
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_CREDITS") {
      await store.update(job.id, { status: "cancelled", errorCode: "NO_CREDITS" });
      return errorResponse("NO_CREDITS");
    }
    throw err;
  }

  dispatch(job.id);
  return jsonResponse({ jobId: job.id, status: "queued", cost });
}
