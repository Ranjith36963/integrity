"use client";
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// SIZE TOKENS — use `[font-size:var(--fs-N)]` form (arbitrary CSS) so the
// class category is "font-size" specifically and CANNOT collide with the
// variant's `text-[var(--bg)]` (color) class. tailwind-merge would
// otherwise treat both as the generic `text-[...]` category and drop one,
// which manifested as the chooser's "Add Block" button rendering ink-on-amber
// instead of bg-on-amber — a critical color-contrast failure on a primary CTA.
export const buttonVariants = cva(
  "inline-flex items-center justify-center font-mono uppercase tracking-wide transition-transform active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
  {
    variants: {
      variant: {
        primary: "bg-[var(--accent)] text-[var(--bg)] hover:brightness-110",
        secondary:
          "border border-[var(--ink-dim)] text-[var(--ink)] hover:bg-[var(--bg-elev)]",
        ghost: "text-[var(--ink-dim)] hover:text-[var(--ink)]",
      },
      size: {
        sm: "min-h-[44px] px-3 [font-size:var(--fs-12)] min-w-[44px]",
        md: "h-11 px-4 [font-size:var(--fs-14)] min-w-[44px]",
        lg: "h-12 px-6 [font-size:var(--fs-16)] min-w-[44px]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * NEW-5 (intentional coupling, not a bug):
   *
   * When `loading` is true, the button is disabled (`disabled || loading`)
   * and `aria-busy` is set. This is the standard pattern across MUI/Chakra/
   * shadcn — it prevents double-submit, the #1 cause of duplicate API calls.
   *
   * There is deliberately NO override hatch (`loadingDisablesClick={false}`
   * or similar). If a caller needs "show spinner but still allow click"
   * (e.g., for cancel-while-loading), they should render their own cancel
   * affordance — typically a separate Button — rather than overloading
   * this one. Coupling the two states removes the foot-gun.
   */
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading,
      disabled,
      children,
      "aria-label": ariaLabelProp,
      ...props
    },
    ref,
  ) => {
    // When loading, children are hidden visually — derive the accessible label
    // from the children text so screen readers still announce the button purpose.
    // Falls back to "Loading" for non-string children to avoid a nameless busy
    // button (BT-2).
    const loadingLabel = ariaLabelProp
      ? ariaLabelProp
      : loading
        ? typeof children === "string"
          ? children
          : "Loading"
        : undefined;

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading ? "true" : undefined}
        aria-label={loadingLabel}
        {...props}
      >
        {loading ? (
          <span data-loading="true" className="flex items-center gap-2">
            <svg
              aria-hidden="true"
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" d="M12 2a10 10 0 1 0 10 10" />
            </svg>
          </span>
        ) : (
          children
        )}
      </button>
    );
  },
);
Button.displayName = "Button";
