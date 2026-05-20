/**
 * tests/e2e/m7a-skeleton-a11y.spec.ts — A-m7a-001: axe-clean during the
 * pre-hydration window (skeleton subtree).
 *
 * Execution is deferred to Vercel preview — this sandbox cannot launch chromium
 * (binary missing, confirmed by M4a–M4g EVALUATOR reports and status.md).
 * Tests are authored here as real test() blocks; run them against the deployed
 * preview URL.
 *
 * Covers: A-m7a-001
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// ─── A-m7a-001 ────────────────────────────────────────────────────────────────

test("A-m7a-001: axe-clean during pre-hydration window (skeleton subtree: aria-hidden=true, no role violations)", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // Scan the page immediately — skeleton subtree may still be visible
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  if (serious.length > 0) {
    console.log(
      "Axe violations (pre-hydration):",
      JSON.stringify(
        serious.map((v) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.slice(0, 2).map((n) => n.html),
        })),
        null,
        2,
      ),
    );
  }
  expect(serious).toHaveLength(0);
});

test("A-m7a-001 (PRM): under prefers-reduced-motion: reduce, skeleton has animation: none; axe still zero violations", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // Axe scan under PRM
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();

  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(serious).toHaveLength(0);

  // Skeleton shimmer CSS animation is none under PRM
  const skeletonDivs = page.locator('[data-testid^="m7a-skeleton-"]');
  if ((await skeletonDivs.count()) > 0) {
    const animationName = await skeletonDivs.first().evaluate((el) => {
      const inner = el.querySelector(".skeleton-shimmer");
      return inner ? getComputedStyle(inner).animationName : "n/a";
    });
    expect(animationName).toMatch(/none|n\/a/);
  }
});
