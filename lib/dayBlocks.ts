/**
 * lib/dayBlocks.ts — resolve the blocks + categories to show for any date.
 *
 * Today → currentDayBlocks(state) + state.categories.
 * An archived day → the snapshot stored in state.history[iso].
 * Anything else (future / missed / pre-start) → empty.
 *
 * Pure: reads state only; no clock, no storage.
 */
import type { AppState, Block, Category } from "./types";
import { visibleDayBlocks } from "./currentDayView";

export function dayBlocksFor(
  state: AppState,
  iso: string,
): { blocks: Block[]; categories: Category[] } {
  if (iso === state.currentDate) {
    // Recurrence fix: today's ring shows only blocks whose recurrence applies
    // to currentDate (weekday routine hidden on weekends, and vice versa).
    return { blocks: visibleDayBlocks(state), categories: state.categories };
  }
  const archived = state.history[iso];
  if (archived) {
    return { blocks: archived.blocks, categories: archived.categories };
  }
  return { blocks: [], categories: [] };
}
