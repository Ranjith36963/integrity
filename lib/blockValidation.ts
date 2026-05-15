/**
 * lib/blockValidation.ts — Pure validation helpers for the Add Block form.
 * No React, no Date math — operates on "HH:MM" strings and Block structures.
 * Half-open [start, end) intervals per ADR-006.
 * M4f: removed overlapsExistingBlock (re-pointed to lib/overlap.ts:intervalsOverlap per SG-m4f-03),
 *      removed isValidBrickTime (time bricks gone), renamed isValidBrickGoal → isValidBrickUnitsTarget.
 */

import { toMin } from "./dharma";
import type { Recurrence } from "./types";

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
 *
 * NOTE: overlapsExistingBlock is DELETED in M4f (SG-m4f-03). Tests U-m2-004/005 are re-pointed
 * to lib/overlap.ts:intervalsOverlap. Use intervalsOverlap from lib/overlap.ts for new callers.
 */

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
 * M4f: Validates brick units target — integer ≥ 1.
 * (Renamed from isValidBrickGoal per plan.md § File deletions, SG-m4f-03.)
 * Returns false for 0, negative, non-integer, and NaN.
 */
export function isValidBrickUnitsTarget(target: number): boolean {
  return Number.isInteger(target) && target >= 1;
}
