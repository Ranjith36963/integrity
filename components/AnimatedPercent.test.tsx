import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { AnimatedPercent } from "./AnimatedPercent";

// C-bld-005: AnimatedPercent counts up from 0 to target over durationMs
describe("C-bld-005: AnimatedPercent counts up from 0 to final value", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("monotonically increases and lands on 62 after 1600ms", async () => {
    const values: number[] = [];
    const { container } = render(
      <AnimatedPercent value={62} durationMs={1600} />,
    );
    const span = container.querySelector("span")!;

    // Sample at t=0 (initial render — rAF hasn't run yet so should be 0)
    values.push(Number(span.textContent));

    // Advance to 800ms
    await act(async () => {
      vi.advanceTimersByTime(800);
    });
    values.push(Number(span.textContent));

    // Advance to 1600ms (done)
    await act(async () => {
      vi.advanceTimersByTime(1600);
    });
    values.push(Number(span.textContent));

    // First value should be 0, last should be 62
    expect(values[0]).toBe(0);
    expect(values[values.length - 1]).toBe(62);

    // Monotonically increasing
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
    }
  });
});

// C-bld-006: With prefers-reduced-motion, renders final value immediately
describe("C-bld-006: prefers-reduced-motion snaps to final value", () => {
  beforeEach(() => {
    // Override matchMedia to return reduce=true
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string): MediaQueryList => ({
        matches: query.includes("reduce"),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
    vi.useFakeTimers();
  });
  afterEach(() => {
    // Restore matchMedia to non-reduce
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string): MediaQueryList => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
    vi.useRealTimers();
  });

  it("renders 62 on first paint after raf (no count-up)", async () => {
    const { container } = render(<AnimatedPercent value={62} />);
    const span = container.querySelector("span")!;
    // Advance time slightly so rAF callback fires
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(span.textContent).toBe("62");
  });
});

// C-bld-007: At t=500ms with durationMs=1000, displayed value should be ~44
describe("C-bld-007: AnimatedPercent cubic ease-out at t=500ms/1000ms", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("displays approximately Math.round(50 * (1 - (1-0.5)^3)) = 44 at t≈500ms", async () => {
    const { container } = render(
      <AnimatedPercent value={50} durationMs={1000} />,
    );
    const span = container.querySelector("span")!;

    // Advance to 500ms. jsdom's fake rAF fires in 16ms increments so the
    // elapsed at the closest frame may be 496ms rather than exactly 500ms —
    // which maps to Math.round(50 * eased) = 43 or 44. We allow ±1.
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // Theoretical: Math.round(50 * (1 - (1-0.5)^3)) = Math.round(50 * 0.875) = 44
    const theoretical = Math.round(50 * (1 - Math.pow(1 - 0.5, 3))); // 44
    const actual = Number(span.textContent);
    // Allow ±1 for rAF frame-boundary rounding (jsdom 16ms tick)
    expect(actual).toBeGreaterThanOrEqual(theoretical - 1);
    expect(actual).toBeLessThanOrEqual(theoretical + 1);
  });
});
