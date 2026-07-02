/**
 * lib/history.ts — M9b: pure rollover function + ArchivedDay re-export.
 * M9c: additive dayScore(state, isoDate) helper (ADR-045 — history read-only).
 * M9d: additive weekScore(state, anchorISO) helper (ADR-045 — read-only, pure).
 * ADR-045: rollover(state, todayISO) archives the in-progress day and seeds a fresh one.
 * Pure module — no React, no localStorage, no clock reads.
 * The clock is read once at the usePersistedState boundary; todayISO is passed in.
 */

import type { PersistedState } from "./persist";
import type { AppState, ArchivedDay, Block, Brick, Recurrence } from "./types";
import { weekDates } from "./weekGrid";
import { monthDates } from "./yearGrid";
import { dayPct } from "./dharma";
import { currentDayState } from "./currentDayView";
import { uuid } from "./uuid";

// Re-export ArchivedDay for caller convenience
export type { ArchivedDay };

/**
 * NO_DATA — explicit no-data sentinel for dayScore.
 * A cell with no history entry and not today returns null (not 0).
 * Callers must use strict === null to distinguish a real 0-score archived day.
 */
export const NO_DATA = null;

/**
 * dayScore(state, isoDate) — M9c: pure per-day score lookup (ADR-045 read-only).
 *
 * Return contract:
 *   - isoDate in state.history → dayPct over that ArchivedDay (number in [0,100])
 *   - isoDate === state.currentDate → dayPct(state) over the live in-progress day
 *   - neither → NO_DATA (null)
 *
 * Precedence: history is checked first. In practice a date is in exactly one branch,
 * but when both match, the archived snapshot wins (the finished record is authoritative).
 *
 * Pure: reads no clock, writes nothing, mutates nothing. state may be frozen.
 */
export function dayScore(state: AppState, isoDate: string): number | null {
  // Branch 1: archived day — history wins even if currentDate also matches
  if (isoDate in state.history) {
    const archived = state.history[isoDate]!;
    // Build a structurally complete AppState-shaped object so dayPct is called
    // type-safely. dayPct reads only .blocks and .looseBricks (lib/dharma.ts:49).
    return dayPct({
      ...state,
      blocks: archived.blocks,
      categories: archived.categories,
      looseBricks: archived.looseBricks,
    });
  }

  // Branch 2: today's live in-progress day. Score only the blocks whose
  // recurrence applies today (currentDayState) so the Week/Month/Year "today"
  // cell matches the Day view hero and isn't diluted by other-day routines.
  if (isoDate === state.currentDate) {
    return dayPct(currentDayState(state));
  }

  // Branch 3: future / pre-start / past-missed — no data
  return NO_DATA;
}

/**
 * weekScore(state, anchorISO) — M9d: pure period aggregate (ADR-045 read-only).
 *
 * Returns the average dayScore over the week's seven Sun→Sat dates,
 * applying the honest-scoreboard rule (SG-m9d-01):
 *   - In-range non-future days are INCLUDED.
 *     * dayScore returns a number  → contribute that number.
 *     * dayScore returns NO_DATA (missed in-range past day) → contribute 0,
 *       AND count in the denominator (honest average, not inflated).
 *   - Future days (> state.currentDate) → EXCLUDED from both numerator and denominator.
 *   - Pre-start days (< state.programStart) → EXCLUDED from both.
 *   - Denominator === 0 (fully-future or fully-pre-start week) → returns NO_DATA.
 *
 * "Today" is state.currentDate — the clock is NEVER read here.
 * Pure function of (state, anchorISO). state may be frozen.
 */
export function weekScore(state: AppState, anchorISO: string): number | null {
  const dates = weekDates(anchorISO);
  const today = state.currentDate;
  const start = state.programStart;

  let numerator = 0;
  let denominator = 0;

  for (const d of dates) {
    // Exclude future days and pre-start days
    if (d > today) continue; // future
    if (d < start) continue; // pre-start

    // In-range non-future day — included
    denominator += 1;
    const score = dayScore(state, d);
    if (score !== null) {
      numerator += score;
    }
    // score === null (missed in-range past day) → contributes 0 (already default)
  }

  // No qualifying day → no-data sentinel (never divide by zero)
  if (denominator === 0) return NO_DATA;

  return numerator / denominator;
}

/**
 * monthScore(state, year, monthIndex) — M9e: pure period aggregate (ADR-046 read-only).
 *
 * Returns the average dayScore over every calendar day of (year, monthIndex),
 * applying the honest-scoreboard rule (identical to weekScore):
 *   - In-range non-future days (programStart ≤ d ≤ currentDate) → INCLUDED.
 *     * dayScore returns a number  → contribute that number.
 *     * dayScore returns NO_DATA (missed in-range past day) → contribute 0,
 *       AND count in the denominator (honest average, not inflated).
 *   - Future days (> state.currentDate) → EXCLUDED from both numerator and denominator.
 *   - Pre-start days (< state.programStart) → EXCLUDED from both.
 *   - Denominator === 0 (fully-future or fully-pre-start month) → returns NO_DATA.
 *
 * monthIndex is 0-indexed (0 = January … 11 = December), matching Date convention.
 * "Today" is state.currentDate — the clock is NEVER read here.
 * Pure function of (state, year, monthIndex). state may be frozen.
 */
export function monthScore(
  state: AppState,
  year: number,
  monthIndex: number,
): number | null {
  const dates = monthDates(year, monthIndex);
  const today = state.currentDate;
  const start = state.programStart;

  let numerator = 0;
  let denominator = 0;

  for (const d of dates) {
    if (d > today) continue; // future — excluded
    if (d < start) continue; // pre-start — excluded

    // In-range non-future day — included
    denominator += 1;
    const score = dayScore(state, d);
    if (score !== null) {
      numerator += score;
    }
    // score === null (missed in-range past day) → contributes 0 (already default)
  }

  // No qualifying day → no-data sentinel (never divide by zero)
  if (denominator === 0) return NO_DATA;

  return numerator / denominator;
}

/**
 * yearScore(state, year) — M9e: pure period aggregate (ADR-046 read-only).
 *
 * Returns the average dayScore over ALL calendar days of the given year,
 * applying the SAME honest-scoreboard rule as weekScore and monthScore.
 * This is day-averaging directly — NOT the mean of the twelve monthScore values
 * (SG-m9e-01: averaging monthScores would over-weight short/sparse months).
 *
 * Builds the year's full date list by concatenating monthDates for all 12 months
 * (365 or 366 dates — leap-year aware automatically), then applies per-date averaging.
 *
 * "Today" is state.currentDate — the clock is NEVER read here.
 * Pure function of (state, year). state may be frozen.
 */
export function yearScore(state: AppState, year: number): number | null {
  const today = state.currentDate;
  const start = state.programStart;

  let numerator = 0;
  let denominator = 0;

  // Iterate all 12 months, all days within each month
  for (let m = 0; m < 12; m++) {
    const dates = monthDates(year, m);
    for (const d of dates) {
      if (d > today) continue; // future — excluded
      if (d < start) continue; // pre-start — excluded

      // In-range non-future day — included
      denominator += 1;
      const score = dayScore(state, d);
      if (score !== null) {
        numerator += score;
      }
      // score === null (missed in-range past day) → contributes 0 (already default)
    }
  }

  // No qualifying day → no-data sentinel (never divide by zero)
  if (denominator === 0) return NO_DATA;

  return numerator / denominator;
}

/**
 * rollover(state, todayISO) — pure function that transitions the persisted state
 * to a new day. Never reads the clock; todayISO is supplied by the caller.
 *
 * Steps per plan.md § The rollover algorithm:
 * 1. DETECT:  if state.currentDate >= todayISO → return state unchanged (same reference).
 * 2. ARCHIVE: deep-clone the in-progress day into history[state.currentDate].
 * 3. SEED:    carry the recurring routine forward for todayISO (fresh uuids, completion reset).
 * 4. ADVANCE: return a new PersistedState with history', currentDate=todayISO, fresh collections.
 *
 * AC #9 (archived-day immutability): structuredClone ensures later mutation of the
 * fresh in-progress day cannot reach history entries.
 *
 * AC #9, purity: rollover never mutates its input state or any of its nested arrays.
 *
 * AC #10 (no intervening days): single-pass — only state.currentDate is archived.
 */
export function rollover(
  state: PersistedState,
  todayISO: string,
): PersistedState {
  // Step 1: DETECT — ISO YYYY-MM-DD strings are lexicographically == chronologically ordered.
  // currentDate >= todayISO means: already today, or the should-not-occur future case.
  if (state.currentDate >= todayISO) {
    return state; // same reference — AC #6 no-op
  }

  // Step 2: ARCHIVE — deep snapshot of the in-progress day under the old date key.
  const archived: ArchivedDay = structuredClone({
    blocks: state.blocks,
    categories: state.categories,
    looseBricks: state.looseBricks,
  });
  const newHistory = { ...state.history, [state.currentDate]: archived };

  // Step 3: SEED — compute the fresh day for todayISO.
  const { freshBlocks, freshLoose } = seedFreshDay(
    state.blocks,
    state.looseBricks,
    todayISO,
  );

  // Step 4: ADVANCE — return a new object with the rolled state.
  return {
    ...state,
    schemaVersion: 3, // M5 bump: v2→v3 (PersistedState schemaVersion)
    history: newHistory,
    currentDate: todayISO,
    blocks: freshBlocks,
    categories: state.categories, // carried forward verbatim (AC #13)
    looseBricks: freshLoose,
  };
}

/**
 * recurrenceExpired — M11: is this recurrence permanently done as of todayISO?
 *
 * Only genuine one-offs expire:
 *   - just-today  → expired once its date is strictly before today.
 *   - custom-range → expired once its end is strictly before today.
 * Repeating recurrences (every-day / every-weekday / every-weekend) never
 * expire — they carry forward every day; the Day view filters which apply on a
 * given date (lib/currentDayView.ts). Nothing here is a clock read (ADR-020/046).
 */
function recurrenceExpired(r: Recurrence, todayISO: string): boolean {
  if (r.kind === "just-today") return r.date < todayISO;
  if (r.kind === "custom-range") return r.end < todayISO;
  return false;
}

/**
 * seedFreshDay — M11: compute freshBlocks + freshLoose for todayISO.
 *
 * The routine is a set of persistent recurring templates (spec m11). Rollover
 * carries EVERY still-live block and brick forward — by its OWN recurrence — with
 * completion reset, so today is a fresh copy to fill in. Prior behavior dropped
 * empty blocks and every non-timed brick nightly (defects D1/D2), which silently
 * erased the whole routine.
 *
 * - A block carries iff its own recurrence is not expired. It carries even with
 *   zero bricks (an empty recurring time-block is a valid routine item).
 * - A brick carries iff its effective recurrence (its own, else its parent
 *   block's) is not expired — independent of hasDuration.
 * - Loose bricks carry only when they carry their own non-expired recurrence
 *   (no parent to inherit from); a loose brick with no recurrence is a one-off
 *   and does not survive rollover (unchanged tray behavior).
 * - Each carried block/brick gets a fresh uuid; parentBlockId is re-pointed.
 */
function seedFreshDay(
  blocks: Block[],
  looseBricks: Brick[],
  todayISO: string,
): { freshBlocks: Block[]; freshLoose: Brick[] } {
  const freshBlocks: Block[] = [];

  for (const block of blocks) {
    // Drop only a genuinely expired one-off block (past just-today / ended range).
    if (recurrenceExpired(block.recurrence, todayISO)) continue;

    const newBlockId = uuid();
    const seededBricks: Brick[] = [];
    for (const brick of block.bricks) {
      // Block bricks inherit the block's recurrence when they have none.
      const seeded = seedBrick(brick, todayISO, newBlockId, block.recurrence);
      if (seeded !== null) seededBricks.push(seeded);
    }

    // Carry the block even when empty — the block itself is a recurring item.
    freshBlocks.push({
      ...block,
      id: newBlockId, // fresh uuid (plan § SG-m9b-01)
      bricks: seededBricks,
    });
  }

  // Loose bricks have no parent to inherit from → parentRecurrence = null.
  const freshLoose: Brick[] = [];
  for (const brick of looseBricks) {
    const seeded = seedBrick(brick, todayISO, null, null);
    if (seeded !== null) freshLoose.push(seeded);
  }

  return { freshBlocks, freshLoose };
}

/**
 * seedBrick — M11: return a seeded copy of a brick for the new day, or null if it
 * should not carry (a genuinely expired one-off).
 *
 * Effective recurrence = the brick's own recurrence, else the parent block's
 * (`parentRecurrence`) when the brick has none. Loose bricks have no parent, so
 * a loose brick with no recurrence is a one-off and does NOT carry.
 *
 * The carry decision is independent of `hasDuration` — a plain habit brick
 * ("Meditation ✓", "Pushups 20 reps") recurs exactly like a timed one (fixes
 * defect D1, which dropped every non-timed brick nightly).
 *
 * Completion reset (spec AC-2):
 * - tick  → done: false
 * - units → done: 0
 * - timer → elapsedSec: 0
 */
function seedBrick(
  brick: Brick,
  todayISO: string,
  parentBlockId: string | null,
  parentRecurrence: Recurrence | null,
): Brick | null {
  const effective = brick.recurrence ?? parentRecurrence;
  // No effective recurrence (loose one-off) → does not carry.
  if (!effective) return null;
  // Genuinely expired one-off → does not carry.
  if (recurrenceExpired(effective, todayISO)) return null;

  const newId = uuid();

  if (brick.kind === "tick") {
    return { ...brick, id: newId, parentBlockId, done: false };
  }
  if (brick.kind === "timer") {
    return { ...brick, id: newId, parentBlockId, elapsedSec: 0 };
  }
  // kind === "units"
  return { ...brick, id: newId, parentBlockId, done: 0 };
}
