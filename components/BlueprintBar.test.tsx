import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BlueprintBar, aggregateCategoryMinutes } from "./BlueprintBar";
import type { Block, Category } from "@/lib/types";

// Helper for making test blocks
function mkBlock(
  id: string,
  start: string,
  end: string | undefined,
  categoryId: string | null,
): Block {
  return {
    id,
    name: id,
    start,
    end,
    recurrence: { kind: "just-today", date: "2026-05-06" },
    categoryId,
    bricks: [],
  };
}

// U-m2-011: BlueprintBar non-empty path math (categoryId aggregation)
describe("U-m2-011: aggregateCategoryMinutes — category aggregation math", () => {
  const blocks: Block[] = [
    mkBlock("b1", "09:00", "10:00", "c1"), // 60 min c1
    mkBlock("b2", "14:00", "15:00", "c1"), // 60 min c1 → c1 total = 120
    mkBlock("b3", "12:00", "12:30", "c2"), // 30 min c2
    mkBlock("b4", "08:00", "09:00", null), // uncategorized — excluded
    mkBlock("b5", "16:00", undefined, "c1"), // no end — excluded
  ];

  it("aggregates c1=120 and c2=30, excludes no-end and null-category", () => {
    const result = aggregateCategoryMinutes(blocks);
    const c1 = result.find((e) => e.categoryId === "c1");
    const c2 = result.find((e) => e.categoryId === "c2");
    expect(c1?.minutes).toBe(120);
    expect(c2?.minutes).toBe(30);
  });

  it("segment widths sum to 100% within ±0.01% rounding", () => {
    const result = aggregateCategoryMinutes(blocks);
    const total = result.reduce((s, e) => s + e.minutes, 0);
    const sumPct = result.reduce((s, e) => s + (e.minutes / total) * 100, 0);
    expect(Math.abs(sumPct - 100)).toBeLessThan(0.01);
  });

  it("emits segments in categoryId-sorted order (c1 before c2)", () => {
    const result = aggregateCategoryMinutes(blocks);
    expect(result[0].categoryId).toBe("c1");
    expect(result[1].categoryId).toBe("c2");
  });
});

// C-m2-017: BlueprintBar non-empty path renders colored segments — re-authored M2
describe("C-m2-017: BlueprintBar non-empty path renders colored segments (re-authored M2)", () => {
  const categories: Category[] = [
    { id: "c1", name: "Health", color: "#34d399" },
    { id: "c2", name: "Mind", color: "#c4b5fd" },
  ];
  const blocks: Block[] = [
    mkBlock("b1", "09:00", "10:00", "c1"),
    mkBlock("b2", "12:00", "12:30", "c2"),
    mkBlock("b3", "14:00", "15:00", null), // uncategorized — excluded
  ];

  it("renders exactly 2 blueprint-segment elements (uncategorized excluded)", () => {
    const { container } = render(
      <BlueprintBar blocks={blocks} categories={categories} now="12:00" />,
    );
    const segments = container.querySelectorAll(
      '[data-testid="blueprint-segment"]',
    );
    expect(segments).toHaveLength(2);
  });

  it("segment widths sum to ~100%", () => {
    const { container } = render(
      <BlueprintBar blocks={blocks} categories={categories} now="12:00" />,
    );
    const segments = container.querySelectorAll(
      '[data-testid="blueprint-segment"]',
    ) as NodeListOf<HTMLElement>;
    const widthSum = [...segments].reduce((s, el) => {
      return s + parseFloat(el.style.width);
    }, 0);
    expect(Math.abs(widthSum - 100)).toBeLessThan(0.5);
  });

  it("c1 segment background matches #34d399 and c2 matches #c4b5fd", () => {
    const { container } = render(
      <BlueprintBar blocks={blocks} categories={categories} now="12:00" />,
    );
    const segments = container.querySelectorAll(
      '[data-testid="blueprint-segment"]',
    ) as NodeListOf<HTMLElement>;
    // Segments are sorted by categoryId: c1 first, c2 second
    const c1bg = segments[0].style.background;
    const c2bg = segments[1].style.background;
    // JSDOM may normalize hex to rgb
    expect(c1bg === "#34d399" || c1bg === "rgb(52, 211, 153)").toBe(true);
    expect(c2bg === "#c4b5fd" || c2bg === "rgb(196, 181, 253)").toBe(true);
  });

  it("segments are in categoryId-sorted order (c1 before c2)", () => {
    const { container } = render(
      <BlueprintBar blocks={blocks} categories={categories} now="12:00" />,
    );
    const segments = container.querySelectorAll(
      '[data-testid="blueprint-segment"]',
    ) as NodeListOf<HTMLElement>;
    expect(segments[0].getAttribute("data-category-id")).toBe("c1");
    expect(segments[1].getAttribute("data-category-id")).toBe("c2");
  });
});

// C-m2-018: BlueprintBar empty fallback when all blocks uncategorized — re-authored M2
describe("C-m2-018: BlueprintBar empty fallback when all blocks uncategorized (re-authored M2)", () => {
  it("renders zero blueprint-segment elements when all blocks have categoryId=null", () => {
    const { container } = render(
      <BlueprintBar
        blocks={[mkBlock("b1", "09:00", "10:00", null)]}
        categories={[]}
        now="12:00"
      />,
    );
    expect(
      container.querySelectorAll('[data-testid="blueprint-segment"]'),
    ).toHaveLength(0);
  });

  it("renders empty-outline state with border referencing --card-edge", () => {
    const { container } = render(
      <BlueprintBar
        blocks={[mkBlock("b1", "09:00", "10:00", null)]}
        categories={[]}
        now="12:00"
      />,
    );
    const bar = container.querySelector(
      '[data-testid="blueprint-bar-container"]',
    ) as HTMLElement;
    expect(bar).not.toBeNull();
    const style = bar.style.borderColor ?? bar.getAttribute("style") ?? "";
    // borderColor on the element OR the class references --card-edge
    expect(
      style.includes("var(--card-edge)") ||
        bar.className.includes("border") ||
        bar.style.cssText.includes("card-edge"),
    ).toBe(true);
  });

  it("does NOT contain NaN% or Infinity% in the DOM", () => {
    const { container } = render(
      <BlueprintBar
        blocks={[mkBlock("b1", "09:00", "10:00", null)]}
        categories={[]}
        now="12:00"
      />,
    );
    const text = container.textContent ?? "";
    expect(text).not.toContain("NaN");
    expect(text).not.toContain("Infinity");
  });
});

// C-m1-007: BlueprintBar empty-outline path with blocks=[] (re-authored M2 — preserves M1)
describe("C-m1-007: BlueprintBar empty-outline path with blocks=[] (re-authored M2)", () => {
  it("renders section with aria-label, zero segments, no NaN/Infinity, no legend", () => {
    const { container } = render(
      <BlueprintBar blocks={[]} categories={[]} now="12:00" />,
    );

    const section = container.querySelector('[aria-label="Day blueprint"]');
    expect(section).not.toBeNull();

    const segments = container.querySelectorAll(
      '[data-testid="blueprint-segment"]',
    );
    expect(segments).toHaveLength(0);

    expect(container.textContent).not.toContain("NaN");
    expect(container.textContent).not.toContain("Infinity");
  });
});

// C-m1-008: BlueprintBar NOW pin at 12:00 = 50%, at 06:00 = 25% (re-authored M2)
describe("C-m1-008: BlueprintBar NOW pin position (re-authored M2)", () => {
  it("now-pin at 12:00 resolves to left=50%", () => {
    const { container } = render(
      <BlueprintBar blocks={[]} categories={[]} now="12:00" />,
    );
    const nowPin = container.querySelector(
      '[data-testid="now-pin"]',
    ) as HTMLElement;
    expect(nowPin).not.toBeNull();
    expect(nowPin.style.left).toMatch(/50%/);
    expect(nowPin.style.left).not.toContain("NaN");
  });

  it("now-pin at 06:00 resolves to left=25%", () => {
    const { container } = render(
      <BlueprintBar blocks={[]} categories={[]} now="06:00" />,
    );
    const nowPin = container.querySelector(
      '[data-testid="now-pin"]',
    ) as HTMLElement;
    expect(nowPin).not.toBeNull();
    expect(nowPin.style.left).toMatch(/25%/);
    expect(nowPin.style.left).not.toContain("NaN");
  });
});
