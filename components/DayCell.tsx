"use client";
/**
 * DayCell — M9c: one calendar day cell in the Kingdom month grid.
 * Resolves SG-m9c-03.
 *
 * Props:
 *   kind: "blank" | "future" | "pre-start" | "missed" | "scored"
 *   date?: string          ISO YYYY-MM-DD (all non-blank)
 *   dayOfMonth?: number    (all non-blank)
 *   score?: number         [0,100] — for "scored" kind only
 *   isToday?: boolean      — adds 2px accent ring to today's scored cell
 *   onOpen?: () => void    — only on "scored" cells
 *
 * Visual states (AC #3, #5, #6, #7, #8):
 *   scored  — heat fill (accent at scaled alpha) + date + corner numeral + button
 *   missed  — flat --card bg + --card-edge border + date number only, not button
 *   future  — transparent bg, faint date number, not button
 *   pre-start — identical to future
 *   blank   — empty div, aria-hidden
 *
 * Score heat fill: alpha = 0.12 + (score/100) * 0.78 (plan § Design tokens)
 * ADR-031: min 44px height.
 * ADR-038: missed = gray, no shame.
 */

import { isoToLocalDate } from "@/lib/dharma";

type DayCellPropsBlank = {
  kind: "blank";
};

type DayCellPropsInert = {
  kind: "future" | "pre-start" | "missed";
  date: string;
  dayOfMonth: number;
};

type DayCellPropsScored = {
  kind: "scored";
  date: string;
  dayOfMonth: number;
  score: number;
  isToday?: boolean;
  onOpen: () => void;
};

export type DayCellProps =
  | DayCellPropsBlank
  | DayCellPropsInert
  | DayCellPropsScored;

/** Build the aria-label for a scored cell from the ISO date string and score. */
function buildAriaLabel(date: string, score: number, isToday: boolean): string {
  // R4-P2-1: parse via the shared isoToLocalDate helper instead of an inline
  // `new Date(date + "T00:00:00")`. Single source of truth — any future
  // hardening to the helper (e.g. malformed-input guard) applies here too.
  const d = isoToLocalDate(date);
  const formatted = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
  const todayPart = isToday ? ", today" : "";
  return `${formatted}${todayPart}, score ${Math.round(score)} percent`;
}

export function DayCell(props: DayCellProps) {
  const baseStyle: React.CSSProperties = {
    aspectRatio: "1",
    borderRadius: "6px",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "var(--sp-4, 4px)",
    boxSizing: "border-box",
    minHeight: "44px",
    fontFamily: "var(--font-ui)",
  };

  // ── blank ──────────────────────────────────────────────────────────────────
  if (props.kind === "blank") {
    return (
      <div
        aria-hidden="true"
        data-kind="blank"
        style={{ ...baseStyle, background: "transparent" }}
      />
    );
  }

  const { kind, date, dayOfMonth } = props;

  // ── future / pre-start ────────────────────────────────────────────────────
  if (kind === "future" || kind === "pre-start") {
    return (
      <div
        data-kind={kind}
        style={{
          ...baseStyle,
          background: "transparent",
        }}
      >
        <span
          style={{
            color: "var(--ink-dim)",
            fontSize: "var(--fs-12)",
            opacity: 0.5,
          }}
        >
          {dayOfMonth}
        </span>
      </div>
    );
  }

  // ── missed ─────────────────────────────────────────────────────────────────
  if (kind === "missed") {
    return (
      <div
        data-kind="missed"
        style={{
          ...baseStyle,
          background: "var(--card)",
          border: "1px solid var(--card-edge)",
        }}
      >
        <span
          style={{
            color: "var(--ink-dim)",
            fontSize: "var(--fs-12)",
          }}
        >
          {dayOfMonth}
        </span>
      </div>
    );
  }

  // ── scored ─────────────────────────────────────────────────────────────────
  // Narrow props to DayCellPropsScored (all other kinds are exhausted above).
  const scoredProps = props as DayCellPropsScored;
  const { score, isToday = false, onOpen } = scoredProps;
  const alpha = 0.12 + (score / 100) * 0.78;
  const roundedScore = Math.round(score);

  const todayRing = isToday
    ? { outline: "2px solid var(--accent)", outlineOffset: "1px" }
    : {};

  return (
    <button
      type="button"
      data-kind="scored"
      data-score={roundedScore}
      data-today={isToday ? "true" : undefined}
      aria-label={buildAriaLabel(date, score, isToday)}
      onClick={onOpen}
      style={{
        ...baseStyle,
        background: `rgba(251, 191, 36, ${alpha})`, // --accent #fbbf24 at scaled alpha
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        // HUD heat: glow radius/strength scale with the score, so a strong
        // day literally radiates in the grid — the glow IS the data.
        boxShadow: `0 0 ${Math.round(6 + (score / 100) * 12)}px -2px rgba(251, 191, 36, ${(0.1 + (score / 100) * 0.4).toFixed(2)})`,
        ...todayRing,
      }}
    >
      <span
        style={{
          color: "var(--ink)",
          fontSize: "var(--fs-12)",
          display: "block",
        }}
      >
        {dayOfMonth}
      </span>
      <span
        data-score-numeral="true"
        style={{
          color: "var(--ink)",
          fontSize: "var(--fs-10)",
          display: "block",
          textAlign: "right",
        }}
      >
        {roundedScore}
      </span>
    </button>
  );
}
