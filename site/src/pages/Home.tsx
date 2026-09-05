import { Link } from "react-router-dom";
import { BeforeAfter } from "@/components/BeforeAfter";
import { BRAND, FAQ, SPECS, TOOLS } from "@/data";

export default function Home() {
  return (
    <div className="container-grid">
      {/* hero */}
      <section className="pt-16 pb-14 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <div className="label mb-4">Self-hostable media restoration</div>
          <h1 className="h-display" style={{ fontSize: 48 }}>{BRAND.tagline}</h1>
          <p className="text-text-mid mt-4 max-w-[46ch]" style={{ fontSize: 18 }}>{BRAND.sub}</p>
          <div className="flex flex-wrap gap-3 mt-7">
            <Link to="/download" className="btn btn-primary">Download for Desktop</Link>
            <a href="http://localhost:5173" className="btn">Open Web App</a>
          </div>
          <div className="flex items-center gap-5 mt-7 text-[12px] text-text-low num">
            <span>CUDA · ROCm · MPS · CPU</span>
            <span className="w-px h-3 bg-border" />
            <span>footage never uploads</span>
          </div>
        </div>
        <div>
          <BeforeAfter />
          <div className="text-[11px] text-text-low mt-2 text-center">Drag to compare. Our own frame — Clarify › Uplift 4K.</div>
        </div>
      </section>

      {/* eight tools */}
      <section className="py-12">
        <div className="flex items-end justify-between mb-6">
          <h2 className="h-display" style={{ fontSize: 24 }}>Eight tools, one engine.</h2>
          <Link to="/tools/erase" className="text-[13px] text-accent">All tools →</Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 border border-border rounded-card overflow-hidden">
          {TOOLS.map((t, i) => (
            <Link key={t.slug} to={`/tools/${t.slug}`}
              className="p-5 border-border hover:bg-bg-surface transition-colors"
              style={{
                borderRightWidth: (i + 1) % 4 === 0 ? 0 : 1,
                borderBottomWidth: i < TOOLS.length - 4 ? 1 : 0,
              }}>
              <div className="flex items-baseline justify-between">
                <span className="text-[15px] font-medium">{t.name}</span>
                <span className="num text-[11px] text-text-low">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <p className="text-[12px] text-text-mid mt-1">{t.tagline}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* product capture */}
      <section className="py-12">
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center gap-2 h-9 px-4 border-b border-border">
            <span className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />
            <span className="label">20-second capture · silent · loop</span>
            <span className="num text-[11px] text-text-low ml-auto">00:20</span>
          </div>
          <div className="aspect-[16/8] grid place-items-center bg-bg-void">
            <ProductLoop />
          </div>
        </div>
      </section>

      {/* runs locally */}
      <section className="py-12 grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h2 className="h-display" style={{ fontSize: 24 }}>Runs locally — your footage never uploads.</h2>
          <p className="text-text-mid mt-3 max-w-[52ch]">
            The desktop build and the self-hosted web build do every frame on your own hardware. The
            device is detected at boot and shown with live VRAM. Weights cache locally, verified by
            checksum, and the whole suite works offline afterward.
          </p>
        </div>
        <ul className="space-y-3">
          {[
            ["Non-destructive by law", "Originals are never written to. Every job records its parameters."],
            ["One queue, one GPU job", "Progress streams over WebSocket; pause, cancel, retry, reveal."],
            ["No weights bundled", "First-run downloader lists each model's size and licence."],
          ].map(([h, b]) => (
            <li key={h} className="card p-4">
              <div className="text-[14px] font-medium">{h}</div>
              <div className="text-[12px] text-text-mid mt-0.5">{b}</div>
            </li>
          ))}
        </ul>
      </section>

      {/* specs */}
      <section className="py-12">
        <h2 className="h-display mb-6" style={{ fontSize: 24 }}>Specs</h2>
        <div className="card overflow-hidden">
          {SPECS.map(([k, v], i) => (
            <div key={k} className="grid grid-cols-3 gap-4 px-5 py-3 text-[13px]"
              style={{ borderTop: i ? "1px solid var(--border)" : "none" }}>
              <div className="label self-center">{k}</div>
              <div className="col-span-2 num text-text-mid">{v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* faq */}
      <section className="py-12">
        <h2 className="h-display mb-6" style={{ fontSize: 24 }}>FAQ</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {FAQ.map(([q, a]) => (
            <div key={q} className="card p-5">
              <div className="text-[14px] font-medium">{q}</div>
              <p className="text-[13px] text-text-mid mt-1.5">{a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProductLoop() {
  // a tiny looping schematic of the pipeline, in-brand (no external video asset)
  return (
    <svg viewBox="0 0 640 320" className="w-full h-full">
      <style>{`
        @keyframes sweep { 0%{transform:translateX(-40px);opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{transform:translateX(560px);opacity:0} }
        .fill { animation: sweep 6s cubic-bezier(.2,0,0,1) infinite; }
      `}</style>
      {["Clarify", "Revive", "Uplift 4K"].map((s, i) => (
        <g key={s} transform={`translate(${60 + i * 180}, 130)`}>
          <rect width="150" height="60" rx="10" fill="var(--bg-surface)" stroke="var(--border)" />
          <text x="75" y="35" textAnchor="middle" fill="var(--text-hi)" fontSize="14" fontFamily="sans-serif">{s}</text>
          {i < 2 && <path d="M150 30 H180" stroke="var(--border-hot)" strokeWidth="1.5" />}
        </g>
      ))}
      <g className="fill">
        <rect x="60" y="200" width="20" height="6" rx="3" fill="var(--accent)" />
      </g>
      <text x="320" y="250" textAnchor="middle" className="num" fill="var(--text-low)" fontSize="11" fontFamily="monospace">
        one queue · one GPU job · non-destructive
      </text>
    </svg>
  );
}
