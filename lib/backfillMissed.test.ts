/**
 * lib/backfillMissed.test.ts — M11 Step 2: no missing days; missed = 0% "No entry".
 *
 * Covers backfill of skipped days at rollover (AC-6), honest aggregates over a
 * gap (AC-8), the missed flag (DEC-1), and the archive-not-diluted fix (a past
 * day's stored score reflects only the routine that applied that date).
 */
import { describe, it, expect } from "vitest";
import { rollover, dayScore, weekScore } from "./history";
import { defaultState } from "./data";
import type { PersistedState } from "./persist";
import type { Block, Brick, Recurrence } from "./types";

function state(over: Partial<PersistedState>): PersistedState {
  return { ...(defaultState() as unknown as PersistedState), ...over };
}
function block(id: string, rec: Recurrence, bricks: Brick[] = []): Block {
  return {
    id,
    name: id,
    start: "06:00",
    recurrence: rec,
    categoryId: null,
    bricks,
  } as Block;
}
function tick(id: string, done: boolean): Brick {
  return {
    id,
    name: id,
    categoryId: null,
    parentBlockId: null,
    hasDuration: false,
    kind: "tick",
    done,
  } as Brick;
}

describe("M11 AC-6: reopening after a gap backfills every skipped day as missed", () => {
  it("Jun 28 → Jul 2 records 06-28 (real) + 06-29/30, 07-01 (missed); 07-02 is current", () => {
    const s = state({
      programStart: "2026-06-01",
      currentDate: "2026-06-28",
      blocks: [block("Wake", { kind: "every-day" }, [tick("t", false)])],
    });
    const r = rollover(s, "2026-07-02");
    const keys = Object.keys(r.history).sort();
    expect(keys).toEqual([
      "2026-06-28",
      "2026-06-29",
      "2026-06-30",
      "2026-07-01",
    ]);
    expect(r.history["2026-07-01"].missed).toBe(true);
    expect(r.history["2026-06-28"].missed).toBeUndefined(); // real last-open day
    for (const d of ["2026-06-29", "2026-06-30", "2026-07-01"])
      expect(dayScore(r, d)).toBe(0); // missed → 0%
    expect(r.currentDate).toBe("2026-07-02");
    // no day beyond today archived
    expect(Object.keys(r.history)).not.toContain("2026-07-02");
  });

  it("a single-day advance backfills nothing (no gap)", () => {
    const s = state({
      programStart: "2026-06-01",
      currentDate: "2026-06-01",
      blocks: [block("Wake", { kind: "every-day" })],
    });
    const r = rollover(s, "2026-06-02");
    expect(Object.keys(r.history)).toEqual(["2026-06-01"]);
  });
});

describe("M11 AC-8: aggregates count missed days as 0 (honest average)", () => {
  it("a week with 1 perfect day + 6 missed days averages ~14%", () => {
    // Start Mon 2026-06-01; user does a perfect day, then vanishes for the week.
    const s = state({
      programStart: "2026-06-01",
      currentDate: "2026-06-01",
      blocks: [block("Wake", { kind: "every-day" }, [tick("t", true)])], // 100% that day
    });
    // reopen the following Sunday 2026-06-07 → 06-02..06-06 backfilled missed(0)
    const r = rollover(s, "2026-06-07");
    // Week Sun 2026-05-31..Sat 2026-06-06: in-range days 06-01(100) + 06-02..06-06(0 each)
    // = 100 / 6 ≈ 16.67 (06-01..06-06 are the 6 in-range days of that week)
    const wk = weekScore(r, "2026-06-01");
    expect(wk).toBeCloseTo(100 / 6, 1);
  });
});

describe("M11 archive-not-diluted: a past day's score reflects only what applied", () => {
  it("a weekday's archived score counts the weekday block only, not the empty weekend block", () => {
    // 2026-07-01 is a Wednesday. Weekday block fully done; weekend block empty.
    const s = state({
      programStart: "2026-06-01",
      currentDate: "2026-07-01",
      blocks: [
        block("weekday", { kind: "every-weekday" }, [tick("t", true)]), // 100%
        block("weekend", { kind: "every-weekend" }, [tick("w", false)]), // would be 0%
      ],
    });
    const r = rollover(s, "2026-07-02");
    // Wednesday's archive holds only the weekday block → score 100, not diluted to 50.
    expect(dayScore(r, "2026-07-01")).toBe(100);
    expect(r.history["2026-07-01"].blocks.map((b) => b.name)).toEqual([
      "weekday",
    ]);
  });
});
