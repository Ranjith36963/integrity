// lib/overlap.ts — pure-function overlap engine. No React, no side effects, no reducer involvement.
// Half-open [start, end) intervals per ADR-006.
// M4e: universal duration axis (ADR-042) — detects block↔block, brick↔block, brick↔brick collisions.

import { toMin } from "./dharma";
import type { AppState, Block, Brick } from "./types";

// TimedItem — discriminated union used by findOverlaps and selectAllTimedItems.
export type TimedItem =
  | {
      kind: "block";
      id: string;
      name: string;
      start: string;
      end: string;
      categoryId: string | null;
    }
  | {
      kind: "brick";
      id: string;
      name: string;
      start: string;
      end: string;
      categoryId: string | null;
    };

/** Half-open interval intersection: [a.start, a.end) ∩ [b.start, b.end) ≠ ∅
 *  iff a.start < b.end AND b.start < a.end. Touching boundaries do NOT overlap (ADR-006).
 *  AC #11. */
export function intervalsOverlap(
  a: { start: string; end: string },
  b: { start: string; end: string },
): boolean {
  const as = toMin(a.start),
    ae = toMin(a.end);
  const bs = toMin(b.start),
    be = toMin(b.end);
  return as < be && bs < ae;
}

/** Returns all items that overlap `candidate`, excluding `excludeId` (M5 edit case).
 *  Sort: start asc, then kind ("block" before "brick"), then name alphabetic. AC #18. */
export function findOverlaps(
  candidate: { start: string; end: string },
  items: TimedItem[],
  excludeId?: string,
): TimedItem[] {
  const hits = items.filter(
    (it) =>
      (excludeId === undefined || it.id !== excludeId) &&
      intervalsOverlap(candidate, it),
  );
  hits.sort((x, y) => {
    const xs = toMin(x.start),
      ys = toMin(y.start);
    if (xs !== ys) return xs - ys;
    if (x.kind !== y.kind) return x.kind === "block" ? -1 : 1;
    return x.name.localeCompare(y.name);
  });
  return hits;
}

/** Union selector: every block with an `end` + every brick with `hasDuration === true`.
 *  Bricks without `hasDuration` are excluded (AC #16). The candidate-being-added is NOT
 *  in this set (AddBrickSheet/AddBlockSheet pass the not-yet-saved candidate separately). */
export function selectAllTimedItems(state: AppState): TimedItem[] {
  const out: TimedItem[] = [];
  for (const bl of state.blocks) {
    if (!bl.end) continue; // skip no-end blocks (matches blockValidation.overlapsExistingBlock)
    out.push({
      kind: "block",
      id: bl.id,
      name: bl.name,
      start: bl.start,
      end: bl.end,
      categoryId: bl.categoryId,
    });
  }
  const pushBrick = (br: Brick) => {
    if (
      br.hasDuration !== true ||
      br.start === undefined ||
      br.end === undefined
    )
      return;
    out.push({
      kind: "brick",
      id: br.id,
      name: br.name,
      start: br.start,
      end: br.end,
      categoryId: br.categoryId,
    });
  };
  for (const bl of state.blocks) for (const br of bl.bricks) pushBrick(br);
  for (const br of state.looseBricks) pushBrick(br);
  return out;
}

/** Tray filter: loose bricks without duration. AC #27. */
export function selectTrayBricks(state: AppState): Brick[] {
  return state.looseBricks.filter((b) => b.hasDuration !== true);
}

/** Timeline union: blocks + loose bricks with duration ON. Sorted by start asc. AC #28. */
export function selectTimelineItems(
  state: AppState,
): Array<{ kind: "block"; block: Block } | { kind: "brick"; brick: Brick }> {
  const items: Array<
    { kind: "block"; block: Block } | { kind: "brick"; brick: Brick }
  > = [];
  for (const bl of state.blocks) items.push({ kind: "block", block: bl });
  for (const br of state.looseBricks) {
    if (br.hasDuration === true && br.start !== undefined)
      items.push({ kind: "brick", brick: br });
  }
  items.sort((a, b) => {
    const as = a.kind === "block" ? a.block.start : a.brick.start!;
    const bs = b.kind === "block" ? b.block.start : b.brick.start!;
    return toMin(as) - toMin(bs);
  });
  return items;
}
