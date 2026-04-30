import { describe, it, expect } from "vitest";
import { dayPct, buildingPct, blockPct } from "./scoring";
import type { Block } from "./types";

// U-bld-010: Two blocks of unequal duration with percentages 50 and 100
// → equal-weighted average = 75 (NOT duration-weighted)
describe("U-bld-010: dayPct uses equal-weighted averaging", () => {
  it("returns 75 for two blocks with pcts [50, 100] regardless of duration", () => {
    const blocks: Block[] = [
      {
        start: "04:00",
        end: "05:00", // 60 min
        name: "Short block",
        category: "health",
        bricks: [{ kind: "tick", name: "x", done: false }], // 0% → 0 per brick
      },
      {
        start: "05:00",
        end: "09:00", // 240 min — 4x longer
        name: "Long block",
        category: "mind",
        bricks: [{ kind: "tick", name: "y", done: true }], // 100%
      },
    ];
    // Force block pcts to 0 and 100 respectively
    expect(blockPct(blocks[0])).toBe(0);
    expect(blockPct(blocks[1])).toBe(100);
    // Equal-weighted: (0 + 100) / 2 = 50
    expect(dayPct(blocks)).toBe(50);

    const blocks2: Block[] = [
      {
        start: "04:00",
        end: "05:00", // 60 min
        name: "Half block",
        category: "health",
        bricks: [
          { kind: "tick", name: "a", done: true },
          { kind: "tick", name: "b", done: false },
        ], // 50%
      },
      {
        start: "05:00",
        end: "09:00", // 240 min — 4x longer
        name: "Full block",
        category: "mind",
        bricks: [{ kind: "tick", name: "c", done: true }], // 100%
      },
    ];
    expect(blockPct(blocks2[0])).toBe(50);
    expect(blockPct(blocks2[1])).toBe(100);
    // Equal-weighted: (50 + 100) / 2 = 75
    expect(dayPct(blocks2)).toBe(75);
  });
});

// U-bld-011: obsolete — BLOCKS constant removed from lib/data.ts per wipe-demo.
// Replaced by inline-fixture coverage below. See tests.md § Migration.
// The equal-weighted mean property is proven by U-bld-010 above.
describe("U-bld-011 (inline fixture): dayPct equals equal-weighted mean", () => {
  it("matches manual equal-weighted calculation over inline fixture", () => {
    const blocks: Block[] = [
      {
        start: "04:00",
        end: "05:00",
        name: "A",
        category: "health",
        bricks: [
          { kind: "tick", name: "x", done: true },
          { kind: "tick", name: "y", done: false },
        ], // 50%
      },
      {
        start: "05:00",
        end: "06:00",
        name: "B",
        category: "career",
        bricks: [{ kind: "goal", name: "z", current: 3, target: 4 }], // 75%
      },
      {
        start: "06:00",
        end: "07:00",
        name: "C",
        category: "mind",
        bricks: [{ kind: "tick", name: "w", done: true }], // 100%
      },
    ];
    const expected =
      blocks.reduce((s, b) => s + blockPct(b), 0) / blocks.length;
    expect(dayPct(blocks)).toBeCloseTo(expected);
  });
});

// U-bld-012: dayPct([]) = 0 (no division by zero)
describe("U-bld-012: dayPct([]) returns 0 without division by zero", () => {
  it("returns 0 for empty blocks array", () => {
    expect(dayPct([])).toBe(0);
  });
});

// Verify buildingPct alias works the same way
describe("buildingPct is an alias for dayPct", () => {
  it("buildingPct([]) === 0", () => {
    expect(buildingPct([])).toBe(0);
  });

  it("buildingPct with inline fixture === dayPct with same fixture", () => {
    const blocks: Block[] = [
      {
        start: "04:00",
        end: "05:00",
        name: "A",
        category: "health",
        bricks: [{ kind: "tick", name: "x", done: true }],
      },
    ];
    expect(buildingPct(blocks)).toBe(dayPct(blocks));
  });
});
