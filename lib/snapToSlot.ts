/**
 * lib/snapToSlot.ts — M6: pure snap helper for the drag-reorder feature.
 * No React, no DOM. Operates entirely in minute integers (no Date round-trips
 * → no TZ drift; cf. ADR-046 discipline on clock reads).
 *
 * SG-m6-07: 30-minute grid (SLOT_MIN = 30; matches M1 slot grid + M2 slot-tap targets).
 * SG-m6-08: start clamped to [00:00, 23:30]; end clamped to [00:00, 24:00].
 */

import { HOUR_HEIGHT_PX } from "./timeOffset";

/** 30-minute slot grid (SG-m6-07). */
export const SLOT_MIN = 30;

/**
 * Convert a pointer-y offset (px from timeline top) to a snapped "HH:MM" on the
 * 30-minute slot grid.
 *
 * @param offsetPx  - pixel offset from the timeline's 00:00 origin
 * @param hourHeightPx - pixels per hour (defaults to the single-source constant)
 * @returns "HH:MM" on the 30-min grid, clamped to [00:00, 23:30]
 */
export function snapToSlot(
  offsetPx: number,
  hourHeightPx: number = HOUR_HEIGHT_PX,
): string {
  const totalMin = (offsetPx / hourHeightPx) * 60;
  const snapped = Math.round(totalMin / SLOT_MIN) * SLOT_MIN;
  // SG-m6-08: clamp start to [0, 23:30] so even a single 30-min block fits at the bottom
  const clamped = Math.max(0, Math.min(24 * 60 - SLOT_MIN, snapped));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Compute the new `end` for a closed-ended block, preserving its duration.
 * Returns null when oldEnd is null (open-ended block — preserves the invariant).
 * SG-m6-08: `end` is clamped to [00:00, 24:00] (an end exactly at 24:00 is allowed).
 *
 * @param oldStart - original block start "HH:MM"
 * @param oldEnd   - original block end "HH:MM" or null (open-ended)
 * @param newStart - the snapped new start "HH:MM"
 * @returns new end "HH:MM" or null
 */
export function shiftEnd(
  oldStart: string,
  oldEnd: string | null,
  newStart: string,
): string | null {
  if (oldEnd === null) return null;
  const toMin = (hhmm: string) =>
    Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
  const delta = toMin(newStart) - toMin(oldStart);
  const ne = toMin(oldEnd) + delta;
  // SG-m6-08: end may be exactly 24:00 but not beyond
  const clamped = Math.max(0, Math.min(24 * 60, ne));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
