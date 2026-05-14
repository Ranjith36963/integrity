// lib/timer.test.ts — M4c timer hook unit tests
// Covers: U-m4c-012..015

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimer } from "./timer";
import type { AppState } from "./types";

const BASE_TIME = new Date("2026-05-09T08:00:00.000Z").getTime();

function makeState(
  runningTimerBrickId: string | null,
  minutesDone = 0,
): AppState {
  return {
    blocks: [
      {
        id: "block-1",
        name: "block 1",
        start: "09:00",
        recurrence: { kind: "just-today", date: "2026-05-09" },
        categoryId: null,
        bricks: [
          {
            id: "t1",
            name: "Read",
            kind: "time",
            durationMin: 25,
            minutesDone,
            categoryId: null,
            parentBlockId: "block-1",
            hasDuration: false,
          },
        ],
      },
    ],
    categories: [],
    looseBricks: [],
    runningTimerBrickId,
  };
}

// ─── U-m4c-012: useTimer dispatches TICK_TIMER at 1-minute boundary ───────────

describe("U-m4c-012: useTimer dispatches TICK_TIMER once per minute boundary", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("dispatches TICK_TIMER once after 60 s; sub-minute ticks are no-ops", () => {
    const dispatch = vi.fn();
    const { rerender } = renderHook(
      ({ state }: { state: AppState }) => useTimer(state, dispatch),
      { initialProps: { state: makeState(null) } },
    );

    // Start the timer by re-rendering with runningTimerBrickId: "t1"
    act(() => {
      rerender({ state: makeState("t1") });
    });

    // Advance 60 seconds — crosses 1-minute boundary
    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({
      type: "TICK_TIMER",
      brickId: "t1",
      minutesDone: 1,
    });
  });

  it("59 sub-minute interval ticks are suppressed (identity short-circuit)", () => {
    const dispatch = vi.fn();
    renderHook(() => useTimer(makeState("t1"), dispatch));

    // Advance 59 seconds — no minute boundary crossed
    act(() => {
      vi.advanceTimersByTime(59_000);
    });

    expect(dispatch).not.toHaveBeenCalled();
  });
});

// ─── U-m4c-013: useTimer stops dispatching when runningTimerBrickId becomes null

describe("U-m4c-013: useTimer stops dispatching after runningTimerBrickId becomes null", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("no additional dispatches after null; interval torn down by cleanup", () => {
    const dispatch = vi.fn();
    const { rerender } = renderHook(
      ({ state }: { state: AppState }) => useTimer(state, dispatch),
      { initialProps: { state: makeState("t1") } },
    );

    // Advance 2 minutes — 2 dispatches
    act(() => {
      vi.advanceTimersByTime(120_000);
    });
    expect(dispatch).toHaveBeenCalledTimes(2);

    // Stop the timer
    act(() => {
      rerender({ state: makeState(null) });
    });

    // Advance 2 more minutes — no additional dispatches
    act(() => {
      vi.advanceTimersByTime(120_000);
    });
    expect(dispatch).toHaveBeenCalledTimes(2);
  });
});

// ─── U-m4c-014: useTimer dispatches corrective tick on visibilitychange ───────

describe("U-m4c-014: useTimer dispatches corrective TICK_TIMER on visibilitychange visible", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
  });

  afterEach(() => {
    vi.useRealTimers();
    // Restore visibilityState if we overwrote it
    Object.defineProperty(document, "visibilityState", {
      writable: true,
      value: "visible",
    });
  });

  it("corrective tick fires with minutesDone=2 after 120s wall-clock jump without intervals", () => {
    const dispatch = vi.fn();
    renderHook(() => useTimer(makeState("t1"), dispatch));

    // Simulate tab-background: jump wall-clock by 120s without firing intervals
    act(() => {
      vi.setSystemTime(BASE_TIME + 120_000);
    });

    // Simulate visibilitychange to visible
    Object.defineProperty(document, "visibilityState", {
      writable: true,
      value: "visible",
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: "TICK_TIMER",
      brickId: "t1",
      minutesDone: 2,
    });
  });
});

// ─── U-m4c-015: useTimer re-captures initialMinutesDone on SET_TIMER_MINUTES ──

describe("U-m4c-015: useTimer re-captures initialMinutesDone when minutesDone changes mid-run", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("next TICK_TIMER carries minutesDone: 11 (10 from SET + 1 elapsed), not 3 (old base)", () => {
    const dispatch = vi.fn();
    const { rerender } = renderHook(
      ({ state }: { state: AppState }) => useTimer(state, dispatch),
      { initialProps: { state: makeState("t1", 0) } },
    );

    // Advance 2 minutes — dispatch called twice with minutesDone 1 and 2
    act(() => {
      vi.advanceTimersByTime(120_000);
    });
    expect(dispatch).toHaveBeenCalledTimes(2);

    // Manual entry changes minutesDone to 10 via SET_TIMER_MINUTES
    // Re-render with updated state (same runningTimerBrickId but new minutesDone)
    act(() => {
      rerender({ state: makeState("t1", 10) });
    });

    // Advance 1 more minute — effect re-ran, captured initialMinutesDone=10
    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    // Last dispatch should carry minutesDone: 11 (10 + 1), not 3 (old base 2 + 1)
    const lastCall = dispatch.mock.calls[dispatch.mock.calls.length - 1];
    expect(lastCall[0]).toEqual({
      type: "TICK_TIMER",
      brickId: "t1",
      minutesDone: 11,
    });
  });
});
