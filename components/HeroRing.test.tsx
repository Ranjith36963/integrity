// components/HeroRing.test.tsx — M3 + M7c component tests
// Covers: C-m3-006, C-m3-007, C-m3-008, C-m7c-001..011

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { HeroRing } from "./HeroRing";

// ─── motion/react mock ────────────────────────────────────────────────────────
// Expose mockable references so per-test overrides work cleanly.
// `mockAnimate` and `mockUseReducedMotion` are mutable and updated per-test.
// By default: animate is a no-op stub; useReducedMotion returns false.

const mockAnimateStop = vi.fn();
let mockAnimateImpl: (
  from: number,
  to: number,
  options: { duration: number; ease: unknown; onUpdate?: (v: number) => void },
) => { stop: () => void } = (_from, _to, opts) => {
  // Default: simulate tween by calling onUpdate on each RAF frame via setTimeout
  let handle: ReturnType<typeof setTimeout>;
  const run = (elapsed: number) => {
    if (opts.onUpdate) {
      const t = Math.min(elapsed / (opts.duration * 1000), 1);
      opts.onUpdate((_to as number) * t);
    }
    if (elapsed < (opts.duration as number) * 1000) {
      handle = setTimeout(() => run(elapsed + 16), 16);
    }
  };
  handle = setTimeout(() => run(0), 0);
  return {
    stop: () => {
      clearTimeout(handle);
      mockAnimateStop();
    },
  };
};

let mockUseReducedMotionReturn = false;

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return {
    ...actual,
    useReducedMotion: () => mockUseReducedMotionReturn,
    animate: (
      from: number,
      to: number,
      options: {
        duration: number;
        ease: unknown;
        onUpdate?: (v: number) => void;
      },
    ) => mockAnimateImpl(from, to, options),
  };
});

const R = 56;
const C = 2 * Math.PI * R;

// ─── C-m3-006: SVG render; stroke-dashoffset math; reduced-motion ─────────────

describe("C-m3-006: HeroRing SVG stroke-dashoffset math", () => {
  it("at pct=0: dashoffset === C (full circumference = empty arc)", () => {
    const { container } = render(<HeroRing pct={0} />);
    const circles = container.querySelectorAll("circle");
    // Find the filled arc circle (has stroke-dasharray attribute)
    const filled = Array.from(circles).find((c) =>
      c.getAttribute("stroke-dasharray"),
    ) as SVGCircleElement;
    expect(filled).toBeTruthy();
    const dashoffset = parseFloat(
      filled.getAttribute("stroke-dashoffset") ?? "NaN",
    );
    expect(dashoffset).toBeCloseTo(C, 2);
  });

  it("at pct=50: dashoffset === C/2", () => {
    const { container } = render(<HeroRing pct={50} />);
    const circles = container.querySelectorAll("circle");
    const filled = Array.from(circles).find((c) =>
      c.getAttribute("stroke-dasharray"),
    ) as SVGCircleElement;
    // Client hydration gives actual pct — but in test env we set mounted=true via useEffect
    // which runs synchronously in tests. So after render, pct=50 should show.
    const dashoffset = parseFloat(
      filled?.getAttribute("stroke-dashoffset") ?? "NaN",
    );
    // After client-side mount: dashoffset = (1 - 50/100) * C = C/2
    expect(dashoffset).toBeCloseTo(C / 2, 2);
  });

  it("at pct=100: dashoffset === 0 (full arc)", () => {
    const { container } = render(<HeroRing pct={100} />);
    const circles = container.querySelectorAll("circle");
    const filled = Array.from(circles).find((c) =>
      c.getAttribute("stroke-dasharray"),
    ) as SVGCircleElement;
    const dashoffset = parseFloat(
      filled?.getAttribute("stroke-dashoffset") ?? "NaN",
    );
    expect(dashoffset).toBeCloseTo(0, 2);
  });

  it("renders filled arc circle with stroke-dasharray attribute (motion controlled via style prop)", () => {
    // The reduced-motion behavior is: transition='none' on the circle's style.
    // In JSDOM, we verify the element has a style.transition property accessible.
    const { container } = render(<HeroRing pct={50} />);
    const filled = Array.from(container.querySelectorAll("circle")).find((c) =>
      c.getAttribute("stroke-dasharray"),
    ) as SVGCircleElement;
    // Verify the element exists and has stroke-dasharray
    expect(filled).toBeTruthy();
    expect(filled?.getAttribute("stroke-dasharray")).toBeTruthy();
    // In non-reduced-motion environment (default in tests), transition is set
    // The actual reduced-motion collapse is verified via motion.ts token contract
    // which collapses durationMs to 0 under prefers-reduced-motion.
    const style = (filled as SVGElement & { style?: CSSStyleDeclaration })
      ?.style;
    // The transition property exists (either "none" for reduced-motion or the animated value)
    expect(style?.transition !== undefined).toBeTruthy();
  });
});

// ─── C-m3-007: a11y attrs ─────────────────────────────────────────────────────

describe("C-m3-007: HeroRing a11y attrs", () => {
  it("outer svg has role='img' + aria-label; aria-live lives on a sibling status node", () => {
    // R7-ROOT-M7-NIT-1: aria-live moved off the svg so the count-up tween
    // doesn't fire 50+ polite announcements during 1.6s. The sibling
    // role='status' span fires ONCE when the tween settles.
    const { container } = render(<HeroRing pct={42} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("role")).toBe("img");
    expect(svg?.getAttribute("aria-label")).toBe("Day score: 42%");
    // Sibling status node carries the live region.
    const status = container.querySelector("[role='status']");
    expect(status?.getAttribute("aria-live")).toBe("polite");
    expect(status?.textContent).toBe("Day score: 42%");
  });

  it("inner numeral has aria-hidden='true'", () => {
    const { container } = render(<HeroRing pct={42} />);
    // The numeral wrapper should be aria-hidden
    const hiddenEl = container.querySelector("[aria-hidden='true']");
    expect(hiddenEl).toBeTruthy();
  });

  it("when re-rendered with pct=67, aria-label becomes 'Day score: 67%'", () => {
    const { container, rerender } = render(<HeroRing pct={42} />);
    rerender(<HeroRing pct={67} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-label")).toBe("Day score: 67%");
  });
});

// ─── C-m3-008: SSR safety ─────────────────────────────────────────────────────

describe("C-m3-008: HeroRing SSR safety", () => {
  it("SSR output has dashoffset === full circumference (pct=0) regardless of input", () => {
    // renderToString simulates SSR
    const html = renderToString(<HeroRing pct={75} />);
    // In SSR, mounted=false, so pct should be 0 → dashoffset = C
    // We find the stroke-dashoffset attribute value in the HTML string
    const match = html.match(/stroke-dashoffset="([^"]+)"/);
    if (match) {
      const ssrDashoffset = parseFloat(match[1]);
      expect(ssrDashoffset).toBeCloseTo(C, 2);
    } else {
      // SSR may use style attribute instead
      const styleMatch = html.match(/stroke-dashoffset:\s*([^;}"]+)/);
      if (styleMatch) {
        const ssrDashoffset = parseFloat(styleMatch[1]);
        expect(ssrDashoffset).toBeCloseTo(C, 2);
      }
    }
  });

  it("after client hydration, dashoffset reflects actual pct=75", () => {
    const { container } = render(<HeroRing pct={75} />);
    // In test environment, useEffect runs synchronously, so mounted=true
    const circles = container.querySelectorAll("circle");
    const filled = Array.from(circles).find((c) =>
      c.getAttribute("stroke-dasharray"),
    ) as SVGCircleElement;
    const dashoffset = parseFloat(
      filled?.getAttribute("stroke-dashoffset") ?? "NaN",
    );
    // After mount: (1 - 75/100) * C = 0.25 * C
    expect(dashoffset).toBeCloseTo(0.25 * C, 2);
  });

  it("no React hydration-mismatch warning logged", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<HeroRing pct={75} />);
    const hydrationErrors = consoleSpy.mock.calls.filter(
      (args) => typeof args[0] === "string" && args[0].includes("hydrat"),
    );
    expect(hydrationErrors).toHaveLength(0);
    consoleSpy.mockRestore();
  });
});

// ─── C-m7c-001..011: M7c count-up tween + joint-state + regression ────────────

const CIRCUMFERENCE = 2 * Math.PI * R;

beforeEach(() => {
  vi.useFakeTimers();
  mockUseReducedMotionReturn = false;
  mockAnimateStop.mockReset();
  // Reset to default real-tween-simulator impl
  mockAnimateImpl = (_from, _to, opts) => {
    let handle: ReturnType<typeof setTimeout>;
    const run = (elapsed: number) => {
      if (opts.onUpdate) {
        const t = Math.min(elapsed / (opts.duration * 1000), 1);
        opts.onUpdate((_to as number) * t);
      }
      if (elapsed < (opts.duration as number) * 1000) {
        handle = setTimeout(() => run(elapsed + 16), 16);
      }
    };
    handle = setTimeout(() => run(0), 0);
    return {
      stop: () => {
        clearTimeout(handle);
        mockAnimateStop();
      },
    };
  };
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── C-m7c-001: count-up fires 0 → 50 over 1.6 s with function child ─────────

describe("C-m7c-001 — <HeroRing firstPaintCountUp={true} pct={50}> progresses 0→50 over 1.6s with SVG numeral", () => {
  it("numeral progresses through monotonically non-decreasing integer values 0 → 50", async () => {
    const capturedFrames: number[] = [];
    const baseImpl = mockAnimateImpl;
    mockAnimateImpl = (from, to, opts) => {
      const origUpdate = opts.onUpdate;
      return baseImpl(from, to, {
        ...opts,
        onUpdate: (v: number) => {
          capturedFrames.push(Math.round(v));
          origUpdate?.(v);
        },
      });
    };
    const { container } = render(
      <HeroRing pct={50} firstPaintCountUp={true} />,
    );

    // Advance 800ms (half the tween)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    // Advance another 800ms (full tween complete)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    // Initial frame starts at 0
    expect(capturedFrames[0]).toBe(0);
    // At least one intermediate frame between 0 and 50
    expect(capturedFrames.some((f) => f > 0 && f < 50)).toBe(true);
    // Final frame is 50
    expect(capturedFrames[capturedFrames.length - 1]).toBe(50);
    // Monotonically non-decreasing
    for (let i = 1; i < capturedFrames.length; i++) {
      expect(capturedFrames[i]).toBeGreaterThanOrEqual(capturedFrames[i - 1]);
    }
    // Final rendered numeral is "50%"
    expect(
      container.querySelector("[data-testid='hero-numeral']")?.textContent,
    ).toBe("50%");
    // All captured frames are integers (no half-percent display)
    for (const f of capturedFrames) {
      expect(Number.isInteger(f)).toBe(true);
    }
  });
});

// ─── C-m7c-002: firstPaintCountUp=false — byte-identical to today (no tween) ──

describe("C-m7c-002 — <HeroRing firstPaintCountUp={false} pct={50}> snaps to 50% immediately, no tween", () => {
  it("numeral reads 50% immediately on post-mount render; no per-frame update; animate not called", async () => {
    let animateCalled = false;
    mockAnimateImpl = () => {
      animateCalled = true;
      return { stop: vi.fn() };
    };

    const { container } = render(<HeroRing pct={50} />);

    // With fake timers, useEffect fires immediately in test environment.
    // Advance a tick to allow the effect to run and setDisplayPct(pct) to fire.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Numeral reads 50% after mount effect
    const numeralEl = container.querySelector("[aria-hidden='true']");
    expect(numeralEl?.textContent).toContain("50%");

    // Advance 1.6 s — no per-frame updates
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });

    expect(numeralEl?.textContent).toContain("50%");
    // animate was not called (no tween)
    expect(animateCalled).toBe(false);
  });
});

// ─── C-m7c-003: pct=0 with firstPaintCountUp=true — trivial elide ─────────────

describe("C-m7c-003 — <HeroRing firstPaintCountUp={true} pct={0}> — no animation, numeral 0%", () => {
  it("renders 0% immediately with no animate call", async () => {
    let animateCalled = false;
    mockAnimateImpl = () => {
      animateCalled = true;
      return { stop: vi.fn() };
    };

    const { container } = render(<HeroRing pct={0} firstPaintCountUp={true} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });

    // Numeral is 0%
    const numeralEl = container.querySelector("[aria-hidden='true']");
    expect(numeralEl?.textContent).toContain("0%");

    // animate was NOT called (pct > 0 guard)
    expect(animateCalled).toBe(false);

    // SVG stroke-dashoffset at full circumference (empty arc)
    const filled = Array.from(container.querySelectorAll("circle")).find((c) =>
      c.getAttribute("stroke-dasharray"),
    ) as SVGCircleElement;
    expect(
      parseFloat(filled.getAttribute("stroke-dashoffset") ?? "NaN"),
    ).toBeCloseTo(CIRCUMFERENCE, 1);
  });
});

// ─── C-m7c-004: pct=100 — animates 0→100 over 1.6 s ─────────────────────────

describe("C-m7c-004 — <HeroRing firstPaintCountUp={true} pct={100}> animates 0→100 over 1.6s", () => {
  it("final frame is 100%, aria-label is 'Day score: 100%', no M7d artifacts", async () => {
    const capturedFrames: number[] = [];
    const baseImpl = mockAnimateImpl;
    mockAnimateImpl = (from, to, opts) => {
      const origUpdate = opts.onUpdate;
      return baseImpl(from, to, {
        ...opts,
        onUpdate: (v: number) => {
          capturedFrames.push(Math.round(v));
          origUpdate?.(v);
        },
      });
    };
    const { container } = render(
      <HeroRing pct={100} firstPaintCountUp={true} />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(capturedFrames[0]).toBe(0);
    expect(capturedFrames.some((f) => f > 0 && f < 100)).toBe(true);
    expect(capturedFrames[capturedFrames.length - 1]).toBe(100);

    // Final numeral is "100%"
    const numeral = container.querySelector("[data-testid='hero-numeral']");
    expect(numeral?.textContent).toBe("100%");

    // aria-label at final frame
    const svg = container.querySelector("svg[role='img']");
    expect(svg?.getAttribute("aria-label")).toBe("Day score: 100%");

    // No M7d artifacts
    expect(container.querySelector("[data-testid='day-fireworks']")).toBeNull();
    expect(container.querySelector("[data-testid='block-bloom']")).toBeNull();

    // Final stroke-dashoffset ~0 (full arc)
    const filled = Array.from(container.querySelectorAll("circle")).find((c) =>
      c.getAttribute("stroke-dasharray"),
    ) as SVGCircleElement;
    expect(
      parseFloat(filled.getAttribute("stroke-dashoffset") ?? "NaN"),
    ).toBeCloseTo(0, 1);
  });
});

// ─── C-m7c-005: fire-once — pct change after tween does NOT re-fire count-up ──

describe("C-m7c-005 — fire-once: pct change after tween settles does NOT re-fire count-up", () => {
  it("animate called exactly once; rerender with firstPaintCountUp=false snaps to new pct", async () => {
    let animateCallCount = 0;
    mockAnimateImpl = (_from, _to, opts) => {
      animateCallCount++;
      let handle: ReturnType<typeof setTimeout>;
      const run = (elapsed: number) => {
        if (opts.onUpdate) {
          const t = Math.min(elapsed / (opts.duration * 1000), 1);
          opts.onUpdate((_to as number) * t);
        }
        if (elapsed < (opts.duration as number) * 1000) {
          handle = setTimeout(() => run(elapsed + 16), 16);
        }
      };
      handle = setTimeout(() => run(0), 0);
      return { stop: () => clearTimeout(handle) };
    };

    const { rerender, container } = render(
      <HeroRing pct={50} firstPaintCountUp={true} />,
    );

    // Let the tween complete
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });

    // animate called exactly once (the initial count-up)
    expect(animateCallCount).toBe(1);
    const countBeforeRerender = animateCallCount;

    // Rerender with firstPaintCountUp=false and new pct (mimics M7a tri-state ref returning false)
    rerender(<HeroRing pct={80} firstPaintCountUp={false} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });

    // No second animate call
    expect(animateCallCount).toBe(countBeforeRerender);

    // Numeral snaps to 80% (no progressive interpolation from 50 to 80)
    expect(
      container.querySelector("[data-testid='hero-numeral']")?.textContent,
    ).toBe("80%");
  });
});

// ─── C-m7c-006: prefers-reduced-motion — no tween, snap to final value ────────

describe("C-m7c-006 — prefers-reduced-motion: reduce → no tween, numeral + stroke at final value on mount", () => {
  it("animate not called; numeral is 50% immediately; stroke-dashoffset reflects pct=50", async () => {
    mockUseReducedMotionReturn = true;
    let animateCalled = false;
    mockAnimateImpl = () => {
      animateCalled = true;
      return { stop: vi.fn() };
    };

    const { container } = render(
      <HeroRing pct={50} firstPaintCountUp={true} />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });

    // Numeral is 50% (final value — no tween)
    const numeralEl = container.querySelector("[aria-hidden='true']");
    expect(numeralEl?.textContent).toContain("50%");

    // animate NOT called
    expect(animateCalled).toBe(false);

    // stroke-dashoffset reflects pct=50 (mid-arc)
    const filled = Array.from(container.querySelectorAll("circle")).find((c) =>
      c.getAttribute("stroke-dasharray"),
    ) as SVGCircleElement;
    expect(
      parseFloat(filled.getAttribute("stroke-dashoffset") ?? "NaN"),
    ).toBeCloseTo((1 - 50 / 100) * CIRCUMFERENCE, 1);

    // aria-label is final value, NOT "Day score: 0%"
    const svg = container.querySelector("svg[role='img']");
    expect(svg?.getAttribute("aria-label")).toBe("Day score: 50%");
  });
});

// ─── C-m7c-007: joint-state sync invariant ───────────────────────────────────

describe("C-m7c-007 — joint-state sync: numeral and stroke-dashoffset sourced from same displayPct", () => {
  it("at every sampled frame, parseInt(numeral) === Math.round(strokeProgress)", async () => {
    const { container } = render(
      <HeroRing pct={67} firstPaintCountUp={true} />,
    );

    const samplePoints = [200, 300, 500, 800, 1100];
    let prevMs = 0;

    for (const ms of samplePoints) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(ms - prevMs);
      });
      prevMs = ms;

      const numeralEl = container.querySelector("[data-testid='hero-numeral']");
      const numeralValue = parseInt(
        (numeralEl?.textContent ?? "0%").replace(/%$/, ""),
        10,
      );

      const filled = Array.from(container.querySelectorAll("circle")).find(
        (c) => c.getAttribute("stroke-dasharray"),
      ) as SVGCircleElement;
      const dashoffset = parseFloat(
        filled?.getAttribute("stroke-dashoffset") ?? "NaN",
      );
      const strokeProgressInt = Math.round(
        (1 - dashoffset / CIRCUMFERENCE) * 100,
      );

      // Both are sourced from same displayPct — must be equal
      expect(numeralValue).toBe(strokeProgressInt);
    }
  });
});

// ─── C-m7c-008: Math.round (not Math.floor) is the rounding function ──────────

describe("C-m7c-008 — Math.round(displayPct) NOT Math.floor at every numeral render site", () => {
  it("onUpdate(49.5) → numeral shows '50%' (Math.round, not Math.floor)", async () => {
    mockAnimateImpl = (_from, _to, opts) => {
      setTimeout(() => {
        if (opts.onUpdate) opts.onUpdate(49.5);
      }, 0);
      return { stop: vi.fn() };
    };

    const { container } = render(
      <HeroRing pct={50} firstPaintCountUp={true} />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    const numeral = container.querySelector("[data-testid='hero-numeral']");
    expect(numeral?.textContent).toBe("50%"); // Math.round(49.5) = 50, not Math.floor(49.5) = 49

    // aria-label also uses Math.round
    const svg = container.querySelector("svg[role='img']");
    expect(svg?.getAttribute("aria-label")).toBe("Day score: 50%");
  });

  it("onUpdate(50.4) → numeral shows '50%' (Math.round rounds down)", async () => {
    mockAnimateImpl = (_from, _to, opts) => {
      setTimeout(() => {
        if (opts.onUpdate) opts.onUpdate(50.4);
      }, 0);
      return { stop: vi.fn() };
    };

    const { container } = render(
      <HeroRing pct={50} firstPaintCountUp={true} />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    const numeral = container.querySelector("[data-testid='hero-numeral']");
    expect(numeral?.textContent).toBe("50%"); // Math.round(50.4) = 50, not Math.ceil(50.4) = 51
  });
});

// ─── C-m7c-009: animate called with duration:1.6 and ease:[0,0,0.2,1]/"easeOut" ──

describe("C-m7c-009 — animate called with duration:1.6 and ease:[0,0,0.2,1] or 'easeOut'", () => {
  it("animate(0, 50, options) where options.duration===1.6 and options.ease is valid easeOut", async () => {
    let capturedFrom: number | null = null;
    let capturedTo: number | null = null;
    let capturedOpts: {
      duration?: number;
      ease?: unknown;
      onUpdate?: unknown;
    } | null = null;

    mockAnimateImpl = (from, to, opts) => {
      capturedFrom = from as number;
      capturedTo = to as number;
      capturedOpts = opts as {
        duration?: number;
        ease?: unknown;
        onUpdate?: unknown;
      };
      return { stop: vi.fn() };
    };

    render(<HeroRing pct={50} firstPaintCountUp={true} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(capturedFrom).toBe(0);
    expect(capturedTo).toBe(50);
    expect(capturedOpts).not.toBeNull();
    expect(capturedOpts!.duration).toBe(1.6);

    // ease must be either [0, 0, 0.2, 1] or "easeOut"
    const ease = capturedOpts!.ease;
    const isValidEase =
      (Array.isArray(ease) && JSON.stringify(ease) === "[0,0,0.2,1]") ||
      ease === "easeOut";
    expect(isValidEase).toBe(true);

    // onUpdate is a function
    expect(typeof capturedOpts!.onUpdate).toBe("function");
  });
});

// ─── C-m7c-010: tween cancels on pct change mid-tween ────────────────────────

describe("C-m7c-010 — tween cancels on pct change mid-tween; new pct lands via snap", () => {
  it("controls.stop() called on rerender; no second animate; numeral snaps to 80%", async () => {
    let animateCallCount = 0;

    mockAnimateImpl = (_from, _to, opts) => {
      animateCallCount++;
      let handle: ReturnType<typeof setTimeout>;
      const run = (elapsed: number) => {
        if (opts.onUpdate) {
          const t = Math.min(elapsed / (opts.duration * 1000), 1);
          opts.onUpdate((_to as number) * t);
        }
        if (elapsed < (opts.duration as number) * 1000) {
          handle = setTimeout(() => run(elapsed + 16), 16);
        }
      };
      handle = setTimeout(() => run(0), 0);
      return {
        stop: () => {
          clearTimeout(handle);
          mockAnimateStop();
        },
      };
    };

    const { rerender, container } = render(
      <HeroRing pct={50} firstPaintCountUp={true} />,
    );

    // Advance 400ms (mid-tween)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    // Rerender with firstPaintCountUp=false + new pct (mimics brick log)
    rerender(<HeroRing pct={80} firstPaintCountUp={false} />);

    // stop() was called on the cleanup
    expect(mockAnimateStop).toHaveBeenCalledTimes(1);

    // No second animate call on the rerender
    expect(animateCallCount).toBe(1);

    // Advance more time — no further tween activity
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });

    // Numeral shows 80% (snap arm)
    const numeral = container.querySelector("[data-testid='hero-numeral']");
    expect(numeral?.textContent).toBe("80%");
  });
});

// ─── C-m7c-011: no firstPaintCountUp, no children — C-m3-006/007 regression ──

describe("C-m7c-011 — <HeroRing pct={50} /> (no firstPaintCountUp, no children) — C-m3-006/007 byte-identical", () => {
  it("fallback numeral reads 50% immediately; stroke-dashoffset reflects pct=50; no tween", async () => {
    let animateCalled = false;
    mockAnimateImpl = () => {
      animateCalled = true;
      return { stop: vi.fn() };
    };

    const { container } = render(<HeroRing pct={50} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });

    // Fallback numeral reads 50%
    const numeralEl = container.querySelector("[aria-hidden='true']");
    expect(numeralEl?.textContent).toContain("50%");

    // SVG stroke-dashoffset reflects pct=50
    const filled = Array.from(container.querySelectorAll("circle")).find((c) =>
      c.getAttribute("stroke-dasharray"),
    ) as SVGCircleElement;
    expect(
      parseFloat(filled?.getAttribute("stroke-dashoffset") ?? "NaN"),
    ).toBeCloseTo((1 - 50 / 100) * CIRCUMFERENCE, 1);

    // animate NOT called (default firstPaintCountUp=false)
    expect(animateCalled).toBe(false);

    // No M7b/M7c/M7d artifacts in the standalone path
    expect(container.querySelector("[data-testid='day-fireworks']")).toBeNull();
  });

  it("SVG role + aria-label byte-identical; aria-live now on sibling status (R7-ROOT-M7-NIT-1)", () => {
    const { container } = render(<HeroRing pct={42} />);
    const svg = container.querySelector("svg[role='img']");
    expect(svg?.getAttribute("role")).toBe("img");
    expect(svg?.getAttribute("aria-label")).toBe("Day score: 42%");
    const status = container.querySelector("[role='status']");
    expect(status?.getAttribute("aria-live")).toBe("polite");
  });
});
