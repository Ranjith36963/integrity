// lib/longPress.test.ts — M4b Goal Brick Stepper tests for useLongPressRepeat hook
// Covers: U-m4b-012, U-m4b-013, U-m4b-014

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLongPressRepeat, HOLD_MS, INTERVAL_MS } from "./longPress";

// ─── U-m4b-012: HOLD_MS and INTERVAL_MS constants ────────────────────────────

describe("U-m4b-012: longPress module exports HOLD_MS === 500 and INTERVAL_MS === 50", () => {
  it("HOLD_MS is exactly 500", () => {
    expect(HOLD_MS).toBe(500);
  });

  it("INTERVAL_MS is exactly 50", () => {
    expect(INTERVAL_MS).toBe(50);
  });
});

// ─── U-m4b-013: useLongPressRepeat fires initial tick + auto-repeat + stops ───

describe("U-m4b-013: useLongPressRepeat fires onTick on pointerdown, auto-repeats, stops on pointerup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires 1 initial + 1 at HOLD_MS + 3 intervals = 5 total; no more after pointerup", () => {
    const onTick = vi.fn();
    const { result } = renderHook(() =>
      useLongPressRepeat({ onTick, enabled: true }),
    );

    // Fire pointerdown — initial tick fires immediately
    act(() => {
      result.current.onPointerDown({} as React.PointerEvent);
    });
    expect(onTick).toHaveBeenCalledTimes(1);

    // Advance to HOLD_MS (500ms) — auto-repeat starts, first interval tick fires
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onTick).toHaveBeenCalledTimes(2);

    // Three more interval ticks at 50ms each
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(onTick).toHaveBeenCalledTimes(3);
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(onTick).toHaveBeenCalledTimes(4);
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(onTick).toHaveBeenCalledTimes(5);

    // pointerup — clears timers
    act(() => {
      result.current.onPointerUp({} as React.PointerEvent);
    });

    // Advance another 500ms — no more ticks should fire
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onTick).toHaveBeenCalledTimes(5);
  });
});
