import { type NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api/respond";
import { getStorage } from "@/lib/storage";
import { getSession, setSessionCookie } from "@/lib/session";
import { getSessionUser } from "@/lib/auth/session";
import { clientIpFromHeaders, hashIp } from "@/lib/security";
import { rateLimit } from "@/lib/ratelimit";
import { jobStore } from "@/lib/db/store";
import { outputKey, previewKey } from "@/lib/storage/keys";
import { makePreview } from "@/lib/jobs/preview";
import { OBJECT_TTL_HOURS } from "@/lib/jobs/config";
import {
  jobParamsSchema,
  paramsHash as computeParamsHash,
  type CreateJobResponse,
} from "@/lib/validation/jobs";
import sharp from "sharp";

export const runtime = "nodejs";

/** Full-resolution result cap (a 4K PNG can exceed the 25MB upload cap). */
const MAX_RESULT_BYTES = 64 * 1024 * 1024;

/**
 * POST /api/jobs/ingest (multipart/form-data) — register a result that was
 * computed in the browser (client-side WASM models) as a finished job, so it
 * flows through the same history, preview, download and chaining machinery as
 * server-run jobs. The browser already did the inference; the server only
 * validates ownership of the input, stores the output, and builds the preview.
 *
 * Client jobs are marked with a `client-wasm:*` provider; their HD download is
 * free (the visitor's own device did the work).
 *
 * Fields: inputKey, inputHash, params (JSON), provider, inputWidth, inputHeight,
 * result (the finished image File).
 */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return errorResponse("INTERNAL", { message: "That request was malformed." });
  }

  const ip = clientIpFromHeaders(req.headers);
  const { id: sid, isNew } = getSession(req);
  const authUser = getSessionUser(req);
  const rl = await rateLimit(`ingest:${hashIp(ip)}:${sid}`, 20, 60);
  if (!rl.success) {
    return errorResponse("RATE_LIMITED", {
      message: `Slow down a moment — try again in ${rl.resetSeconds} seconds.`,
      retryAfter: rl.resetSeconds,
    });
  }

  const inputKey = String(form.get("inputKey") ?? "");
  const inputHash = String(form.get("inputHash") ?? "");
  const providerField = String(form.get("provider") ?? "client-wasm");
  const provider = providerField.startsWith("client-wasm") ? providerField : "client-wasm";
  const resultFile = form.get("result");

  if (!inputKey || !/^[a-f0-9]{64}$/i.test(inputHash)) {
    return errorResponse("UNSUPPORTED_FORMAT", { message: "Missing input reference." });
  }
  if (!(resultFile instanceof Blob)) {
    return errorResponse("UNSUPPORTED_FORMAT", { message: "Missing result image." });
  }
  if (resultFile.size <= 0 || resultFile.size > MAX_RESULT_BYTES) {
    return errorResponse("IMAGE_DIMENSIONS_EXCEEDED", { message: "That result is too large." });
  }

  let params;
  try {
    params = jobParamsSchema.parse(JSON.parse(String(form.get("params") ?? "")));
  } catch {
    return errorResponse("UNSUPPORTED_FORMAT", { message: "Invalid job parameters." });
  }
  // Client path covers CUTOUT and UPLIFT; ERASE always runs server-side.
  if (params.tool === "erase") {
    return errorResponse("UNSUPPORTED_FORMAT", { message: "Erase runs on the server." });
  }

  const storage = getStorage();
  const store = await jobStore();

  // The input must actually exist and belong to this session's upload.
  const head = await storage.head("inputs", inputKey);
  if (!head.exists) {
    return errorResponse("UPLOAD_FAILED", { message: "We can't find that upload. Try again." });
  }

  // Decode the client result to confirm it's a real image and get true dims.
  const resultBytes = new Uint8Array(await resultFile.arrayBuffer());
  let meta;
  try {
    meta = await sharp(Buffer.from(resultBytes)).metadata();
  } catch {
    return errorResponse("UNSUPPORTED_FORMAT", { message: "That result wasn't a valid image." });
  }
  const outW = meta.width ?? 0;
  const outH = meta.height ?? 0;
  if (!outW || !outH) {
    return errorResponse("UNSUPPORTED_FORMAT", { message: "That result wasn't a valid image." });
  }
  // Normalise to PNG (alpha preserved) so downstream is format-consistent.
  const pngBuf = await sharp(Buffer.from(resultBytes)).png({ compressionLevel: 9 }).toBuffer();
  const outputBytes = new Uint8Array(pngBuf);

  const inW = Number(form.get("inputWidth")) || null;
  const inH = Number(form.get("inputHeight")) || null;
  const pHash = computeParamsHash(params);
  const expiresAt = new Date(Date.now() + OBJECT_TTL_HOURS * 3600_000).toISOString();

  // Create the job to obtain an id, then store output + preview and finish it.
  const job = await store.create({
    userId: authUser?.userId ?? null,
    sessionId: sid,
    tool: params.tool,
    params,
    paramsHash: pHash,
    inputKey,
    inputHash,
    inputWidth: inW,
    inputHeight: inH,
    status: "processing",
    provider,
    expiresAt,
  });

  const oKey = outputKey(job.id);
  await storage.put("outputs", oKey, outputBytes, "image/png");
  const previewBytes = await makePreview(outputBytes, outW, outH);
  const pKey = previewKey(job.id);
  await storage.put("outputs", pKey, previewBytes, "image/png");

  await store.update(job.id, {
    status: "done",
    outputKey: oKey,
    previewKey: pKey,
    outputWidth: outW,
    outputHeight: outH,
    outputBytes: outputBytes.byteLength,
    inputMime: "image/png",
    finishedAt: new Date().toISOString(),
    durationMs: 0,
  });

  const payload: CreateJobResponse = { jobId: job.id, status: "done", cached: false };
  const res = jsonResponse(payload);
  if (isNew) setSessionCookie(res, sid);
  return res;
}
