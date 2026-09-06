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

/** Discriminated union of all tool params. ERASE/UPLIFT land in Phase 4. */
export const jobParamsSchema = z.discriminatedUnion("tool", [
  cutoutParamsSchema,
]);
export type JobParams = z.infer<typeof jobParamsSchema>;

/** POST /api/jobs request. inputKey/inputHash come from the Phase 2 upload. */
export const createJobSchema = z.object({
  inputKey: z.string().min(1),
  inputHash: z.string().regex(/^[a-f0-9]{64}$/i),
  inputWidth: z.number().int().positive().optional(),
  inputHeight: z.number().int().positive().optional(),
  params: jobParamsSchema,
});
export type CreateJobRequest = z.infer<typeof createJobSchema>;

export const createJobResponseSchema = z.object({
  jobId: z.string().min(1),
  status: z.enum(JOB_STATUSES),
  cached: z.boolean(),
});
export type CreateJobResponse = z.infer<typeof createJobResponseSchema>;

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
