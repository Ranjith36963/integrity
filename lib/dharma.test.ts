import { describe, it, expect } from "vitest";
import {
  brickPct,
  blockPct,
  dayPct,
  categoryDayPct,
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
import type { AppState, Block, Brick } from "./types";

// M4f: makeGoal and makeTime helpers replaced by makeUnits (count→done, kind:"goal"/"time"→"units")

// Helper to create a full M3-schema brick (M4e: hasDuration: false added per migration table)
function makeTick(
  overrides: Partial<Brick> & { done: boolean },
): Brick & { kind: "tick" } {
  return {
    id: "test-brick",
    name: "brick",
    kind: "tick",
    done: overrides.done,
    categoryId: overrides.categoryId ?? null,
    parentBlockId: overrides.parentBlockId ?? null,
    hasDuration: false,
    ...("id" in overrides ? { id: overrides.id as string } : {}),
    ...("name" in overrides ? { name: overrides.name as string } : {}),
  } as Brick & { kind: "tick" };
}

// M4f: makeUnits replaces makeGoal and makeTime (kind:"units", done instead of count/minutesDone, target instead of durationMin)
function makeUnits(
  overrides: { target: number; done: number; unit?: string } & Partial<Brick>,
): Extract<Brick, { kind: "units" }> {
  return {
    id: "test-brick",
    name: "brick",
    kind: "units",
    target: overrides.target,
    done: overrides.done,
    unit: overrides.unit ?? "",
    categoryId: overrides.categoryId ?? null,
    parentBlockId: overrides.parentBlockId ?? null,
    hasDuration: false,
    ...("id" in overrides ? { id: overrides.id as string } : {}),
    ...("name" in overrides ? { name: overrides.name as string } : {}),
  } as Extract<Brick, { kind: "units" }>;
}

// Minimal M2-compatible Block factory for tests that only care about bricks/start/end
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

// Empty state helper (M4f: no runningTimerBrickId)
function emptyState(): AppState {
  return {
    blocks: [],
    categories: [],
    looseBricks: [],
  };
}

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
    const sleep = makeBlock({
      start: "22:00",
      end: "04:00",
      name: "Sleep",
      bricks: [],
    });
    expect(duration(sleep)).toBe(360);
  });

  it("brickPct is 0 or 100 for tick, capped 0..100 for units", () => {
    expect(brickPct(makeTick({ done: true }))).toBe(100);
    expect(brickPct(makeTick({ done: false }))).toBe(0);
    expect(brickPct(makeUnits({ done: 4, target: 5 }))).toBe(80);
    expect(brickPct(makeUnits({ done: 999, target: 10 }))).toBe(100);
  });

  it("blockPct averages brick percentages", () => {
    const block = makeBlock({
      start: "06:00",
      end: "07:00",
      name: "Fitness",
      bricks: [
        makeUnits({ done: 80, target: 100 }),
        makeUnits({ done: 30, target: 30, unit: "minutes" }),
        makeTick({ done: true }),
      ],
    });
    expect(blockPct(block)).toBeCloseTo((80 + 100 + 100) / 3);
  });
});

// U-bld-001: tick brick done:true → brickPct = 100
it("U-bld-001: brickPct returns 100 for done tick brick", () => {
  expect(brickPct(makeTick({ done: true }))).toBe(100);
});

// U-bld-002: tick brick done:false → brickPct = 0
it("U-bld-002: brickPct returns 0 for undone tick brick", () => {
  expect(brickPct(makeTick({ done: false }))).toBe(0);
});

// U-bld-003: units brick done=4, target=5 → brickPct = 80 (migrated from goal)
it("U-bld-003: brickPct returns 80 for units brick 4/5", () => {
  expect(brickPct(makeUnits({ done: 4, target: 5 }))).toBe(80);
});

// U-bld-004: units brick done=999, target=10 → brickPct = 100 (capped) (migrated from goal)
it("U-bld-004: brickPct caps at 100 for units brick 999/10", () => {
  expect(brickPct(makeUnits({ done: 999, target: 10 }))).toBe(100);
});

// U-bld-005: units brick done=15, target=30 → brickPct = 50 (migrated from time minutesDone/durationMin)
it("U-bld-005: brickPct returns 50 for units brick 15/30", () => {
  expect(brickPct(makeUnits({ done: 15, target: 30, unit: "minutes" }))).toBe(
    50,
  );
});

// U-bld-006: units brick done=999, target=10 → brickPct = 100 (capped) (migrated from time)
it("U-bld-006: brickPct caps at 100 for units brick 999/10 (minutes)", () => {
  expect(brickPct(makeUnits({ done: 999, target: 10, unit: "minutes" }))).toBe(
    100,
  );
});

// U-bld-007: brick with target <= 0 → brickPct = 0 (no division by zero)
it("U-bld-007: brickPct returns 0 for target <= 0", () => {
  expect(brickPct(makeUnits({ done: 5, target: 0 }))).toBe(0);
  expect(brickPct(makeUnits({ done: 5, target: -1 }))).toBe(0);
});

// U-bld-008: block with bricks [units 80, units 100(minutes), tick 100] → blockPct ≈ 93.33
it("U-bld-008: blockPct averages [80, 100, 100] to ~93.33", () => {
  const block = makeBlock({
    start: "06:00",
    end: "07:00",
    name: "Fitness",
    bricks: [
      makeUnits({ done: 80, target: 100 }),
      makeUnits({ done: 30, target: 30, unit: "minutes" }),
      makeTick({ done: true }),
    ],
  });
  expect(blockPct(block)).toBeCloseTo((80 + 100 + 100) / 3);
});

// U-bld-009: block with bricks:[] → blockPct = 0
it("U-bld-009: blockPct returns 0 for empty bricks array", () => {
  const block = makeBlock({
    start: "06:00",
    end: "07:00",
    name: "Empty",
    bricks: [],
  });
  expect(blockPct(block)).toBe(0);
});

// U-bld-013: toMin("11:47") = 707
it("U-bld-013: toMin returns 707 for 11:47", () => {
  expect(toMin("11:47")).toBe(707);
});

// U-bld-014: duration of sleep block 22:00→04:00 = 360
it("U-bld-014: duration handles midnight wrap (22:00→04:00 = 360)", () => {
  const sleep = makeBlock({
    start: "22:00",
    end: "04:00",
    name: "Sleep",
    bricks: [],
  });
  expect(duration(sleep)).toBe(360);
});

// U-bld-015: dayOffset("03:59") = 1439 (last minute before next anchor)
it("U-bld-015: dayOffset returns 1439 for 03:59", () => {
  expect(dayOffset("03:59")).toBe(1439);
});

// U-bld-016, U-bld-017, U-bld-018: obsolete — BLOCKS constant removed from lib/data.ts
// Replaced by wipe-demo (see tests.md § Migration of demo-build IDs).
// These tests required import { BLOCKS } from "./data" which no longer exports BLOCKS.

// U-bld-019: brickLabel for tick bricks (M3: still works with new schema)
it("U-bld-019: brickLabel returns done/— for tick bricks", () => {
  expect(brickLabel(makeTick({ done: true }))).toBe("done");
  expect(brickLabel(makeTick({ done: false }))).toBe("—");
});

// U-bld-020: brickLabel for units brick with unit (M4f: migrated from goal; format: done/target unit)
it("U-bld-020: brickLabel returns correct string for units brick with unit", () => {
  expect(brickLabel(makeUnits({ done: 4, target: 5, unit: "reps" }))).toBe(
    "4/5 reps",
  );
});

// U-bld-021: brickLabel for units brick with unit:"minutes" (M4f: migrated from time)
it("U-bld-021: brickLabel returns correct string for units brick with minutes unit", () => {
  expect(brickLabel(makeUnits({ done: 30, target: 45, unit: "minutes" }))).toBe(
    "30/45 minutes",
  );
});

// currentBlockIndex + nowOffsetPct + blockStatus — inline fixtures (no BLOCKS import)
const inlineBlocks: Block[] = [
  makeBlock({ start: "04:00", end: "08:45", name: "Morning", bricks: [] }),
  makeBlock({ start: "08:45", end: "17:15", name: "Work block", bricks: [] }),
  makeBlock({ start: "17:15", end: "04:00", name: "Evening", bricks: [] }),
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

// ─── U-m3-001: brickPct for tick kind ─────────────────────────────────────────

it("U-m3-001: brickPct tick: done:false → 0, done:true → 100", () => {
  expect(brickPct(makeTick({ done: false }))).toBe(0);
  expect(brickPct(makeTick({ done: true }))).toBe(100);
});

// ─── U-m3-002: brickPct for units kind (M4f: migrated from goal) ──────────────

it("U-m3-002: brickPct units: 50%, 100%, capped, 0, zero-target guard", () => {
  expect(brickPct(makeUnits({ done: 50, target: 100 }))).toBe(50);
  expect(brickPct(makeUnits({ done: 100, target: 100 }))).toBe(100);
  expect(brickPct(makeUnits({ done: 200, target: 100 }))).toBe(100); // capped
  expect(brickPct(makeUnits({ done: 0, target: 100 }))).toBe(0);
  expect(brickPct(makeUnits({ done: 5, target: 0 }))).toBe(0); // zero-target guard
});

// ─── U-m3-003: brickPct for units with unit:"minutes" (M4f: migrated from time) ─

it("U-m3-003: brickPct units(minutes): 50%, capped, 0, zero-target guard", () => {
  expect(brickPct(makeUnits({ done: 15, target: 30, unit: "minutes" }))).toBe(
    50,
  );
  expect(brickPct(makeUnits({ done: 60, target: 30, unit: "minutes" }))).toBe(
    100,
  ); // capped
  expect(brickPct(makeUnits({ done: 0, target: 30, unit: "minutes" }))).toBe(0);
  expect(brickPct(makeUnits({ done: 5, target: 0, unit: "minutes" }))).toBe(0); // zero-target guard
});

// ─── U-m3-004: blockPct empty-bricks floor = 0 ────────────────────────────────

it("U-m3-004: blockPct returns 0 for block with bricks: []", () => {
  const block = makeBlock({ start: "09:00", name: "block one", bricks: [] });
  expect(blockPct(block)).toBe(0);
});

// ─── U-m3-005: blockPct non-empty mean ────────────────────────────────────────

it("U-m3-005: blockPct non-empty: (100+0)/2=50; (80+50)/2=65", () => {
  const block1 = makeBlock({
    start: "09:00",
    name: "block one",
    bricks: [makeTick({ done: true }), makeTick({ done: false })],
  });
  expect(blockPct(block1)).toBe(50);

  const block2 = makeBlock({
    start: "09:00",
    name: "block two",
    bricks: [
      makeUnits({ done: 80, target: 100 }),
      makeUnits({ done: 15, target: 30, unit: "minutes" }),
    ],
  });
  expect(blockPct(block2)).toBe(65);
});

// ─── U-m3-006: dayPct(state) empty-state floor ─────────────────────────────────

it("U-m3-006: dayPct(state) returns 0 for empty state", () => {
  expect(dayPct(emptyState())).toBe(0);
});

// ─── U-m3-007: dayPct(state) averages over (blocks + looseBricks) ─────────────

it("U-m3-007: dayPct(state) averages blocks+looseBricks correctly", () => {
  // One block at blockPct=100, zero loose bricks → 100
  const block100 = makeBlock({
    start: "09:00",
    name: "b1",
    bricks: [makeTick({ done: true })],
  });
  expect(
    dayPct({
      blocks: [block100],
      categories: [],
      looseBricks: [],
    }),
  ).toBe(100);

  // One block at 100, one loose brick at 0 → 50
  const looseBrick0 = makeTick({ done: false });
  expect(
    dayPct({
      blocks: [block100],
      categories: [],
      looseBricks: [looseBrick0],
    }),
  ).toBe(50);

  // Two blocks at 100, one loose brick at 50 → (100+100+50)/3 ≈ 83.33
  const block100b = makeBlock({
    start: "10:00",
    name: "b2",
    bricks: [makeTick({ done: true })],
  });
  const looseBrick50 = makeUnits({ done: 50, target: 100 });
  expect(
    dayPct({
      blocks: [block100, block100b],
      categories: [],
      looseBricks: [looseBrick50],
    }),
  ).toBeCloseTo((100 + 100 + 50) / 3, 2);

  // Zero blocks, one loose brick at 40 → 40
  const looseBrick40 = makeUnits({ done: 40, target: 100 });
  expect(
    dayPct({
      blocks: [],
      categories: [],
      looseBricks: [looseBrick40],
    }),
  ).toBe(40);
});

// ─── U-m3-008: categoryDayPct filtering ───────────────────────────────────────

it("U-m3-008: categoryDayPct filters by category; null excluded; non-existent → 0", () => {
  // Block categoryId='c1' containing:
  //   - c2 brick (done:true) → 100%
  //   - c1 brick (done:true) → 100%
  // Loose bricks:
  //   - c1 units (50%)
  //   - null tick (done:true) → excluded from category queries
  const c1Block = makeBlock({
    id: "block1",
    start: "09:00",
    name: "block one",
    categoryId: "c1",
    bricks: [
      makeTick({ done: true, categoryId: "c2", parentBlockId: "block1" }),
      makeTick({ done: true, categoryId: "c1", parentBlockId: "block1" }),
    ],
  });

  const looseC1 = makeUnits({
    done: 5,
    target: 10,
    categoryId: "c1",
    parentBlockId: null,
  });
  const looseNull = makeTick({
    done: true,
    categoryId: null,
    parentBlockId: null,
  });

  const state: AppState = {
    blocks: [c1Block],
    categories: [],
    looseBricks: [looseC1, looseNull],
  };

  // c1: block (categoryId=c1 → blockPct=50%), c1 brick inside block (100%), loose c1 brick (50%)
  // blockPct(c1Block) = (100 + 100)/2 = 100 (mean of all bricks in block)
  // But categoryDayPct for c1:
  //   - block.categoryId === 'c1' → contributes blockPct(block) = 100
  //   - c1 brick inside block → contributes brickPct = 100
  //   - loose c1 brick → contributes brickPct = 50
  //   avg = (100 + 100 + 50) / 3 ≈ 83.33
  expect(categoryDayPct(state, "c1")).toBeCloseTo((100 + 100 + 50) / 3, 2);

  // c2: c2 brick inside block (done:true → 100%)
  //   avg = 100 / 1 = 100
  expect(categoryDayPct(state, "c2")).toBe(100);

  // non-existent → 0
  expect(categoryDayPct(state, "c-nonexistent")).toBe(0);

  // null loose brick is excluded from category queries (but counted in dayPct)
  // (implicitly tested by c1 not including it)
});

// ─── U-m4f-014: brickPct for tick and units (M4f: 2-arm collapse) ─────────────

describe("U-m4f-014: brickPct post-M4f collapse (tick + units only)", () => {
  it("tick done:true → 100; tick done:false → 0", () => {
    expect(brickPct(makeTick({ done: true }))).toBe(100);
    expect(brickPct(makeTick({ done: false }))).toBe(0);
  });

  it("units done=20, target=30 → 66.67%", () => {
    expect(brickPct(makeUnits({ done: 20, target: 30 }))).toBeCloseTo(
      (20 / 30) * 100,
    );
  });

  it("units done=45, target=30 → 100 (overachievement capped)", () => {
    expect(brickPct(makeUnits({ done: 45, target: 30 }))).toBe(100);
  });

  it("units done=5, target=0 → 0 (zero-target guard, no divide-by-zero)", () => {
    expect(brickPct(makeUnits({ done: 5, target: 0 }))).toBe(0);
  });
});

// ─── U-m4f-015: brickLabel post-M4f collapse ──────────────────────────────────

describe("U-m4f-015: brickLabel post-M4f collapse (tick + units only)", () => {
  it("tick done:true → 'done'; tick done:false → '—'", () => {
    expect(brickLabel(makeTick({ done: true }))).toBe("done");
    expect(brickLabel(makeTick({ done: false }))).toBe("—");
  });

  it("units done=20, target=30, unit='minutes' → '20/30 minutes'", () => {
    expect(
      brickLabel(makeUnits({ done: 20, target: 30, unit: "minutes" })),
    ).toBe("20/30 minutes");
  });

  it("units done=50, target=100, unit='reps' → '50/100 reps'", () => {
    expect(brickLabel(makeUnits({ done: 50, target: 100, unit: "reps" }))).toBe(
      "50/100 reps",
    );
  });

  it("dayPct with one tick + one units brick regression anchor (R3 no ratio drift)", () => {
    const block = makeBlock({
      start: "09:00",
      name: "Morning",
      bricks: [
        makeTick({ done: true }), // 100%
        makeUnits({ done: 15, target: 30, unit: "minutes" }), // 50%
      ],
    });
    // blockPct = (100+50)/2 = 75
    expect(blockPct(block)).toBeCloseTo(75);
    // dayPct with just this block
    const state: AppState = {
      blocks: [block],
      categories: [],
      looseBricks: [],
    };
    expect(dayPct(state)).toBeCloseTo(75);
  });
});
