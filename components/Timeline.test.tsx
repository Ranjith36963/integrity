import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Timeline } from "./Timeline";
import { HOUR_HEIGHT_PX, timeToOffsetPx } from "@/lib/timeOffset";
import type { Block, Brick } from "@/lib/types";

// Default props for M2 Timeline (re-authored to add categories + onSlotTap)
const defaultProps = {
  blocks: [] as Block[],
  categories: [],
  now: "08:00",
  onSlotTap: vi.fn(),
};

// C-m1-009: 24 hour labels in document order, font-ui, color ink-dim (re-authored M2)
describe("C-m1-009: Timeline renders exactly 24 hour labels (re-authored M2)", () => {
  it("renders 24 [data-testid=hour-label] elements from 00:00 to 23:00", () => {
    render(<Timeline {...defaultProps} />);
    const labels = document.querySelectorAll('[data-testid="hour-label"]');
    expect(labels).toHaveLength(24);
    const texts = Array.from(labels).map((el) => el.textContent);
    expect(texts[0]).toBe("00:00");
    expect(texts[12]).toBe("12:00");
    expect(texts[23]).toBe("23:00");
  });

  it("has a single [data-testid=hour-grid] container wrapping the hour rows", () => {
    const { container } = render(<Timeline {...defaultProps} />);
    const hourGrid = container.querySelector('[data-testid="hour-grid"]');
    expect(hourGrid).not.toBeNull();
  });
});

// C-m1-010 (Timeline): NowLine element has correct top at 08:00 (re-authored M2)
describe("C-m1-010 (Timeline): NowLine pixel position via Timeline (re-authored M2)", () => {
  it("now-line has top=512px for now=08:00 (8 * HOUR_HEIGHT_PX)", () => {
    const { container } = render(<Timeline {...defaultProps} now="08:00" />);
    const nowLine = container.querySelector('[data-testid="now-line"]');
    expect(nowLine).not.toBeNull();
    const style = (nowLine as HTMLElement).getAttribute("style") ?? "";
    expect(style).toContain("512px");
  });

  it("now-line has background referencing --accent", () => {
    const { container } = render(<Timeline {...defaultProps} now="08:00" />);
    const nowLine = container.querySelector('[data-testid="now-line"]');
    const style = (nowLine as HTMLElement).getAttribute("style") ?? "";
    expect(style).toContain("var(--accent)");
  });

  it("now-line top=0px for now=00:00", () => {
    const { container } = render(<Timeline {...defaultProps} now="00:00" />);
    const nowLine = container.querySelector('[data-testid="now-line"]');
    const style = (nowLine as HTMLElement).getAttribute("style") ?? "";
    expect(style).toContain("0px");
  });

  it("now-line top is in [1534, 1536) for now=23:59", () => {
    const { container } = render(<Timeline {...defaultProps} now="23:59" />);
    const nowLine = container.querySelector('[data-testid="now-line"]');
    const style = (nowLine as HTMLElement).getAttribute("style") ?? "";
    const match = style.match(/top:\s*([\d.]+)px/);
    expect(match).not.toBeNull();
    const topVal = parseFloat(match![1]);
    expect(topVal).toBeGreaterThanOrEqual(1534);
    expect(topVal).toBeLessThan(1536);
  });
});

// C-m1-011: Auto-scroll on mount (SSR-safe, re-authored M2)
describe("C-m1-011: Timeline auto-scroll on mount (re-authored M2)", () => {
  let originalScrollTop: PropertyDescriptor | undefined;

  beforeEach(() => {
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
      const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
      delete proto.scrollTop;
    }
  });

  it("sets scrollTop exactly once after mount (auto-scroll fires once)", async () => {
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
      render(<Timeline {...defaultProps} now="12:00" />);
    });

    expect(scrollTopValues).toHaveLength(1);
    expect(scrollTopValues[0]).toBe(768);
  });

  it("does NOT fire auto-scroll a second time on prop re-render", async () => {
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

    let rerender!: ReturnType<typeof render>["rerender"];
    await act(async () => {
      const result = render(<Timeline {...defaultProps} now="12:00" />);
      rerender = result.rerender;
    });

    const countAfterMount = scrollTopValues.length;
    await act(async () => {
      rerender(<Timeline {...defaultProps} now="12:00" />);
    });

    expect(scrollTopValues.length).toBe(countAfterMount);
  });
});

// C-m1-012 (Timeline): NowLine re-renders on now prop changes (re-authored M2)
describe("C-m1-012 (Timeline): NowLine re-renders when now prop changes (re-authored M2)", () => {
  it("updates now-line top when now changes from 08:00 to 08:01", () => {
    const { container, rerender } = render(
      <Timeline {...defaultProps} now="08:00" />,
    );
    const nowLine = container.querySelector('[data-testid="now-line"]');
    const style1 = (nowLine as HTMLElement).getAttribute("style") ?? "";
    const match1 = style1.match(/top:\s*([\d.]+)px/);
    const top1 = parseFloat(match1![1]);
    expect(top1).toBeCloseTo(8 * HOUR_HEIGHT_PX, 0);

    rerender(<Timeline {...defaultProps} now="08:01" />);
    const style2 = (nowLine as HTMLElement).getAttribute("style") ?? "";
    const match2 = style2.match(/top:\s*([\d.]+)px/);
    const top2 = parseFloat(match2![1]);
    expect(top2).toBeGreaterThan(top1);
    expect(
      Math.abs(top2 - (8 * HOUR_HEIGHT_PX + (1 / 60) * HOUR_HEIGHT_PX)),
    ).toBeLessThan(0.1);
  });
});

// C-m1-013 (Timeline): No transition on NowLine (re-authored M2)
describe("C-m1-013 (Timeline): NowLine has no transition on top (re-authored M2)", () => {
  it("NowLine element has no CSS transition style", () => {
    const { container } = render(<Timeline {...defaultProps} now="12:00" />);
    const nowLine = container.querySelector('[data-testid="now-line"]');
    const style = (nowLine as HTMLElement).getAttribute("style") ?? "";
    expect(style).not.toContain("transition");
  });
});

// C-m1-014 (Timeline part): EmptyBlocks card with locked SPEC copy (re-authored M2)
describe("C-m1-014 (Timeline): EmptyBlocks card inside timeline column (re-authored M2)", () => {
  it("renders the locked SPEC copy inside the timeline when blocks is empty", () => {
    render(<Timeline {...defaultProps} now="12:00" />);
    expect(
      screen.getByText("Tap any slot to lay your first block."),
    ).toBeInTheDocument();
  });

  it("EmptyBlocks uses the M0 <EmptyState> primitive (data-testid=empty-state)", () => {
    const { container } = render(<Timeline {...defaultProps} now="12:00" />);
    const emptyState = container.querySelector('[data-testid="empty-state"]');
    expect(emptyState).not.toBeNull();
  });

  it("EmptyBlocks is positioned inside the timeline column, not the page background", () => {
    const { container } = render(<Timeline {...defaultProps} now="12:00" />);
    const hourGrid = container.querySelector('[data-testid="hour-grid"]');
    const emptyState = container.querySelector('[data-testid="empty-state"]');
    expect(hourGrid?.contains(emptyState)).toBe(true);
  });
});

// C-bld-016 (re-authored M2): Timeline empty state shows locked SPEC copy
describe("C-bld-016 (re-authored M2): Timeline renders locked SPEC empty-state copy", () => {
  it("shows 'Tap any slot to lay your first block.' and no timeline-block elements", () => {
    render(<Timeline {...defaultProps} now="11:47" />);
    expect(
      screen.getByText("Tap any slot to lay your first block."),
    ).toBeInTheDocument();
    expect(
      document.querySelectorAll('[data-component="timeline-block"]'),
    ).toHaveLength(0);
  });
});

// C-m2-019: Timeline composes SlotTapTargets + TimelineBlock + NowLine layers (re-authored M2)
describe("C-m2-019: Timeline layered structure (re-authored M2)", () => {
  const block: Block = {
    id: "b1",
    name: "Foo",
    start: "09:00",
    end: "10:00",
    recurrence: { kind: "just-today", date: "2026-05-06" },
    categoryId: null,
    bricks: [],
  };

  it("renders hour-grid, SlotTapTargets (24 buttons), TimelineBlock, and NowLine", () => {
    const mockSlotTap = vi.fn();
    const { container } = render(
      <Timeline
        blocks={[block]}
        categories={[]}
        now="08:00"
        onSlotTap={mockSlotTap}
      />,
    );
    // Hour grid exists
    expect(container.querySelector('[data-testid="hour-grid"]')).not.toBeNull();
    // 24 slot tap buttons
    const slotBtns = screen.getAllByRole("button", {
      name: /Add block at/,
    });
    expect(slotBtns).toHaveLength(24);
    // One timeline block
    const tlBlocks = container.querySelectorAll(
      '[data-component="timeline-block"]',
    );
    expect(tlBlocks).toHaveLength(1);
    // NowLine exists
    expect(container.querySelector('[data-testid="now-line"]')).not.toBeNull();
  });

  it("EmptyBlocks NOT in DOM when blocks.length > 0", () => {
    render(
      <Timeline
        blocks={[block]}
        categories={[]}
        now="08:00"
        onSlotTap={vi.fn()}
      />,
    );
    expect(
      screen.queryByText("Tap any slot to lay your first block."),
    ).toBeNull();
  });

  it("clicking 'Add block at 14:00' calls onSlotTap(14)", async () => {
    const mockSlotTap = vi.fn();
    const user = userEvent.setup();
    render(
      <Timeline
        blocks={[block]}
        categories={[]}
        now="08:00"
        onSlotTap={mockSlotTap}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Add block at 14:00" }),
    );
    expect(mockSlotTap).toHaveBeenCalledWith(14);
  });
});

// ─── C-m4e-030: Timeline union renderer — items prop replaces blocks ──────────

describe("C-m4e-030: Timeline renders TimelineBlock for block items + TimedLooseBrickCard for brick items", () => {
  const blockA: Block = {
    id: "b1",
    name: "Morning block",
    start: "09:00",
    end: "10:00",
    recurrence: { kind: "just-today", date: "2026-05-14" },
    categoryId: null,
    bricks: [],
  };

  const timedBrick: Brick = {
    id: "r1",
    name: "Yoga",
    kind: "tick",
    done: false,
    hasDuration: true,
    start: "11:00",
    end: "11:30",
    recurrence: { kind: "just-today", date: "2026-05-14" },
    categoryId: null,
    parentBlockId: null,
  };

  it("renders one TimelineBlock for the block item at 09:00 top", () => {
    const { container } = render(
      <Timeline
        items={[{ kind: "block", block: blockA }]}
        categories={[]}
        now="08:00"
        onSlotTap={vi.fn()}
      />,
    );
    const tlBlock = container.querySelector(
      '[data-component="timeline-block"]',
    );
    expect(tlBlock).not.toBeNull();
    const expectedTop = timeToOffsetPx("09:00", HOUR_HEIGHT_PX);
    expect((tlBlock as HTMLElement).style.top).toBe(`${expectedTop}px`);
  });

  it("renders one TimedLooseBrickCard for the brick item at 11:00 top", () => {
    const { container } = render(
      <Timeline
        items={[{ kind: "brick", brick: timedBrick }]}
        categories={[]}
        now="08:00"
        onSlotTap={vi.fn()}
      />,
    );
    const timedCard = container.querySelector(
      '[data-testid="timed-loose-brick"]',
    ) as HTMLElement | null;
    expect(timedCard).not.toBeNull();
    const expectedTop = timeToOffsetPx("11:00", HOUR_HEIGHT_PX);
    expect(timedCard!.style.top).toBe(`${expectedTop}px`);
  });

  it("renders both TimelineBlock and TimedLooseBrickCard when items has both kinds", () => {
    const { container } = render(
      <Timeline
        items={[
          { kind: "block", block: blockA },
          { kind: "brick", brick: timedBrick },
        ]}
        categories={[]}
        now="08:00"
        onSlotTap={vi.fn()}
      />,
    );
    expect(
      container.querySelector('[data-component="timeline-block"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="timed-loose-brick"]'),
    ).not.toBeNull();
  });

  it("renders neither TimelineBlock nor TimedLooseBrickCard when items=[]", () => {
    const { container } = render(
      <Timeline items={[]} categories={[]} now="08:00" onSlotTap={vi.fn()} />,
    );
    expect(
      container.querySelector('[data-component="timeline-block"]'),
    ).toBeNull();
    expect(
      container.querySelector('[data-testid="timed-loose-brick"]'),
    ).toBeNull();
    // Hour grid still renders
    expect(container.querySelector('[data-testid="hour-grid"]')).not.toBeNull();
  });
});
