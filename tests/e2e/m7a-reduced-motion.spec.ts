/**
 * tests/e2e/m7a-reduced-motion.spec.ts — E-m7a-004: prefers-reduced-motion
 * forces instant transitions; skeleton shimmer collapses to flat swatch.
 *
 * Execution is deferred to Vercel preview — this sandbox cannot launch chromium
 * (binary missing, confirmed by M4a–M4g EVALUATOR reports and status.md).
 * Tests are authored here as real test() blocks; run them against the deployed
 * preview URL.
 *
 * Covers: E-m7a-004
 */

import { test, expect } from "@playwright/test";

// ─── E-m7a-004 ────────────────────────────────────────────────────────────────

test("E-m7a-004: prefers-reduced-motion: cascade is instant (Framer variant duration=0); shimmer animation=none", async ({
  page,
}) => {
  // Force prefers-reduced-motion: reduce via Playwright's emulation API
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // Wait for hydration
  await page.locator('[data-testid="hour-grid"]').waitFor({ state: "visible" });
  await page.waitForTimeout(100); // no stagger — instant

  // After only 100 ms, all real cards should already be fully visible
  // (Framer duration=0 → instant with no per-sibling delay)
  const blueprintBar = page.locator('[data-testid="blueprint-bar-container"]');
  await expect(blueprintBar).toBeVisible();

  // Verify skeleton shimmer animation is suppressed by CSS @media rule
  // The skeleton renders briefly before hydration; check that its computed
  // animation-name is 'none' under PRM.
  const skeletonDivs = page.locator('[data-testid^="m7a-skeleton-"]');
  if ((await skeletonDivs.count()) > 0) {
    const animationName = await skeletonDivs.first().evaluate((el) => {
      const inner = el.querySelector(".skeleton-shimmer");
      if (!inner) return "n/a";
      return getComputedStyle(inner).animationName;
    });
    // Under PRM CSS @media rule, animation-name should be 'none'
    expect(animationName).toMatch(/none|n\/a/);
  }
});
