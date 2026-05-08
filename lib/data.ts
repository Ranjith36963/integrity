/**
 * lib/data.ts — Re-authored for M3 (plan.md § Data model).
 *
 * defaultState() returns the empty AppState per ADR-039 (no factory data).
 * M3: adds looseBricks: [] to defaultState and ADD_BRICK case to reducer.
 * Reducer implements ADD_BLOCK + ADD_CATEGORY + ADD_BRICK with assertNever exhaustiveness.
 *
 * ADD_BRICK routing: parentBlockId === null → looseBricks[]; else → matching block.bricks[].
 * No persistence in M3. Page refresh clears state. M8 lands localStorage rehydration.
 */

import type { AppState, Action, Brick } from "./types";
import { assertNever } from "./types";

export function defaultState(): AppState {
  return { blocks: [], categories: [], looseBricks: [] };
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
    case "ADD_BRICK":
      if (action.brick.parentBlockId === null) {
        // Standalone brick → looseBricks
        return {
          ...state,
          looseBricks: [...state.looseBricks, action.brick],
        };
      }
      // Inside-block brick → find block by id and append to its bricks[]
      return {
        ...state,
        blocks: state.blocks.map((b) =>
          b.id === action.brick.parentBlockId
            ? { ...b, bricks: [...b.bricks, action.brick] }
            : b,
        ),
      };
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
    default:
      return assertNever(action);
  }
}
