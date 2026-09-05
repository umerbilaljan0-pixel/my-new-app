import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./Spinner";

/**
 * Button — the primary action control.
 *
 * Implements every state required by Section 3.6: default, hover, active,
 * focus-visible (amber ring via global :focus-visible), disabled, and loading.
 * In the loading state the label is swapped for a spinner and the button width
 * does NOT change (the label is kept in the layout at opacity 0).
 *
 * Variants (Section 3.7): primary | secondary | ghost | danger.
 * `IconButton` (separate file) covers the icon-only variant.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Icon rendered before the label. */
  leadingIcon?: ReactNode;
  /** Icon rendered after the label. */
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
}

const base =
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-sans font-semibold " +
  "transition-[background-color,border-color,color,transform] duration-ui ease-brand " +
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none";

const sizes: Record<ButtonSize, string> = {
  // In-app default height 40; marketing default 44. We expose both via size.
  sm: "h-10 px-5 text-xs", // 40px, 14px label (in-app)
  md: "h-11 px-5 text-sm", // 44px, 16px label (marketing)
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-amber text-white hover:bg-amber-press",
  secondary:
    "bg-surface text-ink border border-line hover:border-line-strong hover:bg-sunken",
  ghost: "bg-transparent text-ink-mid hover:bg-amber-tint hover:text-ink",
  danger:
    "bg-danger-tint text-danger border border-danger/30 hover:border-danger/60",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      leadingIcon,
      trailingIcon,
      fullWidth,
      className,
      children,
      disabled,
      type = "button",
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          base,
          sizes[size],
          variants[variant],
          fullWidth && "w-full",
          className,
        )}
        {...props}
      >
        {loading && (
          <span className="absolute inset-0 grid place-items-center">
            <Spinner size={size === "sm" ? 16 : 18} label="Loading" />
          </span>
        )}
        <span
          className={cn(
            "inline-flex items-center gap-2",
            loading && "opacity-0",
          )}
        >
          {leadingIcon}
          {children}
          {trailingIcon}
        </span>
      </button>
    );
  },
);

Button.displayName = "Button";
