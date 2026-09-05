import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToolCardProps {
  icon: LucideIcon;
  name: string;
  href: string;
  description: string;
  className?: string;
}

/**
 * ToolCard — one of the three tools on the home grid. Hairline border is the
 * separator; the icon sits in an amber-tint square.
 */
export function ToolCard({
  icon: Icon,
  name,
  href,
  description,
  className,
}: ToolCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col gap-4 rounded-lg border border-line bg-surface p-6 transition-colors duration-ui ease-brand hover:border-line-strong hover:shadow-hairline",
        className,
      )}
    >
      <span className="grid h-11 w-11 place-items-center rounded-md bg-amber-tint text-amber-press">
        <Icon size={22} aria-hidden />
      </span>
      <div className="flex flex-col gap-1.5">
        <h3 className="font-display text-lg font-semibold text-ink">{name}</h3>
        <p className="text-sm text-ink-mid">{description}</p>
      </div>
      <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-amber-press">
        Open tool
        <ArrowRight
          size={14}
          className="transition-transform duration-ui ease-brand group-hover:translate-x-0.5"
        />
      </span>
    </Link>
  );
}
