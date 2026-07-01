import { describe, it, expect } from "vitest";
import { visibleDayBlocks, currentDayState } from "./currentDayView";
import { dayPct } from "./dharma";
import { defaultState } from "./data";
import type { AppState, Block, Recurrence } from "./types";

// 2026-07-01 is a Wednesday (a weekday).
const WED = "2026-07-01";

function block(
  id: string,
  rec: Recurrence,
  bricks: Block["bricks"] = [],
): Block {
  return {
    id,
    name: id,
    start: "08:00",
    end: "09:00",
    categoryId: null,
    recurrence: rec,
    bricks,
  };
}

function stateOn(iso: string, blocks: Block[]): AppState {
  return { ...defaultState(), currentDate: iso, blocks, looseBricks: [] };
}

const doneTick = (id: string) => ({
  id,
  name: id,
  kind: "tick" as const,
  done: true,
  hasDuration: false,
  categoryId: null,
  parentBlockId: null,
});

describe("visibleDayBlocks — recurrence filter on top of deletions", () => {
  it("hides every-weekend blocks on a weekday, keeps every-weekday + every-day", () => {
    const state = stateOn(WED, [
      block("wd", { kind: "every-weekday" }),
      block("we", { kind: "every-weekend" }),
      block("ed", { kind: "every-day" }),
    ]);
    expect(visibleDayBlocks(state).map((b) => b.id)).toEqual(["wd", "ed"]);
  });

  it("hides every-weekday blocks on a weekend (2026-07-04 is a Saturday)", () => {
    const state = stateOn("2026-07-04", [
      block("wd", { kind: "every-weekday" }),
      block("we", { kind: "every-weekend" }),
    ]);
    expect(visibleDayBlocks(state).map((b) => b.id)).toEqual(["we"]);
  });

  it("respects just-today: keeps matching date, drops other dates", () => {
    const state = stateOn(WED, [
      block("today", { kind: "just-today", date: WED }),
      block("other", { kind: "just-today", date: "2026-07-02" }),
    ]);
    expect(visibleDayBlocks(state).map((b) => b.id)).toEqual(["today"]);
  });

  it("still honors deletions (deletions ∩ recurrence)", () => {
    const state = {
      ...stateOn(WED, [
        block("a", { kind: "every-day" }),
        block("b", { kind: "every-day" }),
      ]),
      deletions: { [`${WED}:a`]: true as const },
    };
    expect(visibleDayBlocks(state).map((b) => b.id)).toEqual(["b"]);
  });
});

describe("currentDayState — score reflects only today's routine", () => {
  it("weekend routine does NOT dilute the weekday score", () => {
    // One weekday block fully done (100), one weekend block empty (would be 0).
    // On a weekday, dayPct must be 100 (weekend block excluded), not 50.
    const state = stateOn(WED, [
      block("wd", { kind: "every-weekday" }, [doneTick("t")]),
      block("we", { kind: "every-weekend" }),
    ]);
    expect(dayPct(currentDayState(state))).toBe(100);
    // Sanity: raw dayPct over the unfiltered state would be the diluted 50.
    expect(dayPct(state)).toBe(50);
  });

  it("empty applicable set → 0, no divide-by-zero", () => {
    const state = stateOn(WED, [block("we", { kind: "every-weekend" })]);
    expect(dayPct(currentDayState(state))).toBe(0);
  });
});
