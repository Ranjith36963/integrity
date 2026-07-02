/**
 * lib/rolloverDurable.test.ts — M11 Step 1: the routine must never be lost.
 *
 * Focused acceptance coverage for the durable-history rollover fix, plus the
 * headline guarantee: a recurring routine (including empty blocks and non-timed
 * bricks) survives a full month of nightly rollovers with its definitions intact
 * and completion reset each day.
 */
import { describe, it, expect } from "vitest";
import { rollover } from "./history";
import { defaultState } from "./data";
import type { PersistedState } from "./persist";
import type { Block, Brick, Recurrence } from "./types";

function state(over: Partial<PersistedState>): PersistedState {
  return { ...(defaultState() as unknown as PersistedState), ...over };
}
function tick(id: string, rec?: Recurrence): Brick {
  return {
    id,
    name: id,
    categoryId: null,
    parentBlockId: null,
    hasDuration: false,
    kind: "tick",
    done: false,
    ...(rec ? { recurrence: rec } : {}),
  } as Brick;
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
function nextISO(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

describe("M11 AC-1: empty recurring block survives rollover", () => {
  it("an every-day block with zero bricks carries forward", () => {
    const s = state({
      currentDate: "2026-06-01",
      blocks: [block("Wake up", { kind: "every-day" })],
    });
    const r = rollover(s, "2026-06-02");
    expect(r.blocks.map((b) => b.name)).toEqual(["Wake up"]);
    expect(r.blocks[0].bricks).toEqual([]);
  });
});

describe("M11 AC-2: non-timed brick carries by inherited recurrence, reset", () => {
  it("tick/units bricks inside an every-day block carry with completion reset", () => {
    const units: Brick = {
      id: "read",
      name: "Read",
      categoryId: null,
      parentBlockId: "b",
      hasDuration: false,
      kind: "units",
      target: 30,
      unit: "pages",
      done: 18,
    } as Brick;
    const done: Brick = { ...tick("Meditate"), done: true } as Brick;
    const s = state({
      currentDate: "2026-06-01",
      blocks: [block("b", { kind: "every-day" }, [done, units])],
    });
    const r = rollover(s, "2026-06-02");
    const carried = r.blocks[0].bricks;
    expect(carried.map((b) => b.name).sort()).toEqual(["Meditate", "Read"]);
    for (const b of carried) {
      if (b.kind === "tick") expect(b.done).toBe(false);
      if (b.kind === "units") {
        expect(b.done).toBe(0);
        expect(b.target).toBe(30); // definition preserved
      }
    }
  });
});

describe("M11 AC-3 / AC-4: expired one-offs drop, live ranges carry", () => {
  it("past just-today drops; future custom-range carries; past custom-range drops", () => {
    const s = state({
      currentDate: "2026-06-01",
      blocks: [
        block("today-only", { kind: "just-today", date: "2026-06-01" }),
        block("live-range", {
          kind: "custom-range",
          start: "2026-05-01",
          end: "2026-12-31",
          weekdays: [1, 2, 3, 4, 5],
        }),
        block("dead-range", {
          kind: "custom-range",
          start: "2026-01-01",
          end: "2026-01-31",
          weekdays: [1],
        }),
        block("forever", { kind: "every-day" }),
      ],
    });
    const r = rollover(s, "2026-06-02");
    expect(r.blocks.map((b) => b.name).sort()).toEqual([
      "forever",
      "live-range",
    ]);
  });
});

describe("M11 headline: a routine survives a full month of nightly rollovers", () => {
  it("30 consecutive rollovers keep the routine intact (empty + non-timed bricks included)", () => {
    let s = state({
      programStart: "2026-06-01",
      currentDate: "2026-06-01",
      blocks: [
        block("Wake up", { kind: "every-day" }), // empty block
        block("Morning", { kind: "every-day" }, [
          tick("Meditate"),
          tick("Pushups"),
        ]),
        block("Weekday work", { kind: "every-weekday" }),
        block("Weekend chores", { kind: "every-weekend" }),
      ],
    });
    const originalNames = s.blocks.map((b) => b.name).sort();

    let iso = "2026-06-01";
    for (let day = 0; day < 30; day++) {
      // simulate doing everything, then the night ticks over
      s = {
        ...s,
        blocks: s.blocks.map((b) => ({
          ...b,
          bricks: b.bricks.map((br) =>
            br.kind === "tick" ? { ...br, done: true } : br,
          ),
        })),
      };
      const tomorrow = nextISO(iso);
      s = rollover(s, tomorrow);
      iso = tomorrow;

      // routine definitions intact every single day
      expect(s.blocks.map((b) => b.name).sort()).toEqual(originalNames);
      // completion reset for the fresh day
      for (const b of s.blocks)
        for (const br of b.bricks)
          if (br.kind === "tick") expect(br.done).toBe(false);
    }

    // 30 days archived, none lost
    expect(Object.keys(s.history).length).toBe(30);
    expect(s.currentDate).toBe(iso);
    // the "Morning" block still has both its habit bricks
    const morning = s.blocks.find((b) => b.name === "Morning")!;
    expect(morning.bricks.map((b) => b.name).sort()).toEqual([
      "Meditate",
      "Pushups",
    ]);
  });
});
