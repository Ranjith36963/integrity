import { describe, it, expect } from "vitest";
import { brickPct, blockPct, toMin, duration, dayOffset } from "./dharma";
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
