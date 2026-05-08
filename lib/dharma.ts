import { Block, Brick, AppState } from "./types";

export function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

const DAY_START = toMin("04:00");
const DAY_LEN = 24 * 60;

export function dayOffset(hhmm: string): number {
  const m = toMin(hhmm);
  const off = m - DAY_START;
  return off < 0 ? off + DAY_LEN : off;
}

export function duration(block: Block): number {
  const a = toMin(block.start);
  // M2: end is optional (no-end blocks have no duration — return 0)
  if (!block.end) return 0;
  const b = toMin(block.end);
  const d = b - a;
  return d <= 0 ? d + DAY_LEN : d;
}

/**
 * brickPct — M3 updated to use new Brick schema field names.
 * tick: done ? 100 : 0
 * goal: Math.min(count / target, 1) * 100  (zero-target guard)
 * time: Math.min(minutesDone / durationMin, 1) * 100  (zero-duration guard)
 */
export function brickPct(b: Brick): number {
  if (b.kind === "tick") return b.done ? 100 : 0;
  if (b.kind === "goal") {
    if (b.target <= 0) return 0;
    return Math.min(b.count / b.target, 1) * 100;
  }
  // time
  if (b.durationMin <= 0) return 0;
  return Math.min(b.minutesDone / b.durationMin, 1) * 100;
}

export function blockPct(block: Block): number {
  if (block.bricks.length === 0) return 0;
  const sum = block.bricks.reduce((s, b) => s + brickPct(b), 0);
  return sum / block.bricks.length;
}

/**
 * dayPct — M3: REPLACES dayPct(blocks: Block[]) with dayPct(state: AppState).
 * Averages over state.blocks (each contributing blockPct) and state.looseBricks
 * (each contributing brickPct). Empty state → 0 (no divide-by-zero).
 */
export function dayPct(state: AppState): number {
  const total = state.blocks.length + state.looseBricks.length;
  if (total === 0) return 0;
  const blockSum = state.blocks.reduce((s, b) => s + blockPct(b), 0);
  const brickSum = state.looseBricks.reduce((s, b) => s + brickPct(b), 0);
  return (blockSum + brickSum) / total;
}

/**
 * categoryDayPct — NEW in M3.
 * Averages over:
 *   (a) Every Block whose block.categoryId === categoryId → contributes blockPct(block)
 *       (but only when block.categoryId matches; bricks inside contribute to THEIR own category).
 *   (b) Every Brick (inside-block + standalone) whose brick.categoryId === categoryId.
 *
 * NOTE: The spec/plan says "block's own contribution is included only when block.categoryId === categoryId".
 * Bricks inside a block attribute to THEIR OWN category FK, not the parent block's category.
 * Standalone bricks with categoryId: null are excluded from category-filtered queries.
 * Empty matches → 0.
 */
export function categoryDayPct(state: AppState, categoryId: string): number {
  const units: number[] = [];

  for (const block of state.blocks) {
    // Include block's own contribution if its categoryId matches
    if (block.categoryId === categoryId) {
      units.push(blockPct(block));
    }
    // Include bricks inside the block that match the category
    for (const brick of block.bricks) {
      if (brick.categoryId === categoryId) {
        units.push(brickPct(brick));
      }
    }
  }

  // Include loose bricks with matching categoryId (null excluded)
  for (const brick of state.looseBricks) {
    if (brick.categoryId === categoryId) {
      units.push(brickPct(brick));
    }
  }

  if (units.length === 0) return 0;
  return units.reduce((s, v) => s + v, 0) / units.length;
}

export function currentBlockIndex(blocks: Block[], now: string): number {
  const n = dayOffset(now);
  let acc = 0;
  for (let i = 0; i < blocks.length; i++) {
    const d = duration(blocks[i]);
    if (n >= acc && n < acc + d) return i;
    acc += d;
  }
  return -1;
}

export function nowOffsetPct(blocks: Block[], now: string): number {
  const total = blocks.reduce((s, b) => s + duration(b), 0);
  if (total === 0) return 0;
  return (dayOffset(now) / total) * 100;
}

export function blockStatus(
  blocks: Block[],
  now: string,
  i: number,
): "past" | "current" | "future" {
  const cur = currentBlockIndex(blocks, now);
  if (i === cur) return "current";
  if (i < cur) return "past";
  return "future";
}

export function brickLabel(b: Brick): string {
  if (b.kind === "tick") return b.done ? "done" : "—";
  if (b.kind === "time") return `${b.minutesDone}/${b.durationMin} min`;
  return `${b.count}/${b.target}${b.unit ? " " + b.unit : ""}`;
}

/**
 * Formats the time range for a block as "HH:MM–HH:MM" (en-dash).
 * SG-m2-10: widened to accept end?: string | undefined.
 * When end is undefined (no-end block), returns just "HH:MM" with no en-dash.
 * Single source of truth for time range formatting across TimelineBlock and NowCard.
 */
export function fmtRange(block: Pick<Block, "start" | "end">): string {
  if (!block.end) return block.start;
  return `${block.start}–${block.end}`;
}

/**
 * Returns the local date as "YYYY-MM-DD" (zero-padded).
 * Uses local date components — NOT UTC — so DST transitions and
 * cross-timezone runs stay consistent with the user's current day.
 * Pass an explicit Date for testability; defaults to new Date().
 */
export function today(d: Date = new Date()): string {
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns the 1-based program day number (day 1 = programStart).
 * Returns `undefined` if programStart is null, undefined, or empty string.
 * Both ISO strings are parsed as local midnight to keep DST-safe integer math.
 */
export function dayNumber(
  programStart: string | null | undefined,
  todayIso: string,
): number | undefined {
  if (!programStart) return undefined;
  const start = new Date(programStart + "T00:00:00");
  const end = new Date(todayIso + "T00:00:00");
  const delta = Math.floor((end.getTime() - start.getTime()) / 86_400_000);
  return delta + 1;
}

/**
 * Formats a "YYYY-MM-DD" ISO date string as "Wed, Apr 29" (en-US locale).
 * Locale is fixed to "en-US" per SG-bld-11 (user-approved 2026-05-01).
 * If locale-aware formatting is needed later, introduce a follow-up feature.
 */
export function dateLabel(todayIso: string): string {
  const d = new Date(todayIso + "T00:00:00");
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}
