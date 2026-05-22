import { toMin } from "./dharma";
import type { Block } from "./types";

/**
 * Returns the id of the unique block whose [start, end) half-open interval contains `now`,
 * or null if none. Ignores blocks with no end (end === undefined) — ADR-006 half-open
 * requires a finite end to define an interval. Pure: no clock, no localStorage, no mutation.
 */
export function activeBlockId(blocks: Block[], now: string): string | null {
  const n = toMin(now);
  for (const b of blocks) {
    if (b.end === undefined) continue;
    const s = toMin(b.start);
    const e = toMin(b.end);
    if (n >= s && n < e) return b.id;
  }
  return null;
}
