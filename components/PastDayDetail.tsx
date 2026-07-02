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

import { X } from "lucide-react";
import type { ArchivedDay, Block, Brick } from "@/lib/types";
import { dateLabel, fmtRange, brickLabel, dayPct } from "@/lib/dharma";

type PastDayDetailProps = {
  archivedDay: ArchivedDay;
  isoDate: string;
  onClose: () => void;
  /** M11 DEC-2 — when true, tick bricks become toggles that back-log this day. */
  canEdit?: boolean;
  /** M11 DEC-2 — dispatch a TOGGLE_ARCHIVED_TICK for (isoDate, brickId). */
  onToggleTick?: (brickId: string) => void;
};

export function PastDayDetail({
  archivedDay,
  isoDate,
  onClose,
  canEdit = false,
  onToggleTick,
}: PastDayDetailProps) {
  const editable = canEdit && !!onToggleTick;

  // One brick row — a read-only line, or a tick toggle when editing is allowed.
  const renderBrick = (brick: Brick) => {
    const rowStyle: React.CSSProperties = {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontSize: "var(--fs-12)",
      color: "var(--ink)",
      padding: "6px 0",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    };
    const nameStyle: React.CSSProperties = {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      flex: 1,
      textAlign: "left",
    };
    if (editable && brick.kind === "tick") {
      const done = brick.done;
      return (
        <button
          key={brick.id}
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={`${brick.name}, ${done ? "done" : "not done"}, tap to back-log`}
          onClick={() => onToggleTick!(brick.id)}
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
              marginLeft: "var(--sp-8, 8px)",
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
    return (
      <div key={brick.id} style={rowStyle}>
        <span style={nameStyle}>{brick.name}</span>
        <span
          style={{
            color: "var(--ink-dim)",
            marginLeft: "var(--sp-8, 8px)",
            flexShrink: 0,
          }}
        >
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
