/**
 * U-m0-005: getMotion returns correct tokens for each Duration.
 * U-m0-006: getMotion with reduced=true collapses all durations to 0.
 */
import { describe, it, expect } from "vitest";
import { getMotion, motionTokens, staggerForCount } from "./motion";
import type { Duration } from "./motion";

// U-m0-005: Normal (reduced=false) tokens
describe("U-m0-005: getMotion returns correct tokens for each Duration", () => {
  const cases: [Duration, number, string][] = [
    ["tap", 100, "easeOut"],
    ["brickFill", 600, "easeInOut"],
    // modalIn is spring-driven; durationMs is nominal 0, easing is "spring"
    ["modalIn", 0, "spring"],
    ["modalOut", 220, "easeOut"],
    ["longPress", 180, "easeOut"],
    ["stagger", 30, "linear"],
  ];

  it.each(cases)(
    "token %s → durationMs=%d easing=%s",
    (token, expectedDurationMs, expectedEasing) => {
      const result = getMotion(token, false);
      expect(result.durationMs).toBe(expectedDurationMs);
      expect(result.easing).toBe(expectedEasing);
    },
  );

  it("easing values are only from the Easing union", () => {
    const validEasings = new Set(["easeOut", "easeInOut", "spring", "linear"]);
    const allTokens: Duration[] = [
      "tap",
      "brickFill",
      "modalIn",
      "modalOut",
      "longPress",
      "stagger",
      "fireworks",
    ];
    for (const token of allTokens) {
      const { easing } = getMotion(token, false);
      expect(validEasings).toContain(easing);
    }
  });
});

// U-m0-006: Reduced-motion collapse
describe("U-m0-006: getMotion(token, reduced=true) collapses all to 0", () => {
  const allTokens: Duration[] = [
    "tap",
    "brickFill",
    "modalIn",
    "modalOut",
    "longPress",
    "stagger",
    "fireworks",
  ];

  it.each(allTokens)("token %s → durationMs=0 and easing=linear", (token) => {
    const result = getMotion(token, true);
    expect(result.durationMs).toBe(0);
    // Spring tokens become hard-cut sentinel: linear + 0ms
    expect(result.easing).toBe("linear");
  });
});

// U-m7a-002: staggerForCount(n) piecewise boundary table
describe("U-m7a-002: staggerForCount(n) — exact numeric outputs at N=0,1,10,15,16,20,30,50; mutation-resistant", () => {
  const CANONICAL = motionTokens.stagger.durationMs / 1000; // 0.03 — single source of truth

  it("N=0 → canonical 0.03 (n <= 15 branch)", () => {
    expect(staggerForCount(0)).toBe(CANONICAL);
  });

  it("N=1 → canonical 0.03", () => {
    expect(staggerForCount(1)).toBe(CANONICAL);
  });

  it("N=10 → canonical 0.03", () => {
    expect(staggerForCount(10)).toBe(CANONICAL);
  });

  it("N=15 → canonical 0.03 (boundary — still in canonical branch)", () => {
    expect(staggerForCount(15)).toBe(CANONICAL);
  });

  it("N=16 → 0.45/16 = 0.028125 (first capped value)", () => {
    expect(staggerForCount(16)).toBeCloseTo(0.45 / 16, 10);
  });

  it("N=20 → 0.45/20 = 0.0225", () => {
    expect(staggerForCount(20)).toBeCloseTo(0.45 / 20, 10);
  });

  it("N=30 → Math.max(0.02, 0.45/30) = 0.02 (floor wins over 0.015)", () => {
    expect(staggerForCount(30)).toBe(Math.max(0.02, 0.45 / 30));
    expect(staggerForCount(30)).toBe(0.02);
  });

  it("N=50 → 0.02 (floor — well below 0.45/50=0.009)", () => {
    expect(staggerForCount(50)).toBe(0.02);
  });

  it("is referentially transparent — calling 100 times with N=20 always returns 0.0225", () => {
    const expected = 0.45 / 20;
    for (let i = 0; i < 100; i++) {
      expect(staggerForCount(20)).toBeCloseTo(expected, 10);
    }
  });

  it("canonical value sources from motionTokens.stagger.durationMs / 1000", () => {
    // A change to motionTokens.stagger.durationMs must cascade through staggerForCount
    // This test imports motionTokens and computes the expected value the same way
    expect(staggerForCount(1)).toBe(motionTokens.stagger.durationMs / 1000);
    expect(staggerForCount(15)).toBe(motionTokens.stagger.durationMs / 1000);
  });
});
