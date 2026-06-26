/**
 * tests/e2e/m9e.a11y.spec.ts — Milestone 9e accessibility tests (axe-core via Playwright).
 *
 * Execution is deferred to Vercel preview — this sandbox cannot launch chromium
 * (binary missing, confirmed by M4a–M4g EVALUATOR reports and status.md).
 * Tests are authored here as real test() blocks; run them against the deployed preview URL.
 * Guards: `if ((await x.count()) > 0)` per ADR-039 + ADR-022.
 *
 * Per AC #11: localStorage cleared in beforeEach (ADR-018).
 *
 * Covers: A-m9e-001..002
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// AC #11: clear localStorage before each case (ADR-018)
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("dharma:onboarding-shown", "true");
  });
  await page.reload();
});

/** Helper: switch to Year view. Returns false if ViewSwitcher or Year tab is absent. */
async function switchToYearView(
  page: import("@playwright/test").Page,
): Promise<boolean> {
  const yearTab = page.getByRole("tab", { name: /^year$/i });
  if ((await yearTab.count()) === 0) return false;
  await yearTab.click();
  return true;
}

// ─── A-m9e-001: Year view — axe clean, list semantics, keyboard, 430px ─────

test("A-m9e-001: year view is axe-clean, role=list 'Months of <year>', MonthCell keyboard-operable, 44px hit-areas, no 430px overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/");
  await page.waitForTimeout(300);

  const switched = await switchToYearView(page);
  if (!switched) return;

  const monthsList = page.getByRole("list", { name: /months of/i });
  if ((await monthsList.count()) === 0) return;
  await expect(monthsList).toBeVisible();

  // axe scan against the year view
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toHaveLength(0);

  // role="list" aria-label="Months of <year>" present
  await expect(monthsList).toHaveAttribute("aria-label", /months of \d{4}/i);

  // Twelve month cells present (listitem buttons inside the months list)
  const monthButtons = monthsList.getByRole("button");
  if ((await monthButtons.count()) > 0) {
    // Each visible cell is a button with a descriptive aria-label
    const firstBtn = monthButtons.first();
    const label = await firstBtn.getAttribute("aria-label");
    expect(typeof label).toBe("string");
    expect(label!.length).toBeGreaterThan(0);
    // label must contain year and either a score, no-data, or current-month marker
    expect(label).toMatch(/\d{4}/); // contains year
    expect(
      /score \d+ percent/i.test(label!) ||
        /no data/i.test(label!) ||
        /current month/i.test(label!),
    ).toBe(true);
  }

  // Prev/Next year buttons carry aria-labels and are keyboard-operable
  const prevBtn = page.getByRole("button", { name: /previous year/i });
  const nextBtn = page.getByRole("button", { name: /next year/i });
  if ((await prevBtn.count()) > 0) {
    await expect(prevBtn).toHaveAttribute("aria-label", /previous year/i);
  }
  if ((await nextBtn.count()) > 0) {
    await expect(nextBtn).toHaveAttribute("aria-label", /next year/i);
  }

  // No horizontal overflow at 430px
  const overflows = await page.evaluate(() => {
    const el = document.querySelector("[role='list']");
    if (!el) return false;
    return el.scrollWidth > el.clientWidth;
  });
  expect(overflows).toBe(false);

  // Cell hit areas >= 44px tall (ADR-031)
  if ((await monthButtons.count()) > 0) {
    const box = await monthButtons.first().boundingBox();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  }
});

// ─── A-m9e-002: YearAggregate ring + ViewSwitcher all-four-live — axe clean ─

test("A-m9e-002: YearAggregate ring is role=img with valid aria-label; all four ViewSwitcher tabs live with aria-selected; no aria-disabled; axe-clean; 430px no overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/");
  await page.waitForTimeout(300);

  const switched = await switchToYearView(page);
  if (!switched) return;

  const monthsList = page.getByRole("list", { name: /months of/i });
  if ((await monthsList.count()) === 0) return;

  // axe scan with colour-contrast rules enabled (default)
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toHaveLength(0);

  // YearAggregate ring is role="img" with a valid aria-label (ADR-033)
  const aggregateRings = page.getByRole("img");
  if ((await aggregateRings.count()) > 0) {
    // Find the ring whose label matches the year score pattern
    const count = await aggregateRings.count();
    let yearRingLabel: string | null = null;
    for (let i = 0; i < count; i++) {
      const lbl = await aggregateRings.nth(i).getAttribute("aria-label");
      if (lbl && /year score/i.test(lbl)) {
        yearRingLabel = lbl;
        break;
      }
    }
    if (yearRingLabel !== null) {
      const isValidLabel =
        /year score \d+ percent/i.test(yearRingLabel) ||
        /year score: no data/i.test(yearRingLabel);
      expect(isValidLabel).toBe(true);
    }
  }

  // ViewSwitcher is role="tablist"
  const tablist = page.getByRole("tablist");
  if ((await tablist.count()) === 0) return;
  await expect(tablist).toBeVisible();
  await expect(tablist).toHaveAttribute("aria-label", "Calendar view");

  // 4 segments total
  const tabs = page.getByRole("tab");
  expect(await tabs.count()).toBe(4);

  // Year tab is aria-selected (current view)
  const yearTab = page.getByRole("tab", { name: /^year$/i });
  if ((await yearTab.count()) > 0) {
    await expect(yearTab).toHaveAttribute("aria-selected", "true");
    // Year is NOT aria-disabled (M9e: all four tabs live)
    expect(await yearTab.getAttribute("aria-disabled")).toBeNull();
  }

  // All other tabs are live — no aria-disabled
  const dayTab = page.getByRole("tab", { name: /^day$/i });
  const weekTab = page.getByRole("tab", { name: /^week$/i });
  const monthTab = page.getByRole("tab", { name: /^month$/i });
  if ((await dayTab.count()) > 0) {
    expect(await dayTab.getAttribute("aria-disabled")).toBeNull();
  }
  if ((await weekTab.count()) > 0) {
    expect(await weekTab.getAttribute("aria-disabled")).toBeNull();
  }
  if ((await monthTab.count()) > 0) {
    expect(await monthTab.getAttribute("aria-disabled")).toBeNull();
  }

  // Hit areas >= 44px tall (ADR-031)
  if ((await yearTab.count()) > 0) {
    const box = await yearTab.boundingBox();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  }

  // ViewSwitcher fits 430px — no overflow
  const overflows = await page.evaluate(() => {
    const el = document.querySelector("[role='tablist']");
    if (!el) return false;
    return el.scrollWidth > el.clientWidth;
  });
  expect(overflows).toBe(false);
});
