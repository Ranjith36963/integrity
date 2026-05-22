/**
 * C-m0-011: Stepper +/- respects min/max bounds.
 * C-m0-012: Stepper long-press accelerates to 10× cap.
 * C-m0-013: Stepper commits invoke haptics.light once per commit.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
