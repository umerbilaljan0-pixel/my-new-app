import { type NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/respond";
import { getStorage } from "@/lib/storage";
import { getSession } from "@/lib/session";
import { jobStore } from "@/lib/db/store";

export const runtime = "nodejs";

/**
 * GET /api/jobs/:id/download?quality=preview|full — 302 to a short-lived signed
 * URL (Section 7.2).
 *
 * - preview: the free 1200px result, always available.
 * - full: entitlement-gated. Credits arrive in Phase 5; until then full returns
 *   NO_CREDITS so the free path works end-to-end and the HD path is honest.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const quality = req.nextUrl.searchParams.get("quality") === "full" ? "full" : "preview";

  const store = await jobStore();
  const job = await store.getById(id);
  if (!job) return errorResponse("JOB_NOT_FOUND");

  const { id: sid } = getSession(req);
  if (job.sessionId && job.sessionId !== sid) return errorResponse("JOB_NOT_FOUND");

  if (job.status !== "done") {
    return errorResponse("JOB_NOT_FOUND", { message: "That result isn't ready yet." });
  }

  if (quality === "full") {
    // Entitlement + credit charge at download time (Section 12) lands in Phase 5.
    return errorResponse("NO_CREDITS");
  }

  if (!job.previewKey) return errorResponse("JOB_NOT_FOUND", { message: "No preview available." });

  const storage = getStorage();
  const { url } = await storage.presignGet({ bucket: "outputs", key: job.previewKey });
  // Resolve relative (local dev) URLs against the request origin for the 302.
  const absolute = url.startsWith("http") ? url : new URL(url, req.nextUrl.origin).toString();
  return NextResponse.redirect(absolute, 302);
}
