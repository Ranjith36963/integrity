/**
 * U-m0-005: getMotion returns correct tokens for each Duration.
 * U-m0-006: getMotion with reduced=true collapses all durations to 0.
 */
import { describe, it, expect } from "vitest";
import { getMotion } from "./motion";
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
