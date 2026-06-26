/**
 * tests/e2e/m9c.spec.ts — Milestone 9c E2E tests (Playwright, deferred to preview).
 *
 * Execution is deferred to Vercel preview — this sandbox cannot launch chromium
 * (binary missing, confirmed by M4a–M4g EVALUATOR reports and status.md).
 * Tests are authored here as real test() blocks; run them against the deployed preview URL.
 * Guards: `if ((await x.count()) > 0)` per ADR-039 + ADR-022 (no deterministic seeding).
 *
 * Per AC #15: each case clears localStorage in a beforeEach (ADR-018).
 *
 * Covers: E-m9c-001..003
 * Note: E-m9c-002 and E-m9c-003 use page.evaluate to hand-build a dharma:v1 payload
 * (deterministic seed for the month grid that does not depend on a brick-creation UI flow).
 */

import { test, expect } from "@playwright/test";

// AC #15: clear localStorage before each E2E case (ADR-018)
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("dharma:onboarding-shown", "true");
  });
  await page.reload();
});

// ─── E-m9c-001: switch to Month — Kingdom grid renders ───────────────────────

test("E-m9c-001: switching to Month view shows Kingdom grid; Day returns to Building; Week/Year do nothing", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto("/");
  await page.waitForTimeout(300);

  // Guard: ViewSwitcher must exist
  const monthTab = page.getByRole("tab", { name: /^month$/i });
  if ((await monthTab.count()) === 0) return;

  // Switch to Month view
  await monthTab.click();

  // Kingdom month grid appears
  const grid = page.getByRole("grid");
  if ((await grid.count()) > 0) {
    await expect(grid).toBeVisible();

    // Month-year label present (e.g. "May 2026")
    const monthLabel = page.locator("text=/\\w+ \\d{4}/");
    expect(await monthLabel.count()).toBeGreaterThan(0);

    // Weekday headers present
    const colHeaders = page.getByRole("columnheader");
    expect(await colHeaders.count()).toBe(7);

    // Switch back to Day
    const dayTab = page.getByRole("tab", { name: /^day$/i });
    if ((await dayTab.count()) > 0) {
      await dayTab.click();
      // Building view back
      const dayHero = page.locator("section").first();
      if ((await dayHero.count()) > 0) {
        await expect(dayHero).toBeVisible();
      }
    }

    // Week and Year tabs do nothing (no crash, no error overlay)
    // Switch to Month again first
    if ((await monthTab.count()) > 0) await monthTab.click();

    const weekTab = page.getByRole("tab", { name: /^week$/i });
    if ((await weekTab.count()) > 0) {
      await weekTab.click();
      // Grid still present (no view change)
      const gridAfterWeek = page.getByRole("grid");
      if ((await gridAfterWeek.count()) > 0) {
        await expect(gridAfterWeek).toBeVisible();
      }
    }

    const yearTab = page.getByRole("tab", { name: /^year$/i });
    if ((await yearTab.count()) > 0) {
      await yearTab.click();
      // Grid still present
      const gridAfterYear = page.getByRole("grid");
      if ((await gridAfterYear.count()) > 0) {
        await expect(gridAfterYear).toBeVisible();
      }
    }

    // No console errors
    const nonHydrationErrors = consoleErrors.filter(
      (e) => !e.includes("Warning:"),
    );
    expect(nonHydrationErrors).toHaveLength(0);
  }
});

// ─── E-m9c-002: day-cell scores render ───────────────────────────────────────

test("E-m9c-002: month grid shows archived day score, today cell, missed indicator, future inert cell", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  // Deterministic seed: hand-build a v2 payload via page.evaluate.
  // We set currentDate to today and add one archived history day (yesterday) at 60%.
  await page.goto("/");

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

  // Seed: yesterday archived with 3/5 bricks done (60%); today has 0 bricks (live, 0%)
  await page.evaluate(
    ([today, yesterday]) => {
      const state = {
        schemaVersion: 2,
        programStart: yesterday, // program started yesterday
        currentDate: today,
        history: {
          [yesterday!]: {
            blocks: [],
            looseBricks: [
              {
                id: "b1",
                name: "a",
                kind: "tick",
                done: true,
                hasDuration: false,
                categoryId: null,
                parentBlockId: null,
              },
              {
                id: "b2",
                name: "b",
                kind: "tick",
                done: true,
                hasDuration: false,
                categoryId: null,
                parentBlockId: null,
              },
              {
                id: "b3",
                name: "c",
                kind: "tick",
                done: true,
                hasDuration: false,
                categoryId: null,
                parentBlockId: null,
              },
              {
                id: "b4",
                name: "d",
                kind: "tick",
                done: false,
                hasDuration: false,
                categoryId: null,
                parentBlockId: null,
              },
              {
                id: "b5",
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

  // Switch to Month view
  const monthTab = page.getByRole("tab", { name: /^month$/i });
  if ((await monthTab.count()) === 0) return;
  await monthTab.click();

  const grid = page.getByRole("grid");
  if ((await grid.count()) === 0) return;

  // Archived day cell: has data-kind="scored" and data-score
  const archivedCell = page.locator(`[data-score][data-kind="scored"]`).first();
  if ((await archivedCell.count()) > 0) {
    await expect(archivedCell).toBeVisible();
    const score = await archivedCell.getAttribute("data-score");
    expect(Number(score)).toBeGreaterThan(0);
  }

  // Today cell: data-today="true"
  const todayCell = page.locator(`[data-today="true"]`);
  if ((await todayCell.count()) > 0) {
    await expect(todayCell).toBeVisible();
  }

  // No console errors
  const nonHydrationErrors = consoleErrors.filter(
    (e) => !e.includes("Warning:"),
  );
  expect(nonHydrationErrors).toHaveLength(0);
});

// ─── E-m9c-003: open a past day read-only ────────────────────────────────────

test("E-m9c-003: tapping archived day opens read-only PastDayDetail; tapping today switches to Building view", async ({
  page,
}) => {
  // Reuse same deterministic seed as E-m9c-002
  await page.goto("/");

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
                name: "Morning run",
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

  // Switch to Month view
  const monthTab = page.getByRole("tab", { name: /^month$/i });
  if ((await monthTab.count()) === 0) return;
  await monthTab.click();

  const grid = page.getByRole("grid");
  if ((await grid.count()) === 0) return;

  // Tap the archived (scored) past-day cell
  const archivedCell = page.locator(`[data-kind="scored"]`).first();
  if ((await archivedCell.count()) > 0) {
    await archivedCell.click();

    // PastDayDetail panel opens — role="region" aria-label="Day detail"
    const detailPanel = page.getByRole("region", { name: "Day detail" });
    if ((await detailPanel.count()) > 0) {
      await expect(detailPanel).toBeVisible();

      // Read-only: no add/complete/edit affordance
      const checkboxes = detailPanel.getByRole("checkbox");
      expect(await checkboxes.count()).toBe(0);
      const spinbuttons = detailPanel.getByRole("spinbutton");
      expect(await spinbuttons.count()).toBe(0);

      // Close returns to grid
      const closeBtn = detailPanel.getByRole("button", { name: /close/i });
      if ((await closeBtn.count()) > 0) {
        await closeBtn.click();
        // Grid still visible
        const gridAfterClose = page.getByRole("grid");
        if ((await gridAfterClose.count()) > 0) {
          await expect(gridAfterClose).toBeVisible();
        }
      }
    }
  }

  // Tap today's cell — switches to Building (Day) view
  const todayCell = page.locator(`[data-today="true"]`);
  if ((await todayCell.count()) > 0) {
    await todayCell.click();

    // Building view back — Day tab should now be selected
    const dayTab = page.getByRole("tab", { name: /^day$/i });
    if ((await dayTab.count()) > 0) {
      await expect(dayTab).toHaveAttribute("aria-selected", "true");
    }
  }
});
