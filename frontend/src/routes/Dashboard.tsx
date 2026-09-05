import { useNavigate } from "react-router-dom";
import { TOOLS } from "@/lib/tools";
import { api } from "@/lib/api";
import { useStore } from "@/state/store";

export default function Dashboard() {
  const nav = useNavigate();
  const setUpload = useStore((s) => s.setUpload);

  async function onFile(file: File, slug: string) {
    const url = URL.createObjectURL(file);
    const meta = await api.upload(file);
    setUpload(meta, url);
    nav(slug === "stack" ? "/stack" : `/t/${slug}`);
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-grid mx-auto px-6 py-8">
        <div className="mb-6">
          <div className="text-[24px] font-semibold" style={{ lineHeight: "var(--lh-display)" }}>
            Eight tools, one queue.
          </div>
          <div className="text-[13px] text-text-mid mt-1">
            Load media into any tool, or chain them in a Stack. Everything runs on this machine.
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            const to = t.slug === "stack" ? "/stack" : `/t/${t.slug}`;
            return (
              <label
                key={t.slug}
                className="card p-4 cursor-pointer group flex flex-col"
                onClick={(e) => {
                  // clicking the card (not the file input) navigates
                  if ((e.target as HTMLElement).tagName !== "INPUT") nav(to);
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="w-9 h-9 grid place-items-center rounded-control border border-border text-accent group-hover:border-border-hot transition-colors">
                    <Icon />
                  </span>
                  <span className="kbd">{t.hotkey}</span>
                </div>
                <div className="mt-3 text-[15px] font-medium">{t.name}</div>
                <div className="text-[12px] text-text-mid mt-0.5 flex-1">{t.tagline}</div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[11px] text-accent group-hover:underline">{t.verb} →</span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    hidden
                    id={`f-${t.slug}`}
                    onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0], t.slug)}
                  />
                  <button
                    className="ml-auto text-[11px] text-text-low hover:text-text-hi"
                    onClick={(e) => {
                      e.stopPropagation();
                      document.getElementById(`f-${t.slug}`)?.click();
                    }}
                  >
                    load…
                  </button>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
