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
  | "stagger" // 30ms (per-sibling delay)
  | "fireworks" // 1600ms easeOut — day-100% celebration overlay (M4a)
  | "countUp"; // M7c — hero % count-up on first load (1600ms easeOut)

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

/** Exported for tests and helpers that need the raw token map (e.g. staggerForCount). */
export const motionTokens: Record<Duration, MotionToken> = {
  tap: { durationMs: 100, easing: "easeOut" },
  brickFill: { durationMs: 600, easing: "easeInOut" },
  modalIn: { durationMs: 0, easing: "spring" }, // spring — durationMs is nominal; spring drives timing
  modalOut: { durationMs: 220, easing: "easeOut" },
  longPress: { durationMs: 180, easing: "easeOut" },
  stagger: { durationMs: 30, easing: "linear" },
  fireworks: { durationMs: 1600, easing: "easeOut" }, // M4a — day-100% celebration overlay
  countUp: { durationMs: 1600, easing: "easeOut" }, // M7c — hero % count-up on first load
};

/**
 * staggerForCount — M7a helper (plan.md § Stagger ceiling, SG-m7a-01).
 * Returns the per-sibling stagger delay in seconds for Framer Motion's staggerChildren.
 *
 * Piecewise:
 *   n <= 15 → canonical motionTokens.stagger.durationMs / 1000 (= 0.03 s / 30 ms)
 *   n > 15  → Math.max(0.02, 0.45 / n)  (caps total cascade at ~600 ms; floor at 0.02)
 *
 * Each surface (BlueprintBar / Timeline / LooseBricksTray) computes its own stagger
 * independently — per-surface, not global (plan.md § Stagger ceiling).
 */
export function staggerForCount(n: number): number {
  const CANONICAL = motionTokens.stagger.durationMs / 1000; // 0.03
  if (n <= 15) return CANONICAL;
  return Math.max(0.02, 0.45 / n);
}

/**
 * Returns the motion token for a given Duration.
 * When `reduced` is true (prefers-reduced-motion), all durations collapse to 0
 * and spring tokens become hard-cut (linear, 0ms) per plan.md edge case 1.
 */
export function getMotion(token: Duration, reduced: boolean): MotionToken {
  const base = motionTokens[token];
  if (!reduced) return base;
  // Reduced-motion collapse: all durations → 0, springs → hard-cut (linear)
  return { durationMs: 0, easing: "linear" };
}
