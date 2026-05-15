"use client";
// BrickChip — M4f: collapsed to tick + units (ADR-043).
// M3: static chip rendering for all brick kinds.
// M4a: tick chips dispatch onTickToggle + haptics.light on tap;
//       tick chip gains aria-pressed + enriched aria-label.
//       chip-fill transition becomes "none" under prefers-reduced-motion.
// M4f: goal→units rename; time kind removed entirely (ADR-043).
//       Units chip is a simple button that fires onUnitsOpenSheet(brick.id).
//       No stepper buttons (SG-m4f-02). onGoalLog removed from active logic.

import { useReducedMotion } from "motion/react";
import { Square, Check } from "lucide-react";
import { brickPct } from "@/lib/dharma";
import { haptics } from "@/lib/haptics";
import type { Brick, Category } from "@/lib/types";

interface Props {
  brick: Brick;
  categories: Category[];
  size?: "sm" | "md";
  /** Called with brick.id when a tick brick is tapped (M4a). Not called for units. */
  onTickToggle?: (brickId: string) => void;
  /** M4f: called with brick.id when a units brick chip is tapped (opens UnitsEntrySheet). */
  onUnitsOpenSheet?: (brickId: string) => void;
}

function resolveColor(brick: Brick, categories: Category[]): string | null {
  if (brick.categoryId === null) return null;
  return categories.find((c) => c.id === brick.categoryId)?.color ?? null;
}

function buildAriaLabel(brick: Brick, pct: number): string {
  if (brick.kind === "tick") {
    // M4a: enriched tick label
    const state = brick.done ? "done" : "not done";
    const base = `${brick.name}, ${state}, tap to toggle`;
    if (brick.hasDuration && brick.start && brick.end) {
      return `${base}, scheduled ${brick.start} to ${brick.end}`;
    }
    return base;
  }
  // units — M4f
  const roundedPct = Math.round(pct);
  const unitSuffix = brick.unit ? ` ${brick.unit}` : "";
  return `${brick.name}, units, ${roundedPct}% complete, ${brick.done} of ${brick.target}${unitSuffix}`;
}

// M4e: Time-window badge — shown below the name when hasDuration === true
function TimeWindowBadge({ brick }: { brick: Brick }) {
  if (!brick.hasDuration || !brick.start || !brick.end) return null;
  return (
    <span
      data-testid="brick-time-window"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "var(--fs-10)",
        color: "var(--ink-dim)",
        display: "block",
        whiteSpace: "nowrap",
      }}
    >
      {brick.start}–{brick.end}
    </span>
  );
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
  // units — M4f
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
      {brick.done} / {brick.target}
      {unitSuffix}
    </span>
  );
}

// ─── Main BrickChip ──────────────────────────────────────────────────────────

export function BrickChip({
  brick,
  categories,
  size = "md",
  onTickToggle,
  onUnitsOpenSheet,
}: Props) {
  const pct = brickPct(brick);
  const color = resolveColor(brick, categories);
  const isUncategorized = color === null;
  const prefersReducedMotion = useReducedMotion();

  const bgStyle = isUncategorized ? "var(--surface-2)" : `${color}1f`;
  const fillColor = isUncategorized ? "var(--accent)" : `${color}99`;

  const ariaLabel = buildAriaLabel(brick, pct);

  const fillStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: `${pct}%`,
    background: fillColor,
    pointerEvents: "none",
    transition: prefersReducedMotion ? "none" : "width 600ms ease-in-out",
  };

  // M4f: units chip — simple button that fires onUnitsOpenSheet
  if (brick.kind === "units") {
    function handleUnitsClick() {
      haptics.light();
      onUnitsOpenSheet?.(brick.id);
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
        {/* Foreground gradient fill */}
        <div data-testid="brick-fill" aria-hidden="true" style={fillStyle} />

        {/* Units chip button — taps open UnitsEntrySheet */}
        <button
          type="button"
          aria-label={ariaLabel}
          onClick={handleUnitsClick}
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
            cursor: "pointer",
            fontFamily: "var(--font-ui)",
            fontSize: size === "sm" ? "var(--fs-12)" : "var(--fs-14)",
            color: "var(--ink)",
            textAlign: "left",
          }}
        >
          {/* Title + optional time-window secondary line */}
          <span
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <span
              style={{
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              {brick.name}
            </span>
            <TimeWindowBadge brick={brick} />
          </span>

          {/* Type badge */}
          <TypeBadge brick={brick} />
        </button>
      </div>
    );
  }

  // tick chip — onClick fires haptic + toggle
  function handleClick() {
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
      {/* Foreground gradient fill */}
      <div data-testid="brick-fill" aria-hidden="true" style={fillStyle} />

      {/* Chip button — tick: dispatches toggle + haptic */}
      <button
        type="button"
        aria-label={ariaLabel}
        aria-pressed={brick.done}
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
          cursor: "pointer",
          fontFamily: "var(--font-ui)",
          fontSize: size === "sm" ? "var(--fs-12)" : "var(--fs-14)",
          color: "var(--ink)",
          textAlign: "left",
        }}
      >
        {/* Title + optional time-window secondary line */}
        <span
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <span
            style={{
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
            }}
          >
            {brick.name}
          </span>
          <TimeWindowBadge brick={brick} />
        </span>

        {/* Type badge */}
        <TypeBadge brick={brick} />
      </button>
    </div>
  );
}
