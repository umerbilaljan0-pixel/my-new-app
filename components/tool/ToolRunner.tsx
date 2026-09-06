"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { DropZone } from "./DropZone";
import { ProcessingState } from "./ProcessingState";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import { DownloadCard } from "./DownloadCard";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatBytes } from "@/lib/format";
import { startUpload, UploadError, type UploadHandle } from "@/lib/upload/uploadClient";
import { createJob, pollJob, JobError } from "@/lib/jobs/client";
import type { JobParams } from "@/lib/validation/jobs";

type Phase = "idle" | "uploading" | "processing" | "result" | "error";

interface ErrInfo {
  code: string;
  message: string;
  retryable: boolean;
}
interface ResultData {
  previewUrl: string;
  width?: number;
  height?: number;
  bytes?: number;
}

export interface ToolRunnerProps {
  /** Only "cutout" is functional in Phase 3. */
  params: JobParams;
  processingStages?: string[];
}

/**
 * ToolRunner — the full tool flow (Sections 9.2–9.5): drop → process + upload →
 * create job → poll → before/after result → free download. Handles cancel, retry
 * and honest error states throughout.
 */
export function ToolRunner({ params, processingStages }: ToolRunnerProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [result, setResult] = useState<ResultData | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<ErrInfo | null>(null);
  const uploadRef = useRef<UploadHandle | null>(null);
  const pollAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
    };
  }, [originalUrl]);

  const fail = useCallback((err: unknown) => {
    if ((err instanceof UploadError || err instanceof JobError) && err.code === "CANCELLED") {
      return; // handled by reset
    }
    const info: ErrInfo =
      err instanceof UploadError || err instanceof JobError
        ? { code: err.code, message: err.message, retryable: err.retryable }
        : { code: "INTERNAL", message: "That's on us. We've logged it. Try again in a minute.", retryable: true };
    setError(info);
    setPhase("error");
  }, []);

  const run = useCallback(
    async (f: File) => {
      setError(null);
      setResult(null);
      setProgress(null);
      setPhase("uploading");

      const handle = startUpload(f, {
        onUploadStart: (p) => setProgress({ loaded: 0, total: p.bytes }),
        onProgress: (loaded, total) => setProgress({ loaded, total }),
      });
      uploadRef.current = handle;

      try {
        const { key, processed } = await handle.promise;
        setPhase("processing");

        const created = await createJob({
          inputKey: key,
          inputHash: processed.sha256,
          inputWidth: processed.width,
          inputHeight: processed.height,
          params,
        });
        setJobId(created.jobId);

        const controller = new AbortController();
        pollAbortRef.current = controller;
        const done = await pollJob(created.jobId, { signal: controller.signal });

        if (!done.previewUrl) throw new JobError("INTERNAL", "No preview returned.", true);
        setResult({
          previewUrl: done.previewUrl,
          width: done.meta?.width,
          height: done.meta?.height,
          bytes: done.meta?.bytes,
        });
        setPhase("result");
      } catch (err) {
        fail(err);
      }
    },
    [params, fail],
  );

  const handleFile = useCallback(
    (f: File) => {
      const url = URL.createObjectURL(f);
      setFile(f);
      setOriginalUrl(url);
      void run(f);
    },
    [run],
  );

  const reset = useCallback(() => {
    uploadRef.current?.cancel();
    pollAbortRef.current?.abort();
    setPhase("idle");
    setFile(null);
    setProgress(null);
    setResult(null);
    setJobId(null);
    setError(null);
    setOriginalUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const retry = useCallback(() => {
    if (file) void run(file);
  }, [file, run]);

  if (phase === "idle") return <DropZone onFile={handleFile} />;

  if (phase === "error") {
    return (
      <ErrorState
        title="That didn't go through"
        message={error?.message ?? "Something went wrong."}
        hint={error?.code}
        action={
          <div className="flex gap-2">
            {error?.retryable && (
              <Button variant="primary" size="sm" onClick={retry}>
                Try again
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={reset}>
              Choose another
            </Button>
          </div>
        }
      />
    );
  }

  if (phase === "uploading" && originalUrl) {
    return (
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
          <img src={originalUrl} alt="Your image" className="checkerboard max-h-[320px] w-full object-contain" />
          {progress && (
            <div className="absolute inset-x-0 top-0">
              <Progress
                value={progress.total ? (progress.loaded / progress.total) * 100 : 0}
                label="Upload progress"
                className="rounded-none"
              />
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
          <span className="tabular text-2xs text-ink-mid">
            {progress
              ? `Uploading · ${formatBytes(progress.loaded)} of ${formatBytes(progress.total)}`
              : "Preparing image…"}
          </span>
          <Button variant="ghost" size="sm" onClick={reset}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "processing" && originalUrl) {
    return <ProcessingState imageUrl={originalUrl} stages={processingStages} />;
  }

  if (phase === "result" && result && originalUrl && jobId) {
    return (
      <div className="flex flex-col gap-4 animate-fade-rise">
        <BeforeAfterSlider beforeUrl={originalUrl} afterUrl={result.previewUrl} afterTransparent />
        <p className="tabular text-center text-2xs text-ink-low">
          {result.width && result.height ? `${result.width} × ${result.height} · ` : ""}
          PNG{result.bytes ? ` · ${formatBytes(result.bytes)}` : ""}
        </p>
        <DownloadCard jobId={jobId} width={result.width} height={result.height} bytes={result.bytes} />
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
