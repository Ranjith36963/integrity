/**
 * tests/e2e/_design-audit.spec.ts — polish-pass screenshot audit (not pass/fail).
 * Review PNGs in /tmp/dharma-audit/. Focus surfaces: the auth forms (Welcome +
 * Settings cloud), Settings grouping, and the four calendar views with data.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

const OUT = "/tmp/dharma-audit";
mkdirSync(OUT, { recursive: true });

async function shot(page: Page, name: string) {
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
}

function seedRoutine(page: Page) {
  return page.addInitScript(() => {
    localStorage.setItem("dharma:onboarding-shown", "true");
    const today = new Date().toLocaleDateString("sv-SE");
    const d = new Date();
    d.setDate(d.getDate() - 2);
    const past = d.toLocaleDateString("sv-SE");
    const brick = (id: string, name: string, done: boolean, blk: string) => ({
      id,
      name,
      kind: "tick",
      done,
      hasDuration: false,
      categoryId: null,
      parentBlockId: blk,
    });
    const state = {
      schemaVersion: 3,
      programStart: past,
      currentDate: today,
      history: {
        [past]: {
          blocks: [],
          looseBricks: [
            brick("h1", "Meditate", true, ""),
            brick("h2", "Read", false, ""),
          ],
        },
      },
      deletions: {},
      categories: [],
      looseBricks: [
        {
          id: "lb1",
          name: "Pushups",
          kind: "units",
          target: 50,
          unit: "reps",
          done: 20,
          hasDuration: false,
          categoryId: null,
          parentBlockId: null,
        },
      ],
      blocks: [
        {
          id: "blk-1",
          name: "Morning routine",
          start: "06:00",
          end: "07:30",
          recurrence: { kind: "every-day" },
          categoryId: null,
          bricks: [
            brick("b1", "Meditate", true, "blk-1"),
            brick("b2", "Journal", false, "blk-1"),
          ],
        },
        {
          id: "blk-2",
          name: "Deep work",
          start: "09:00",
          end: "12:00",
          recurrence: { kind: "every-weekday" },
          categoryId: null,
          bricks: [brick("b3", "Ship one thing", false, "blk-2")],
        },
        {
          id: "blk-3",
          name: "Evening wind-down",
          start: "21:00",
          end: "22:00",
          recurrence: { kind: "every-day" },
          categoryId: null,
          bricks: [],
        },
      ],
    };
    localStorage.setItem("dharma:v1", JSON.stringify(state));
  });
}

test.describe("welcome (cold boot)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("audit: welcome intro + sign-in form + error state", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 430, height: 930 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await shot(page, "01-welcome-intro");

    await page.getByTestId("welcome-begin").click();
    await shot(page, "02-welcome-signin-empty");

    await page.getByTestId("welcome-email").fill("me@example.com");
    await page.getByTestId("welcome-password").fill("hunter22");
    await shot(page, "03-welcome-signin-filled");

    // Network is blocked in this sandbox → submit surfaces the error state.
    await page.getByTestId("welcome-submit").click();
    await page.waitForTimeout(2500);
    await shot(page, "04-welcome-signin-error");
  });

  test("audit: welcome sign-in at 320px (overflow check)", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByTestId("welcome-begin").click();
    await shot(page, "05-welcome-signin-320px");
  });
});

test("audit: day/week/month/year with a real routine", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 930 });
  await seedRoutine(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await shot(page, "06-day");
  await page.getByRole("tab", { name: /week/i }).click();
  await page.waitForTimeout(400);
  await shot(page, "07-week");
  await page.getByRole("tab", { name: /month/i }).click();
  await page.waitForTimeout(400);
  await shot(page, "08-month");
  await page.getByRole("tab", { name: /year/i }).click();
  await page.waitForTimeout(400);
  await shot(page, "09-year");
});

test("audit: settings sheet top-to-bottom", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 930 });
  await seedRoutine(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /settings/i }).click();
  await page.waitForTimeout(400);
  await shot(page, "10-settings-top");

  const cloud = page.getByTestId("settings-cloud-sync");
  await cloud.scrollIntoViewIfNeeded();
  await shot(page, "11-settings-cloud");

  // Fill the cloud form to see its filled + error states.
  await page.getByLabel("Email for cloud backup").fill("me@example.com");
  await page.getByTestId("cloud-password").fill("hunter22");
  await shot(page, "12-settings-cloud-filled");
  await page.getByTestId("cloud-submit").click();
  await page.waitForTimeout(2500);
  await cloud.scrollIntoViewIfNeeded();
  await shot(page, "13-settings-cloud-error");

  // Bottom of the sheet (export/import/freeze).
  const sheet = page.getByTestId("settings-sheet");
  if ((await sheet.count()) > 0) {
    await sheet.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  }
  await shot(page, "14-settings-bottom");
});
