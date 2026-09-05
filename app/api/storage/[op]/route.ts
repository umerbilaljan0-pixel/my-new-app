import { type NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/respond";
import { hmacVerify } from "@/lib/security";
import { sniffImageMime } from "@/lib/storage/magic";
import {
  readLocalObject,
  signPayload,
  writeLocalObject,
} from "@/lib/storage/local";
import { MAX_BYTES } from "@/lib/validation/upload";
import type { StorageBucket } from "@/lib/storage/types";

export const runtime = "nodejs";

/**
 * Local dev storage endpoint — the destination the local adapter's presigned
 * URLs point at (production uses R2 directly and never hits this route). Verifies
 * the HMAC signature and expiry, enforces single-purpose (a PUT signature can't
 * be replayed as a GET because the op is part of the signed payload), and
 * validates magic bytes on write (Section 14).
 */

function verify(
  op: "put" | "get",
  params: URLSearchParams,
): { ok: true; bucket: StorageBucket; key: string } | { ok: false } {
  const bucket = params.get("bucket");
  const key = params.get("key");
  const expStr = params.get("exp");
  const sig = params.get("sig");
  if (!bucket || !key || !expStr || !sig) return { ok: false };
  if (bucket !== "inputs" && bucket !== "outputs") return { ok: false };

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return { ok: false };

  if (!hmacVerify(signPayload(op, bucket, key, exp), sig)) return { ok: false };
  return { ok: true, bucket, key };
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ op: string }> },
) {
  const { op } = await ctx.params;
  if (op !== "put") return errorResponse("UPLOAD_FAILED", { message: "Invalid storage operation." });

  const v = verify("put", req.nextUrl.searchParams);
  if (!v.ok) {
    return errorResponse("UPLOAD_FAILED", {
      message: "That upload link is invalid or has expired.",
    });
  }

  const body = new Uint8Array(await req.arrayBuffer());
  if (body.byteLength === 0) {
    return errorResponse("UPLOAD_FAILED", { message: "The upload was empty." });
  }
  if (body.byteLength > MAX_BYTES) {
    return errorResponse("FILE_TOO_LARGE");
  }

  // Server-side magic-byte validation — never trust the declared type.
  const sniffed = sniffImageMime(body);
  if (!sniffed) {
    return errorResponse("UNSUPPORTED_FORMAT", {
      message: "That file doesn't look like a supported image.",
    });
  }

  try {
    await writeLocalObject(v.bucket, v.key, body);
  } catch (err) {
    console.error("[storage] local write failed", err);
    return errorResponse("UPLOAD_FAILED");
  }
  return new NextResponse(null, { status: 204 });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ op: string }> },
) {
  const { op } = await ctx.params;
  if (op !== "get") return errorResponse("JOB_NOT_FOUND", { message: "Not found." });

  const v = verify("get", req.nextUrl.searchParams);
  if (!v.ok) {
    return errorResponse("UNAUTHORIZED", {
      message: "That link is invalid or has expired.",
    });
  }

  const bytes = await readLocalObject(v.bucket, v.key);
  if (!bytes) return errorResponse("JOB_NOT_FOUND", { message: "That object is gone." });

  const contentType = sniffImageMime(bytes) ?? "application/octet-stream";
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=300",
    },
  });
}
