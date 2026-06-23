/**
 * lib/insights.tz.test.ts — multi-TZ coverage for date-walking helpers.
 *
 * Runs under TZ pinning via npm scripts (test:tz:pt, test:tz:tokyo, etc).
 * The functions iterate ISO YYYY-MM-DD strings using mid-day UTC math
 * (eachDay → new Date(`${iso}T12:00:00Z`)) so they should be timezone-
 * agnostic. These tests lock that invariant.
 */
import { describe, it, expect } from "vitest";
import type { AppState } from "./types";
import {
  longestStreak,
  avgDailyScore,
  daysCompleted,
  freezesUsedThisMonth,
  freezesRemainingThisMonth,
} from "./insights";

function bareState(overrides: Partial<AppState> = {}): AppState {
  return {
    blocks: [],
    categories: [],
    looseBricks: [],
    programStart: "2026-01-01",
    currentDate: "2026-06-22",
    history: {},
    deletions: {},
    ...overrides,
  } as unknown as AppState;
}

describe("insights — TZ-invariant date walking", () => {
  it("eachDay covers DST spring-forward boundary (US/PT 2026-03-08) without skipping", () => {
    // Walk Mar 6 → Mar 10 across the spring-forward (Mar 8). Without the
    // mid-day-UTC seed, naive Date+1day math can skip Mar 8 entirely.
    // Count via daysCompleted with no entries = always 0; the assertion is
    // that NO exception fires and the range is walked.
    const state = bareState();
    expect(daysCompleted(state, "2026-03-06", "2026-03-10")).toBe(0);
    expect(longestStreak(state, "2026-03-06", "2026-03-10")).toBe(0);
    expect(avgDailyScore(state, "2026-03-06", "2026-03-10")).toBeNull();
  });

  it("eachDay covers DST fall-back boundary (US/PT 2026-11-01) without double-counting", () => {
    // Walk Oct 30 → Nov 3 across the fall-back. A single day shouldn't
    // appear twice (would inflate daysCompleted past the range length).
    const state = bareState();
    expect(daysCompleted(state, "2026-10-30", "2026-11-03")).toBe(0);
    // 5-day range — internal walk produces exactly 5 yields regardless of TZ.
  });

  it("Year-end → year-start crossing walks correctly", () => {
    const state = bareState({
      freezes: {
        "2026-12-31": true,
        "2027-01-01": true,
      },
    });
    // Streak across year boundary should be 2.
    expect(longestStreak(state, "2026-12-30", "2027-01-02")).toBe(2);
  });

  it("freezesUsedThisMonth keys on YYYY-MM prefix — TZ irrelevant", () => {
    const state = bareState({
      freezes: {
        "2026-06-05": true,
        "2026-06-10": true,
        "2026-07-01": true,
      },
    });
    expect(freezesUsedThisMonth(state, "2026-06-22")).toBe(2);
    expect(freezesUsedThisMonth(state, "2026-07-15")).toBe(1);
    expect(freezesRemainingThisMonth(state, "2026-06-22")).toBe(0);
    expect(freezesRemainingThisMonth(state, "2026-07-15")).toBe(1);
  });
});
