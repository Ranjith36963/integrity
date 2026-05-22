import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNow } from "./useNow";

// U-bld-022: useNow hook returns HH:MM and ticks on setInterval
// Note on fake-timer sequencing: vi.setSystemTime pins the wall clock;
// vi.advanceTimersByTime advances both the timer queue and the wall clock
// from wherever setSystemTime left it. To fire the 60s interval while the
// wall clock still reads "12:48", we advance by 1ms first (so the queue is
// at 1ms), then setSystemTime("12:48"), then advance by 59_999ms to reach
// the 60_000ms threshold and fire the callback while the wall is at 12:48:59.
describe("U-bld-022: useNow hook tick", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns HH:MM matching system time and updates after 60s tick", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-29T11:47:00"));

    const { result, unmount } = renderHook(() => useNow());

    // Initial render should show 11:47
    expect(result.current).toBe("11:47");

    // Advance 1ms so the timer queue starts (queue = 1ms, wall = 11:47:00.001)
    act(() => {
      vi.advanceTimersByTime(1);
    });

    // Move wall clock to 12:48 (queue stays at 1ms)
    vi.setSystemTime(new Date("2026-04-29T12:48:00"));

    // Advance remaining 59_999ms to fire the interval (queue hits 60_000ms).
    // Wall clock moves from 12:48:00 to 12:48:59.999 — still reads "12:48".
    act(() => {
      vi.advanceTimersByTime(59_999);
    });

    expect(result.current).toBe("12:48");

    // Unmount clears the interval — advancing further must not throw or update
    unmount();
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    // Value stays at "12:48" after unmount — no further updates
    expect(result.current).toBe("12:48");
  });
});
