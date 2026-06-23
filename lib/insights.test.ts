/**
 * lib/insights.test.ts — coverage for calendar-strip KPIs.
 * Each function is pure; tests use minimal AppState fixtures.
 */
import { describe, it, expect } from "vitest";
import type { AppState, ArchivedDay } from "./types";
import {
  longestStreak,
  avgDailyScore,
  daysCompleted,
  busiestHour,
} from "./insights";

function makeState(history: Record<string, ArchivedDay>): AppState {
  return {
    blocks: [],
    categories: [],
    looseBricks: [],
    programStart: "2026-01-01",
    currentDate: "2026-06-22",
    history,
    deletions: {},
  };
}

// dayScore() computes dayPct over an ArchivedDay's blocks + looseBricks.
// To synthesize an entry that scores exactly X%, place X done ticks and
// (100 - X) undone ticks among 100 loose bricks. Granularity is integer %.
function archived(score: number): ArchivedDay {
  const TOTAL = 100;
  const done = Math.max(0, Math.min(TOTAL, score));
  const looseBricks = Array.from({ length: TOTAL }, (_, i) => ({
    id: `b${i}`,
    name: "x",
    categoryId: null,
    parentBlockId: null,
    hasDuration: false,
    kind: "tick" as const,
    done: i < done,
  }));
  return {
    schemaVersion: 3,
    isoDate: "1970-01-01",
    blocks: [],
    categories: [],
    looseBricks,
    deletions: {},
  } as unknown as ArchivedDay;
}

describe("insights — longestStreak", () => {
  it("returns 0 when no days have score > 0", () => {
    const state = makeState({});
    expect(longestStreak(state, "2026-06-15", "2026-06-21")).toBe(0);
  });

  it("counts consecutive scored days within range", () => {
    const state = makeState({
      "2026-06-15": archived(40),
      "2026-06-16": archived(80),
      "2026-06-17": archived(50),
      "2026-06-19": archived(30), // gap on 6-18
    });
    expect(longestStreak(state, "2026-06-15", "2026-06-21")).toBe(3);
  });

  it("treats score === 0 as a streak break", () => {
    const state = makeState({
      "2026-06-15": archived(40),
      "2026-06-16": archived(0),
      "2026-06-17": archived(50),
    });
    expect(longestStreak(state, "2026-06-15", "2026-06-17")).toBe(1);
  });
});

describe("insights — avgDailyScore", () => {
  it("returns null with no scored days", () => {
    const state = makeState({});
    expect(avgDailyScore(state, "2026-06-15", "2026-06-21")).toBeNull();
  });

  it("rounds the mean", () => {
    const state = makeState({
      "2026-06-15": archived(50),
      "2026-06-16": archived(75),
      "2026-06-17": archived(100),
    });
    // (50+75+100)/3 = 75
    expect(avgDailyScore(state, "2026-06-15", "2026-06-17")).toBe(75);
  });

  it("skips null-score days (future / pre-start)", () => {
    const state = makeState({
      "2026-06-15": archived(50),
      "2026-06-17": archived(100),
    });
    // Only 2 scored entries → mean = 75
    expect(avgDailyScore(state, "2026-06-15", "2026-06-17")).toBe(75);
  });
});

describe("insights — daysCompleted", () => {
  it("counts only days with score >= 100", () => {
    const state = makeState({
      "2026-06-15": archived(99),
      "2026-06-16": archived(100),
      "2026-06-17": archived(120),
      "2026-06-18": archived(50),
    });
    expect(daysCompleted(state, "2026-06-15", "2026-06-18")).toBe(2);
  });

  it("returns 0 when range has no entries", () => {
    expect(daysCompleted(makeState({}), "2026-06-15", "2026-06-21")).toBe(0);
  });
});

describe("insights — busiestHour", () => {
  it("returns null when state has no blocks", () => {
    expect(busiestHour(makeState({}))).toBeNull();
  });

  it("returns the hour with the most coincident blocks", () => {
    const state: AppState = {
      ...makeState({}),
      blocks: [
        {
          id: "1",
          name: "A",
          start: "07:00",
          end: "09:00",
          recurrence: { kind: "every-day" },
          categoryId: null,
          bricks: [],
        },
        {
          id: "2",
          name: "B",
          start: "08:00",
          end: "10:00",
          recurrence: { kind: "every-day" },
          categoryId: null,
          bricks: [],
        },
      ],
    };
    // Hour 08 is covered by BOTH blocks → busiest
    expect(busiestHour(state)).toBe("08:00");
  });
});

describe("insights — longestStreak with freezes", () => {
  it("counts frozen days toward the streak even when score is null", () => {
    // Day 15: scored 50%. Day 16: missed AND frozen. Day 17: missed AND
    // frozen. Day 18: scored 80%. With freezes covering both gap days,
    // 15-16-17-18 = streak of 4. Without freezes the streak resets at 16
    // → best is 1.
    const state: AppState = {
      schemaVersion: 3,
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: "2026-06-01",
      currentDate: "2026-06-20",
      history: {
        "2026-06-15": archived(50),
        "2026-06-18": archived(80),
      },
      deletions: {},
      freezes: { "2026-06-16": true, "2026-06-17": true },
    } as unknown as AppState;
    const noFreeze = { ...state, freezes: {} };
    expect(longestStreak(noFreeze, "2026-06-15", "2026-06-18")).toBe(1);
    expect(longestStreak(state, "2026-06-15", "2026-06-18")).toBe(4);
  });

  it("frozen day alone (no scored neighbors) is a streak of 1", () => {
    const state: AppState = {
      schemaVersion: 3,
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: "2026-06-01",
      currentDate: "2026-06-20",
      history: {},
      deletions: {},
      freezes: { "2026-06-17": true },
    } as unknown as AppState;
    expect(longestStreak(state, "2026-06-15", "2026-06-18")).toBe(1);
  });
});
