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
 */
export function longestStreak(
  state: AppState,
  fromIso: string,
  toIso: string,
): number {
  let best = 0;
  let cur = 0;
  for (const iso of eachDay(fromIso, toIso)) {
    const s = dayScore(state, iso);
    if (s !== null && s > 0) {
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
