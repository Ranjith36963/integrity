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
// Math: 23 * 64 + (59/60) * 64 = 1472 + 62.933... = 1534.933.
// The test asserts the open range (1534, 1536) — strictly less than the 24-hour
// floor (1536) and above the 23:00 mark (1472). m1/tests.md:206 originally
// said "[1535, 1536)"; aligned to "(1534, 1536)" by R2-SG-2.
describe("U-m1-007: timeToOffsetPx for 23:59 is near (but strictly less than) 1536", () => {
  it("returns a value strictly between 1534 and 1536 for 23:59", () => {
    const result = timeToOffsetPx("23:59", 64);
    // Actual: 23*64 + (59/60)*64 = 1472 + 62.933... = 1534.933
    expect(result).toBeGreaterThan(1534);
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
// R1-SG-7 strengthened: also asserts no consumer hardcodes 64 inline. Was only
// checking the constant value — a future contributor could hardcode 64 px in
// any consumer without tripping any test.
describe("U-m1-010: HOUR_HEIGHT_PX constant is exactly 64", () => {
  it("exports HOUR_HEIGHT_PX as 64", () => {
    expect(HOUR_HEIGHT_PX).toBe(64);
    expect(typeof HOUR_HEIGHT_PX).toBe("number");
  });

  it("no component file hardcodes 64 in a height/top style", async () => {
    // Read the known consumers and assert every reference is via the symbol,
    // not a literal `64`. This catches drift across Timeline, NowLine,
    // SlotTapTargets, TimelineBlock, TimedLooseBrickCard, DraggableTimelineBlock.
    const fs = await import("node:fs");
    const path = await import("node:path");
    const files = [
      "components/Timeline.tsx",
      "components/NowLine.tsx",
      "components/SlotTapTargets.tsx",
      "components/TimelineBlock.tsx",
      "components/TimedLooseBrickCard.tsx",
      "components/DraggableTimelineBlock.tsx",
    ];
    for (const f of files) {
      const src = fs.readFileSync(path.join(__dirname, "..", f), "utf-8");
      // The file must import HOUR_HEIGHT_PX (so it has the symbol available).
      expect(src.includes("HOUR_HEIGHT_PX")).toBe(true);
      // Any standalone `: 64` or `* 64` or `64 *` would be the smell.
      // We grep for height/top style patterns specifically.
      const badHeightPattern = /(height|top)\s*[:=]\s*[^,;)]*\b64\b/g;
      const matches = src.match(badHeightPattern);
      expect(
        matches,
        `${f} contains a hardcoded 64 in a height/top style: ${matches?.join(", ")}`,
      ).toBeNull();
    }
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

// C-m1-023 — R1-P2-1 mutation guard: out-of-range minute rejected, not silently rolled over
describe("C-m1-023: timeToOffsetPx rejects out-of-range minutes (R1-P2-1)", () => {
  it("returns 0 for '12:60' (minute > 59 is malformed, not '13:00')", () => {
    // Pre-fix: 12:60 → 13:00 → 832 (silent rollover).
    // Post-fix: rejected → 0.
    expect(timeToOffsetPx("12:60", 64)).toBe(0);
  });

  it("returns 0 for '08:99' (minute > 59)", () => {
    expect(timeToOffsetPx("08:99", 64)).toBe(0);
  });

  it("returns 0 for '12:-5' (negative minute)", () => {
    expect(timeToOffsetPx("12:-5", 64)).toBe(0);
  });

  it("still accepts valid minutes 0..59 unchanged", () => {
    expect(timeToOffsetPx("12:00", 64)).toBe(768);
    expect(timeToOffsetPx("12:30", 64)).toBe(800);
    expect(timeToOffsetPx("12:59", 64)).toBeCloseTo(831, 0);
  });
});
