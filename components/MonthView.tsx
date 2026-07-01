"use client";
/**
 * MonthView — M9c: Kingdom month grid screen.
 * Resolves SG-m9c-01 (partial — AppShell calls usePersistedState once).
 *
 * Props: { state: AppState; onOpenDay: (isoDate: string) => void }
 *
 * Renders:
 *   - Month/year label (Instrument Serif, --fs-22)
 *   - Prev/Next controls (ChevronLeft/ChevronRight, 44px hit area)
 *   - Weekday header row (Sun..Sat, 0=Sun per ADR-019)
 *   - 7-column grid via monthGridCells() — role="grid" with role="row"/"gridcell"/"columnheader"
 *   - DayCell per cell — classified via today() + programStart + dayScore
 *   - PastDayDetail overlay when a past scored cell is tapped
 *
 * ADR-019: 0=Sun..6=Sat weekday convention.
 * ADR-038: missed = gray (--card chip).
 * ADR-045: history read-only — no dispatch.
 */

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AppState } from "@/lib/types";
import { today } from "@/lib/dharma";
import { monthGridCells, addMonth, subMonth } from "@/lib/monthGrid";
import { dayScore } from "@/lib/history";
import { longestStreak, avgDailyScore, daysCompleted } from "@/lib/insights";
import { DayCell } from "./DayCell";
import { PastDayDetail } from "./PastDayDetail";
import { InsightStrip } from "./InsightStrip";
import { PeriodRing } from "./PeriodRing";

type MonthViewProps = {
  state: AppState;
  onOpenDay: (isoDate: string) => void;
  initialMonth?: { year: number; month: number };
};

// Weekday headers — 0=Sun..6=Sat (ADR-019)
const WEEKDAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Month names for the label
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function MonthView({ state, onOpenDay, initialMonth }: MonthViewProps) {
  // Displayed month — initialized to initialMonth if provided, else today's year/month; session-only, not persisted
  const todayIso = today();
  const todayYear = Number(todayIso.slice(0, 4));
  const todayMonth = Number(todayIso.slice(5, 7)) - 1; // 0-indexed

  const [displayed, setDisplayed] = useState<{
    year: number;
    month: number;
  }>(initialMonth ?? { year: todayYear, month: todayMonth });

  // Opened past-day detail state
  const [openDate, setOpenDate] = useState<string | null>(null);

  const { year, month } = displayed;
  const monthLabel = `${MONTH_NAMES[month]} ${year}`;

  // Month aggregate score for the header ring (mean day-score across the month).
  const monthFirstIso = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const monthLastDay = new Date(year, month + 1, 0).getDate();
  const monthLastIso = `${year}-${String(month + 1).padStart(2, "0")}-${String(monthLastDay).padStart(2, "0")}`;
  const monthScore = avgDailyScore(state, monthFirstIso, monthLastIso);

  // Build the grid cells
  const cells = monthGridCells(year, month);

  // Chunk cells into rows of 7
  const rows: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  function handlePrevMonth() {
    setDisplayed((d) => subMonth(d));
  }

  function handleNextMonth() {
    setDisplayed((d) => addMonth(d));
  }

  function handleCellOpen(isoDate: string) {
    if (isoDate === todayIso) {
      // Today → open the editable Building (Day) view
      onOpenDay(isoDate);
      return;
    }
    // R7-ROOT-M8/M9-P2: pre-R7 dead-end — if a cell rendered as "scored"
    // because dayScore() found a live state.currentDate but iso wasn't yet
    // in state.history, tapping set openDate but the PastDayDetail's
    // `openDate in state.history` guard returned false → modal never
    // mounted, user saw silent no-op. Fallback: if the iso isn't in
    // history, route to the editable Day view (it's the active day).
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
      {/* Month/year label + prev/next controls */}
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
          aria-label="Previous month"
          onClick={handlePrevMonth}
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
          {monthLabel}
        </h2>

        <button
          type="button"
          aria-label="Next month"
          onClick={handleNextMonth}
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

      {/* Month aggregate ring */}
      <PeriodRing score={monthScore} label="Month" />

      {/* Grid — R7-ROOT-M8/M9-P2: added aria-rowcount + aria-colcount and per-
          cell aria-rowindex/colindex so SR users in grid-aware mode (NVDA / JAWS)
          get anchored cells. WAI-ARIA grid pattern: header row is rowindex 1;
          data rows are 2..N. Columns are 1..7. */}
      <div
        role="grid"
        aria-rowcount={rows.length + 1}
        aria-colcount={7}
        style={{ width: "100%" }}
      >
        {/* Weekday header row */}
        <div
          role="row"
          aria-rowindex={1}
          style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}
        >
          {WEEKDAY_HEADERS.map((day, idx) => (
            <div
              key={day}
              role="columnheader"
              aria-colindex={idx + 1}
              style={{
                textAlign: "center",
                fontSize: "var(--fs-10, 0.625rem)",
                color: "var(--ink-dim)",
                fontFamily: "var(--font-ui)",
                padding: "var(--sp-4, 4px) 0",
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day rows */}
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            role="row"
            aria-rowindex={rowIndex + 2}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "2px",
            }}
          >
            {row.map((cell, cellIndex) => {
              const key = `${rowIndex}-${cellIndex}`;
              if (cell.kind === "blank") {
                return (
                  <div key={key} role="gridcell" aria-colindex={cellIndex + 1}>
                    <DayCell kind="blank" />
                  </div>
                );
              }

              const { iso, dayOfMonth } = cell;
              const isToday = iso === todayIso;

              // Classify the cell
              const score = dayScore(state, iso);
              const isPastInRange = iso < todayIso && iso >= state.programStart;
              const isFuture = iso > todayIso;
              const isPreStart = iso < state.programStart;

              if (score !== null) {
                // scored — has a history entry or is today
                return (
                  <div key={key} role="gridcell" aria-colindex={cellIndex + 1}>
                    <DayCell
                      kind="scored"
                      date={iso}
                      dayOfMonth={dayOfMonth}
                      score={score}
                      isToday={isToday}
                      onOpen={() => handleCellOpen(iso)}
                    />
                  </div>
                );
              }

              if (isFuture) {
                return (
                  <div key={key} role="gridcell" aria-colindex={cellIndex + 1}>
                    <DayCell kind="future" date={iso} dayOfMonth={dayOfMonth} />
                  </div>
                );
              }

              if (isPreStart) {
                return (
                  <div key={key} role="gridcell" aria-colindex={cellIndex + 1}>
                    <DayCell
                      kind="pre-start"
                      date={iso}
                      dayOfMonth={dayOfMonth}
                    />
                  </div>
                );
              }

              if (isPastInRange) {
                // Past, in-range, no history entry → missed
                return (
                  <div key={key} role="gridcell" aria-colindex={cellIndex + 1}>
                    <DayCell kind="missed" date={iso} dayOfMonth={dayOfMonth} />
                  </div>
                );
              }

              // Fallback (shouldn't occur in practice)
              return (
                <div key={key} role="gridcell" aria-colindex={cellIndex + 1}>
                  <DayCell kind="future" date={iso} dayOfMonth={dayOfMonth} />
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Insight strip — scoped to the displayed month (first → last). */}
      {(() => {
        const y = displayed.year;
        const m = displayed.month;
        const firstIso = `${y}-${String(m + 1).padStart(2, "0")}-01`;
        // Last day of the month — Date(y, m+1, 0) returns the 0th day of the
        // NEXT month, which is the last day of THIS month.
        const lastDay = new Date(y, m + 1, 0).getDate();
        const lastIso = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
        const completed = daysCompleted(state, firstIso, lastIso);
        const streak = longestStreak(state, firstIso, lastIso);
        return (
          <InsightStrip
            items={[
              {
                label: "Avg score",
                value: avgDailyScore(state, firstIso, lastIso),
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

      {/* PastDayDetail overlay */}
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
