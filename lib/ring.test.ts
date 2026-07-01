import { describe, it, expect } from "vitest";
import {
  timeToAngle,
  pointOnCircle,
  annularSectorPath,
  blockArc,
} from "./ring";

// ─────────────────────────────────────────────────────────────────────────────
// timeToAngle — clockwise degrees from the top (12 o'clock = the wake anchor)
// ─────────────────────────────────────────────────────────────────────────────
describe("timeToAngle: wake time at the top, clockwise", () => {
  it("puts the anchor itself at 0° (top)", () => {
    expect(timeToAngle("04:00", "04:00")).toBeCloseTo(0, 5);
  });
  it("is 90° a quarter-day later", () => {
    // 6h after 04:00 = 10:00 → 6/24 of the circle = 90°.
    expect(timeToAngle("10:00", "04:00")).toBeCloseTo(90, 5);
  });
  it("is 180° at the half-day (16:00 from a 04:00 anchor)", () => {
    expect(timeToAngle("16:00", "04:00")).toBeCloseTo(180, 5);
  });
  it("wraps past midnight (03:00 is nearly all the way round)", () => {
    // 23h after 04:00 → 23/24*360 = 345°.
    expect(timeToAngle("03:00", "04:00")).toBeCloseTo(345, 5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// pointOnCircle — screen coords for a clockwise-from-top angle
// ─────────────────────────────────────────────────────────────────────────────
describe("pointOnCircle: angle→(x,y) with top at 0°", () => {
  const cx = 100,
    cy = 100,
    r = 50;
  it("0° is straight up", () => {
    const p = pointOnCircle(cx, cy, r, 0);
    expect(p.x).toBeCloseTo(100, 5);
    expect(p.y).toBeCloseTo(50, 5);
  });
  it("90° is to the right (clockwise)", () => {
    const p = pointOnCircle(cx, cy, r, 90);
    expect(p.x).toBeCloseTo(150, 5);
    expect(p.y).toBeCloseTo(100, 5);
  });
  it("180° is straight down", () => {
    const p = pointOnCircle(cx, cy, r, 180);
    expect(p.x).toBeCloseTo(100, 5);
    expect(p.y).toBeCloseTo(150, 5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// blockArc — start/end angles for a block, wrap-aware (overnight = one arc)
// ─────────────────────────────────────────────────────────────────────────────
describe("blockArc: one continuous arc, wrap-aware", () => {
  it("a normal block spans its two angles", () => {
    const a = blockArc("10:00", "12:00", "04:00");
    expect(a.startAngle).toBeCloseTo(90, 5); // 10:00
    expect(a.endAngle).toBeCloseTo(120, 5); // 12:00
  });
  it("an overnight block (end < start) stays one arc across the top", () => {
    // Sleep 22:00→04:00 with a 04:00 anchor: 22:00 is 18h in (270°), end wraps
    // to a full 360° so the arc closes the loop back to the anchor.
    const a = blockArc("22:00", "04:00", "04:00");
    expect(a.startAngle).toBeCloseTo(270, 5);
    expect(a.endAngle).toBeCloseTo(360, 5);
  });
  it("open-ended block (no end) returns a zero-length arc", () => {
    const a = blockArc("10:00", undefined, "04:00");
    expect(a.endAngle - a.startAngle).toBeCloseTo(0, 5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// annularSectorPath — produces a closed SVG path (smoke: shape + large-arc flag)
// ─────────────────────────────────────────────────────────────────────────────
describe("annularSectorPath: closed ring-segment path", () => {
  it("returns a path that moves, arcs, and closes", () => {
    const d = annularSectorPath(100, 100, 60, 90, 0, 90);
    expect(d.startsWith("M")).toBe(true);
    expect(d).toContain("A"); // has arc commands
    expect(d.trim().endsWith("Z")).toBe(true); // closed
  });
  it("sets the large-arc flag when the sweep exceeds 180°", () => {
    const d = annularSectorPath(100, 100, 60, 90, 0, 270); // 270° sweep
    // large-arc flag (the "1" after the radii+rotation) must appear.
    expect(/A\s*90\s+90\s+0\s+1\s+1/.test(d)).toBe(true);
  });
});
