import { describe, it, expect } from "vitest";
import { dayPct, buildingPct, blockPct } from "./scoring";
import { BLOCKS } from "./data";
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

// U-bld-011: BLOCKS from lib/data.ts → dayPct equals equal-weighted mean of blockPct
describe("U-bld-011: dayPct(BLOCKS) equals equal-weighted mean of blockPct", () => {
  it("matches manual equal-weighted calculation over BLOCKS", () => {
    const expected =
      BLOCKS.reduce((s, b) => s + blockPct(b), 0) / BLOCKS.length;
    expect(dayPct(BLOCKS)).toBeCloseTo(expected);
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

  it("buildingPct(BLOCKS) === dayPct(BLOCKS)", () => {
    expect(buildingPct(BLOCKS)).toBe(dayPct(BLOCKS));
  });
});
