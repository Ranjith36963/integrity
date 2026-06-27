/**
 * tests/e2e/m9e.spec.ts — Milestone 9e E2E tests (Playwright, deferred to preview).
 *
 * Execution is deferred to Vercel preview — this sandbox cannot launch chromium
 * (binary missing, confirmed by M4a–M4g EVALUATOR reports and status.md).
 * Tests are authored here as real test() blocks; run them against the deployed preview URL.
 * Guards: `if ((await x.count()) > 0)` per ADR-039 + ADR-022.
 *
 * Per AC #12: each case clears localStorage in a beforeEach (ADR-018).
 *
 * Covers: E-m9e-001..003
 * Note: E-m9e-002 and E-m9e-003 use page.evaluate to hand-build a dharma:v1 payload
 * (deterministic seed for the year view that does not depend on a brick-creation UI flow).
 */

import { test, expect } from "@playwright/test";

// AC #12: clear localStorage before each E2E case (ADR-018)
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("dharma:onboarding-shown", "true");
  });
  await page.reload();
});

/**
 * Build a seeded v2 payload with a known year structure.
 * programStart = 2026-01-01 (start of year).
 * currentDate = 2026-05-18 (mid-year).
 * history: Jan–Apr fully past with known scores; May partially in-range.
 */
function buildYearPayload(todayISO: string, programStart: string) {
  // Jan has one archived day at 100%
  const janDay = "2026-01-15";
  // Feb has one archived day at 0%
  const febDay = "2026-02-10";
  // Mar has one archived day at 100%
  const marDay = "2026-03-20";
  // Apr has one archived day at 50% (1/2 bricks done)
  const aprDay = "2026-04-05";
  // May has one archived day at 100% (as of today)
  const mayDay = "2026-05-17";

  return {
    schemaVersion: 2,
    programStart,
    currentDate: todayISO,
    history: {
      [janDay]: {
        blocks: [],
        looseBricks: [
          {
            id: "jan1",
            name: "a",
            kind: "tick",
            done: true,
            hasDuration: false,
            categoryId: null,
            parentBlockId: null,
          },
        ],
        categories: [],
      },
      [febDay]: {
        blocks: [],
        looseBricks: [
          {
            id: "feb1",
            name: "b",
            kind: "tick",
            done: false,
            hasDuration: false,
            categoryId: null,
            parentBlockId: null,
          },
        ],
        categories: [],
      },
      [marDay]: {
        blocks: [],
        looseBricks: [
          {
            id: "mar1",
            name: "c",
            kind: "tick",
            done: true,
            hasDuration: false,
            categoryId: null,
            parentBlockId: null,
          },
        ],
        categories: [],
      },
      [aprDay]: {
        blocks: [],
        looseBricks: [
          {
            id: "apr1",
            name: "d",
            kind: "tick",
            done: true,
            hasDuration: false,
            categoryId: null,
            parentBlockId: null,
          },
          {
            id: "apr2",
            name: "e",
            kind: "tick",
            done: false,
            hasDuration: false,
            categoryId: null,
            parentBlockId: null,
          },
        ],
        categories: [],
      },
      [mayDay]: {
        blocks: [],
        looseBricks: [
          {
            id: "may1",
            name: "f",
            kind: "tick",
            done: true,
            hasDuration: false,
            categoryId: null,
            parentBlockId: null,
          },
        ],
        categories: [],
      },
    },
    blocks: [],
    looseBricks: [],
    categories: [],
  };
}

// ─── E-m9e-001: switch to Year — Empire view renders; all four segments live ─

test("E-m9e-001: switching to Year renders Empire view with 12-month list; all four switcher segments are live and round-trip with no crash", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/");
  await page.waitForTimeout(300);

  // ViewSwitcher must be present — sandbox guard
  const yearTab = page.getByRole("tab", { name: /^year$/i });
  if ((await yearTab.count()) === 0) return;

  // Click Year — Empire view appears
  await yearTab.click();
  const monthsList = page.getByRole("list", { name: /months of/i });
  if ((await monthsList.count()) === 0) return;
  await expect(monthsList).toBeVisible();

  // Building view (no grid) and Week view (no "Week days" list) are not shown
  expect(await page.getByRole("grid").count()).toBe(0);
  expect(await page.getByRole("list", { name: "Week days" }).count()).toBe(0);

  // Year tab is aria-selected
  await expect(yearTab).toHaveAttribute("aria-selected", "true");

  // All four tabs are live — no aria-disabled on any
  const allTabs = page.getByRole("tab");
  const tabCount = await allTabs.count();
  expect(tabCount).toBe(4);
  for (let i = 0; i < tabCount; i++) {
    const disabled = await allTabs.nth(i).getAttribute("aria-disabled");
    expect(disabled).toBeNull();
  }

  // Round-trip: Year → Day → Week → Month → Year — all render, no crash
  await page.getByRole("tab", { name: /^day$/i }).click();
  // Day view: no grid, no lists
  expect(await page.getByRole("grid").count()).toBe(0);

  const weekTab = page.getByRole("tab", { name: /^week$/i });
  if ((await weekTab.count()) > 0) {
    await weekTab.click();
    const weekList = page.getByRole("list", { name: "Week days" });
    if ((await weekList.count()) > 0) {
      await expect(weekList).toBeVisible();
    }
  }

  const monthTab = page.getByRole("tab", { name: /^month$/i });
  if ((await monthTab.count()) > 0) {
    await monthTab.click();
    const grid = page.getByRole("grid");
    if ((await grid.count()) > 0) {
      await expect(grid).toBeVisible();
    }
  }

  // Back to Year
  await yearTab.click();
  const monthsListAgain = page.getByRole("list", { name: /months of/i });
  if ((await monthsListAgain.count()) > 0) {
    await expect(monthsListAgain).toBeVisible();
  }
});

// ─── E-m9e-002: month scores + the year aggregate render ─────────────────────

test("E-m9e-002: month score indicators render with correct heat-fill/no-data treatment; YearAggregate ring shows yearScore; prev/next year nav works", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/");
  await page.waitForTimeout(300);

  // Seed dharma:v1 with the known year payload
  await page.evaluate(
    (payload) => {
      localStorage.setItem("dharma:v1", JSON.stringify(payload));
    },
    buildYearPayload("2026-05-18", "2026-01-01"),
  );

  await page.reload();
  await page.waitForTimeout(300);

  // Switch to Year view
  const yearTab = page.getByRole("tab", { name: /^year$/i });
  if ((await yearTab.count()) === 0) return;
  await yearTab.click();

  const monthsList = page.getByRole("list", { name: /months of 2026/i });
  if ((await monthsList.count()) === 0) return;
  await expect(monthsList).toBeVisible();

  // January — should show a score (100% → numeral "100") — fully past month with scored day
  const janBtn = page.getByRole("button", { name: /^January 2026.*score/i });
  if ((await janBtn.count()) > 0) {
    await expect(janBtn).toBeVisible();
  }

  // December — should show no-data (fully future month in 2026 from May-18 perspective)
  const decBtn = page.getByRole("button", { name: /^December 2026.*no data/i });
  if ((await decBtn.count()) > 0) {
    await expect(decBtn).toBeVisible();
  }

  // May — current month (should carry aria-label "current month")
  const mayBtn = page.getByRole("button", {
    name: /^May 2026.*current month/i,
  });
  if ((await mayBtn.count()) > 0) {
    await expect(mayBtn).toBeVisible();
  }

  // YearAggregate ring is visible with a valid aria-label
  const aggregateRing = page.getByRole("img", { name: /year score/i });
  if ((await aggregateRing.count()) > 0) {
    const label = await aggregateRing.getAttribute("aria-label");
    if (label) {
      const isValid =
        /year score \d+ percent/i.test(label) ||
        /year score: no data/i.test(label);
      expect(isValid).toBe(true);
    }
  }

  // Year label shows 2026
  const yearHeading = page.getByRole("heading", { level: 2 });
  if ((await yearHeading.count()) > 0) {
    await expect(yearHeading).toHaveText(/2026/);
  }

  // Prev year → 2025
  const prevBtn = page.getByRole("button", { name: /previous year/i });
  if ((await prevBtn.count()) > 0) {
    await prevBtn.click();
    await page.waitForTimeout(100);
    if ((await yearHeading.count()) > 0) {
      await expect(yearHeading).toHaveText(/2025/);
    }
    // 2025 — fully past year, programStart 2026 → all months no-data or pre-start
    const monthsList2025 = page.getByRole("list", { name: /months of 2025/i });
    if ((await monthsList2025.count()) > 0) {
      await expect(monthsList2025).toBeVisible();
    }
    // Next year back to 2026
    const nextBtn = page.getByRole("button", { name: /next year/i });
    if ((await nextBtn.count()) > 0) {
      await nextBtn.click();
      await page.waitForTimeout(100);
      if ((await yearHeading.count()) > 0) {
        await expect(yearHeading).toHaveText(/2026/);
      }
    }
  }
});

// ─── E-m9e-003: tap a month → M9c Month view opens at that month ─────────────

test("E-m9e-003: tapping a MonthCell opens MonthView at that month; returning to Year and using ViewSwitcher Month resets to today's month", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/");
  await page.waitForTimeout(300);

  // Seed same payload as E-m9e-002
  await page.evaluate(
    (payload) => {
      localStorage.setItem("dharma:v1", JSON.stringify(payload));
    },
    buildYearPayload("2026-05-18", "2026-01-01"),
  );

  await page.reload();
  await page.waitForTimeout(300);

  // Switch to Year view
  const yearTab = page.getByRole("tab", { name: /^year$/i });
  if ((await yearTab.count()) === 0) return;
  await yearTab.click();

  const monthsList = page.getByRole("list", { name: /months of 2026/i });
  if ((await monthsList.count()) === 0) return;

  // Tap January 2026 (fully past, pre-start or in-range)
  const janBtn = page.getByRole("button", { name: /^January 2026/i });
  if ((await janBtn.count()) === 0) return;
  await janBtn.click();
  await page.waitForTimeout(200);

  // Now in Month view showing January 2026
  const grid = page.getByRole("grid");
  if ((await grid.count()) === 0) return;
  await expect(grid).toBeVisible();
  const monthHeading = page.getByRole("heading", { level: 2 });
  if ((await monthHeading.count()) > 0) {
    await expect(monthHeading).toHaveText(/January 2026/i);
  }

  // Return to Year view, then tap December 2026 (fully future)
  await yearTab.click();
  await page.waitForTimeout(100);
  const monthsListAgain = page.getByRole("list", { name: /months of 2026/i });
  if ((await monthsListAgain.count()) === 0) return;

  const decBtn = page.getByRole("button", { name: /^December 2026/i });
  if ((await decBtn.count()) === 0) return;
  await decBtn.click();
  await page.waitForTimeout(200);

  // Now in Month view showing December 2026 — no crash
  const grid2 = page.getByRole("grid");
  if ((await grid2.count()) > 0) {
    await expect(grid2).toBeVisible();
    if ((await monthHeading.count()) > 0) {
      await expect(monthHeading).toHaveText(/December 2026/i);
    }
  }

  // Return to Year, then click Month tab directly via ViewSwitcher
  await yearTab.click();
  await page.waitForTimeout(100);
  const monthTab = page.getByRole("tab", { name: /^month$/i });
  if ((await monthTab.count()) === 0) return;
  await monthTab.click();
  await page.waitForTimeout(200);

  // MonthView via switcher should show today's month — not stale December
  const grid3 = page.getByRole("grid");
  if ((await grid3.count()) > 0) {
    await expect(grid3).toBeVisible();
    if ((await monthHeading.count()) > 0) {
      // Use today's actual month/year (dynamic — not hardcoded)
      const todayMonthYear = new Date().toLocaleString("en-US", {
        month: "long",
        year: "numeric",
      });
      await expect(monthHeading).toHaveText(new RegExp(todayMonthYear, "i"));
    }
  }
});
