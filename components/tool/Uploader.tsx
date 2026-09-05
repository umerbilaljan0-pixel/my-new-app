"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Eraser,
  Maximize2,
  RotateCcw,
  Scissors,
} from "lucide-react";
import { DropZone } from "./DropZone";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatBytes } from "@/lib/format";
import type { ProcessedImage } from "@/lib/image/types";
import {
  startUpload,
  UploadError,
  type UploadHandle,
  type UploadResult,
} from "@/lib/upload/uploadClient";

type Status = "idle" | "processing" | "uploading" | "done" | "error";

interface ErrInfo {
  code: string;
  message: string;
  retryable: boolean;
}

export interface UploaderProps {
  /** Show links to the three tools on success (home page uses this). */
  showToolLinks?: boolean;
  onUploaded?: (result: UploadResult) => void;
}

/**
 * Uploader — the end-to-end Phase 2 flow (Section 9.2): drop → immediate local
 * preview → process (worker) → real-progress upload → landed. Every state is
 * rendered, including cancel, retry and honest errors. Status changes are
 * announced via an aria-live region for screen readers (Section 9.3).
 */
export function Uploader({ showToolLinks, onUploaded }: UploaderProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processed, setProcessed] = useState<ProcessedImage | null>(null);
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<ErrInfo | null>(null);
  const handleRef = useRef<UploadHandle | null>(null);

  // Revoke the object URL when it changes or on unmount.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const run = useCallback(
    (f: File) => {
      setError(null);
      setProcessed(null);
      setProgress(null);
      setResult(null);
      const handle = startUpload(f, {
        onProcessing: () => setStatus("processing"),
        onUploadStart: (p) => {
          setProcessed(p);
          setProgress({ loaded: 0, total: p.bytes });
          setStatus("uploading");
        },
        onProgress: (loaded, total) => setProgress({ loaded, total }),
      });
      handleRef.current = handle;
      handle.promise.then(
        (res) => {
          setResult(res);
          setStatus("done");
          onUploaded?.(res);
        },
        (err: unknown) => {
          if (err instanceof UploadError && err.code === "CANCELLED") {
            // Cancel returns to the empty drop zone.
            setStatus("idle");
            setFile(null);
            setPreviewUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return null;
            });
            return;
          }
          const info: ErrInfo =
            err instanceof UploadError
              ? { code: err.code, message: err.message, retryable: err.retryable }
              : {
                  code: "INTERNAL",
                  message: "That's on us. We've logged it. Try again in a minute.",
                  retryable: true,
                };
          setError(info);
          setStatus("error");
        },
      );
    },
    [onUploaded],
  );

  const handleFile = useCallback(
    (f: File) => {
      const url = URL.createObjectURL(f);
      setFile(f);
      setPreviewUrl(url);
      run(f);
    },
    [run],
  );

  const cancel = useCallback(() => handleRef.current?.cancel(), []);

  const retry = useCallback(() => {
    if (file) run(file);
  }, [file, run]);

  const reset = useCallback(() => {
    handleRef.current?.cancel();
    setStatus("idle");
    setFile(null);
    setProcessed(null);
    setProgress(null);
    setResult(null);
    setError(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  if (status === "idle") {
    return <DropZone onFile={handleFile} />;
  }

  const statusLabel =
    status === "processing"
      ? "Preparing image…"
      : status === "uploading"
        ? "Uploading…"
        : status === "done"
          ? "Uploaded"
          : "Upload failed";

  return (
    <div className="flex flex-col gap-4">
      <span aria-live="polite" className="sr-only">
        {statusLabel}
      </span>

      {status === "error" ? (
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
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <div className="relative">
            {previewUrl && (
              /* eslint-disable-next-line @next/next/no-img-element -- local object URL, dimensions known after processing */
              <img
                src={previewUrl}
                alt="Your image"
                className="checkerboard max-h-[320px] w-full object-contain"
              />
            )}
            {(status === "processing" || status === "uploading") && (
              <div className="pointer-events-none absolute inset-x-0 top-0">
                {status === "uploading" && progress ? (
                  <Progress
                    value={progress.total ? (progress.loaded / progress.total) * 100 : 0}
                    label="Upload progress"
                    className="rounded-none"
                  />
                ) : (
                  <Progress label="Preparing image" className="rounded-none" />
                )}
              </div>
            )}
            {status === "done" && (
              <div className="absolute right-3 top-3">
                <Badge tone="ok">
                  <CheckCircle2 size={12} /> Stored
                </Badge>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-line p-4">
            {status === "processing" && (
              <p className="text-sm text-ink-mid">
                Resizing, stripping metadata and hashing — all in your browser.
              </p>
            )}

            {status === "uploading" && progress && (
              <div className="flex items-center justify-between gap-3">
                <span className="tabular text-2xs text-ink-mid">
                  Uploading · {formatBytes(progress.loaded)} of {formatBytes(progress.total)}
                </span>
                <Button variant="ghost" size="sm" onClick={cancel}>
                  Cancel
                </Button>
              </div>
            )}

            {status === "done" && processed && result && (
              <>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-ink">
                    Landed in the inputs bucket.
                  </p>
                  <p className="tabular break-all text-2xs text-ink-low">
                    {processed.width} × {processed.height} ·{" "}
                    {processed.contentType.replace("image/", "").toUpperCase()} ·{" "}
                    {formatBytes(processed.bytes)}
                    {processed.resized &&
                      ` · resized from ${processed.originalWidth}×${processed.originalHeight}`}
                  </p>
                  <p className="tabular break-all text-2xs text-ink-low">
                    key: {result.key}
                  </p>
                  <p className="tabular break-all text-2xs text-ink-low">
                    sha256: {processed.sha256.slice(0, 24)}…
                  </p>
                </div>

                {showToolLinks && (
                  <>
                    <p className="text-2xs text-ink-low">Pick a tool to run</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {[
                        { href: "/remove-watermark", label: "Erase", Icon: Eraser },
                        { href: "/remove-background", label: "Cut Out", Icon: Scissors },
                        { href: "/upscale-image", label: "Upscale", Icon: Maximize2 },
                      ].map(({ href, label, Icon }) => (
                        <Link
                          key={href}
                          href={href}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-surface px-5 text-xs font-semibold text-ink transition-colors duration-ui ease-brand hover:border-line-strong hover:bg-sunken active:scale-[0.98]"
                        >
                          <Icon size={16} aria-hidden />
                          {label}
                        </Link>
                      ))}
                    </div>
                  </>
                )}

                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    leadingIcon={<RotateCcw size={14} />}
                    onClick={reset}
                  >
                    Choose another
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
