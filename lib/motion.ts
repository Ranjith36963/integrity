/**
 * lib/motion.ts — M0 motion token layer.
 * Exports JS-side counterparts of the CSS --motion-* vars so motion
 * components can read the same numbers without parsing CSS.
 * No runtime side-effects.
 */

export type Duration =
  | "tap" // 100ms
  | "brickFill" // 600ms
  | "modalIn" // spring
  | "modalOut" // 220ms
  | "longPress" // 180ms
  | "stagger"; // 30ms (per-sibling delay)

export type Easing = "easeOut" | "easeInOut" | "spring" | "linear";

export interface MotionToken {
  durationMs: number; // collapsed to 0 under reduced-motion
  easing: Easing; // CSS easing or "spring"
}

/**
 * Spring configs for motion/react. Used when easing === "spring".
 * These align with the CSS --motion-modal-in and --motion-bloom specs.
 */
export const springConfigs = {
  bloom: { stiffness: 220, damping: 22 },
  modalIn: { stiffness: 320, damping: 30 },
} as const;

const BASE_TOKENS: Record<Duration, MotionToken> = {
  tap: { durationMs: 100, easing: "easeOut" },
  brickFill: { durationMs: 600, easing: "easeInOut" },
  modalIn: { durationMs: 0, easing: "spring" }, // spring — durationMs is nominal; spring drives timing
  modalOut: { durationMs: 220, easing: "easeOut" },
  longPress: { durationMs: 180, easing: "easeOut" },
  stagger: { durationMs: 30, easing: "linear" },
};

/**
 * Returns the motion token for a given Duration.
 * When `reduced` is true (prefers-reduced-motion), all durations collapse to 0
 * and spring tokens become hard-cut (linear, 0ms) per plan.md edge case 1.
 */
export function getMotion(token: Duration, reduced: boolean): MotionToken {
  const base = BASE_TOKENS[token];
  if (!reduced) return base;
  // Reduced-motion collapse: all durations → 0, springs → hard-cut (linear)
  return { durationMs: 0, easing: "linear" };
}
