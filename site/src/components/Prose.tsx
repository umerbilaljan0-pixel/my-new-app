import type { ReactNode } from "react";

export function Prose({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="container-grid py-14 max-w-2xl">
      <div className="label mb-3">Legal</div>
      <h1 className="h-display" style={{ fontSize: 32 }}>{title}</h1>
      <div className="num text-[11px] text-text-low mt-2">Last updated {updated}</div>
      <div className="mt-8 space-y-5 text-[14px] text-text-mid leading-relaxed [&_h2]:text-text-hi [&_h2]:text-[16px] [&_h2]:font-medium [&_h2]:mt-8 [&_strong]:text-text-hi">
        {children}
      </div>
    </div>
  );
}
