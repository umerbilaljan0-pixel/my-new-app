import { useState } from "react";
import { Monogram } from "./Logo";

interface Props {
  open: boolean;
  context: "first_launch" | "export";
  filename?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function RightsGate({ open, context, filename, onConfirm, onCancel }: Props) {
  const [checked, setChecked] = useState(false);
  if (!open) return null;
  const first = context === "first_launch";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-6"
      style={{ background: "color-mix(in srgb, var(--bg-void) 82%, transparent)" }}>
      <div className="card w-full max-w-md p-6" style={{ background: "var(--bg-raised)" }}>
        <div className="flex items-center gap-3 mb-4">
          <Monogram size={28} />
          <div className="label">{first ? "Confirm rights" : "Confirm rights to export"}</div>
        </div>
        <p className="text-[13px] text-text-mid leading-relaxed">
          {first
            ? "CLEANPLATE runs on material you own or are licensed to use."
            : `You're about to export ${filename ? `“${filename}”` : "this result"}.`}
        </p>
        <p className="text-[13px] text-text-mid leading-relaxed mt-3">
          Stripping copyright, credit or provenance marks from third-party material is unlawful in
          most jurisdictions, regardless of the tool used. This confirmation is logged locally with a
          timestamp.
        </p>
        <label className="flex items-start gap-2.5 mt-4 cursor-pointer">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 accent-[var(--accent)]" />
          <span className="text-[13px] text-text-hi">
            I own this material or hold a licence to modify it.
          </span>
        </label>
        <div className="flex gap-2 mt-5">
          {onCancel && <button className="btn flex-1" onClick={onCancel}>Cancel</button>}
          <button className="btn btn-primary flex-1" disabled={!checked} onClick={onConfirm}>
            {first ? "Continue" : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
}
