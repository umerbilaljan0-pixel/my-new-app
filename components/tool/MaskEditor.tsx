"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Brush, Eraser, Square, Undo2, Redo2, Trash2, FlipHorizontal2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Slider } from "@/components/ui/Slider";
import type { DetectBox } from "@/lib/validation/jobs";

export interface MaskEditorProps {
  imageUrl: string;
  originalWidth: number;
  originalHeight: number;
  /** Optional boxes (original px) to prefill the mask. */
  initialBoxes?: DetectBox[];
  onConfirm: (maskBlob: Blob) => void;
  onCancel: () => void;
}

type Tool = "brush" | "rect" | "eraser";
const MASK_LONG_EDGE = 1024; // cap mask resolution (inpaint rescales to input)
const HISTORY_CAP = 20;

/**
 * MaskEditor (Section 8.1). Paint over what you want gone: brush, rectangle and
 * eraser, with undo/redo, clear and invert. The mask is white-on-black at a
 * capped resolution and rescaled to the input on the server. Cyan overlay at
 * ~35% (never red — users stare at masks).
 */
export function MaskEditor({
  imageUrl,
  originalWidth,
  originalHeight,
  initialBoxes,
  onConfirm,
  onCancel,
}: MaskEditorProps) {
  const maskRef = useRef<HTMLCanvasElement | null>(null);
  const viewRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tool, setTool] = useState<Tool>("brush");
  const [brush, setBrush] = useState(40);
  const drawing = useRef(false);
  const rectStart = useRef<{ x: number; y: number } | null>(null);
  const history = useRef<string[]>([]);
  const histIndex = useRef(-1);
  const [histState, setHistState] = useState({ canUndo: false, canRedo: false });

  const scale = Math.min(1, MASK_LONG_EDGE / Math.max(originalWidth, originalHeight));
  const mw = Math.max(1, Math.round(originalWidth * scale));
  const mh = Math.max(1, Math.round(originalHeight * scale));

  const renderView = useCallback(() => {
    const mask = maskRef.current;
    const view = viewRef.current;
    if (!mask || !view) return;
    const vctx = view.getContext("2d")!;
    vctx.clearRect(0, 0, mw, mh);
    vctx.drawImage(mask, 0, 0);
    // Recolour the white mask to cyan.
    vctx.globalCompositeOperation = "source-in";
    vctx.fillStyle = "#00B8D4";
    vctx.fillRect(0, 0, mw, mh);
    vctx.globalCompositeOperation = "source-over";
  }, [mw, mh]);

  const snapshot = useCallback(() => {
    const mask = maskRef.current;
    if (!mask) return;
    // Drop any redo branch, push current state.
    history.current = history.current.slice(0, histIndex.current + 1);
    history.current.push(mask.toDataURL("image/png"));
    if (history.current.length > HISTORY_CAP) history.current.shift();
    histIndex.current = history.current.length - 1;
    setHistState({ canUndo: histIndex.current > 0, canRedo: false });
  }, []);

  const restore = useCallback(
    (dataUrl: string) => {
      const mask = maskRef.current;
      if (!mask) return;
      const mctx = mask.getContext("2d")!;
      const img = new Image();
      img.onload = () => {
        mctx.clearRect(0, 0, mw, mh);
        mctx.drawImage(img, 0, 0, mw, mh);
        renderView();
      };
      img.src = dataUrl;
    },
    [mw, mh, renderView],
  );

  // Initialise the mask canvas (and any seeded boxes) once.
  useEffect(() => {
    const mask = maskRef.current;
    if (!mask) return;
    const mctx = mask.getContext("2d")!;
    mctx.clearRect(0, 0, mw, mh);
    if (initialBoxes?.length) {
      mctx.fillStyle = "#ffffff";
      for (const b of initialBoxes) {
        mctx.fillRect(b.x * scale, b.y * scale, b.width * scale, b.height * scale);
      }
    }
    renderView();
    history.current = [mask.toDataURL("image/png")];
    histIndex.current = 0;
    setHistState({ canUndo: false, canRedo: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toMaskCoords = (clientX: number, clientY: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * mw,
      y: ((clientY - rect.top) / rect.height) * mh,
    };
  };

  const paintAt = (x: number, y: number) => {
    const mctx = maskRef.current!.getContext("2d")!;
    mctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    mctx.fillStyle = "#ffffff";
    mctx.beginPath();
    mctx.arc(x, y, brush / 2, 0, Math.PI * 2);
    mctx.fill();
    mctx.globalCompositeOperation = "source-over";
    renderView();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drawing.current = true;
    const { x, y } = toMaskCoords(e.clientX, e.clientY);
    if (tool === "rect") {
      rectStart.current = { x, y };
    } else {
      paintAt(x, y);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const { x, y } = toMaskCoords(e.clientX, e.clientY);
    if (tool === "rect" && rectStart.current) {
      // Live preview: re-render from the last committed snapshot + preview rect.
      renderView();
      const view = viewRef.current!.getContext("2d")!;
      view.strokeStyle = "#00B8D4";
      view.lineWidth = 2;
      view.strokeRect(
        rectStart.current.x,
        rectStart.current.y,
        x - rectStart.current.x,
        y - rectStart.current.y,
      );
    } else {
      paintAt(x, y);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    drawing.current = false;
    if (tool === "rect" && rectStart.current) {
      const { x, y } = toMaskCoords(e.clientX, e.clientY);
      const mctx = maskRef.current!.getContext("2d")!;
      mctx.fillStyle = "#ffffff";
      mctx.fillRect(
        Math.min(rectStart.current.x, x),
        Math.min(rectStart.current.y, y),
        Math.abs(x - rectStart.current.x),
        Math.abs(y - rectStart.current.y),
      );
      rectStart.current = null;
      renderView();
    }
    snapshot();
  };

  const undo = () => {
    if (histIndex.current <= 0) return;
    histIndex.current -= 1;
    restore(history.current[histIndex.current]!);
    setHistState({ canUndo: histIndex.current > 0, canRedo: true });
  };
  const redo = () => {
    if (histIndex.current >= history.current.length - 1) return;
    histIndex.current += 1;
    restore(history.current[histIndex.current]!);
    setHistState({
      canUndo: true,
      canRedo: histIndex.current < history.current.length - 1,
    });
  };
  const clear = () => {
    const mctx = maskRef.current!.getContext("2d")!;
    mctx.clearRect(0, 0, mw, mh);
    renderView();
    snapshot();
  };
  const invert = () => {
    const mask = maskRef.current!;
    const mctx = mask.getContext("2d")!;
    const data = mctx.getImageData(0, 0, mw, mh);
    for (let i = 3; i < data.data.length; i += 4) {
      const a = data.data[i]!;
      data.data[i - 3] = 255;
      data.data[i - 2] = 255;
      data.data[i - 1] = 255;
      data.data[i] = 255 - a;
    }
    mctx.putImageData(data, 0, 0);
    renderView();
    snapshot();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key === "[") setBrush((b) => Math.max(4, b - 4));
      else if (e.key === "]") setBrush((b) => Math.min(200, b + 4));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirm = () => {
    // Export white-on-black opaque PNG.
    const mask = maskRef.current!;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = mw;
    exportCanvas.height = mh;
    const ectx = exportCanvas.getContext("2d")!;
    ectx.fillStyle = "#000000";
    ectx.fillRect(0, 0, mw, mh);
    ectx.drawImage(mask, 0, 0);
    exportCanvas.toBlob((blob) => {
      if (blob) onConfirm(blob);
    }, "image/png");
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-md border border-line bg-sunken p-1">
          <IconButton aria-label="Brush" icon={<Brush size={16} />} variant={tool === "brush" ? "secondary" : "ghost"} onClick={() => setTool("brush")} />
          <IconButton aria-label="Rectangle" icon={<Square size={16} />} variant={tool === "rect" ? "secondary" : "ghost"} onClick={() => setTool("rect")} />
          <IconButton aria-label="Eraser" icon={<Eraser size={16} />} variant={tool === "eraser" ? "secondary" : "ghost"} onClick={() => setTool("eraser")} />
        </div>
        <div className="flex gap-1">
          <IconButton aria-label="Undo" icon={<Undo2 size={16} />} onClick={undo} disabled={!histState.canUndo} />
          <IconButton aria-label="Redo" icon={<Redo2 size={16} />} onClick={redo} disabled={!histState.canRedo} />
          <IconButton aria-label="Invert mask" icon={<FlipHorizontal2 size={16} />} onClick={invert} />
          <IconButton aria-label="Clear mask" icon={<Trash2 size={16} />} onClick={clear} />
        </div>
        <div className="ml-auto w-40">
          <Slider label="Brush" value={brush} onValueChange={setBrush} min={4} max={200} format={(v) => `${v}px`} />
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative mx-auto w-full max-w-[560px] touch-none overflow-hidden rounded-lg border border-line"
        style={{ aspectRatio: `${mw} / ${mh}` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
        <img src={imageUrl} alt="Paint over what to erase" className="absolute inset-0 h-full w-full object-contain" draggable={false} />
        <canvas ref={maskRef} width={mw} height={mh} className="hidden" />
        <canvas ref={viewRef} width={mw} height={mh} className="absolute inset-0 h-full w-full opacity-[0.55]" style={{ imageRendering: "auto" }} />
      </div>

      <p className="text-center text-2xs text-ink-low">
        Paint slightly past the edges of what you want gone. <span className="tabular">[ ]</span> resize brush · <span className="tabular">⌘Z</span> undo
      </p>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={confirm}>
          Erase
        </Button>
      </div>
    </div>
  );
}
