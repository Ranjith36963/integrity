/**
 * lib/globals-tokens.test.ts — source-inspection tests for design token integrity.
 * Pattern: read production source files via fs.readFileSync and assert token contracts.
 * Consistent with lib/m7b-globals.test.ts (U-m7b-009) and M0 design-token tests.
 *
 * C-m7c-014: The latent var(--surface-2) reference at HeroRing.tsx:70 is UNCHANGED by M7c.
 *   - M7c is explicitly out-of-scope for the var(--surface-2) cleanup (plan.md § Design tokens).
 *   - This test ensures no NEW references are introduced, and the existing reference persists.
 *   - The cleanup is tracked in status.md Open loops as a separate spec entry.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

// ─── C-m7c-014: var(--surface-2) regression in HeroRing.tsx ─────────────────

describe("C-m7c-014 — HeroRing.tsx var(--surface-2) reference is UNCHANGED by M7c", () => {
  const heroRingPath = join(process.cwd(), "components", "HeroRing.tsx");
  const source = readFileSync(heroRingPath, "utf-8");

  it("EXACTLY ONE occurrence of var(--surface-2) in HeroRing.tsx (the pre-existing line 70 track-circle reference)", () => {
    const matches = source.match(/var\(--surface-2\)/g) ?? [];
    // Exactly one occurrence: the pre-existing track circle stroke (near line 70)
    // A mutant adding a SECOND reference (e.g., in a new SVG stroke) fails this assertion.
    // A mutant FIXING the bug (replacing with var(--surface-1) etc.) also fails — M7c is out-of-scope.
    expect(matches.length).toBe(1);
  });

  it('the one occurrence is inside stroke="var(--surface-2)" (the track circle arc)', () => {
    // Verify the surrounding context is the track circle stroke, not a new M7c addition
    expect(source).toContain('stroke="var(--surface-2)"');
  });

  it("M7c did NOT introduce var(--surface-2) on a NEW line (carry-forward of latent bug is intentional)", () => {
    // The pre-existing occurrence is the track circle at the original line (near line 70).
    // No additional occurrences should have been added by the M7c count-up changes.
    // The cleanup is a SEPARATE future spec entry tracked in status.md Open loops.
    const lines = source.split("\n");
    const matchingLines = lines.filter((line) =>
      line.includes("var(--surface-2)"),
    );
    // Exactly 1 matching line
    expect(matchingLines.length).toBe(1);
    // The matching line contains stroke= (track circle arc stroke attribute)
    expect(matchingLines[0]).toContain("stroke=");
  });
});
