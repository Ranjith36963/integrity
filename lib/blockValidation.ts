/**
 * lib/blockValidation.ts — Pure validation helpers for the Add Block form.
 * No React, no Date math — operates on "HH:MM" strings and Block structures.
 * Half-open [start, end) intervals per ADR-006.
 */

import { toMin } from "./dharma";
import type { Block, Recurrence } from "./types";

/** Validates HH:MM format: two-digit hour 00–23, two-digit minute 00–59. */
export function isValidStart(start: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(start);
}

/**
 * Validates end time: undefined (blank = no end) OR a valid HH:MM string.
 * Per SG-m2-10: end is optional; undefined is always valid.
 */
export function isValidEnd(end: string | undefined): boolean {
  if (end === undefined) return true;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(end);
}

/**
 * Returns true if end is strictly after start.
 * If end is undefined, returns true (no-end is valid per plan.md § Edge cases).
 * ADR-006: equal times are NOT valid (start === end returns false).
 */
export function endAfterStart(start: string, end: string | undefined): boolean {
  if (end === undefined) return true;
  return toMin(end) > toMin(start);
}

/**
 * Returns the first existing block whose [start, end) half-open interval
 * intersects the candidate's interval, or null if no overlap.
 *
 * When the candidate has no end, it is treated as a 1-minute marker [start, start+1).
 *
 * ADR-006: back-to-back blocks (candidate.start === existing.end) do NOT overlap.
 * Existing blocks without an end field are skipped (no end = no hard boundary).
 */
export function overlapsExistingBlock(
  blocks: Block[],
  candidate: { start: string; end?: string },
): Block | null {
  const cStart = toMin(candidate.start);
  const cEnd = candidate.end !== undefined ? toMin(candidate.end) : cStart + 1;

  for (const block of blocks) {
    if (!block.end) continue; // skip no-end existing blocks
    const bStart = toMin(block.start);
    const bEnd = toMin(block.end);

    // Half-open interval intersection: [cStart, cEnd) ∩ [bStart, bEnd) ≠ ∅
    // iff cStart < bEnd AND cEnd > bStart
    if (cStart < bEnd && cEnd > bStart) {
      return block;
    }
  }
  return null;
}

/**
 * Returns true if the recurrence value is internally valid.
 * For custom-range: requires start ≤ end AND weekdays.length > 0.
 * All other kinds are trivially valid.
 */
export function isValidCustomRange(rec: Recurrence): boolean {
  if (rec.kind !== "custom-range") return true;
  if (rec.weekdays.length === 0) return false;
  return rec.start <= rec.end;
}

/**
 * M3: Validates brick goal target — integer ≥ 1.
 * Returns false for 0, negative, non-integer, and NaN.
 */
export function isValidBrickGoal(target: number): boolean {
  return Number.isInteger(target) && target >= 1;
}

/**
 * M3: Validates brick time durationMin — integer ≥ 1.
 * Returns false for 0, negative, non-integer, and NaN.
 */
export function isValidBrickTime(durationMin: number): boolean {
  return Number.isInteger(durationMin) && durationMin >= 1;
}
