import type { ReactNode } from "react";

export function Label({ children }: { children: ReactNode }) {
  return <div className="label mb-1.5">{children}</div>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="mb-4">
      <Label>{label}</Label>
      {children}
      {hint && <div className="mt-1 text-[11px] text-text-low">{hint}</div>}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-control border border-border bg-bg-void p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className="flex-1 h-7 rounded-[4px] text-[12px] font-medium transition-colors duration-ui"
            style={{
              background: active ? "var(--accent)" : "transparent",
              color: active ? "#0b0b0b" : "var(--text-mid)",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (b: boolean) => void;
  label: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full h-8 group"
    >
      <span className="text-[13px] text-text-mid group-hover:text-text-hi transition-colors">
        {label}
      </span>
      <span
        className="relative w-9 h-5 rounded-full border transition-colors duration-ui"
        style={{
          background: checked ? "var(--accent)" : "var(--bg-void)",
          borderColor: checked ? "var(--accent)" : "var(--border)",
        }}
      >
        <span
          className="absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all duration-ui"
          style={{
            left: checked ? "18px" : "2px",
            background: checked ? "#0b0b0b" : "var(--text-low)",
          }}
        />
      </span>
    </button>
  );
}

export function Range({
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-[var(--accent)]"
      />
      <span className="num text-[12px] text-text-hi w-14 text-right tabular-nums">
        {value}
        {suffix ?? ""}
      </span>
    </div>
  );
}

export function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="input w-full"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Divider({ label }: { label?: string }) {
  return (
    <div className="my-4 flex items-center gap-2">
      <div className="h-px flex-1 bg-border" />
      {label && <span className="label">{label}</span>}
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
