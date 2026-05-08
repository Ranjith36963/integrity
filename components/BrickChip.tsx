"use client";
// BrickChip — M3 re-authored from [obsolete] to [re-author].
// Built fresh against the locked Brick schema (plan.md § Migration tags).
// [re-author] per plan.md M3 migration table.

import { Play, Square, Check } from "lucide-react";
import { brickPct } from "@/lib/dharma";
import type { Brick, Category } from "@/lib/types";

interface Props {
  brick: Brick;
  categories: Category[];
  size?: "sm" | "md";
}

function resolveColor(brick: Brick, categories: Category[]): string | null {
  if (brick.categoryId === null) return null;
  return categories.find((c) => c.id === brick.categoryId)?.color ?? null;
}

function buildAriaLabel(brick: Brick, pct: number): string {
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

export function BrickChip({ brick, categories, size = "md" }: Props) {
  const pct = brickPct(brick);
  const color = resolveColor(brick, categories);
  const isUncategorized = color === null;

  // Background: category color at 12% alpha, or --surface-2 for uncategorized
  const bgStyle = isUncategorized ? "var(--surface-2)" : `${color}1f`; // 1f ≈ 12% alpha in hex

  // Foreground fill color at 60% alpha
  const fillColor = isUncategorized ? "var(--accent)" : `${color}99`; // 99 ≈ 60% alpha

  const ariaLabel = buildAriaLabel(brick, pct);

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
      {/* Foreground gradient fill — width = brickPct% */}
      <div
        data-testid="brick-fill"
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: `${pct}%`,
          background: fillColor,
          pointerEvents: "none",
          transition: "width 600ms ease-in-out",
        }}
      />

      {/* Chip button — no-op in M3 (M4 wires logging) */}
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => {
          // no-op in M3 — M4 wires brick logging
        }}
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
          cursor: "default",
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
