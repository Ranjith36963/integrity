"use client";
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { Category } from "./types";

export type ChipTone = "neutral" | `category-${Category}`;

export const chipVariants = cva(
  "inline-flex items-center justify-center rounded-full border font-mono uppercase tracking-[0.08em] transition-colors min-h-[44px] min-w-[44px]",
  {
    variants: {
      tone: {
        neutral: "border-[var(--ink-dim)] text-[var(--ink-dim)]",
        "category-health":
          "border-[var(--cat-health)] text-[var(--cat-health)]",
        "category-mind": "border-[var(--cat-mind)] text-[var(--cat-mind)]",
        "category-career":
          "border-[var(--cat-career)] text-[var(--cat-career)]",
        "category-passive":
          "border-[var(--cat-passive)] text-[var(--cat-passive)]",
      },
      selected: {
        true: "",
        false: "bg-transparent",
      },
      size: {
        sm: "px-2 py-0.5 [font-size:var(--fs-10)]",
        md: "px-3 py-1 [font-size:var(--fs-12)]",
      },
    },
    compoundVariants: [
      {
        tone: "neutral",
        selected: true,
        className: "bg-[var(--ink-dim)] text-[var(--bg)]",
      },
      {
        tone: "category-health",
        selected: true,
        className: "bg-[var(--cat-health)] text-[var(--bg)]",
      },
      {
        tone: "category-mind",
        selected: true,
        className: "bg-[var(--cat-mind)] text-[var(--bg)]",
      },
      {
        tone: "category-career",
        selected: true,
        className: "bg-[var(--cat-career)] text-[var(--bg)]",
      },
      {
        tone: "category-passive",
        selected: true,
        className: "bg-[var(--cat-passive)] text-[var(--bg)]",
      },
    ],
    defaultVariants: { tone: "neutral", selected: false, size: "md" },
  },
);

export interface ChipProps
  extends
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">,
    VariantProps<typeof chipVariants> {
  selected?: boolean;
  tone?: ChipTone;
  size?: "sm" | "md";
  children?: React.ReactNode;
}

export function Chip({
  selected = false,
  tone = "neutral",
  size = "md",
  onClick,
  disabled,
  children,
  className,
  ...props
}: ChipProps) {
  const chip = (
    <button
      type="button"
      className={cn(chipVariants({ tone, selected, size }), className)}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );

  // sm chips need a padded hit-area wrapper to meet the 44×44px minimum
  if (size === "sm") {
    return (
      <span className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center">
        {chip}
      </span>
    );
  }

  return chip;
}
