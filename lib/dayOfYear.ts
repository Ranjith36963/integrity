/**
 * lib/dayOfYear.ts — Day-of-year and days-in-year helpers.
 *
 * Uses local date components (same DST-safe approach as `today()` in dharma.ts)
 * so timezone shifts do not move the day boundary.
 *
 * M1 uses `dayOfYear(new Date())` for the hero "Building N of 365" counter.
 * M8 will replace this with `programStart`-relative computation per plan.md § Data model.
 */

/**
 * Returns the 1-based day of year for the given date (1 = Jan 1, 365 or 366 = Dec 31).
 * Uses local date components to match the user's current day boundary.
 */
export function dayOfYear(d: Date): number {
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffMs = startOfDay.getTime() - startOfYear.getTime();
  return Math.round(diffMs / 86_400_000) + 1;
}

/**
 * Returns 365 or 366 depending on whether the year of the given date is a leap year.
 * A year is a leap year if:
 *   - divisible by 4 AND
 *   - NOT divisible by 100 UNLESS also divisible by 400.
 */
export function daysInYear(d: Date): number {
  const y = d.getFullYear();
  const isLeap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  return isLeap ? 366 : 365;
}
