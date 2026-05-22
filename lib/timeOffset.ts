/**
 * lib/timeOffset.ts — Vertical pixel-offset math for the 24-hour timeline.
 *
 * `HOUR_HEIGHT_PX` is the single source of truth for the timeline row height.
 * All callers (Timeline.tsx, NowLine.tsx) import this constant — no hardcoded
 * `64` literals elsewhere in the render tree (per plan.md § Decisions captured).
 *
 * SG-m1-09: malformed / empty input to `timeToOffsetPx` returns 0 (never throws,
 * never returns NaN). Mirrors plan.md § Edge cases "guard with now ? … : noop".
 */

/** Single shared constant for timeline hour-row height in pixels. */
export const HOUR_HEIGHT_PX = 64;

/**
 * Converts an "HH:MM" time string to a pixel offset from the timeline's 00:00 origin.
 * Clamps inputs outside [0, 23:59] to the boundaries:
 *   - negative/invalid → 0
 *   - ≥ 24:00 → 24 * hourHeightPx
 * Pure function: no Date dependency, no side effects.
 */
export function timeToOffsetPx(hhmm: string, hourHeightPx: number): number {
  if (!hhmm || !hhmm.includes(":")) return 0;

  const parts = hhmm.split(":");
  const h = parseInt(parts[0] ?? "", 10);
  const m = parseInt(parts[1] ?? "", 10);

  if (Number.isNaN(h) || Number.isNaN(m)) return 0;

  const totalMinutes = h * 60 + m;

  if (totalMinutes < 0) return 0;
  if (totalMinutes >= 24 * 60) return 24 * hourHeightPx;

  return (totalMinutes / 60) * hourHeightPx;
}

/**
 * Clamps a raw pixel offset to the timeline's valid pixel range [0, 24 * hourHeightPx].
 * Guards against now-line position going past the bottom-most label at 23:59.
 */
export function clampOffsetPx(offsetPx: number, hourHeightPx: number): number {
  const max = 24 * hourHeightPx;
  return Math.min(max, Math.max(0, offsetPx));
}
