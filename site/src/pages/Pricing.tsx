import { PRICING } from "@/data";

export default function Pricing() {
  return (
    <div className="container-grid py-14">
      <div className="label mb-3">Pricing</div>
      <h1 className="h-display" style={{ fontSize: 32 }}>Credits, or a perpetual licence.</h1>
      <p className="text-text-mid mt-2 max-w-[52ch]">
        1 credit = 1 image or 10s of 1080p video, scaling with resolution. The web build is credit-based;
        the desktop build is a one-time licence and fully offline.
      </p>

      <div className="grid md:grid-cols-4 gap-3 mt-10">
        {PRICING.map((p) => (
          <div key={p.name} className="card p-5 flex flex-col"
            style={{ borderColor: p.featured ? "var(--accent)" : undefined }}>
            {p.featured && <div className="label mb-2" style={{ color: "var(--accent)" }}>Most popular</div>}
            <div className="text-[15px] font-medium">{p.name}</div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="num h-display" style={{ fontSize: 28 }}>{p.price}</span>
              <span className="num text-[12px] text-text-low">{p.cadence}</span>
            </div>
            <ul className="mt-4 space-y-2 flex-1">
              {p.features.map((f) => (
                <li key={f} className="text-[12px] text-text-mid flex gap-2">
                  <span style={{ color: "var(--ok)" }}>✓</span>{f}
                </li>
              ))}
            </ul>
            <a href={p.href} className={"btn mt-5 " + (p.featured ? "btn-primary" : "")}>{p.cta}</a>
          </div>
        ))}
      </div>

      <p className="text-[12px] text-text-low mt-8 num">
        Free tier: 30 credits / month with a visible output watermark. Pro removes the mark and adds a
        priority queue. Studio adds API keys, team seats and shared Stack presets.
      </p>
    </div>
  );
}
