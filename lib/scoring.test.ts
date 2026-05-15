import { describe, it, expect } from "vitest";
import { dayPct, buildingPct, blockPct } from "./scoring";
import type { AppState, Block, Brick } from "./types";

// Helpers for M3 Brick schema (M4e: hasDuration: false added per migration table)
function makeTick(done: boolean): Brick {
  return {
    id: "t",
    name: "x",
    kind: "tick",
    done,
    categoryId: null,
    parentBlockId: null,
    hasDuration: false,
  };
}

function makeUnits(done: number, target: number): Brick {
  return {
    id: "g",
    name: "x",
    kind: "units",
    done,
    target,
    unit: "",
    categoryId: null,
    parentBlockId: null,
    hasDuration: false,
  };
}

// Minimal M2-compatible Block factory for scoring tests
function makeBlock(
  overrides: Partial<Block> & Pick<Block, "start" | "name" | "bricks">,
): Block {
  return {
    id: "test-id",
    recurrence: { kind: "just-today", date: "2026-05-06" },
    categoryId: null,
    ...overrides,
  };
}

function toState(blocks: Block[]): AppState {
  return { blocks, categories: [], looseBricks: [] };
}

// U-bld-010: Two blocks of unequal duration with percentages 50 and 100
// → equal-weighted average = 75 (NOT duration-weighted)
describe("U-bld-010: dayPct uses equal-weighted averaging", () => {
  it("returns 75 for two blocks with pcts [50, 100] regardless of duration", () => {
    const blocks: Block[] = [
      makeBlock({
        start: "04:00",
        end: "05:00", // 60 min
        name: "Short block",
        bricks: [makeTick(false)], // 0%
      }),
      makeBlock({
        start: "05:00",
        end: "09:00", // 240 min — 4x longer
        name: "Long block",
        bricks: [makeTick(true)], // 100%
      }),
    ];
    // Force block pcts to 0 and 100 respectively
    expect(blockPct(blocks[0])).toBe(0);
    expect(blockPct(blocks[1])).toBe(100);
    // Equal-weighted: (0 + 100) / 2 = 50
    expect(dayPct(toState(blocks))).toBe(50);

    const blocks2: Block[] = [
      makeBlock({
        start: "04:00",
        end: "05:00", // 60 min
        name: "Half block",
        bricks: [makeTick(true), makeTick(false)], // 50%
      }),
      makeBlock({
        start: "05:00",
        end: "09:00", // 240 min — 4x longer
        name: "Full block",
        bricks: [makeTick(true)], // 100%
      }),
    ];
    expect(blockPct(blocks2[0])).toBe(50);
    expect(blockPct(blocks2[1])).toBe(100);
    // Equal-weighted: (50 + 100) / 2 = 75
    expect(dayPct(toState(blocks2))).toBe(75);
  });
});

// U-bld-011: obsolete — BLOCKS constant removed from lib/data.ts per wipe-demo.
// Replaced by inline-fixture coverage below. See tests.md § Migration.
// The equal-weighted mean property is proven by U-bld-010 above.
describe("U-bld-011 (inline fixture): dayPct equals equal-weighted mean", () => {
  it("matches manual equal-weighted calculation over inline fixture", () => {
    const blocks: Block[] = [
      makeBlock({
        start: "04:00",
        end: "05:00",
        name: "A",
        bricks: [makeTick(true), makeTick(false)], // 50%
      }),
      makeBlock({
        start: "05:00",
        end: "06:00",
        name: "B",
        bricks: [makeUnits(3, 4)], // 75%
      }),
      makeBlock({
        start: "06:00",
        end: "07:00",
        name: "C",
        bricks: [makeTick(true)], // 100%
      }),
    ];
    const expected =
      blocks.reduce((s, b) => s + blockPct(b), 0) / blocks.length;
    expect(dayPct(toState(blocks))).toBeCloseTo(expected);
  });
});

// U-bld-012: dayPct(emptyState) = 0 (no division by zero)
describe("U-bld-012: dayPct(emptyState) returns 0 without division by zero", () => {
  it("returns 0 for empty state", () => {
    expect(
      dayPct({
        blocks: [],
        categories: [],
        looseBricks: [],
      }),
    ).toBe(0);
  });
});

// Verify buildingPct alias works the same way
describe("buildingPct is an alias for dayPct", () => {
  it("buildingPct(emptyState) === 0", () => {
    expect(
      buildingPct({
        blocks: [],
        categories: [],
        looseBricks: [],
      }),
    ).toBe(0);
  });

  it("buildingPct with inline fixture === dayPct with same fixture", () => {
    const blocks: Block[] = [
      makeBlock({
        start: "04:00",
        end: "05:00",
        name: "A",
        bricks: [makeTick(true)],
      }),
    ];
    const state = toState(blocks);
    expect(buildingPct(state)).toBe(dayPct(state));
  });
});
