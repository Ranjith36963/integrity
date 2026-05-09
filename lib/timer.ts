"use client";
/**
 * lib/timer.ts — M4c Time Brick Timer hook.
 *
 * Exposes useTimer(state, dispatch) — called once at the top of <BuildingClient>.
 * Manages a single setInterval at 1 s cadence + visibilitychange listener.
 * Resolves SG-m4c-01..04, SG-m4c-08.
 *
 * Design:
 * - useEffect keyed on state.runningTimerBrickId (+ full state for minutesDone re-capture).
 * - On non-null: captures startedAt + initialMinutesDone, starts interval.
 * - Each tick: floor((Date.now() - startedAt) / 60000) + initialMinutesDone.
 * - Identity short-circuit: dispatch only on minute-boundary crossings.
 * - visibilitychange listener dispatches a corrective tick on visible (SG-m4c-08).
 * - No localStorage — M8 lands persistence per ADR-017 / ADR-018.
 */

import { useEffect, useRef } from "react";
import type { AppState, Action, Brick } from "./types";

/** 1 s interval — SG-m4c-02. M7 may revisit. */
const TICK_INTERVAL_MS = 1000;

/** Exported for unit testing in isolation (plan § Cross-cutting concerns #7). */
export function findTimeBrickById(
  state: AppState,
  id: string,
): Extract<Brick, { kind: "time" }> | null {
  for (const block of state.blocks) {
    for (const brick of block.bricks) {
      if (brick.id === id && brick.kind === "time") return brick;
    }
  }
  for (const brick of state.looseBricks) {
    if (brick.id === id && brick.kind === "time") return brick;
  }
  return null;
}

export function useTimer(
  state: AppState,
  dispatch: React.Dispatch<Action>,
): void {
  const startedAtRef = useRef<number | null>(null);
  const initialMinutesDoneRef = useRef<number>(0);
  const lastDispatchedMinutesRef = useRef<number>(0);

  // Drive the interval off state.runningTimerBrickId (+ full state for minutesDone re-capture).
  // The dep on full state ensures the effect re-runs when the running brick's minutesDone changes
  // (e.g., after SET_TIMER_MINUTES mid-run), re-capturing the new initialMinutesDone floor
  // per plan § Edge cases ("Manual entry while running") and U-m4c-015.
  useEffect(() => {
    const runningId = state.runningTimerBrickId;
    if (runningId === null) {
      startedAtRef.current = null;
      return;
    }

    // Capture the floor at start (SG-m4c-03 — floor, not round).
    const brick = findTimeBrickById(state, runningId);
    if (brick === null) return; // defensive — should not happen

    startedAtRef.current = Date.now();
    initialMinutesDoneRef.current = brick.minutesDone;
    lastDispatchedMinutesRef.current = brick.minutesDone;

    const computeAndDispatch = () => {
      if (startedAtRef.current === null) return;
      const elapsedMs = Date.now() - startedAtRef.current;
      const next =
        Math.floor(elapsedMs / 60_000) + initialMinutesDoneRef.current;
      if (next === lastDispatchedMinutesRef.current) return; // identity short-circuit (SG-m4c-02)
      lastDispatchedMinutesRef.current = next;
      dispatch({ type: "TICK_TIMER", brickId: runningId, minutesDone: next });
    };

    const intervalId = window.setInterval(computeAndDispatch, TICK_INTERVAL_MS);

    // SG-m4c-08 — visibilitychange recovery. On tab foreground, dispatch one corrective tick
    // immediately (browser-throttled intervals miss ticks while backgrounded).
    const onVisible = () => {
      if (document.visibilityState === "visible") computeAndDispatch();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
      startedAtRef.current = null;
    };
  }, [state.runningTimerBrickId, dispatch, state]);
}
