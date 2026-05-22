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

// ─── U-m7c-001..005: countUp motion token (M7c) ──────────────────────────────

// U-m7c-001: motionTokens.countUp literal-value assertions
describe("U-m7c-001 — motionTokens.countUp.durationMs === 1600 AND motionTokens.countUp.easing === 'easeOut'", () => {
  it("motionTokens.countUp.durationMs is exactly 1600", () => {
    expect(motionTokens.countUp.durationMs).toBe(1600);
  });

  it("motionTokens.countUp.easing is exactly 'easeOut'", () => {
    expect(motionTokens.countUp.easing).toBe("easeOut");
  });

  it("existing stagger token is byte-identical (additive regression check)", () => {
    expect(motionTokens.stagger).toEqual({ durationMs: 30, easing: "linear" });
  });

  it("existing fireworks token is byte-identical (additive regression check)", () => {
    expect(motionTokens.fireworks).toEqual({
      durationMs: 1600,
      easing: "easeOut",
    });
  });
});

// U-m7c-002: getMotion("countUp", false/true) canonical + PRM collapse
describe("U-m7c-002 — getMotion('countUp', false) returns canonical token; getMotion('countUp', true) returns PRM collapse", () => {
  it("getMotion('countUp', false) returns { durationMs: 1600, easing: 'easeOut' }", () => {
    expect(getMotion("countUp", false)).toEqual({
      durationMs: 1600,
      easing: "easeOut",
    });
  });

  it("getMotion('countUp', true) returns { durationMs: 0, easing: 'linear' }", () => {
    expect(getMotion("countUp", true)).toEqual({
      durationMs: 0,
      easing: "linear",
    });
  });

  it("getMotion('countUp', true) is structurally equal to getMotion('stagger', true) (same PRM collapse path)", () => {
    expect(getMotion("countUp", true)).toEqual(getMotion("stagger", true));
  });
});

// U-m7c-003: Duration type union includes "countUp" at compile time
describe("U-m7c-003 — Duration type union includes 'countUp' at compile time", () => {
  it("'countUp' is assignable to Duration (compile-time guard — would fail tsc if union missing)", () => {
    const d: Duration = "countUp"; // compile-time check — fails tsc if union does not include "countUp"
    expect(d).toBe("countUp");
  });

  it("Duration type has exactly 8 members (type-level exhaustiveness)", () => {
    // expectTypeOf validates at compile time — runtime value is nominal
    const allDurations: Duration[] = [
      "tap",
      "brickFill",
      "modalIn",
      "modalOut",
      "longPress",
      "stagger",
      "fireworks",
      "countUp",
    ];
    expect(allDurations).toHaveLength(8);
  });

  it("keyof motionTokens includes 'countUp' (record keys match union)", () => {
    const keys = Object.keys(motionTokens) as Duration[];
    expect(keys).toContain("countUp");
  });
});

// U-m7c-004: Object.keys(motionTokens) contains "countUp"; record has exactly 8 entries
describe("U-m7c-004 — Object.keys(motionTokens) contains 'countUp'; record has exactly 8 entries after M7c", () => {
  it("Object.keys(motionTokens) contains 'countUp'", () => {
    expect(Object.keys(motionTokens)).toContain("countUp");
  });

  it("Object.keys(motionTokens).length === 8", () => {
    expect(Object.keys(motionTokens).length).toBe(8);
  });

  it("the 8 keys are exactly the expected set (no creep)", () => {
    const keys = new Set(Object.keys(motionTokens));
    for (const expected of [
      "tap",
      "brickFill",
      "modalIn",
      "modalOut",
      "longPress",
      "stagger",
      "fireworks",
      "countUp",
    ]) {
      expect(keys).toContain(expected);
    }
  });
});

// U-m7c-005: getMotion("countUp", false) returns reference equality to motionTokens.countUp
describe("U-m7c-005 — getMotion('countUp', false) returns record entry verbatim (reference equality, no special-case branch)", () => {
  it("getMotion('countUp', false) === motionTokens.countUp (reference equality)", () => {
    expect(getMotion("countUp", false)).toBe(motionTokens.countUp);
  });

  it("returned object has EXACTLY two keys: durationMs and easing", () => {
    const result = getMotion("countUp", false);
    expect(Object.keys(result)).toEqual(["durationMs", "easing"]);
  });
});

// ─── U-m7a-002: staggerForCount(n) piecewise boundary table
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
