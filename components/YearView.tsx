"use client";
/**
 * YearView — M9e: Empire year view.
 *
 * Props: { state: AppState; onOpenMonth: (year: number, monthIndex: number) => void }
 *
 * Renders (top → bottom):
 *   1. Header row: ChevronLeft (Previous year) · h2 year label · ChevronRight (Next year)
 *   2. YearAggregate ring (the Empire score)
 *   3. 3×4 grid of twelve MonthCells (role="list" aria-label="Months of <year>")
 *
 * ADR-045: history/currentDate consumed read-only — no dispatch.
 * ADR-046: monthScore/yearScore helpers are pure; "today" from state.currentDate.
 * ADR-033: single-% ring is the score signature.
 * ADR-038: missed = gray (--card chip for no-data months).
 * ADR-031: 44px touch targets.
 * No --surface-2 (undefined in globals.css).
 */

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AppState } from "@/lib/types";
import { today } from "@/lib/dharma";
import { yearMonths, addYear, subYear } from "@/lib/yearGrid";
import { monthScore, yearScore } from "@/lib/history";
import {
  longestStreak,
  avgDailyScore,
  daysCompleted,
} from "@/lib/insights";
import { MonthCell } from "./MonthCell";
import { InsightStrip } from "./InsightStrip";

type YearViewProps = {
  state: AppState;
  onOpenMonth: (year: number, monthIndex: number) => void;
};

/**
 * YearAggregate — inline component rendering the year score as an SVG ring.
 * Purpose-built to avoid --surface-2 hazard (plan § Design tokens).
 * Uses only defined M0 tokens: --accent, --card-edge, --ink, --ink-dim.
 * Mirrors M9d's WeekAggregate (WeekView.tsx) — same shape, different label.
 */
function YearAggregate({ score }: { score: number | null }) {
  const SIZE = 100;
  const STROKE = 8;
  const R = (SIZE - STROKE) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * R;
  const progress = score !== null ? (score / 100) * CIRCUMFERENCE : 0;

  const ariaLabel =
    score !== null
      ? `Year score ${Math.round(score)} percent`
      : "Year score: no data";

  return (
    <div
      data-year-aggregate="true"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "var(--sp-12, 12px) 0",
      }}
    >
      <div style={{ position: "relative", width: SIZE, height: SIZE }}>
        <svg
          role="img"
          aria-label={ariaLabel}
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Track */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="var(--card-edge)"
            strokeWidth={STROKE}
          />
          {/* Progress arc — only rendered when score is not null */}
          {score !== null && (
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={STROKE}
              strokeDasharray={`${progress} ${CIRCUMFERENCE - progress}`}
              strokeLinecap="round"
            />
          )}
        </svg>

        {/* Centered numeral */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {score !== null ? (
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--fs-32)",
                color: "var(--ink)",
                lineHeight: 1,
              }}
            >
              {Math.round(score)}%
            </span>
          ) : (
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--fs-32)",
                color: "var(--ink-dim)",
                lineHeight: 1,
              }}
            >
              &mdash;
            </span>
          )}
        </div>
      </div>

      {/* Label */}
      <span
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: "var(--fs-10)",
          color: "var(--ink-dim)",
          marginTop: "var(--sp-4, 4px)",
        }}
      >
        Year
      </span>
    </div>
  );
}

export function YearView({ state, onOpenMonth }: YearViewProps) {
  // Displayed year — initialized to current year. Session-only, not persisted.
  const [displayedYear, setDisplayedYear] = useState<number>(() =>
    Number(today().slice(0, 4)),
  );

  // Determine today's year + month for current-month accent
  const todayIso = today();
  const todayYear = Number(todayIso.slice(0, 4));
  const todayMonth = Number(todayIso.slice(5, 7)) - 1; // 0-indexed

  const months = yearMonths(displayedYear);
  // Memoize the 12 month scores + the year aggregate keyed on
  // (state, displayedYear). Without this every parent re-render (toast,
  // hydration tick, route nav) recomputed 12 × monthScore + 1 × yearScore,
  // which collectively walk ~365 day entries from state.history each pass.
  // Recompute only when the displayed year changes or persisted state mutates.
  const aggregateScore = useMemo(
    () => yearScore(state, displayedYear),
    [state, displayedYear],
  );
  const monthScores = useMemo(
    () => months.map((d) => monthScore(state, d.year, d.monthIndex)),
    [state, months],
  );

  function handlePrevYear() {
    setDisplayedYear((y) => subYear(y));
  }

  function handleNextYear() {
    setDisplayedYear((y) => addYear(y));
  }

  return (
    <div
      style={{
        fontFamily: "var(--font-ui)",
        padding: "var(--sp-12, 12px)",
      }}
    >
      {/* Year label + prev/next controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--sp-8, 8px)",
        }}
      >
        <button
          type="button"
          aria-label="Previous year"
          onClick={handlePrevYear}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--ink)",
            minHeight: "44px",
            minWidth: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ChevronLeft size={20} />
        </button>

        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--fs-22)",
            margin: 0,
            color: "var(--ink)",
          }}
        >
          {displayedYear}
        </h2>

        <button
          type="button"
          aria-label="Next year"
          onClick={handleNextYear}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--ink)",
            minHeight: "44px",
            minWidth: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Year aggregate ring */}
      <YearAggregate score={aggregateScore} />

      {/* 3×4 month grid */}
      <div
        role="list"
        aria-label={`Months of ${displayedYear}`}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "var(--sp-8, 8px)",
          padding: "var(--sp-12, 12px)",
        }}
      >
        {months.map((descriptor, idx) => {
          const score = monthScores[idx]!;
          const isCurrentMonth =
            descriptor.year === todayYear &&
            descriptor.monthIndex === todayMonth;

          return (
            <div key={descriptor.monthIndex} role="listitem">
              <MonthCell
                year={descriptor.year}
                monthIndex={descriptor.monthIndex}
                name={descriptor.name}
                score={score}
                isCurrentMonth={isCurrentMonth}
                onOpen={() =>
                  onOpenMonth(descriptor.year, descriptor.monthIndex)
                }
              />
            </div>
          );
        })}
      </div>

      {/* Insight strip — scoped to the displayed year (Jan 1 → Dec 31). */}
      {(() => {
        const from = `${displayedYear}-01-01`;
        const to = `${displayedYear}-12-31`;
        const completed = daysCompleted(state, from, to);
        const streak = longestStreak(state, from, to);
        return (
          <InsightStrip
            items={[
              {
                label: "Avg score",
                value: avgDailyScore(state, from, to),
                suffix: "%",
              },
              {
                label: "Complete",
                value: completed,
                suffix: completed === 1 ? "day" : "days",
              },
              {
                label: "Streak",
                value: streak,
                suffix: streak === 1 ? "day" : "days",
              },
            ]}
          />
        );
      })()}
    </div>
  );
}
