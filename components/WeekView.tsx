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
import { PeriodRing } from "./PeriodRing";
import { weekDates, addWeek, subWeek, weekRangeLabel } from "@/lib/weekGrid";
import { dayScore, weekScore } from "@/lib/history";
import { longestStreak, avgDailyScore, daysCompleted } from "@/lib/insights";
import { WeekDayCell } from "./WeekDayCell";
import { PastDayDetail } from "./PastDayDetail";
import { InsightStrip } from "./InsightStrip";

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
  return <PeriodRing score={score} label="Week" />;
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
      return;
    }
    // R7-ROOT-M8/M9-P2 (mirror of MonthView fix): fall back to editable
    // Day view if the iso isn't yet in state.history. Avoids silent
    // no-op when a cell renders as scored but isn't archived.
    if (isoDate in state.history) {
      setOpenDate(isoDate);
    } else {
      onOpenDay(isoDate);
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

      {/* Insight strip — fills the dead space below the 7 day rows
          with three concrete week-scoped KPIs. */}
      {(() => {
        const completed = daysCompleted(state, dates[0]!, dates[6]!);
        const streak = longestStreak(state, dates[0]!, dates[6]!);
        return (
          <InsightStrip
            items={[
              {
                label: "Avg score",
                value: avgDailyScore(state, dates[0]!, dates[6]!),
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
