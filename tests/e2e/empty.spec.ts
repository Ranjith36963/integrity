import { test, expect } from "@playwright/test";

// E-bld-022: Fresh page load shows EmptyBlocks copy
test("E-bld-022: fresh page load shows EmptyBlocks copy", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByText("No blocks yet. Tap + to add your first block."),
  ).toBeVisible();
});

// E-bld-023: Fresh page load — no .now-glow element exists
test("E-bld-023: no now-glow element on empty page", async ({ page }) => {
  await page.goto("/");
  const nowGlow = page.locator(".now-glow");
  await expect(nowGlow).toHaveCount(0);
});

// E-bld-024: BottomBar Add button is visible and labeled aria-label="Add"
test("E-bld-024: BottomBar Add button is visible and has aria-label=Add", async ({
  page,
}) => {
  await page.goto("/");
  const addBtn = page.getByRole("button", { name: "Add" });
  await expect(addBtn).toBeVisible();
  await expect(addBtn).toHaveAttribute("aria-label", "Add");
});
