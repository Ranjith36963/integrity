/**
 * U-m0-001..U-m0-004: Validate that globals.css :root declares the correct
 * M0 design tokens. Tests read the raw CSS file with fs.readFileSync and
 * assert exact var names and values.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(__dirname, "./globals.css"), "utf-8");

// Extract the :root block (everything between the first :root { and its matching })
function extractRootBlock(source: string): string {
  const start = source.indexOf(":root {");
  if (start === -1) return "";
  let depth = 0;
  let i = start;
  while (i < source.length) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
    i++;
  }
  return source.slice(start);
}

const root = extractRootBlock(css);

// Helpers for matching CSS tokens regardless of formatting differences
// (prettier normalizes rgba(245,241,232,.5) → rgba(245, 241, 232, 0.5)).
function checkToken(cssRoot: string, token: string, value: string) {
  const normalizedRoot = cssRoot.replace(/\s+/g, " ");
  // Normalize the expected value the same way: collapse spaces, expand .5 → 0.5
  const normalizedValue = value
    .replace(/\s+/g, " ")
    .replace(
      /rgba\((\d+),\s*(\d+),\s*(\d+),\s*\.(\d+)\)/,
      (_, r, g, b, a) => `rgba(${r}, ${g}, ${b}, 0.${a})`,
    );
  const tokenEsc = token.replace(/[-]/g, "\\-");
  const valueEsc = normalizedValue
    .replace(/[().,[\]]/g, (c) => `\\${c}`)
    .replace(/\s+/g, "\\s*");
  const pattern = new RegExp(`${tokenEsc}\\s*:\\s*${valueEsc}`);
  expect(normalizedRoot).toMatch(pattern);
}

// U-m0-001: Color tokens
describe("U-m0-001: globals.css :root declares M0 color tokens", () => {
  it("declares --bg: #07090f", () => checkToken(root, "--bg", "#07090f"));
  it("declares --bg-elev: #0c1018", () =>
    checkToken(root, "--bg-elev", "#0c1018"));
  it("declares --ink: #f5f1e8", () => checkToken(root, "--ink", "#f5f1e8"));
  // ink-dim is rgba warm-white at 50% alpha; prettier may normalize spacing + 0.5 vs .5
  it("declares --ink-dim: rgba(245,241,232,.5)", () => {
    // Accept either compact or spaced form, and either 0.5 or .5 — same semantic value
    expect(root).toMatch(
      /--ink-dim\s*:\s*rgba\(\s*245\s*,\s*241\s*,\s*232\s*,\s*0?\.5\s*\)/,
    );
  });
  it("declares --accent: #fbbf24", () =>
    checkToken(root, "--accent", "#fbbf24"));
  it("declares --accent-deep: #d97706", () =>
    checkToken(root, "--accent-deep", "#d97706"));
  it("declares --cat-health: #34d399", () =>
    checkToken(root, "--cat-health", "#34d399"));
  it("declares --cat-mind: #c4b5fd", () =>
    checkToken(root, "--cat-mind", "#c4b5fd"));
  it("declares --cat-career: #fbbf24", () =>
    checkToken(root, "--cat-career", "#fbbf24"));
  it("declares --cat-passive: #64748b", () =>
    checkToken(root, "--cat-passive", "#64748b"));
});

// U-m0-002: Typography tokens
describe("U-m0-002: globals.css :root declares M0 typography tokens", () => {
  it("declares --font-display, --font-ui, --font-body", () => {
    expect(root).toMatch(/--font-display\s*:\s*var\(--font-instrument-serif\)/);
    expect(root).toMatch(/--font-ui\s*:\s*var\(--font-jetbrains-mono\)/);
    expect(root).toMatch(/--font-body\s*:\s*var\(--font-geist-sans\)/);
  });

  const typeScale: [string, string][] = [
    ["--fs-10", "0.625rem"],
    ["--fs-12", "0.75rem"],
    ["--fs-14", "0.875rem"],
    ["--fs-16", "1rem"],
    ["--fs-22", "1.375rem"],
    ["--fs-32", "2rem"],
    ["--fs-64", "4rem"],
  ];

  it.each(typeScale)("declares %s: %s", (token, value) => {
    expect(root).toMatch(
      new RegExp(`${token.replace("--", "\\-\\-")}\\s*:\\s*${value}`),
    );
  });
});

// U-m0-003: Spacing tokens
describe("U-m0-003: globals.css :root declares M0 spacing tokens", () => {
  const spacingTokens: [string, string][] = [
    ["--sp-4", "4px"],
    ["--sp-8", "8px"],
    ["--sp-12", "12px"],
    ["--sp-16", "16px"],
    ["--sp-24", "24px"],
    ["--sp-32", "32px"],
    ["--sp-48", "48px"],
  ];

  it.each(spacingTokens)("declares %s: %s", (token, value) => {
    expect(root).toMatch(
      new RegExp(`${token.replace("--", "\\-\\-")}\\s*:\\s*${value}`),
    );
  });
});

// U-m0-004: Motion and safe-area tokens
describe("U-m0-004: globals.css :root declares M0 motion + safe-area tokens", () => {
  it("declares --safe-bottom: env(safe-area-inset-bottom)", () => {
    expect(root).toMatch(/--safe-bottom\s*:\s*env\(safe-area-inset-bottom\)/);
  });

  it("declares --safe-top: env(safe-area-inset-top)", () => {
    expect(root).toMatch(/--safe-top\s*:\s*env\(safe-area-inset-top\)/);
  });

  const motionTokens: [string, RegExp][] = [
    ["--motion-tap", /100ms/],
    ["--motion-brick-fill", /600ms/],
    ["--motion-bloom", /spring/],
    ["--motion-modal-in", /spring/],
    ["--motion-modal-out", /220ms/],
    ["--motion-flip", /360ms/],
    ["--motion-long-press", /180ms/],
    ["--motion-stagger", /30ms/],
  ];

  it.each(motionTokens)(
    "declares %s with appropriate duration token",
    (token, durationPattern) => {
      // Find the line with the token
      const tokenEscaped = token.replace(/--/g, "\\-\\-");
      const lineMatch = root.match(new RegExp(`${tokenEscaped}\\s*:[^;]+;`));
      expect(lineMatch).not.toBeNull();
      if (lineMatch) {
        expect(lineMatch[0]).toMatch(durationPattern);
      }
    },
  );
});
