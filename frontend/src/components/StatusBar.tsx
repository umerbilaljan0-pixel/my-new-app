import { useStore } from "@/state/store";
import { Logo } from "./Logo";
import { IHelp, IMoon, ISun } from "./icons";
import { bytes } from "@/lib/format";

export function StatusBar() {
  const device = useStore((s) => s.device);
  const vram = useStore((s) => s.vramUsed);
  const upload = useStore((s) => s.upload);
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const setHelp = useStore((s) => s.setHelpOpen);
  const ws = useStore((s) => s.wsConnected);

  const vramLabel =
    device?.vram_total_mb != null
      ? `${vram ?? 0}/${device.vram_total_mb} MB`
      : vram != null
        ? `${vram} MB`
        : "—";

  return (
    <header
      className="flex items-center gap-4 px-3 shrink-0 border-b border-border bg-bg-surface"
      style={{ height: 40 }}
    >
      <Logo size={16} />
      <span className="label" style={{ letterSpacing: "0.02em" }}>
        Remove it. Rebuild it. Ship it.
      </span>

      <div className="flex-1" />

      {upload && (
        <span className="num text-[12px] text-text-mid">
          {upload.width}×{upload.height}
          {upload.media_kind === "video" && ` · ${upload.n_frames}f · ${upload.fps.toFixed(0)}fps`}
          {" · "}
          {bytes(upload.size_bytes)}
        </span>
      )}

      <div className="flex items-center gap-2 pl-3 border-l border-border">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: ws ? "var(--ok)" : "var(--text-low)" }}
          title={ws ? "engine connected" : "engine offline"}
        />
        <span className="label" style={{ color: "var(--text-mid)" }}>
          {device?.kind ?? "…"}
        </span>
        <span className="num text-[11px] text-text-low">{vramLabel}</span>
        {device?.half_precision && <span className="kbd">fp16</span>}
      </div>

      <button className="w-8 h-8 grid place-items-center rounded-control text-text-low hover:text-text-hi"
        onClick={toggleTheme} title="Theme">
        {theme === "dark" ? <ISun /> : <IMoon />}
      </button>
      <button className="w-8 h-8 grid place-items-center rounded-control text-text-low hover:text-text-hi"
        onClick={() => setHelp(true)} title="Shortcuts (?)">
        <IHelp />
      </button>
    </header>
  );
}
