/**
 * lib/haptics.ts — M0 haptic feedback layer.
 * Built on navigator.vibrate() with a silent no-op on platforms that don't
 * support it (iOS Safari, desktop browsers, etc.).
 */

export type HapticEvent = "light" | "medium" | "success" | "notification";

function vibrate(pattern: number | number[]): void {
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.vibrate === "function"
  ) {
    navigator.vibrate(pattern);
  }
  // Silent no-op when navigator.vibrate is undefined (iOS Safari, desktop)
}

export const haptics = {
  /** Brick tap — single 10ms pulse */
  light(): void {
    vibrate([10]);
  },

  /** Drag start, long-press lift — single 20ms pulse */
  medium(): void {
    vibrate([20]);
  },

  /** Block 100% — three quick pulses */
  success(): void {
    vibrate([15, 30, 15]);
  },

  /** Day 100% — five pulses */
  notification(): void {
    vibrate([20, 40, 20, 40, 20]);
  },
} as const;
