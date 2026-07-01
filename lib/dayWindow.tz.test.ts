/**
 * lib/dayWindow.tz.test.ts — TZ-pinned regression suite for dayWindow.ts.
 *
 * resolveDayStart() classifies an ISO YYYY-MM-DD as weekday vs weekend via a
 * local-time Date constructor (new Date(y, m-1, d)), which yields the SAME
 * weekday in every runtime timezone — no UTC drift (same discipline as
 * lib/appliesOn.ts). These assertions must hold identically under all four
 * pinned zones (PT, Tokyo, UTC, Nepal +5:45).
 *
 * The other exports (minutesFromDayStart, daySpanPx, dayHours) read no clock
 * and construct no Date — they are pure string math and TZ-invariant by
 * construction; covered in lib/dayWindow.test.ts.
 */
import { describe, it, expect } from "vitest";
import { resolveDayStart, minutesFromDayStart } from "./dayWindow";

const TZ = process.env.TZ ?? "UTC";

describe(`dayWindow.ts under TZ=${TZ}`, () => {
  describe("resolveDayStart — weekday/weekend classification is TZ-invariant", () => {
    // Known calendar: 2026-07-01 Wed, 07-03 Fri, 07-04 Sat, 07-05 Sun, 07-06 Mon.
    it("weekdays (Mon–Fri) resolve to the weekday anchor in every zone", () => {
      for (const d of ["2026-07-01", "2026-07-03", "2026-07-06"]) {
        expect(resolveDayStart("04:00", "06:00", d)).toBe("04:00");
      }
    });

    it("weekends (Sat/Sun) resolve to the weekend anchor in every zone", () => {
      for (const d of ["2026-07-04", "2026-07-05"]) {
        expect(resolveDayStart("04:00", "06:00", d)).toBe("06:00");
      }
    });

    it("classifies the Jan-1 negative-UTC edge date consistently", () => {
      // 2026-01-01 is a Thursday everywhere when parsed as a local date.
      expect(resolveDayStart("04:00", "06:00", "2026-01-01")).toBe("04:00");
    });

    it("falls back to the weekday anchor when weekend is unset", () => {
      expect(resolveDayStart("05:00", undefined, "2026-07-04")).toBe("05:00");
    });
  });

  describe("minutesFromDayStart — pure string math, TZ-invariant", () => {
    it("is stable regardless of timezone", () => {
      expect(minutesFromDayStart("22:00", "04:00")).toBe(1080);
      expect(minutesFromDayStart("03:00", "04:00")).toBe(1380);
    });
  });
});
