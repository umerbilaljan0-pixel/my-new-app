import { useRef, useState, type DragEvent } from "react";
import { IUpload } from "./icons";
import type { UploadMeta } from "@/lib/api";
import type { Params } from "@/lib/tools";

interface Props {
  upload: UploadMeta | null;
  beforeUrl: string | null;
  afterUrl: string | null;
  tool: string;
  params: Params;
  onFile: (f: File) => void;
  onRect: (rect: [number, number, number, number]) => void;
  onSeed: (xy: [number, number]) => void;
}

export function Viewer({ upload, beforeUrl, afterUrl, tool, params, onFile, onRect, onSeed }: Props) {
  const [split, setSplit] = useState(0.5);
  const [zoom, setZoom] = useState(1);
  const [showAfter, setShowAfter] = useState(true);
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  if (!upload || !beforeUrl) {
    return (
      <div
        className="flex-1 grid place-items-center p-6"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <label className="card w-full max-w-xl aspect-video border-dashed grid place-items-center cursor-pointer hover:border-border-hot"
          style={{ borderStyle: "dashed" }}>
          <input type="file" accept="image/*,video/*" hidden
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          <div className="text-center">
            <div className="mx-auto mb-3 w-10 h-10 grid place-items-center rounded-control border border-border text-text-mid">
              <IUpload />
            </div>
            <div className="text-[15px] text-text-hi">Drop media to begin</div>
            <div className="mt-1 text-[12px] text-text-low">
              PNG · JPG · WebP · MP4 · MOV · WebM — runs locally, never uploaded off your machine
            </div>
          </div>
        </label>
      </div>
    );
  }

  const px = (n: number) => `${n * 100}%`;
  const rectFromDrag = (): [number, number, number, number] | null => {
    if (!drag) return null;
    const x = Math.min(drag.x0, drag.x1);
    const y = Math.min(drag.y0, drag.y1);
    return [x, y, Math.abs(drag.x1 - drag.x0), Math.abs(drag.y1 - drag.y0)];
  };

  const norm = (e: { clientX: number; clientY: number }) => {
    const r = surfaceRef.current!.getBoundingClientRect();
    return [
      Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    ] as [number, number];
  };

  const manualErase = tool === "erase" && !params.auto_detect;
  const isImage = upload.media_kind === "image";

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* toolbar */}
      <div className="flex items-center gap-2 px-3 h-9 border-b border-border bg-bg-surface">
        {!isImage && (
          <div className="flex rounded-control border border-border bg-bg-void p-0.5">
            {(["before", "after"] as const).map((k) => (
              <button key={k} onClick={() => setShowAfter(k === "after")}
                className="h-6 px-3 rounded-[4px] text-[11px] uppercase tracking-label"
                style={{
                  background: (k === "after") === showAfter ? "var(--bg-raised)" : "transparent",
                  color: (k === "after") === showAfter ? "var(--text-hi)" : "var(--text-low)",
                }}>
                {k}
              </button>
            ))}
          </div>
        )}
        <div className="flex-1" />
        <button className="btn h-7 text-[12px]" onClick={() => setZoom((z) => Math.max(1, z - 0.25))}>–</button>
        <span className="num text-[12px] text-text-mid w-12 text-center">{Math.round(zoom * 100)}%</span>
        <button className="btn h-7 text-[12px]" onClick={() => setZoom((z) => Math.min(4, z + 0.25))}>+</button>
        {manualErase && <span className="label ml-2">drag to mask</span>}
        {tool === "isolate" && <span className="label ml-2">click subject</span>}
      </div>

      {/* surface */}
      <div className="flex-1 grid place-items-center bg-bg-void overflow-hidden p-4">
        <div
          ref={surfaceRef}
          className="relative select-none"
          style={{
            aspectRatio: `${upload.width} / ${upload.height}`,
            maxHeight: "100%",
            maxWidth: "100%",
            width: `min(100%, ${(upload.width / upload.height) * 70}vh)`,
            transform: `scale(${zoom})`,
            cursor: manualErase ? "crosshair" : tool === "isolate" ? "pointer" : "default",
          }}
          onMouseDown={(e) => {
            if (manualErase) {
              const [x, y] = norm(e);
              setDrag({ x0: x, y0: y, x1: x, y1: y });
            }
          }}
          onMouseMove={(e) => {
            if (drag) {
              const [x, y] = norm(e);
              setDrag({ ...drag, x1: x, y1: y });
            }
          }}
          onMouseUp={() => {
            const r = rectFromDrag();
            if (r && r[2] > 0.01 && r[3] > 0.01) onRect(r);
            setDrag(null);
          }}
          onClick={(e) => {
            if (tool === "isolate") onSeed(norm(e));
          }}
        >
          {/* BEFORE base */}
          {isImage ? (
            <img src={beforeUrl} alt="before" className="block w-full h-full object-contain" draggable={false} />
          ) : (
            <video src={showAfter && afterUrl ? afterUrl : beforeUrl} controls
              className="block w-full h-full object-contain bg-black" />
          )}

          {/* AFTER split (images only) */}
          {isImage && afterUrl && (
            <>
              <div className="absolute inset-0 overflow-hidden" style={{ width: px(split) }}>
                <img src={afterUrl} alt="after"
                  className="block h-full object-contain"
                  style={{ width: surfaceRef.current ? surfaceRef.current.clientWidth : "100%", maxWidth: "none" }}
                  draggable={false} />
              </div>
              <div className="absolute top-0 bottom-0" style={{ left: px(split), width: 1, background: "var(--diff)" }} />
              <div
                className="absolute -translate-x-1/2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full grid place-items-center cursor-ew-resize"
                style={{ left: px(split), background: "var(--diff)", color: "#04222a" }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  const move = (ev: MouseEvent) => setSplit(norm(ev)[0]);
                  const up = () => {
                    window.removeEventListener("mousemove", move);
                    window.removeEventListener("mouseup", up);
                  };
                  window.addEventListener("mousemove", move);
                  window.addEventListener("mouseup", up);
                }}
              >
                <span className="text-[10px]">◂▸</span>
              </div>
              <span className="absolute top-2 left-2 label" style={{ color: "var(--text-mid)" }}>after</span>
              <span className="absolute top-2 right-2 label" style={{ color: "var(--text-mid)" }}>before</span>
            </>
          )}

          {/* mask overlay — Plate Cyan 35%, never red */}
          {(params.rects ?? []).map((r: number[], i: number) => (
            <div key={i} className="absolute pointer-events-none"
              style={{
                left: px(r[0]), top: px(r[1]), width: px(r[2]), height: px(r[3]),
                background: "color-mix(in srgb, var(--diff) 35%, transparent)",
                outline: "1px solid var(--diff)",
              }} />
          ))}
          {drag && rectFromDrag() && (
            <div className="absolute pointer-events-none"
              style={{
                left: px(rectFromDrag()![0]), top: px(rectFromDrag()![1]),
                width: px(rectFromDrag()![2]), height: px(rectFromDrag()![3]),
                background: "color-mix(in srgb, var(--diff) 35%, transparent)",
                outline: "1px solid var(--diff)",
              }} />
          )}
        </div>
      </div>
    </div>
  );
}
