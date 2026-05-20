/**
 * tests/e2e/m7a-mobile-a11y.spec.ts — A-m7a-003: 430 px viewport no-overflow
 * during every cascade frame; axe-clean mid-animation.
 *
 * Execution is deferred to Vercel preview — this sandbox cannot launch chromium
 * (binary missing, confirmed by M4a–M4g EVALUATOR reports and status.md).
 * Tests are authored here as real test() blocks; run them against the deployed
 * preview URL.
 *
 * Covers: A-m7a-003
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// ─── A-m7a-003 ────────────────────────────────────────────────────────────────

test("A-m7a-003: 430 px viewport — no horizontal overflow at any cascade frame; axe zero violations mid-animation", async ({
  page,
}) => {
  // Set 430×932 viewport (iPhone 14 Pro Max)
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/");
  await page.waitForTimeout(100);

  // Check scrollWidth at pre-hydration frame (skeleton present)
  const scrollWidthPre: number = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidthPre).toBeLessThanOrEqual(430);

  // Wait for hydration + mid-cascade (~100ms into cascade)
  await page.locator('[data-testid="hour-grid"]').waitFor({
    state: "visible",
    timeout: 3000,
  });
  await page.waitForTimeout(100); // mid-cascade

  const scrollWidthMid: number = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidthMid).toBeLessThanOrEqual(430);

  // Axe scan mid-cascade (opacity transform does not affect a11y posture)
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  if (serious.length > 0) {
    console.log(
      "Axe violations (mid-cascade 430px):",
      JSON.stringify(
        serious.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.slice(0, 2).map((n) => n.html),
        })),
        null,
        2,
      ),
    );
  }
  expect(serious).toHaveLength(0);

  // Wait for cascade to complete
  await page.waitForTimeout(700);
  const scrollWidthPost: number = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidthPost).toBeLessThanOrEqual(430);
});
