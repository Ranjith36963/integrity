// lib/longPress.test.ts — M4b Goal Brick Stepper tests for useLongPressRepeat hook
// Covers: U-m4b-012, U-m4b-013, U-m4b-014

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useLongPressRepeat,
  useLongPress,
  HOLD_MS,
  INTERVAL_MS,
} from "./longPress";

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

// ─── U-m4b-014: enabled=false stops in-flight auto-repeat ────────────────────

describe("U-m4b-014: useLongPressRepeat stops auto-repeat when enabled flips to false mid-press", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("no further onTick calls after enabled flips false during auto-repeat", () => {
    const onTick = vi.fn();
    let enabled = true;
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useLongPressRepeat({ onTick, enabled }),
      { initialProps: { enabled: true } },
    );

    // Start press and advance past HOLD_MS to enter auto-repeat
    act(() => {
      result.current.onPointerDown({} as React.PointerEvent);
    });
    act(() => {
      vi.advanceTimersByTime(700); // past 500ms hold + some interval ticks
    });
    const callsBeforeDisable = onTick.mock.calls.length;
    expect(callsBeforeDisable).toBeGreaterThan(1); // initial + auto-repeat ticks

    // Flip enabled to false
    enabled = false;
    rerender({ enabled });

    // Advance 200ms more — no additional ticks should fire
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onTick).toHaveBeenCalledTimes(callsBeforeDisable);
  });
});

// ─── U-m4c-016: useLongPress single-fire hook ─────────────────────────────────

describe("U-m4c-016: useLongPress single-fire tap/long-press hook", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("short press (< 500 ms): onTap called once; onLongPress NOT called", () => {
    const onTap = vi.fn();
    const onLongPress = vi.fn();
    const { result } = renderHook(() =>
      useLongPress({ holdMs: 500, onTap, onLongPress }),
    );

    act(() => {
      result.current.onPointerDown({} as React.PointerEvent);
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    act(() => {
      result.current.onPointerUp({} as React.PointerEvent);
    });

    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("long press (holdMs elapses without pointerup): onLongPress called once; onTap NOT called", () => {
    const onTap = vi.fn();
    const onLongPress = vi.fn();
    const { result } = renderHook(() =>
      useLongPress({ holdMs: 500, onTap, onLongPress }),
    );

    act(() => {
      result.current.onPointerDown({} as React.PointerEvent);
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(onTap).not.toHaveBeenCalled();
  });

  it("after long-press fires, subsequent pointerup does NOT call onTap (consumed-ref guard)", () => {
    const onTap = vi.fn();
    const onLongPress = vi.fn();
    const { result } = renderHook(() =>
      useLongPress({ holdMs: 500, onTap, onLongPress }),
    );

    act(() => {
      result.current.onPointerDown({} as React.PointerEvent);
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    act(() => {
      result.current.onPointerUp({} as React.PointerEvent);
    });

    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(onTap).not.toHaveBeenCalled();
  });

  it("pointercancel during press: neither callback fires", () => {
    const onTap = vi.fn();
    const onLongPress = vi.fn();
    const { result } = renderHook(() =>
      useLongPress({ holdMs: 500, onTap, onLongPress }),
    );

    act(() => {
      result.current.onPointerDown({} as React.PointerEvent);
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    act(() => {
      result.current.onPointerCancel({} as React.PointerEvent);
    });

    expect(onTap).not.toHaveBeenCalled();
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("unmount mid-press: no callback fires after unmount (timeout cleared)", () => {
    const onTap = vi.fn();
    const onLongPress = vi.fn();
    const { result, unmount } = renderHook(() =>
      useLongPress({ holdMs: 500, onTap, onLongPress }),
    );

    act(() => {
      result.current.onPointerDown({} as React.PointerEvent);
    });
    unmount();

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(onTap).not.toHaveBeenCalled();
    expect(onLongPress).not.toHaveBeenCalled();
  });
});
