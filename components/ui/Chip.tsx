"use client";
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { Category } from "./types";

export type ChipTone = "neutral" | `category-${Category}`;

export const chipVariants = cva(
  "inline-flex items-center justify-center rounded-full border font-mono uppercase tracking-wide transition-colors min-h-[44px] min-w-[44px]",
  {
    variants: {
      tone: {
        neutral: "border-[--ink-dim] text-[--ink-dim]",
        "category-health": "border-[--cat-health] text-[--cat-health]",
        "category-mind": "border-[--cat-mind] text-[--cat-mind]",
        "category-career": "border-[--cat-career] text-[--cat-career]",
        "category-passive": "border-[--cat-passive] text-[--cat-passive]",
      },
      selected: {
        true: "",
        false: "bg-transparent",
      },
      size: {
        sm: "px-2 py-0.5 text-[--fs-10]",
        md: "px-3 py-1 text-[--fs-12]",
      },
    },
    compoundVariants: [
      {
        tone: "neutral",
        selected: true,
        className: "bg-[--ink-dim] text-[--bg]",
      },
      {
        tone: "category-health",
        selected: true,
        className: "bg-[--cat-health] text-[--bg]",
      },
      {
        tone: "category-mind",
        selected: true,
        className: "bg-[--cat-mind] text-[--bg]",
      },
      {
        tone: "category-career",
        selected: true,
        className: "bg-[--cat-career] text-[--bg]",
      },
      {
        tone: "category-passive",
        selected: true,
        className: "bg-[--cat-passive] text-[--bg]",
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
