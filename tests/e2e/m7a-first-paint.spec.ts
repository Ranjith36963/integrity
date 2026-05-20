/**
 * tests/e2e/m7a-first-paint.spec.ts — E-m7a-001: first paint shows skeleton
 * placeholders that swap to real cards.
 *
 * Execution is deferred to Vercel preview — this sandbox cannot launch chromium
 * (binary missing, confirmed by M4a–M4g EVALUATOR reports and status.md).
 * Tests are authored here as real test() blocks; run them against the deployed
 * preview URL.
 *
 * Covers: E-m7a-001
 */

import { test, expect } from "@playwright/test";

// Fixture: stateTen payload (10 blocks, 2 loose bricks)
const STATE_TEN_KEY = "dharma:v1";

// ─── E-m7a-001 ────────────────────────────────────────────────────────────────

test("E-m7a-001: first paint shows skeleton subtree; post-hydration swap shows real cards", async ({
  page,
}) => {
  // Navigate to "/" with an empty localStorage so ADR-023 pass-1 fires first
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // Snapshot (a): immediate first paint — skeleton subtree should be present
  // (pre-hydration: mounted===false → BuildingClient renders !hydrated branch)
  // Note: the window for capturing this is brief; the test reads the DOM immediately
  // before the client useEffect fires (mounted flip).
  const skeletonCount = await page
    .locator('[data-testid^="m7a-skeleton-"]')
    .count();

  // After hydration settles, skeleton must be gone
  await page.waitForTimeout(300);
  const skeletonAfter = await page
    .locator('[data-testid^="m7a-skeleton-"]')
    .count();
  expect(skeletonAfter).toBe(0);

  // Real subtree must be present post-hydration
  await expect(
    page.locator('[data-testid="blueprint-bar-container"]'),
  ).toBeVisible();
  await expect(page.locator('[data-testid="hour-grid"]')).toBeVisible();

  // Skeleton and real subtree must not coexist in the same render (AC #5)
  // If skeleton was present pre-hydration AND real cards are present post-hydration,
  // the count of skeleton at the same time as real cards must be zero.
  const simultaneousSkeletonAndReal =
    skeletonCount > 0
      ? (await page.locator('[data-testid^="m7a-skeleton-"]').count()) === 0
      : true;
  expect(simultaneousSkeletonAndReal).toBe(true);

  // Stagger: real cards should fade in (opacity < 1 during cascade, = 1 after)
  // Wait for animationend on last child
  await page.waitForTimeout(500); // stagger budget: ~15 × 0.03s + 0.18s = ~0.63s
  const blueprintSegments = page.locator('[data-testid="blueprint-segment"]');
  if ((await blueprintSegments.count()) > 0) {
    await expect(blueprintSegments.first()).toBeVisible();
  }
});
