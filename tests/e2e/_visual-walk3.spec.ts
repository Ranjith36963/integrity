/**
 * tests/e2e/_visual-walk3.spec.ts — third-pass: deep flow coverage.
 *
 * Surfaces:
 *   50 UnitsEntrySheet open (compact bottom-sheet variant after recent fix)
 *   51 New-category sub-view inside AddBlockSheet
 *   52 Past-day detail panel (tap a past day in Week view)
 *   53 Brick units chip in expanded block
 *   54 InstallPrompt visible state
 *   55 Edit mode → drag handle visible on multi-brick block
 *   56 PWA standalone meta + safe-area assertion proxy
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

const OUT = "/tmp/dharma-walk";
mkdirSync(OUT, { recursive: true });

async function shot(page: Page, name: string) {
  await page.waitForTimeout(180);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
}

async function skipWelcome(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("dharma:onboarding-shown", "true");
  });
}

test("walk3: units brick → tap chip → UnitsEntrySheet opens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 900 });
  // Seed state with a Units brick already on today, so we can just tap it.
  await page.addInitScript(() => {
    localStorage.setItem("dharma:onboarding-shown", "true");
    const today = new Date().toISOString().slice(0, 10);
    const state = {
      schemaVersion: 3,
      blocks: [],
      categories: [],
      looseBricks: [
        {
          id: "u1",
          name: "Pushups",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "units",
          target: 50,
          unit: "reps",
          done: 12,
        },
      ],
      programStart: today,
      currentDate: today,
      history: {},
      deletions: {},
    };
    localStorage.setItem("dharma:v1", JSON.stringify(state));
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await shot(page, "50-day-with-units-brick");

  // Tap the chip text "12 / 50 reps"
  const chip = page.getByText(/12.*\/.*50.*reps/i).first();
  if ((await chip.count()) > 0) {
    await chip.click({ force: true });
    await page.waitForTimeout(300);
    await shot(page, "51-units-entry-sheet");
  }
});

test("walk3: new-category sub-view inside AddBlockSheet", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 900 });
  await skipWelcome(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("dock-add").click();
  await page.waitForTimeout(200);
  await page.getByTestId("chooser-add-block").click();
  await page.waitForTimeout(400);
  // Tap "+ New" category trigger
  const newCatBtn = page.getByRole("button", { name: /^\+\s*new$/i }).first();
  if ((await newCatBtn.count()) > 0) {
    await newCatBtn.click({ force: true });
    await page.waitForTimeout(300);
    await shot(page, "52-new-category-subview");
  }
});

test("walk3: past day detail panel from Week view", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 900 });
  // Seed a past day with a scored history entry so we have something to tap
  await page.addInitScript(() => {
    localStorage.setItem("dharma:onboarding-shown", "true");
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yIso = yesterday.toISOString().slice(0, 10);
    const tIso = today.toISOString().slice(0, 10);
    const state = {
      schemaVersion: 3,
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: yIso,
      currentDate: tIso,
      history: {
        [yIso]: {
          schemaVersion: 3,
          isoDate: yIso,
          blocks: [],
          categories: [],
          looseBricks: Array.from({ length: 5 }, (_, i) => ({
            id: `y${i}`,
            name: "x",
            categoryId: null,
            parentBlockId: null,
            hasDuration: false,
            kind: "tick",
            done: i < 3,
          })),
          deletions: {},
        },
      },
      deletions: {},
    };
    localStorage.setItem("dharma:v1", JSON.stringify(state));
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByRole("tab", { name: /week/i }).click();
  await page.waitForTimeout(500);
  await shot(page, "53-week-with-yesterday-scored");

  // Tap yesterday's listitem
  const yesterdayLabel = new Date();
  yesterdayLabel.setDate(yesterdayLabel.getDate() - 1);
  const dayShort = yesterdayLabel.toLocaleDateString("en-US", {
    weekday: "short",
  });
  const cell = page
    .getByRole("listitem")
    .filter({ hasText: new RegExp(dayShort, "i") })
    .first();
  if ((await cell.count()) > 0) {
    await cell.click({ force: true });
    await page.waitForTimeout(400);
    await shot(page, "54-past-day-detail");
  }
});

test("walk3: edit mode with multi-brick block shows brick × buttons", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem("dharma:onboarding-shown", "true");
    const today = new Date().toISOString().slice(0, 10);
    const state = {
      schemaVersion: 3,
      blocks: [
        {
          id: "blk-A",
          name: "Morning routine",
          start: "07:00",
          end: "08:00",
          recurrence: { kind: "every-day" },
          categoryId: null,
          bricks: [
            {
              id: "br1",
              name: "Stretch",
              categoryId: null,
              parentBlockId: "blk-A",
              hasDuration: false,
              kind: "tick",
              done: false,
            },
            {
              id: "br2",
              name: "Push-ups",
              categoryId: null,
              parentBlockId: "blk-A",
              hasDuration: false,
              kind: "tick",
              done: true,
            },
            {
              id: "br3",
              name: "Read",
              categoryId: null,
              parentBlockId: "blk-A",
              hasDuration: false,
              kind: "tick",
              done: false,
            },
          ],
        },
      ],
      categories: [],
      looseBricks: [],
      programStart: today,
      currentDate: today,
      history: {},
      deletions: {},
    };
    localStorage.setItem("dharma:v1", JSON.stringify(state));
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  // Expand the block
  const block = page.locator('[data-component="timeline-block"]').first();
  await block.click({ force: true });
  await page.waitForTimeout(300);
  await shot(page, "55-block-with-3-bricks");
  await page.getByTestId("edit-mode-toggle").click();
  await page.waitForTimeout(400);
  await shot(page, "56-edit-mode-multi-brick");
});
