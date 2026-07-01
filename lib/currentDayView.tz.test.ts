/**
 * lib/currentDayView.tz.test.ts — TZ-pinned regression suite for currentDayView.ts.
 *
 * visibleDayBlocks() decides which blocks apply "today" by calling
 * appliesOn(recurrence, state.currentDate). appliesOn classifies the ISO date's
 * weekday via a local-time Date constructor (new Date(y, m-1, d)), which yields
 * the SAME weekday in every runtime timezone — no UTC drift. The whole point of
 * the recurrence fix (weekday routine hidden on weekends, and vice versa) hinges
 * on that classification, so it must hold identically under all four pinned
 * zones (PT, Tokyo, UTC, Nepal +5:45) — especially the Jan-1 negative-UTC edge.
 */
import { describe, it, expect } from "vitest";
import { visibleDayBlocks, currentDayState } from "./currentDayView";
import { dayPct } from "./dharma";
import { defaultState } from "./data";
import type { AppState, Block, Recurrence } from "./types";

const TZ = process.env.TZ ?? "UTC";

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

// Known calendar (local everywhere): 07-01 Wed, 07-04 Sat, 07-05 Sun, 07-06 Mon.
const ROUTINE: Block[] = [
  block("wd", { kind: "every-weekday" }),
  block("we", { kind: "every-weekend" }),
];

describe(`currentDayView.ts under TZ=${TZ}`, () => {
  it("weekday date shows only the weekday block in every zone", () => {
    for (const d of ["2026-07-01", "2026-07-06"]) {
      expect(visibleDayBlocks(stateOn(d, ROUTINE)).map((b) => b.id)).toEqual([
        "wd",
      ]);
    }
  });

  it("weekend date shows only the weekend block in every zone", () => {
    for (const d of ["2026-07-04", "2026-07-05"]) {
      expect(visibleDayBlocks(stateOn(d, ROUTINE)).map((b) => b.id)).toEqual([
        "we",
      ]);
    }
  });

  it("Jan-1 negative-UTC edge classifies as a weekday (Thu) consistently", () => {
    // 2026-01-01 is a Thursday when parsed as a local date.
    expect(
      visibleDayBlocks(stateOn("2026-01-01", ROUTINE)).map((b) => b.id),
    ).toEqual(["wd"]);
  });

  it("score reflects only today's routine, TZ-invariant", () => {
    // weekday block done (100), weekend block empty — on a weekday, score is 100.
    const state = stateOn("2026-07-01", [
      block("wd", { kind: "every-weekday" }, [doneTick("t")]),
      block("we", { kind: "every-weekend" }),
    ]);
    expect(dayPct(currentDayState(state))).toBe(100);
  });
});
