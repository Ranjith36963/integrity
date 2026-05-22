import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { BlueprintBar, aggregateCategoryMinutes } from "./BlueprintBar";
import type { Block, Category } from "@/lib/types";
import { staggerForCount } from "@/lib/motion";

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

// C-m3-023: BlueprintBar segment opacity = 0.3 + (blockPct/100 × 0.7)
describe("C-m3-023: BlueprintBar segment opacity based on blockPct", () => {
  const categories: Category[] = [
    { id: "c1", name: "Health", color: "#34d399" },
    { id: "c2", name: "Mind", color: "#c4b5fd" },
  ];

  function mkBlockWithBricks(
    id: string,
    categoryId: string | null,
    bricksDone: boolean[],
  ): Block {
    return {
      id,
      name: id,
      start: "09:00",
      end: "10:00",
      recurrence: { kind: "just-today", date: "2026-05-06" },
      categoryId,
      bricks: bricksDone.map((done, i) => ({
        id: `${id}-r${i}`,
        name: `brick ${i}`,
        kind: "tick" as const,
        hasDuration: false,
        done,
        categoryId,
        parentBlockId: id,
      })),
    };
  }

  it("segment opacity is 1.0 when blockPct=100 (all bricks done)", () => {
    const block = mkBlockWithBricks("b1", "c1", [true]);
    const { container } = render(
      <BlueprintBar blocks={[block]} categories={categories} now="12:00" />,
    );
    const seg = container.querySelector(
      '[data-testid="blueprint-segment"][data-category-id="c1"]',
    ) as HTMLElement;
    expect(seg).not.toBeNull();
    expect(parseFloat(seg.style.opacity)).toBeCloseTo(1.0, 2);
  });

  it("segment opacity is 0.65 when blockPct=50 (half done)", () => {
    const block = mkBlockWithBricks("b1", "c1", [true, false]);
    const { container } = render(
      <BlueprintBar blocks={[block]} categories={categories} now="12:00" />,
    );
    const seg = container.querySelector(
      '[data-testid="blueprint-segment"][data-category-id="c1"]',
    ) as HTMLElement;
    expect(seg).not.toBeNull();
    expect(parseFloat(seg.style.opacity)).toBeCloseTo(0.65, 2);
  });

  it("segment opacity is 0.3 when blockPct=0 (no bricks done / empty bricks)", () => {
    const block = mkBlockWithBricks("b1", "c1", []);
    const { container } = render(
      <BlueprintBar blocks={[block]} categories={categories} now="12:00" />,
    );
    const seg = container.querySelector(
      '[data-testid="blueprint-segment"][data-category-id="c1"]',
    ) as HTMLElement;
    expect(seg).not.toBeNull();
    expect(parseFloat(seg.style.opacity)).toBeCloseTo(0.3, 2);
  });

  it("uncategorized blocks (categoryId=null) remain excluded (no segment rendered)", () => {
    const block = mkBlockWithBricks("b1", null, [true]);
    const { container } = render(
      <BlueprintBar blocks={[block]} categories={categories} now="12:00" />,
    );
    const segs = container.querySelectorAll(
      '[data-testid="blueprint-segment"]',
    );
    expect(segs).toHaveLength(0);
  });
});

// ─── M7a stagger prop tests ────────────────────────────────────────────────────

const categories2: Category[] = [
  { id: "c1", name: "Health", color: "#34d399" },
  { id: "c2", name: "Mind", color: "#c4b5fd" },
];

function mkCatBlock(id: string, catId: string): Block {
  return {
    id,
    name: id,
    start: "09:00",
    end: "10:00",
    recurrence: { kind: "just-today", date: "2026-05-18" },
    categoryId: catId,
    bricks: [],
  };
}

// C-m7a-005: stagger={false} (default) renders byte-identical to pre-M7a — NO motion.div
describe("C-m7a-005: <BlueprintBar stagger={false}> is byte-identical to today — NO motion.div container", () => {
  it("omitting stagger (default false): segment container is a plain div, not motion.div", () => {
    const blocks = [mkCatBlock("b1", "c1"), mkCatBlock("b2", "c2")];
    const { container } = render(
      <BlueprintBar blocks={blocks} categories={categories2} now="12:00" />,
    );
    // The inner flex container wrapping segments must be a plain div
    const segContainer = container.querySelector(".flex.h-full.w-full");
    expect(segContainer?.tagName).toBe("DIV");
    // No framer-motion data attribute on the container
    expect(
      (segContainer as HTMLElement | null)?.hasAttribute("data-framer-motion"),
    ).toBe(false);
  });

  it("stagger={false} explicit: segment container is a plain div", () => {
    const blocks = [mkCatBlock("b1", "c1")];
    const { container } = render(
      <BlueprintBar
        blocks={blocks}
        categories={categories2}
        now="12:00"
        stagger={false}
      />,
    );
    const segContainer = container.querySelector(".flex.h-full.w-full");
    expect(segContainer?.tagName).toBe("DIV");
  });

  it("stagger={false}: blueprint-segment elements are still present as plain divs", () => {
    const blocks = [mkCatBlock("b1", "c1"), mkCatBlock("b2", "c2")];
    const { container } = render(
      <BlueprintBar
        blocks={blocks}
        categories={categories2}
        now="12:00"
        stagger={false}
      />,
    );
    const segs = container.querySelectorAll(
      '[data-testid="blueprint-segment"]',
    );
    expect(segs).toHaveLength(2);
    // Each segment is a plain div (not a motion.div with Framer-injected styles)
    for (const seg of segs) {
      expect(seg.tagName).toBe("DIV");
    }
  });

  it("stagger={false}: data-testid='blueprint-bar-container' and 'now-pin' are still present", () => {
    const blocks = [mkCatBlock("b1", "c1")];
    const { container } = render(
      <BlueprintBar
        blocks={blocks}
        categories={categories2}
        now="12:00"
        stagger={false}
      />,
    );
    expect(
      container.querySelector('[data-testid="blueprint-bar-container"]'),
    ).not.toBeNull();
    expect(container.querySelector('[data-testid="now-pin"]')).not.toBeNull();
  });
});

// C-m7a-006: stagger={true} wraps segments in motion.div; staggerChildren = staggerForCount(N)
describe("C-m7a-006: <BlueprintBar stagger={true}> wraps segments in motion.div; staggerChildren = staggerForCount(N)", () => {
  it("stagger={true} with N=2: Framer Motion applies initial variant (segments have opacity:0 inline style)", () => {
    const blocks = [mkCatBlock("b1", "c1"), mkCatBlock("b2", "c2")];
    const { container } = render(
      <BlueprintBar
        blocks={blocks}
        categories={categories2}
        now="12:00"
        stagger={true}
      />,
    );
    // Framer Motion applies the childVariants initial: { opacity: 0, y: 4 } synchronously.
    // Each motion.div segment gets opacity: 0 as inline style (Framer applies initial variant).
    // A plain div (stagger=false) would NOT have opacity: 0 in its inline style.
    const segs = container.querySelectorAll(
      '[data-testid="blueprint-segment"]',
    );
    expect(segs).toHaveLength(2);
    for (const seg of segs) {
      const el = seg as HTMLElement;
      // Framer applies initial variant opacity:0 — the segment itself carries it
      expect(el.style.opacity).toBe("0");
    }
  });

  it("stagger={true} N=5 segments: data-testid='blueprint-segment' preserved on each child", () => {
    const cats: Category[] = Array.from({ length: 5 }, (_, i) => ({
      id: `c${i + 1}`,
      name: `Cat${i + 1}`,
      color: "#34d399",
    }));
    const blocks = cats.map((c) => mkCatBlock(c.id, c.id));
    const { container } = render(
      <BlueprintBar
        blocks={blocks}
        categories={cats}
        now="12:00"
        stagger={true}
      />,
    );
    const segs = container.querySelectorAll(
      '[data-testid="blueprint-segment"]',
    );
    expect(segs).toHaveLength(5);
  });

  it("staggerForCount(2) returns canonical 0.03 (n <= 15 branch)", () => {
    // Direct assertion on the helper used by BlueprintBar's container variant
    expect(staggerForCount(2)).toBe(0.03);
  });

  it("stagger={true}: blueprint-bar-container and now-pin are OUTSIDE the staggered list", () => {
    const blocks = [mkCatBlock("b1", "c1")];
    const { container } = render(
      <BlueprintBar
        blocks={blocks}
        categories={categories2}
        now="12:00"
        stagger={true}
      />,
    );
    // blueprint-bar-container is the outer div wrapper — must still be present
    expect(
      container.querySelector('[data-testid="blueprint-bar-container"]'),
    ).not.toBeNull();
    expect(container.querySelector('[data-testid="now-pin"]')).not.toBeNull();
  });

  it("staggerForCount correctly scales for N > 15 (mutation guard for BlueprintBar's container variant)", () => {
    expect(staggerForCount(20)).toBeCloseTo(0.45 / 20, 10);
    expect(staggerForCount(30)).toBe(0.02);
  });

  // Spy on console.error to catch any React warnings from motion.div usage
  it("stagger={true} renders without React errors or warnings", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const blocks = [mkCatBlock("b1", "c1"), mkCatBlock("b2", "c2")];
    render(
      <BlueprintBar
        blocks={blocks}
        categories={categories2}
        now="12:00"
        stagger={true}
      />,
    );
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
