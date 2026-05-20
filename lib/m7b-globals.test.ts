/**
 * lib/m7b-globals.test.ts — U-m7b-009
 * Asserts the M7b CSS additions to app/globals.css:
 *   - --motion-now-pulse-duration: 1800ms in :root
 *   - @keyframes nowPulse with 0%,100% and 50% stops (both have box-shadow lines)
 *   - .is-active class with animation: nowPulse var(--motion-now-pulse-duration)
 *     and border-color: var(--accent)
 *   - Inside @media (prefers-reduced-motion: reduce): .is-active with
 *     animation: none !important and box-shadow: 0 0 0 1.5px var(--accent)
 *   - No var(--surface-2) in the new M7b lines
 */
import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

// Read the production globals.css (same pattern as M0 design-token tests)
const cssPath = join(process.cwd(), "app", "globals.css");
const css = readFileSync(cssPath, "utf-8");

describe("U-m7b-009 — globals.css M7b tokens: --motion-now-pulse-duration, @keyframes nowPulse, .is-active, PRM override", () => {
  it("--motion-now-pulse-duration: 1800ms is declared inside a :root block", () => {
    // Find :root block and check the property is inside it
    const rootBlockMatch = css.match(/:root\s*\{([^}]*)\}/s);
    expect(rootBlockMatch).not.toBeNull();
    const rootContent = rootBlockMatch![1];
    expect(rootContent).toContain("--motion-now-pulse-duration: 1800ms");
  });

  it("@keyframes nowPulse exists as a top-level rule", () => {
    expect(css).toContain("@keyframes nowPulse");
  });

  it("@keyframes nowPulse has 0%, 100% keyframe stop with box-shadow", () => {
    // The keyframe block should contain a 0%, 100% stop with a box-shadow line
    const keyframeMatch = css.match(/@keyframes nowPulse\s*\{([\s\S]*?)\n\}/);
    expect(keyframeMatch).not.toBeNull();
    const keyframeBody = keyframeMatch![1];
    expect(keyframeBody).toMatch(/0%.*100%|0%,\s*100%/);
    expect(keyframeBody).toContain("box-shadow");
  });

  it("@keyframes nowPulse has 50% keyframe stop with box-shadow", () => {
    const keyframeMatch = css.match(/@keyframes nowPulse\s*\{([\s\S]*?)\n\}/);
    expect(keyframeMatch).not.toBeNull();
    const keyframeBody = keyframeMatch![1];
    expect(keyframeBody).toContain("50%");
    // Verify box-shadow appears in the 50% stop
    const fiftyPercentMatch = keyframeBody.match(/50%\s*\{([^}]*)\}/);
    expect(fiftyPercentMatch).not.toBeNull();
    expect(fiftyPercentMatch![1]).toContain("box-shadow");
  });

  it(".is-active class has animation: nowPulse var(--motion-now-pulse-duration)", () => {
    expect(css).toContain(
      "animation: nowPulse var(--motion-now-pulse-duration)",
    );
  });

  it(".is-active class has border-color: var(--accent)", () => {
    // Find the .is-active rule (outside @media) and check border-color
    const isActiveMatch = css.match(/\.is-active\s*\{([^}]*)\}/);
    expect(isActiveMatch).not.toBeNull();
    const isActiveBody = isActiveMatch![1];
    expect(isActiveBody).toContain("border-color: var(--accent)");
  });

  it("@media (prefers-reduced-motion: reduce) block contains .is-active with animation: none !important", () => {
    // Find the reduced-motion media query block
    const prmMatch = css.match(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/,
    );
    expect(prmMatch).not.toBeNull();
    const prmBody = prmMatch![1];
    expect(prmBody).toContain(".is-active");
    expect(prmBody).toContain("animation: none !important");
  });

  it("@media (prefers-reduced-motion: reduce) .is-active has static box-shadow: 0 0 0 1.5px var(--accent)", () => {
    const prmMatch = css.match(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/,
    );
    expect(prmMatch).not.toBeNull();
    const prmBody = prmMatch![1];
    expect(prmBody).toContain("box-shadow: 0 0 0 1.5px var(--accent)");
  });

  it("M7b-new CSS lines do not contain var(--surface-2) (status.md latent-bug guard)", () => {
    // Check that the nowPulse keyframe and .is-active rule don't reference --surface-2
    const keyframeMatch = css.match(/@keyframes nowPulse\s*\{[\s\S]*?\n\}/);
    if (keyframeMatch) {
      expect(keyframeMatch[0]).not.toContain("--surface-2");
    }
    // Also check the .is-active rules
    const isActiveMatches = css.match(/\.is-active\s*\{[^}]*\}/g);
    if (isActiveMatches) {
      for (const match of isActiveMatches) {
        expect(match).not.toContain("--surface-2");
      }
    }
  });
});
