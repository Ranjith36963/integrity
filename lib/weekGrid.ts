/**
 * lib/weekGrid.ts — M9d: pure week-date-math module for the Castle week view.
 * UTC-drift-free: uses only the multi-arg Date constructor (local-midnight),
 * NEVER new Date(isoString) (UTC midnight → drifts in negative-offset TZs).
 *
 * Sibling to lib/monthGrid.ts — separate module for separate concerns.
 * ADR-019: 0=Sun..6=Sat weekday convention.
 *
 * Exports:
 *   weekDates(anchorISO)     → string[] (length 7, Sun→Sat)
 *   addWeek(anchorISO)       → string (next week anchor)
 *   subWeek(anchorISO)       → string (previous week anchor)
 *   weekRangeLabel(anchorISO) → string (e.g. "May 17–23, 2026")
 */

const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * parseISO — private helper: parse a YYYY-MM-DD ISO string as a local-midnight Date.
 * NEVER uses new Date(isoString) (UTC midnight → drifts in negative-offset TZs).
 * Uses the multi-arg local-time constructor, matching lib/monthGrid.ts's discipline.
 */
function parseISO(iso: string): Date {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7)) - 1; // 0-indexed month
  const d = Number(iso.slice(8, 10));
  return new Date(y, m, d); // local midnight — no UTC drift
}

/**
 * isoFromDate — serialize a local Date to a zero-padded YYYY-MM-DD ISO string.
 * Uses string assembly (no Date→string round-trip through UTC).
 */
function isoFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * weekDates(anchorISO) — returns the 7 Sun→Sat ISO dates for the week containing
 * the given anchor date. Any day in the target week may be used as the anchor;
 * weekDates re-normalizes to Sunday.
 *
 * ADR-019: 0=Sun..6=Sat (getDay() convention, matching monthGrid.ts).
 * Boundary-correct: multi-arg Date arithmetic rolls month/year boundaries.
 */
export function weekDates(anchorISO: string): string[] {
  const anchor = parseISO(anchorISO);
  const weekday = anchor.getDay(); // 0=Sun..6=Sat

  // Build the week's Sunday via day arithmetic on the multi-arg constructor.
  // new Date(y, m, d - weekday) rolls back to Sunday, crossing month boundaries.
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const d = anchor.getDate();

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    // new Date(y, m, d - weekday + i) → local midnight, boundary-correct
    dates.push(isoFromDate(new Date(y, m, d - weekday + i)));
  }

  return dates;
}

/**
 * addWeek(anchorISO) — returns an ISO date +7 days from the anchor.
 * The returned value is a valid anchor for the following week.
 * Pure, no UTC drift; ±7 day arithmetic rolls boundaries.
 */
export function addWeek(anchorISO: string): string {
  const anchor = parseISO(anchorISO);
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const d = anchor.getDate();
  return isoFromDate(new Date(y, m, d + 7));
}

/**
 * subWeek(anchorISO) — returns an ISO date -7 days from the anchor.
 * Pure, no UTC drift; ±7 day arithmetic rolls boundaries.
 */
export function subWeek(anchorISO: string): string {
  const anchor = parseISO(anchorISO);
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const d = anchor.getDate();
  return isoFromDate(new Date(y, m, d - 7));
}

/**
 * weekRangeLabel(anchorISO) — returns a human-readable date range for the week.
 *
 * Format rules (AC #2):
 *   Same month+year:    "May 17–23, 2026"         (en dash, no spaces)
 *   Different months:   "May 31 – Jun 6, 2026"    (en dash, spaces, shared year)
 *   Different years:    "Dec 27, 2026 – Jan 2, 2027" (both endpoints full)
 */
export function weekRangeLabel(anchorISO: string): string {
  const dates = weekDates(anchorISO);
  const sun = parseISO(dates[0]); // Sunday
  const sat = parseISO(dates[6]); // Saturday

  const sunYear = sun.getFullYear();
  const satYear = sat.getFullYear();
  const sunMonth = sun.getMonth(); // 0-indexed
  const satMonth = sat.getMonth();
  const sunDay = sun.getDate();
  const satDay = sat.getDate();

  const sunMonthAbbr = MONTH_ABBR[sunMonth];
  const satMonthAbbr = MONTH_ABBR[satMonth];

  if (sunYear === satYear) {
    if (sunMonth === satMonth) {
      // Same month + year: "May 17–23, 2026" (en dash, no spaces)
      return `${sunMonthAbbr} ${sunDay}–${satDay}, ${sunYear}`;
    } else {
      // Different months, same year: "May 31 – Jun 6, 2026"
      return `${sunMonthAbbr} ${sunDay} – ${satMonthAbbr} ${satDay}, ${sunYear}`;
    }
  } else {
    // Different years: "Dec 27, 2026 – Jan 2, 2027"
    return `${sunMonthAbbr} ${sunDay}, ${sunYear} – ${satMonthAbbr} ${satDay}, ${satYear}`;
  }
}
