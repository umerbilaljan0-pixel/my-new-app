const ENTRIES: { v: string; date: string; notes: string[] }[] = [
  { v: "1.0.0", date: "2026-09-05", notes: [
    "Initial release: eight tools, one shared engine, one job queue.",
    "STACK pipeline builder with exportable JSON presets.",
    "Device auto-detect (CUDA / ROCm / MPS / ONNX CPU) with live VRAM.",
    "Public /v1 API with signed uploads, webhooks and rate limiting.",
    "Rights gate on first launch and every export.",
  ] },
  { v: "0.9.0", date: "2026-08-12", notes: [
    "Beta: ERASE, UPLIFT, REVIVE, CLARIFY.",
    "Before/after split viewer and non-destructive job storage.",
  ] },
];

export default function Changelog() {
  return (
    <div className="container-grid py-14 max-w-2xl">
      <div className="label mb-3">Changelog</div>
      <h1 className="h-display mb-8" style={{ fontSize: 32 }}>What shipped.</h1>
      <div className="space-y-8">
        {ENTRIES.map((e) => (
          <div key={e.v} className="grid grid-cols-[100px_1fr] gap-4">
            <div>
              <div className="num text-[15px] font-medium">{e.v}</div>
              <div className="num text-[11px] text-text-low mt-0.5">{e.date}</div>
            </div>
            <ul className="space-y-1.5">
              {e.notes.map((n) => (
                <li key={n} className="text-[13px] text-text-mid flex gap-2">
                  <span className="text-text-low">—</span>{n}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
