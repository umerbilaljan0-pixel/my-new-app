// Single WebSocket to the engine. Fans progress + status into the store.
import { useStore } from "@/state/store";

export function connectWs(): () => void {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const url = `${proto}://${location.host}/ws`;
  let ws: WebSocket | null = null;
  let closed = false;
  let retry = 0;

  const open = () => {
    ws = new WebSocket(url);
    ws.onopen = () => {
      retry = 0;
      useStore.getState().setWs(true);
    };
    ws.onclose = () => {
      useStore.getState().setWs(false);
      if (!closed) setTimeout(open, Math.min(5000, 500 * 2 ** retry++));
    };
    ws.onerror = () => ws?.close();
    ws.onmessage = (ev) => {
      let msg: any;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      const s = useStore.getState();
      switch (msg.type) {
        case "hello":
          if (msg.device) s.setDevice(msg.device);
          break;
        case "status":
          if (msg.device) s.setStatus(msg.device, msg.vram_used_mb ?? null, msg.active_jobs ?? 0);
          break;
        case "job":
          if (msg.job) s.upsertJob(msg.job);
          break;
        case "progress":
          s.patchJob(msg.job_id, {
            progress: msg.progress,
            stage: msg.stage ?? undefined,
            message: msg.message ?? undefined,
            eta_seconds: msg.eta_seconds ?? undefined,
            stage_index: msg.stage_index ?? undefined,
            status: "running",
          });
          break;
      }
    };
  };
  open();

  // keepalive
  const ping = setInterval(() => ws?.readyState === 1 && ws.send("ping"), 20000);

  return () => {
    closed = true;
    clearInterval(ping);
    ws?.close();
  };
}
