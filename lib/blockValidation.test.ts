import { describe, it, expect } from "vitest";
import {
  isValidStart,
  isValidEnd,
  endAfterStart,
  isValidCustomRange,
  isValidBrickUnitsTarget,
} from "./blockValidation";
import { intervalsOverlap } from "./overlap";

// U-m2-001: isValidStart — HH:MM regex (two-digit hour 00–23, two-digit minute 00–59)
describe("U-m2-001: isValidStart validates HH:MM format", () => {
  it("returns true for valid HH:MM strings", () => {
    expect(isValidStart("00:00")).toBe(true);
    expect(isValidStart("09:00")).toBe(true);
    expect(isValidStart("23:59")).toBe(true);
  });

  it("returns false for invalid strings", () => {
    expect(isValidStart("")).toBe(false);
    expect(isValidStart("24:00")).toBe(false);
    expect(isValidStart("9:00")).toBe(false); // single-digit hour
    expect(isValidStart("09:60")).toBe(false);
    expect(isValidStart("abc")).toBe(false);
    expect(isValidStart("09:00 ")).toBe(false); // trailing space
  });
});

// U-m2-002: isValidEnd — undefined OR HH:MM ≤ 23:59
describe("U-m2-002: isValidEnd validates end time or undefined", () => {
  it("returns true for valid values", () => {
    expect(isValidEnd(undefined)).toBe(true);
    expect(isValidEnd("23:59")).toBe(true);
    expect(isValidEnd("00:01")).toBe(true);
  });

  it("returns false for invalid strings", () => {
    expect(isValidEnd("24:00")).toBe(false);
    expect(isValidEnd("25:30")).toBe(false);
    expect(isValidEnd("")).toBe(false);
    expect(isValidEnd("abc")).toBe(false);
  });
});

// U-m2-003: endAfterStart — end must be strictly after start (or undefined)
describe("U-m2-003: endAfterStart validates temporal ordering", () => {
  it("returns true when end is undefined", () => {
    expect(endAfterStart("09:00", undefined)).toBe(true);
  });

  it("returns true when end is after start", () => {
    expect(endAfterStart("09:00", "10:00")).toBe(true);
  });

  it("returns false when end is before start", () => {
    expect(endAfterStart("10:00", "09:00")).toBe(false);
  });

  it("returns false when end equals start", () => {
    expect(endAfterStart("09:00", "09:00")).toBe(false);
  });
});

// U-m2-004: intervalsOverlap — half-open [start, end) intervals (ADR-006)
// Re-pointed from overlapsExistingBlock to intervalsOverlap per M4f / SG-m4f-03.
describe("U-m2-004: intervalsOverlap uses half-open intervals (ADR-006)", () => {
  it("back-to-back intervals do NOT overlap (touching boundary)", () => {
    // candidate [11:00, 12:00) vs existing [10:00, 11:00) — touching at 11:00
    expect(
      intervalsOverlap(
        { start: "11:00", end: "12:00" },
        { start: "10:00", end: "11:00" },
      ),
    ).toBe(false);
  });

  it("overlapping interval returns true", () => {
    // candidate [10:30, 11:30) vs existing [10:00, 11:00) — overlap at [10:30, 11:00)
    expect(
      intervalsOverlap(
        { start: "10:30", end: "11:30" },
        { start: "10:00", end: "11:00" },
      ),
    ).toBe(true);
  });

  it("touching from below does NOT overlap (candidate ends at 10:00)", () => {
    expect(
      intervalsOverlap(
        { start: "09:00", end: "10:00" },
        { start: "10:00", end: "11:00" },
      ),
    ).toBe(false);
  });
});

// U-m2-005: intervalsOverlap — no-end candidate is treated as [start, start+1)
// Re-pointed from overlapsExistingBlock per M4f / SG-m4f-03.
// Note: intervalsOverlap requires explicit end. A no-end candidate uses start+1 convention
// which is now the caller's responsibility (AddBlockSheet/overlap.ts handles this).
// These tests validate the base intervalsOverlap function boundary semantics.
describe("U-m2-005: intervalsOverlap — boundary semantics for single-minute marker", () => {
  it("candidate [10:30, 10:31) inside existing [10:00, 11:00) overlaps", () => {
    expect(
      intervalsOverlap(
        { start: "10:30", end: "10:31" },
        { start: "10:00", end: "11:00" },
      ),
    ).toBe(true);
  });

  it("candidate [11:00, 11:01) at boundary of [10:00, 11:00) does NOT overlap", () => {
    expect(
      intervalsOverlap(
        { start: "11:00", end: "11:01" },
        { start: "10:00", end: "11:00" },
      ),
    ).toBe(false);
  });
});

// U-m2-006: isValidCustomRange — custom-range requires start ≤ end AND weekdays.length > 0
describe("U-m2-006: isValidCustomRange validates custom-range recurrence", () => {
  it("returns true for valid custom-range", () => {
    expect(
      isValidCustomRange({
        kind: "custom-range",
        start: "2026-05-01",
        end: "2026-05-31",
        weekdays: [1, 2, 3, 4, 5],
      }),
    ).toBe(true);
  });

  it("returns false when start > end", () => {
    expect(
      isValidCustomRange({
        kind: "custom-range",
        start: "2026-05-31",
        end: "2026-05-01",
        weekdays: [1],
      }),
    ).toBe(false);
  });

  it("returns false when weekdays is empty", () => {
    expect(
      isValidCustomRange({
        kind: "custom-range",
        start: "2026-05-01",
        end: "2026-05-31",
        weekdays: [],
      }),
    ).toBe(false);
  });

  it("returns true for just-today", () => {
    expect(isValidCustomRange({ kind: "just-today", date: "2026-05-06" })).toBe(
      true,
    );
  });

  it("returns true for every-weekday", () => {
    expect(isValidCustomRange({ kind: "every-weekday" })).toBe(true);
  });

  it("returns true for every-day", () => {
    expect(isValidCustomRange({ kind: "every-day" })).toBe(true);
  });
});

// ─── U-m4f-017: intervalsOverlap — back-to-back (re-point of U-m2-005) ──────────
// Production behavior landed in 7b34777. This is a coverage backfill asserting the
// M2 back-to-back regression is re-pointed from overlapsExistingBlock (deleted) to
// lib/overlap.ts:intervalsOverlap per SG-m4f-03 (ADR-006).

describe("U-m4f-017: intervalsOverlap back-to-back blocks do NOT overlap (re-point of U-m2-005)", () => {
  it("returns false for back-to-back windows [09:00,10:00) and [10:00,11:00) — boundary not overlap", () => {
    expect(
      intervalsOverlap(
        { start: "09:00", end: "10:00" },
        { start: "10:00", end: "11:00" },
      ),
    ).toBe(false);
  });

  it("is symmetric: [10:00,11:00) vs [09:00,10:00) also returns false", () => {
    expect(
      intervalsOverlap(
        { start: "10:00", end: "11:00" },
        { start: "09:00", end: "10:00" },
      ),
    ).toBe(false);
  });
});

// ─── U-m4f-016 / U-m3-013: isValidBrickUnitsTarget (renamed from isValidBrickGoal) ─────

describe("U-m4f-016: isValidBrickUnitsTarget validates target is integer ≥ 1", () => {
  it("returns true for 1, 100, 9999", () => {
    expect(isValidBrickUnitsTarget(1)).toBe(true);
    expect(isValidBrickUnitsTarget(100)).toBe(true);
    expect(isValidBrickUnitsTarget(9999)).toBe(true);
  });

  it("returns false for 0, negative, non-integer, NaN", () => {
    expect(isValidBrickUnitsTarget(0)).toBe(false);
    expect(isValidBrickUnitsTarget(-1)).toBe(false);
    expect(isValidBrickUnitsTarget(1.5)).toBe(false);
    expect(isValidBrickUnitsTarget(NaN)).toBe(false);
  });
});
