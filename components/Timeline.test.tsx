import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Timeline } from "./Timeline";
import type { TimelineItem } from "./Timeline";
import { HOUR_HEIGHT_PX, timeToOffsetPx } from "@/lib/timeOffset";
import type { Block, Brick } from "@/lib/types";
import { EditModeContext } from "./EditModeProvider";

// M6 Gap 4: mock motion/react so DraggableTimelineBlock's drag prop is readable via data-drag
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return {
    ...actual,
    motion: {
      ...actual.motion,
      div: (props: {
        children?: React.ReactNode;
        drag?: string | boolean;
        "data-testid"?: string;
        [key: string]: unknown;
      }) => {
        // Filter Framer-specific props not valid on a plain DOM div
        const {
          children,
          drag,
          "data-testid": testId,
          onDragStart: _ods,
          onDragEnd: _ode,
          dragControls: _dc,
          dragListener: _dl,
          dragConstraints: _dcs,
          dragMomentum: _dm,
          whileDrag: _wd,
          transition: _tr,
          ...rest
        } = props;
        void _ods;
        void _ode;
        void _dc;
        void _dl;
        void _dcs;
        void _dm;
        void _wd;
        void _tr;
        return (
          <div
            data-testid={testId as string | undefined}
            data-drag={drag !== undefined ? String(drag) : undefined}
            {...(rest as React.HTMLAttributes<HTMLDivElement>)}
          >
            {children}
          </div>
        );
      },
    },
    useReducedMotion: vi.fn(() => false),
    useDragControls: vi.fn(() => ({ start: vi.fn() })),
    AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

// Default props for M2 Timeline (re-authored to add categories + onSlotTap)
// M4e: `blocks` prop renamed to `items: TimelineItem[]` — use items=[] for the empty case.
const defaultProps = {
  items: [] as TimelineItem[],
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
// M4e: `blocks={[block]}` → `items={[{kind:"block", block}]}`
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
        items={[{ kind: "block", block }]}
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

  it("EmptyBlocks NOT in DOM when items has a block", () => {
    render(
      <Timeline
        items={[{ kind: "block", block }]}
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
        items={[{ kind: "block", block }]}
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

// ─── C-m6-010 (Gap 4 integration): Timeline threads modalOpen to DraggableTimelineBlock ─

describe("C-m6-010 (integration): Timeline.modalOpen prop disables drag on DraggableTimelineBlock", () => {
  const blkForModal: Block = {
    id: "blk-modal-test",
    name: "Morning",
    start: "08:00",
    end: "09:00",
    recurrence: { kind: "every-day" },
    categoryId: null,
    bricks: [],
  };
  const itemsForModal: TimelineItem[] = [{ kind: "block", block: blkForModal }];

  it("drag='false' on DraggableTimelineBlock when modalOpen=true even with editMode=true and onReorderRequest provided", () => {
    render(
      <EditModeContext.Provider value={{ editMode: true, toggle: vi.fn() }}>
        <Timeline
          items={itemsForModal}
          categories={[]}
          now="08:00"
          onSlotTap={vi.fn()}
          onReorderRequest={vi.fn()}
          modalOpen={true}
        />
      </EditModeContext.Provider>,
    );
    const wrapper = screen.getByTestId("draggable-timeline-block");
    expect(wrapper.getAttribute("data-drag")).toBe("false");
  });

  it("drag='y' on DraggableTimelineBlock when modalOpen=false with editMode=true and onReorderRequest provided", () => {
    render(
      <EditModeContext.Provider value={{ editMode: true, toggle: vi.fn() }}>
        <Timeline
          items={itemsForModal}
          categories={[]}
          now="08:00"
          onSlotTap={vi.fn()}
          onReorderRequest={vi.fn()}
          modalOpen={false}
        />
      </EditModeContext.Provider>,
    );
    const wrapper = screen.getByTestId("draggable-timeline-block");
    expect(wrapper.getAttribute("data-drag")).toBe("y");
  });
});

// ─── M7a stagger prop tests ────────────────────────────────────────────────────

function mkTimelineBlock(id: string, start: string, end: string): Block {
  return {
    id,
    name: id,
    start,
    end,
    recurrence: { kind: "just-today", date: "2026-05-18" },
    categoryId: null,
    bricks: [],
  };
}

// C-m7a-007: Timeline stagger toggle
describe("C-m7a-007: <Timeline stagger> toggle — false byte-identical; true wraps block cards; chrome NOT wrapped", () => {
  const threeItems: TimelineItem[] = [
    { kind: "block", block: mkTimelineBlock("b1", "08:00", "09:00") },
    { kind: "block", block: mkTimelineBlock("b2", "10:00", "11:00") },
    { kind: "block", block: mkTimelineBlock("b3", "12:00", "13:00") },
  ];

  it("stagger={false} (default): no stagger container wrapper around items", () => {
    const { container } = render(
      <Timeline
        items={threeItems}
        categories={[]}
        now="08:00"
        onSlotTap={vi.fn()}
        stagger={false}
      />,
    );
    // No stagger container wrapper — existing block cards render directly
    expect(
      container.querySelector('[data-testid="timeline-stagger-container"]'),
    ).toBeNull();
  });

  it("stagger omitted (defaults to false): no stagger container", () => {
    const { container } = render(
      <Timeline
        items={threeItems}
        categories={[]}
        now="08:00"
        onSlotTap={vi.fn()}
      />,
    );
    expect(
      container.querySelector('[data-testid="timeline-stagger-container"]'),
    ).toBeNull();
  });

  it("stagger={true}: a stagger container wrapper appears around block cards", () => {
    const { container } = render(
      <Timeline
        items={threeItems}
        categories={[]}
        now="08:00"
        onSlotTap={vi.fn()}
        stagger={true}
      />,
    );
    // The stagger wrapper must be present when stagger=true
    expect(
      container.querySelector('[data-testid="timeline-stagger-container"]'),
    ).not.toBeNull();
  });

  it("stagger={true}: NowLine is NOT inside the stagger container (chrome is not wrapped)", () => {
    const { container } = render(
      <Timeline
        items={threeItems}
        categories={[]}
        now="08:00"
        onSlotTap={vi.fn()}
        stagger={true}
      />,
    );
    const staggerContainer = container.querySelector(
      '[data-testid="timeline-stagger-container"]',
    );
    const nowLine = container.querySelector('[data-testid="now-line"]');
    expect(staggerContainer).not.toBeNull();
    expect(nowLine).not.toBeNull();
    // NowLine must NOT be a descendant of the stagger container
    expect(staggerContainer?.contains(nowLine)).toBe(false);
  });

  it("stagger={true}: SlotTapTargets is NOT inside the stagger container", () => {
    const { container } = render(
      <Timeline
        items={threeItems}
        categories={[]}
        now="08:00"
        onSlotTap={vi.fn()}
        stagger={true}
      />,
    );
    const staggerContainer = container.querySelector(
      '[data-testid="timeline-stagger-container"]',
    );
    // slot-tap-targets must be outside the stagger wrapper
    const slots = container.querySelector('[data-testid="slot-tap-targets"]');
    expect(staggerContainer).not.toBeNull();
    if (slots && staggerContainer) {
      expect(staggerContainer.contains(slots)).toBe(false);
    }
  });

  it("stagger={false}: hour-grid and NowLine render at their existing layers (unchanged from M2/M3)", () => {
    const { container } = render(
      <Timeline
        items={threeItems}
        categories={[]}
        now="08:00"
        onSlotTap={vi.fn()}
        stagger={false}
      />,
    );
    expect(container.querySelector('[data-testid="hour-grid"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="now-line"]')).not.toBeNull();
  });
});

// ── M7b: active-block predicate tests ────────────────────────────────────────

// stateFourBlocks fixture: 4 consecutive closed blocks
function makeBlock(id: string, start: string, end: string): Block {
  return {
    id,
    name: id,
    start,
    end,
    recurrence: { kind: "just-today", date: "2026-05-18" },
    categoryId: null,
    bricks: [],
  };
}

const blkA = makeBlock("blk-A", "08:00", "09:00");
const blkB = makeBlock("blk-B", "09:00", "10:00");
const blkC = makeBlock("blk-C", "10:00", "11:00");
const blkD = makeBlock("blk-D", "11:00", "12:00");

const stateFourBlocks: TimelineItem[] = [
  { kind: "block", block: blkA },
  { kind: "block", block: blkB },
  { kind: "block", block: blkC },
  { kind: "block", block: blkD },
];

// ── C-m7b-009 ─────────────────────────────────────────────────────────────────
describe("C-m7b-009 — <Timeline> applies isActive={true} to EXACTLY ONE block — the one whose [start,end) contains now", () => {
  it("now=09:30 (mid-blk-B) → exactly 1 is-active block; that block is blk-B", () => {
    const { container } = render(
      <Timeline
        items={stateFourBlocks}
        categories={[]}
        now="09:30"
        onSlotTap={vi.fn()}
      />,
    );
    const active = container.querySelectorAll(
      '[data-component="timeline-block"].is-active',
    );
    expect(active).toHaveLength(1);
    // blk-B's name is rendered inside the one active card
    expect(active[0].textContent).toContain("blk-B");
  });

  it("NowTag appears exactly once — inside the active block subtree", () => {
    const { container } = render(
      <Timeline
        items={stateFourBlocks}
        categories={[]}
        now="09:30"
        onSlotTap={vi.fn()}
      />,
    );
    const badges = container.querySelectorAll('[data-testid="now-tag"]');
    expect(badges).toHaveLength(1);
  });

  it("other three blocks do NOT carry is-active", () => {
    const { container } = render(
      <Timeline
        items={stateFourBlocks}
        categories={[]}
        now="09:30"
        onSlotTap={vi.fn()}
      />,
    );
    const allBlocks = container.querySelectorAll(
      '[data-component="timeline-block"]',
    );
    const activeBlocks = container.querySelectorAll(
      '[data-component="timeline-block"].is-active',
    );
    expect(allBlocks).toHaveLength(4);
    expect(activeBlocks).toHaveLength(1);
  });

  it("boundary: now=09:00 (blk-B start) → blk-B active (half-open [start,end))", () => {
    const { container } = render(
      <Timeline
        items={stateFourBlocks}
        categories={[]}
        now="09:00"
        onSlotTap={vi.fn()}
      />,
    );
    const active = container.querySelectorAll(
      '[data-component="timeline-block"].is-active',
    );
    expect(active).toHaveLength(1);
    expect(active[0].textContent).toContain("blk-B");
  });

  it("boundary: now=10:00 (blk-B end / blk-C start) → blk-C active, NOT blk-B", () => {
    const { container } = render(
      <Timeline
        items={stateFourBlocks}
        categories={[]}
        now="10:00"
        onSlotTap={vi.fn()}
      />,
    );
    const active = container.querySelectorAll(
      '[data-component="timeline-block"].is-active',
    );
    expect(active).toHaveLength(1);
    expect(active[0].textContent).toContain("blk-C");
    expect(active[0].textContent).not.toContain("blk-B");
  });

  it("boundary: now=08:00 (blk-A start) → blk-A active", () => {
    const { container } = render(
      <Timeline
        items={stateFourBlocks}
        categories={[]}
        now="08:00"
        onSlotTap={vi.fn()}
      />,
    );
    const active = container.querySelectorAll(
      '[data-component="timeline-block"].is-active',
    );
    expect(active).toHaveLength(1);
    expect(active[0].textContent).toContain("blk-A");
  });
});

// ── C-m7b-010 ─────────────────────────────────────────────────────────────────
describe("C-m7b-010 — <Timeline> when no block contains now — no is-active, no NowTag", () => {
  it("now=06:30 (before all) → zero is-active blocks, zero NowTags", () => {
    const { container } = render(
      <Timeline
        items={stateFourBlocks}
        categories={[]}
        now="06:30"
        onSlotTap={vi.fn()}
      />,
    );
    expect(
      container.querySelectorAll('[data-component="timeline-block"].is-active'),
    ).toHaveLength(0);
    expect(container.querySelectorAll('[data-testid="now-tag"]')).toHaveLength(
      0,
    );
  });

  it("now=23:30 (after all) → zero is-active blocks, zero NowTags", () => {
    const { container } = render(
      <Timeline
        items={stateFourBlocks}
        categories={[]}
        now="23:30"
        onSlotTap={vi.fn()}
      />,
    );
    expect(
      container.querySelectorAll('[data-component="timeline-block"].is-active'),
    ).toHaveLength(0);
    expect(container.querySelectorAll('[data-testid="now-tag"]')).toHaveLength(
      0,
    );
  });

  it("now=12:00 (boundary — blk-D end; half-open ⇒ no block active) → zero is-active", () => {
    const { container } = render(
      <Timeline
        items={stateFourBlocks}
        categories={[]}
        now="12:00"
        onSlotTap={vi.fn()}
      />,
    );
    expect(
      container.querySelectorAll('[data-component="timeline-block"].is-active'),
    ).toHaveLength(0);
  });
});

// ── C-m7b-011 ─────────────────────────────────────────────────────────────────
describe("C-m7b-011 — <Timeline> is-active migrates with the now prop tick", () => {
  it("now:09:30→10:30→11:00 — blk-B→blk-C→blk-D; exactly one is-active at each step", () => {
    const { container, rerender } = render(
      <Timeline
        items={stateFourBlocks}
        categories={[]}
        now="09:30"
        onSlotTap={vi.fn()}
      />,
    );

    // Initial: blk-B active
    let active = container.querySelectorAll(
      '[data-component="timeline-block"].is-active',
    );
    expect(active).toHaveLength(1);
    expect(active[0].textContent).toContain("blk-B");

    // Rerender to 10:30 — blk-C should be active
    rerender(
      <Timeline
        items={stateFourBlocks}
        categories={[]}
        now="10:30"
        onSlotTap={vi.fn()}
      />,
    );
    active = container.querySelectorAll(
      '[data-component="timeline-block"].is-active',
    );
    expect(active).toHaveLength(1);
    expect(active[0].textContent).toContain("blk-C");
    expect(active[0].textContent).not.toContain("blk-B");

    // Rerender to 11:00 — blk-D should be active (half-open: blk-C ends, blk-D starts)
    rerender(
      <Timeline
        items={stateFourBlocks}
        categories={[]}
        now="11:00"
        onSlotTap={vi.fn()}
      />,
    );
    active = container.querySelectorAll(
      '[data-component="timeline-block"].is-active',
    );
    expect(active).toHaveLength(1);
    expect(active[0].textContent).toContain("blk-D");
    expect(active[0].textContent).not.toContain("blk-C");
  });

  it("NowTag migrates with the active block at each step", () => {
    const { container, rerender } = render(
      <Timeline
        items={stateFourBlocks}
        categories={[]}
        now="09:30"
        onSlotTap={vi.fn()}
      />,
    );

    // Step 1: NowTag in blk-B subtree
    let activeNode = container.querySelector(
      '[data-component="timeline-block"].is-active',
    ) as HTMLElement;
    let badge = container.querySelector(
      '[data-testid="now-tag"]',
    ) as HTMLElement;
    expect(activeNode.contains(badge)).toBe(true);

    rerender(
      <Timeline
        items={stateFourBlocks}
        categories={[]}
        now="10:30"
        onSlotTap={vi.fn()}
      />,
    );
    activeNode = container.querySelector(
      '[data-component="timeline-block"].is-active',
    ) as HTMLElement;
    badge = container.querySelector('[data-testid="now-tag"]') as HTMLElement;
    expect(activeNode.contains(badge)).toBe(true);
    expect(activeNode.textContent).toContain("blk-C");
  });
});

// ── C-m7b-012 ─────────────────────────────────────────────────────────────────
describe("C-m7b-012 — <Timeline> empty items list does not throw; no is-active in DOM", () => {
  it("renders without throwing when items=[]", () => {
    expect(() => {
      render(
        <Timeline items={[]} categories={[]} now="09:30" onSlotTap={vi.fn()} />,
      );
    }).not.toThrow();
  });

  it("no is-active blocks and no NowTag when items=[]", () => {
    const { container } = render(
      <Timeline items={[]} categories={[]} now="09:30" onSlotTap={vi.fn()} />,
    );
    expect(
      container.querySelectorAll('[data-component="timeline-block"].is-active'),
    ).toHaveLength(0);
    expect(container.querySelectorAll('[data-testid="now-tag"]')).toHaveLength(
      0,
    );
  });

  it("hour-grid and NowLine still render when items=[]", () => {
    const { container } = render(
      <Timeline items={[]} categories={[]} now="09:30" onSlotTap={vi.fn()} />,
    );
    expect(container.querySelector('[data-testid="hour-grid"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="now-line"]')).not.toBeNull();
  });
});

// ── C-m7b-013 ─────────────────────────────────────────────────────────────────
describe("C-m7b-013 — <Timeline> deleted block (via M5 deletions filter) is NOT a candidate for active", () => {
  it("only blk-B in items (blk-A filtered by deletions) → blk-B carries is-active; blk-A not in DOM", () => {
    // Simulate M5 currentDayBlocks filter: blk-A deleted for today, only blk-B remains in items
    // blk-A-del would exist but is filtered out by M5 currentDayBlocks before reaching Timeline
    const blkBRemaining = makeBlock("blk-B-rem", "09:30", "10:30");

    // Hand-assembled items: only blk-B-rem (blk-A-del is excluded — filtered by deletions)
    const filteredItems: TimelineItem[] = [
      { kind: "block", block: blkBRemaining },
    ];

    const { container } = render(
      <Timeline
        items={filteredItems}
        categories={[]}
        now="09:45"
        onSlotTap={vi.fn()}
      />,
    );

    // Only blk-B-rem is in the DOM
    const allBlocks = container.querySelectorAll(
      '[data-component="timeline-block"]',
    );
    expect(allBlocks).toHaveLength(1);

    // blk-B-rem carries is-active (now=09:45 is inside [09:30, 10:30))
    const active = container.querySelectorAll(
      '[data-component="timeline-block"].is-active',
    );
    expect(active).toHaveLength(1);
    expect(active[0].textContent).toContain("blk-B-rem");

    // blk-A-del is NOT in the DOM at all
    expect(container.textContent).not.toContain("blk-A-del");
  });

  it("NowTag is inside blk-B-rem subtree, not blk-A-del (which is absent)", () => {
    const blkBRemaining = makeBlock("blk-B-rem", "09:30", "10:30");
    const filteredItems: TimelineItem[] = [
      { kind: "block", block: blkBRemaining },
    ];

    const { container } = render(
      <Timeline
        items={filteredItems}
        categories={[]}
        now="09:45"
        onSlotTap={vi.fn()}
      />,
    );

    const badge = container.querySelector(
      '[data-testid="now-tag"]',
    ) as HTMLElement;
    expect(badge).not.toBeNull();
    const activeNode = container.querySelector(
      '[data-component="timeline-block"].is-active',
    ) as HTMLElement;
    expect(activeNode.contains(badge)).toBe(true);
  });
});
