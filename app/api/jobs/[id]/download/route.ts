import { type NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/respond";
import { getStorage } from "@/lib/storage";
import { getSession } from "@/lib/session";
import { getSessionUser } from "@/lib/auth/session";
import { jobStore } from "@/lib/db/store";
import { chargeCredits, hdCostForJob } from "@/lib/credits";

export const runtime = "nodejs";

/**
 * GET /api/jobs/:id/download?quality=preview|full — 302 to a short-lived signed
 * URL (Sections 7.2 / 12).
 *
 * - preview: the free 1200px result, always available to the owner.
 * - full: requires sign-in and credits. The credit is charged here, once per
 *   job (re-downloads are free); a failed job never reaches this point so is
 *   never charged.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const quality = req.nextUrl.searchParams.get("quality") === "full" ? "full" : "preview";

  const store = await jobStore();
  const job = await store.getById(id);
  if (!job) return errorResponse("JOB_NOT_FOUND");

  const anon = getSession(req);
  const user = getSessionUser(req);
  const ownsAnon = job.sessionId && job.sessionId === anon.id;
  const ownsUser = job.userId && user && job.userId === user.userId;
  if (!ownsAnon && !ownsUser) return errorResponse("JOB_NOT_FOUND");

  if (job.status !== "done") {
    return errorResponse("JOB_NOT_FOUND", { message: "That result isn't ready yet." });
  }

  const storage = getStorage();

  if (quality === "full") {
    if (!job.outputKey) return errorResponse("JOB_NOT_FOUND", { message: "No full-resolution output." });

    // Client-computed results (browser WASM models) are free to download at full
    // resolution — the visitor's own device did the work, so no credit is charged
    // and sign-in isn't required.
    const isClientJob = (job.provider ?? "").startsWith("client");

    if (!isClientJob && !user) {
      return errorResponse("UNAUTHORIZED", { message: "Sign in to download full resolution." });
    }

    // Charge once per job (server-run jobs only). creditsCharged>0 means unlocked.
    if (!isClientJob && user && (!job.creditsCharged || job.creditsCharged <= 0)) {
      const cost = hdCostForJob(job);
      try {
        await chargeCredits(user.userId, cost, job.id);
      } catch (err) {
        if (err instanceof Error && err.message === "INSUFFICIENT_CREDITS") {
          return errorResponse("NO_CREDITS");
        }
        throw err;
      }
      await store.update(job.id, { creditsCharged: cost });
    }

    const { url } = await storage.presignGet({ bucket: "outputs", key: job.outputKey });
    const absolute = url.startsWith("http") ? url : new URL(url, req.nextUrl.origin).toString();
    return NextResponse.redirect(absolute, 302);
  }

  if (!job.previewKey) return errorResponse("JOB_NOT_FOUND", { message: "No preview available." });
  const { url } = await storage.presignGet({ bucket: "outputs", key: job.previewKey });
  const absolute = url.startsWith("http") ? url : new URL(url, req.nextUrl.origin).toString();
  return NextResponse.redirect(absolute, 302);
}
