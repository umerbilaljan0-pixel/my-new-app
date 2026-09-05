"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eraser, Scissors, Maximize2, RotateCcw } from "lucide-react";
import { DropZone } from "@/components/tool/DropZone";

interface Selected {
  url: string;
  name: string;
  bytes: number;
  width: number;
  height: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Hero — H1, sub, and the live drop zone (Section 9.1). On selecting a file we
 * immediately show the user's own image (Section 9.2, "never a spinner on an
 * empty box") with its exact metadata, then present the three tools to run it
 * through. The processing pipeline itself lands in Phases 2–4.
 */
export function Hero() {
  const [selected, setSelected] = useState<Selected | null>(null);

  useEffect(() => {
    return () => {
      if (selected?.url) URL.revokeObjectURL(selected.url);
    };
  }, [selected?.url]);

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setSelected({
        url,
        name: file.name,
        bytes: file.size,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = () => {
      setSelected({ url, name: file.name, bytes: file.size, width: 0, height: 0 });
    };
    img.src = url;
  };

  const reset = () => setSelected(null);

  return (
    <section className="container-page pb-16 pt-16 sm:pt-24">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <h1 className="font-display text-[34px] font-bold leading-[1.05] tracking-tight text-ink sm:text-3xl">
          Remove it. Rebuild it. Ship it.
        </h1>
        <p className="prose-measure mt-5 text-base text-ink-mid">
          Three AI tools for images — erase watermarks, cut out backgrounds,
          upscale to 4K. No signup. Results in seconds.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-[560px]">
        {!selected ? (
          <DropZone onFile={handleFile} />
        ) : (
          <div className="animate-fade-rise flex flex-col gap-4">
            <div className="overflow-hidden rounded-xl border border-line bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview, dimensions unknown until load */}
              <img
                src={selected.url}
                alt="Your selected image"
                className="max-h-[320px] w-full object-contain checkerboard"
              />
              <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5">
                <span className="tabular truncate text-2xs text-ink-low">
                  {selected.width > 0
                    ? `${selected.width} × ${selected.height} · ${formatBytes(selected.bytes)}`
                    : formatBytes(selected.bytes)}
                </span>
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-1.5 text-2xs font-semibold text-ink-mid transition-colors hover:text-ink"
                >
                  <RotateCcw size={13} />
                  Choose another
                </button>
              </div>
            </div>
            <p className="text-center text-2xs text-ink-low">Pick a tool to run</p>
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
          </div>
        )}
        <p className="mt-4 text-center text-sm text-ink-mid">
          <span className="tabular">20</span> full-resolution images for{" "}
          <span className="tabular">$2</span>. No subscription.
        </p>
      </div>
    </section>
  );
}
