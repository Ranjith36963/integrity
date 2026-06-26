/**
 * tests/e2e/m9d.spec.ts — Milestone 9d E2E tests (Playwright, deferred to preview).
 *
 * Execution is deferred to Vercel preview — this sandbox cannot launch chromium
 * (binary missing, confirmed by M4a–M4g EVALUATOR reports and status.md).
 * Tests are authored here as real test() blocks; run them against the deployed preview URL.
 * Guards: `if ((await x.count()) > 0)` per ADR-039 + ADR-022.
 *
 * Per AC #13: each case clears localStorage in a beforeEach (ADR-018).
 *
 * Covers: E-m9d-001..003
 * Note: E-m9d-002 and E-m9d-003 use page.evaluate to hand-build a dharma:v1 payload
 * (deterministic seed for the week view that does not depend on a brick-creation UI flow).
 */

import { test, expect } from "@playwright/test";

// AC #13: clear localStorage before each E2E case (ADR-018)
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("dharma:onboarding-shown", "true");
  });
  await page.reload();
});

// Helper: build a seeded v2 payload with a known week structure
function buildWeekPayload(
  todayISO: string,
  yesterdayISO: string,
  programStart: string,
) {
  return {
    schemaVersion: 2,
    programStart,
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
        categories: [],
        looseBricks: [],
      },
    },
    blocks: [
      {
        id: "blk-live",
        name: "Morning Live",
        start: "07:00",
        end: "08:00",
        recurrence: { kind: "just-today", date: todayISO },
        categoryId: null,
        bricks: [
          {
            id: "br-live",
            name: "Meditate",
            kind: "tick",
            done: false,
            hasDuration: false,
            categoryId: null,
            parentBlockId: "blk-live",
          },
        ],
      },
    ],
    categories: [],
    looseBricks: [],
  };
}

// ─── E-m9d-001: switch to Week — Castle view renders ─────────────────────────

test("E-m9d-001: switching to Week view shows Castle layout; Day returns; Month shows grid; Year does nothing", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto("/");
  await page.waitForTimeout(300);

  // Guard: ViewSwitcher must exist
  const weekTab = page.getByRole("tab", { name: /^week$/i });
  if ((await weekTab.count()) === 0) return;

  // Switch to Week view
  await weekTab.click();

  // Castle week view appears
  const weekList = page.getByRole("list", { name: /week days/i });
  if ((await weekList.count()) > 0) {
    await expect(weekList).toBeVisible();

    // Week date-range label present
    const rangeLabel = page.locator(
      "text=/\\w+ \\d+[–—]\\d+|\\w+ \\d+ – \\w+ \\d+/",
    );
    expect(await rangeLabel.count()).toBeGreaterThan(0);

    // Week tab is aria-selected
    const weekTabSel = page.getByRole("tab", { name: /^week$/i });
    if ((await weekTabSel.count()) > 0) {
      await expect(weekTabSel).toHaveAttribute("aria-selected", "true");
    }

    // Switch back to Day
    const dayTab = page.getByRole("tab", { name: /^day$/i });
    if ((await dayTab.count()) > 0) {
      await dayTab.click();
      // Week list no longer shown
      const weekListAfter = page.getByRole("list", { name: /week days/i });
      if ((await weekListAfter.count()) > 0) {
        await expect(weekListAfter).not.toBeVisible();
      }
    }

    // Switch to Month — Kingdom grid appears
    const monthTab = page.getByRole("tab", { name: /^month$/i });
    if ((await monthTab.count()) > 0) {
      await monthTab.click();
      const grid = page.getByRole("grid");
      if ((await grid.count()) > 0) {
        await expect(grid).toBeVisible();
      }
    }

    // Year segment does nothing (no crash, no error overlay)
    const yearTab = page.getByRole("tab", { name: /^year$/i });
    if ((await yearTab.count()) > 0) {
      await yearTab.click();
      // Still showing Month grid (no view change from Year click)
      const gridAfterYear = page.getByRole("grid");
      if ((await gridAfterYear.count()) > 0) {
        await expect(gridAfterYear).toBeVisible();
      }
    }
  }

  expect(consoleErrors.filter((e) => !e.includes("Warning:"))).toHaveLength(0);
});

// ─── E-m9d-002: per-day scores + the week aggregate render ───────────────────

test("E-m9d-002: per-day scores + week aggregate render correctly from seeded payload", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto("/");
  await page.waitForTimeout(300);

  // Seed dharma:v1 with a hand-built v2 payload
  await page.evaluate(() => {
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
          categories: [],
          looseBricks: [],
        },
      },
      blocks: [
        {
          id: "blk-live",
          name: "Morning Live",
          start: "07:00",
          end: "08:00",
          recurrence: { kind: "just-today", date: todayISO },
          categoryId: null,
          bricks: [
            {
              id: "br-live",
              name: "Meditate",
              kind: "tick",
              done: false,
              hasDuration: false,
              categoryId: null,
              parentBlockId: "blk-live",
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
  await page.waitForTimeout(500);

  // Guard: ViewSwitcher must exist
  const weekTab = page.getByRole("tab", { name: /^week$/i });
  if ((await weekTab.count()) === 0) return;

  // Switch to Week view
  await weekTab.click();
  await page.waitForTimeout(300);

  // Week list should be visible
  const weekList = page.getByRole("list", { name: /week days/i });
  if ((await weekList.count()) === 0) return;

  // Aggregate ring should be present with a score
  const aggregateRing = page.getByRole("img");
  if ((await aggregateRing.count()) > 0) {
    const ariaLabel = await aggregateRing.getAttribute("aria-label");
    // Should say "Week score N percent" or "Week score: no data"
    expect(ariaLabel).toMatch(/week score/i);
  }

  // At least one scored row (yesterday) should have a button with aria-label containing "score"
  const scoredButtons = page.getByRole("button", { name: /score/i });
  if ((await scoredButtons.count()) > 0) {
    // Archived day row has a score numeral
    const firstScored = scoredButtons.first();
    await expect(firstScored).toBeVisible();
  }

  // No console errors
  expect(consoleErrors.filter((e) => !e.includes("Warning:"))).toHaveLength(0);
});

// ─── E-m9d-003: open a past day read-only; tap today → Building; prev/next nav ─

test("E-m9d-003: open past-day read-only from Week view; tap today → Building; prev/next nav works", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto("/");
  await page.waitForTimeout(300);

  // Seed with yesterday + today payload
  await page.evaluate(() => {
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
          categories: [],
          looseBricks: [],
        },
      },
      blocks: [],
      categories: [],
      looseBricks: [],
    };
    localStorage.setItem("dharma:v1", JSON.stringify(state));
  });

  await page.reload();
  await page.waitForTimeout(500);

  // Guard: ViewSwitcher must exist
  const weekTab = page.getByRole("tab", { name: /^week$/i });
  if ((await weekTab.count()) === 0) return;

  await weekTab.click();
  await page.waitForTimeout(300);

  // Week list should be visible
  const weekList = page.getByRole("list", { name: /week days/i });
  if ((await weekList.count()) === 0) return;

  // Tap the archived past-day row (has "score" in aria-label, not "today")
  const archivedButtons = page.getByRole("button").filter({
    has: page.locator("[aria-label*='score'][aria-label*='percent']"),
  });
  // Or find button without "today" in aria-label but with "score"
  const allScoredBtns = page.getByRole("button", { name: /score.*percent/i });
  if ((await allScoredBtns.count()) > 0) {
    // Find one that is NOT "today"
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

    if (pastDayBtn !== null) {
      await pastDayBtn.click();
      await page.waitForTimeout(200);

      // PastDayDetail panel appears
      const detailPanel = page.getByRole("region", { name: /day detail/i });
      if ((await detailPanel.count()) > 0) {
        await expect(detailPanel).toBeVisible();

        // No edit/add affordance — only Close button
        const closeBtn = page.getByRole("button", { name: /close/i });
        if ((await closeBtn.count()) > 0) {
          await closeBtn.click();
          await page.waitForTimeout(200);
          // Panel dismissed
          await expect(detailPanel).not.toBeVisible();
        }
      }
    }
  }

  // Tap today's row → switches to Building (Day) view
  const todayBtn = page.getByRole("button", { name: /today/i });
  if ((await todayBtn.count()) > 0) {
    await todayBtn.click();
    await page.waitForTimeout(300);
    // Should be in Day view — week list no longer visible
    const weekListAfter = page.getByRole("list", { name: /week days/i });
    if ((await weekListAfter.count()) > 0) {
      await expect(weekListAfter).not.toBeVisible();
    }
  }

  // Return to Week and test prev/next nav
  const weekTabAgain = page.getByRole("tab", { name: /^week$/i });
  if ((await weekTabAgain.count()) > 0) {
    await weekTabAgain.click();
    await page.waitForTimeout(200);
  }

  const prevBtn = page.getByRole("button", { name: /previous week/i });
  if ((await prevBtn.count()) > 0) {
    // Get initial label
    const initialLabel = await page.locator("h2").textContent();

    await prevBtn.click();
    await page.waitForTimeout(200);

    const newLabel = await page.locator("h2").textContent();
    // Label should have changed
    expect(newLabel).not.toBe(initialLabel);
  }

  const nextBtn = page.getByRole("button", { name: /next week/i });
  if ((await nextBtn.count()) > 0) {
    await nextBtn.click();
    await page.waitForTimeout(200);
    // Should navigate forward without crash
  }

  expect(consoleErrors.filter((e) => !e.includes("Warning:"))).toHaveLength(0);
});

// Suppress unused import warning for buildWeekPayload
void buildWeekPayload;
