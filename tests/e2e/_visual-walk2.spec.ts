/**
 * tests/e2e/_visual-walk2.spec.ts — second-pass walkthrough.
 *
 * Surfaces:
 *   30 Welcome dialog → Lay your first brick CTA
 *   31 Long-press brand mark → year heatmap overlay
 *   32 Use freeze action via command palette
 *   33 Multi-block day (3 blocks) → drag-reorder via edit mode
 *   34 Units brick entry sheet
 *   35 Add Block custom range recurrence sheet
 *   36 + 37 view-switcher animation between Day and Year
 *   38 small viewport 360x780 (typical Android)
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

const OUT = "/tmp/dharma-walk";
mkdirSync(OUT, { recursive: true });

async function shot(page: Page, name: string) {
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
}

async function skipWelcome(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("dharma:onboarding-shown", "true");
  });
}

test("walk2: welcome dialog full screen", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 900 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await shot(page, "30-welcome-full");
});

test("walk2: long-press brand mark opens year heatmap", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 900 });
  await skipWelcome(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const brand = page.getByTestId("brand-mark-longpress");
  // Use real mouse down+wait+up to trigger long-press
  const box = await brand.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(700);
    await shot(page, "31-year-heatmap");
    await page.mouse.up();
    await page.waitForTimeout(200);
  }
});

test("walk2: freeze today via command palette", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 900 });
  await skipWelcome(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("Meta+k");
  await page.waitForTimeout(200);
  await page.keyboard.type("freeze");
  await page.waitForTimeout(150);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
  await shot(page, "32-after-freeze");
});

test("walk2: multi-block day + edit mode", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 900 });
  await skipWelcome(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  for (const [title, start, end] of [
    ["Morning Pages", "07:00", "08:00"],
    ["Workout", "08:30", "09:30"],
    ["Stand-up", "10:00", "10:15"],
  ] as const) {
    await page.getByTestId("dock-add").click();
    await page.waitForTimeout(200);
    await page.getByTestId("chooser-add-block").click({ force: true });
    await page.waitForTimeout(400);
    await page.getByLabel(/Title/i).fill(title);
    await page.locator("#block-start").fill(start);
    await page.locator("#block-end").fill(end);
    await page.getByTestId("add-block-save").click();
    await page.waitForTimeout(400);
  }
  await shot(page, "33-multi-block");

  await page.getByTestId("edit-mode-toggle").click();
  await page.waitForTimeout(300);
  await shot(page, "34-multi-block-edit");
});

test("walk2: units brick entry", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 900 });
  await skipWelcome(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Open AddBrickSheet from chooser
  await page.getByTestId("dock-add").click();
  await page.waitForTimeout(200);
  await page.getByTestId("chooser-add-brick").click({ force: true });
  await page.waitForTimeout(400);
  await shot(page, "35-add-brick-default");

  // Switch to Units kind
  const unitsChip = page.getByRole("button", { name: /^units$/i }).first();
  if ((await unitsChip.count()) > 0) {
    await unitsChip.click();
    await page.waitForTimeout(200);
    await shot(page, "36-add-brick-units");
  }
});

test("walk2: AddBlockSheet custom range expands", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 900 });
  await skipWelcome(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await page.getByTestId("dock-add").click();
  await page.waitForTimeout(200);
  await page.getByTestId("chooser-add-block").click({ force: true });
  await page.waitForTimeout(400);
  await page.getByLabel(/Title/i).fill("Sprint week");

  const customRange = page.getByRole("button", { name: /custom range/i });
  if ((await customRange.count()) > 0) {
    await customRange.click({ force: true });
    await page.waitForTimeout(300);
    await shot(page, "37-custom-range-expanded");
  }
});

test("walk2: 360x780 small android viewport", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await skipWelcome(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await shot(page, "38-android-day");
  await page.getByTestId("dock-add").click();
  await page.waitForTimeout(300);
  await shot(page, "39-android-chooser");
  await page.getByTestId("chooser-add-block").click({ force: true });
  await page.waitForTimeout(400);
  await shot(page, "40-android-add-block");
});
