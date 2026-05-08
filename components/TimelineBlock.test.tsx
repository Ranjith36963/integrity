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
