/**
 * lib/dayOfYear.tz.test.ts — TZ-pinned regression suite for dayOfYear/daysInYear.
 *
 * R1-P2-2 (M1 hardening): the dayOfYear lib uses local date components
 * (DST-safe by design), but no TZ-pinned coverage existed. This file gets
 * included in vitest.tz.config.ts so it runs under TZ=America/Los_Angeles
 * via `npm run test:tz`.
 *
 * Verifies:
 *   - DST spring-forward (PT 2026-03-08 02:00 → 03:00) does not skip a day
 *   - DST fall-back (PT 2026-11-01 02:00 → 01:00) does not repeat a day
 *   - Leap-day boundary in a TZ with negative UTC offset
 *   - Year-end boundary (Dec 31 23:59 PT, while UTC is already Jan 1)
 */
import { describe, it, expect } from "vitest";
import { dayOfYear, daysInYear } from "./dayOfYear";

describe("dayOfYear (TZ=America/Los_Angeles)", () => {
  it("DST spring-forward (Mar 8 2026) does not skip a day", () => {
    // PT Mar 7 = day 66 of year; Mar 8 = day 67. No jump to 68.
    expect(dayOfYear(new Date(2026, 2, 7, 12, 0, 0))).toBe(66);
    expect(dayOfYear(new Date(2026, 2, 8, 12, 0, 0))).toBe(67);
    expect(dayOfYear(new Date(2026, 2, 9, 12, 0, 0))).toBe(68);
  });

  it("DST fall-back (Nov 1 2026) does not repeat a day", () => {
    // PT Oct 31 = day 304; Nov 1 = day 305; Nov 2 = day 306.
    expect(dayOfYear(new Date(2026, 9, 31, 12, 0, 0))).toBe(304);
    expect(dayOfYear(new Date(2026, 10, 1, 12, 0, 0))).toBe(305);
    expect(dayOfYear(new Date(2026, 10, 2, 12, 0, 0))).toBe(306);
  });

  it("leap-day Feb 29 2028 = day 60 in PT (negative UTC offset)", () => {
    expect(dayOfYear(new Date(2028, 1, 29, 12, 0, 0))).toBe(60);
    expect(dayOfYear(new Date(2028, 2, 1, 12, 0, 0))).toBe(61);
  });

  it("Dec 31 23:59 PT (UTC already Jan 1) still resolves to day 365/366 of CURRENT year", () => {
    // 2026 is non-leap.
    expect(dayOfYear(new Date(2026, 11, 31, 23, 59, 0))).toBe(365);
    // 2028 is leap.
    expect(dayOfYear(new Date(2028, 11, 31, 23, 59, 0))).toBe(366);
  });

  it("daysInYear is stable across the year in PT (does not flip mid-year)", () => {
    const dates = [
      new Date(2026, 0, 1, 0, 0, 0),
      new Date(2026, 5, 15, 12, 0, 0),
      new Date(2026, 11, 31, 23, 59, 59),
    ];
    for (const d of dates) {
      expect(daysInYear(d)).toBe(365);
    }
    for (const d of dates.map((d) => new Date(d.setFullYear(2028)))) {
      expect(daysInYear(d)).toBe(366);
    }
  });

  // R2-P0-1 regression: exercise the actual BuildingClient call shape.
  // Previously this suite only used local-component constructors
  // (new Date(y, m, d, ...)) which always returns the right local year.
  // Production code derives the date from todayIso (a "YYYY-MM-DD" string).
  // The R1 fix attempted `new Date(todayIso)` which is parsed as UTC midnight —
  // breaking Jan 1 in negative-UTC TZs. The R2 fix splits the ISO and uses
  // the local-component constructor.
  describe("R2-P0-1: daysInYear via the BuildingClient call shape", () => {
    // Mirror BuildingClient.tsx:243-256.
    function daysInYearFromIso(iso: string): number {
      const [y, m, d] = iso.split("-").map(Number);
      return daysInYear(new Date(y, m - 1, d));
    }

    it("PT 'today=2025-01-01' returns 365 (year 2025 is not leap)", () => {
      expect(daysInYearFromIso("2025-01-01")).toBe(365);
    });

    it("PT 'today=2028-01-01' returns 366 (year 2028 IS leap)", () => {
      expect(daysInYearFromIso("2028-01-01")).toBe(366);
    });

    it("PT 'today=2024-12-31' returns 366 (year 2024 IS leap)", () => {
      expect(daysInYearFromIso("2024-12-31")).toBe(366);
    });

    it("PT 'today=2025-12-31' returns 365 (year 2025 is not leap)", () => {
      expect(daysInYearFromIso("2025-12-31")).toBe(365);
    });

    // Sanity check that the buggy R1 form would have failed these.
    it("BUGGY R1 form `new Date(iso)` proves the bug: returns 366 for Jan 1 2025 PT (wrong)", () => {
      // This documents the regression. `new Date("2025-01-01")` parses as
      // UTC midnight → PT 2024-12-31 16:00 → getFullYear() === 2024 (leap).
      const buggy = daysInYear(new Date("2025-01-01"));
      expect(buggy).toBe(366); // wrong answer — would be 365 with the fix.
    });
  });
});
