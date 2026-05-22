/**
 * components/FirstBrickCard.test.tsx — M7e: C-m7e-001..005
 * Tests for the one-time "Your Empire begins." narrative card.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { FirstBrickCard } from "./FirstBrickCard";

// Fake timers harness for C-m7e-003, C-m7e-004
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});
afterEach(() => {
  vi.useRealTimers();
});

// C-m7e-001: visible={false} → renders null
describe("C-m7e-001: <FirstBrickCard visible={false} /> renders null", () => {
  it("returns null — no DOM nodes", () => {
    const { container } = render(
      <FirstBrickCard visible={false} onDismiss={vi.fn()} />,
    );
    expect(screen.queryByTestId("first-brick-card")).toBeNull();
    expect(container.firstChild).toBeNull();
  });
});

// C-m7e-002: visible={true} → renders headline with role/aria-live
describe("C-m7e-002: <FirstBrickCard visible={true} /> renders headline with a11y attrs", () => {
  it("renders the headline, testid, role=status, aria-live=polite, font-display style", () => {
    render(<FirstBrickCard visible={true} onDismiss={vi.fn()} />);
    const card = screen.getByTestId("first-brick-card");
    expect(card).toBeTruthy();
    expect(card.textContent).toContain("Your Empire begins.");
    expect(card.getAttribute("role")).toBe("status");
    expect(card.getAttribute("aria-live")).toBe("polite");
    // font-display is applied via inline style or class
    const headline = card.querySelector("[style*='--font-display']");
    expect(headline).toBeTruthy();
  });
});

// C-m7e-003: auto-dismiss after exactly 3000 ms
describe("C-m7e-003: <FirstBrickCard> auto-dismisses after exactly 3000 ms", () => {
  it("calls onDismiss 0 times at 2999 ms, 1 time at 3000 ms, still 1 time at 8000 ms", async () => {
    const onDismiss = vi.fn();
    render(<FirstBrickCard visible={true} onDismiss={onDismiss} />);

    await act(async () => {
      vi.advanceTimersByTime(2999);
    });
    expect(onDismiss).toHaveBeenCalledTimes(0);

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1); // fires exactly once
  });
});

// C-m7e-004: tap fires onDismiss and cancels the auto-dismiss timer
describe("C-m7e-004: tap on card body fires onDismiss and cancels the auto-dismiss timer", () => {
  it("calls onDismiss once on click; no second call at t=3000", async () => {
    const onDismiss = vi.fn();
    render(<FirstBrickCard visible={true} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByTestId("first-brick-card"));
    expect(onDismiss).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(5000); // past the original 3000 ms timeout
    });
    expect(onDismiss).toHaveBeenCalledTimes(1); // timeout was cleared — no second call
  });
});

// C-m7e-005: under PRM, no transform — opacity-fade only
describe("C-m7e-005: under PRM, <FirstBrickCard> opacity-fades — no transform", () => {
  it("renders with prefersReducedMotion=true and has no translateY transform", () => {
    render(
      <FirstBrickCard
        visible={true}
        prefersReducedMotion={true}
        onDismiss={vi.fn()}
      />,
    );
    const card = screen.getByTestId("first-brick-card");
    // The card should not have a translateY style applied (PRM = opacity-only)
    const style = card.getAttribute("style") ?? "";
    expect(style).not.toMatch(/translateY/);
    // Card should still be present
    expect(card.textContent).toContain("Your Empire begins.");
  });
});
