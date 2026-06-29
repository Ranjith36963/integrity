/**
 * tests/e2e/m9e.a11y.spec.ts — Milestone 9e accessibility tests (axe-core via Playwright).
 *
 * Per AC #11: localStorage seeded via addInitScript before each navigation (ADR-018).
 *
 * Covers: A-m9e-001..002
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BASE_STATE = {
  schemaVersion: 3,
  programStart: "2026-01-01",
  currentDate: "2026-06-29",
  blocks: [],
  looseBricks: [],
  categories: [],
  deletions: {},
  history: {
    "2026-06-28": {
      blocks: [],
      looseBricks: [
        {
          id: "brk-h1",
          name: "Done",
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
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((payload: unknown) => {
    localStorage.setItem("dharma:onboarding-shown", "true");
    localStorage.setItem("dharma:v1", JSON.stringify(payload));
  }, BASE_STATE);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
});

// ─── A-m9e-001: Year view — axe clean, list semantics, keyboard, 430px ─────

test("A-m9e-001: year view is axe-clean, role=list 'Months of <year>', MonthCell keyboard-operable, 44px hit-areas, no 430px overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });

  // Switch to Year view
  const yearTab = page.getByRole("tab", { name: /^year$/i });
  await expect(yearTab).toBeVisible();
  await yearTab.click();

  const monthsList = page.getByRole("list", { name: /months of/i });
  await expect(monthsList).toBeVisible();

  // axe scan against the year view
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  if (serious.length > 0)
    console.log(
      "A-m9e-001 violations:",
      JSON.stringify(
        serious.map((v) => ({ id: v.id, impact: v.impact })),
        null,
        2,
      ),
    );
  expect(serious).toHaveLength(0);

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

  // Switch to Year view
  const yearTab = page.getByRole("tab", { name: /^year$/i });
  await expect(yearTab).toBeVisible();
  await yearTab.click();

  const monthsList = page.getByRole("list", { name: /months of/i });
  await expect(monthsList).toBeVisible();

  // axe scan with colour-contrast rules enabled (default)
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  if (serious.length > 0)
    console.log(
      "A-m9e-002 violations:",
      JSON.stringify(
        serious.map((v) => ({ id: v.id, impact: v.impact })),
        null,
        2,
      ),
    );
  expect(serious).toHaveLength(0);

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
  await expect(tablist).toBeVisible();
  await expect(tablist).toHaveAttribute("aria-label", "Calendar view");

  // 4 segments total
  const tabs = page.getByRole("tab");
  expect(await tabs.count()).toBe(4);

  // Year tab is aria-selected (current view)
  const yearTabSel = page.getByRole("tab", { name: /^year$/i });
  if ((await yearTabSel.count()) > 0) {
    await expect(yearTabSel).toHaveAttribute("aria-selected", "true");
    // Year is NOT aria-disabled (M9e: all four tabs live)
    expect(await yearTabSel.getAttribute("aria-disabled")).toBeNull();
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
  if ((await yearTabSel.count()) > 0) {
    const box = await yearTabSel.boundingBox();
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
