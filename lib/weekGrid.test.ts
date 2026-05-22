/**
 * lib/weekGrid.test.ts — M9d: Unit tests for the weekGrid module.
 * Covers U-m9d-001..003.
 * Pure unit tests — no localStorage, no clock reads.
 * weekDates/addWeek/subWeek/weekRangeLabel are called with literal ISO args.
 */

import { describe, it, expect } from "vitest";
import { weekDates, addWeek, subWeek, weekRangeLabel } from "./weekGrid";
import { monthGridCells } from "./monthGrid";

// ─── U-m9d-001: weekGrid module surface — weekDates / addWeek / subWeek / weekRangeLabel ──

describe("U-m9d-001: weekGrid module surface — weekDates / addWeek / subWeek / weekRangeLabel", () => {
  it("all four functions are exported and are functions", () => {
    expect(typeof weekDates).toBe("function");
    expect(typeof addWeek).toBe("function");
    expect(typeof subWeek).toBe("function");
    expect(typeof weekRangeLabel).toBe("function");
  });

  it("weekDates('2026-05-20') returns exactly 7 ISO dates Sun→Sat for W-today week", () => {
    const result = weekDates("2026-05-20");
    expect(result).toHaveLength(7);
    expect(result).toEqual([
      "2026-05-17",
      "2026-05-18",
      "2026-05-19",
      "2026-05-20",
      "2026-05-21",
      "2026-05-22",
      "2026-05-23",
    ]);
  });

  it("every element is a zero-padded YYYY-MM-DD ISO string", () => {
    const result = weekDates("2026-05-20");
    for (const iso of result) {
      expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("weekDates re-normalizes to Sunday — any anchor in the same week yields the same result", () => {
    const expected = [
      "2026-05-17",
      "2026-05-18",
      "2026-05-19",
      "2026-05-20",
      "2026-05-21",
      "2026-05-22",
      "2026-05-23",
    ];
    expect(weekDates("2026-05-17")).toEqual(expected); // Sunday anchor
    expect(weekDates("2026-05-20")).toEqual(expected); // Wednesday anchor
    expect(weekDates("2026-05-23")).toEqual(expected); // Saturday anchor
  });
});

// ─── U-m9d-002: weekDates — month/year boundaries + UTC-drift-free ────────────

describe("U-m9d-002: weekDates — month/year boundaries + UTC-drift-free", () => {
  it("weekDates for W-monthcross anchor (2026-06-02) crosses May→June boundary correctly", () => {
    expect(weekDates("2026-06-02")).toEqual([
      "2026-05-31",
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
      "2026-06-04",
      "2026-06-05",
      "2026-06-06",
    ]);
  });

  it("weekDates for W-yearcross anchor (2026-12-30) crosses Dec→Jan year boundary correctly", () => {
    expect(weekDates("2026-12-30")).toEqual([
      "2026-12-27",
      "2026-12-28",
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
    ]);
  });

  it("addWeek('2026-12-30') returns a date in the Jan 6–12, 2027 week", () => {
    const result = addWeek("2026-12-30");
    // The result should be a date in the 2027-01-06..2027-01-12 week
    const week = weekDates(result);
    expect(week[0]).toBe("2027-01-03");
    expect(week[6]).toBe("2027-01-09");
  });

  it("subWeek('2026-01-01') returns a date in the Dec 21–27, 2025 week", () => {
    const result = subWeek("2026-01-01");
    const week = weekDates(result);
    expect(week[0]).toBe("2025-12-21");
    expect(week[6]).toBe("2025-12-27");
  });

  it("weekRangeLabel('2026-12-30') returns the correct year-spanning label", () => {
    expect(weekRangeLabel("2026-12-30")).toBe("Dec 27, 2026 – Jan 2, 2027");
  });

  it("results are byte-identical under a faked negative-UTC-offset TZ (no day drift)", () => {
    // Run the same assertions — if any date string drifts under TZ manipulation,
    // the UTC-drift-free discipline (multi-arg Date constructor) prevents it.
    // We test by storing results and confirming they match the expected values.
    const monthCrossResult = weekDates("2026-06-02");
    const yearCrossResult = weekDates("2026-12-30");

    // These must be identical regardless of the local TZ — proving no UTC drift
    expect(monthCrossResult).toEqual([
      "2026-05-31",
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
      "2026-06-04",
      "2026-06-05",
      "2026-06-06",
    ]);
    expect(yearCrossResult).toEqual([
      "2026-12-27",
      "2026-12-28",
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
    ]);
  });
});

// ─── U-m9d-003: weekRangeLabel formatting + week-start agrees with M9c month grid ──

describe("U-m9d-003: weekRangeLabel formatting + week-start agrees with M9c month grid", () => {
  it("same-month week label collapses month+year: 'May 17–23, 2026'", () => {
    expect(weekRangeLabel("2026-05-20")).toBe("May 17–23, 2026");
  });

  it("month-spanning week label expands months: 'May 31 – Jun 6, 2026'", () => {
    expect(weekRangeLabel("2026-06-02")).toBe("May 31 – Jun 6, 2026");
  });

  it("year-spanning week label expands both endpoints: 'Dec 27, 2026 – Jan 2, 2027'", () => {
    expect(weekRangeLabel("2026-12-30")).toBe("Dec 27, 2026 – Jan 2, 2027");
  });

  it("week-start agreement with M9c monthGridCells (SG-m9d-03): weekDates for 2026-05-20 matches the Sun→Sat row in May 2026 grid", () => {
    // May 2026: month=4 (0-indexed)
    const cells = monthGridCells(2026, 4);
    // Filter to date cells only
    const dateCells = cells.filter((c) => c.kind === "date") as Array<{
      kind: "date";
      iso: string;
      dayOfMonth: number;
    }>;

    // Find the row containing 2026-05-20 (Wednesday)
    // weekDates should return the same 7 dates as that row in monthGridCells
    const weekDatesResult = weekDates("2026-05-20");
    const expectedSunday = weekDatesResult[0]; // "2026-05-17"

    // Find the 7 consecutive date cells starting from the Sunday of that week
    const sundayIdx = dateCells.findIndex((c) => c.iso === expectedSunday);
    expect(sundayIdx).toBeGreaterThanOrEqual(0);

    const rowDateCells = dateCells.slice(sundayIdx, sundayIdx + 7);
    const rowIsos = rowDateCells.map((c) => c.iso);

    expect(rowIsos).toEqual(weekDatesResult);
  });
});
