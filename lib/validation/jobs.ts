import { z } from "zod";

/** The three tools (Section 6 — stored as erase | cutout | uplift). */
export const TOOLS = ["erase", "cutout", "uplift"] as const;
export type Tool = (typeof TOOLS)[number];

/** Job lifecycle states (Section 6). */
export const JOB_STATUSES = [
  "queued",
  "uploading",
  "processing",
  "done",
  "failed",
  "cancelled",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const hexColor = z
  .string()
  .regex(/^#([0-9a-f]{6})$/i, "Expected a #RRGGBB hex colour");

/**
 * CUTOUT (background removal) parameters (Section 8.2). Phase 3 supports a
 * transparent result (default) or compositing onto a solid colour, plus an edge
 * feather. Gradient/blur/replace backgrounds arrive with the full tool UI.
 */
export const cutoutParamsSchema = z.object({
  tool: z.literal("cutout"),
  background: z.enum(["transparent", "color"]).default("transparent"),
  color: hexColor.optional(),
  /** Edge feather radius in px (0–10, Section 8.2). */
  feather: z.number().int().min(0).max(10).default(0),
});
export type CutoutParams = z.infer<typeof cutoutParamsSchema>;

/**
 * ERASE (watermark / object removal) parameters (Section 8.1). The mask is
 * uploaded as its own object (a white-on-black PNG matching the input's
 * dimensions); `maskKey` references it in the inputs bucket. The mask is dilated
 * before inference — painting slightly past the edge is the biggest quality
 * factor (Section 8.1).
 */
export const eraseParamsSchema = z.object({
  tool: z.literal("erase"),
  maskKey: z.string().min(1),
  /** Mask dilation in px (2–16, default 6). */
  dilate: z.number().int().min(2).max(16).default(6),
  /** Slower diffusion inpainting for large/busy areas. */
  generativeFill: z.boolean().default(false),
  quality: z.enum(["fast", "balanced", "best"]).default("balanced"),
});
export type EraseParams = z.infer<typeof eraseParamsSchema>;

/** UPLIFT (upscale) target resolutions — a box the long edge fits within. */
export const UPLIFT_TARGETS = {
  "1080p": 1920,
  "2k": 2560,
  "4k": 3840,
} as const;
export type UpliftTarget = keyof typeof UPLIFT_TARGETS;

/**
 * UPLIFT (upscale) parameters (Section 8.3). The user picks an output resolution,
 * not a multiplier; the system resamples to the exact long edge preserving
 * aspect ratio.
 */
export const upliftParamsSchema = z.object({
  tool: z.literal("uplift"),
  target: z.enum(["1080p", "2k", "4k"]),
  model: z.enum(["photo", "illustration", "auto"]).default("auto"),
  enhanceFaces: z.boolean().default(false),
  denoise: z.number().int().min(0).max(100).default(0),
  /** Default 0 — sharpening by default looks cheap (Section 8.3). */
  sharpen: z.number().int().min(0).max(100).default(0),
});
export type UpliftParams = z.infer<typeof upliftParamsSchema>;

/** Discriminated union of all tool params. */
export const jobParamsSchema = z.discriminatedUnion("tool", [
  cutoutParamsSchema,
  eraseParamsSchema,
  upliftParamsSchema,
]);
export type JobParams = z.infer<typeof jobParamsSchema>;

/**
 * POST /api/jobs request. Either provide inputKey+inputHash from a Phase 2
 * upload, or `fromJobId` to chain off a previous job's output with no re-upload
 * (Section 8.4). The server promotes that output into the inputs bucket.
 */
export const createJobSchema = z
  .object({
    inputKey: z.string().min(1).optional(),
    inputHash: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
    inputWidth: z.number().int().positive().optional(),
    inputHeight: z.number().int().positive().optional(),
    fromJobId: z.string().min(1).optional(),
    params: jobParamsSchema,
  })
  .refine((d) => !!d.fromJobId || (!!d.inputKey && !!d.inputHash), {
    message: "Provide inputKey and inputHash, or fromJobId",
  });
export type CreateJobRequest = z.infer<typeof createJobSchema>;

export const createJobResponseSchema = z.object({
  jobId: z.string().min(1),
  status: z.enum(JOB_STATUSES),
  cached: z.boolean(),
});
export type CreateJobResponse = z.infer<typeof createJobResponseSchema>;

/** A candidate overlay region from ERASE auto-detection (Section 8.1). */
export const detectBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  confidence: z.number().min(0).max(1),
});
export type DetectBox = z.infer<typeof detectBoxSchema>;

export const detectRequestSchema = z.object({ inputKey: z.string().min(1) });
export const detectResponseSchema = z.object({ boxes: z.array(detectBoxSchema) });
export type DetectResponse = z.infer<typeof detectResponseSchema>;

/** GET /api/jobs/:id response (Section 7.2). */
export const jobStatusResponseSchema = z.object({
  id: z.string(),
  status: z.enum(JOB_STATUSES),
  /** 0–100 coarse progress for the UI. */
  progress: z.number().min(0).max(100),
  tool: z.enum(TOOLS),
  previewUrl: z.string().optional(),
  resultUrl: z.string().optional(),
  meta: z
    .object({
      width: z.number().optional(),
      height: z.number().optional(),
      bytes: z.number().optional(),
      durationMs: z.number().optional(),
    })
    .optional(),
  error: z
    .object({ code: z.string(), message: z.string() })
    .optional(),
});
export type JobStatusResponse = z.infer<typeof jobStatusResponseSchema>;

/** Stable hash of params for cache lookup (order-independent for our shapes). */
export function paramsHash(params: JobParams): string {
  const sorted = JSON.stringify(params, Object.keys(params).sort());
  // Small, deterministic FNV-1a — enough to bucket identical param sets.
  let h = 0x811c9dc5;
  for (let i = 0; i < sorted.length; i++) {
    h ^= sorted.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
