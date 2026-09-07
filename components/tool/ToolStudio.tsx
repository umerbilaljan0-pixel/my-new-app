"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { DropZone } from "./DropZone";
import { ProcessingState } from "./ProcessingState";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import { DownloadCard } from "./DownloadCard";
import { ResolutionPicker } from "./ResolutionPicker";
import { DetectedOverlay } from "./DetectedOverlay";
import { MaskEditor } from "./MaskEditor";
import { ChainButtons } from "./ChainButtons";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatBytes } from "@/lib/format";
import { startUpload, uploadBlob, UploadError, type UploadHandle } from "@/lib/upload/uploadClient";
import { createJob, pollJob, detectOverlays, JobError } from "@/lib/jobs/client";
import type { DetectBox, JobParams, Tool, UpliftTarget } from "@/lib/validation/jobs";

type Phase = "idle" | "uploading" | "detect" | "mask" | "resolution" | "processing" | "result" | "error";

type Source =
  | { kind: "upload"; inputKey: string; inputHash: string; width: number; height: number }
  | { kind: "chain"; fromJobId: string; width: number; height: number };

interface ErrInfo {
  code: string;
  message: string;
  retryable: boolean;
}
interface ResultData {
  jobId: string;
  previewUrl: string;
  width?: number;
  height?: number;
  bytes?: number;
}

export interface ToolStudioProps {
  initialTool: Tool;
}

const STAGES: Record<Tool, string[]> = {
  cutout: ["Analysing image", "Isolating subject", "Refining edges", "Finishing"],
  erase: ["Analysing image", "Reading the mask", "Rebuilding", "Finishing"],
  uplift: ["Analysing image", "Upscaling", "Resampling", "Finishing"],
};

/**
 * ToolStudio — the unified tool flow for all three tools plus chaining
 * (Sections 8.1–8.4). Drop → per-tool params (detection+mask for ERASE,
 * resolution for UPLIFT, none for CUTOUT) → process → before/after result →
 * chain into the next tool with no re-upload.
 */
export function ToolStudio({ initialTool }: ToolStudioProps) {
  const [tool, setTool] = useState<Tool>(initialTool);
  const [phase, setPhase] = useState<Phase>("idle");
  const [source, setSource] = useState<Source | null>(null);
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [boxes, setBoxes] = useState<DetectBox[]>([]);
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [result, setResult] = useState<ResultData | null>(null);
  const [error, setError] = useState<ErrInfo | null>(null);
  const uploadRef = useRef<UploadHandle | null>(null);
  const pollAbortRef = useRef<AbortController | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const fail = useCallback((err: unknown) => {
    if ((err instanceof UploadError || err instanceof JobError) && err.code === "CANCELLED") return;
    const info: ErrInfo =
      err instanceof UploadError || err instanceof JobError
        ? { code: err.code, message: err.message, retryable: err.retryable }
        : { code: "INTERNAL", message: "That's on us. We've logged it. Try again in a minute.", retryable: true };
    setError(info);
    setPhase("error");
  }, []);

  const runJob = useCallback(
    async (params: JobParams, src: Source) => {
      setPhase("processing");
      try {
        const req =
          src.kind === "upload"
            ? { inputKey: src.inputKey, inputHash: src.inputHash, inputWidth: src.width, inputHeight: src.height, params }
            : { fromJobId: src.fromJobId, params };
        const created = await createJob(req);
        const controller = new AbortController();
        pollAbortRef.current = controller;
        const done = await pollJob(created.jobId, { signal: controller.signal });
        if (!done.previewUrl) throw new JobError("INTERNAL", "No preview returned.", true);
        setResult({ jobId: created.jobId, previewUrl: done.previewUrl, width: done.meta?.width, height: done.meta?.height, bytes: done.meta?.bytes });
        setPhase("result");
      } catch (err) {
        fail(err);
      }
    },
    [fail],
  );

  // Enter the per-tool step once a source (upload or chain) is ready.
  const enterTool = useCallback(
    async (t: Tool, src: Source) => {
      if (t === "cutout") {
        void runJob({ tool: "cutout", background: "transparent", feather: 0 }, src);
      } else if (t === "uplift") {
        setPhase("resolution");
      } else {
        // ERASE: auto-detect on a fresh upload; chained input goes straight to
        // manual masking (no input key to detect on yet).
        if (src.kind === "upload") {
          setPhase("processing");
          const found = await detectOverlays(src.inputKey);
          setBoxes(found);
        } else {
          setBoxes([]);
        }
        setPhase("detect");
      }
    },
    [runJob],
  );

  const handleFile = useCallback(
    (f: File) => {
      const url = URL.createObjectURL(f);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = url;
      setDisplayUrl(url);
      setError(null);
      setResult(null);
      setBoxes([]);
      setPhase("uploading");
      const handle = startUpload(f, {
        onUploadStart: (p) => setProgress({ loaded: 0, total: p.bytes }),
        onProgress: (loaded, total) => setProgress({ loaded, total }),
      });
      uploadRef.current = handle;
      handle.promise.then(
        ({ key, processed }) => {
          const src: Source = { kind: "upload", inputKey: key, inputHash: processed.sha256, width: processed.width, height: processed.height };
          setSource(src);
          void enterTool(tool, src);
        },
        (err) => fail(err),
      );
    },
    [tool, enterTool, fail],
  );

  const reset = useCallback(() => {
    uploadRef.current?.cancel();
    pollAbortRef.current?.abort();
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setTool(initialTool);
    setPhase("idle");
    setSource(null);
    setDisplayUrl(null);
    setBoxes([]);
    setProgress(null);
    setResult(null);
    setError(null);
  }, [initialTool]);

  // ── ERASE mask helpers ────────────────────────────────────────────────────
  const runEraseWithMask = useCallback(
    async (maskBlob: Blob) => {
      if (!source) return;
      setPhase("processing");
      try {
        const { key: maskKey } = await uploadBlob(maskBlob, "mask.png");
        void runJob({ tool: "erase", maskKey, dilate: 6, generativeFill: false, quality: "balanced" }, source);
      } catch (err) {
        fail(err);
      }
    },
    [source, runJob, fail],
  );

  const eraseFromBoxes = useCallback(async () => {
    if (!source) return;
    const cap = 1024;
    const scale = Math.min(1, cap / Math.max(source.width, source.height));
    const mw = Math.max(1, Math.round(source.width * scale));
    const mh = Math.max(1, Math.round(source.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = mw;
    canvas.height = mh;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, mw, mh);
    ctx.fillStyle = "#ffffff";
    for (const b of boxes) ctx.fillRect(b.x * scale, b.y * scale, b.width * scale, b.height * scale);
    canvas.toBlob((blob) => {
      if (blob) void runEraseWithMask(blob);
    }, "image/png");
  }, [source, boxes, runEraseWithMask]);

  // ── Chaining ──────────────────────────────────────────────────────────────
  const chainTo = useCallback(
    (t: Tool) => {
      if (!result) return;
      const src: Source = { kind: "chain", fromJobId: result.jobId, width: result.width ?? 0, height: result.height ?? 0 };
      // The prior preview becomes the display/before image.
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setDisplayUrl(result.previewUrl);
      setSource(src);
      setResult(null);
      setBoxes([]);
      setTool(t);
      // "Now upscale to 4K →" runs 4K directly (Section 8.4); other tools take
      // their normal per-tool step.
      if (t === "uplift") {
        void runJob({ tool: "uplift", target: "4k", model: "auto", enhanceFaces: false, denoise: 0, sharpen: 0 }, src);
      } else {
        void enterTool(t, src);
      }
    },
    [result, enterTool, runJob],
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  if (phase === "idle") return <DropZone onFile={handleFile} />;

  if (phase === "error") {
    return (
      <ErrorState
        title="That didn't go through"
        message={error?.message ?? "Something went wrong."}
        hint={error?.code}
        action={<Button variant="secondary" size="sm" onClick={reset}>Choose another</Button>}
      />
    );
  }

  if (phase === "uploading" && displayUrl) {
    return (
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
          <img src={displayUrl} alt="Your image" className="checkerboard max-h-[320px] w-full object-contain" />
          {progress && (
            <div className="absolute inset-x-0 top-0">
              <Progress value={progress.total ? (progress.loaded / progress.total) * 100 : 0} label="Upload progress" className="rounded-none" />
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
          <span className="tabular text-2xs text-ink-mid">
            {progress ? `Uploading · ${formatBytes(progress.loaded)} of ${formatBytes(progress.total)}` : "Preparing image…"}
          </span>
          <Button variant="ghost" size="sm" onClick={reset}>Cancel</Button>
        </div>
      </div>
    );
  }

  if (phase === "resolution" && source) {
    return (
      <ResolutionPicker
        sourceWidth={source.width}
        sourceHeight={source.height}
        onSelect={(target: UpliftTarget) =>
          runJob({ tool: "uplift", target, model: "auto", enhanceFaces: false, denoise: 0, sharpen: 0 }, source)
        }
        onCancel={reset}
      />
    );
  }

  if (phase === "detect" && source && displayUrl) {
    return (
      <DetectedOverlay
        imageUrl={displayUrl}
        boxes={boxes}
        originalWidth={source.width}
        originalHeight={source.height}
        onEraseDetected={eraseFromBoxes}
        onDrawManually={() => setPhase("mask")}
        onCancel={reset}
      />
    );
  }

  if (phase === "mask" && source && displayUrl) {
    return (
      <MaskEditor
        imageUrl={displayUrl}
        originalWidth={source.width}
        originalHeight={source.height}
        initialBoxes={boxes}
        onConfirm={runEraseWithMask}
        onCancel={reset}
      />
    );
  }

  if (phase === "processing" && displayUrl) {
    return <ProcessingState imageUrl={displayUrl} stages={STAGES[tool]} />;
  }

  if (phase === "result" && result && displayUrl) {
    return (
      <div className="flex flex-col gap-4 animate-fade-rise">
        <BeforeAfterSlider beforeUrl={displayUrl} afterUrl={result.previewUrl} afterTransparent={tool === "cutout"} />
        <p className="tabular text-center text-2xs text-ink-low">
          {result.width && result.height ? `${result.width} × ${result.height} · ` : ""}
          PNG{result.bytes ? ` · ${formatBytes(result.bytes)}` : ""}
        </p>
        <DownloadCard jobId={result.jobId} width={result.width} height={result.height} bytes={result.bytes} />
        <ChainButtons currentTool={tool} onChain={chainTo} />
        <div className="text-center">
          <Button variant="ghost" size="sm" leadingIcon={<RotateCcw size={14} />} onClick={reset}>
            Try another image
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
