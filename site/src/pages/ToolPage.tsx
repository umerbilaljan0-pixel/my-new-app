import { Link, useParams } from "react-router-dom";
import { BeforeAfter } from "@/components/BeforeAfter";
import { TOOLS } from "@/data";

export default function ToolPage() {
  const { slug } = useParams();
  const tool = TOOLS.find((t) => t.slug === slug) ?? TOOLS[0];
  return (
    <div className="container-grid py-12 grid lg:grid-cols-[220px_1fr] gap-10">
      <aside className="hidden lg:block">
        <div className="label mb-3">Tools</div>
        <ul className="space-y-1">
          {TOOLS.map((t, i) => (
            <li key={t.slug}>
              <Link to={`/tools/${t.slug}`}
                className="flex items-center justify-between px-3 h-9 rounded-control text-[13px] transition-colors"
                style={{
                  background: t.slug === tool.slug ? "var(--bg-surface)" : "transparent",
                  color: t.slug === tool.slug ? "var(--text-hi)" : "var(--text-mid)",
                }}>
                {t.name}<span className="num text-[11px] text-text-low">{String(i + 1).padStart(2, "0")}</span>
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      <div>
        <div className="label mb-3">{tool.verb}</div>
        <h1 className="h-display" style={{ fontSize: 32 }}>{tool.name}</h1>
        <p className="text-text-mid mt-2" style={{ fontSize: 18 }}>{tool.tagline}</p>

        <div className="mt-8"><BeforeAfter /></div>

        <p className="text-text-mid mt-8 max-w-[64ch] leading-relaxed">{tool.body}</p>

        {tool.models.length > 0 && (
          <div className="mt-6">
            <div className="label mb-2">Models</div>
            <div className="flex flex-wrap gap-2">
              {tool.models.map((m) => (
                <span key={m} className="num text-[12px] px-2.5 py-1 rounded-control border border-border text-text-mid">{m}</span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-8">
          <a href="http://localhost:5173" className="btn btn-primary">Open in Web App</a>
          <Link to="/download" className="btn">Download Desktop</Link>
        </div>
      </div>
    </div>
  );
}
