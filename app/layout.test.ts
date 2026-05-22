/**
 * C-m0-029: Viewport does not disable user-scalable (WCAG 2.5.5 / 1.4.4).
 *
 * Regression guard for GM-7. iOS Safari honors `userScalable: false` and
 * prevents low-vision users from pinch-zooming to read small text. The
 * pre-fix M0 viewport explicitly set this flag; this test fails if it
 * comes back.
 *
 * Text-based assertion because the file imports next/font/google, which
 * can't run inside Vitest's jsdom environment.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(__dirname, "layout.tsx"), "utf-8");

describe("C-m0-029: viewport does not disable user-scalable", () => {
  it("layout.tsx does not set userScalable: false", () => {
    expect(source).not.toMatch(/userScalable\s*:\s*false/);
  });

  it("layout.tsx does not set maximumScale: 1 (also blocks iOS zoom)", () => {
    expect(source).not.toMatch(/maximumScale\s*:\s*1[\s,}]/);
  });
});
