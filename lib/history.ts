/**
 * lib/history.ts — M9b: pure rollover function + ArchivedDay re-export.
 * M9c: additive dayScore(state, isoDate) helper (ADR-045 — history read-only).
 * M9d: additive weekScore(state, anchorISO) helper (ADR-045 — read-only, pure).
 * ADR-045: rollover(state, todayISO) archives the in-progress day and seeds a fresh one.
 * Pure module — no React, no localStorage, no clock reads.
 * The clock is read once at the usePersistedState boundary; todayISO is passed in.
 */

import type { PersistedState } from "./persist";
import type { AppState, ArchivedDay, Block, Brick } from "./types";
import { weekDates } from "./weekGrid";
import { dayPct } from "./dharma";
import { appliesOn } from "./appliesOn";
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

  // Branch 2: today's live in-progress day
  if (isoDate === state.currentDate) {
    return dayPct(state);
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
 * rollover(state, todayISO) — pure function that transitions the persisted state
 * to a new day. Never reads the clock; todayISO is supplied by the caller.
 *
 * Steps per plan.md § The rollover algorithm:
 * 1. DETECT:  if state.currentDate >= todayISO → return state unchanged (same reference).
 * 2. ARCHIVE: deep-clone the in-progress day into history[state.currentDate].
 * 3. SEED:    compute a fresh day for todayISO via appliesOn + fresh uuids.
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
    schemaVersion: 2,
    history: newHistory,
    currentDate: todayISO,
    blocks: freshBlocks,
    categories: state.categories, // carried forward verbatim (AC #13)
    looseBricks: freshLoose,
  };
}

/**
 * seedFreshDay — compute freshBlocks + freshLoose for todayISO.
 * Each seeded brick gets a fresh uuid and a reset done value.
 * Blocks carry forward iff they have ≥1 applicable recurring brick.
 * parentBlockId is re-pointed to the new block id (plan § parentBlockId consistency).
 */
function seedFreshDay(
  blocks: Block[],
  looseBricks: Brick[],
  todayISO: string,
): { freshBlocks: Block[]; freshLoose: Brick[] } {
  const freshBlocks: Block[] = [];

  for (const block of blocks) {
    // Filter this block's bricks to only those that apply today
    const seededBricks: Brick[] = [];
    const newBlockId = uuid();

    for (const brick of block.bricks) {
      const seeded = seedBrick(brick, todayISO, newBlockId);
      if (seeded !== null) {
        seededBricks.push(seeded);
      }
    }

    // Block carries iff ≥1 brick applies today (AC #13)
    if (seededBricks.length > 0) {
      freshBlocks.push({
        ...block,
        id: newBlockId, // fresh uuid (plan § SG-m9b-01)
        bricks: seededBricks,
      });
    }
  }

  // Seed loose bricks
  const freshLoose: Brick[] = [];
  for (const brick of looseBricks) {
    const seeded = seedBrick(brick, todayISO, null);
    if (seeded !== null) {
      freshLoose.push(seeded);
    }
  }

  return { freshBlocks, freshLoose };
}

/**
 * seedBrick — return a seeded copy of a brick for the new day, or null if it should not be seeded.
 *
 * Per-brick seeding rule (plan § Fresh-day seeding detail):
 * - hasDuration === false → no recurrence → never seeded (AC #11)
 * - hasDuration === true AND appliesOn(recurrence, todayISO) → seeded with fresh uuid + done reset
 * - hasDuration === true AND !appliesOn → dropped (AC #11)
 *
 * done reset (AC #12):
 * - kind "tick" → done: false
 * - kind "units" → done: 0
 */
function seedBrick(
  brick: Brick,
  todayISO: string,
  parentBlockId: string | null,
): Brick | null {
  // hasDuration: false → no recurrence, never seeded
  if (!brick.hasDuration) return null;

  // hasDuration: true → recurrence is required (presence invariant)

  if (!appliesOn(brick.recurrence!, todayISO)) return null;

  const newId = uuid();

  if (brick.kind === "tick") {
    return {
      ...brick,
      id: newId,
      parentBlockId,
      done: false, // reset (AC #12)
    };
  }

  // kind === "units"
  return {
    ...brick,
    id: newId,
    parentBlockId,
    done: 0, // reset (AC #12)
  };
}
