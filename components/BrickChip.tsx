"use client";
// BrickChip — M4a extended from M3.
// M3: static chip rendering for all brick kinds.
// M4a: tick chips dispatch onTickToggle + haptics.light on tap;
//       goal/time chips remain no-op with cursor:default.
//       tick chip gains aria-pressed + enriched aria-label.
//       chip-fill transition becomes "none" under prefers-reduced-motion.

import { Play, Square, Check } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { brickPct } from "@/lib/dharma";
import { haptics } from "@/lib/haptics";
import type { Brick, Category } from "@/lib/types";

interface Props {
  brick: Brick;
  categories: Category[];
  size?: "sm" | "md";
  /** Called with brick.id when a tick brick is tapped (M4a). Not called for goal/time. */
  onTickToggle?: (brickId: string) => void;
}

function resolveColor(brick: Brick, categories: Category[]): string | null {
  if (brick.categoryId === null) return null;
  return categories.find((c) => c.id === brick.categoryId)?.color ?? null;
}

function buildAriaLabel(brick: Brick, pct: number): string {
  if (brick.kind === "tick") {
    // M4a: enriched tick label — replaces M3's generic "brick A, tick, 0% complete"
    const state = brick.done ? "done" : "not done";
    return `${brick.name}, ${state}, tap to toggle`;
  }
  const roundedPct = Math.round(pct);
  const base = `${brick.name}, ${brick.kind}, ${roundedPct}% complete`;
  if (brick.kind === "goal") {
    const unitSuffix = brick.unit ? ` ${brick.unit}` : "";
    return `${base}, ${brick.count} of ${brick.target}${unitSuffix}`;
  }
  if (brick.kind === "time") {
    return `${base}, ${brick.minutesDone} of ${brick.durationMin} minutes`;
  }
  return base;
}

function TypeBadge({ brick }: { brick: Brick }) {
  if (brick.kind === "tick") {
    return brick.done ? (
      <Check
        size={14}
        aria-hidden="true"
        style={{ color: "var(--accent)", flexShrink: 0 }}
      />
    ) : (
      <Square
        size={14}
        aria-hidden="true"
        style={{ color: "var(--ink-dim)", flexShrink: 0 }}
      />
    );
  }
  if (brick.kind === "goal") {
    const unitSuffix = brick.unit ? ` ${brick.unit}` : "";
    return (
      <span
        aria-hidden="true"
        style={{
          fontSize: "var(--fs-10)",
          color: "var(--ink-dim)",
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        {brick.count} / {brick.target}
        {unitSuffix}
      </span>
    );
  }
  // time
  return (
    <span
      aria-hidden="true"
      style={{
        fontSize: "var(--fs-10)",
        color: "var(--ink-dim)",
        flexShrink: 0,
        whiteSpace: "nowrap",
        display: "flex",
        alignItems: "center",
        gap: "2px",
      }}
    >
      {brick.minutesDone} / {brick.durationMin} m
      <Play
        size={10}
        aria-hidden="true"
        style={{ opacity: 0.4, flexShrink: 0 }}
      />
    </span>
  );
}

export function BrickChip({
  brick,
  categories,
  size = "md",
  onTickToggle,
}: Props) {
  const pct = brickPct(brick);
  const color = resolveColor(brick, categories);
  const isUncategorized = color === null;
  const prefersReducedMotion = useReducedMotion();

  // Background: category color at 12% alpha, or --surface-2 for uncategorized
  const bgStyle = isUncategorized ? "var(--surface-2)" : `${color}1f`; // 1f ≈ 12% alpha in hex

  // Foreground fill color at 60% alpha
  const fillColor = isUncategorized ? "var(--accent)" : `${color}99`; // 99 ≈ 60% alpha

  const ariaLabel = buildAriaLabel(brick, pct);

  // M4a: branch onClick and cursor by brick.kind
  const isTick = brick.kind === "tick";

  function handleClick() {
    if (!isTick) return; // goal/time chips are no-op
    haptics.light();
    onTickToggle?.(brick.id);
  }

  return (
    <div
      data-component="brick-chip"
      data-uncategorized={isUncategorized ? "true" : undefined}
      style={{
        position: "relative",
        borderRadius: "12px",
        overflow: "hidden",
        background: bgStyle,
        display: "inline-flex",
        width: "100%",
      }}
    >
      {/* Foreground gradient fill — width = brickPct%; transition respects reduced-motion */}
      <div
        data-testid="brick-fill"
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: `${pct}%`,
          background: fillColor,
          pointerEvents: "none",
          transition: prefersReducedMotion ? "none" : "width 600ms ease-in-out",
        }}
      />

      {/* Chip button — tick: dispatches toggle + haptic; goal/time: no-op */}
      <button
        type="button"
        aria-label={ariaLabel}
        aria-pressed={isTick ? brick.done : undefined}
        onClick={handleClick}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          minHeight: "44px",
          padding: size === "sm" ? "8px 10px" : "10px 12px",
          gap: "8px",
          background: "transparent",
          border: "none",
          cursor: isTick ? "pointer" : "default",
          fontFamily: "var(--font-ui)",
          fontSize: size === "sm" ? "var(--fs-12)" : "var(--fs-14)",
          color: "var(--ink)",
          textAlign: "left",
        }}
      >
        {/* Title */}
        <span
          style={{
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            flex: 1,
            minWidth: 0,
          }}
        >
          {brick.name}
        </span>

        {/* Type badge */}
        <TypeBadge brick={brick} />
      </button>
    </div>
  );
}
