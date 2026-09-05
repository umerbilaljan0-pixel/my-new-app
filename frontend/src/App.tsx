import { useEffect, useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { LeftRail } from "@/components/LeftRail";
import { StatusBar } from "@/components/StatusBar";
import { QueueBar } from "@/components/QueueBar";
import { RightsGate } from "@/components/RightsGate";
import { ShortcutSheet } from "@/components/ShortcutSheet";
import Dashboard from "@/routes/Dashboard";
import ToolView from "@/routes/ToolView";
import StackBuilder from "@/routes/StackBuilder";
import Settings from "@/routes/Settings";
import { api } from "@/lib/api";
import { connectWs } from "@/lib/ws";
import { useStore } from "@/state/store";
import { TOOLS } from "@/lib/tools";

export default function App() {
  const nav = useNavigate();
  const setDevice = useStore((s) => s.setDevice);
  const setJobs = useStore((s) => s.setJobs);
  const setHelp = useStore((s) => s.setHelpOpen);
  const [firstGate, setFirstGate] = useState(false);

  useEffect(() => {
    const dispose = connectWs();
    api.device().then(setDevice).catch(() => {});
    api.jobs().then(setJobs).catch(() => {});
    api.rightsStatus().then((r) => {
      if (r.required && !r.first_launch_confirmed) setFirstGate(true);
    }).catch(() => {});
    return dispose;
  }, []);

  // global keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA")) return;

      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("cp:render"));
        return;
      }
      if (e.key === "?") {
        setHelp(true);
        return;
      }
      if (e.key === "Escape") {
        setHelp(false);
        return;
      }
      const t = TOOLS.find((x) => x.hotkey === e.key);
      if (t) nav(t.slug === "stack" ? "/stack" : `/t/${t.slug}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nav, setHelp]);

  return (
    <div className="h-full flex overflow-hidden">
      <LeftRail />
      <div className="flex-1 flex flex-col min-w-0">
        <StatusBar />
        <div className="flex-1 flex min-h-0">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/t/:slug" element={<ToolView />} />
            <Route path="/stack" element={<StackBuilder />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
        <QueueBar />
      </div>

      <RightsGate
        open={firstGate}
        context="first_launch"
        onConfirm={async () => {
          await api.confirmRights("first_launch", true);
          setFirstGate(false);
        }}
      />
      <ShortcutSheet />
    </div>
  );
}
