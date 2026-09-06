import { type NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api/respond";
import { getStorage } from "@/lib/storage";
import { getSession } from "@/lib/session";
import { jobStore } from "@/lib/db/store";
import { ERROR_META, type ErrorCode } from "@/lib/validation/errors";
import type { JobStatus } from "@/lib/validation/jobs";
import type { JobStatusResponse } from "@/lib/validation/jobs";

export const runtime = "nodejs";

const PROGRESS: Record<JobStatus, number> = {
  queued: 5,
  uploading: 10,
  processing: 60,
  done: 100,
  failed: 100,
  cancelled: 100,
};

/**
 * GET /api/jobs/:id — job status (Section 7.2). Returns previewUrl (free 1200px)
 * once done; resultUrl (full resolution) is entitlement-gated and issued by the
 * download route. Only the owning session may read a job.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const store = await jobStore();
  const job = await store.getById(id);
  if (!job) return errorResponse("JOB_NOT_FOUND");

  // Ownership: anonymous jobs are readable only by the session that created them.
  const { id: sid } = getSession(req);
  if (job.sessionId && job.sessionId !== sid) {
    return errorResponse("JOB_NOT_FOUND");
  }

  const body: JobStatusResponse = {
    id: job.id,
    status: job.status,
    progress: PROGRESS[job.status],
    tool: job.tool,
  };

  if (job.status === "done" && job.previewKey) {
    const storage = getStorage();
    const { url } = await storage.presignGet({ bucket: "outputs", key: job.previewKey });
    body.previewUrl = url;
    body.meta = {
      width: job.outputWidth ?? undefined,
      height: job.outputHeight ?? undefined,
      bytes: job.outputBytes ?? undefined,
      durationMs: job.durationMs ?? undefined,
    };
  }

  if (job.status === "failed") {
    const code = (job.errorCode as ErrorCode) ?? "INFERENCE_FAILED";
    // Show the user-facing copy (Section 11.6), never the internal error text.
    body.error = { code, message: ERROR_META[code]?.message ?? "Processing failed." };
  }

  return jsonResponse(body);
}
