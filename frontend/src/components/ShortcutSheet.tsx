import { useStore } from "@/state/store";

const GROUPS: { title: string; keys: [string, string][] }[] = [
  {
    title: "Tools",
    keys: [
      ["1–8", "Switch tool"],
      ["B", "Brush"],
      ["E", "Erase"],
      ["R", "Rect"],
      ["[  ]", "Brush size"],
    ],
  },
  {
    title: "Viewer",
    keys: [
      ["Space", "Preview"],
      ["← →", "Frame step"],
      ["Scroll", "Zoom"],
    ],
  },
  {
    title: "Job",
    keys: [
      ["⌘ Enter", "Render"],
      ["⌘ Z", "Undo"],
      ["?", "This sheet"],
    ],
  },
];

export function ShortcutSheet() {
  const open = useStore((s) => s.helpOpen);
  const setOpen = useStore((s) => s.setHelpOpen);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-6"
      style={{ background: "color-mix(in srgb, var(--bg-void) 82%, transparent)" }}
      onClick={() => setOpen(false)}>
      <div className="card w-full max-w-lg p-6" style={{ background: "var(--bg-raised)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center mb-4">
          <div className="label">Keyboard</div>
          <button className="ml-auto text-text-low hover:text-text-hi text-[12px]" onClick={() => setOpen(false)}>esc</button>
        </div>
        <div className="grid grid-cols-3 gap-6">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <div className="label mb-2">{g.title}</div>
              <div className="space-y-1.5">
                {g.keys.map(([k, d]) => (
                  <div key={k} className="flex items-center justify-between gap-2">
                    <span className="text-[12px] text-text-mid">{d}</span>
                    <span className="kbd">{k}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
