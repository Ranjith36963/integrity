import { describe, it, expect } from "vitest";
import {
  brickPct,
  blockPct,
  toMin,
  duration,
  dayOffset,
  currentBlockIndex,
  nowOffsetPct,
  blockStatus,
  brickLabel,
} from "./dharma";
import { BLOCKS } from "./data";
import type { Block } from "./types";

describe("dharma utilities (harness smoke test)", () => {
  it("toMin parses HH:MM into minutes since 00:00", () => {
    expect(toMin("00:00")).toBe(0);
    expect(toMin("11:47")).toBe(11 * 60 + 47);
    expect(toMin("23:59")).toBe(23 * 60 + 59);
  });

  it("dayOffset is wake-relative (04:00 anchor) and wraps midnight", () => {
    expect(dayOffset("04:00")).toBe(0);
    expect(dayOffset("11:47")).toBe(7 * 60 + 47);
    expect(dayOffset("03:59")).toBe(23 * 60 + 59);
  });

  it("duration handles midnight-wrapping blocks (sleep 22:00→04:00 = 360m)", () => {
    const sleep: Block = {
      start: "22:00",
      end: "04:00",
      name: "Sleep",
      category: "passive",
      bricks: [],
    };
    expect(duration(sleep)).toBe(360);
  });

  it("brickPct is 0 or 100 for tick, capped 0..100 for goal/time", () => {
    expect(brickPct({ kind: "tick", name: "x", done: true })).toBe(100);
    expect(brickPct({ kind: "tick", name: "x", done: false })).toBe(0);
    expect(brickPct({ kind: "goal", name: "x", current: 4, target: 5 })).toBe(
      80,
    );
    expect(
      brickPct({ kind: "time", name: "x", current: 999, target: 10 }),
    ).toBe(100);
  });

  it("blockPct averages brick percentages", () => {
    const block: Block = {
      start: "06:00",
      end: "07:00",
      name: "Fitness",
      category: "health",
      bricks: [
        { kind: "goal", name: "pushups", current: 80, target: 100 },
        { kind: "time", name: "run", current: 30, target: 30 },
        { kind: "tick", name: "stretch", done: true },
      ],
    };
    expect(blockPct(block)).toBeCloseTo((80 + 100 + 100) / 3);
  });
});

// U-bld-001: tick brick done:true → brickPct = 100
it("U-bld-001: brickPct returns 100 for done tick brick", () => {
  expect(brickPct({ kind: "tick", name: "x", done: true })).toBe(100);
});

// U-bld-002: tick brick done:false → brickPct = 0
it("U-bld-002: brickPct returns 0 for undone tick brick", () => {
  expect(brickPct({ kind: "tick", name: "x", done: false })).toBe(0);
});

// U-bld-003: goal brick current=4, target=5 → brickPct = 80
it("U-bld-003: brickPct returns 80 for goal brick 4/5", () => {
  expect(brickPct({ kind: "goal", name: "x", current: 4, target: 5 })).toBe(80);
});

// U-bld-004: goal brick current=999, target=10 → brickPct = 100 (capped)
it("U-bld-004: brickPct caps at 100 for goal brick 999/10", () => {
  expect(brickPct({ kind: "goal", name: "x", current: 999, target: 10 })).toBe(
    100,
  );
});

// U-bld-005: time brick current=15, target=30 → brickPct = 50
it("U-bld-005: brickPct returns 50 for time brick 15/30", () => {
  expect(brickPct({ kind: "time", name: "x", current: 15, target: 30 })).toBe(
    50,
  );
});

// U-bld-006: time brick current=999, target=10 → brickPct = 100 (capped)
it("U-bld-006: brickPct caps at 100 for time brick 999/10", () => {
  expect(brickPct({ kind: "time", name: "x", current: 999, target: 10 })).toBe(
    100,
  );
});

// U-bld-007: brick with target <= 0 → brickPct = 0 (no division by zero)
it("U-bld-007: brickPct returns 0 for target <= 0", () => {
  expect(brickPct({ kind: "goal", name: "x", current: 5, target: 0 })).toBe(0);
  expect(brickPct({ kind: "time", name: "x", current: 5, target: -1 })).toBe(0);
});

// U-bld-008: block with bricks [goal 80, time 100, tick 100] → blockPct ≈ 93.33
it("U-bld-008: blockPct averages [80, 100, 100] to ~93.33", () => {
  const block: Block = {
    start: "06:00",
    end: "07:00",
    name: "Fitness",
    category: "health",
    bricks: [
      { kind: "goal", name: "pushups", current: 80, target: 100 },
      { kind: "time", name: "run", current: 30, target: 30 },
      { kind: "tick", name: "stretch", done: true },
    ],
  };
  expect(blockPct(block)).toBeCloseTo((80 + 100 + 100) / 3);
});

// U-bld-009: block with bricks:[] → blockPct = 0
it("U-bld-009: blockPct returns 0 for empty bricks array", () => {
  const block: Block = {
    start: "06:00",
    end: "07:00",
    name: "Empty",
    category: "health",
    bricks: [],
  };
  expect(blockPct(block)).toBe(0);
});

// U-bld-013: toMin("11:47") = 707
it("U-bld-013: toMin returns 707 for 11:47", () => {
  expect(toMin("11:47")).toBe(707);
});

// U-bld-014: duration of sleep block 22:00→04:00 = 360
it("U-bld-014: duration handles midnight wrap (22:00→04:00 = 360)", () => {
  const sleep: Block = {
    start: "22:00",
    end: "04:00",
    name: "Sleep",
    category: "passive",
    bricks: [],
  };
  expect(duration(sleep)).toBe(360);
});

// U-bld-015: dayOffset("03:59") = 1439 (last minute before next anchor)
it("U-bld-015: dayOffset returns 1439 for 03:59", () => {
  expect(dayOffset("03:59")).toBe(1439);
});

// U-bld-016: currentBlockIndex(BLOCKS, "11:47") = 9 (Work block)
it("U-bld-016: currentBlockIndex returns 9 for 11:47 (Work block)", () => {
  expect(currentBlockIndex(BLOCKS, "11:47")).toBe(9);
});

// U-bld-017: nowOffsetPct is strictly between 0 and 100 for 11:47
it("U-bld-017: nowOffsetPct for 11:47 is strictly between 0 and 100", () => {
  const pct = nowOffsetPct(BLOCKS, "11:47");
  expect(pct).toBeGreaterThan(0);
  expect(pct).toBeLessThan(100);
});

// U-bld-018: blockStatus returns past/current/future correctly
it("U-bld-018: blockStatus returns past/current/future correctly", () => {
  const currentIdx = currentBlockIndex(BLOCKS, "11:47"); // 9
  expect(blockStatus(BLOCKS, "11:47", currentIdx - 1)).toBe("past");
  expect(blockStatus(BLOCKS, "11:47", currentIdx)).toBe("current");
  expect(blockStatus(BLOCKS, "11:47", currentIdx + 1)).toBe("future");
});

// U-bld-019: brickLabel for tick bricks
it("U-bld-019: brickLabel returns done/— for tick bricks", () => {
  expect(brickLabel({ kind: "tick", name: "x", done: true })).toBe("done");
  expect(brickLabel({ kind: "tick", name: "x", done: false })).toBe("—");
});

// U-bld-020: brickLabel for goal brick with unit
it("U-bld-020: brickLabel returns correct string for goal brick with unit", () => {
  expect(
    brickLabel({
      kind: "goal",
      name: "pushups",
      current: 4,
      target: 5,
      unit: "reps",
    }),
  ).toBe("4/5 reps");
});

// U-bld-021: brickLabel for time brick
it("U-bld-021: brickLabel returns correct string for time brick", () => {
  expect(
    brickLabel({ kind: "time", name: "meditate", current: 30, target: 45 }),
  ).toBe("30/45 min");
});
