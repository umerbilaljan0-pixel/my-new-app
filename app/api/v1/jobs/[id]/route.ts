import { type NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api/respond";
import { authenticateApiKey } from "@/lib/apikeys";
import { getStorage } from "@/lib/storage";
import { jobStore } from "@/lib/db/store";
import { ERROR_META, type ErrorCode } from "@/lib/validation/errors";

export const runtime = "nodejs";

/**
 * GET /api/v1/jobs/:id — public API job status. Returns a signed full-resolution
 * output URL when done (API jobs are charged at creation).
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authenticateApiKey(req);
  if (!auth) return errorResponse("UNAUTHORIZED", { message: "Provide a valid API key." });

  const { id } = await ctx.params;
  const store = await jobStore();
  const job = await store.getById(id);
  if (!job || job.userId !== auth.userId) return errorResponse("JOB_NOT_FOUND");

  const body: {
    id: string;
    status: string;
    tool: string;
    output?: string;
    width?: number;
    height?: number;
    error?: { code: string; message: string };
  } = { id: job.id, status: job.status, tool: job.tool };

  if (job.status === "done" && job.outputKey) {
    const { url } = await getStorage().presignGet({ bucket: "outputs", key: job.outputKey, expiresIn: 900 });
    body.output = url.startsWith("http") ? url : new URL(url, req.nextUrl.origin).toString();
    body.width = job.outputWidth ?? undefined;
    body.height = job.outputHeight ?? undefined;
  }
  if (job.status === "failed") {
    const code = (job.errorCode as ErrorCode) ?? "INFERENCE_FAILED";
    body.error = { code, message: ERROR_META[code]?.message ?? "Processing failed." };
  }

  return jsonResponse(body);
}
