"use client";

import { useRef, useState } from "react";
import JSZip from "jszip";
import { UploadCloud, Download, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { startUpload } from "@/lib/upload/uploadClient";
import { createJob, pollJob } from "@/lib/jobs/client";
import { isAcceptedFile } from "@/lib/validation/upload";

type Status = "pending" | "uploading" | "processing" | "done" | "error";

interface Item {
  file: File;
  previewObjUrl: string;
  status: Status;
  jobId?: string;
  resultUrl?: string;
}

const MAX_FILES = 20;
const CONCURRENCY = 3;

const TONE: Record<Status, BadgeTone> = {
  pending: "neutral",
  uploading: "warn",
  processing: "warn",
  done: "ok",
  error: "danger",
};

/**
 * BatchGrid (Section 8.2) — remove backgrounds from up to 20 images at once, with
 * per-image status and a ZIP of the results. Runs a small client-side pool so the
 * UI stays responsive.
 */
export function BatchGrid() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [running, setRunning] = useState(false);
  const [zipping, setZipping] = useState(false);

  const setStatus = (idx: number, patch: Partial<Item>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const onPick = (files: FileList | null) => {
    if (!files) return;
    const accepted = Array.from(files)
      .filter((f) => isAcceptedFile(f.name, f.type))
      .slice(0, MAX_FILES);
    setItems(accepted.map((file) => ({ file, previewObjUrl: URL.createObjectURL(file), status: "pending" })));
  };

  const processItem = async (idx: number, item: Item) => {
    try {
      setStatus(idx, { status: "uploading" });
      const { key, processed } = await startUpload(item.file).promise;
      setStatus(idx, { status: "processing" });
      const created = await createJob({
        inputKey: key,
        inputHash: processed.sha256,
        inputWidth: processed.width,
        inputHeight: processed.height,
        params: { tool: "cutout", background: "transparent", feather: 0 },
      });
      const done = await pollJob(created.jobId);
      setStatus(idx, { status: "done", jobId: created.jobId, resultUrl: done.previewUrl });
    } catch {
      setStatus(idx, { status: "error" });
    }
  };

  const runAll = async () => {
    setRunning(true);
    const queue = items.map((item, idx) => ({ item, idx }));
    const workers = Array.from({ length: CONCURRENCY }, async () => {
      for (;;) {
        const next = queue.shift();
        if (!next) break;
        await processItem(next.idx, next.item);
      }
    });
    await Promise.all(workers);
    setRunning(false);
  };

  const downloadZip = async () => {
    setZipping(true);
    try {
      const zip = new JSZip();
      const done = items.filter((it) => it.status === "done" && it.jobId);
      await Promise.all(
        done.map(async (it, i) => {
          const res = await fetch(`/api/jobs/${it.jobId}/download?quality=preview`);
          if (!res.ok) return;
          const blob = await res.blob();
          const base = it.file.name.replace(/\.[^.]+$/, "");
          zip.file(`${base || `image-${i + 1}`}-cutout.png`, blob);
        }),
      );
      const out = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(out);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cleanplate-batch.zip";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } finally {
      setZipping(false);
    }
  };

  const doneCount = items.filter((it) => it.status === "done").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-lg font-semibold text-ink">Batch — remove backgrounds</h1>
        <p className="text-2xs text-ink-low">Up to {MAX_FILES} images at once. Free previews; ZIP them when done.</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
        className="sr-only"
        onChange={(e) => onPick(e.target.files)}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" leadingIcon={<UploadCloud size={16} />} onClick={() => inputRef.current?.click()}>
          Choose images
        </Button>
        {items.length > 0 && (
          <Button variant="primary" size="sm" loading={running} disabled={running} onClick={runAll}>
            Remove backgrounds ({items.length})
          </Button>
        )}
        {doneCount > 0 && (
          <Button variant="secondary" size="sm" leadingIcon={<Download size={16} />} loading={zipping} onClick={downloadZip}>
            Download ZIP ({doneCount})
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-sunken px-6 py-12 text-center text-sm text-ink-mid">
          Choose up to {MAX_FILES} images to get started.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {items.map((it, i) => (
            <div key={i} className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface">
              <div className="checkerboard relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element -- local/preview */}
                <img src={it.resultUrl ?? it.previewObjUrl} alt="" className="absolute inset-0 h-full w-full object-contain" />
                {(it.status === "uploading" || it.status === "processing") && (
                  <div className="absolute inset-0 grid place-items-center bg-ink/20">
                    <Loader2 size={22} className="animate-spin text-white" />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-line px-2.5 py-2">
                <span className="tabular truncate text-2xs text-ink-low">{it.file.name}</span>
                <Badge tone={TONE[it.status]}>
                  {it.status === "done" ? <CheckCircle2 size={11} /> : it.status === "error" ? <XCircle size={11} /> : null}
                  {it.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
