"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info" | "warn";

export interface ToastOptions {
  title: string;
  description?: string;
  type?: ToastType;
  /** Auto-dismiss delay in ms. Defaults to 5000 (Section 10). */
  duration?: number;
}

interface ToastRecord extends Required<Omit<ToastOptions, "description">> {
  id: string;
  description?: string;
}

interface ToastContextValue {
  toast: (opts: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 size={18} className="text-ok" />,
  error: <XCircle size={18} className="text-danger" />,
  info: <Info size={18} className="text-cyan" />,
  warn: <AlertTriangle size={18} className="text-warn" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  // Gate the portal until after mount so the first client render matches the
  // server (both render nothing), avoiding a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => setMounted(true), []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (opts: ToastOptions) => {
      const id = Math.random().toString(36).slice(2);
      const record: ToastRecord = {
        id,
        title: opts.title,
        description: opts.description,
        type: opts.type ?? "info",
        duration: opts.duration ?? 5000,
      };
      setToasts((prev) => [...prev, record]);
      const timer = setTimeout(() => dismiss(id), record.duration);
      timers.current.set(id, timer);
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {mounted &&
        createPortal(
          <div
            className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end"
            aria-live="polite"
            aria-atomic="false"
          >
            {toasts.map((t) => (
              <div
                key={t.id}
                role={t.type === "error" ? "alert" : "status"}
                className={cn(
                  "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-line bg-surface p-3 shadow-float animate-toast-in",
                )}
              >
                <span className="mt-0.5 shrink-0">{ICONS[t.type]}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{t.title}</p>
                  {t.description && (
                    <p className="mt-0.5 text-2xs text-ink-mid">{t.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={() => dismiss(t.id)}
                  className="-m-1 rounded-[8px] p-1 text-ink-low transition-colors hover:text-ink"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
