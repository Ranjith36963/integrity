/**
 * C-m0-029: Viewport does not disable user-scalable (WCAG 2.5.5 / 1.4.4).
 *
 * Regression guard for GM-7. iOS Safari honors `userScalable: false` and
 * prevents low-vision users from pinch-zooming to read small text. The
 * pre-fix M0 viewport explicitly set this flag; this test fails if it
 * comes back.
 *
 * Source-grep + extracted-block parsing. Both forms run because:
 *   - The grep catches the literal field (cheap fast guard).
 *   - The block-parse catches refactors that move the field into a spread
 *     object or computed property (TEST-3 strengthening).
 *
 * Cannot import layout.tsx directly because it imports next/font/google,
 * which is incompatible with Vitest's jsdom environment.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(__dirname, "layout.tsx"), "utf-8");

/**
 * Extract the body of the `export const viewport: Viewport = { ... }`
 * declaration from layout.tsx so we can grep inside it specifically
 * (not the whole file, which may contain unrelated comments/strings).
 */
function extractViewportBlock(src: string): string {
  // Strip line + block comments so commented-out fields don't pollute checks.
  const stripped = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  const match = stripped.match(
    /export\s+const\s+viewport(?:\s*:\s*Viewport)?\s*=\s*\{([\s\S]*?)\n\}\s*;?/,
  );
  if (!match) {
    throw new Error(
      "Could not locate `export const viewport = { ... }` in layout.tsx",
    );
  }
  return match[1];
}

describe("C-m0-029: viewport does not disable user-scalable", () => {
  it("layout.tsx does not set userScalable: false (whole-file grep)", () => {
    expect(source).not.toMatch(/userScalable\s*:\s*false/);
  });

  it("layout.tsx does not set maximumScale: 1 (whole-file grep)", () => {
    expect(source).not.toMatch(/maximumScale\s*:\s*1[\s,}]/);
  });

  // TEST-3 strengthening: parse the actual viewport export block and check
  // its fields. Catches mutations that move user-scalable into a spread or
  // computed property, which the whole-file grep above could miss.
  describe("inside the exported viewport block", () => {
    const block = extractViewportBlock(source);

    it("does not contain userScalable: false anywhere in the export", () => {
      expect(block).not.toMatch(/userScalable\s*:\s*false/);
    });

    it("does not contain maximumScale: 1 (or 1.0) anywhere in the export", () => {
      expect(block).not.toMatch(/maximumScale\s*:\s*1(?:\.0+)?[\s,}]/);
    });

    it("if userScalable is set, it is exactly true (no falsy values)", () => {
      const m = block.match(/userScalable\s*:\s*([^,\n}]+)/);
      if (m) {
        const value = m[1].trim();
        expect(value).toBe("true");
      }
    });

    it("if maximumScale is set, it is >= 2 (allows meaningful zoom)", () => {
      const m = block.match(/maximumScale\s*:\s*([^,\n}]+)/);
      if (m) {
        const value = Number.parseFloat(m[1].trim());
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(2);
      }
    });

    it("if initialScale is set, it is 1 (anything else breaks first paint)", () => {
      const m = block.match(/initialScale\s*:\s*([^,\n}]+)/);
      if (m) {
        const value = Number.parseFloat(m[1].trim());
        expect(value).toBe(1);
      }
    });
  });
});
