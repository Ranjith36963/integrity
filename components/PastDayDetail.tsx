"use client";
/**
 * PastDayDetail — M9c: read-only day detail for an archived day.
 * Resolves SG-m9c-04.
 *
 * Props: { archivedDay: ArchivedDay; isoDate: string; onClose: () => void }
 *
 * Strictly read-only (AC #13):
 *   - No dispatch, no reducer action
 *   - No BrickChip / TimelineBlock / AddBrickSheet / stepper / toggle
 *   - Only interactive element is Close
 *
 * Accessibility:
 *   - role="region" aria-label="Day detail"
 *   - Close button with aria-label="Close"
 *
 * Design tokens: --font-display (header), --font-ui (body), --fs-22 (header),
 *                --fs-12/--fs-14 (body text), --card / --card-edge / --ink-dim
 */

import { X, Minus, Plus } from "lucide-react";
import type { ArchivedDay, Block, Brick } from "@/lib/types";
import type { ArchivedBrickEdit } from "@/lib/pastEdit";
import { dateLabel, fmtRange, brickLabel, dayPct } from "@/lib/dharma";

type PastDayDetailProps = {
  archivedDay: ArchivedDay;
  isoDate: string;
  onClose: () => void;
  /** M11 DEC-2 — when true, bricks become editable so this day can be back-logged. */
  canEdit?: boolean;
  /** M11 DEC-2 — apply a back-log edit (tick toggle / units count / timer secs). */
  onEdit?: (brickId: string, edit: ArchivedBrickEdit) => void;
};

export function PastDayDetail({
  archivedDay,
  isoDate,
  onClose,
  canEdit = false,
  onEdit,
}: PastDayDetailProps) {
  const editable = canEdit && !!onEdit;

  const rowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "var(--fs-12)",
    color: "var(--ink)",
    padding: "6px 0",
    gap: "8px",
  };
  const nameStyle: React.CSSProperties = {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
    textAlign: "left",
  };
  const stepBtn: React.CSSProperties = {
    display: "grid",
    placeItems: "center",
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    border: "1px solid var(--card-edge)",
    background: "transparent",
    color: "var(--ink)",
    cursor: "pointer",
  };

  // A ±stepper used for units (step 1) and timer (step = 1 minute in seconds).
  const stepper = (
    label: string,
    onDec: () => void,
    onInc: () => void,
    ariaName: string,
  ) => (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        flexShrink: 0,
      }}
    >
      <button
        type="button"
        aria-label={`Decrease ${ariaName}`}
        onClick={onDec}
        style={stepBtn}
      >
        <Minus size={14} />
      </button>
      <span
        style={{ minWidth: "64px", textAlign: "center", color: "var(--ink)" }}
      >
        {label}
      </span>
      <button
        type="button"
        aria-label={`Increase ${ariaName}`}
        onClick={onInc}
        style={stepBtn}
      >
        <Plus size={14} />
      </button>
    </span>
  );

  // One brick row — read-only, or an editable control when back-logging is on.
  const renderBrick = (brick: Brick) => {
    if (editable && brick.kind === "tick") {
      const done = brick.done;
      return (
        <button
          key={brick.id}
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={`${brick.name}, ${done ? "done" : "not done"}, tap to back-log`}
          onClick={() => onEdit!(brick.id, { kind: "toggle-tick" })}
          style={{
            ...rowStyle,
            width: "100%",
            minHeight: "44px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          <span style={nameStyle}>{brick.name}</span>
          <span
            aria-hidden="true"
            style={{
              flexShrink: 0,
              color: done ? "var(--accent)" : "var(--ink-dim)",
              fontWeight: 600,
            }}
          >
            {done ? "✓ done" : "○ mark"}
          </span>
        </button>
      );
    }
    if (editable && brick.kind === "units") {
      const done = brick.done;
      return (
        <div key={brick.id} style={{ ...rowStyle, minHeight: "44px" }}>
          <span style={nameStyle}>{brick.name}</span>
          {stepper(
            `${done}/${brick.target} ${brick.unit}`,
            () => onEdit!(brick.id, { kind: "units", done: done - 1 }),
            () => onEdit!(brick.id, { kind: "units", done: done + 1 }),
            `${brick.name} count`,
          )}
        </div>
      );
    }
    if (editable && brick.kind === "timer") {
      const mins = Math.floor(brick.elapsedSec / 60);
      return (
        <div key={brick.id} style={{ ...rowStyle, minHeight: "44px" }}>
          <span style={nameStyle}>{brick.name}</span>
          {stepper(
            `${mins}/${brick.targetMin} min`,
            () =>
              onEdit!(brick.id, {
                kind: "timer",
                elapsedSec: brick.elapsedSec - 60,
              }),
            () =>
              onEdit!(brick.id, {
                kind: "timer",
                elapsedSec: brick.elapsedSec + 60,
              }),
            `${brick.name} minutes`,
          )}
        </div>
      );
    }
    return (
      <div key={brick.id} style={rowStyle}>
        <span style={nameStyle}>{brick.name}</span>
        <span style={{ color: "var(--ink-dim)", flexShrink: 0 }}>
          {brickLabel(brick)}
        </span>
      </div>
    );
  };
  // Compute score: dayPct over the ArchivedDay (blocks + looseBricks)
  const score = Math.round(
    dayPct({
      blocks: archivedDay.blocks,
      looseBricks: archivedDay.looseBricks,
      categories: archivedDay.categories,
      programStart: isoDate,
      currentDate: isoDate,
      history: {},
      deletions: {}, // M5 — archived day has no per-day deletions
    }),
  );

  const formattedDate = dateLabel(isoDate);
  const hasLooseBricks = archivedDay.looseBricks.length > 0;

  return (
    <div
      role="region"
      aria-label="Day detail"
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--bg)",
        overflowY: "auto",
        padding: "var(--sp-12, 12px)",
        zIndex: 10,
        fontFamily: "var(--font-ui)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--sp-12, 12px)",
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--fs-22)",
              margin: 0,
              color: "var(--ink)",
            }}
          >
            {formattedDate}
          </h2>
          <p
            data-testid="past-day-score"
            style={{
              fontSize: "var(--fs-14, 0.875rem)",
              color: "var(--ink-dim)",
              margin: 0,
            }}
          >
            {/* M11 DEC-1: a backfilled missed day reads "No entry" (still 0%). */}
            {archivedDay.missed ? "No entry · 0%" : `${score}%`}
          </p>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--ink)",
            padding: "var(--sp-8, 8px)",
            minHeight: "44px",
            minWidth: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Blocks list */}
      {archivedDay.blocks.map((block: Block) => (
        <div key={block.id} style={{ marginBottom: "var(--sp-12, 12px)" }}>
          <div
            style={{
              fontSize: "var(--fs-12)",
              fontWeight: 600,
              color: "var(--ink)",
              marginBottom: "var(--sp-4, 4px)",
            }}
          >
            {block.name}
          </div>
          <div
            style={{
              fontSize: "var(--fs-10, 0.625rem)",
              color: "var(--ink-dim)",
              marginBottom: "var(--sp-4, 4px)",
            }}
          >
            {fmtRange(block)}
          </div>
          {block.bricks.map(renderBrick)}
        </div>
      ))}

      {/* Loose bricks */}
      {hasLooseBricks && (
        <div>
          <div
            style={{
              fontSize: "var(--fs-12)",
              fontWeight: 600,
              color: "var(--ink)",
              marginBottom: "var(--sp-4, 4px)",
            }}
          >
            Loose bricks
          </div>
          {archivedDay.looseBricks.map(renderBrick)}
        </div>
      )}
    </div>
  );
}
