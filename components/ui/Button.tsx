"use client";
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center font-mono uppercase tracking-wide transition-transform active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--accent]",
  {
    variants: {
      variant: {
        primary: "bg-[--accent] text-[--bg] hover:brightness-110",
        secondary:
          "border border-[--ink-dim] text-[--ink] hover:bg-[--bg-elev]",
        ghost: "text-[--ink-dim] hover:text-[--ink]",
      },
      size: {
        sm: "min-h-[44px] px-3 text-[--fs-12] min-w-[44px]",
        md: "h-11 px-4 text-[--fs-14] min-w-[44px]",
        lg: "h-12 px-6 text-[--fs-16] min-w-[44px]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
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
    const loadingLabel =
      loading && !ariaLabelProp && typeof children === "string"
        ? children
        : ariaLabelProp;

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled ?? loading}
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
