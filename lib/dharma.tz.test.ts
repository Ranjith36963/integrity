/**
 * lib/dharma.tz.test.ts — TZ-pinned regression suite for dharma.ts date helpers.
 *
 * Covers today(), isoToLocalDate(), dayNumber(), dateLabel() under the four
 * pinned timezones in vitest.tz.config.ts:
 *   - America/Los_Angeles (PT) — negative offset, observes DST
 *   - Asia/Tokyo (JST)         — positive offset, no DST
 *   - UTC                       — zero offset, no DST
 *   - Asia/Kathmandu (NPT)      — +5:45, no DST (edge case)
 *
 * The TZ env var must be set at process start (V8/ICU limitation). The
 * npm scripts (test:tz:pt, test:tz:tokyo, test:tz:utc, test:tz:nepal) do
 * this — each spawns its own vitest process. This file reads
 * `process.env.TZ` to skip the cross-TZ-invariant assertions when not
 * needed.
 *
 * The cross-TZ invariants that MUST hold in ALL pinned zones:
 *   - today() and isoToLocalDate(today()) round-trip lossless within the
 *     same wall-clock instant.
 *   - dayNumber(programStart, today()) is monotonic across local days.
 *   - dateLabel returns a non-empty, parsable string.
 */
import { describe, it, expect, vi } from "vitest";
import { today, isoToLocalDate, dayNumber, dateLabel } from "./dharma";

const TZ = process.env.TZ ?? "UTC";

describe(`dharma.ts under TZ=${TZ}`, () => {
  describe("today() — local-date format invariants", () => {
    it("returns a YYYY-MM-DD shape that matches the local wall clock", () => {
      const d = new Date(2026, 5, 15, 14, 30, 0); // June 15 2026 14:30 LOCAL
      const result = today(d);
      expect(result).toBe("2026-06-15");
    });

    it("zero-pads single-digit months and days", () => {
      const d = new Date(2026, 0, 1, 0, 0, 0); // Jan 1 2026 LOCAL
      expect(today(d)).toBe("2026-01-01");
    });

    it("at LOCAL Dec 31 23:59, today() returns Dec 31 even though UTC may be Jan 1", () => {
      const d = new Date(2026, 11, 31, 23, 59, 0);
      expect(today(d)).toBe("2026-12-31");
    });

    it("at LOCAL Jan 1 00:01, today() returns Jan 1 even though UTC may be Dec 31", () => {
      const d = new Date(2027, 0, 1, 0, 1, 0);
      expect(today(d)).toBe("2027-01-01");
    });
  });

  describe("isoToLocalDate(today()) — round-trip invariants", () => {
    it("isoToLocalDate(today(d)) preserves the local Y/M/D of d for noon", () => {
      const d = new Date(2026, 5, 15, 12, 0, 0);
      const round = isoToLocalDate(today(d));
      expect(round.getFullYear()).toBe(2026);
      expect(round.getMonth()).toBe(5); // June
      expect(round.getDate()).toBe(15);
      expect(round.getHours()).toBe(0); // local midnight
    });

    it("round-trip preserves local Jan 1 — the exact R2-P0-1 bug case", () => {
      const d = new Date(2025, 0, 1, 9, 0, 0); // Jan 1 2025 09:00 LOCAL
      const round = isoToLocalDate(today(d));
      expect(round.getFullYear()).toBe(2025);
      expect(round.getMonth()).toBe(0);
      expect(round.getDate()).toBe(1);
    });

    it("round-trip preserves local Dec 31", () => {
      const d = new Date(2024, 11, 31, 18, 0, 0);
      const round = isoToLocalDate(today(d));
      expect(round.getFullYear()).toBe(2024);
      expect(round.getMonth()).toBe(11);
      expect(round.getDate()).toBe(31);
    });
  });

  describe("dayNumber() — monotonic across local days", () => {
    it("returns 1 when programStart === today", () => {
      const programStart = "2026-05-01";
      const todayIso = "2026-05-01";
      expect(dayNumber(programStart, todayIso)).toBe(1);
    });

    it("returns 2 when today is the calendar day after programStart", () => {
      expect(dayNumber("2026-05-01", "2026-05-02")).toBe(2);
    });

    it("spans DST transitions without off-by-one (PT spring-forward Mar 8 2026)", () => {
      // From PT Mar 7 to Mar 8 (DST spring-forward), the local clock skips
      // 02:00 → 03:00. dayNumber MUST still return +1, not +0 or +2.
      expect(dayNumber("2026-03-07", "2026-03-08")).toBe(2);
      expect(dayNumber("2026-03-07", "2026-03-09")).toBe(3);
    });

    it("spans DST fall-back without off-by-one (PT Nov 1 2026)", () => {
      // PT Nov 1 fall-back: local clock repeats 01:00 → 01:00.
      expect(dayNumber("2026-10-31", "2026-11-01")).toBe(2);
      expect(dayNumber("2026-10-31", "2026-11-02")).toBe(3);
    });

    it("crosses leap-day Feb 29 2028 without off-by-one", () => {
      expect(dayNumber("2028-02-28", "2028-02-29")).toBe(2);
      expect(dayNumber("2028-02-29", "2028-03-01")).toBe(2);
    });

    it("returns undefined for empty/null programStart", () => {
      expect(dayNumber("", "2026-05-01")).toBeUndefined();
      expect(dayNumber(null, "2026-05-01")).toBeUndefined();
      expect(dayNumber(undefined, "2026-05-01")).toBeUndefined();
    });
  });

  describe("dateLabel() — non-empty string in all TZs", () => {
    it("returns the en-US 'Mon, Jan 1' format for any valid ISO", () => {
      const result = dateLabel("2026-01-01");
      expect(result).toMatch(/^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/);
    });

    it("does NOT shift the date by TZ offset (Jan 1 stays Jan 1)", () => {
      // The pre-isoToLocalDate bug was that new Date('2026-01-01') parsed as
      // UTC, so PT users saw 'Dec 31'. Now fixed via the 'T00:00:00' suffix.
      const result = dateLabel("2026-01-01");
      expect(result).toContain("Jan 1");
      expect(result).not.toContain("Dec 31");
    });
  });
});

// Cross-TZ invariants checked on a fixed wall-clock instant.
// These are the assertions that catch bugs like R2-P0-1 (Jan 1 in negative-UTC TZs).
describe(`Cross-TZ invariants (current TZ=${TZ})`, () => {
  it("isoToLocalDate('2025-01-01').getFullYear() returns 2025 (not 2024)", () => {
    // The R1 buggy form new Date('2025-01-01') returned 2024 in PT.
    // The R3 fix via 'T00:00:00' must hold under EVERY pinned TZ.
    expect(isoToLocalDate("2025-01-01").getFullYear()).toBe(2025);
  });

  it("isoToLocalDate('2028-01-01').getFullYear() returns 2028 (leap year sanity)", () => {
    expect(isoToLocalDate("2028-01-01").getFullYear()).toBe(2028);
  });

  it("today(Date) and isoToLocalDate(today(Date)) round-trip on Jan 1", () => {
    const jan1Local = new Date(2025, 0, 1, 12, 0, 0);
    expect(isoToLocalDate(today(jan1Local)).getFullYear()).toBe(2025);
    expect(isoToLocalDate(today(jan1Local)).getMonth()).toBe(0);
    expect(isoToLocalDate(today(jan1Local)).getDate()).toBe(1);
  });

  it("today() uses LOCAL date, not UTC date (asymmetric for offsets)", () => {
    // At local noon on June 15, today() must say June 15 regardless of TZ.
    const localNoon = new Date(2026, 5, 15, 12, 0, 0);
    expect(today(localNoon)).toBe("2026-06-15");
  });
});

// Confirm Vitest fake timers don't break the TZ context (sometimes does on V8).
describe(`TZ sanity (TZ=${TZ})`, () => {
  it("Intl resolves the expected TZ name", () => {
    const opts = Intl.DateTimeFormat().resolvedOptions();
    // The resolved TZ should be the env-pinned one. Allow shortname variants.
    if (TZ === "America/Los_Angeles") {
      expect(opts.timeZone).toMatch(/Los_Angeles|US\/Pacific/);
    } else if (TZ === "Asia/Tokyo") {
      expect(opts.timeZone).toMatch(/Tokyo|Japan/);
    } else if (TZ === "UTC") {
      expect(opts.timeZone).toMatch(/^UTC$|^Etc\/UTC$/);
    } else if (TZ === "Asia/Kathmandu") {
      // Node/ICU sometimes returns the older spelling 'Asia/Katmandu'.
      expect(opts.timeZone).toMatch(/Kat[mh]+andu/);
    }
  });

  it("vi.useFakeTimers preserves the TZ offset", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0));
    expect(today()).toBe("2026-06-15");
    vi.useRealTimers();
  });
});
