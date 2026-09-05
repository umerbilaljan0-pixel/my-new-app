// Thin REST client for the CLEANPLATE engine. Dev proxies /api + /ws to :8000.

export type Quality = "fast" | "balanced" | "best";
export type ToolSlug =
  | "erase" | "uplift" | "revive" | "isolate"
  | "extend" | "smooth" | "clarify" | "stack";

export interface DeviceInfo {
  kind: string;
  name: string;
  vram_total_mb: number | null;
  vram_used_mb: number | null;
  half_precision: boolean;
  backend: string;
}

export interface UploadMeta {
  upload_id: string;
  media_kind: "image" | "video";
  width: number;
  height: number;
  n_frames: number;
  fps: number;
  duration: number;
  size_bytes: number;
}

export interface Estimate {
  output_size_bytes: number;
  output_size_label: string;
  vram_mb: number;
  eta_seconds: number;
  output_resolution: string | null;
  notes: string[];
}

export interface Job {
  id: string;
  tool: string;
  status: "queued" | "running" | "paused" | "done" | "error" | "cancelled";
  params: Record<string, unknown>;
  input_path: string | null;
  output_path: string | null;
  thumbnail: string | null;
  media_kind: "image" | "video" | null;
  stage: string | null;
  stage_index: number;
  stage_count: number;
  progress: number;
  eta_seconds: number | null;
  message: string | null;
  error: string | null;
  est_size_bytes: number | null;
  est_vram_mb: number | null;
  created_at: number;
  updated_at: number;
  finished_at: number | null;
}

export interface ModelSpec {
  key: string;
  name: string;
  task: string;
  size_mb: number;
  licence: string;
  cached: boolean;
}

export interface ToolMeta {
  slug: ToolSlug;
  name: string;
  verb: string;
  media: string[];
  models: ModelSpec[];
}

// Same-origin by default (web build behind the nginx proxy). The desktop build
// loads from tauri://localhost, so it sets VITE_API_BASE to the local engine.
export const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined) ?? "";
const BASE = API_BASE;

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, body);
  }
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(public status: number, public body: string) {
    super(`API ${status}: ${body}`);
  }
}

export const api = {
  health: () => fetch(`${BASE}/health`).then(j<{ ok: boolean; version: string }>),
  device: () => fetch(`${BASE}/api/device`).then(j<DeviceInfo>),
  tools: () => fetch(`${BASE}/api/tools`).then(j<ToolMeta[]>),
  presets: () => fetch(`${BASE}/api/presets`).then(j<{ name: string; stages: any[] }[]>),

  models: () => fetch(`${BASE}/api/models`).then(j<{ models: ModelSpec[]; cache_bytes: number }>),
  missingModels: (tool: string) => fetch(`${BASE}/api/models/${tool}/missing`).then(j<ModelSpec[]>),
  downloadModel: (key: string) =>
    fetch(`${BASE}/api/models/${key}/download`, { method: "POST" }).then(j<ModelSpec>),
  cacheSize: () => fetch(`${BASE}/api/models/cache`).then(j<{ bytes: number }>),
  purgeCache: () =>
    fetch(`${BASE}/api/models/cache`, { method: "DELETE" }).then(j<{ freed_bytes: number }>),

  upload: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`${BASE}/api/uploads`, { method: "POST", body: fd }).then(j<UploadMeta>);
  },
  estimate: (tool: string, upload_id: string, params: object, quality: Quality) =>
    fetch(`${BASE}/api/estimate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tool, upload_id, params, quality }),
    }).then(j<Estimate>),

  createJob: (tool: string, upload_id: string, params: object, quality: Quality, priority = 0) =>
    fetch(`${BASE}/api/jobs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tool, upload_id, params, quality, priority }),
    }).then(j<Job>),
  jobs: () => fetch(`${BASE}/api/jobs`).then(j<Job[]>),
  job: (id: string) => fetch(`${BASE}/api/jobs/${id}`).then(j<Job>),
  pause: (id: string) => fetch(`${BASE}/api/jobs/${id}/pause`, { method: "POST" }).then(j),
  resume: (id: string) => fetch(`${BASE}/api/jobs/${id}/resume`, { method: "POST" }).then(j),
  cancel: (id: string) => fetch(`${BASE}/api/jobs/${id}/cancel`, { method: "POST" }).then(j),
  retry: (id: string) => fetch(`${BASE}/api/jobs/${id}/retry`, { method: "POST" }).then(j<Job>),
  outputUrl: (id: string) => `${BASE}/api/jobs/${id}/output`,
  fileUrl: (path: string) => `${BASE}/api/files?path=${encodeURIComponent(path)}`,

  rightsStatus: () =>
    fetch(`${BASE}/api/rights/status`).then(j<{ first_launch_confirmed: boolean; required: boolean }>),
  confirmRights: (context: "first_launch" | "export", confirmed: boolean, extra: object = {}) =>
    fetch(`${BASE}/api/rights`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ context, confirmed, ...extra }),
    }).then(j),
};
