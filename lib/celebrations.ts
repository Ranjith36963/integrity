/**
 * lib/celebrations.ts — M3 cross-detection hook and celebration helpers.
 *
 * useCrossUpEffect(value, threshold, fn):
 *   - Fires fn() once when value transitions from < threshold to >= threshold.
 *   - Resets the one-shot gate when value drops back below threshold.
 *   - Used by <TimelineBlock> (block 100% bloom+chime+success haptic)
 *     and <HeroRing> host (day 100% fireworks+notification haptic).
 */

import { useEffect, useRef } from "react";

/**
 * Fires `fn` once when `value` crosses upward to `threshold` (or above).
 * Resets the gate when value drops back below threshold, allowing a re-fire
 * the next time the crossing happens.
 *
 * One-shot per crossing: multiple renders at >= threshold do NOT re-fire.
 * Stable fn identity is recommended (pass via useCallback at the call site).
 */
export function useCrossUpEffect(
  value: number,
  threshold: number,
  fn: () => void,
): void {
  // Track whether we're currently in the "crossed" state (value >= threshold)
  const crossedRef = useRef(value >= threshold);

  useEffect(() => {
    const nowAbove = value >= threshold;
    if (nowAbove && !crossedRef.current) {
      // Upward crossing — fire once
      crossedRef.current = true;
      fn();
    } else if (!nowAbove && crossedRef.current) {
      // Dropped below — reset gate for next crossing
      crossedRef.current = false;
    }
  }, [value, threshold, fn]);
}
