import { useEffect, useMemo, useState } from "react";
import { Viewer } from "@/components/Viewer";
import { Select, Toggle } from "@/components/Fields";
import { api, type Estimate, type Quality } from "@/lib/api";
import { useStore, jobList } from "@/state/store";
import { TOOLS, toolBySlug } from "@/lib/tools";
import { ICancel } from "@/components/icons";
import { seconds } from "@/lib/format";

interface Stage {
  tool: string;
  quality: Quality;
  params: Record<string, unknown>;
}

const PALETTE = TOOLS.filter((t) => t.slug !== "stack");
const LS_KEY = "cp-stack-presets";

export default function StackBuilder() {
  const upload = useStore((s) => s.upload);
  const originalUrl = useStore((s) => s.originalUrl);
  const setUpload = useStore((s) => s.setUpload);
  const upsertJob = useStore((s) => s.upsertJob);
  const jobs = useStore((s) => s.jobs);

  const [stages, setStages] = useState<Stage[]>([
    { tool: "clarify", quality: "balanced", params: {} },
    { tool: "revive", quality: "balanced", params: { face_restore: true } },
    { tool: "uplift", quality: "best", params: { target: "4K" } },
  ]);
  const [name, setName] = useState("Archive Restore");
  const [prepass, setPrepass] = useState(false);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [presets, setPresets] = useState<{ name: string; stages: Stage[] }[]>([]);

  useEffect(() => {
    api.presets().then((server) => {
      const local = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
      setPresets([...(server as any), ...local]);
    });
  }, []);

  useEffect(() => {
    if (!upload || stages.length === 0) return setEstimate(null);
    const h = setTimeout(() => {
      api.estimate("stack", upload.upload_id, { stages, clarify_prepass: prepass }, "balanced")
        .then(setEstimate).catch(() => {});
    }, 200);
    return () => clearTimeout(h);
  }, [upload, stages, prepass]);

  const result = useMemo(() => {
    if (!upload) return null;
    return jobList(jobs)
      .filter((j) => j.status === "done" && j.tool === "stack" && j.input_path?.endsWith(upload.upload_id))
      .sort((a, b) => (b.finished_at ?? 0) - (a.finished_at ?? 0))[0];
  }, [jobs, upload]);

  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= stages.length) return;
    const next = [...stages];
    [next[i], next[j]] = [next[j], next[i]];
    setStages(next);
  };
  const add = (slug: string) =>
    setStages((s) => [...s, { tool: slug, quality: "balanced", params: toolBySlug(slug)?.defaults ?? {} }]);
  const remove = (i: number) => setStages((s) => s.filter((_, k) => k !== i));
  const setStage = (i: number, patch: Partial<Stage>) =>
    setStages((s) => s.map((st, k) => (k === i ? { ...st, ...patch } : st)));

  async function onFile(file: File) {
    const url = URL.createObjectURL(file);
    const meta = await api.upload(file);
    setUpload(meta, url);
  }
  async function run() {
    if (!upload) return;
    const job = await api.createJob("stack", upload.upload_id, { stages, clarify_prepass: prepass }, "balanced");
    upsertJob(job);
  }
  function savePreset() {
    const local = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    const next = [...local.filter((p: any) => p.name !== name), { name, stages }];
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    api.presets().then((server) => setPresets([...(server as any), ...next]));
  }
  function exportJson() {
    const blob = new Blob([JSON.stringify({ name, version: 1, stages }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name.replace(/\s+/g, "-").toLowerCase()}.stack.json`;
    a.click();
  }
  function importJson(file: File) {
    file.text().then((t) => {
      const p = JSON.parse(t);
      if (p.stages) {
        setStages(p.stages);
        if (p.name) setName(p.name);
      }
    });
  }

  return (
    <div className="flex-1 flex min-h-0">
      <Viewer
        upload={upload}
        beforeUrl={originalUrl}
        afterUrl={result?.output_path ? api.outputUrl(result.id) : null}
        tool="stack"
        params={{}}
        onFile={onFile}
        onRect={() => {}}
        onSeed={() => {}}
      />

      <aside className="shrink-0 flex flex-col border-l border-border bg-bg-surface" style={{ width: "var(--right-panel)" }}>
        <div className="flex items-center gap-2 px-4 h-11 border-b border-border">
          <input value={name} onChange={(e) => setName(e.target.value)} className="input flex-1 bg-transparent border-0 px-0 text-[15px] font-medium" />
        </div>

        {/* palette */}
        <div className="px-3 py-2 border-b border-border">
          <div className="label mb-1.5">Add stage</div>
          <div className="flex flex-wrap gap-1">
            {PALETTE.map((t) => (
              <button key={t.slug} onClick={() => add(t.slug)}
                className="btn h-7 px-2 text-[11px] gap-1">
                <t.icon width={13} height={13} /> {t.name}
              </button>
            ))}
          </div>
          <div className="mt-2">
            <Toggle checked={prepass} onChange={setPrepass} label="Clarify pre-pass" />
          </div>
        </div>

        {/* pipeline */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {stages.map((st, i) => {
            const def = toolBySlug(st.tool)!;
            return (
              <div key={i} className="card p-2.5">
                <div className="flex items-center gap-2">
                  <span className="num text-[11px] text-text-low w-4">{i + 1}</span>
                  <def.icon width={15} height={15} />
                  <span className="text-[13px] font-medium">{def.name}</span>
                  <div className="ml-auto flex items-center gap-0.5 text-text-low">
                    <button className="w-6 h-6 rounded hover:text-text-hi disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                    <button className="w-6 h-6 rounded hover:text-text-hi disabled:opacity-30" disabled={i === stages.length - 1} onClick={() => move(i, 1)}>↓</button>
                    <button className="w-6 h-6 grid place-items-center rounded hover:text-danger" onClick={() => remove(i)}><ICancel width={14} height={14} /></button>
                  </div>
                </div>
                <div className="mt-2 pl-6">
                  <Select value={st.quality} onChange={(q) => setStage(i, { quality: q as Quality })}
                    options={[{ value: "fast", label: "Fast" }, { value: "balanced", label: "Balanced" }, { value: "best", label: "Best" }]} />
                </div>
              </div>
            );
          })}
          {stages.length === 0 && <div className="text-[12px] text-text-low text-center py-6">Empty pipeline — add a stage.</div>}
        </div>

        {/* presets */}
        <div className="px-3 py-2 border-t border-border">
          <div className="label mb-1.5">Presets</div>
          <div className="flex flex-wrap gap-1">
            {presets.map((pr, i) => (
              <button key={i} className="btn h-7 px-2 text-[11px]" onClick={() => setStages(pr.stages as Stage[])}>
                {pr.name}
              </button>
            ))}
          </div>
          <div className="flex gap-1 mt-2">
            <button className="btn h-7 flex-1 text-[11px]" onClick={savePreset}>Save</button>
            <button className="btn h-7 flex-1 text-[11px]" onClick={exportJson}>Export JSON</button>
            <label className="btn h-7 flex-1 text-[11px] cursor-pointer">
              Import
              <input type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
            </label>
          </div>
        </div>

        {/* estimate + run */}
        <div className="px-4 py-3 border-t border-border grid grid-cols-3 gap-2">
          <Stat label="Output" value={estimate ? estimate.output_size_label : "—"} />
          <Stat label="VRAM" value={estimate ? `${estimate.vram_mb}MB` : "—"} />
          <Stat label="ETA" value={estimate ? seconds(estimate.eta_seconds) : "—"} />
        </div>
        <div className="px-4 py-3 border-t border-border">
          <button className="btn btn-primary w-full" disabled={!upload || stages.length === 0} onClick={run}>
            Render ⌘⏎
          </button>
        </div>
      </aside>
    </div>
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
