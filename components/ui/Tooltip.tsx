"use client";

import {
  useId,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
}

/**
 * Tooltip — keyboard accessible (Section 10): shows on hover AND focus, hides on
 * blur/leave/Escape. The trigger references the tip via aria-describedby. This
 * is a lightweight CSS-positioned tooltip suitable for short hints.
 */
export function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <span aria-describedby={open ? id : undefined}>{children}</span>
      <span
        role="tooltip"
        id={id}
        hidden={!open}
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 w-max max-w-[220px] -translate-x-1/2 rounded-md border border-line bg-surface px-2.5 py-1.5 text-2xs text-ink shadow-float",
          side === "top" ? "bottom-full mb-2" : "top-full mt-2",
          className,
        )}
      >
        {content}
      </span>
    </span>
  );
}
