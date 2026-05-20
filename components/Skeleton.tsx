"use client";
/**
 * components/Skeleton.tsx — M7a: shared skeleton placeholder primitive.
 *
 * Renders a single <div> with the CSS shimmer keyframe class (.skeleton-shimmer,
 * defined in globals.css) and per-variant sizing that matches the real card
 * bounding boxes (plan.md § Components <Skeleton>, § Design tokens).
 *
 * Under prefers-reduced-motion: reduce, the @media rule in globals.css suppresses
 * the animation and collapses the gradient to a flat var(--card) swatch.
 * The JS component never branches on PRM — CSS owns that suppression (AC #7,
 * C-m7a-012: className is reduced-motion-invariant at the JS level).
 *
 * Props:
 *   variant: "block" | "chip" | "segment" — selects the CLS-safe sizing
 *   className?: string — caller-supplied positioning class (e.g. "absolute top-[60px]")
 *   aria-hidden?: boolean — defaults to true (decorative; AT announces nothing)
 */

/** Per-variant inline styles — sized to match real card bounding boxes (AC #6). */
const VARIANT_STYLES: Record<
  "block" | "chip" | "segment",
  React.CSSProperties
> = {
  block: {
    // Matches a collapsed <TimelineBlock> card outer height
    height: "92px",
    borderRadius: "12px",
    padding: "12px",
    border: "1px solid var(--card-edge)",
  },
  chip: {
    // Matches <BrickChip size="sm">
    height: "28px",
    minWidth: "96px",
    borderRadius: "999px",
  },
  segment: {
    // Matches the <BlueprintBar> inner segment row at h-9 = 36px
    height: "36px",
    width: "100%",
    borderRadius: "6px",
  },
};

import React from "react";

interface SkeletonProps {
  variant: "block" | "chip" | "segment";
  className?: string;
  "aria-hidden"?: boolean;
}

export function Skeleton({
  variant,
  className,
  "aria-hidden": ariaHidden = true,
}: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer${className ? ` ${className}` : ""}`}
      data-variant={variant}
      aria-hidden={String(ariaHidden) as "true" | "false"}
      style={VARIANT_STYLES[variant]}
    />
  );
}
