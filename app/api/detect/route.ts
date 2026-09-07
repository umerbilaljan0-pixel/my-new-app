import { type NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api/respond";
import { getStorage } from "@/lib/storage";
import { clientIpFromHeaders, hashIp } from "@/lib/security";
import { rateLimit } from "@/lib/ratelimit";
import { detectOverlays } from "@/lib/inference/detect";
import { detectRequestSchema, type DetectResponse } from "@/lib/validation/jobs";

export const runtime = "nodejs";

/**
 * POST /api/detect — run ERASE auto-detection on an uploaded input (Section 8.1),
 * returning candidate overlay boxes. Never auto-erases; the client draws the
 * boxes and asks the user to confirm.
 */
export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return errorResponse("INTERNAL", { message: "That request was malformed." });
  }
  const parsed = detectRequestSchema.safeParse(raw);
  if (!parsed.success) return errorResponse("UNSUPPORTED_FORMAT", { message: "Invalid detect request." });

  const ip = clientIpFromHeaders(req.headers);
  const rl = await rateLimit(`detect:${hashIp(ip)}`, 30, 60);
  if (!rl.success) {
    return errorResponse("RATE_LIMITED", {
      message: `Slow down a moment — try again in ${rl.resetSeconds} seconds.`,
      retryAfter: rl.resetSeconds,
    });
  }

  const storage = getStorage();
  const bytes = await storage.get("inputs", parsed.data.inputKey);
  if (!bytes) return errorResponse("UPLOAD_FAILED", { message: "We can't find that upload." });

  try {
    const boxes = await detectOverlays(bytes);
    const payload: DetectResponse = { boxes };
    return jsonResponse(payload);
  } catch (err) {
    console.error("[detect] failed", err);
    // Detection is best-effort — never block the tool on it.
    const payload: DetectResponse = { boxes: [] };
    return jsonResponse(payload);
  }
}
