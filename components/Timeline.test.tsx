import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Timeline } from "./Timeline";
import { HOUR_HEIGHT_PX } from "@/lib/timeOffset";

// Previous C-bld-016 test is re-authored for M1 — see below.
// The old test asserted "No blocks yet. Tap + to add your first block." copy,
// which changes to the locked SPEC copy in M1.

// C-m1-009: 24 hour labels in document order, font-ui, color ink-dim
describe("C-m1-009: Timeline renders exactly 24 hour labels", () => {
  it("renders 24 [data-testid=hour-label] elements from 00:00 to 23:00", () => {
    render(<Timeline blocks={[]} now="08:00" />);
    const labels = document.querySelectorAll('[data-testid="hour-label"]');
    expect(labels).toHaveLength(24);

    // Verify document order: 00:00, 01:00, ..., 23:00
    const texts = Array.from(labels).map((el) => el.textContent);
    expect(texts[0]).toBe("00:00");
    expect(texts[12]).toBe("12:00");
    expect(texts[23]).toBe("23:00");
  });

  it("has a single [data-testid=hour-grid] container wrapping the hour rows", () => {
    const { container } = render(<Timeline blocks={[]} now="08:00" />);
    const hourGrid = container.querySelector('[data-testid="hour-grid"]');
    expect(hourGrid).not.toBeNull();
  });
});

// C-m1-010 (Timeline): NowLine element has correct top at 08:00
describe("C-m1-010 (Timeline): NowLine pixel position via Timeline", () => {
  it("now-line has top=512px for now=08:00 (8 * HOUR_HEIGHT_PX)", () => {
    const { container } = render(<Timeline blocks={[]} now="08:00" />);
    const nowLine = container.querySelector('[data-testid="now-line"]');
    expect(nowLine).not.toBeNull();
    const style = (nowLine as HTMLElement).getAttribute("style") ?? "";
    expect(style).toContain("512px");
  });

  it("now-line has background referencing --accent", () => {
    const { container } = render(<Timeline blocks={[]} now="08:00" />);
    const nowLine = container.querySelector('[data-testid="now-line"]');
    const style = (nowLine as HTMLElement).getAttribute("style") ?? "";
    expect(style).toContain("var(--accent)");
  });

  it("now-line top=0px for now=00:00", () => {
    const { container } = render(<Timeline blocks={[]} now="00:00" />);
    const nowLine = container.querySelector('[data-testid="now-line"]');
    const style = (nowLine as HTMLElement).getAttribute("style") ?? "";
    expect(style).toContain("0px");
  });

  it("now-line top is in [1534, 1536) for now=23:59", () => {
    const { container } = render(<Timeline blocks={[]} now="23:59" />);
    const nowLine = container.querySelector('[data-testid="now-line"]');
    const style = (nowLine as HTMLElement).getAttribute("style") ?? "";
    const match = style.match(/top:\s*([\d.]+)px/);
    expect(match).not.toBeNull();
    const topVal = parseFloat(match![1]);
    expect(topVal).toBeGreaterThanOrEqual(1534);
    expect(topVal).toBeLessThan(1536);
  });
});

// C-m1-011: Auto-scroll on mount (SSR-safe)
describe("C-m1-011: Timeline auto-scroll on mount", () => {
  let originalScrollTop: PropertyDescriptor | undefined;

  beforeEach(() => {
    // jsdom doesn't support scrollTop writes natively; we need to mock
    originalScrollTop = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "scrollTop",
    );
  });

  afterEach(() => {
    if (originalScrollTop) {
      Object.defineProperty(
        HTMLElement.prototype,
        "scrollTop",
        originalScrollTop,
      );
    } else {
      // Remove the mock
      delete (HTMLElement.prototype as Record<string, unknown>).scrollTop;
    }
  });

  it("does NOT mutate scrollTop during synchronous render", () => {
    let scrollTopSet = false;
    Object.defineProperty(HTMLElement.prototype, "scrollTop", {
      set() {
        scrollTopSet = true;
      },
      get() {
        return 0;
      },
      configurable: true,
    });

    // Synchronous render — no useEffect has fired yet
    render(<Timeline blocks={[]} now="12:00" />);

    // During render phase, scrollTop must NOT be mutated
    expect(scrollTopSet).toBe(false);
  });

  it("sets scrollTop after useEffect fires (post-paint)", async () => {
    const scrollTopValues: number[] = [];
    Object.defineProperty(HTMLElement.prototype, "scrollTop", {
      set(v: number) {
        scrollTopValues.push(v);
      },
      get() {
        return 0;
      },
      configurable: true,
    });

    await act(async () => {
      render(<Timeline blocks={[]} now="12:00" />);
    });

    // After effects run, scrollTop should have been set once
    expect(scrollTopValues.length).toBeGreaterThan(0);
    // 12:00 → offset = 12 * 64 = 768; viewport height mocked as 0 in jsdom
    // so Math.max(0, 768 - 0/2) = 768
    expect(scrollTopValues[0]).toBeGreaterThanOrEqual(0);
  });
});

// C-m1-012 (Timeline): NowLine re-renders on useNow tick
describe("C-m1-012 (Timeline): NowLine re-renders when now prop changes", () => {
  it("updates now-line top when now changes from 08:00 to 08:01", () => {
    const { container, rerender } = render(
      <Timeline blocks={[]} now="08:00" />,
    );
    const nowLine = container.querySelector('[data-testid="now-line"]');
    const style1 = (nowLine as HTMLElement).getAttribute("style") ?? "";
    const match1 = style1.match(/top:\s*([\d.]+)px/);
    const top1 = parseFloat(match1![1]);
    expect(top1).toBeCloseTo(8 * HOUR_HEIGHT_PX, 0);

    rerender(<Timeline blocks={[]} now="08:01" />);
    const style2 = (nowLine as HTMLElement).getAttribute("style") ?? "";
    const match2 = style2.match(/top:\s*([\d.]+)px/);
    const top2 = parseFloat(match2![1]);
    // 8*64 + (1/60)*64 ≈ 513.067
    expect(top2).toBeGreaterThan(top1);
    expect(Math.abs(top2 - (8 * HOUR_HEIGHT_PX + (1 / 60) * HOUR_HEIGHT_PX))).toBeLessThan(0.1);
  });
});

// C-m1-013 (Timeline): No transition on NowLine
describe("C-m1-013 (Timeline): NowLine has no transition on top", () => {
  it("NowLine element has no CSS transition style", () => {
    const { container } = render(<Timeline blocks={[]} now="12:00" />);
    const nowLine = container.querySelector('[data-testid="now-line"]');
    const style = (nowLine as HTMLElement).getAttribute("style") ?? "";
    expect(style).not.toContain("transition");
  });
});

// C-m1-014 (Timeline part): EmptyBlocks card with locked SPEC copy inside timeline
describe("C-m1-014 (Timeline): EmptyBlocks card inside timeline column", () => {
  it("renders the locked SPEC copy inside the timeline when blocks is empty", () => {
    render(<Timeline blocks={[]} now="12:00" />);
    expect(
      screen.getByText("Tap any slot to lay your first block."),
    ).toBeInTheDocument();
  });

  it("EmptyBlocks uses the M0 <EmptyState> primitive (data-testid=empty-state)", () => {
    const { container } = render(<Timeline blocks={[]} now="12:00" />);
    const emptyState = container.querySelector('[data-testid="empty-state"]');
    expect(emptyState).not.toBeNull();
  });

  it("EmptyBlocks is positioned inside the timeline column, not the page background", () => {
    const { container } = render(<Timeline blocks={[]} now="12:00" />);
    const hourGrid = container.querySelector('[data-testid="hour-grid"]');
    const emptyState = container.querySelector('[data-testid="empty-state"]');
    // emptyState should be a descendant of hourGrid
    expect(hourGrid?.contains(emptyState)).toBe(true);
  });
});

// C-bld-016 (re-authored M1): Timeline empty state now shows locked SPEC copy
describe("C-bld-016 (re-authored M1): Timeline renders locked SPEC empty-state copy", () => {
  it("shows 'Tap any slot to lay your first block.' and no timeline-block elements", () => {
    render(<Timeline blocks={[]} now="11:47" />);
    expect(
      screen.getByText("Tap any slot to lay your first block."),
    ).toBeInTheDocument();
    expect(
      document.querySelectorAll("[data-testid='timeline-block']"),
    ).toHaveLength(0);
  });
});
