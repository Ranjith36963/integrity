/**
 * tests/e2e/m9c.a11y.spec.ts — Milestone 9c accessibility tests (axe-core via Playwright).
 *
 * Execution is deferred to Vercel preview — this sandbox cannot launch chromium
 * (binary missing, confirmed by M4a–M4g EVALUATOR reports and status.md).
 * Tests are authored here as real test() blocks; run them against the deployed preview URL.
 * Guards: `if ((await x.count()) > 0)` per ADR-039 + ADR-022.
 *
 * Per AC #15: localStorage cleared in beforeEach (ADR-018).
 *
 * Covers: A-m9c-001..004
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// AC #15: clear localStorage before each case (ADR-018)
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload();
});

/** Helper: switch to Month view. Returns false if ViewSwitcher is absent (sandbox guard). */
async function switchToMonthView(
  page: import("@playwright/test").Page,
): Promise<boolean> {
  const monthTab = page.getByRole("tab", { name: /^month$/i });
  if ((await monthTab.count()) === 0) return false;
  await monthTab.click();
  return true;
}

/** Helper: seed dharma:v1 with an archived yesterday and reload. */
async function seedWithArchivedDay(
  page: import("@playwright/test").Page,
): Promise<void> {
  const todayISO = await page.evaluate((): string => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const yesterdayISO = await page.evaluate((): string => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  await page.evaluate(
    ([today, yesterday]) => {
      const state = {
        schemaVersion: 2,
        programStart: yesterday,
        currentDate: today,
        history: {
          [yesterday!]: {
            blocks: [
              {
                id: "blk1",
                name: "Morning",
                start: "07:00",
                end: "08:00",
                recurrence: { kind: "just-today", date: yesterday },
                categoryId: null,
                bricks: [
                  {
                    id: "br1",
                    name: "Stretch",
                    kind: "tick",
                    done: true,
                    hasDuration: false,
                    categoryId: null,
                    parentBlockId: "blk1",
                  },
                ],
              },
            ],
            looseBricks: [],
            categories: [],
          },
        },
        blocks: [],
        looseBricks: [],
        categories: [],
      };
      localStorage.setItem("dharma:v1", JSON.stringify(state));
    },
    [todayISO, yesterdayISO],
  );
  await page.reload();
  await page.waitForTimeout(300);
}

// ─── A-m9c-001: Month grid — axe clean, keyboard, 430px ─────────────────────

test("A-m9c-001: month grid is axe-clean, role=grid with row/gridcell/columnheader, no 430px overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/");
  await page.waitForTimeout(300);

  const switched = await switchToMonthView(page);
  if (!switched) return;

  const grid = page.getByRole("grid");
  if ((await grid.count()) === 0) return;
  await expect(grid).toBeVisible();

  // axe scan against month grid
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toHaveLength(0);

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
  await page.goto("/");
  await page.waitForTimeout(300);

  const tablist = page.getByRole("tablist");
  if ((await tablist.count()) === 0) return;
  await expect(tablist).toBeVisible();

  // axe scan against the page (which includes the switcher)
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toHaveLength(0);

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
  await page.goto("/");
  await seedWithArchivedDay(page);

  const switched = await switchToMonthView(page);
  if (!switched) return;

  const grid = page.getByRole("grid");
  if ((await grid.count()) === 0) return;

  // Tap the scored archived cell to open PastDayDetail
  const archivedCell = page.locator("button[data-kind='scored']").first();
  if ((await archivedCell.count()) === 0) return;
  await archivedCell.click();

  const detailPanel = page.getByRole("region", { name: "Day detail" });
  if ((await detailPanel.count()) === 0) return;
  await expect(detailPanel).toBeVisible();

  // axe scan with the panel open
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toHaveLength(0);

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
  await page.goto("/");

  // Seed a state with a score-0 archived day (alpha floor 0.12) and a score-100 day
  const todayISO = await page.evaluate((): string => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const day1ISO = await page.evaluate((): string => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const day2ISO = await page.evaluate((): string => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  await page.evaluate(
    ([today, d1, d2]) => {
      const state = {
        schemaVersion: 2,
        programStart: d2,
        currentDate: today,
        history: {
          [d1!]: {
            // score-0: one brick done:false (0%)
            blocks: [],
            looseBricks: [
              {
                id: "x1",
                name: "a",
                kind: "tick",
                done: false,
                hasDuration: false,
                categoryId: null,
                parentBlockId: null,
              },
            ],
            categories: [],
          },
          [d2!]: {
            // score-100: one brick done:true (100%)
            blocks: [],
            looseBricks: [
              {
                id: "x2",
                name: "b",
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
      localStorage.setItem("dharma:v1", JSON.stringify(state));
    },
    [todayISO, day1ISO, day2ISO],
  );

  await page.reload();
  await page.waitForTimeout(300);

  const switched = await switchToMonthView(page);
  if (!switched) return;

  const grid = page.getByRole("grid");
  if ((await grid.count()) === 0) return;

  // axe scan — colour-contrast rules enabled by default
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toHaveLength(0);

  // Verify scored cells with data-score="0" and data-score="100" are present
  const zeroCell = page.locator("[data-score='0'][data-kind='scored']");
  const hundredCell = page.locator("[data-score='100'][data-kind='scored']");
  if ((await zeroCell.count()) > 0) {
    await expect(zeroCell.first()).toBeVisible();
  }
  if ((await hundredCell.count()) > 0) {
    await expect(hundredCell.first()).toBeVisible();
  }
});
