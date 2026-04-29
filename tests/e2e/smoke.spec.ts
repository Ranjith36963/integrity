import { test, expect } from "@playwright/test";

test("home page renders the Dharma logo", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("DHARMA", { exact: true })).toBeVisible();
});
