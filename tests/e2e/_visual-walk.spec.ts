/**
 * tests/e2e/_visual-walk.spec.ts — comprehensive screenshot walkthrough
 * driving every observable surface for visual review.
 *
 * Not a pass/fail test. Always returns 0 anomalies; the JUDGMENT is human
 * — review the PNGs in /tmp/dharma-walk/ for anything off.
 *
 * Surfaces covered:
 *   01 cold boot (Welcome)
 *   02 post-welcome Day
 *   03 add block via chooser
 *   04 add brick to that block
 *   05 mark brick done (particle burst)
 *   06 edit mode: block × button + drag handle
 *   07 brick edit
 *   08 delete confirm dialog
 *   09 Week / 10 Month / 11 Year tabs
 *   12 long-press brand mark (year heatmap)
 *   13 settings sheet
 *   14 command palette (⌘K)
 *   15 freeze a day
 *   16 empire glimpse cinematic (forced via state seed)
 *   17 reduced-motion variant of Day
 *   18 narrow viewport (320px) — does anything overflow?
 */
import { test, type Page } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";

const OUT = "/tmp/dharma-walk";
mkdirSync(OUT, { recursive: true });

async function shot(page: Page, name: string) {
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
}

async function skipWelcome(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("dharma:onboarding-shown", "true");
  });
}

// Opt out of the default storageState so the first-launch Welcome dialog
// can render. The default config pre-stamps `dharma:onboarding-shown=true`
// for every other spec so they aren't blocked by the overlay.
test.describe("cold-boot welcome", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test("walk: cold boot + welcome", async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 900 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await shot(page, "01-cold-boot-welcome");
  });
});

test("walk: day → add block → add brick → done → edit", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 900 });
  await skipWelcome(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await shot(page, "02-day-empty");

  // Open chooser
  await page.getByTestId("dock-add").click();
  await shot(page, "03-chooser");

  // Add a block
  await page.getByTestId("chooser-add-block").click();
  await shot(page, "04-add-block-sheet-empty");
  await page.getByLabel(/Title/i).fill("Morning Pages");
  await page.locator("#block-start").fill("09:00");
  await page.locator("#block-end").fill("10:00");
  await shot(page, "05-add-block-sheet-filled");
  await page.getByTestId("add-block-save").click();
  await page.waitForTimeout(500);
  await shot(page, "06-after-block-save");

  // Expand the block to show bricks
  const block = page.locator('[data-component="timeline-block"]').first();
  await block.click({ force: true });
  await page.waitForTimeout(200);
  await shot(page, "07-block-expanded");

  // Add a brick
  const addBrickBtn = page.getByRole("button", { name: /add brick/i });
  if ((await addBrickBtn.count()) > 0) {
    await addBrickBtn.first().click({ force: true });
    await page.waitForTimeout(300);
    await shot(page, "08-add-brick-sheet");
    await page
      .getByLabel(/Title|Name/i)
      .first()
      .fill("First page");
    await page.waitForTimeout(150);
    await shot(page, "09-add-brick-filled");
    const saveBrick = page.getByRole("button", { name: /save/i });
    if ((await saveBrick.count()) > 0) {
      await saveBrick.first().click({ force: true });
      await page.waitForTimeout(400);
      await shot(page, "10-after-brick-save");
    }
  }

  // Tap brick to mark done (tick)
  const brick = page.locator('[data-component="brick-chip"]').first();
  if ((await brick.count()) > 0) {
    await brick.click({ force: true });
    await page.waitForTimeout(800);
    await shot(page, "11-brick-done-burst");
  }

  // Enter edit mode
  await page.getByTestId("edit-mode-toggle").click();
  await page.waitForTimeout(400);
  await shot(page, "12-edit-mode");

  // Try to tap × on the block
  const xBtn = page.getByRole("button", { name: /delete block/i }).first();
  if ((await xBtn.count()) > 0) {
    await xBtn.click({ force: true });
    await page.waitForTimeout(300);
    await shot(page, "13-delete-confirm");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
  }

  // Exit edit mode
  await page.getByTestId("edit-mode-toggle").click();
  await page.waitForTimeout(200);
  await shot(page, "14-after-edit-exit");
});

test("walk: view switcher Day → Week → Month → Year", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 900 });
  await skipWelcome(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByRole("tab", { name: /week/i }).click();
  await page.waitForTimeout(400);
  await shot(page, "15-week");
  await page.getByRole("tab", { name: /month/i }).click();
  await page.waitForTimeout(400);
  await shot(page, "16-month");
  await page.getByRole("tab", { name: /year/i }).click();
  await page.waitForTimeout(400);
  await shot(page, "17-year");
  await page.getByRole("tab", { name: /day/i }).click();
  await page.waitForTimeout(400);
  await shot(page, "18-day-back");
});

test("walk: settings sheet", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 900 });
  await skipWelcome(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /settings/i }).click();
  await page.waitForTimeout(400);
  await shot(page, "19-settings");
});

test("walk: command palette ⌘K", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 900 });
  await skipWelcome(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("Meta+k");
  await page.waitForTimeout(400);
  await shot(page, "20-palette-open");
  await page.keyboard.type("freeze");
  await page.waitForTimeout(200);
  await shot(page, "21-palette-freeze-search");
});

test("walk: forced empire glimpse via seeded streak", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 900 });
  // Seed a 7-day scored history ending today; do NOT pre-stamp the milestone.
  await page.addInitScript(() => {
    localStorage.setItem("dharma:onboarding-shown", "true");
    const today = new Date();
    const history: Record<string, unknown> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      history[iso] = {
        schemaVersion: 3,
        isoDate: iso,
        blocks: [],
        categories: [],
        looseBricks: [
          {
            id: `b${i}`,
            name: "x",
            categoryId: null,
            parentBlockId: null,
            hasDuration: false,
            kind: "tick",
            done: true,
          },
        ],
        deletions: {},
      };
    }
    const todayIso = today.toISOString().slice(0, 10);
    const state = {
      schemaVersion: 3,
      blocks: [],
      categories: [],
      looseBricks: [
        {
          id: "btoday",
          name: "x",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: true,
        },
      ],
      programStart: Object.keys(history)[0],
      currentDate: todayIso,
      history,
      deletions: {},
    };
    localStorage.setItem("dharma:v1", JSON.stringify(state));
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);
  await shot(page, "22-empire-glimpse");
});

test("walk: reduced motion", async ({ browser }) => {
  const ctx = await browser.newContext({
    viewport: { width: 430, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    localStorage.setItem("dharma:onboarding-shown", "true");
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await shot(page, "23-day-reduced-motion");
  await ctx.close();
});

test("walk: narrow viewport 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await skipWelcome(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await shot(page, "24-narrow-320");
  await page.getByTestId("dock-add").click();
  await page.waitForTimeout(200);
  await shot(page, "25-narrow-320-chooser");
});

test.afterAll(() => {
  writeFileSync(`${OUT}/INDEX.md`, "see PNG files in this folder\n");
});
