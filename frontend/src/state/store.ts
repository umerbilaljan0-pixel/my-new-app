import { create } from "zustand";
import type { DeviceInfo, Job, UploadMeta } from "@/lib/api";

type Theme = "dark" | "light";

interface State {
  device: DeviceInfo | null;
  vramUsed: number | null;
  activeJobs: number;
  jobs: Record<string, Job>;
  upload: UploadMeta | null;
  originalUrl: string | null; // object URL of the loaded original
  theme: Theme;
  wsConnected: boolean;
  queueOpen: boolean;
  helpOpen: boolean;

  setQueueOpen: (b: boolean) => void;
  setHelpOpen: (b: boolean) => void;
  setDevice: (d: DeviceInfo) => void;
  setStatus: (d: DeviceInfo, vram: number | null, active: number) => void;
  upsertJob: (j: Job) => void;
  patchJob: (id: string, patch: Partial<Job>) => void;
  setJobs: (list: Job[]) => void;
  setUpload: (u: UploadMeta | null, url: string | null) => void;
  toggleTheme: () => void;
  setWs: (b: boolean) => void;
}

function initialTheme(): Theme {
  const saved = (typeof localStorage !== "undefined" && localStorage.getItem("cp-theme")) as Theme | null;
  const t = saved ?? "dark";
  if (typeof document !== "undefined") document.documentElement.setAttribute("data-theme", t);
  return t;
}

export const useStore = create<State>((set, get) => ({
  device: null,
  vramUsed: null,
  activeJobs: 0,
  jobs: {},
  upload: null,
  originalUrl: null,
  theme: initialTheme(),
  wsConnected: false,
  queueOpen: true,
  helpOpen: false,

  setQueueOpen: (b) => set({ queueOpen: b }),
  setHelpOpen: (b) => set({ helpOpen: b }),
  setDevice: (d) => set({ device: d }),
  setStatus: (d, vram, active) => set({ device: d, vramUsed: vram, activeJobs: active }),
  upsertJob: (jb) => set((s) => ({ jobs: { ...s.jobs, [jb.id]: jb } })),
  patchJob: (id, patch) =>
    set((s) => (s.jobs[id] ? { jobs: { ...s.jobs, [id]: { ...s.jobs[id], ...patch } } } : {})),
  setJobs: (list) => set({ jobs: Object.fromEntries(list.map((j) => [j.id, j])) }),
  setUpload: (u, url) => {
    const prev = get().originalUrl;
    if (prev && prev !== url) URL.revokeObjectURL(prev);
    set({ upload: u, originalUrl: url });
  },
  toggleTheme: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("cp-theme", next);
    set({ theme: next });
  },
  setWs: (b) => set({ wsConnected: b }),
}));

export function jobList(jobs: Record<string, Job>): Job[] {
  return Object.values(jobs).sort((a, b) => b.created_at - a.created_at);
}
