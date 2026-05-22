/**
 * lib/celebrations.ts — M3 cross-detection hook and celebration helpers.
 *
 * useCrossUpEffect(value, threshold, fn):
 *   - Fires fn() once when value transitions from < threshold to >= threshold.
 *   - Resets the one-shot gate when value drops back below threshold.
 *   - Used by <TimelineBlock> (block 100% bloom+chime+success haptic)
 *     and <HeroRing> host (day 100% fireworks+notification haptic).
 *
 * M7d additions:
 * useBlockCelebrationOnce(blockId, pct):
 *   - Returns true exactly once per mount on the FIRST upward crossing of pct >= 100
 *     for a given blockId. Backed by useRef<Set<string>> (one per component instance).
 *   - Hydration into pct >= 100 adds the id to the Set WITHOUT firing (returns false).
 *   - After the first firing, the id stays in the Set — no replay on 100→99→100 cycles.
 *   - Resolves SG-m7d-02 "once per block per mount" sparing semantics.
 *
 * useDayCelebrationOnce(pct):
 *   - Analogous to useBlockCelebrationOnce but for the day-level hook.
 *   - Returns true exactly once per mount on the FIRST upward crossing of pct >= 100.
 *   - Backed by useRef<boolean> (mount-shot).
 *   - Hydration into pct >= 100 sets the mount-shot WITHOUT firing.
 *
 * celebrate(kind, opts):
 *   - Pure synchronous shim routing haptics + (gated) audio for a celebration.
 *   - "wire when a real chime.mp3 lands (>30 KB target per SG-m4a-04)"
 *   - withAudio defaults to false; M7d wires it false everywhere.
 *   - When withAudio === true, calls playChime() from lib/audio.ts.
 */

import { useEffect, useRef } from "react";
import { haptics } from "@/lib/haptics";
import { playChime } from "@/lib/audio";

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

/**
 * Returns true exactly once per mount on the FIRST upward crossing of pct >= 100
 * for a given blockId. Backed by useRef<Set<string>> (one per component instance).
 *
 * Hydration semantics:
 *   - If pct >= 100 on the very first render, the id is added to the Set WITHOUT
 *     returning true (no celebration for already-done blocks at hydration).
 *   - After the first firing, the id stays in the Set so 100→99→100 oscillations
 *     within the same mount do NOT trigger a second bloom. Resolves SG-m7d-02.
 *
 * Remount semantics:
 *   - The Set lives inside a useRef — it is component-instance-local. A remount
 *     (Day→Week→Day view switch) creates a fresh empty Set, so a 99→100 crossing
 *     on the new mount fires normally.
 *
 * Implementation: pure ref machine (following lib/firstPaint.ts precedent).
 * Refs are read and written during render to implement the per-instance tri-state
 * gate. This is a "derived ref" pattern — the refs are not state dependencies and
 * never trigger re-renders. The eslint-disable-next-line annotations follow the
 * exact same justification as lib/firstPaint.ts (M7a plan.md precedent; the
 * react-hooks/refs rule legitimately fires on the "previous value" ref pattern
 * but this is the correct implementation for a per-render transition detector
 * per SPEC AC #1–#3 and plan.md SG-m7d-02).
 */
export function useBlockCelebrationOnce(blockId: string, pct: number): boolean {
  // Set of block ids that have already bloomed during this mount.
  const bloomed = useRef<Set<string>>(new Set());
  // Previous pct value — used for transition detection.
  const prevPctRef = useRef<number>(pct);
  // First-render guard for hydration suppression.
  const isFirst = useRef<boolean>(true);

  // eslint-disable-next-line react-hooks/refs -- M7d plan.md SG-m7d-02 "once per block per mount": reading isFirst.current during render is the intentional "derived ref" gate pattern (precedent: lib/firstPaint.ts). Never triggers re-render; pure per-instance transition detector per SPEC AC #1–#3.
  if (isFirst.current) {
    // eslint-disable-next-line react-hooks/refs -- same as above: writing isFirst.current during render to advance from first-render state. Safe: ref mutation never triggers re-render.
    isFirst.current = false;
    // eslint-disable-next-line react-hooks/refs -- same as above: writing bloomed.current during hydration render to suppress the first-paint false-fire (SPEC AC #2: "block already at 100% at hydration does not bloom").
    if (pct >= 100) bloomed.current.add(blockId);
    // eslint-disable-next-line react-hooks/refs -- same as above: setting prevPctRef on first render so subsequent renders have a valid previous value to compare against.
    prevPctRef.current = pct;
    return false;
  }

  // eslint-disable-next-line react-hooks/refs -- same as above: reading prevPct is the "previous value" pattern — a standard React per-render transition detector. The value is derived from the previous render, not from state.
  const prevPct = prevPctRef.current;
  // eslint-disable-next-line react-hooks/refs -- same as above: updating prevPct for the next render's transition comparison.
  prevPctRef.current = pct;

  // eslint-disable-next-line react-hooks/refs -- same as above: reading bloomed.current to check if blockId is already in the gate Set (sparing semantics per plan.md SG-m7d-02).
  if (pct >= 100 && prevPct < 100 && !bloomed.current.has(blockId)) {
    // First crossing for this blockId — fire! Add to Set to prevent replay.
    // eslint-disable-next-line react-hooks/refs -- same as above: adding blockId to the gate Set to lock further crossings (sparing semantics per plan.md SG-m7d-02).
    bloomed.current.add(blockId);
    return true;
  }

  return false;
}

/**
 * Returns true exactly once per mount on the FIRST upward crossing of pct >= 100.
 * Backed by useRef<boolean> (mount-shot).
 *
 * Hydration semantics:
 *   - If pct >= 100 on the very first render, the mount-shot is set to true
 *     WITHOUT returning true.
 *
 * Remount semantics:
 *   - The boolean lives inside a useRef — component-instance-local. A remount
 *     resets the hook, allowing the celebration to fire on the next crossing.
 *
 * Implementation: pure ref machine (following lib/firstPaint.ts precedent).
 * Same eslint-disable justification as useBlockCelebrationOnce above.
 */
export function useDayCelebrationOnce(pct: number): boolean {
  // Whether this mount-instance has already fired the day celebration.
  const fired = useRef<boolean>(false);
  const prevPctRef = useRef<number>(pct);
  const isFirst = useRef<boolean>(true);

  // eslint-disable-next-line react-hooks/refs -- M7d plan.md useDayCelebrationOnce: same "derived ref" gate pattern as useBlockCelebrationOnce and lib/firstPaint.ts. Reading isFirst.current during render for hydration suppression per SPEC AC #5.
  if (isFirst.current) {
    // eslint-disable-next-line react-hooks/refs -- same as above: advancing from first-render state.
    isFirst.current = false;
    // eslint-disable-next-line react-hooks/refs -- same as above: setting fired.current on hydration-into-100% to suppress the mount-shot (SPEC AC #5: "day at 100% at hydration does not fire fireworks").
    if (pct >= 100) fired.current = true;
    // eslint-disable-next-line react-hooks/refs -- same as above: initialising prevPct for subsequent renders.
    prevPctRef.current = pct;
    return false;
  }

  // eslint-disable-next-line react-hooks/refs -- same as above: reading prevPct for transition detection.
  const prevPct = prevPctRef.current;
  // eslint-disable-next-line react-hooks/refs -- same as above: updating prevPct for the next render.
  prevPctRef.current = pct;

  // eslint-disable-next-line react-hooks/refs -- same as above: reading fired.current to enforce mount-shot semantics (SPEC AC #4: "fireworks overlay fires once per mount").
  if (pct >= 100 && prevPct < 100 && !fired.current) {
    // First crossing — fire!

    fired.current = true;
    return true;
  }

  return false;
}

/**
 * Celebration shim — synchronously dispatches haptics + (gated) audio for a celebration.
 *
 * M7d invariants:
 * 1. Default withAudio === false. No M7d call site passes withAudio: true.
 *    The playChime import is reachable in this module but unexecuted on every M7d path.
 * 2. This shim is the SINGLE audio gate. The M7f follow-up that lands a real chime
 *    asset is a one-line change at the call sites (withAudio: true or flip the default).
 */
export function celebrate(
  kind: "block" | "day",
  opts?: {
    /**
     * When true, fires the chime audio. M7d default: false (audio deferred per SG-m7d-01).
     */
    withAudio?: boolean;
  },
): void {
  const withAudio = opts?.withAudio ?? false;

  if (kind === "block") {
    haptics.success();
  } else {
    haptics.notification();
  }

  if (withAudio) {
    playChime();
  }
}
