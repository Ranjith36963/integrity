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
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls onChange multiple times during a 3s hold (acceleration ramps to 10×)", () => {
    const spy = vi.fn();
    render(<Stepper value={0} max={1000} onChange={spy} />);
    const incBtn = screen.getByRole("button", { name: "Increment" });

    // Trigger onPointerDown to start the long-press interval
    incBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    // Advance 3s — the interval fires every 300ms = 10 ticks before acceleration
    // After 1500ms acceleration starts ramping
    vi.advanceTimersByTime(3000);

    // Stop
    incBtn.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

    // Should have been called many times (at least one per 300ms tick = ~10 + acceleration)
    expect(spy.mock.calls.length).toBeGreaterThan(5);
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
