/**
 * lib/pastEdit.ts — M11 Step 3b: "Editing past days" policy (DEC-2).
 *
 * The user chooses in Settings how far back a past day may be back-logged:
 *   0 → read-only truth (default; the past is locked, history is incorruptible)
 *   1 → yesterday only
 *   3 → up to 3 days back (rolling window, never more)
 *
 * canEditPastDay is the single gate every edit path consults. Pure: reads only
 * state.currentDate (never the clock — ADR-020/046) and does string/date math on
 * ISO dates. A future or non-archived date is never editable.
 */
import type { AppState } from "./types";

export type PastEditDays = 0 | 1 | 3;

/** A single back-log edit to a brick on an archived day (M11 DEC-2). */
export type ArchivedBrickEdit =
  | { kind: "toggle-tick" }
  | { kind: "units"; done: number }
  | { kind: "timer"; elapsedSec: number };

/** The configured window, normalized to a valid value (default 0 = read-only). */
export function pastEditDaysOf(state: AppState): PastEditDays {
  const v = state.pastEditDays;
  return v === 1 || v === 3 ? v : 0;
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d); // local — no UTC drift
}

/** Whole calendar days from `a` to `b` (b - a); negative if b is before a. */
export function daysBetween(a: string, b: string): number {
  const ms = parseLocalDate(b).getTime() - parseLocalDate(a).getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * True when the archived day `iso` may be back-logged given the current setting.
 * Requirements: the setting allows a window > 0, `iso` is an archived past day
 * (in history and strictly before currentDate), and it falls within the window.
 */
export function canEditPastDay(state: AppState, iso: string): boolean {
  const window = pastEditDaysOf(state);
  if (window === 0) return false;
  if (!(iso in state.history)) return false; // only stored days
  if (iso >= state.currentDate) return false; // must be strictly in the past
  const diff = daysBetween(iso, state.currentDate);
  return diff >= 1 && diff <= window;
}
