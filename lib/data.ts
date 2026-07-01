/**
 * lib/data.ts — Re-authored for M3 (plan.md § Data model).
 *
 * defaultState() returns the empty AppState per ADR-039 (no factory data).
 * M3: adds looseBricks: [] to defaultState and ADD_BRICK case to reducer.
 * Reducer implements ADD_BLOCK + ADD_CATEGORY + ADD_BRICK with assertNever exhaustiveness.
 * M4e: ADD_BRICK arm enforces hasDuration presence invariant. Exports withDurationDefaults.
 * M4f: collapsed to 5 action arms (removed START/STOP/TICK/SET_TIMER_MINUTES + LOG_GOAL_BRICK;
 *      added SET_UNITS_DONE). defaultState drops runningTimerBrickId. Adds findUnitsBrickById.
 * M8: persistence wired — defaultState gains programStart: today() (ADR-044).
 * M9b: schema v2 — day rollover + history. defaultState gains currentDate + history (ADR-045).
 *
 * ADD_BRICK routing: parentBlockId === null → looseBricks[]; else → matching block.bricks[].
 */

import type { AppState, Action, Brick } from "./types";
import { assertNever } from "./types";
import { today } from "./dharma";
import { DEFAULT_DAY_START } from "./dayWindow";
import { findOverlaps, selectAllTimedItems } from "./overlap";

/**
 * Migration helper for pre-M4e in-memory brick literals.
 * Returns the brick unchanged if hasDuration is already a boolean;
 * otherwise fills hasDuration: false and leaves start/end/recurrence absent
 * (matching the presence invariant for hasDuration === false).
 * Used to migrate test fixtures and any in-memory seeded state defensively at boot.
 * Resolves SG-m4e-06 (helper-based migration).
 */
export function withDurationDefaults<T extends Brick>(brick: T): T {
  // Use `in` because the field is optional at the TS-shape level pre-migration but always present post-migration.
  if (
    "hasDuration" in brick &&
    typeof (brick as Brick).hasDuration === "boolean"
  )
    return brick;
  return { ...brick, hasDuration: false };
}

export function defaultState(): AppState {
  return {
    blocks: [],
    categories: [],
    looseBricks: [],
    programStart: today(), // M8 — stamped to today on first run (ADR-044)
    currentDate: today(), // M9b — in-progress day date (ADR-045)
    history: {}, // M9b — archived days map (ADR-045)
    deletions: {}, // M5 — per-day block override map (ADR-018)
    dayStart: DEFAULT_DAY_START, // day anchor — wake-to-wake (04:00 default)
  };
}

/**
 * findUnitsBrickById — M4f helper. Searches state for a units-kind brick by id.
 * Searches looseBricks first, then block.bricks. Returns the units-kind brick with
 * the given id, or null if not found or if the brick is a tick kind.
 */
export function findUnitsBrickById(
  state: AppState,
  id: string,
): Extract<Brick, { kind: "units" }> | null {
  // Search loose bricks
  for (const b of state.looseBricks) {
    if (b.id === id && b.kind === "units") {
      return b as Extract<Brick, { kind: "units" }>;
    }
  }
  // Search nested bricks
  for (const block of state.blocks) {
    for (const b of block.bricks) {
      if (b.id === id && b.kind === "units") {
        return b as Extract<Brick, { kind: "units" }>;
      }
    }
  }
  return null;
}

/**
 * Pure reducer: returns a new AppState for every action.
 * Switch is exhaustive via assertNever — adding an Action union member without
 * a matching case here is a TypeScript compile error.
 */
export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "ADD_BLOCK":
      return { ...state, blocks: [...state.blocks, action.block] };
    case "SET_DAY_START":
      // User's wake time — the day anchor, per day-type. Ignore malformed values.
      if (!/^\d{2}:\d{2}$/.test(action.dayStart)) return state;
      return action.kind === "weekend"
        ? { ...state, weekendDayStart: action.dayStart }
        : { ...state, dayStart: action.dayStart };
    case "ADD_CATEGORY":
      return { ...state, categories: [...state.categories, action.category] };
    case "ADD_BRICK": {
      const b = action.brick;
      // M4f: defensive kind guard (runtime defense-in-depth against stale fixtures).
      // TypeScript prevents kind:"goal"/"time" at compile time, but old fixtures may slip through.
      const k = b.kind as string;
      if (k !== "tick" && k !== "units" && k !== "timer") return state;
      // M4e: Presence invariant guard (defense-in-depth — UI should never construct an invalid action).
      // hasDuration === true IFF all three of start/end/recurrence are present.
      const allPresent =
        b.start !== undefined &&
        b.end !== undefined &&
        b.recurrence !== undefined;
      if (b.hasDuration === true && !allPresent) return state;
      if (
        b.hasDuration === false &&
        (b.start !== undefined ||
          b.end !== undefined ||
          b.recurrence !== undefined)
      )
        return state;
      // M7e: flip firstBrickShown on the first successful ADD_BRICK (idempotent).
      // Validity guards above run BEFORE this flip — a rejected dispatch never reaches here.
      const firstBrickShown =
        state.firstBrickShown !== true ? true : state.firstBrickShown;

      if (b.parentBlockId === null) {
        // Standalone brick → looseBricks
        return {
          ...state,
          looseBricks: [...state.looseBricks, b],
          firstBrickShown,
        };
      }
      // Inside-block brick → find block by id and append to its bricks[]
      return {
        ...state,
        blocks: state.blocks.map((bl) =>
          bl.id === b.parentBlockId ? { ...bl, bricks: [...bl.bricks, b] } : bl,
        ),
        firstBrickShown,
      };
    }
    case "LOG_TICK_BRICK": {
      // Flip done on the matching tick brick; no-op if id not found or kind !== "tick"
      const flip = (b: Brick): Brick =>
        b.id === action.brickId && b.kind === "tick"
          ? { ...b, done: !b.done }
          : b;
      return {
        ...state,
        blocks: state.blocks.map((bl) => ({
          ...bl,
          bricks: bl.bricks.map(flip),
        })),
        looseBricks: state.looseBricks.map(flip),
      };
    }
    case "SET_UNITS_DONE": {
      // Absolute-value write: sets done = Math.max(0, Math.floor(action.done)).
      // Identity short-circuit: returns original state reference when done is unchanged.
      // No-op: returns original state when brickId not found or brick is tick kind.
      const clamped = Math.max(0, Math.floor(action.done));
      const apply = (b: Brick): Brick => {
        if (b.id !== action.brickId) return b;
        if (b.kind !== "units") return b; // AC #9: no-op on tick brick
        if (b.done === clamped) return b; // identity short-circuit
        return { ...b, done: clamped };
      };
      // Same array-identity preservation pattern as the old LOG_GOAL_BRICK arm.
      let blocksChanged = false;
      const newBlocks = state.blocks.map((bl) => {
        let blockChanged = false;
        const bricks = bl.bricks.map((br) => {
          const out = apply(br);
          if (out !== br) blockChanged = true;
          return out;
        });
        if (!blockChanged) return bl;
        blocksChanged = true;
        return { ...bl, bricks };
      });
      let looseChanged = false;
      const newLoose = state.looseBricks.map((br) => {
        const out = apply(br);
        if (out !== br) looseChanged = true;
        return out;
      });
      if (!blocksChanged && !looseChanged) return state; // AC #8: missing id ⇒ unchanged
      return {
        ...state,
        blocks: blocksChanged ? newBlocks : state.blocks,
        looseBricks: looseChanged ? newLoose : state.looseBricks,
      };
    }
    case "SET_TIMER_ELAPSED": {
      // Absolute write of accumulated elapsed seconds on a timer brick.
      // Mirrors SET_UNITS_DONE: clamp to ≥0, identity short-circuit, no-op on
      // non-timer / missing id.
      const clamped = Math.max(0, Math.floor(action.elapsedSec));
      const apply = (b: Brick): Brick => {
        if (b.id !== action.brickId) return b;
        if (b.kind !== "timer") return b;
        if (b.elapsedSec === clamped) return b;
        return { ...b, elapsedSec: clamped };
      };
      let blocksChanged = false;
      const newBlocks = state.blocks.map((bl) => {
        let blockChanged = false;
        const bricks = bl.bricks.map((br) => {
          const out = apply(br);
          if (out !== br) blockChanged = true;
          return out;
        });
        if (!blockChanged) return bl;
        blocksChanged = true;
        return { ...bl, bricks };
      });
      let looseChanged = false;
      const newLoose = state.looseBricks.map((br) => {
        const out = apply(br);
        if (out !== br) looseChanged = true;
        return out;
      });
      if (!blocksChanged && !looseChanged) return state;
      return {
        ...state,
        blocks: blocksChanged ? newBlocks : state.blocks,
        looseBricks: looseChanged ? newLoose : state.looseBricks,
      };
    }
    case "DELETE_BLOCK_TODAY": {
      // Sets deletions[`${currentDate}:${blockId}`] = true (ADR-018, ADR-020).
      // state.blocks is untouched — the template survives (AC #6).
      // Idempotent: re-dispatching sets the same key again (harmless).
      // The key is set unconditionally even if blockId is not in state.blocks (harmless).
      const key = `${state.currentDate}:${action.blockId}`;
      return {
        ...state,
        deletions: { ...state.deletions, [key]: true },
      };
    }
    case "DELETE_BLOCK_ALL": {
      // Removes the block template from state.blocks only.
      // state.history is NOT touched (ADR-045 — history is read-only).
      // state.deletions is NOT pruned — stale keys for the removed block are left in place (SG-m5-06).
      // R7-ROOT-M5/M6-P1 no-op short-circuit: if the blockId is not present,
      // return the original state reference so memoization callers
      // (useMemo over state.blocks) don't re-fire. Matches the DELETE_BRICK /
      // SET_UNITS_DONE no-op identity discipline.
      if (state.blocks.every((b) => b.id !== action.blockId)) return state;
      return {
        ...state,
        blocks: state.blocks.filter((b) => b.id !== action.blockId),
      };
    }
    case "DELETE_BRICK": {
      // Removes the brick with action.brickId from whichever container holds it.
      // Mirrors the SET_UNITS_DONE array-identity pattern:
      // returns the original state reference when nothing changed (no-op on missing id).
      let blocksChanged = false;
      const newBlocks = state.blocks.map((bl) => {
        const before = bl.bricks.length;
        const filtered = bl.bricks.filter((br) => br.id !== action.brickId);
        if (filtered.length === before) return bl;
        blocksChanged = true;
        return { ...bl, bricks: filtered };
      });
      const newLoose = state.looseBricks.filter(
        (br) => br.id !== action.brickId,
      );
      const looseChanged = newLoose.length !== state.looseBricks.length;
      if (!blocksChanged && !looseChanged) return state; // no-op: original reference
      return {
        ...state,
        blocks: blocksChanged ? newBlocks : state.blocks,
        looseBricks: looseChanged ? newLoose : state.looseBricks,
      };
    }
    case "REORDER_BLOCK": {
      // M6: Re-times a block template (all-future semantics, ADR-045).
      // The overlap engine probes the candidate slot — if any timed item overlaps
      // (excluding the block being dragged via excludeId), return state unchanged.
      // `state.history` is NEVER touched (ADR-045 — AC #7).
      const candidate = {
        start: action.newStart,
        end: action.newEnd ?? "24:00", // open-ended blocks probe to 24:00
      };
      const hits = findOverlaps(
        candidate,
        selectAllTimedItems(state),
        action.blockId,
      );
      if (hits.length > 0) return state; // overlap rejection — UI handles snap-back
      return {
        ...state,
        blocks: state.blocks.map((b) => {
          if (b.id !== action.blockId) return b;
          // Build the updated block without the `end` key so open-ended
          // blocks (newEnd: null) preserve `end: undefined` (no key present).
          // eslint-disable-next-line @typescript-eslint/no-unused-vars -- intentionally omit `end` before re-adding
          const { end: _end, ...rest } = b;
          return action.newEnd !== null
            ? { ...rest, start: action.newStart, end: action.newEnd }
            : { ...rest, start: action.newStart };
        }),
      };
    }
    case "REORDER_BRICK_IN_BLOCK": {
      // M6: In-block brick array shuffle.
      // Bounds check: fromIndex and toIndex must both be in [0, bricks.length).
      // Identity short-circuit: fromIndex === toIndex → return state unchanged.
      // The overlap engine is NOT invoked — brick reorder cannot change time windows.
      // `state.history` is NEVER touched (ADR-045 — AC #9).
      const block = state.blocks.find((b) => b.id === action.blockId);
      if (!block) return state; // no-op on missing block
      const len = block.bricks.length;
      const { fromIndex, toIndex } = action;
      if (fromIndex === toIndex) return state; // identity short-circuit
      if (fromIndex < 0 || fromIndex >= len) return state; // out of bounds
      if (toIndex < 0 || toIndex >= len) return state; // out of bounds
      // Immutable splice: remove fromIndex, insert at toIndex (post-removal index)
      const next = [...block.bricks];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return {
        ...state,
        blocks: state.blocks.map((b) =>
          b.id === action.blockId ? { ...b, bricks: next } : b,
        ),
      };
    }
    case "FREEZE_DAY": {
      // Streak-freeze: marks an ISO date as "scored" for streak purposes.
      // Cap of 2 freezes per calendar month (YYYY-MM prefix of the isoDate).
      // Idempotent: re-freezing an already-frozen day returns state unchanged.
      // No-op silently when the per-month cap is exhausted — UI guards
      // disable the affordance when count is already at the limit.
      const { isoDate } = action;
      const freezes = state.freezes ?? {};
      if (freezes[isoDate]) return state; // already frozen
      const monthPrefix = isoDate.slice(0, 7); // "YYYY-MM"
      const monthCount = Object.keys(freezes).filter((k) =>
        k.startsWith(monthPrefix),
      ).length;
      if (monthCount >= 2) return state; // cap exhausted — silent no-op
      return {
        ...state,
        freezes: { ...freezes, [isoDate]: true },
      };
    }
    default:
      return assertNever(action);
  }
}
