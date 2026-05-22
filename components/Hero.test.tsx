import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Hero } from "./Hero";

// ─── motion/react mock for C-m7c-012 ─────────────────────────────────────────
// Same pattern as HeroRing.test.tsx — mutable mockAnimateImpl for per-test control.
let mockAnimateImpl012: (
  from: number,
  to: number,
  options: { duration: number; ease: unknown; onUpdate?: (v: number) => void },
) => { stop: () => void } = (_from, _to, opts) => {
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

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return {
    ...actual,
    useReducedMotion: () => false,
    animate: (
      from: number,
      to: number,
      options: {
        duration: number;
        ease: unknown;
        onUpdate?: (v: number) => void;
      },
    ) => mockAnimateImpl012(from, to, options),
  };
});

// C-bld-004: Hero renders dateLabel, "Building X of Y", and "DAY COMPLETE"
describe("C-bld-004: Hero renders all required text", () => {
  it("shows dateLabel, building label, and DAY COMPLETE caption", () => {
    render(
      <Hero dateLabel="Wed, Apr 29" dayNumber={119} totalDays={365} pct={62} />,
    );
    expect(screen.getByText("Wed, Apr 29")).toBeInTheDocument();
    expect(screen.getByText(/building/i)).toBeInTheDocument();
    expect(screen.getByText("119")).toBeInTheDocument();
    expect(screen.getByText(/of/i)).toBeInTheDocument();
    expect(screen.getByText(/365/)).toBeInTheDocument();
    expect(screen.getByText(/day complete/i)).toBeInTheDocument();
  });
});

// C-bld-032 (re-authored M1): Hero with pct=0 shows "0%" and DAY COMPLETE
describe("C-bld-032 (re-authored M1): Hero renders '0%' and DAY COMPLETE for pct=0", () => {
  it("shows '0%' synchronously and DAY COMPLETE text remains visible", () => {
    render(
      <Hero dateLabel="Wed, Apr 29" dayNumber={119} totalDays={365} pct={0} />,
    );
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByText(/day complete/i)).toBeInTheDocument();
  });
});

// C-bld-033 (re-authored M1): Hero with pct=100 shows 100% immediately (no count-up in M1)
// Count-up returns in M3 when real scoring lands. AnimatedPercent is not imported in M1.
describe("C-bld-033 (re-authored M1): Hero renders 100% synchronously for pct=100", () => {
  it("visible numeral is '100%' on first paint", () => {
    render(
      <Hero
        dateLabel="Wed, Apr 29"
        dayNumber={119}
        totalDays={365}
        pct={100}
      />,
    );
    // Plain span renders "100%" synchronously — no AnimatedPercent tween
    expect(screen.getByText("100%")).toBeInTheDocument();
  });
});

// C-bld-037 (re-authored M1): No blocks → Hero renders "0%" immediately (no AnimatedPercent)
describe("C-bld-037 (re-authored M1): Hero renders 0% immediately for pct=0 with no blocks", () => {
  it("renders '0%' synchronously and DAY COMPLETE is visible", () => {
    render(<Hero dateLabel="" dayNumber={undefined} totalDays={365} pct={0} />);
    // DAY COMPLETE must still be visible
    expect(screen.getByText(/day complete/i)).toBeInTheDocument();
    // Plain span renders "0%" synchronously — no AnimatedPercent tween
    expect(screen.getByText("0%")).toBeInTheDocument();
  });
});

// C-bld-038: Hero receives dayNumber={undefined} → "Building N of 365" is not in DOM
describe("C-bld-038: Hero hides Building N of Y when dayNumber is undefined", () => {
  it("does not render the building counter line when dayNumber is undefined", () => {
    render(
      <Hero
        dateLabel="Wed, Apr 29"
        dayNumber={undefined}
        totalDays={365}
        pct={57}
      />,
    );
    // "Building" text should NOT appear
    expect(screen.queryByText(/building/i)).not.toBeInTheDocument();
  });
});

// C-m1-004: Hero renders 0% synchronously on first paint, no AnimatedPercent, no count-up (SG-m1-08)
describe("C-m1-004: Hero renders pct=0 synchronously with no count-up animation", () => {
  it("shows '0%' immediately on first paint without AnimatedPercent or requestAnimationFrame tween", () => {
    vi.useFakeTimers();
    render(
      <Hero dateLabel="Wed, May 6" dayNumber={126} totalDays={365} pct={0} />,
    );
    // 0% must be visible synchronously (before any timer advance)
    expect(screen.getByText("0%")).toBeInTheDocument();
    // No animated-percent marker in DOM
    expect(
      document.querySelector('[data-component="animated-percent"]'),
    ).toBeNull();
    // After 2 seconds simulated, still shows 0% (no count-up)
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText("0%")).toBeInTheDocument();
    vi.useRealTimers();
  });
});

// C-m1-005: Hero shows dateLabel verbatim (SG-m1-01: comma-separated form)
describe("C-m1-005: Hero renders dateLabel verbatim", () => {
  it("renders the dateLabel string as a text node", () => {
    render(
      <Hero dateLabel="Wed, May 6" dayNumber={126} totalDays={365} pct={0} />,
    );
    expect(screen.getByText("Wed, May 6")).toBeInTheDocument();
  });
});

// ─── C-m3-020: Hero wraps numeral in <HeroRing>; consumes dayPct(state) ──────

describe("C-m3-020: Hero wraps numeral in HeroRing", () => {
  it("HeroRing svg is in the tree wrapping the numeral", () => {
    const { container } = render(
      <Hero dateLabel="Wed, May 6" dayNumber={126} totalDays={365} pct={42} />,
    );
    const svg = container.querySelector("svg[role='img']");
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("aria-label")).toContain("42");
  });

  it("numeral text reads '42%' (Math.round)", () => {
    const { container } = render(
      <Hero dateLabel="Wed, May 6" dayNumber={126} totalDays={365} pct={42} />,
    );
    expect(container.textContent).toContain("42%");
  });

  it("numeral reads '67%' when pct={67.4}", () => {
    const { container } = render(
      <Hero
        dateLabel="Wed, May 6"
        dayNumber={126}
        totalDays={365}
        pct={67.4}
      />,
    );
    expect(container.textContent).toContain("67%");
  });

  it("numeral reads '0%' and ring's filled arc is empty when pct={0}", () => {
    const { container } = render(
      <Hero dateLabel="Wed, May 6" dayNumber={126} totalDays={365} pct={0} />,
    );
    expect(container.textContent).toContain("0%");
    const R = 56;
    const C = 2 * Math.PI * R;
    const filled = Array.from(container.querySelectorAll("circle")).find((c) =>
      c.getAttribute("stroke-dasharray"),
    ) as SVGCircleElement;
    const dashoffset = parseFloat(
      filled?.getAttribute("stroke-dashoffset") ?? "NaN",
    );
    expect(dashoffset).toBeCloseTo(C, 2);
  });
});

// C-m1-006: Hero renders "Building N of 365|366"
describe("C-m1-006: Hero renders Building N of 365 and 366", () => {
  it("renders 'Building 126 of 365'", () => {
    const { container } = render(
      <Hero dateLabel="Wed, May 6" dayNumber={126} totalDays={365} pct={0} />,
    );
    expect(container.textContent).toContain("Building");
    expect(container.textContent).toContain("126");
    expect(container.textContent).toContain("365");
  });

  it("renders 'Building 60 of 366' for leap year", () => {
    const { container } = render(
      <Hero dateLabel="Sat, Feb 29" dayNumber={60} totalDays={366} pct={0} />,
    );
    expect(container.textContent).toContain("Building");
    expect(container.textContent).toContain("60");
    expect(container.textContent).toContain("366");
  });
});

// ─── C-m7c-012: Hero threads firstPaintCountUp to HeroRing ───────────────────

beforeEach(() => {
  vi.useFakeTimers();
  // Reset to default real-tween-simulator
  mockAnimateImpl012 = (_from, _to, opts) => {
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
});

afterEach(() => {
  vi.useRealTimers();
});

describe("C-m7c-012 — Hero threads firstPaintCountUp to HeroRing; default false is byte-identical", () => {
  it("(a) firstPaintCountUp={true}: 72-px numeral starts at 0% and ends at 50%", async () => {
    const capturedNumerals: string[] = [];
    // Override the mock to capture the numeral text at each frame
    let animateWasCalled = false;
    mockAnimateImpl012 = (_from, _to, opts) => {
      animateWasCalled = true;
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

    const { container } = render(
      <Hero
        pct={50}
        firstPaintCountUp={true}
        dateLabel="Wed, May 20"
        dayNumber={20}
        totalDays={365}
      />,
    );

    // At t=0 (before mount effect fires), displayPct is 0
    // After mount effect fires, the tween starts — initial value is still 0
    capturedNumerals.push(container.textContent ?? "");

    // Advance past first frame to let tween progress
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16);
    });
    capturedNumerals.push(container.textContent ?? "");

    // Complete the tween
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });

    // animate was called (the prop was threaded to HeroRing)
    expect(animateWasCalled).toBe(true);

    // Final value is 50%
    expect(container.textContent).toContain("50%");
  });

  it("(b) default firstPaintCountUp omitted: numeral reads 50% immediately; no animate call", async () => {
    let animateCalled = false;
    mockAnimateImpl012 = () => {
      animateCalled = true;
      return { stop: vi.fn() };
    };

    const { container } = render(
      <Hero pct={50} dateLabel="Wed, May 20" dayNumber={20} totalDays={365} />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Numeral reads 50% immediately
    expect(container.textContent).toContain("50%");

    // Advance 1.6 s — still shows 50%, no progressive update
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });

    expect(container.textContent).toContain("50%");
    expect(container.textContent).not.toContain("25%");
    // animate not called (firstPaintCountUp defaults to false)
    expect(animateCalled).toBe(false);
  });

  it("(b) existing Hero tests are byte-identical: dateLabel, dayNumber, totalDays, pct still render", () => {
    const { container } = render(
      <Hero dateLabel="Wed, May 20" dayNumber={126} totalDays={365} pct={42} />,
    );
    // All existing assertions still pass
    expect(container.textContent).toContain("Wed, May 20");
    expect(container.textContent).toContain("42%");
    const svg = container.querySelector("svg[role='img']");
    expect(svg?.getAttribute("aria-label")).toContain("42");
  });
});
