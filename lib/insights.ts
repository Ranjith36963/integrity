/**
 * lib/insights.ts — calendar-view stat insights.
 *
 * Derived KPIs that sit BELOW the existing Week / Month / Year grids and
 * turn dead bottom space into useful "what did I do" context. All read-
 * only on state.history + state.blocks — no schema changes, no new actions.
 *
 * Numbers chosen to mean something specific, not decoration:
 *   - longestStreak: consecutive days with score > 0
 *   - avgDailyScore: mean of completed days (skips no-data / future)
 *   - daysCompleted: count where score >= 100
 *   - busiestHour: most-occupied hour across history (returns "HH:00" | null)
 */
import type { AppState } from "./types";
import { dayScore } from "./history";

/**
 * Iterate ISO dates from fromIso to toIso inclusive.
 * Stays within local-date arithmetic — works across DST boundaries because
 * we only add/subtract 1 day at a time and compare ISO strings.
 */
function* eachDay(fromIso: string, toIso: string): Generator<string> {
  let cur = fromIso;
  while (cur <= toIso) {
    yield cur;
    // ISO YYYY-MM-DD → next day
    const d = new Date(`${cur}T12:00:00Z`); // mid-day UTC, DST-safe
    d.setUTCDate(d.getUTCDate() + 1);
    cur = d.toISOString().slice(0, 10);
  }
}

/**
 * Longest run of consecutive days with score > 0 within [fromIso, toIso].
 * Returns 0 when no day in range has score > 0.
 *
 * Streak-freeze: a day in state.freezes counts as "in the streak" even
 * when its score is null/0. The user spent a freeze to protect that day;
 * honoring it is the entire point of the mechanic.
 */
export function longestStreak(
  state: AppState,
  fromIso: string,
  toIso: string,
): number {
  let best = 0;
  let cur = 0;
  const freezes = state.freezes ?? {};
  for (const iso of eachDay(fromIso, toIso)) {
    const s = dayScore(state, iso);
    const counts = (s !== null && s > 0) || freezes[iso] === true;
    if (counts) {
      cur += 1;
      if (cur > best) best = cur;
    } else {
      cur = 0;
    }
  }
  return best;
}

/**
 * Mean dayScore across [fromIso, toIso]. Skips days with score === null
 * (future / pre-program-start). Returns null when no scored days exist.
 */
export function avgDailyScore(
  state: AppState,
  fromIso: string,
  toIso: string,
): number | null {
  let sum = 0;
  let n = 0;
  for (const iso of eachDay(fromIso, toIso)) {
    const s = dayScore(state, iso);
    if (s !== null) {
      sum += s;
      n += 1;
    }
  }
  return n === 0 ? null : Math.round(sum / n);
}

/**
 * Count of days where score >= 100 (the "day complete" threshold).
 */
export function daysCompleted(
  state: AppState,
  fromIso: string,
  toIso: string,
): number {
  let n = 0;
  for (const iso of eachDay(fromIso, toIso)) {
    const s = dayScore(state, iso);
    if (s !== null && s >= 100) n += 1;
  }
  return n;
}

/**
 * Streak-freeze: count of freezes used in the same calendar month as
 * `isoDate`. Caller passes today's ISO; we filter state.freezes for
 * matching YYYY-MM prefix. Used by the UI to gate the "Use freeze"
 * affordance + display the remaining quota.
 */
export const FREEZES_PER_MONTH = 2;

/**
 * Current streak — consecutive scored OR frozen days ending at `today`.
 * Walks BACKWARD from today until a non-scoring + non-frozen day is hit.
 * Distinct from longestStreak (which scans a window for the max run).
 *
 * - today's score counts only if > 0
 * - frozen days count regardless of score
 * - the FIRST gap (non-scoring + not-frozen) breaks the count
 *
 * Returns 0 when today itself is neither scored nor frozen.
 */
export function currentStreak(state: AppState, todayIso: string): number {
  const freezes = state.freezes ?? {};
  let n = 0;
  let cursor = todayIso;
  // Hard cap at 10 years of walking — defends against an infinite loop
  // if the cursor logic ever desyncs. Real streaks max ~365 anyway.
  for (let safety = 0; safety < 3650; safety++) {
    const s = dayScore(state, cursor);
    const counts = (s !== null && s > 0) || freezes[cursor] === true;
    if (!counts) break;
    n += 1;
    // Step backward one day. Mid-day UTC math keeps this DST-safe; the
    // ISO output is sliced off, not date-shifted.
    const d = new Date(`${cursor}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    cursor = d.toISOString().slice(0, 10);
  }
  return n;
}

/**
 * Milestones in the brick→empire metaphor. When the current streak
 * lands ON one of these exact numbers for the first time, the UI
 * surfaces the Empire-Glimpse cinematic.
 */
export const STREAK_MILESTONES = [7, 30, 100, 365] as const;
export type StreakMilestone = (typeof STREAK_MILESTONES)[number];

/**
 * Returns the milestone NUMBER if `streak` equals one of the milestone
 * values exactly, null otherwise. UI then checks localStorage to
 * decide whether to actually show the cinematic.
 */
export function streakMilestone(streak: number): StreakMilestone | null {
  for (const m of STREAK_MILESTONES) if (m === streak) return m;
  return null;
}

export function freezesUsedThisMonth(state: AppState, isoDate: string): number {
  const prefix = isoDate.slice(0, 7);
  const freezes = state.freezes ?? {};
  return Object.keys(freezes).filter((k) => k.startsWith(prefix)).length;
}

export function freezesRemainingThisMonth(
  state: AppState,
  isoDate: string,
): number {
  return Math.max(0, FREEZES_PER_MONTH - freezesUsedThisMonth(state, isoDate));
}

/**
 * Hour-of-day with the most scheduled blocks across history + today's
 * blocks. Returns "HH:00" or null when there are no blocks at all.
 *
 * Counts ANY block whose [start, end) interval includes that hour. So a
 * 07:00→09:00 block adds to both 07:00 and 08:00 buckets. This biases the
 * answer toward the actual "where do you spend time," not just "where do
 * you start things."
 */
export function busiestHour(state: AppState): string | null {
  const buckets = new Array<number>(24).fill(0);
  for (const block of state.blocks) {
    const startHr = Number(block.start.slice(0, 2));
    const endHr = block.end ? Number(block.end.slice(0, 2)) : startHr + 1;
    for (let h = startHr; h < Math.min(24, Math.max(startHr + 1, endHr)); h++) {
      buckets[h] += 1;
    }
  }
  let best = -1;
  let bestHour = -1;
  for (let h = 0; h < 24; h++) {
    if (buckets[h] > best) {
      best = buckets[h];
      bestHour = h;
    }
  }
  if (best <= 0 || bestHour < 0) return null;
  return `${String(bestHour).padStart(2, "0")}:00`;
}
