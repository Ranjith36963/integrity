/**
 * lib/data.ts — Re-authored for M3 (plan.md § Data model).
 *
 * defaultState() returns the empty AppState per ADR-039 (no factory data).
 * M3: adds looseBricks: [] to defaultState and ADD_BRICK case to reducer.
 * Reducer implements ADD_BLOCK + ADD_CATEGORY + ADD_BRICK with assertNever exhaustiveness.
 * M4e: ADD_BRICK arm enforces hasDuration presence invariant. Exports withDurationDefaults.
 * M4f: collapsed to 5 action arms (removed START/STOP/TICK/SET_TIMER_MINUTES + LOG_GOAL_BRICK;
 *      added SET_UNITS_DONE). defaultState drops runningTimerBrickId. Adds findUnitsBrickById.
 *
 * ADD_BRICK routing: parentBlockId === null → looseBricks[]; else → matching block.bricks[].
 * No persistence in M3. Page refresh clears state. M8 lands localStorage rehydration.
 */

import type { AppState, Action, Brick } from "./types";
import { assertNever } from "./types";

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
    case "ADD_CATEGORY":
      return { ...state, categories: [...state.categories, action.category] };
    case "ADD_BRICK": {
      const b = action.brick;
      // M4f: defensive kind guard (runtime defense-in-depth against stale fixtures).
      // TypeScript prevents kind:"goal"/"time" at compile time, but old fixtures may slip through.
      const k = b.kind as string;
      if (k !== "tick" && k !== "units") return state;
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
      if (b.parentBlockId === null) {
        // Standalone brick → looseBricks
        return {
          ...state,
          looseBricks: [...state.looseBricks, b],
        };
      }
      // Inside-block brick → find block by id and append to its bricks[]
      return {
        ...state,
        blocks: state.blocks.map((bl) =>
          bl.id === b.parentBlockId ? { ...bl, bricks: [...bl.bricks, b] } : bl,
        ),
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
    default:
      return assertNever(action);
  }
}
