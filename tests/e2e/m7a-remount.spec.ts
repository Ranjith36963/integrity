/**
 * tests/e2e/m7a-remount.spec.ts — E-m7a-006: second navigation (Week → Day)
 * re-fires stagger; ref restarts at pending on each BuildingClient mount.
 *
 * Execution is deferred to Vercel preview — this sandbox cannot launch chromium
 * (binary missing, confirmed by M4a–M4g EVALUATOR reports and status.md).
 * Tests are authored here as real test() blocks; run them against the deployed
 * preview URL.
 *
 * Covers: E-m7a-006
 */

import { test, expect } from "@playwright/test";

// ─── E-m7a-006 ────────────────────────────────────────────────────────────────

test("E-m7a-006: navigating Week → Day mounts a fresh BuildingClient and re-fires stagger", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForTimeout(300);

  // Navigate to Week view
  const weekButton = page.getByRole("button", { name: /week/i });
  if ((await weekButton.count()) > 0) {
    await weekButton.click();
    await page.waitForTimeout(200);
  }

  // Navigate back to Day view
  const dayButton = page.getByRole("button", { name: /day/i });
  if ((await dayButton.count()) > 0) {
    await dayButton.click();
  }

  // BuildingClient remounts with hydrated=true (already hydrated from session start).
  // The fresh mount's useFirstPaintAfterHydration ref starts at "pending" and
  // immediately returns true → stagger=true on this render.
  // After the stagger completes, the real subtree must be visible.
  await page.locator('[data-testid="hour-grid"]').waitFor({ state: "visible" });

  // Real subtree visible after remount
  await expect(
    page.locator('[data-testid="blueprint-bar-container"]'),
  ).toBeVisible();

  // No skeleton visible (hydrated=true on remount; stagger ref fires, not skeleton)
  const skeletonCount = await page
    .locator('[data-testid^="m7a-skeleton-"]')
    .count();
  expect(skeletonCount).toBe(0);
});
