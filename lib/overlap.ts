// lib/overlap.ts — pure-function overlap engine. No React, no side effects, no reducer involvement.
// Half-open [start, end) intervals per ADR-006.
// M4e: universal duration axis (ADR-042) — detects block↔block, brick↔block, brick↔brick collisions.

import { toMin } from "./dharma";
import { appliesOn } from "./appliesOn";
import type { AppState, Block, Brick, Recurrence } from "./types";

// TimedItem — discriminated union used by findOverlaps and selectAllTimedItems.
// `recurrence` lets overlap detection skip items that can never share a day with
// the candidate (e.g. a Mon–Fri block vs a Sat–Sun block). Optional for
// backward compatibility — absent → treated as "every day" (coincides always).
export type TimedItem =
  | {
      kind: "block";
      id: string;
      name: string;
      start: string;
      end: string;
      categoryId: string | null;
      recurrence?: Recurrence;
    }
  | {
      kind: "brick";
      id: string;
      name: string;
      start: string;
      end: string;
      categoryId: string | null;
      recurrence?: Recurrence;
    };

const DAY_LEN = 24 * 60;
const EVERY_DAY: Recurrence = { kind: "every-day" };

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1); // local — no UTC drift
}
function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function weekdaySet(r: Recurrence): Set<number> {
  switch (r.kind) {
    case "every-day":
      return new Set([0, 1, 2, 3, 4, 5, 6]);
    case "every-weekday":
      return new Set([1, 2, 3, 4, 5]);
    case "every-weekend":
      return new Set([0, 6]);
    case "custom-range":
      return new Set(r.weekdays);
    case "just-today":
      return new Set([parseLocalDate(r.date).getDay()]);
  }
}
function dateBounds(r: Recurrence): [string, string] | null {
  if (r.kind === "just-today") return [r.date, r.date];
  if (r.kind === "custom-range") return [r.start, r.end];
  return null; // every-day / every-weekday / every-weekend are unbounded
}

/**
 * True when two recurrences can BOTH apply on some common calendar day.
 * A block that recurs Mon–Fri and one that recurs Sat–Sun can never coincide,
 * so they must not be reported as overlapping even at the same clock time.
 * Exact: shared-weekday check, then date-range overlap, with a bounded scan for
 * windows shorter than a week (longer windows always contain the shared weekday).
 */
export function recurrencesCanCoincide(a: Recurrence, b: Recurrence): boolean {
  const wa = weekdaySet(a);
  const wb = weekdaySet(b);
  let sharedWeekday = false;
  for (const d of wa)
    if (wb.has(d)) {
      sharedWeekday = true;
      break;
    }
  if (!sharedWeekday) return false;

  const ra = dateBounds(a);
  const rb = dateBounds(b);
  if (!ra && !rb) return true; // both unbounded + shared weekday → yes

  const lo = ra && rb ? (ra[0] > rb[0] ? ra[0] : rb[0]) : (ra ?? rb!)[0];
  const hi = ra && rb ? (ra[1] < rb[1] ? ra[1] : rb[1]) : (ra ?? rb!)[1];
  if (lo > hi) return false; // date ranges disjoint

  const loD = parseLocalDate(lo);
  const hiD = parseLocalDate(hi);
  const span = Math.round((hiD.getTime() - loD.getTime()) / 86_400_000) + 1;
  if (span >= 7) return true; // a full week always contains the shared weekday

  for (let t = loD.getTime(); t <= hiD.getTime(); t += 86_400_000) {
    const iso = isoOf(new Date(t));
    if (appliesOn(a, iso) && appliesOn(b, iso)) return true;
  }
  return false;
}

/** Expand an interval into 1–2 non-wrapping [start,end) minute segments.
 *  A block whose end is at/before its start (e.g. Sleep 22:00→04:00) crosses the
 *  midnight seam and becomes two segments: [start,1440) ∪ [0,end). Since the
 *  wake-to-wake anchor lets overnight blocks persist with end < start, overlap
 *  detection must reason about both halves. */
function expandInterval(iv: {
  start: string;
  end: string;
}): [number, number][] {
  const s = toMin(iv.start);
  const e = toMin(iv.end);
  if (e > s) return [[s, e]]; // normal, same-day
  if (e === s) return [[s, s + DAY_LEN]]; // degenerate full-day (guarded upstream)
  return [
    [s, DAY_LEN],
    [0, e],
  ]; // wraps midnight
}

/** Half-open interval intersection: [a.start, a.end) ∩ [b.start, b.end) ≠ ∅.
 *  Touching boundaries do NOT overlap (ADR-006). Wrap-aware: an overnight block
 *  (end < start) is compared as its two half-open segments. AC #11. */
export function intervalsOverlap(
  a: { start: string; end: string },
  b: { start: string; end: string },
): boolean {
  for (const [as, ae] of expandInterval(a)) {
    for (const [bs, be] of expandInterval(b)) {
      if (as < be && bs < ae) return true;
    }
  }
  return false;
}

/** Returns all items that overlap `candidate`, excluding `excludeId` (M5 edit case).
 *  Sort: start asc, then kind ("block" before "brick"), then name alphabetic. AC #18. */
export function findOverlaps(
  candidate: { start: string; end: string; recurrence?: Recurrence },
  items: TimedItem[],
  excludeId?: string,
): TimedItem[] {
  const candRec = candidate.recurrence ?? EVERY_DAY;
  const hits = items.filter(
    (it) =>
      (excludeId === undefined || it.id !== excludeId) &&
      intervalsOverlap(candidate, it) &&
      // Skip items whose recurrence can never share a day with the candidate
      // (e.g. a weekday routine block vs a weekend routine block).
      recurrencesCanCoincide(candRec, it.recurrence ?? EVERY_DAY),
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
    if (!bl.end) continue; // skip no-end blocks
    out.push({
      kind: "block",
      id: bl.id,
      name: bl.name,
      start: bl.start,
      end: bl.end,
      categoryId: bl.categoryId,
      recurrence: bl.recurrence,
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
      recurrence: br.recurrence,
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
