import { describe, it, expect } from "vitest";
import { timeToOffsetPx, clampOffsetPx, HOUR_HEIGHT_PX } from "./timeOffset";

// U-m1-005: 00:00 boundary
describe("U-m1-005: timeToOffsetPx returns 0 for 00:00", () => {
  it("returns exactly 0 for 00:00 at HOUR_HEIGHT_PX=64", () => {
    expect(timeToOffsetPx("00:00", 64)).toBe(0);
  });
});

// U-m1-006: midpoint 12:00
describe("U-m1-006: timeToOffsetPx returns 768 for 12:00", () => {
  it("returns exactly 768 for 12:00 at HOUR_HEIGHT_PX=64", () => {
    expect(timeToOffsetPx("12:00", 64)).toBe(768);
  });
});

// U-m1-007: near-bottom 23:59
describe("U-m1-007: timeToOffsetPx for 23:59 is in (1535, 1536)", () => {
  it("returns a value strictly between 1535 and 1536 for 23:59", () => {
    const result = timeToOffsetPx("23:59", 64);
    expect(result).toBeGreaterThan(1535);
    expect(result).toBeLessThan(1536);
  });
});

// U-m1-008: clamping out-of-range
describe("U-m1-008: timeToOffsetPx clamps out-of-range inputs", () => {
  it("returns 0 for -01:00 (clamped to lower bound)", () => {
    expect(timeToOffsetPx("-01:00", 64)).toBe(0);
  });

  it("returns 1536 for 24:00 (clamped to upper bound)", () => {
    expect(timeToOffsetPx("24:00", 64)).toBe(1536);
  });

  it("returns 1536 for 25:30 (clamped to upper bound)", () => {
    expect(timeToOffsetPx("25:30", 64)).toBe(1536);
  });
});

// U-m1-009: clampOffsetPx
describe("U-m1-009: clampOffsetPx clamps to [0, 24*hourHeightPx]", () => {
  it("returns 0 for -50 (below lower bound)", () => {
    expect(clampOffsetPx(-50, 64)).toBe(0);
  });

  it("returns 1536 for 2000 (above upper bound)", () => {
    expect(clampOffsetPx(2000, 64)).toBe(1536);
  });

  it("returns 800 unchanged (in-range)", () => {
    expect(clampOffsetPx(800, 64)).toBe(800);
  });
});

// U-m1-010: HOUR_HEIGHT_PX is exactly 64
describe("U-m1-010: HOUR_HEIGHT_PX constant is exactly 64", () => {
  it("exports HOUR_HEIGHT_PX as 64", () => {
    expect(HOUR_HEIGHT_PX).toBe(64);
    expect(typeof HOUR_HEIGHT_PX).toBe("number");
  });
});

// U-m1-011: defensive parse of malformed input
describe("U-m1-011: timeToOffsetPx defensive parse of malformed input", () => {
  it("returns 0 for empty string (does not throw, not NaN)", () => {
    const result = timeToOffsetPx("", 64);
    expect(result).toBe(0);
    expect(Number.isNaN(result)).toBe(false);
  });

  it("returns 0 for unparseable string 'abc'", () => {
    const result = timeToOffsetPx("abc", 64);
    expect(result).toBe(0);
    expect(Number.isNaN(result)).toBe(false);
  });

  it("still returns 768 for 12:00 after malformed calls (no state corruption)", () => {
    timeToOffsetPx("", 64);
    timeToOffsetPx("abc", 64);
    expect(timeToOffsetPx("12:00", 64)).toBe(768);
  });
});
