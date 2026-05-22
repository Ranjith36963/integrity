// lib/appliesOn.ts — M9a: pure recurrence resolver
// Exports exactly one public function: appliesOn(recurrence, date) → boolean.
// No clock reads, no storage access, no React. Pure module.
import type { Recurrence } from "@/lib/types";

/**
 * Parses an ISO YYYY-MM-DD string into a local-calendar Date.
 *
 * Uses the multi-arg Date constructor `new Date(year, monthIndex, day)` which
 * builds the date at local midnight — identical weekday in any runtime timezone
 * (no UTC drift). The prohibited form is the single-string `new Date(isoString)`
 * which is parsed as UTC midnight and shifts the local day in negative-offset zones.
 *
 * Private — not exported.
 */
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d); // local-time constructor — no UTC drift
}

/**
 * Returns true if the given `recurrence` applies on the given `date`.
 *
 * @param recurrence - A Recurrence discriminated union value from lib/types.ts
 * @param date - An ISO YYYY-MM-DD string (well-formed; callers validate at boundary)
 * @returns boolean — whether this recurrence is active on that date
 */
export function appliesOn(recurrence: Recurrence, date: string): boolean {
  switch (recurrence.kind) {
    case "just-today":
      return recurrence.date === date;

    case "every-day":
      return true;

    case "every-weekday": {
      const wd = parseLocalDate(date).getDay(); // 0=Sun…6=Sat
      return wd >= 1 && wd <= 5;
    }

    case "custom-range": {
      // Step 1: empty-weekdays guard — short-circuit (cheapest test first)
      if (recurrence.weekdays.length === 0) return false;

      // Step 2: inclusive range bound — ISO YYYY-MM-DD strings are lexicographically
      // ordered identically to chronological order, so plain string comparison is correct
      if (date < recurrence.start || date > recurrence.end) return false;

      // Step 3: weekday membership
      const wd = parseLocalDate(date).getDay(); // 0=Sun…6=Sat
      return recurrence.weekdays.includes(wd);
    }

    default: {
      // Exhaustiveness guard — tsc will error here if a new Recurrence kind is added
      // without updating this switch (same contract as assertNever in lib/types.ts).
      const _exhaustive: never = recurrence;
      throw new Error(
        `Unhandled recurrence kind: ${JSON.stringify(_exhaustive)}`,
      );
    }
  }
}
