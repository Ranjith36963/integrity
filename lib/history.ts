/**
 * lib/history.ts — M9b: pure rollover function + ArchivedDay re-export.
 * ADR-045: rollover(state, todayISO) archives the in-progress day and seeds a fresh one.
 * Pure module — no React, no localStorage, no clock reads.
 * The clock is read once at the usePersistedState boundary; todayISO is passed in.
 */

import type { PersistedState } from "./persist";
import type { ArchivedDay, Block, Brick } from "./types";
import { appliesOn } from "./appliesOn";
import { uuid } from "./uuid";

// Re-export ArchivedDay for caller convenience
export type { ArchivedDay };

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
