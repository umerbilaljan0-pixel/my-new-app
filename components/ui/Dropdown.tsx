"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export interface DropdownItem {
  label: ReactNode;
  onSelect?: () => void;
  href?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: "start" | "end";
  className?: string;
  menuClassName?: string;
}

/**
 * Dropdown — click-triggered menu. Closes on outside click and Escape; the menu
 * uses the float shadow. Items can be links or actions.
 */
export function Dropdown({
  trigger,
  items,
  align = "start",
  className,
  menuClassName,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative inline-flex", className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex"
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-full z-50 mt-2 min-w-[180px] rounded-lg border border-line bg-surface p-1 shadow-float animate-fade-rise",
            align === "end" ? "right-0" : "left-0",
            menuClassName,
          )}
        >
          {items.map((item, i) => {
            const cls = cn(
              "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-ink-mid transition-colors duration-ui ease-brand",
              "hover:bg-amber-tint hover:text-ink",
              item.disabled && "pointer-events-none opacity-50",
            );
            if (item.href) {
              return (
                <a key={i} role="menuitem" href={item.href} className={cls} onClick={() => setOpen(false)}>
                  {item.icon}
                  {item.label}
                </a>
              );
            }
            return (
              <button
                key={i}
                role="menuitem"
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  item.onSelect?.();
                  setOpen(false);
                }}
                className={cls}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
