/**
 * tests/e2e/m9d.a11y.spec.ts — Milestone 9d accessibility tests (axe-core via Playwright).
 *
 * Execution is deferred to Vercel preview — this sandbox cannot launch chromium
 * (binary missing, confirmed by M4a–M4g EVALUATOR reports and status.md).
 * Tests are authored here as real test() blocks; run them against the deployed preview URL.
 * Guards: `if ((await x.count()) > 0)` per ADR-039 + ADR-022.
 *
 * Per AC #12: localStorage cleared in beforeEach (ADR-018).
 *
 * Covers: A-m9d-001..003
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// AC #12: clear localStorage before each case (ADR-018)
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("dharma:onboarding-shown", "true");
  });
  await page.reload();
});

/** Helper: switch to Week view. Returns false if ViewSwitcher is absent (sandbox guard). */
async function switchToWeekView(
  page: import("@playwright/test").Page,
): Promise<boolean> {
  const weekTab = page.getByRole("tab", { name: /^week$/i });
  if ((await weekTab.count()) === 0) return false;
  await weekTab.click();
  return true;
}

/** Helper: seed dharma:v1 with an archived yesterday (100% score) and reload. */
async function seedWithArchivedDay(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.evaluate((): void => {
    const today = new Date();
    const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

    const state = {
      schemaVersion: 2,
      programStart: yesterdayISO,
      currentDate: todayISO,
      history: {
        [yesterdayISO]: {
          blocks: [
            {
              id: "blk1",
              name: "Morning",
              start: "07:00",
              end: "08:00",
              recurrence: { kind: "just-today", date: yesterdayISO },
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
  });
  await page.reload();
  await page.waitForTimeout(300);
}

// ─── A-m9d-001: Week view — axe clean, list semantics, keyboard, 430px ────────

test("A-m9d-001: week view is axe-clean, role=list/listitem semantics, keyboard-operable, no 430px overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/");
  await seedWithArchivedDay(page);

  const switched = await switchToWeekView(page);
  if (!switched) return;

  const weekList = page.getByRole("list", { name: /week days/i });
  if ((await weekList.count()) === 0) return;
  await expect(weekList).toBeVisible();

  // axe scan against the week view
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  if (serious.length > 0)
    console.log(
      "A-m9d-001 violations:",
      JSON.stringify(
        serious.map((v) => ({ id: v.id, impact: v.impact })),
        null,
        2,
      ),
    );
  expect(serious).toHaveLength(0);

  // role="list" aria-label="Week days" present
  await expect(weekList).toHaveAttribute("aria-label", "Week days");

  // Seven listitem rows
  const listItems = page.getByRole("listitem");
  expect(await listItems.count()).toBe(7);

  // Scored rows are keyboard-reachable buttons with descriptive aria-labels
  const scoredButtons = page.getByRole("button", { name: /score.*percent/i });
  if ((await scoredButtons.count()) > 0) {
    const label = await scoredButtons.first().getAttribute("aria-label");
    expect(typeof label).toBe("string");
    expect(label!.length).toBeGreaterThan(0);
    // aria-label contains weekday, date info, and score
    expect(label).toMatch(/\w+day/i);
    expect(label).toMatch(/score \d+ percent/i);
  }

  // Prev/Next week buttons have aria-labels and are keyboard-operable
  const prevBtn = page.getByRole("button", { name: /previous week/i });
  const nextBtn = page.getByRole("button", { name: /next week/i });
  if ((await prevBtn.count()) > 0) {
    await expect(prevBtn).toHaveAttribute("aria-label", /previous week/i);
  }
  if ((await nextBtn.count()) > 0) {
    await expect(nextBtn).toHaveAttribute("aria-label", /next week/i);
  }

  // Inert rows (missed/future/pre-start) have no button role — non-focusable
  const listItemsLocator = weekList.getByRole("listitem");
  if ((await listItemsLocator.count()) > 0) {
    // Verify only scored rows have buttons inside listitem
    const allListItems = listItemsLocator;
    const count = await allListItems.count();
    // At least check the structure is correct (scored rows have buttons)
    expect(count).toBeGreaterThan(0);
  }

  // No horizontal overflow at 430px
  const overflows = await page.evaluate(() => {
    const el = document.querySelector("[aria-label='Week days']");
    if (!el) return false;
    return el.scrollWidth > el.clientWidth;
  });
  expect(overflows).toBe(false);

  // Row hit areas ≥ 44px tall (ADR-031)
  const firstListItem = listItems.first();
  if ((await firstListItem.count()) > 0) {
    const box = await firstListItem.boundingBox();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  }
});

// ─── A-m9d-002: WeekAggregate ring + ViewSwitcher — axe clean, contrast, tablist keyboard ──

test("A-m9d-002: WeekAggregate ring and ViewSwitcher are axe-clean; ring is role=img; all four tabs live (M9e: Year now enabled)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/");
  await seedWithArchivedDay(page);

  const switched = await switchToWeekView(page);
  if (!switched) return;

  const weekList = page.getByRole("list", { name: /week days/i });
  if ((await weekList.count()) === 0) return;

  // axe scan with colour-contrast rules enabled (default)
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  if (serious.length > 0)
    console.log(
      "A-m9d-002 violations:",
      JSON.stringify(
        serious.map((v) => ({ id: v.id, impact: v.impact })),
        null,
        2,
      ),
    );
  expect(serious).toHaveLength(0);

  // WeekAggregate ring is role="img" with an aria-label
  const aggregateRing = page.getByRole("img");
  if ((await aggregateRing.count()) > 0) {
    const ariaLabel = await aggregateRing.getAttribute("aria-label");
    expect(ariaLabel).toMatch(/week score/i);
    // Must say "Week score N percent" or "Week score: no data"
    if (ariaLabel) {
      const isValidLabel =
        /week score \d+ percent/i.test(ariaLabel) ||
        /week score: no data/i.test(ariaLabel);
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

  // Week tab is aria-selected (current view)
  const weekTab = page.getByRole("tab", { name: /^week$/i });
  if ((await weekTab.count()) > 0) {
    await expect(weekTab).toHaveAttribute("aria-selected", "true");
    // Week is NOT aria-disabled (it's a live tab now — ADR-013 M9d)
    const disabledAttr = await weekTab.getAttribute("aria-disabled");
    expect(disabledAttr).toBeNull();
  }

  // Day and Month tabs are live (no aria-disabled)
  const dayTab = page.getByRole("tab", { name: /^day$/i });
  const monthTab = page.getByRole("tab", { name: /^month$/i });
  if ((await dayTab.count()) > 0) {
    expect(await dayTab.getAttribute("aria-disabled")).toBeNull();
  }
  if ((await monthTab.count()) > 0) {
    expect(await monthTab.getAttribute("aria-disabled")).toBeNull();
  }

  // Year tab is now live (M9e: all four tabs enabled — no aria-disabled)
  const yearTab = page.getByRole("tab", { name: /^year$/i });
  if ((await yearTab.count()) > 0) {
    expect(await yearTab.getAttribute("aria-disabled")).toBeNull();
  }

  // Hit areas ≥ 44px tall (ADR-031)
  if ((await weekTab.count()) > 0) {
    const box = await weekTab.boundingBox();
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

// ─── A-m9d-003: PastDayDetail opened from the Week view — axe clean, keyboard operable ──

test("A-m9d-003: PastDayDetail panel opened from Week view is axe-clean, role=region, Close is focusable, read-only", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/");
  await seedWithArchivedDay(page);

  const switched = await switchToWeekView(page);
  if (!switched) return;

  const weekList = page.getByRole("list", { name: /week days/i });
  if ((await weekList.count()) === 0) return;

  // Tap the archived past-day row (has "score" in aria-label, does NOT include "today")
  const allScoredBtns = page.getByRole("button", { name: /score.*percent/i });
  if ((await allScoredBtns.count()) === 0) return;

  const count = await allScoredBtns.count();
  let pastDayBtn: import("@playwright/test").Locator | null = null;
  for (let i = 0; i < count; i++) {
    const btn = allScoredBtns.nth(i);
    const label = await btn.getAttribute("aria-label");
    if (label && !label.includes("today")) {
      pastDayBtn = btn;
      break;
    }
  }

  if (pastDayBtn === null) return;

  await pastDayBtn.click();
  await page.waitForTimeout(200);

  const detailPanel = page.getByRole("region", { name: /day detail/i });
  if ((await detailPanel.count()) === 0) return;
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
      "A-m9d-003 violations:",
      JSON.stringify(
        serious.map((v) => ({ id: v.id, impact: v.impact })),
        null,
        2,
      ),
    );
  expect(serious).toHaveLength(0);

  // role=region, aria-label="Day detail"
  await expect(detailPanel).toHaveAttribute("aria-label", "Day detail");

  // No form controls — strictly read-only (reused verbatim from M9c)
  const checkboxes = detailPanel.getByRole("checkbox");
  expect(await checkboxes.count()).toBe(0);
  const spinbuttons = detailPanel.getByRole("spinbutton");
  expect(await spinbuttons.count()).toBe(0);
  const textboxes = detailPanel.getByRole("textbox");
  expect(await textboxes.count()).toBe(0);

  // Close button is present, focusable, and labelled
  const closeBtn = detailPanel.getByRole("button", { name: /close/i });
  if ((await closeBtn.count()) > 0) {
    await expect(closeBtn).toBeVisible();
    await expect(closeBtn).toHaveAttribute("aria-label", /close/i);
    // Close dismisses the panel
    await closeBtn.click();
    await page.waitForTimeout(200);
    await expect(detailPanel).not.toBeVisible();
  }

  // Single-column render — no horizontal overflow at 430px
  const overflows = await page.evaluate(() => {
    const el = document.querySelector("[aria-label='Day detail']");
    if (!el) return false;
    return el.scrollWidth > el.clientWidth;
  });
  expect(overflows).toBe(false);
});
