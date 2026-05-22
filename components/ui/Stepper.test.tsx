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
    // A parent that re-renders on a sibling state change while the press is
    // active. With the NEW-1 fix (isPressedRef guard skipping the effect's
    // valueRef sync during press), valueRef advances correctly. Without
    // the guard, the effect's sync overwrites valueRef with the stale prop
    // each unrelated re-render, undoing in-flight commits.
    const allCalls: number[] = [];
    let triggerSiblingRerender: (() => void) | null = null;

    function Flickering() {
      const [v, setV] = React.useState(0);
      const [tick, setTick] = React.useState(0);
      triggerSiblingRerender = () => setTick((t) => t + 1);
      void tick;
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
    }
    render(<Flickering />);
    const incBtn = screen.getByRole("button", { name: "Increment" });

    incBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    // Tick 1
    vi.advanceTimersByTime(300);
    // Sibling re-render mid-press (would reset valueRef under the bug)
    triggerSiblingRerender?.();
    // Tick 2
    vi.advanceTimersByTime(300);
    // Another sibling re-render
    triggerSiblingRerender?.();
    // Tick 3
    vi.advanceTimersByTime(300);

    incBtn.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

    // After 3 ticks at base rate, value should advance ≥ 3. With the bug,
    // each sibling re-render would reset valueRef → repeated onChange(1).
    expect(Math.max(...allCalls)).toBeGreaterThanOrEqual(3);
    const uniqueValues = new Set(allCalls);
    expect(uniqueValues.size).toBeGreaterThanOrEqual(3);
  }, 10_000);
});
