"use client";

import {
  useCallback,
  useId,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ACCEPTED_MIME,
  MAX_BYTES,
  isAcceptedFile,
} from "@/lib/validation/upload";

export interface DropZoneProps {
  /** Called with an accepted File — the Uploader wires this to the pipeline. */
  onFile?: (file: File) => void;
  className?: string;
}

function isAccepted(file: File): boolean {
  return isAcceptedFile(file.name, file.type);
}

/**
 * DropZone — the live upload target (Section 9.1). Renders empty, drag-over and
 * invalid-during-drag states. Validation for type and size happens here before
 * anything leaves the browser.
 */
export function DropZone({ onFile, className }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragState, setDragState] = useState<"idle" | "over" | "invalid">("idle");
  const [error, setError] = useState<string | null>(null);
  const descId = useId();

  const validateAndEmit = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!isAccepted(file)) {
        setError("That file type isn't supported. PNG, JPG, WEBP and HEIC all work.");
        return;
      }
      if (file.size > MAX_BYTES) {
        const mb = (file.size / (1024 * 1024)).toFixed(0);
        setError(`That file is ${mb}MB — the limit is 25MB. Try exporting it smaller.`);
        return;
      }
      setError(null);
      onFile?.(file);
    },
    [onFile],
  );

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragState("idle");
    validateAndEmit(e.dataTransfer.files?.[0]);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const item = e.dataTransfer.items?.[0];
    const invalid =
      item && item.kind === "file" && item.type && !(ACCEPTED_MIME as readonly string[]).includes(item.type);
    setDragState(invalid ? "invalid" : "over");
  };

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <div
        role="button"
        tabIndex={0}
        aria-describedby={descId}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={() => setDragState("idle")}
        className={cn(
          "group relative grid h-[280px] w-full cursor-pointer place-items-center rounded-xl border-2 border-dashed bg-sunken text-center transition-colors duration-ui ease-brand",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
          dragState === "over" && "border-amber bg-amber-tint",
          dragState === "invalid" && "border-danger bg-danger-tint",
          dragState === "idle" && "border-line hover:border-line-strong",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_MIME.join(",")}
          className="sr-only"
          onChange={(e) => validateAndEmit(e.target.files?.[0])}
        />
        <div className="flex flex-col items-center gap-3 px-6">
          <UploadCloud
            aria-hidden
            size={36}
            className={cn(
              "text-ink-low transition-transform duration-ui ease-brand",
              dragState === "over" && "scale-110 text-amber",
              dragState === "invalid" && "text-danger",
            )}
          />
          <p className="text-base font-medium text-ink">
            {dragState === "invalid"
              ? "That file type isn't supported"
              : "Drop an image, or click to browse"}
          </p>
          <p id={descId} className="tabular text-2xs text-ink-low">
            PNG, JPG, WEBP, HEIC · up to 25MB · free, no account
          </p>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-2xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
