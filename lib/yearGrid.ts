/**
 * lib/yearGrid.ts — M9e: pure date-math module for the Empire year view.
 * UTC-drift-free: uses only the multi-arg Date constructor (local-midnight),
 * NEVER new Date(isoString) (UTC midnight → drifts in negative-offset TZs).
 *
 * Sibling to lib/monthGrid.ts and lib/weekGrid.ts — separate module for separate concerns.
 *
 * Exports:
 *   monthDates(year, monthIndex) → string[] (YYYY-MM-DD for each day in the month)
 *   yearMonths(year)             → MonthDescriptor[] (twelve { year, monthIndex, name } descriptors)
 *   addYear(year)                → number (year + 1, pure integer arithmetic)
 *   subYear(year)                → number (year - 1, pure integer arithmetic)
 */

export type MonthDescriptor = {
  year: number;
  monthIndex: number;
  name: string;
};

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

/**
 * monthDates(year, monthIndex) — returns the in-month ISO YYYY-MM-DD dates, day 1 → last day.
 * monthIndex is 0-indexed (0 = January … 11 = December), matching Date convention.
 *
 * Days-in-month: new Date(year, monthIndex + 1, 0).getDate() — day 0 of next month = last day of this month.
 * (The exact technique monthGrid.ts line 32 uses — handles leap years automatically.)
 *
 * ISO string assembled by string padding — no Date→string round-trip through UTC.
 * NEVER uses new Date(isoString) — UTC-drift-free.
 */
export function monthDates(year: number, monthIndex: number): string[] {
  // Day 0 of the following month = last day of this month — handles leap years automatically
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const mm = String(monthIndex + 1).padStart(2, "0");
  const dates: string[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dd = String(day).padStart(2, "0");
    dates.push(`${year}-${mm}-${dd}`);
  }

  return dates;
}

/**
 * yearMonths(year) — returns the twelve { year, monthIndex, name } descriptors
 * for the 3×4 grid, ordered January → December.
 */
export function yearMonths(year: number): MonthDescriptor[] {
  return MONTH_NAMES.map((name, monthIndex) => ({ year, monthIndex, name }));
}

/**
 * addYear(year) — returns year + 1 (pure integer arithmetic, no Date object).
 */
export function addYear(year: number): number {
  return year + 1;
}

/**
 * subYear(year) — returns year - 1 (pure integer arithmetic, no Date object).
 */
export function subYear(year: number): number {
  return year - 1;
}
