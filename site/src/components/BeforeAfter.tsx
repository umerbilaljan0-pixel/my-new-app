import { useRef, useState } from "react";

// Our own generated frame (no stock photos): an abstract cinematic plate,
// shown degraded (blur + block noise + a sample watermark) as "before" and
// clean as "after". The divider drags.
function Scene({ degraded }: { degraded: boolean }) {
  return (
    <svg viewBox="0 0 640 360" className="block w-full h-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b2a3a" />
          <stop offset="0.55" stopColor="#3a2f4a" />
          <stop offset="1" stopColor="#0b0d12" />
        </linearGradient>
        <radialGradient id="sun" cx="0.68" cy="0.42" r="0.4">
          <stop offset="0" stopColor="#FFB020" />
          <stop offset="0.4" stopColor="#E0761A" />
          <stop offset="1" stopColor="#E0761A00" />
        </radialGradient>
        <filter id="deg">
          <feGaussianBlur stdDeviation="1.6" />
          <feColorMatrix type="saturate" values="0.7" />
        </filter>
        <pattern id="blocks" width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill="none" />
          <rect width="16" height="16" fill="#ffffff" opacity="0.03" />
          <path d="M16 0V16M0 16H16" stroke="#000" strokeOpacity="0.10" strokeWidth="1" />
        </pattern>
      </defs>

      <g filter={degraded ? "url(#deg)" : undefined}>
        <rect width="640" height="360" fill="url(#sky)" />
        <circle cx="435" cy="150" r="120" fill="url(#sun)" />
        {/* far ridge */}
        <path d="M0 232 L120 210 L250 236 L390 206 L520 234 L640 214 L640 360 L0 360 Z" fill="#12161d" />
        {/* near ridge */}
        <path d="M0 268 L150 250 L300 276 L470 250 L640 272 L640 360 L0 360 Z" fill="#0b0e13" />
        {/* reflection glints */}
        <g opacity="0.5">
          <rect x="120" y="300" width="400" height="1.5" fill="#FFB020" opacity="0.25" />
          <rect x="180" y="320" width="280" height="1.5" fill="#FFB020" opacity="0.18" />
        </g>
      </g>

      {degraded && (
        <>
          <rect width="640" height="360" fill="url(#blocks)" />
          <text x="320" y="188" textAnchor="middle" fontFamily="monospace" fontSize="34"
            fill="#ffffff" opacity="0.22" transform="rotate(-8 320 188)" letterSpacing="4">
            SAMPLE ©
          </text>
        </>
      )}
    </svg>
  );
}

export function BeforeAfter() {
  const [split, setSplit] = useState(0.52);
  const ref = useRef<HTMLDivElement>(null);
  const set = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    setSplit(Math.min(1, Math.max(0, (clientX - r.left) / r.width)));
  };
  const startDrag = () => {
    const move = (e: MouseEvent) => set(e.clientX);
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return (
    <div ref={ref} className="relative w-full aspect-video rounded-card overflow-hidden border border-border select-none"
      onMouseDown={(e) => { set(e.clientX); startDrag(); }}>
      {/* before base */}
      <div className="absolute inset-0"><Scene degraded /></div>
      {/* after clipped */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${split * 100}%` }}>
        <div className="absolute inset-0" style={{ width: ref.current?.clientWidth ?? "100%" }}>
          <div style={{ width: ref.current?.clientWidth ?? 640, height: "100%" }}><Scene degraded={false} /></div>
        </div>
      </div>
      {/* divider */}
      <div className="absolute top-0 bottom-0" style={{ left: `${split * 100}%`, width: 1, background: "var(--diff)" }} />
      <button
        onMouseDown={(e) => { e.stopPropagation(); startDrag(); }}
        className="absolute -translate-x-1/2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full grid place-items-center cursor-ew-resize"
        style={{ left: `${split * 100}%`, background: "var(--diff)", color: "#04222a" }}
        aria-label="Drag to compare">
        <span className="text-[12px]">◂▸</span>
      </button>
      <span className="absolute bottom-3 left-3 label num" style={{ color: "var(--text-mid)" }}>after · 4K</span>
      <span className="absolute bottom-3 right-3 label num" style={{ color: "var(--text-mid)" }}>before · 480p</span>
    </div>
  );
}
