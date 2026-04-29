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

export function dayPct(blocks: Block[]): number {
  let totalDur = 0;
  let weighted = 0;
  for (const b of blocks) {
    const d = duration(b);
    totalDur += d;
    weighted += blockPct(b) * d;
  }
  return totalDur === 0 ? 0 : weighted / totalDur;
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

export function fmtRange(block: Block): string {
  return `${block.start}–${block.end}`;
}
