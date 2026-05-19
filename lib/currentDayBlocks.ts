/**
 * lib/currentDayBlocks.ts — M5: pure helper for Day-render block resolution.
 *
 * currentDayBlocks(state) returns the blocks to render for today.
 * It filters state.blocks by state.deletions ONLY (ADR-047).
 * The single join site: `${state.currentDate}:${block.id}`.
 *
 * Design rationale (plan.md § Day-render wiring resolution (a)):
 *   - appliesOn filtering is deferred to a future spec entry.
 *   - deletions is the sole override map for "just today" per-day suppression.
 *   - An empty deletions is the identity filter (no suppression).
 *
 * Pure: reads only state.currentDate and state.blocks and state.deletions.
 * No clock reads. No localStorage reads. No React.
 * ADR-020 compliance: the key prefix comes from state.currentDate, never new Date().
 */

import type { AppState, Block } from "./types";

/**
 * currentDayBlocks — returns state.blocks filtered by deletions for today.
 * A block b is suppressed if deletions[`${state.currentDate}:${b.id}`] is truthy.
 * All other blocks are returned in their original order.
 */
export function currentDayBlocks(state: AppState): Block[] {
  return state.blocks.filter(
    (b) => !state.deletions[`${state.currentDate}:${b.id}`],
  );
}
