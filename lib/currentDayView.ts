/**
 * lib/currentDayView.ts — recurrence-aware "today" projection.
 *
 * currentDayBlocks(state) filters state.blocks by deletions ONLY (ADR-047 left
 * recurrence filtering to a "future spec entry"). This module is that entry:
 * the Day view — its timeline, its ring, and its score — must show only the
 * blocks whose recurrence applies to state.currentDate. Without it a user with
 * a weekday routine AND a weekend routine sees BOTH every day, and the day
 * score averages over blocks that cannot happen today.
 *
 * visibleDayBlocks(state) = currentDayBlocks(state) ∩ appliesOn(recurrence, currentDate).
 * currentDayState(state)  = { ...state, blocks: visibleDayBlocks(state) } — a
 *   projection safe to hand to dayPct()/selectTimelineItems() so every "today"
 *   surface agrees.
 *
 * Loose bricks are intentionally NOT recurrence-filtered here: they are the
 * ad-hoc tray, not part of the weekday/weekend routine distinction, and the
 * reducer already stamps them just-today(currentDate) on creation.
 *
 * Pure: reads state only; no clock, no storage, no React.
 */
import type { AppState, Block } from "./types";
import { currentDayBlocks } from "./currentDayBlocks";
import { appliesOn } from "./appliesOn";

/** Blocks to render AND score for today: deletions filter ∩ recurrence filter. */
export function visibleDayBlocks(state: AppState): Block[] {
  return currentDayBlocks(state).filter((b) =>
    appliesOn(b.recurrence, state.currentDate),
  );
}

/** A state projection whose `blocks` are only today's applicable blocks.
 *  Hand this to dayPct() / selectTimelineItems() so the Day view score and the
 *  Week/Month/Year "today" cell agree. Loose bricks pass through unchanged. */
export function currentDayState(state: AppState): AppState {
  return { ...state, blocks: visibleDayBlocks(state) };
}
