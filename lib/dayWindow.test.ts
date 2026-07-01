import { describe, it, expect } from "vitest";
import {
  minutesFromDayStart,
  daySpanPx,
  dayHours,
  DEFAULT_DAY_START,
  resolveDayStart,
} from "./dayWindow";

// ─────────────────────────────────────────────────────────────────────────────
// minutesFromDayStart — minutes elapsed since the day anchor, wrapping past midnight
// ─────────────────────────────────────────────────────────────────────────────
describe("minutesFromDayStart: wake-to-wake offset in minutes [0,1440)", () => {
  it("is 0 at the anchor itself", () => {
    expect(minutesFromDayStart("04:00", "04:00")).toBe(0);
  });
  it("counts forward within the same calendar day", () => {
    expect(minutesFromDayStart("05:30", "04:00")).toBe(90);
    expect(minutesFromDayStart("22:00", "04:00")).toBe(1080);
  });
  it("wraps past midnight for times before the anchor", () => {
    expect(minutesFromDayStart("00:00", "04:00")).toBe(1200);
    expect(minutesFromDayStart("03:00", "04:00")).toBe(1380);
    expect(minutesFromDayStart("03:59", "04:00")).toBe(1439);
  });
  it("behaves as a plain 00:00 origin when anchor is 00:00", () => {
    expect(minutesFromDayStart("00:00", "00:00")).toBe(0);
    expect(minutesFromDayStart("13:00", "00:00")).toBe(780);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// daySpanPx — top + height for a block, wrap-aware (sleep spans the anchor once)
// ─────────────────────────────────────────────────────────────────────────────
describe("daySpanPx: wrap-aware block geometry", () => {
  const H = 64;
  it("positions a normal same-window block", () => {
    const { topPx, heightPx } = daySpanPx("04:10", "04:20", "04:00", H);
    expect(topPx).toBeCloseTo((10 / 60) * H, 5);
    expect(heightPx).toBeCloseTo((10 / 60) * H, 5);
  });
  it("keeps an overnight block (end < start) as ONE span across the anchor", () => {
    // Sleep 22:00 → 04:00 with a 04:00 anchor sits at the very bottom, height 6h.
    const { topPx, heightPx } = daySpanPx("22:00", "04:00", "04:00", H);
    expect(topPx).toBeCloseTo((1080 / 60) * H, 5); // 22:00 = 1080 min from anchor
    expect(heightPx).toBeCloseTo((360 / 60) * H, 5); // 6 hours tall
  });
  it("gives an open-ended block (no end) a small stub height", () => {
    const { heightPx } = daySpanPx("06:00", undefined, "04:00", H);
    expect(heightPx).toBeGreaterThan(0);
    expect(heightPx).toBeLessThan(H); // less than one hour
  });
  it("a full-window block spans the whole 24h", () => {
    const { topPx, heightPx } = daySpanPx("04:00", "04:00", "04:00", H);
    expect(topPx).toBeCloseTo(0, 5);
    expect(heightPx).toBeCloseTo(24 * H, 5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// dayHours — the 24 hour labels starting at the anchor
// ─────────────────────────────────────────────────────────────────────────────
describe("dayHours: 24 labels starting at the anchor", () => {
  it("starts at the anchor and wraps around", () => {
    const hours = dayHours("04:00");
    expect(hours).toHaveLength(24);
    expect(hours[0]).toBe("04:00");
    expect(hours[20]).toBe("00:00"); // 20 hours after 04:00 = midnight
    expect(hours[23]).toBe("03:00");
  });
  it("is the classic 00:00..23:00 list when anchor is 00:00", () => {
    const hours = dayHours("00:00");
    expect(hours[0]).toBe("00:00");
    expect(hours[13]).toBe("13:00");
  });
});

describe("DEFAULT_DAY_START", () => {
  it("defaults the day anchor to 04:00", () => {
    expect(DEFAULT_DAY_START).toBe("04:00");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// resolveDayStart — pick the weekday or weekend wake time for a given date
// ─────────────────────────────────────────────────────────────────────────────
describe("resolveDayStart: weekday vs weekend anchor per date", () => {
  // 2026-07-01 is a Wednesday; 2026-07-04 is a Saturday; 2026-07-05 is a Sunday.
  it("uses the weekday anchor on Mon–Fri", () => {
    expect(resolveDayStart("04:00", "06:00", "2026-07-01")).toBe("04:00");
  });
  it("uses the weekend anchor on Saturday", () => {
    expect(resolveDayStart("04:00", "06:00", "2026-07-04")).toBe("06:00");
  });
  it("uses the weekend anchor on Sunday", () => {
    expect(resolveDayStart("04:00", "06:00", "2026-07-05")).toBe("06:00");
  });
  it("falls back to the weekday anchor when weekend is unset", () => {
    expect(resolveDayStart("05:00", undefined, "2026-07-04")).toBe("05:00");
  });
  it("falls back to the default when both are unset", () => {
    expect(resolveDayStart(undefined, undefined, "2026-07-01")).toBe(
      DEFAULT_DAY_START,
    );
  });
});
