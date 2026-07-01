/**
 * lib/dayWindow.ts — "day is a circle" geometry.
 *
 * The day no longer starts at midnight. It starts at a user-chosen anchor
 * (default 04:00 — wake time) and runs a full 24h back to the same anchor.
 * This makes an overnight block (e.g. Sleep 22:00→04:00) a SINGLE continuous
 * span instead of two pieces split at the midnight seam.
 *
 * All functions here are pure — no clock reads, no Date construction.
 */
import { HOUR_HEIGHT_PX } from "./timeOffset";

/** Default day anchor — the user's wake time. */
export const DEFAULT_DAY_START = "04:00";

const MINUTES_PER_DAY = 24 * 60;

function toMinutes(hhmm: string): number {
  if (!hhmm || !hhmm.includes(":")) return 0;
  const [h, m] = hhmm.split(":").map((p) => parseInt(p, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

/**
 * Minutes elapsed since the day anchor, wrapping past midnight.
 * Always in [0, 1440). With anchor "00:00" this is just minutes-since-midnight.
 */
export function minutesFromDayStart(hhmm: string, dayStart: string): number {
  const delta = toMinutes(hhmm) - toMinutes(dayStart);
  return ((delta % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

/**
 * Wrap-aware top + height (in px) for a block on the anchored timeline.
 * - end === undefined → a small stub height (open-ended block).
 * - end at or before start (in anchor terms) → the span crosses the anchor once
 *   and extends toward the bottom (one continuous block, never split). When end
 *   equals start this yields a full 24h window.
 */
export function daySpanPx(
  start: string,
  end: string | undefined,
  dayStart: string,
  hourHeightPx: number = HOUR_HEIGHT_PX,
): { topPx: number; heightPx: number } {
  const startMin = minutesFromDayStart(start, dayStart);
  const topPx = (startMin / 60) * hourHeightPx;

  if (end === undefined) {
    // Open-ended stub — mirrors the pre-anchor timeline's no-end height.
    return { topPx, heightPx: hourHeightPx / 12 };
  }

  let endMin = minutesFromDayStart(end, dayStart);
  // end at or before start (in anchor terms) means it wraps the full way round —
  // extend by a day so the span stays a single positive-height block.
  if (endMin <= startMin) endMin += MINUTES_PER_DAY;

  const heightPx = ((endMin - startMin) / 60) * hourHeightPx;
  return { topPx, heightPx };
}

/**
 * The 24 hour labels ("HH:00") for the timeline, starting at the anchor hour
 * and wrapping around. Anchor "04:00" → ["04:00","05:00",…,"03:00"].
 */
export function dayHours(dayStart: string): string[] {
  const startHour = Math.floor(toMinutes(dayStart) / 60);
  return Array.from(
    { length: 24 },
    (_, i) => String((startHour + i) % 24).padStart(2, "0") + ":00",
  );
}

/** True when the ISO YYYY-MM-DD falls on Sat or Sun (local calendar). */
function isWeekendDate(isoDate: string): boolean {
  const [y, m, d] = isoDate.split("-").map((p) => parseInt(p, 10));
  // Local-time constructor — no UTC drift (same discipline as lib/appliesOn.ts).
  const wd = new Date(y, (m || 1) - 1, d || 1).getDay(); // 0=Sun…6=Sat
  return wd === 0 || wd === 6;
}

/**
 * The effective wake-to-wake anchor for a given date. Weekends (Sat/Sun) use the
 * weekend wake time; everything else uses the weekday wake time. Each falls back
 * to the weekday value, then to DEFAULT_DAY_START, when unset.
 */
export function resolveDayStart(
  weekday: string | undefined,
  weekend: string | undefined,
  isoDate: string,
): string {
  const wk = weekday ?? DEFAULT_DAY_START;
  return isWeekendDate(isoDate) ? (weekend ?? wk) : wk;
}
