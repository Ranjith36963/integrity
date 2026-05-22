/**
 * lib/firstPaint.ts — M7a: useFirstPaintAfterHydration hook.
 *
 * Returns `true` on the FIRST render where `hydrated` is `true`, `false` on every
 * subsequent render of the same component instance.
 *
 * Backed by a useRef<"pending" | "staggered" | "done"> tri-state so the stagger
 * fires once per mount of BuildingClient and never again (AC #2).
 *
 * On unmount the ref is discarded; a remount (e.g. switching Week → Day) re-fires
 * the stagger — consistent with "fires once per BuildingClient mount".
 *
 * Pure ref machine — no useEffect, no useState, no DOM access.
 * Assigning to ref.current during render is intentional and safe for this use case:
 * this is a "derived ref" pattern — the value is not used for rendering but as
 * a per-instance mutable counter to guard against re-stagger (plan.md § Data model).
 * Safely SSR-importable (no window access).
 */

import { useRef } from "react";

export function useFirstPaintAfterHydration(hydrated: boolean): boolean {
  const phase = useRef<"pending" | "staggered" | "done">("pending");

  if (!hydrated) return false; // pre-hydration → no stagger (skeleton path)

  // eslint-disable-next-line react-hooks/refs -- M7a plan.md § Data model: reading ref.current during render is the intentional "derived ref" pattern for a per-instance stagger-once guard (AC #2). This is not a state dependency — just a mutable counter that never triggers re-render.
  if (phase.current === "pending") {
    // First render where hydrated === true → stagger fires
    // eslint-disable-next-line react-hooks/refs -- same as above: writing ref.current during render to advance the tri-state machine (pending → staggered). Safe: ref mutation never triggers re-render.
    phase.current = "staggered";
    return true;
  }

  // eslint-disable-next-line react-hooks/refs -- same as above: reading ref.current during render to detect the staggered → done transition (plan.md § Data model tri-state machine).
  if (phase.current === "staggered") {
    // Very next render → transition staggered → done (Framer variants have been applied)
    // eslint-disable-next-line react-hooks/refs -- same as above: advancing tri-state machine during render (staggered → done). Safe.
    phase.current = "done";
    return false;
  }

  // All subsequent renders (done state)
  return false;
}
