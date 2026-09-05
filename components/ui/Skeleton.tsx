import { cn } from "@/lib/utils";

export interface SkeletonProps {
  className?: string;
}

/**
 * Skeleton — loading placeholder. Reserves layout space to keep CLS < 0.05
 * (Section 15). Uses the shimmer keyframe over a sunken base.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "block overflow-hidden rounded-md bg-sunken",
        "relative before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer",
        "before:bg-gradient-to-r before:from-transparent before:via-line before:to-transparent",
        className,
      )}
    />
  );
}
