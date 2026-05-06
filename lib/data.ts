/**
 * lib/data.ts — Re-authored for M2 (plan.md § Data model).
 *
 * defaultState() returns the empty AppState per ADR-039 (no factory data).
 * reducer implements ADD_BLOCK + ADD_CATEGORY with assertNever exhaustiveness.
 *
 * Future actions (DELETE_BLOCK M5, LOG_BRICK M3, RESOLVE_RECURRENCE M9) extend
 * the Action union in lib/types.ts AND add a case here — assertNever ensures the
 * omission is a compile-time error, not a silent runtime bug.
 *
 * No persistence in M2. Page refresh clears state. M8 lands localStorage rehydration
 * via this same reducer (the Action log replays to rebuild state).
 */

import type { AppState, Action } from "./types";
import { assertNever } from "./types";

export function defaultState(): AppState {
  return { blocks: [], categories: [] };
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
    default:
      return assertNever(action);
  }
}
