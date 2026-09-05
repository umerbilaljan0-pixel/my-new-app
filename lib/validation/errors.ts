import { z } from "zod";

/**
 * The single catalogue of API error codes (Section 7.1) with their user-facing
 * copy (Section 11.6), whether they are retryable, and the HTTP status they map
 * to. Both client and server import from here so a code always renders the same
 * honest message. Never show a raw status code; never say "An error occurred".
 */
export const ERROR_CODES = [
  "FILE_TOO_LARGE",
  "UNSUPPORTED_FORMAT",
  "IMAGE_TOO_SMALL",
  "IMAGE_DIMENSIONS_EXCEEDED",
  "NO_CREDITS",
  "RATE_LIMITED",
  "DAILY_LIMIT_REACHED",
  "INFERENCE_FAILED",
  "INFERENCE_TIMEOUT",
  "UPLOAD_FAILED",
  "JOB_NOT_FOUND",
  "UNAUTHORIZED",
  "RIGHTS_NOT_CONFIRMED",
  "INTERNAL",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ErrorMeta {
  message: string;
  hint?: string;
  retryable: boolean;
  status: number;
}

/**
 * Default copy per code. Messages that depend on runtime values (actual file
 * size, actual dimensions, reset time) are overridden at throw time via
 * `apiError(code, { message })`; the defaults here are the fallbacks.
 */
export const ERROR_META: Record<ErrorCode, ErrorMeta> = {
  FILE_TOO_LARGE: {
    message: "That file is over the 25MB limit. Try exporting it smaller.",
    hint: "Most tools let you export at a smaller size or lower quality.",
    retryable: false,
    status: 413,
  },
  UNSUPPORTED_FORMAT: {
    message: "We can't read that file type. PNG, JPG, WEBP and HEIC all work.",
    retryable: false,
    status: 415,
  },
  IMAGE_TOO_SMALL: {
    message: "That image is too small. We need at least 256px to work with.",
    retryable: false,
    status: 422,
  },
  IMAGE_DIMENSIONS_EXCEEDED: {
    message: "That image is too large in dimensions. The limit is 12000px per side.",
    retryable: false,
    status: 422,
  },
  NO_CREDITS: {
    message: "You're out of credits. 20 more for $2 — no subscription.",
    retryable: false,
    status: 402,
  },
  RATE_LIMITED: {
    message: "Slow down a moment — try again in 30 seconds.",
    retryable: true,
    status: 429,
  },
  DAILY_LIMIT_REACHED: {
    message: "You've used your 3 free images today.",
    retryable: false,
    status: 429,
  },
  INFERENCE_FAILED: {
    message: "Something went wrong on our side. We didn't charge you. Try again?",
    retryable: true,
    status: 502,
  },
  INFERENCE_TIMEOUT: {
    message: "This one took too long and we stopped it. No charge. Try again?",
    retryable: true,
    status: 504,
  },
  UPLOAD_FAILED: {
    message: "The upload didn't finish. Check your connection and try again.",
    retryable: true,
    status: 502,
  },
  JOB_NOT_FOUND: {
    message: "We couldn't find that job. It may have expired.",
    retryable: false,
    status: 404,
  },
  UNAUTHORIZED: {
    message: "You need to sign in to do that.",
    retryable: false,
    status: 401,
  },
  RIGHTS_NOT_CONFIRMED: {
    message: "Confirm you have the right to modify this image first.",
    retryable: false,
    status: 403,
  },
  INTERNAL: {
    message: "That's on us. We've logged it. Try again in a minute.",
    retryable: true,
    status: 500,
  },
};

/** The wire shape of every error response (Section 7.1). */
export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.enum(ERROR_CODES),
    message: z.string(),
    hint: z.string().optional(),
    retryable: z.boolean(),
  }),
});

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

/** Build an error envelope, optionally overriding the default copy. */
export function makeError(
  code: ErrorCode,
  overrides?: { message?: string; hint?: string },
): ErrorEnvelope {
  const meta = ERROR_META[code];
  return {
    error: {
      code,
      message: overrides?.message ?? meta.message,
      hint: overrides?.hint ?? meta.hint,
      retryable: meta.retryable,
    },
  };
}
