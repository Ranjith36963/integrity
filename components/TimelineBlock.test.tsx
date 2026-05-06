import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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
