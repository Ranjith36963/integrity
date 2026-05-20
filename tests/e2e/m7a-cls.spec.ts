/**
 * tests/e2e/m7a-cls.spec.ts — E-m7a-003: skeleton-to-real CLS (Cumulative
 * Layout Shift) is below 0.1 (SPEC AC #9).
 *
 * Execution is deferred to Vercel preview — this sandbox cannot launch chromium
 * (binary missing, confirmed by M4a–M4g EVALUATOR reports and status.md).
 * Tests are authored here as real test() blocks; run them against the deployed
 * preview URL.
 *
 * Covers: E-m7a-003
 */

import { test, expect } from "@playwright/test";

// ─── E-m7a-003 ────────────────────────────────────────────────────────────────

test("E-m7a-003: skeleton-to-real swap causes CLS below 0.1 (layout-shift API)", async ({
  page,
}) => {
  // Inject PerformanceObserver to record layout-shift entries
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__clsEntries = [];
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PerformanceEntry subtype
        const e = entry as any;
        if (!e.hadRecentInput) {
          (window as unknown as Record<string, unknown[]>).__clsEntries.push(
            e.value,
          );
        }
      }
    });
    po.observe({ type: "layout-shift", buffered: true });
  });

  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // Wait for the swap and stagger to complete
  await page.locator('[data-testid="hour-grid"]').waitFor({ state: "visible" });
  await page.waitForTimeout(800);

  // Sum all layout-shift values
  const cls: number = await page.evaluate(() => {
    const entries = (window as unknown as Record<string, number[]>)
      .__clsEntries;
    return entries.reduce((sum: number, v: number) => sum + v, 0);
  });

  // SPEC AC #9: CLS must be below 0.1 (Google "Good" threshold)
  expect(cls).toBeLessThan(0.1);
});
