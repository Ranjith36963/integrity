import { describe, it, expect } from "vitest";
import {
  isValidStart,
  isValidEnd,
  endAfterStart,
  overlapsExistingBlock,
  isValidCustomRange,
  isValidBrickGoal,
  isValidBrickTime,
} from "./blockValidation";
import type { Block } from "./types";

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

// Helper factory for Block fixtures in tests (test-only, not production code)
function makeBlock(
  start: string,
  end: string,
  id = "b1",
): Pick<
  Block,
  "id" | "name" | "start" | "end" | "recurrence" | "categoryId" | "bricks"
> {
  return {
    id,
    name: "Test",
    start,
    end,
    recurrence: { kind: "just-today", date: "2026-05-06" },
    categoryId: null,
    bricks: [],
  };
}

// U-m2-004: overlapsExistingBlock — half-open [start, end) intervals (ADR-006)
describe("U-m2-004: overlapsExistingBlock uses half-open intervals", () => {
  const existing = [makeBlock("10:00", "11:00")] as Block[];

  it("back-to-back blocks do NOT overlap (touching at 11:00)", () => {
    const result = overlapsExistingBlock(existing, {
      start: "11:00",
      end: "12:00",
    });
    expect(result).toBeNull();
  });

  it("overlapping interval returns the existing block", () => {
    const result = overlapsExistingBlock(existing, {
      start: "10:30",
      end: "11:30",
    });
    expect(result).not.toBeNull();
    expect(result?.id).toBe("b1");
  });

  it("touching from below (candidate ends at 10:00) does NOT overlap", () => {
    const result = overlapsExistingBlock(existing, {
      start: "09:00",
      end: "10:00",
    });
    expect(result).toBeNull();
  });
});

// U-m2-005: overlapsExistingBlock — no-end candidate treated as 1-minute marker
describe("U-m2-005: overlapsExistingBlock with no-end candidate", () => {
  const existing = [makeBlock("10:00", "11:00")] as Block[];

  it("no-end candidate inside existing block overlaps", () => {
    const result = overlapsExistingBlock(existing, { start: "10:30" });
    expect(result).not.toBeNull();
    expect(result?.id).toBe("b1");
  });

  it("no-end candidate exactly at 11:00 (half-open boundary) does NOT overlap", () => {
    const result = overlapsExistingBlock(existing, { start: "11:00" });
    expect(result).toBeNull();
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

// ─── U-m3-013: isValidBrickGoal (integer ≥ 1) ─────────────────────────────────

describe("U-m3-013: isValidBrickGoal validates target is integer ≥ 1", () => {
  it("returns true for 1, 100, 9999", () => {
    expect(isValidBrickGoal(1)).toBe(true);
    expect(isValidBrickGoal(100)).toBe(true);
    expect(isValidBrickGoal(9999)).toBe(true);
  });

  it("returns false for 0, negative, non-integer, NaN", () => {
    expect(isValidBrickGoal(0)).toBe(false);
    expect(isValidBrickGoal(-1)).toBe(false);
    expect(isValidBrickGoal(1.5)).toBe(false);
    expect(isValidBrickGoal(NaN)).toBe(false);
  });
});

// ─── U-m3-014: isValidBrickTime (integer ≥ 1) ─────────────────────────────────

describe("U-m3-014: isValidBrickTime validates durationMin is integer ≥ 1", () => {
  it("returns true for 1, 30, 1440", () => {
    expect(isValidBrickTime(1)).toBe(true);
    expect(isValidBrickTime(30)).toBe(true);
    expect(isValidBrickTime(1440)).toBe(true);
  });

  it("returns false for 0, negative, non-integer, NaN", () => {
    expect(isValidBrickTime(0)).toBe(false);
    expect(isValidBrickTime(-5)).toBe(false);
    expect(isValidBrickTime(2.5)).toBe(false);
    expect(isValidBrickTime(NaN)).toBe(false);
  });
});
