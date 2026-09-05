"use client";

import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  value: string;
  label: ReactNode;
  content: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  defaultValue?: string;
  className?: string;
}

/**
 * Tabs — WAI-ARIA tabs with roving arrow-key navigation (Home/End supported).
 * Active tab underlined in amber; inactive tabs use --ink-mid.
 */
export function Tabs({ items, defaultValue, className }: TabsProps) {
  const [active, setActive] = useState(defaultValue ?? items[0]?.value ?? "");
  const baseId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % items.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else return;
    e.preventDefault();
    const target = items[next];
    if (target) {
      setActive(target.value);
      tabRefs.current[next]?.focus();
    }
  };

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="flex gap-1 border-b border-line"
      >
        {items.map((item, i) => {
          const selected = item.value === active;
          return (
            <button
              key={item.value}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              type="button"
              id={`${baseId}-tab-${item.value}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.value}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(item.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-xs font-semibold transition-colors duration-ui ease-brand",
                selected
                  ? "border-amber text-ink"
                  : "border-transparent text-ink-mid hover:text-ink",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => (
        <div
          key={item.value}
          role="tabpanel"
          id={`${baseId}-panel-${item.value}`}
          aria-labelledby={`${baseId}-tab-${item.value}`}
          hidden={item.value !== active}
          className="pt-4"
        >
          {item.value === active && item.content}
        </div>
      ))}
    </div>
  );
}
