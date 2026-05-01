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
  today,
  dayNumber,
  dateLabel,
} from "./dharma";
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

// U-bld-016, U-bld-017, U-bld-018: obsolete — BLOCKS constant removed from lib/data.ts
// Replaced by wipe-demo (see tests.md § Migration of demo-build IDs).
// These tests required import { BLOCKS } from "./data" which no longer exports BLOCKS.

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

// currentBlockIndex + nowOffsetPct + blockStatus — inline fixtures (no BLOCKS import)
const inlineBlocks: Block[] = [
  {
    start: "04:00",
    end: "08:45",
    name: "Morning",
    category: "health",
    bricks: [],
  },
  {
    start: "08:45",
    end: "17:15",
    name: "Work block",
    category: "passive",
    bricks: [],
  },
  {
    start: "17:15",
    end: "04:00",
    name: "Evening",
    category: "mind",
    bricks: [],
  },
];

it("currentBlockIndex returns correct index for inline fixture at 11:47", () => {
  expect(currentBlockIndex(inlineBlocks, "11:47")).toBe(1);
});

it("nowOffsetPct is strictly between 0 and 100 for inline fixture at 11:47", () => {
  const pct = nowOffsetPct(inlineBlocks, "11:47");
  expect(pct).toBeGreaterThan(0);
  expect(pct).toBeLessThan(100);
});

it("blockStatus returns past/current/future correctly for inline fixture", () => {
  const currentIdx = currentBlockIndex(inlineBlocks, "11:47"); // 1
  expect(blockStatus(inlineBlocks, "11:47", currentIdx - 1)).toBe("past");
  expect(blockStatus(inlineBlocks, "11:47", currentIdx)).toBe("current");
  expect(blockStatus(inlineBlocks, "11:47", currentIdx + 1)).toBe("future");
});

// U-bld-023: today(d) returns local YYYY-MM-DD string, zero-padded
it("U-bld-023: today() returns local YYYY-MM-DD, zero-padded", () => {
  expect(today(new Date("2026-04-29T11:47:00"))).toBe("2026-04-29");
  // Verify zero-padding: January 5 → "2026-01-05"
  expect(today(new Date(2026, 0, 5))).toBe("2026-01-05");
});

// U-bld-024: dayNumber computes correct day delta; returns undefined for null/empty start
it("U-bld-024: dayNumber returns correct delta and undefined for missing start", () => {
  expect(dayNumber("2026-04-01", "2026-04-29")).toBe(29);
  expect(dayNumber(null, "2026-04-29")).toBeUndefined();
  expect(dayNumber("", "2026-04-29")).toBeUndefined();
  expect(dayNumber(undefined, "2026-04-29")).toBeUndefined();
  expect(dayNumber("2026-04-29", "2026-04-29")).toBe(1);
});

// U-bld-025: dateLabel formats today ISO string as "Wed, Apr 29" style (en-US, SG-bld-11)
it("U-bld-025: dateLabel returns short weekday + month + day, en-US", () => {
  // Fixed locale en-US per SG-bld-11 approval 2026-05-01
  expect(dateLabel("2026-04-29")).toBe("Wed, Apr 29");
  // No leading zero on day: January 5 → "Mon, Jan 5"
  expect(dateLabel("2026-01-05")).toBe("Mon, Jan 5");
});
