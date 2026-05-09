"use client";
// BrickChip — M4b extended from M4a.
// M3: static chip rendering for all brick kinds.
// M4a: tick chips dispatch onTickToggle + haptics.light on tap;
//       goal/time chips remain no-op with cursor:default.
//       tick chip gains aria-pressed + enriched aria-label.
//       chip-fill transition becomes "none" under prefers-reduced-motion.
// M4b: goal chips get − / + stepper buttons inside <div role="group">.
//       onGoalLog prop added. Long-press auto-repeat via useLongPressRepeat.
//       Clamp haptic (medium) fires before dispatch when at boundary.
//       Scale-press visual feedback (0.95 → 1.0, ~80ms) per auto-repeat tick.
//       Tick + time variants unchanged from M4a.

import { useState, useCallback } from "react";
import { Play, Square, Check, Minus, Plus } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { brickPct } from "@/lib/dharma";
import { haptics } from "@/lib/haptics";
import { useLongPressRepeat } from "@/lib/longPress";
import type { Brick, Category } from "@/lib/types";

interface Props {
  brick: Brick;
  categories: Category[];
  size?: "sm" | "md";
  /** Called with brick.id when a tick brick is tapped (M4a). Not called for goal/time. */
  onTickToggle?: (brickId: string) => void;
  /** Called with (brickId, delta) when a goal brick stepper is used (M4b). */
  onGoalLog?: (brickId: string, delta: 1 | -1) => void;
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

// ─── Goal stepper chip (M4b) ─────────────────────────────────────────────────

interface GoalStepperProps {
  brick: Extract<Brick, { kind: "goal" }>;
  categories: Category[];
  size: "sm" | "md";
  onGoalLog?: (brickId: string, delta: 1 | -1) => void;
  fillStyle: React.CSSProperties;
  bgStyle: string;
  ariaLabel: string;
}

function GoalStepperChip({
  brick,
  size,
  onGoalLog,
  fillStyle,
  bgStyle,
  ariaLabel,
}: GoalStepperProps) {
  const prefersReducedMotion = useReducedMotion();
  // Scale-press visual feedback state: which button is being pressed
  const [pressingMinus, setPressingMinus] = useState(false);
  const [pressingPlus, setPressingPlus] = useState(false);

  const isAtFloor = brick.count === 0;
  const isAtCeil = brick.count === brick.target;

  /** Fire haptic + dispatch (or clamp haptic if at boundary) for a given delta. */
  const fireTick = useCallback(
    (delta: 1 | -1) => {
      const atBoundary = delta === 1 ? isAtCeil : isAtFloor;
      if (atBoundary) {
        haptics.medium();
        return;
      }
      haptics.light();
      onGoalLog?.(brick.id, delta);
    },
    [brick.id, onGoalLog, isAtFloor, isAtCeil],
  );

  const fireTickPlus = useCallback(() => {
    // Scale-press visual feedback
    if (!prefersReducedMotion) {
      setPressingPlus(true);
      setTimeout(() => setPressingPlus(false), 80);
    }
    fireTick(1);
  }, [fireTick, prefersReducedMotion]);

  const fireTickMinus = useCallback(() => {
    if (!prefersReducedMotion) {
      setPressingMinus(true);
      setTimeout(() => setPressingMinus(false), 80);
    }
    fireTick(-1);
  }, [fireTick, prefersReducedMotion]);

  const minusHandlers = useLongPressRepeat({
    onTick: fireTickMinus,
    enabled: !isAtFloor,
  });

  const plusHandlers = useLongPressRepeat({
    onTick: fireTickPlus,
    enabled: !isAtCeil,
  });

  // Keyboard click handler: one tick per press, no auto-repeat from keyboard.
  // onClick fires for Enter/Space keyboard activations. Pointer clicks are handled
  // by onPointerDown (which calls e.preventDefault() to suppress the click event).
  function handleMinusClick(e: React.MouseEvent) {
    // Only handle if triggered by keyboard (detail === 0 means keyboard activation)
    if (e.detail === 0) {
      fireTick(-1);
    }
  }

  function handlePlusClick(e: React.MouseEvent) {
    if (e.detail === 0) {
      fireTick(1);
    }
  }

  const buttonBase: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "44px",
    minHeight: "44px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    flexShrink: 0,
    color: "var(--ink)",
    padding: "0",
    position: "relative",
    zIndex: 1,
  };

  const disabledStyle: React.CSSProperties = {
    opacity: 0.4,
    cursor: "not-allowed",
  };

  return (
    <div
      data-component="brick-chip"
      role="group"
      aria-label={ariaLabel}
      style={{
        position: "relative",
        borderRadius: "12px",
        overflow: "hidden",
        background: bgStyle,
        display: "inline-flex",
        alignItems: "center",
        width: "100%",
        minHeight: "44px",
      }}
    >
      {/* Foreground gradient fill */}
      <div data-testid="brick-fill" aria-hidden="true" style={fillStyle} />

      {/* Minus button */}
      <button
        type="button"
        aria-label={`Decrease ${brick.name}`}
        disabled={isAtFloor}
        onClick={handleMinusClick}
        {...minusHandlers}
        style={{
          ...buttonBase,
          ...(isAtFloor ? disabledStyle : {}),
          transform:
            pressingMinus && !prefersReducedMotion ? "scale(0.95)" : "scale(1)",
          transition: !prefersReducedMotion
            ? "transform 80ms ease-out"
            : "none",
        }}
      >
        <Minus size={14} aria-hidden="true" />
      </button>

      {/* Title + badge — center flex item */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flex: 1,
          minWidth: 0,
          padding: size === "sm" ? "8px 4px" : "10px 4px",
          gap: "4px",
          position: "relative",
          zIndex: 1,
          fontFamily: "var(--font-ui)",
          fontSize: size === "sm" ? "var(--fs-12)" : "var(--fs-14)",
          color: "var(--ink)",
        }}
      >
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
        <TypeBadge brick={brick} />
      </div>

      {/* Plus button */}
      <button
        type="button"
        aria-label={`Increase ${brick.name}`}
        disabled={isAtCeil}
        onClick={handlePlusClick}
        {...plusHandlers}
        style={{
          ...buttonBase,
          ...(isAtCeil ? disabledStyle : {}),
          transform:
            pressingPlus && !prefersReducedMotion ? "scale(0.95)" : "scale(1)",
          transition: !prefersReducedMotion
            ? "transform 80ms ease-out"
            : "none",
        }}
      >
        <Plus size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

// ─── Main BrickChip ──────────────────────────────────────────────────────────

export function BrickChip({
  brick,
  categories,
  size = "md",
  onTickToggle,
  onGoalLog,
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

  const fillStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: `${pct}%`,
    background: fillColor,
    pointerEvents: "none",
    transition: prefersReducedMotion ? "none" : "width 600ms ease-in-out",
  };

  // M4b: goal chips get their own GoalStepperChip component
  if (brick.kind === "goal") {
    return (
      <GoalStepperChip
        brick={brick}
        categories={categories}
        size={size}
        onGoalLog={onGoalLog}
        fillStyle={fillStyle}
        bgStyle={bgStyle}
        ariaLabel={ariaLabel}
      />
    );
  }

  // M4a: branch onClick and cursor by brick.kind
  const isTick = brick.kind === "tick";

  function handleClick() {
    if (!isTick) return; // time chips are no-op
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
      <div data-testid="brick-fill" aria-hidden="true" style={fillStyle} />

      {/* Chip button — tick: dispatches toggle + haptic; time: no-op */}
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
