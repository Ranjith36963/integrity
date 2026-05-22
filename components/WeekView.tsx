"use client";
/**
 * WeekView — M9d: Castle week view.
 * Resolves SG-m9d-02.
 *
 * Props: { state: AppState; onOpenDay: (isoDate: string) => void }
 * (identical shape to MonthView — AppShell wires it the same way)
 *
 * Layout (vertical 7-row list):
 *   - Week date-range label (Instrument Serif, --fs-22)
 *   - Prev/Next controls (ChevronLeft/ChevronRight, 44px hit area)
 *   - WeekAggregate ring (--accent arc on --card-edge track; centered numeral)
 *   - Seven WeekDayCell rows (role="list" aria-label="Week days", each role="listitem")
 *   - PastDayDetail overlay (reused verbatim from M9c MonthView usage)
 *
 * ADR-045: history/currentDate consumed read-only — no dispatch.
 * ADR-019: 0=Sun..6=Sat weekday convention (via weekGrid.ts).
 * ADR-033: single-% ring is the score signature.
 * ADR-038: missed = gray (--card chip).
 * ADR-031: 44px touch targets.
 * No --surface-2 (undefined in globals.css).
 */

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AppState } from "@/lib/types";
import { today } from "@/lib/dharma";
import { weekDates, addWeek, subWeek, weekRangeLabel } from "@/lib/weekGrid";
import { dayScore, weekScore } from "@/lib/history";
import { WeekDayCell } from "./WeekDayCell";
import { PastDayDetail } from "./PastDayDetail";

type WeekViewProps = {
  state: AppState;
  onOpenDay: (isoDate: string) => void;
};

// Short weekday labels — 0=Sun..6=Sat (ADR-019)
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * WeekAggregate — inline component rendering the week score as an SVG ring.
 * Purpose-built to avoid --surface-2 hazard from HeroRing (plan § Design tokens).
 * Uses only defined M0 tokens: --accent, --card-edge, --ink, --ink-dim.
 */
function WeekAggregate({ score }: { score: number | null }) {
  const SIZE = 100;
  const STROKE = 8;
  const R = (SIZE - STROKE) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * R;
  const progress = score !== null ? (score / 100) * CIRCUMFERENCE : 0;

  const ariaLabel =
    score !== null
      ? `Week score ${Math.round(score)} percent`
      : "Week score: no data";

  return (
    <div
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
        Week
      </span>
    </div>
  );
}

export function WeekView({ state, onOpenDay }: WeekViewProps) {
  // Anchor: any day in the displayed week. Initialized to today. Session-only, not persisted.
  const [anchor, setAnchor] = useState<string>(() => today());

  // Opened past-day detail state
  const [openDate, setOpenDate] = useState<string | null>(null);

  const todayIso = today();
  const dates = weekDates(anchor);
  const rangeLabel = weekRangeLabel(anchor);
  const score = weekScore(state, anchor);

  function handlePrevWeek() {
    setAnchor((a) => subWeek(a));
  }

  function handleNextWeek() {
    setAnchor((a) => addWeek(a));
  }

  function handleCellOpen(isoDate: string) {
    if (isoDate === todayIso) {
      // Today → open the editable Building (Day) view
      onOpenDay(isoDate);
    } else {
      // Past archived day → open read-only PastDayDetail
      setOpenDate(isoDate);
    }
  }

  return (
    <div
      style={{
        position: "relative",
        fontFamily: "var(--font-ui)",
        padding: "var(--sp-12, 12px)",
      }}
    >
      {/* Week date-range label + prev/next controls */}
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
          aria-label="Previous week"
          onClick={handlePrevWeek}
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
          {rangeLabel}
        </h2>

        <button
          type="button"
          aria-label="Next week"
          onClick={handleNextWeek}
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

      {/* Week aggregate ring */}
      <WeekAggregate score={score} />

      {/* Seven-row day list */}
      <div
        role="list"
        aria-label="Week days"
        style={{
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: "var(--sp-4, 4px)",
        }}
      >
        {dates.map((iso, idx) => {
          const weekdayLabel = WEEKDAY_LABELS[idx];
          const dayOfMonth = Number(iso.slice(8, 10));
          const isToday = iso === todayIso;
          const cellScore = dayScore(state, iso);
          const isFuture = iso > todayIso;
          const isPreStart = iso < state.programStart;
          const isPastInRange = iso < todayIso && iso >= state.programStart;

          if (cellScore !== null) {
            // scored — has a history entry or is today
            return (
              <WeekDayCell
                key={iso}
                kind="scored"
                date={iso}
                dayOfMonth={dayOfMonth}
                weekdayLabel={weekdayLabel}
                score={cellScore}
                isToday={isToday}
                onOpen={() => handleCellOpen(iso)}
              />
            );
          }

          if (isFuture) {
            return (
              <WeekDayCell
                key={iso}
                kind="future"
                date={iso}
                dayOfMonth={dayOfMonth}
                weekdayLabel={weekdayLabel}
              />
            );
          }

          if (isPreStart) {
            return (
              <WeekDayCell
                key={iso}
                kind="pre-start"
                date={iso}
                dayOfMonth={dayOfMonth}
                weekdayLabel={weekdayLabel}
              />
            );
          }

          if (isPastInRange) {
            // Past, in-range, no history entry → missed
            return (
              <WeekDayCell
                key={iso}
                kind="missed"
                date={iso}
                dayOfMonth={dayOfMonth}
                weekdayLabel={weekdayLabel}
              />
            );
          }

          // Fallback (shouldn't occur)
          return (
            <WeekDayCell
              key={iso}
              kind="future"
              date={iso}
              dayOfMonth={dayOfMonth}
              weekdayLabel={weekdayLabel}
            />
          );
        })}
      </div>

      {/* PastDayDetail overlay — byte-identical usage to MonthView */}
      {openDate !== null && openDate in state.history && (
        <PastDayDetail
          archivedDay={state.history[openDate]!}
          isoDate={openDate}
          onClose={() => setOpenDate(null)}
        />
      )}
    </div>
  );
}
