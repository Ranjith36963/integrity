/**
 * lib/ring.ts — "day is a circle" geometry.
 *
 * Draws the wake-to-wake day as a 24-hour clock face: the wake anchor sits at
 * the top (12 o'clock) and time sweeps clockwise. Blocks become arcs; an
 * overnight block (Sleep 22:00→04:00) is ONE continuous arc that closes the
 * loop back to the anchor.
 *
 * Pure module — no clock reads, no React. Angles are degrees, clockwise, with
 * 0° at the top. Screen coordinates use the SVG convention (y grows downward).
 */
import { minutesFromDayStart } from "./dayWindow";

const MINUTES_PER_DAY = 24 * 60;

/** Clockwise degrees from the top (the wake anchor) for a wall-clock time. */
export function timeToAngle(time: string, dayStart: string): number {
  return (minutesFromDayStart(time, dayStart) / MINUTES_PER_DAY) * 360;
}

/** Screen (x,y) for a clockwise-from-top angle at radius r around (cx,cy). */
export function pointOnCircle(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): { x: number; y: number } {
  // Rotate so 0° points up (screen: -y). screenAngle = angle - 90.
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/**
 * Start/end angles for a block on the ring, wrap-aware.
 * - end === undefined → a zero-length arc (open-ended; caller renders a tick).
 * - end at/before start (anchor terms) → the arc wraps once and closes toward
 *   the anchor (endAngle extended past startAngle so it stays one positive arc).
 */
export function blockArc(
  start: string,
  end: string | undefined,
  dayStart: string,
): { startAngle: number; endAngle: number } {
  const startAngle = timeToAngle(start, dayStart);
  if (end === undefined) return { startAngle, endAngle: startAngle };
  let endAngle = timeToAngle(end, dayStart);
  if (endAngle <= startAngle) endAngle += 360; // wraps the loop
  return { startAngle, endAngle };
}

/**
 * SVG path for an annular sector (ring segment) between two clockwise angles,
 * from inner radius rInner to outer radius rOuter around (cx,cy).
 * The path is closed (ends in Z).
 */
export function annularSectorPath(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startAngle: number,
  endAngle: number,
): string {
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const oStart = pointOnCircle(cx, cy, rOuter, startAngle);
  const oEnd = pointOnCircle(cx, cy, rOuter, endAngle);
  const iEnd = pointOnCircle(cx, cy, rInner, endAngle);
  const iStart = pointOnCircle(cx, cy, rInner, startAngle);
  // Outer arc clockwise (sweep 1); inner arc back counter-clockwise (sweep 0).
  return [
    `M ${oStart.x} ${oStart.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${oEnd.x} ${oEnd.y}`,
    `L ${iEnd.x} ${iEnd.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${iStart.x} ${iStart.y}`,
    "Z",
  ].join(" ");
}
