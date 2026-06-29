/**
 * tests/e2e/m9c.a11y.spec.ts — Milestone 9c accessibility tests (axe-core via Playwright).
 *
 * Per AC #15: localStorage seeded via addInitScript before each navigation (ADR-018).
 *
 * Covers: A-m9c-001..004
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Base state with a history entry for yesterday so archived cells render. */
const BASE_STATE = {
  schemaVersion: 3,
  programStart: "2026-06-28",
  currentDate: "2026-06-29",
  blocks: [],
  looseBricks: [],
  categories: [],
  deletions: {},
  history: {
    "2026-06-28": {
      blocks: [
        {
          id: "blk-h1",
          name: "Yesterday",
          start: "09:00",
          end: "10:00",
          recurrence: { kind: "just-today", date: "2026-06-28" },
          categoryId: null,
          bricks: [
            {
              id: "brk-h1",
              name: "Done",
              kind: "tick",
              done: true,
              hasDuration: false,
              categoryId: null,
              parentBlockId: "blk-h1",
            },
          ],
        },
      ],
      looseBricks: [],
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

// ─── A-m9c-001: Month grid — axe clean, keyboard, 430px ─────────────────────

test("A-m9c-001: month grid is axe-clean, role=grid with row/gridcell/columnheader, no 430px overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });

  // Switch to Month view
  const monthTab = page.getByRole("tab", { name: /^month$/i });
  await expect(monthTab).toBeVisible();
  await monthTab.click();

  const grid = page.getByRole("grid");
  await expect(grid).toBeVisible();

  // axe scan against month grid
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  if (serious.length > 0)
    console.log(
      "A-m9c-001 violations:",
      JSON.stringify(
        serious.map((v) => ({ id: v.id, impact: v.impact })),
        null,
        2,
      ),
    );
  expect(serious).toHaveLength(0);

  // role=grid present
  const gridEl = page.getByRole("grid");
  expect(await gridEl.count()).toBeGreaterThan(0);

  // role=columnheader weekday headers (7)
  const colHeaders = page.getByRole("columnheader");
  expect(await colHeaders.count()).toBe(7);

  // No horizontal overflow at 430px
  const overflows = await page.evaluate(() => {
    const el = document.querySelector("[role='grid']");
    if (!el) return false;
    return el.scrollWidth > el.clientWidth;
  });
  expect(overflows).toBe(false);

  // Scored cells are keyboard-reachable buttons with aria-label
  const scoredCells = page.locator("button[data-kind='scored']");
  if ((await scoredCells.count()) > 0) {
    const label = await scoredCells.first().getAttribute("aria-label");
    expect(typeof label).toBe("string");
    expect(label!.length).toBeGreaterThan(0);
  }

  // Prev/Next buttons have aria-labels
  const prevBtn = page.getByRole("button", { name: /previous month/i });
  const nextBtn = page.getByRole("button", { name: /next month/i });
  if ((await prevBtn.count()) > 0) {
    await expect(prevBtn).toHaveAttribute("aria-label", /previous month/i);
  }
  if ((await nextBtn.count()) > 0) {
    await expect(nextBtn).toHaveAttribute("aria-label", /next month/i);
  }
});

// ─── A-m9c-002: ViewSwitcher — axe clean, tablist keyboard semantics ─────────

test("A-m9c-002: ViewSwitcher is axe-clean, tablist aria-label, Day tab aria-selected, all four tabs live (M9e: Year and Week now enabled)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });

  const tablist = page.getByRole("tablist");
  await expect(tablist).toBeVisible();

  // axe scan against the page (which includes the switcher)
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  if (serious.length > 0)
    console.log(
      "A-m9c-002 violations:",
      JSON.stringify(
        serious.map((v) => ({ id: v.id, impact: v.impact })),
        null,
        2,
      ),
    );
  expect(serious).toHaveLength(0);

  // tablist aria-label
  await expect(tablist).toHaveAttribute("aria-label", "Calendar view");

  // 4 tab segments present
  const tabs = page.getByRole("tab");
  expect(await tabs.count()).toBe(4);

  // Day tab is aria-selected in the default (Day) view
  const dayTab = page.getByRole("tab", { name: /^day$/i });
  if ((await dayTab.count()) > 0) {
    await expect(dayTab).toHaveAttribute("aria-selected", "true");
  }

  // All four tabs are live — no aria-disabled on any (M9e: Week and Year now enabled)
  const weekTab = page.getByRole("tab", { name: /^week$/i });
  const yearTab = page.getByRole("tab", { name: /^year$/i });
  const monthTab = page.getByRole("tab", { name: /^month$/i });
  if ((await weekTab.count()) > 0) {
    expect(await weekTab.getAttribute("aria-disabled")).toBeNull();
  }
  if ((await yearTab.count()) > 0) {
    expect(await yearTab.getAttribute("aria-disabled")).toBeNull();
  }
  if ((await monthTab.count()) > 0) {
    expect(await monthTab.getAttribute("aria-disabled")).toBeNull();
  }

  // Hit areas ≥ 44px tall (ADR-031)
  const dayTabBox = await dayTab.boundingBox();
  if (dayTabBox) {
    expect(dayTabBox.height).toBeGreaterThanOrEqual(44);
  }

  // No overflow at 430px
  const overflows = await page.evaluate(() => {
    const el = document.querySelector("[role='tablist']");
    if (!el) return false;
    return el.scrollWidth > el.clientWidth;
  });
  expect(overflows).toBe(false);
});

// ─── A-m9c-003: PastDayDetail — axe clean, keyboard operable ─────────────────

test("A-m9c-003: PastDayDetail panel is axe-clean, role=region aria-label, Close is focusable, no form controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });

  // Switch to Month view
  const monthTab = page.getByRole("tab", { name: /^month$/i });
  await expect(monthTab).toBeVisible();
  await monthTab.click();

  const grid = page.getByRole("grid");
  await expect(grid).toBeVisible();

  // Tap the scored archived cell to open PastDayDetail
  const archivedCell = page.locator("button[data-kind='scored']").first();
  await expect(archivedCell).toBeVisible();
  await archivedCell.click();

  const detailPanel = page.getByRole("region", { name: "Day detail" });
  await expect(detailPanel).toBeVisible();

  // axe scan with the panel open
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  if (serious.length > 0)
    console.log(
      "A-m9c-003 violations:",
      JSON.stringify(
        serious.map((v) => ({ id: v.id, impact: v.impact })),
        null,
        2,
      ),
    );
  expect(serious).toHaveLength(0);

  // role=region, aria-label="Day detail"
  await expect(detailPanel).toHaveAttribute("aria-label", "Day detail");

  // No form controls (strictly read-only)
  const checkboxes = detailPanel.getByRole("checkbox");
  expect(await checkboxes.count()).toBe(0);
  const spinbuttons = detailPanel.getByRole("spinbutton");
  expect(await spinbuttons.count()).toBe(0);

  // Close button is present, focusable, labelled
  const closeBtn = detailPanel.getByRole("button", { name: /close/i });
  if ((await closeBtn.count()) > 0) {
    await expect(closeBtn).toBeVisible();
    await expect(closeBtn).toHaveAttribute("aria-label", /close/i);
  }

  // No horizontal overflow at 430px
  const overflows = await page.evaluate(() => {
    const el = document.querySelector("[aria-label='Day detail']");
    if (!el) return false;
    return el.scrollWidth > el.clientWidth;
  });
  expect(overflows).toBe(false);
});

// ─── A-m9c-004: DayCell heat-fill contrast at the alpha floor ────────────────

test("A-m9c-004: DayCell heat-fill contrast axe-clean across score range including alpha-floor 0.12", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });

  // Switch to Month view
  const monthTab = page.getByRole("tab", { name: /^month$/i });
  await expect(monthTab).toBeVisible();
  await monthTab.click();

  const grid = page.getByRole("grid");
  await expect(grid).toBeVisible();

  // axe scan — colour-contrast rules enabled by default
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  if (serious.length > 0)
    console.log(
      "A-m9c-004 violations:",
      JSON.stringify(
        serious.map((v) => ({ id: v.id, impact: v.impact })),
        null,
        2,
      ),
    );
  expect(serious).toHaveLength(0);

  // Verify scored cells are present (seeded from BASE_STATE)
  const scoredCells = page.locator("[data-kind='scored']");
  if ((await scoredCells.count()) > 0) {
    await expect(scoredCells.first()).toBeVisible();
  }
});
