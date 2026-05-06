import { Block, Brick } from "./types";

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

export function brickPct(b: Brick): number {
  if (b.kind === "tick") return b.done ? 100 : 0;
  if (b.target <= 0) return 0;
  return Math.min(100, (b.current / b.target) * 100);
}

export function blockPct(block: Block): number {
  if (block.bricks.length === 0) return 0;
  const sum = block.bricks.reduce((s, b) => s + brickPct(b), 0);
  return sum / block.bricks.length;
}

// Equal-weighted average of blockPct (spec §Scoring: "All equal weight").
// Previously duration-weighted — fixed per SG-bld-08.
export function dayPct(blocks: Block[]): number {
  if (blocks.length === 0) return 0;
  const sum = blocks.reduce((s, b) => s + blockPct(b), 0);
  return sum / blocks.length;
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
  if (b.kind === "time") return `${b.current}/${b.target} min`;
  return `${b.current}/${b.target}${b.unit ? " " + b.unit : ""}`;
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
