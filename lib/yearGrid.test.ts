/**
 * lib/yearGrid.test.ts — M9e: U-m9e-001..003
 * Tests for lib/yearGrid.ts — pure date-math module for the Empire year view.
 * UTC-drift-free; no clock, no localStorage — called with literal integer args.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { monthDates, yearMonths, addYear, subYear } from "./yearGrid";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

// ─── U-m9e-001: yearGrid module surface — monthDates / yearMonths / addYear / subYear ──

describe("U-m9e-001: yearGrid module surface — monthDates / yearMonths / addYear / subYear", () => {
  it("all four exports are functions", () => {
    expect(typeof monthDates).toBe("function");
    expect(typeof yearMonths).toBe("function");
    expect(typeof addYear).toBe("function");
    expect(typeof subYear).toBe("function");
  });

  it("monthDates(2026, 0) returns 31 ISO dates Jan 01..Jan 31", () => {
    const dates = monthDates(2026, 0);
    expect(dates).toHaveLength(31);
    expect(dates[0]).toBe("2026-01-01");
    expect(dates[30]).toBe("2026-01-31");
    // Every element is a YYYY-MM-DD string
    for (const d of dates) {
      expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    // Ascending by one day
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i] > dates[i - 1]).toBe(true);
    }
  });

  it("monthDates(2026, 3) (April 2026) has length 30", () => {
    const dates = monthDates(2026, 3);
    expect(dates).toHaveLength(30);
    expect(dates[0]).toBe("2026-04-01");
    expect(dates[29]).toBe("2026-04-30");
  });

  it("monthDates(2026, 1) (February 2026, non-leap) has length 28", () => {
    const dates = monthDates(2026, 1);
    expect(dates).toHaveLength(28);
    expect(dates[0]).toBe("2026-02-01");
    expect(dates[27]).toBe("2026-02-28");
  });

  it("yearMonths(2026) returns exactly 12 descriptors, Jan→Dec", () => {
    const months = yearMonths(2026);
    expect(months).toHaveLength(12);
    expect(months[0].monthIndex).toBe(0);
    expect(months[0].year).toBe(2026);
    expect(months[0].name).toBe("January");
    expect(months[11].monthIndex).toBe(11);
    expect(months[11].year).toBe(2026);
    expect(months[11].name).toBe("December");
    // Every descriptor has the correct year
    for (const m of months) {
      expect(m.year).toBe(2026);
      expect(m.monthIndex).toBeGreaterThanOrEqual(0);
      expect(m.monthIndex).toBeLessThanOrEqual(11);
    }
  });

  it("addYear(2026) === 2027 and subYear(2026) === 2025 — integer arithmetic", () => {
    expect(addYear(2026)).toBe(2027);
    expect(subYear(2026)).toBe(2025);
    // No Date object involved — pure integer arithmetic
    expect(typeof addYear(2026)).toBe("number");
    expect(typeof subYear(2026)).toBe("number");
  });
});

// ─── U-m9e-002: monthDates — UTC-drift-free across timezones, mutation-resistant ──

describe("U-m9e-002: monthDates — UTC-drift-free across timezones", () => {
  it("monthDates(2026, 0) is identical in the default TZ environment", () => {
    const jan = monthDates(2026, 0);
    expect(jan).toHaveLength(31);
    expect(jan[0]).toBe("2026-01-01");
    expect(jan[30]).toBe("2026-01-31");

    const dec = monthDates(2026, 11);
    expect(dec).toHaveLength(31);
    expect(dec[0]).toBe("2026-12-01");
    expect(dec[30]).toBe("2026-12-31");
  });

  it("monthDates is identical under a faked negative-UTC-offset (America/Los_Angeles)", () => {
    // Simulate a negative UTC offset environment by stubbing TZ
    vi.stubEnv("TZ", "America/Los_Angeles");

    const jan = monthDates(2026, 0);
    expect(jan).toHaveLength(31);
    expect(jan[0]).toBe("2026-01-01");
    expect(jan[30]).toBe("2026-01-31");

    const dec = monthDates(2026, 11);
    expect(dec).toHaveLength(31);
    expect(dec[0]).toBe("2026-12-01");
    expect(dec[30]).toBe("2026-12-31");

    // No day drift at month edges
    expect(jan[0]).not.toBe("2026-01-00");
    expect(jan[30]).not.toBe("2026-02-01");

    vi.unstubAllEnvs();
  });

  it("monthDates results are byte-identical regardless of timezone stub", () => {
    const janDefault = monthDates(2026, 0);
    const decDefault = monthDates(2026, 11);

    vi.stubEnv("TZ", "America/Los_Angeles");
    const janLA = monthDates(2026, 0);
    const decLA = monthDates(2026, 11);
    vi.unstubAllEnvs();

    expect(janLA).toEqual(janDefault);
    expect(decLA).toEqual(decDefault);
  });
});

// ─── U-m9e-003: monthDates — leap year handled automatically ─────────────────

describe("U-m9e-003: monthDates — leap year handled automatically", () => {
  it("monthDates(2028, 1) (February 2028, leap year) has length 29", () => {
    const feb2028 = monthDates(2028, 1);
    expect(feb2028).toHaveLength(29);
    expect(feb2028[0]).toBe("2028-02-01");
    expect(feb2028[28]).toBe("2028-02-29");
  });

  it("monthDates(2027, 1) (February 2027, non-leap) has length 28", () => {
    const feb2027 = monthDates(2027, 1);
    expect(feb2027).toHaveLength(28);
    expect(feb2027[0]).toBe("2027-02-01");
    expect(feb2027[27]).toBe("2027-02-28");
  });

  it("the full 2028 year date list has 366 dates (leap year)", () => {
    let total = 0;
    for (let m = 0; m < 12; m++) {
      total += monthDates(2028, m).length;
    }
    expect(total).toBe(366);
  });

  it("the full 2027 year date list has 365 dates (non-leap year)", () => {
    let total = 0;
    for (let m = 0; m < 12; m++) {
      total += monthDates(2027, m).length;
    }
    expect(total).toBe(365);
  });
});
