/**
 * tests/e2e/m8.a11y.spec.ts — Milestone 8 accessibility tests (axe-core via Playwright).
 *
 * Execution is deferred to Vercel preview — this sandbox cannot launch chromium
 * (binary missing, confirmed by M4a–M4g EVALUATOR reports and status.md).
 * Tests are authored here as real test() blocks; run them against the deployed preview URL.
 * Guards: `if ((await x.count()) > 0)` per ADR-039 + ADR-022.
 *
 * Per AC #15: localStorage cleared in beforeEach (ADR-018).
 *
 * Covers: A-m8-001
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// AC #15: clear localStorage before each case
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload();
});

// ─── A-m8-001: zero axe violations before and after hydration ────────────────

test("A-m8-001: zero axe violations on building page in empty state and after hydration from pre-seeded dharma:v1", async ({
  page,
}) => {
  // State (a): fresh load with empty localStorage — no hydration-mismatch
  await page.goto("/");
  await page.waitForTimeout(300); // let hydration effect run

  const hero = page.locator("section").first();
  if ((await hero.count()) > 0) {
    // axe scan in empty/first-run state
    const resultsEmpty = await new AxeBuilder({ page }).analyze();
    expect(resultsEmpty.violations).toHaveLength(0);

    // State (b): pre-seed dharma:v1 with one block + one brick, reload, hydrate
    await page.evaluate(() => {
      const state = {
        schemaVersion: 1,
        programStart: "2026-05-01",
        blocks: [
          {
            id: "b1",
            name: "Morning",
            start: "09:00",
            recurrence: { kind: "every-day" },
            categoryId: null,
            bricks: [
              {
                id: "n1",
                name: "Meditate",
                kind: "tick",
                done: false,
                hasDuration: false,
                categoryId: null,
                parentBlockId: "b1",
              },
            ],
          },
        ],
        categories: [],
        looseBricks: [],
      };
      localStorage.setItem("dharma:v1", JSON.stringify(state));
    });

    await page.reload();
    await page.waitForTimeout(300); // let hydration effect run

    const heroAfterHydration = page.locator("section").first();
    if ((await heroAfterHydration.count()) > 0) {
      // axe scan after hydration from pre-seeded state
      const resultsHydrated = await new AxeBuilder({ page }).analyze();
      expect(resultsHydrated.violations).toHaveLength(0);
    }
  }
});
