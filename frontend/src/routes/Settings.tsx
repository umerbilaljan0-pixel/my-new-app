import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { useStore } from "@/state/store";
import { Divider, Field, Segmented, Select } from "@/components/Fields";
import { bytes } from "@/lib/format";

export default function Settings() {
  const device = useStore((s) => s.device);
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const [cache, setCache] = useState<number | null>(null);
  const [format, setFormat] = useState<string>(localStorage.getItem("cp-format") || "same");

  useEffect(() => {
    api.cacheSize().then((r) => setCache(r.bytes));
  }, []);

  async function purge() {
    await api.purgeCache();
    setCache(0);
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="text-[24px] font-semibold mb-6" style={{ lineHeight: "var(--lh-display)" }}>Settings</div>

        <Section title="Compute">
          <Field label="Device" hint="Detected at boot. Half precision used on CUDA when available.">
            <div className="card p-3 flex items-center justify-between">
              <span className="text-[13px]">{device?.name ?? "—"}</span>
              <span className="num text-[12px] text-text-mid">
                {device?.kind}{device?.vram_total_mb ? ` · ${device.vram_total_mb}MB` : ""}
              </span>
            </div>
          </Field>
          <Field label="GPU selection" hint="Override auto-detect (requires restart).">
            <Select value={device?.kind ?? "auto"} onChange={() => {}}
              options={[
                { value: "auto", label: "Auto" }, { value: "cuda", label: "CUDA" },
                { value: "rocm", label: "ROCm" }, { value: "mps", label: "Apple MPS" },
                { value: "onnx-cpu", label: "ONNX CPU" }, { value: "cpu", label: "CPU" },
              ]} />
          </Field>
        </Section>

        <Section title="Model cache">
          <div className="card p-3 flex items-center justify-between">
            <div>
              <div className="text-[13px]">~/.cleanplate/models</div>
              <div className="num text-[12px] text-text-low mt-0.5">{cache != null ? bytes(cache) : "…"}</div>
            </div>
            <button className="btn btn-danger" onClick={purge}>Purge cache</button>
          </div>
        </Section>

        <Section title="Output">
          <Field label="Theme">
            <Segmented value={theme} onChange={() => toggleTheme()}
              options={[{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }]} />
          </Field>
          <Field label="Default output format">
            <Select value={format} onChange={(v) => { setFormat(v); localStorage.setItem("cp-format", v); }}
              options={[
                { value: "same", label: "Same as source" }, { value: "png", label: "PNG" },
                { value: "mp4", label: "MP4 (H.264)" }, { value: "webm", label: "WebM (VP9)" },
                { value: "prores", label: "ProRes 4444" },
              ]} />
          </Field>
        </Section>

        <Section title="Account & billing">
          <div className="card p-4">
            <div className="text-[13px] text-text-mid">
              This is the local build — no account required, all processing offline. In the hosted build
              this section shows profile, usage graph, credits, API keys and team seats.
            </div>
            <div className="mt-3 flex gap-2">
              <span className="kbd">Desktop licence: offline-activatable · 3 machines</span>
            </div>
          </div>
        </Section>

        <Divider />
        <div className="text-[11px] text-text-low">
          CLEANPLATE — non-destructive by law. Originals are never written to; every job records its
          parameters so any result can be re-rendered or reverted.
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-8">
      <div className="label mb-3">{title}</div>
      {children}
    </div>
  );
}
