import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimelineBlock } from "./TimelineBlock";
import type { Block, Category } from "@/lib/types";
import { HOUR_HEIGHT_PX } from "@/lib/timeOffset";

// C-m2-014: TimelineBlock — re-authored M2
// Consumes new Block schema, positions absolutely, height ∝ duration
describe("C-m2-014: TimelineBlock new schema, absolute position, height", () => {
  const block: Block = {
    id: "b1",
    name: "Foo",
    start: "09:00",
    end: "10:30",
    recurrence: { kind: "just-today", date: "2026-05-06" },
    categoryId: "c1",
    bricks: [],
  };
  const categories: Category[] = [
    { id: "c1", name: "Health", color: "#34d399" },
  ];

  it("renders with position absolute, top 576px (9*64), height 96px ((10.5-9)*64)", () => {
    const { container: c } = render(
      <TimelineBlock block={block} categories={categories} />,
    );
    const el = c.querySelector(
      '[data-component="timeline-block"]',
    ) as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.style.position).toBe("absolute");
    expect(el.style.top).toBe(`${9 * HOUR_HEIGHT_PX}px`); // 576px
    expect(el.style.height).toBe(`${1.5 * HOUR_HEIGHT_PX}px`); // 96px
  });

  it("renders title 'Foo' with single-line ellipsis CSS", () => {
    render(<TimelineBlock block={block} categories={categories} />);
    const title = screen.getByText("Foo");
    const style = (title as HTMLElement).style;
    expect(style.overflow).toBe("hidden");
    expect(style.whiteSpace).toBe("nowrap");
    expect(style.textOverflow).toBe("ellipsis");
  });

  it("renders time-range label '09:00–10:30' (en-dash)", () => {
    render(<TimelineBlock block={block} categories={categories} />);
    expect(screen.getByText("09:00–10:30")).toBeInTheDocument();
  });

  it("renders category color dot with background matching #34d399", () => {
    const { container } = render(
      <TimelineBlock block={block} categories={categories} />,
    );
    const dot = container.querySelector(
      '[data-testid="category-dot"]',
    ) as HTMLElement;
    expect(dot).not.toBeNull();
    // JSDOM normalizes hex to rgb(); accept either form
    const bg = dot.style.background;
    expect(bg === "#34d399" || bg === "rgb(52, 211, 153)").toBe(true);
  });

  it("clicking does not throw (no-op onClick)", () => {
    const { container } = render(
      <TimelineBlock block={block} categories={categories} />,
    );
    const el = container.querySelector('[data-component="timeline-block"]');
    expect(() => (el as HTMLElement).click()).not.toThrow();
  });
});

// C-m2-015: TimelineBlock — re-authored M2
// End not set: height = HOUR_HEIGHT_PX/12, no en-dash, no category dot
describe("C-m2-015: TimelineBlock with no end field", () => {
  const block: Block = {
    id: "b1",
    name: "Foo",
    start: "09:00",
    recurrence: { kind: "just-today", date: "2026-05-06" },
    categoryId: null,
    bricks: [],
  };

  it("renders top=576px (9*64) and height≈5.33px (64/12)", () => {
    const { container } = render(
      <TimelineBlock block={block} categories={[]} />,
    );
    const el = container.querySelector(
      '[data-component="timeline-block"]',
    ) as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.style.top).toBe(`${9 * HOUR_HEIGHT_PX}px`);
    const h = parseFloat(el.style.height);
    expect(Math.abs(h - HOUR_HEIGHT_PX / 12)).toBeLessThan(0.5);
  });

  it("renders just '09:00' (no en-dash) when end is not set", () => {
    render(<TimelineBlock block={block} categories={[]} />);
    expect(screen.getByText("09:00")).toBeInTheDocument();
    // en-dash should NOT appear in the time label
    const all = screen.queryAllByText(/09:00[–]/);
    expect(all).toHaveLength(0);
  });

  it("does NOT render category dot when categoryId is null", () => {
    const { container } = render(
      <TimelineBlock block={block} categories={[]} />,
    );
    expect(container.querySelector('[data-testid="category-dot"]')).toBeNull();
  });
});

// ─── C-m3-021: tap-to-expand toggles; aria-expanded; bricks list role="list" ─

describe("C-m3-021: TimelineBlock tap-to-expand toggles", () => {
  const cat1: Category = { id: "c1", name: "category 1", color: "#34d399" };
  const block: Block = {
    id: "b1",
    name: "block one",
    start: "09:00",
    end: "10:00",
    recurrence: { kind: "just-today", date: "2026-05-06" },
    categoryId: "c1",
    bricks: [
      {
        id: "r1",
        name: "brick A",
        kind: "tick",
        done: false,
        categoryId: "c1",
        parentBlockId: "b1",
      },
    ],
  };

  it("clicking block sets aria-expanded='true'", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TimelineBlock block={block} categories={[cat1]} onAddBrick={vi.fn()} />,
    );
    const card = container.querySelector(
      '[data-component="timeline-block"]',
    ) as HTMLElement;
    await user.click(card);
    expect(card.getAttribute("aria-expanded")).toBe("true");
  });

  it("expanded: renders ul role='list' with one li per block.bricks[]", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TimelineBlock block={block} categories={[cat1]} onAddBrick={vi.fn()} />,
    );
    const card = container.querySelector(
      '[data-component="timeline-block"]',
    ) as HTMLElement;
    await user.click(card);
    const list = screen.getByRole("list");
    expect(list).toBeTruthy();
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(1);
  });

  it("expanded: '+ Add brick' ghost button is below the list", async () => {
    const user = userEvent.setup();
    render(
      <TimelineBlock block={block} categories={[cat1]} onAddBrick={vi.fn()} />,
    );
    const { container } = render(
      <TimelineBlock block={block} categories={[cat1]} onAddBrick={vi.fn()} />,
    );
    const card = container.querySelector(
      '[data-component="timeline-block"]',
    ) as HTMLElement;
    await user.click(card);
    expect(
      screen.getAllByRole("button", { name: /add brick/i }).length,
    ).toBeGreaterThan(0);
  });

  it("clicking card again returns aria-expanded='false'", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TimelineBlock block={block} categories={[cat1]} onAddBrick={vi.fn()} />,
    );
    const card = container.querySelector(
      '[data-component="timeline-block"]',
    ) as HTMLElement;
    await user.click(card);
    await user.click(card);
    expect(card.getAttribute("aria-expanded")).toBe("false");
  });

  it("clicking '+ Add brick' calls onAddBrick('b1')", async () => {
    const user = userEvent.setup();
    const onAddBrick = vi.fn();
    const { container } = render(
      <TimelineBlock
        block={block}
        categories={[cat1]}
        onAddBrick={onAddBrick}
      />,
    );
    const card = container.querySelector(
      '[data-component="timeline-block"]',
    ) as HTMLElement;
    await user.click(card);
    const addBrickBtn = screen.getByRole("button", { name: /add brick/i });
    await user.click(addBrickBtn);
    expect(onAddBrick).toHaveBeenCalledWith("b1");
  });
});

// ─── C-m3-022: scaffold left-bar height = blockPct% ───────────────────────────

describe("C-m3-022: TimelineBlock scaffold left-bar height", () => {
  const cat1: Category = { id: "c1", name: "category 1", color: "#34d399" };
  const block50: Block = {
    id: "b1",
    name: "block one",
    start: "09:00",
    end: "10:00",
    recurrence: { kind: "just-today", date: "2026-05-06" },
    categoryId: "c1",
    bricks: [
      {
        id: "r1",
        name: "x",
        kind: "tick",
        done: true,
        categoryId: "c1",
        parentBlockId: "b1",
      },
      {
        id: "r2",
        name: "y",
        kind: "tick",
        done: false,
        categoryId: "c1",
        parentBlockId: "b1",
      },
    ],
  };

  it("scaffold fill height is '50%' for blockPct=50", () => {
    const { container } = render(
      <TimelineBlock
        block={block50}
        categories={[cat1]}
        onAddBrick={vi.fn()}
      />,
    );
    const fill = container.querySelector(
      "[data-testid='scaffold-fill']",
    ) as HTMLElement;
    expect(fill?.style.height).toBe("50%");
  });

  it("scaffold fill background resolves to category color #34d399", () => {
    const { container } = render(
      <TimelineBlock
        block={block50}
        categories={[cat1]}
        onAddBrick={vi.fn()}
      />,
    );
    const fill = container.querySelector(
      "[data-testid='scaffold-fill']",
    ) as HTMLElement;
    const bg = fill?.style.background;
    expect(bg === "#34d399" || bg === "rgb(52, 211, 153)").toBe(true);
  });

  it("when categoryId is null, scaffold uses var(--text-dim)", () => {
    const uncatBlock: Block = { ...block50, categoryId: null };
    const { container } = render(
      <TimelineBlock
        block={uncatBlock}
        categories={[cat1]}
        onAddBrick={vi.fn()}
      />,
    );
    const fill = container.querySelector(
      "[data-testid='scaffold-fill']",
    ) as HTMLElement;
    expect(fill?.style.background).toContain("text-dim");
  });

  it("when bricks:[], scaffold height is '0%'", () => {
    const emptyBlock: Block = { ...block50, bricks: [] };
    const { container } = render(
      <TimelineBlock
        block={emptyBlock}
        categories={[cat1]}
        onAddBrick={vi.fn()}
      />,
    );
    const fill = container.querySelector(
      "[data-testid='scaffold-fill']",
    ) as HTMLElement;
    expect(fill?.style.height).toBe("0%");
  });
});

// ─── C-m4a-010: onTickToggle prop threading ───────────────────────────────────

vi.mock("@/lib/haptics", () => ({
  haptics: {
    light: vi.fn(),
    medium: vi.fn(),
    success: vi.fn(),
    notification: vi.fn(),
  },
}));

vi.mock("@/lib/audio", () => ({
  playChime: vi.fn(),
}));

describe("C-m4a-010: TimelineBlock threads onTickToggle down to BrickChip", () => {
  const cat1: Category = { id: "c1", name: "category 1", color: "#34d399" };
  const blockAt50: Block = {
    id: "b1",
    name: "block 1",
    start: "09:00",
    end: "10:00",
    recurrence: { kind: "just-today", date: "2026-05-06" },
    categoryId: "c1",
    bricks: [
      {
        id: "brick-1",
        name: "brick A",
        kind: "tick",
        done: false,
        categoryId: "c1",
        parentBlockId: "b1",
      },
      {
        id: "brick-2",
        name: "brick A",
        kind: "tick",
        done: true,
        categoryId: "c1",
        parentBlockId: "b1",
      },
    ],
  };

  it("clicking inner tick BrickChip calls onTickToggle with brick.id", async () => {
    const user = userEvent.setup();
    const onTickToggle = vi.fn();
    const { container } = render(
      <TimelineBlock
        block={blockAt50}
        categories={[cat1]}
        onAddBrick={vi.fn()}
        onTickToggle={onTickToggle}
      />,
    );
    // Expand the block to show bricks
    const card = container.querySelector(
      '[data-component="timeline-block"]',
    ) as HTMLElement;
    await user.click(card);

    // Click first tick chip (brick-1, done:false)
    const brickBtns = screen.getAllByRole("button");
    const tickBtn = brickBtns.find(
      (b) => b.getAttribute("aria-pressed") !== null,
    );
    expect(tickBtn).toBeTruthy();
    await user.click(tickBtn!);
    expect(onTickToggle).toHaveBeenCalledWith("brick-1");
  });
});

// ─── C-m4a-011: block 100% cross-up fires haptics.success + playChime ─────────

describe("C-m4a-011: block cross-up to 100% fires haptics.success + playChime + bloom key", () => {
  const cat1: Category = { id: "c1", name: "category 1", color: "#34d399" };

  it("haptics.success and playChime called when blockPct goes from 99 to 100", async () => {
    const { haptics } = await import("@/lib/haptics");
    const { playChime } = await import("@/lib/audio");
    vi.clearAllMocks();

    // Block at 99% (one done, one undone out of 2 is 50%, so use 99 of 100)
    // Easier: create a wrapper that controls blockPct via props re-render
    const { rerender } = render(
      <TimelineBlock
        block={{
          id: "b1",
          name: "block 1",
          start: "09:00",
          end: "10:00",
          recurrence: { kind: "just-today", date: "2026-05-06" },
          categoryId: "c1",
          bricks: [
            {
              id: "brick-1",
              name: "brick A",
              kind: "tick",
              done: true,
              categoryId: "c1",
              parentBlockId: "b1",
            },
            {
              id: "brick-2",
              name: "brick A",
              kind: "tick",
              done: false,
              categoryId: "c1",
              parentBlockId: "b1",
            },
          ],
        }}
        categories={[cat1]}
        onAddBrick={vi.fn()}
      />,
    );

    // Re-render with all bricks done (100%)
    rerender(
      <TimelineBlock
        block={{
          id: "b1",
          name: "block 1",
          start: "09:00",
          end: "10:00",
          recurrence: { kind: "just-today", date: "2026-05-06" },
          categoryId: "c1",
          bricks: [
            {
              id: "brick-1",
              name: "brick A",
              kind: "tick",
              done: true,
              categoryId: "c1",
              parentBlockId: "b1",
            },
            {
              id: "brick-2",
              name: "brick A",
              kind: "tick",
              done: true,
              categoryId: "c1",
              parentBlockId: "b1",
            },
          ],
        }}
        categories={[cat1]}
        onAddBrick={vi.fn()}
      />,
    );

    expect(haptics.success).toHaveBeenCalledTimes(1);
    expect(playChime).toHaveBeenCalledTimes(1);
  });
});

// ─── C-m4a-012: reduced-motion — haptics + chime still fire even when suppressed

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return {
    ...actual,
    useReducedMotion: vi.fn(() => false),
  };
});

describe("C-m4a-012: reduced-motion does not suppress haptics or chime on block 100%", () => {
  const cat1: Category = { id: "c1", name: "category 1", color: "#34d399" };

  it("haptics.success and playChime still fire when useReducedMotion is true", async () => {
    const { useReducedMotion } = await import("motion/react");
    vi.mocked(useReducedMotion).mockReturnValue(true);

    const { haptics } = await import("@/lib/haptics");
    const { playChime } = await import("@/lib/audio");
    vi.clearAllMocks();

    const { rerender } = render(
      <TimelineBlock
        block={{
          id: "b1",
          name: "block 1",
          start: "09:00",
          end: "10:00",
          recurrence: { kind: "just-today", date: "2026-05-06" },
          categoryId: "c1",
          bricks: [
            {
              id: "brick-1",
              name: "brick A",
              kind: "tick",
              done: false,
              categoryId: "c1",
              parentBlockId: "b1",
            },
          ],
        }}
        categories={[cat1]}
        onAddBrick={vi.fn()}
      />,
    );

    // Cross up to 100%
    rerender(
      <TimelineBlock
        block={{
          id: "b1",
          name: "block 1",
          start: "09:00",
          end: "10:00",
          recurrence: { kind: "just-today", date: "2026-05-06" },
          categoryId: "c1",
          bricks: [
            {
              id: "brick-1",
              name: "brick A",
              kind: "tick",
              done: true,
              categoryId: "c1",
              parentBlockId: "b1",
            },
          ],
        }}
        categories={[cat1]}
        onAddBrick={vi.fn()}
      />,
    );

    expect(haptics.success).toHaveBeenCalledTimes(1);
    expect(playChime).toHaveBeenCalledTimes(1);
  });
});

// ─── C-m4b-020: TimelineBlock threads onGoalLog down to BrickChip ─────────────

describe("C-m4b-020: TimelineBlock threads onGoalLog down to inner goal BrickChip", () => {
  const cat1: Category = { id: "c1", name: "category 1", color: "#34d399" };
  const blockWithGoal: Block = {
    id: "b1",
    name: "block 1",
    start: "09:00",
    end: "10:00",
    recurrence: { kind: "just-today", date: "2026-05-06" },
    categoryId: "c1",
    bricks: [
      {
        id: "g1",
        name: "pushups",
        kind: "goal",
        count: 3,
        target: 10,
        unit: "reps",
        categoryId: "c1",
        parentBlockId: "b1",
      },
    ],
  };

  it("clicking inner + button calls onGoalLog with brick.id and delta:1", async () => {
    const user = userEvent.setup();
    const onGoalLog = vi.fn();
    const { container } = render(
      <TimelineBlock
        block={blockWithGoal}
        categories={[cat1]}
        onAddBrick={vi.fn()}
        onGoalLog={onGoalLog}
      />,
    );
    const card = container.querySelector(
      '[data-component="timeline-block"]',
    ) as HTMLElement;
    await user.click(card);

    const plus = screen.getByRole("button", { name: "Increase pushups" });
    await user.click(plus);
    expect(onGoalLog).toHaveBeenCalledWith("g1", 1);
  });
});

// ─── C-m4c-019: TimelineBlock threads runningTimerBrickId + timer callbacks ────

describe("C-m4c-019: TimelineBlock pass-through of runningTimerBrickId and timer callbacks", () => {
  const cat1: Category = { id: "c1", name: "category 1", color: "#34d399" };
  const blockWithTimeBrick: Block = {
    id: "b1",
    name: "block 1",
    start: "09:00",
    end: "10:00",
    recurrence: { kind: "just-today", date: "2026-05-06" },
    categoryId: "c1",
    bricks: [
      {
        id: "t1",
        name: "Read",
        kind: "time",
        durationMin: 25,
        minutesDone: 5,
        categoryId: "c1",
        parentBlockId: "b1",
      },
    ],
  };

  it("chip receives running=true when runningTimerBrickId matches brick.id", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TimelineBlock
        block={blockWithTimeBrick}
        categories={[cat1]}
        onAddBrick={vi.fn()}
        runningTimerBrickId="t1"
        onTimerToggle={vi.fn()}
        onTimerOpenSheet={vi.fn()}
      />,
    );
    // Expand to reveal chip
    const card = container.querySelector(
      '[data-component="timeline-block"]',
    ) as HTMLElement;
    await user.click(card);

    // Time chip should be aria-pressed="true" (running=true)
    const chip = screen.getByRole("button", {
      name: /running, tap to stop/,
    });
    expect(chip).toBeInTheDocument();
    expect(chip.getAttribute("aria-pressed")).toBe("true");
  });

  it("chip receives running=false when runningTimerBrickId is different brick", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TimelineBlock
        block={blockWithTimeBrick}
        categories={[cat1]}
        onAddBrick={vi.fn()}
        runningTimerBrickId="t2"
        onTimerToggle={vi.fn()}
        onTimerOpenSheet={vi.fn()}
      />,
    );
    const card = container.querySelector(
      '[data-component="timeline-block"]',
    ) as HTMLElement;
    await user.click(card);

    const chip = screen.getByRole("button", {
      name: /stopped, tap to start/,
    });
    expect(chip).toBeInTheDocument();
    expect(chip.getAttribute("aria-pressed")).toBe("false");
  });

  it("onTimerToggle spy is called with brick id when chip onTimerToggle fires", async () => {
    const user = userEvent.setup();
    const onTimerToggle = vi.fn();
    const { container } = render(
      <TimelineBlock
        block={blockWithTimeBrick}
        categories={[cat1]}
        onAddBrick={vi.fn()}
        runningTimerBrickId={null}
        onTimerToggle={onTimerToggle}
        onTimerOpenSheet={vi.fn()}
      />,
    );
    const card = container.querySelector(
      '[data-component="timeline-block"]',
    ) as HTMLElement;
    await user.click(card);

    // Tap the chip (short press)
    const chip = screen.getByRole("button", { name: /stopped, tap to start/ });
    chip.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    chip.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 50));

    expect(onTimerToggle).toHaveBeenCalledWith("t1");
  });
});
