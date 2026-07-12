"use client";
// BrickChip — M6: drag handle affordance added.
// M5 features preserved: × delete button, edit mode tap suppression (SG-m5-05).
// M6: GripVertical drag handle (≥44px, ADR-031) when dragHandle=true in Edit Mode.
//     New props: dragHandle (boolean, default false) + dragControls (DragControls).
//     dragHandle=false (the default) keeps tray chips handle-free (SG-m6-04).

import { useState, useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import type { DragControls } from "motion/react";
import { Square, Check, X, GripVertical, Play, Pause } from "lucide-react";
import { brickPct } from "@/lib/dharma";
import { haptics } from "@/lib/haptics";
import type { Brick, Category } from "@/lib/types";
import { useEditMode } from "./EditModeProvider";

/** mm:ss from a whole-second count (used by the timer chip). */
function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

/**
 * TimerControls — owns the live running state for a timer brick.
 * Running/paused is UI-local (never persisted): on Pause (or unmount while
 * running) it commits the accumulated seconds via onCommit, which dispatches
 * SET_TIMER_ELAPSED. This keeps scored state (brick.elapsedSec) pure and
 * free of any wall-clock timestamp that could go stale across reloads.
 */
function TimerControls({
  brick,
  onCommit,
  disabled,
}: {
  brick: Extract<Brick, { kind: "timer" }>;
  onCommit: (elapsedSec: number) => void;
  disabled: boolean;
}) {
  const [running, setRunning] = useState(false);
  const [liveExtraSec, setLiveExtraSec] = useState(0);
  const startMsRef = useRef(0);

  // Tick every second while running.
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setLiveExtraSec(Math.floor((Date.now() - startMsRef.current) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  // Commit-on-unmount-if-running so collapsing a block mid-run doesn't lose time.
  // commitRef is updated in an effect (never during render) so it always closes
  // over the latest values; the mount-only effect calls it on unmount.
  const commitRef = useRef<() => void>(() => {});
  useEffect(() => {
    commitRef.current = () => {
      if (running) onCommit(brick.elapsedSec + liveExtraSec);
    };
  });
  useEffect(() => () => commitRef.current(), []);

  const goalSec = brick.targetMin * 60;
  const totalSec = brick.elapsedSec + (running ? liveExtraSec : 0);
  const reached = totalSec >= goalSec;

  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (disabled) return;
    if (!running) {
      haptics.light();
      startMsRef.current = Date.now();
      setLiveExtraSec(0);
      setRunning(true);
    } else {
      haptics.light();
      setRunning(false);
      onCommit(brick.elapsedSec + liveExtraSec);
      setLiveExtraSec(0);
    }
  }

  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flexShrink: 0,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          fontFamily: "var(--font-mono, var(--font-ui))",
          fontSize: "var(--fs-12)",
          color: reached ? "var(--accent)" : "var(--ink-dim)",
          whiteSpace: "nowrap",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {fmtClock(totalSec)} / {brick.targetMin}:00
      </span>
      <button
        type="button"
        aria-label={running ? `Pause ${brick.name}` : `Start ${brick.name}`}
        aria-pressed={running}
        onClick={toggle}
        disabled={disabled}
        style={{
          display: "grid",
          placeItems: "center",
          width: "32px",
          height: "32px",
          borderRadius: "8px",
          border: running
            ? "1px solid rgba(251,191,36,0.5)"
            : "1px solid var(--card-edge)",
          background: running
            ? "linear-gradient(180deg, rgba(251,191,36,0.2), rgba(251,191,36,0.08))"
            : "transparent",
          color: running ? "var(--accent)" : "var(--ink)",
          cursor: disabled ? "default" : "pointer",
          flexShrink: 0,
        }}
      >
        {running ? <Pause size={14} /> : <Play size={14} />}
      </button>
    </span>
  );
}

interface Props {
  brick: Brick;
  categories: Category[];
  size?: "sm" | "md";
  /** Called with brick.id when a tick brick is tapped (M4a). Not called for units. */
  onTickToggle?: (brickId: string) => void;
  /** M4f: called with brick.id when a units brick chip is tapped (opens UnitsEntrySheet). */
  onUnitsOpenSheet?: (brickId: string) => void;
  /** M5: called with brick.id when the × delete button is tapped. */
  onRequestDeleteBrick?: (brickId: string) => void;
  /** M6: when true and editMode=true, renders GripVertical handle at leading edge (SG-m6-04). */
  dragHandle?: boolean;
  /** M6: DragControls instance from BlockBrickReorderGroup — used by the handle. */
  dragControls?: DragControls;
  /** Log mode: when true AND brick is incomplete, renders a neon green highlight border. */
  logHighlight?: boolean;
  /** timer: called with (brickId, elapsedSec) when a running timer is paused/committed. */
  onTimerCommit?: (brickId: string, elapsedSec: number) => void;
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
  if (brick.kind === "timer") {
    const roundedPct = Math.round(pct);
    const doneMin = Math.floor(brick.elapsedSec / 60);
    const base = `${brick.name}, timer, ${roundedPct}% complete, ${doneMin} of ${brick.targetMin} minutes`;
    if (brick.hasDuration && brick.start && brick.end) {
      return `${base}, scheduled ${brick.start} to ${brick.end}`;
    }
    return base;
  }
  // units — M4f
  const roundedPct = Math.round(pct);
  const unitSuffix = brick.unit ? ` ${brick.unit}` : "";
  const base = `${brick.name}, units, ${roundedPct}% complete, ${brick.done} of ${brick.target}${unitSuffix}`;
  // R7-ROOT-M3-P1-1: include scheduled HH:MM-to-HH:MM for hasDuration units
  // bricks (mirrors the tick branch above). Pre-R7 only tick chips announced
  // their time window — SR users of units bricks lost the temporal context.
  if (brick.hasDuration && brick.start && brick.end) {
    return `${base}, scheduled ${brick.start} to ${brick.end}`;
  }
  return base;
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
  // timer renders its own controls (TimerControls) instead of a static badge.
  if (brick.kind === "timer") return null;
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

function isBrickIncomplete(brick: Brick): boolean {
  if (brick.kind === "tick") return !brick.done;
  if (brick.kind === "units") return brick.done < brick.target;
  if (brick.kind === "timer") return brick.elapsedSec < brick.targetMin * 60;
  return false;
}

export function BrickChip({
  brick,
  categories,
  size = "md",
  onTickToggle,
  onUnitsOpenSheet,
  onRequestDeleteBrick,
  dragHandle = false,
  dragControls,
  logHighlight = false,
  onTimerCommit,
}: Props) {
  const pct = brickPct(brick);
  const color = resolveColor(brick, categories);
  const isUncategorized = color === null;
  const prefersReducedMotion = useReducedMotion();
  const { editMode } = useEditMode();

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

  // M5: delete handler — fires onRequestDeleteBrick, stops propagation
  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation();
    onRequestDeleteBrick?.(brick.id);
  }

  // M5: always-visible × button — renders only in edit mode (ADR-008)
  const deleteButton = editMode ? (
    <button
      type="button"
      aria-label={`Delete brick ${brick.name}`}
      onClick={handleDeleteClick}
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        display: "grid",
        placeItems: "center",
        width: "44px",
        minHeight: "44px",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        zIndex: 4,
      }}
    >
      <X size={12} color="var(--ink-dim)" />
    </button>
  ) : null;

  // M6: GripVertical drag handle — only when dragHandle=true AND editMode=true (ADR-008, ADR-031 ≥44px)
  const dragHandleButton =
    dragHandle && editMode && dragControls ? (
      <button
        type="button"
        aria-label={`Reorder brick ${brick.name}`}
        data-drag-handle
        onPointerDown={(e) => {
          e.stopPropagation();
          dragControls.start(e);
        }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          display: "grid",
          placeItems: "center",
          width: "44px",
          minHeight: "44px",
          background: "transparent",
          border: "none",
          cursor: "grab",
          zIndex: 4,
        }}
      >
        <GripVertical size={12} color="var(--ink-dim)" aria-hidden="true" />
      </button>
    ) : null;

  // timer chip — title + live TimerControls (start/pause). No tap-to-open sheet;
  // interaction is the play/pause button only. Inert in edit mode.
  if (brick.kind === "timer") {
    const showLogRingTimer = logHighlight && isBrickIncomplete(brick);
    const timerBrick = brick;
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
          outline: showLogRingTimer ? "1.5px solid #4ade80" : undefined,
          outlineOffset: "1px",
          boxShadow: showLogRingTimer
            ? "0 0 8px 1px rgba(74,222,128,0.35)"
            : undefined,
        }}
      >
        <div data-testid="brick-fill" aria-hidden="true" style={fillStyle} />
        <div
          data-testid="brick-chip-body"
          aria-label={ariaLabel}
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            minHeight: "44px",
            padding: size === "sm" ? "8px 10px" : "10px 12px",
            gap: "8px",
            fontFamily: "var(--font-ui)",
            fontSize: size === "sm" ? "var(--fs-12)" : "var(--fs-14)",
            color: "var(--ink)",
            textAlign: "left",
          }}
        >
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

          <TimerControls
            brick={timerBrick}
            disabled={editMode}
            onCommit={(elapsedSec) =>
              onTimerCommit?.(timerBrick.id, elapsedSec)
            }
          />
        </div>

        {deleteButton}
        {dragHandleButton}
      </div>
    );
  }

  // M4f: units chip — simple button that fires onUnitsOpenSheet
  if (brick.kind === "units") {
    function handleUnitsClick() {
      haptics.light();
      onUnitsOpenSheet?.(brick.id);
    }

    // Shared chip body content
    const unitsChipContent = (
      <>
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
      </>
    );

    const chipBodyStyle: React.CSSProperties = {
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
      fontFamily: "var(--font-ui)",
      fontSize: size === "sm" ? "var(--fs-12)" : "var(--fs-14)",
      color: "var(--ink)",
      textAlign: "left",
    };

    const showLogRing = logHighlight && isBrickIncomplete(brick);
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
          outline: showLogRing ? "1.5px solid #4ade80" : undefined,
          outlineOffset: "1px",
          boxShadow: showLogRing
            ? "0 0 8px 1px rgba(74,222,128,0.35)"
            : undefined,
        }}
      >
        {/* Foreground gradient fill */}
        <div data-testid="brick-fill" aria-hidden="true" style={fillStyle} />

        {/* M5: in edit mode render as inert div (no button role); in normal mode render as button */}
        {editMode ? (
          <div
            data-testid="brick-chip-body"
            style={{ ...chipBodyStyle, cursor: "default" }}
          >
            {unitsChipContent}
          </div>
        ) : (
          <button
            type="button"
            aria-label={ariaLabel}
            onClick={handleUnitsClick}
            style={{ ...chipBodyStyle, cursor: "pointer" }}
          >
            {unitsChipContent}
          </button>
        )}

        {/* M5: × delete button */}
        {deleteButton}

        {/* M6: GripVertical drag handle */}
        {dragHandleButton}
      </div>
    );
  }

  // tick chip — onClick fires haptic + toggle (not reached in edit mode — chip is inert div)
  function handleClick() {
    haptics.light();
    onTickToggle?.(brick.id);
  }

  // Shared tick chip content
  const tickChipContent = (
    <>
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
    </>
  );

  const tickBodyStyle: React.CSSProperties = {
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
    fontFamily: "var(--font-ui)",
    fontSize: size === "sm" ? "var(--fs-12)" : "var(--fs-14)",
    color: "var(--ink)",
    textAlign: "left",
  };

  const showLogRingTick = logHighlight && isBrickIncomplete(brick);
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
        outline: showLogRingTick ? "1.5px solid #4ade80" : undefined,
        outlineOffset: "1px",
        boxShadow: showLogRingTick
          ? "0 0 8px 1px rgba(74,222,128,0.35)"
          : undefined,
      }}
    >
      {/* Foreground gradient fill */}
      <div data-testid="brick-fill" aria-hidden="true" style={fillStyle} />

      {/* M5: in edit mode render as inert div (no button role); in normal mode render as button */}
      {editMode ? (
        <div
          data-testid="brick-chip-body"
          style={{ ...tickBodyStyle, cursor: "default" }}
        >
          {tickChipContent}
        </div>
      ) : (
        <button
          type="button"
          aria-label={ariaLabel}
          aria-pressed={brick.done}
          onClick={handleClick}
          style={{ ...tickBodyStyle, cursor: "pointer" }}
        >
          {tickChipContent}
        </button>
      )}

      {/* M5: × delete button */}
      {deleteButton}

      {/* M6: GripVertical drag handle */}
      {dragHandleButton}
    </div>
  );
}
