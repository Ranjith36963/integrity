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
  return {
    blocks: [],
    categories: [],
    looseBricks: [],
    runningTimerBrickId: null,
  };
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
    case "LOG_GOAL_BRICK": {
      // Clamp-increment/decrement count on matching goal brick.
      // Identity short-circuit: returns original state reference on no-op (clamp or id miss).
      // Block-array and loose-array references are preserved when their contents don't change.
      const apply = (b: Brick): Brick => {
        if (b.id !== action.brickId || b.kind !== "goal") return b;
        const next = Math.max(0, Math.min(b.target, b.count + action.delta));
        if (next === b.count) return b; // clamp no-op — preserve identity
        return { ...b, count: next };
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
    case "START_TIMER": {
      // Single-running invariant: just write the new id. No separate stop for the prior running brick;
      // the field is single-valued, the swap IS the stop. lib/timer.ts captures the new startedAt
      // off the change in state.runningTimerBrickId.
      if (state.runningTimerBrickId === action.brickId) return state; // already running — true no-op
      return { ...state, runningTimerBrickId: action.brickId };
    }
    case "STOP_TIMER": {
      if (state.runningTimerBrickId === null) return state;
      if (state.runningTimerBrickId !== action.brickId) return state; // stopping a non-running brick is a no-op
      return { ...state, runningTimerBrickId: null };
    }
    case "TICK_TIMER": {
      // Identity short-circuit when minutesDone is unchanged (avoids spurious cross-up effect re-runs).
      const applyTick = (b: Brick): Brick => {
        if (b.id !== action.brickId || b.kind !== "time") return b;
        if (b.minutesDone === action.minutesDone) return b;
        return { ...b, minutesDone: action.minutesDone };
      };
      // Same array-identity preservation pattern as LOG_GOAL_BRICK.
      let tickBlocksChanged = false;
      const tickNewBlocks = state.blocks.map((bl) => {
        let changed = false;
        const bricks = bl.bricks.map((br) => {
          const out = applyTick(br);
          if (out !== br) changed = true;
          return out;
        });
        if (!changed) return bl;
        tickBlocksChanged = true;
        return { ...bl, bricks };
      });
      let tickLooseChanged = false;
      const tickNewLoose = state.looseBricks.map((br) => {
        const out = applyTick(br);
        if (out !== br) tickLooseChanged = true;
        return out;
      });
      if (!tickBlocksChanged && !tickLooseChanged) return state;
      return {
        ...state,
        blocks: tickBlocksChanged ? tickNewBlocks : state.blocks,
        looseBricks: tickLooseChanged ? tickNewLoose : state.looseBricks,
      };
    }
    case "SET_TIMER_MINUTES": {
      // Clamp at the reducer level (defense-in-depth alongside the sheet's own clamp).
      const applySet = (b: Brick): Brick => {
        if (b.id !== action.brickId || b.kind !== "time") return b;
        const clamped = Math.max(0, Math.min(b.durationMin, action.minutes));
        if (b.minutesDone === clamped) return b;
        return { ...b, minutesDone: clamped };
      };
      // Same array-identity preservation pattern as TICK_TIMER.
      let setBlocksChanged = false;
      const setNewBlocks = state.blocks.map((bl) => {
        let changed = false;
        const bricks = bl.bricks.map((br) => {
          const out = applySet(br);
          if (out !== br) changed = true;
          return out;
        });
        if (!changed) return bl;
        setBlocksChanged = true;
        return { ...bl, bricks };
      });
      let setLooseChanged = false;
      const setNewLoose = state.looseBricks.map((br) => {
        const out = applySet(br);
        if (out !== br) setLooseChanged = true;
        return out;
      });
      if (!setBlocksChanged && !setLooseChanged) return state;
      return {
        ...state,
        blocks: setBlocksChanged ? setNewBlocks : state.blocks,
        looseBricks: setLooseChanged ? setNewLoose : state.looseBricks,
      };
    }
    default:
      return assertNever(action);
  }
}
