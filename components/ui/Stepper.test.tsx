/**
 * C-m0-011: Stepper +/- respects min/max bounds.
 * C-m0-012: Stepper long-press accelerates to 10× cap.
 * C-m0-013: Stepper commits invoke haptics.light once per commit.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { Stepper } from "./Stepper";

// C-m0-011
describe("C-m0-011: Stepper bounds", () => {
  it("calls onChange with value+1 when + is clicked", async () => {
    const spy = vi.fn();
    render(<Stepper value={5} min={0} max={10} onChange={spy} />);
    await userEvent.click(screen.getByRole("button", { name: "Increment" }));
    expect(spy).toHaveBeenCalledWith(6);
  });

  it("calls onChange with value-1 when - is clicked", async () => {
    const spy = vi.fn();
    render(<Stepper value={5} min={0} max={10} onChange={spy} />);
    await userEvent.click(screen.getByRole("button", { name: "Decrement" }));
    expect(spy).toHaveBeenCalledWith(4);
  });

  it("does not call onChange when + is clicked at max", async () => {
    const spy = vi.fn();
    render(<Stepper value={10} min={0} max={10} onChange={spy} />);
    await userEvent.click(screen.getByRole("button", { name: "Increment" }));
    expect(spy).not.toHaveBeenCalled();
  });

  it("does not call onChange when - is clicked at min", async () => {
    const spy = vi.fn();
    render(<Stepper value={0} min={0} max={10} onChange={spy} />);
    await userEvent.click(screen.getByRole("button", { name: "Decrement" }));
    expect(spy).not.toHaveBeenCalled();
  });
});

// C-m0-012
describe("C-m0-012: Stepper long-press accelerator", () => {
  // BASE_INTERVAL_MS=300, ACCEL_START_MS=1500, MAX_ACCEL=10 (from Stepper.tsx)
  const BASE_INTERVAL_MS = 300;
  const MAX_ACCEL = 10;

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("ramp: calls-per-tick grows over first 1500ms, and cap: never exceeds 10× per tick", () => {
    const spy = vi.fn();
    render(<Stepper value={0} max={1000} onChange={spy} />);
    const incBtn = screen.getByRole("button", { name: "Increment" });

    // Start long-press
    incBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    // ── Early tick (t=300ms from press start) ──────────────────────────────
    // accel = min(10, 1 + floor((300/1500) * 9)) = min(10, 1+1) = 2
    spy.mockClear();
    vi.advanceTimersByTime(BASE_INTERVAL_MS);
    const earlyTickCalls = spy.mock.calls.length;

    // ── Advance past the ramp (total elapsed = 1800ms) ─────────────────────
    // accel at t=1800ms = min(10, 1 + floor((1800/1500) * 9)) = 10
    spy.mockClear();
    vi.advanceTimersByTime(1500);

    // ── Late tick (one more 300ms window at full speed) ────────────────────
    spy.mockClear();
    vi.advanceTimersByTime(BASE_INTERVAL_MS);
    const lateTickCalls = spy.mock.calls.length;

    // Stop long-press
    incBtn.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

    // Ramp: the late tick must commit more per tick than the early tick did.
    expect(lateTickCalls).toBeGreaterThan(earlyTickCalls);

    // Cap: the late tick must never exceed MAX_ACCEL calls (10× floor).
    expect(lateTickCalls).toBeLessThanOrEqual(MAX_ACCEL);

    // Sanity: early tick observed at least 1 call.
    expect(earlyTickCalls).toBeGreaterThanOrEqual(1);
  }, 10_000);
});

// C-m0-013
describe("C-m0-013: Stepper haptic on each commit", () => {
  it("calls haptics.light() once when + is clicked", async () => {
    const hapticsModule = await import("@/lib/haptics");
    const lightSpy = vi
      .spyOn(hapticsModule.haptics, "light")
      .mockImplementation(() => {});

    const spy = vi.fn();
    render(<Stepper value={5} onChange={spy} />);
    await userEvent.click(screen.getByRole("button", { name: "Increment" }));
    expect(lightSpy).toHaveBeenCalledOnce();

    lightSpy.mockRestore();
  });
});

// C-m0-014 — SC-1 mutation guard: stale-closure on long-press
describe("C-m0-014: Stepper long-press passes monotonically-increasing values", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("each tick yields onChange values STRICTLY HIGHER than the previous tick's first call", () => {
    // Strengthened per TEST-1 (re-review of P0 fix): advance time in DISTINCT
    // 300ms increments and assert each tick's first call > previous tick's
    // first call. The original assertion (uniqueValues.size >= 3) could be
    // satisfied entirely within a single tick at accel >= 3 via the inline
    // valueRef.current = next write — never actually exercising the React
    // state-sync path. This stricter form requires PROP changes to flow
    // between ticks.
    const allCalls: number[] = [];
    const Spy = () => {
      const [v, setV] = React.useState(0);
      return (
        <Stepper
          value={v}
          max={1000}
          onChange={(n) => {
            allCalls.push(n);
            setV(n);
          }}
        />
      );
    };
    render(<Spy />);
    const incBtn = screen.getByRole("button", { name: "Increment" });

    incBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    // Tick 1 (t=300ms, accel=1)
    vi.advanceTimersByTime(300);
    const tick1First = allCalls[0];
    const tick1End = allCalls.length;

    // Tick 2 (t=600ms, accel=2)
    vi.advanceTimersByTime(300);
    const tick2First = allCalls[tick1End];

    // Tick 3 (t=900ms, accel=2)
    vi.advanceTimersByTime(300);
    const tick3First = allCalls[allCalls.length - 1];

    incBtn.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

    // Each tick's first call must be strictly higher than the previous tick's
    // first call — proves React-state sync (or inline ref advance) is working.
    expect(tick1First).toBe(1);
    expect(tick2First).toBeGreaterThan(tick1First);
    expect(tick3First).toBeGreaterThan(tick2First);
  }, 10_000);
});

// C-m0-030 — NEW-1 mutation guard: valueRef survives unrelated re-renders
describe("C-m0-030: Stepper valueRef does not reset during long-press on unrelated parent re-render", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("unrelated parent state changes during press do not reset valueRef to stale prop", () => {
    // R3-2 strengthening (previous version was tautological): the parent
    // intentionally HOLDS `value` at 0 during the press (does NOT update via
    // setV), simulating a debounced/lagged controlled parent. Then unrelated
    // sibling state changes force re-renders.
    //
    // With the bug (effect unconditionally syncs valueRef = value):
    //   every sibling re-render writes valueRef = 0 → next tick re-commits
    //   from 0 → onChange repeatedly fires (1).
    //
    // With the fix (isPressedRef guard skips sync while pressed):
    //   valueRef stays at the optimistic advance → onChange fires 1, 2, 3...
    const allCalls: number[] = [];
    const trigger: { fn?: () => void } = {};

    function FrozenParent() {
      // `value` deliberately frozen at 0 to simulate parent NOT flowing
      // committed value back (debounced setState, controlled-by-server, etc.).
      const [, setTick] = React.useState(0);
      trigger.fn = () => setTick((t) => t + 1);
      return (
        <Stepper
          value={0}
          max={1000}
          onChange={(n) => {
            allCalls.push(n);
          }}
        />
      );
    }
    render(<FrozenParent />);
    const incBtn = screen.getByRole("button", { name: "Increment" });

    incBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    vi.advanceTimersByTime(300); // Tick 1 → onChange(1), valueRef=1
    trigger.fn?.(); // sibling re-render — with bug, effect resets valueRef→0
    vi.advanceTimersByTime(300); // Tick 2 → with fix, onChange(2); with bug, onChange(1)
    trigger.fn?.();
    vi.advanceTimersByTime(300); // Tick 3 → with fix, onChange(3); with bug, onChange(1)

    incBtn.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

    // With the bug, every call would be 1 (valueRef reset by each sibling
    // re-render). With the fix, calls advance monotonically.
    expect(Math.max(...allCalls)).toBeGreaterThanOrEqual(3);
    // Stronger: at least 3 DISTINCT values must have been emitted.
    const uniqueValues = new Set(allCalls);
    expect(uniqueValues.size).toBeGreaterThanOrEqual(3);
  }, 10_000);
});

// C-m0-034 — R3-1 mutation guard: interval stops when boundary is hit
describe("C-m0-034: Stepper long-press stops the interval at boundary", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("when value hits max during press, interval is cleared (no leak after disabled flips)", () => {
    // R3-1 trigger: once value === max, the button receives disabled=true,
    // which adds pointer-events-none — pointerup/leave/cancel never reach
    // the button → stopLongPress never runs → setInterval leaks.
    // Fix: commit() detects next === current and calls stopLongPress itself.
    const allCalls: number[] = [];
    const Spy = () => {
      const [v, setV] = React.useState(0);
      return (
        <Stepper
          value={v}
          max={3}
          onChange={(n) => {
            allCalls.push(n);
            setV(n);
          }}
        />
      );
    };
    render(<Spy />);
    const incBtn = screen.getByRole("button", { name: "Increment" });

    incBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    // Drive past the boundary. Max is 3; at base rate (1 commit/tick) we hit
    // boundary on tick 3. Advance enough time that the interval would have
    // fired many more times if it were still alive.
    vi.advanceTimersByTime(5000);

    // No more than `max` commits should have occurred; the interval must
    // have stopped itself once the boundary was hit. Without the fix, allCalls
    // would still contain the boundary value over and over (early-return
    // pre-commit, but the interval is still alive on each tick).
    expect(Math.max(...allCalls)).toBe(3);
    // Critical assertion: vi.getTimerCount() === 0 after boundary stop.
    expect(vi.getTimerCount()).toBe(0);

    // Cleanup (no-op since interval already stopped; defensive).
    incBtn.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
  }, 10_000);
});

// C-m0-035 — R3-3 mutation guard: double pointerdown does not leak an interval
describe("C-m0-035: Stepper guards against re-entrant pointerdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("second pointerdown without intervening pointerup does not create a second interval", () => {
    // R3-3 trigger: a buggy gesture library re-fires pointerdown. Without
    // the guard, intervalRef gets overwritten by the new setInterval — the
    // first interval keeps firing but its handle is lost forever.
    const Spy = () => {
      const [v, setV] = React.useState(0);
      return <Stepper value={v} max={1000} onChange={setV} />;
    };
    render(<Spy />);
    const incBtn = screen.getByRole("button", { name: "Increment" });

    incBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    // Re-entrant pointerdown — the guard should make this a no-op.
    incBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    // Exactly ONE active timer (the original interval) — not two.
    expect(vi.getTimerCount()).toBe(1);

    incBtn.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    expect(vi.getTimerCount()).toBe(0);
  }, 10_000);
});

// C-m0-032 — SC-3 mutation guard: long-press stops on pointercancel
describe("C-m0-032: Stepper long-press stops on pointercancel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("pointercancel halts the interval (browser-initiated press abort)", () => {
    // iOS Safari fires pointercancel when a system gesture or scroll
    // interrupts the touch. Without onPointerCancel wired to stopLongPress,
    // the interval keeps ticking, onChange keeps firing, and isPressedRef
    // stays true forever — value jumps far beyond user intent.
    const allCalls: number[] = [];
    const Spy = () => {
      const [v, setV] = React.useState(0);
      return (
        <Stepper
          value={v}
          max={1000}
          onChange={(n) => {
            allCalls.push(n);
            setV(n);
          }}
        />
      );
    };
    render(<Spy />);
    const incBtn = screen.getByRole("button", { name: "Increment" });

    incBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    vi.advanceTimersByTime(600); // 2 ticks
    const callsAtCancel = allCalls.length;

    // System cancels the press.
    incBtn.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true }));

    // After cancellation, advancing time MUST not fire any more onChange.
    vi.advanceTimersByTime(2000);
    expect(allCalls.length).toBe(callsAtCancel);
  }, 10_000);
});
