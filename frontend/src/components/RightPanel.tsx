import type { Estimate, ModelSpec, Quality } from "@/lib/api";
import type { ToolDef, Params } from "@/lib/tools";
import { Segmented } from "./Fields";
import { seconds } from "@/lib/format";

interface Props {
  tool: ToolDef;
  params: Params;
  setParams: (patch: Params) => void;
  quality: Quality;
  setQuality: (q: Quality) => void;
  estimate: Estimate | null;
  missing: ModelSpec[];
  onRun: () => void;
  running: boolean;
  hasFile: boolean;
  onDownloadModels: () => void;
  downloadingModels: boolean;
  hasResult: boolean;
  onExport: () => void;
}

export function RightPanel(p: Props) {
  const Settings = p.tool.Settings;
  return (
    <aside
      className="shrink-0 flex flex-col border-l border-border bg-bg-surface"
      style={{ width: "var(--right-panel)" }}
    >
      <div className="flex items-center gap-2 px-4 h-11 border-b border-border">
        <p.tool.icon />
        <span className="text-[15px] font-medium">{p.tool.name}</span>
        <span className="ml-auto kbd">{p.tool.hotkey}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <Settings params={p.params} set={p.setParams} />
      </div>

      {/* Quality */}
      <div className="px-4 py-3 border-t border-border">
        <div className="label mb-1.5">Quality</div>
        <Segmented
          value={p.quality}
          onChange={(v) => p.setQuality(v as Quality)}
          options={[
            { value: "fast", label: "Fast" },
            { value: "balanced", label: "Balanced" },
            { value: "best", label: "Best" },
          ]}
        />
      </div>

      {/* Estimate */}
      <div className="px-4 py-3 border-t border-border grid grid-cols-3 gap-2">
        <Stat label="Output" value={p.estimate ? p.estimate.output_size_label : "—"} />
        <Stat label="VRAM" value={p.estimate ? `${p.estimate.vram_mb}MB` : "—"} />
        <Stat label="ETA" value={p.estimate ? seconds(p.estimate.eta_seconds) : "—"} />
      </div>
      {p.estimate?.output_resolution && (
        <div className="px-4 -mt-1 pb-2 num text-[11px] text-text-low">→ {p.estimate.output_resolution}</div>
      )}
      {p.estimate?.notes?.length ? (
        <div className="px-4 pb-2 text-[11px] text-text-mid">{p.estimate.notes.join(" · ")}</div>
      ) : null}

      {/* Missing models */}
      {p.missing.length > 0 && (
        <div className="mx-4 mb-3 p-3 rounded-card border border-border bg-bg-raised">
          <div className="label mb-1.5">Models required</div>
          {p.missing.map((m) => (
            <div key={m.key} className="flex items-center justify-between text-[12px] py-0.5">
              <span className="text-text-mid">{m.name}</span>
              <span className="num text-text-low">{m.size_mb}MB · {m.licence}</span>
            </div>
          ))}
          <button className="btn w-full mt-2 h-8 text-[12px]" onClick={p.onDownloadModels} disabled={p.downloadingModels}>
            {p.downloadingModels ? "Downloading…" : "Download & cache"}
          </button>
        </div>
      )}

      {/* Action */}
      <div className="px-4 py-3 border-t border-border flex gap-2">
        <button
          className="btn btn-primary flex-1"
          disabled={!p.hasFile || p.running}
          onClick={p.onRun}
        >
          {p.running ? "Working…" : `${p.tool.verb} ⌘⏎`}
        </button>
        {p.hasResult && (
          <button className="btn" onClick={p.onExport} title="Export (confirms rights)">
            Export
          </button>
        )}
      </div>
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="num text-[13px] text-text-hi mt-0.5">{value}</div>
    </div>
  );
}
