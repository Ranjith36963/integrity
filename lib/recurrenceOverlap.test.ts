import { describe, it, expect } from "vitest";
import {
  recurrencesCanCoincide,
  findOverlaps,
  type TimedItem,
} from "./overlap";
import type { Recurrence } from "./types";

const wd: Recurrence = { kind: "every-weekday" };
const we: Recurrence = { kind: "every-weekend" };
const everyday: Recurrence = { kind: "every-day" };
// 2026-07-01 is a Wednesday; 2026-07-04 is a Saturday.
const wed: Recurrence = { kind: "just-today", date: "2026-07-01" };
const sat: Recurrence = { kind: "just-today", date: "2026-07-04" };

describe("recurrencesCanCoincide", () => {
  it("weekday and weekend never coincide", () => {
    expect(recurrencesCanCoincide(wd, we)).toBe(false);
    expect(recurrencesCanCoincide(we, wd)).toBe(false);
  });
  it("weekday coincides with weekday; weekend with weekend", () => {
    expect(recurrencesCanCoincide(wd, wd)).toBe(true);
    expect(recurrencesCanCoincide(we, we)).toBe(true);
  });
  it("every-day coincides with everything", () => {
    expect(recurrencesCanCoincide(everyday, wd)).toBe(true);
    expect(recurrencesCanCoincide(everyday, we)).toBe(true);
  });
  it("just-today respects the actual weekday of its date", () => {
    expect(recurrencesCanCoincide(wed, wd)).toBe(true); // Wed is a weekday
    expect(recurrencesCanCoincide(wed, we)).toBe(false); // Wed is not a weekend
    expect(recurrencesCanCoincide(sat, we)).toBe(true); // Sat is a weekend
    expect(recurrencesCanCoincide(sat, wd)).toBe(false); // Sat is not a weekday
  });
  it("two just-today only coincide on the same date", () => {
    expect(recurrencesCanCoincide(wed, wed)).toBe(true);
    expect(recurrencesCanCoincide(wed, sat)).toBe(false);
  });
  it("custom-range weekend-only does not coincide with a weekday recurrence", () => {
    const weekendRange: Recurrence = {
      kind: "custom-range",
      start: "2026-07-01",
      end: "2026-12-31",
      weekdays: [0, 6],
    };
    expect(recurrencesCanCoincide(weekendRange, wd)).toBe(false);
    expect(recurrencesCanCoincide(weekendRange, we)).toBe(true);
  });
});

describe("findOverlaps respects recurrence", () => {
  const weekdayBlock: TimedItem = {
    kind: "block",
    id: "wd1",
    name: "Physical fitness",
    start: "06:00",
    end: "07:00",
    categoryId: null,
    recurrence: wd,
  };

  it("does NOT flag a weekend block overlapping a weekday block at the same time", () => {
    const hits = findOverlaps(
      { start: "06:00", end: "07:00", recurrence: we },
      [weekdayBlock],
    );
    expect(hits).toHaveLength(0);
  });

  it("DOES flag a weekday block overlapping another weekday block", () => {
    const hits = findOverlaps(
      { start: "06:30", end: "07:30", recurrence: wd },
      [weekdayBlock],
    );
    expect(hits.map((h) => h.id)).toEqual(["wd1"]);
  });

  it("absent recurrence behaves as every-day (backward compatible)", () => {
    const noRec: TimedItem = { ...weekdayBlock, recurrence: undefined };
    const hits = findOverlaps({ start: "06:30", end: "07:30" }, [noRec]);
    expect(hits).toHaveLength(1);
  });
});
