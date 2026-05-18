/**
 * lib/monthGrid.ts — M9c: pure date-math module for the Kingdom month grid.
 * UTC-drift-free: uses only the multi-arg Date constructor (local-midnight),
 * NEVER new Date(isoString) (UTC midnight → drifts in negative-offset TZs).
 *
 * Per plan.md § Date math:
 * - Weekday of 1st: new Date(year, month, 1).getDay()  → 0=Sun..6=Sat
 * - Days in month: new Date(year, month+1, 0).getDate() — day 0 of next month
 * - addMonth/subMonth: pure integer arithmetic, no Date object
 * - ISO string: string assembly, no Date
 */

export type GridCell =
  | { kind: "blank" }
  | { kind: "date"; iso: string; dayOfMonth: number };

export type YearMonth = { year: number; month: number };

/**
 * monthGridCells(year, month) — returns a flat array of GridCells for the
 * calendar grid (month 0–11 convention, matching Date).
 *
 * Layout: leading blank cells (Sun..day-before-1st), then one date cell per
 * day of the month, then trailing blank cells to fill the final row to 7.
 * Array length is always a multiple of 7 (4, 5, or 6 rows).
 */
export function monthGridCells(year: number, month: number): GridCell[] {
  // Weekday of the 1st — local-midnight, no UTC drift
  const firstWeekday = new Date(year, month, 1).getDay(); // 0=Sun..6=Sat

  // Days in month — day 0 of the next month = last day of this month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: GridCell[] = [];

  // Leading blank cells
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ kind: "blank" });
  }

  // Date cells
  for (let day = 1; day <= daysInMonth; day++) {
    // ISO string assembly — no Date object, no UTC drift
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ kind: "date", iso, dayOfMonth: day });
  }

  // Trailing blank cells to pad to a multiple of 7
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    const trailing = 7 - remainder;
    for (let i = 0; i < trailing; i++) {
      cells.push({ kind: "blank" });
    }
  }

  return cells;
}

/**
 * addMonth — pure integer arithmetic. Advances by one month; wraps Dec→Jan.
 * No Date object; no UTC drift.
 */
export function addMonth({ year, month }: YearMonth): YearMonth {
  if (month === 11) {
    return { year: year + 1, month: 0 };
  }
  return { year, month: month + 1 };
}

/**
 * subMonth — pure integer arithmetic. Retreats by one month; wraps Jan→Dec.
 * No Date object; no UTC drift.
 */
export function subMonth({ year, month }: YearMonth): YearMonth {
  if (month === 0) {
    return { year: year - 1, month: 11 };
  }
  return { year, month: month - 1 };
}
