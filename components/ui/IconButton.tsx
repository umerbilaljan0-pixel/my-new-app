import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./Spinner";

/**
 * IconButton — 36×36, radius 8, ghost styling (Section 3.7). An `aria-label` is
 * REQUIRED because there is no text content; the type enforces it.
 */
export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  "aria-label": string;
  icon: ReactNode;
  variant?: "ghost" | "secondary";
  loading?: boolean;
}

const variants = {
  ghost: "text-ink-mid hover:bg-amber-tint hover:text-ink",
  secondary:
    "border border-line text-ink hover:border-line-strong hover:bg-sunken",
} as const;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { icon, variant = "ghost", loading, className, type = "button", disabled, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          "inline-grid h-9 w-9 place-items-center rounded-[8px] transition-colors duration-ui ease-brand",
          "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          className,
        )}
        {...props}
      >
        {loading ? <Spinner size={16} /> : icon}
      </button>
    );
  },
);

IconButton.displayName = "IconButton";
