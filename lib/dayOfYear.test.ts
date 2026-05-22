import { describe, it, expect } from "vitest";
import { dayOfYear, daysInYear } from "./dayOfYear";

// U-m1-001: Jan 1 boundary
describe("U-m1-001: dayOfYear returns 1 for January 1", () => {
  it("returns exactly 1 for 2026-01-01", () => {
    expect(dayOfYear(new Date(2026, 0, 1))).toBe(1);
  });
});

// U-m1-002: Leap year — Feb 29 and March 1
describe("U-m1-002: dayOfYear handles leap year boundaries", () => {
  it("returns 60 for 2028-02-29 (leap year)", () => {
    expect(dayOfYear(new Date(2028, 1, 29))).toBe(60);
  });

  it("returns 61 for 2028-03-01 (day after leap day)", () => {
    expect(dayOfYear(new Date(2028, 2, 1))).toBe(61);
  });

  it("returns 60 for 2026-03-01 (non-leap year)", () => {
    expect(dayOfYear(new Date(2026, 2, 1))).toBe(60);
  });
});

// U-m1-003: Dec 31 boundary
describe("U-m1-003: dayOfYear returns 365 or 366 for Dec 31", () => {
  it("returns 365 for 2026-12-31 (non-leap)", () => {
    expect(dayOfYear(new Date(2026, 11, 31))).toBe(365);
  });

  it("returns 366 for 2028-12-31 (leap)", () => {
    expect(dayOfYear(new Date(2028, 11, 31))).toBe(366);
  });
});

// U-m1-004: daysInYear
describe("U-m1-004: daysInYear returns 365 or 366", () => {
  it("returns 365 for any date in 2026 (non-leap)", () => {
    expect(daysInYear(new Date(2026, 0, 1))).toBe(365);
    expect(daysInYear(new Date(2026, 5, 15))).toBe(365);
  });

  it("returns 366 for any date in 2028 (leap)", () => {
    expect(daysInYear(new Date(2028, 0, 1))).toBe(366);
    expect(daysInYear(new Date(2028, 11, 31))).toBe(366);
  });

  it("returns 365 for 2100 (divisible by 100 but not 400 — not a leap year)", () => {
    expect(daysInYear(new Date(2100, 5, 1))).toBe(365);
  });

  it("returns 366 for 2000 (divisible by 400 — leap year)", () => {
    expect(daysInYear(new Date(2000, 5, 1))).toBe(366);
  });
});
