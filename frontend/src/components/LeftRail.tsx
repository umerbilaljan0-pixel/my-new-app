import { NavLink, useNavigate } from "react-router-dom";
import { TOOLS } from "@/lib/tools";
import { Monogram } from "./Logo";
import { IQueue, ISettings } from "./icons";
import { useStore, jobList } from "@/state/store";

export function LeftRail() {
  const nav = useNavigate();
  const jobs = useStore((s) => s.jobs);
  const queueOpen = useStore((s) => s.queueOpen);
  const setQueueOpen = useStore((s) => s.setQueueOpen);
  const active = jobList(jobs).filter((j) => j.status === "running" || j.status === "queued").length;

  return (
    <nav
      className="flex flex-col items-center shrink-0 border-r border-border bg-bg-surface"
      style={{ width: "var(--rail)" }}
    >
      <button
        onClick={() => nav("/")}
        className="h-14 grid place-items-center hover:opacity-80 transition-opacity"
        title="Dashboard"
      >
        <Monogram size={30} />
      </button>

      <div className="flex-1 flex flex-col items-center gap-1 pt-2">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          const to = t.slug === "stack" ? "/stack" : `/t/${t.slug}`;
          return (
            <NavLink
              key={t.slug}
              to={to}
              title={`${t.name} — ${t.tagline}  [${t.hotkey}]`}
              className={({ isActive }) =>
                "relative w-10 h-10 grid place-items-center rounded-control transition-colors duration-ui " +
                (isActive
                  ? "text-accent bg-bg-raised"
                  : "text-text-low hover:text-text-hi hover:bg-bg-raised")
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-accent" />
                  )}
                  <Icon />
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      <button
        onClick={() => setQueueOpen(!queueOpen)}
        title="Queue"
        className="relative w-10 h-10 grid place-items-center rounded-control text-text-low hover:text-text-hi hover:bg-bg-raised transition-colors mb-1"
      >
        <IQueue />
        {active > 0 && (
          <span className="num absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 grid place-items-center rounded-full text-[10px] font-semibold bg-accent text-black">
            {active}
          </span>
        )}
      </button>
      <NavLink
        to="/settings"
        title="Settings"
        className={({ isActive }) =>
          "w-10 h-10 mb-2 grid place-items-center rounded-control transition-colors duration-ui " +
          (isActive ? "text-accent bg-bg-raised" : "text-text-low hover:text-text-hi hover:bg-bg-raised")
        }
      >
        <ISettings />
      </NavLink>
    </nav>
  );
}
