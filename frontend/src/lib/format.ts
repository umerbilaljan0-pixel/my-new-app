// Mono-friendly formatters. Every number the user reads goes through here.

export function bytes(n: number | null | undefined): string {
  if (n == null) return "—";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
}

export function seconds(s: number | null | undefined): string {
  if (s == null) return "—";
  if (s < 1) return "<1s";
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  const rs = Math.round(s % 60);
  if (m < 60) return `${m}m ${rs.toString().padStart(2, "0")}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${(m % 60).toString().padStart(2, "0")}m`;
}

export function timecode(frame: number, fps: number): string {
  if (!fps) return "00:00:00:00";
  const total = Math.floor(frame / fps);
  const f = Math.floor(frame % fps);
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  const p = (x: number) => x.toString().padStart(2, "0");
  return `${p(h)}:${p(m)}:${p(s)}:${p(f)}`;
}

export function pct(x: number | null | undefined): string {
  if (x == null) return "0%";
  return `${Math.round(x * 100)}%`;
}

export function resolution(w: number, h: number): string {
  return `${w}×${h}`;
}
