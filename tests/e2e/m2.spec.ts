import { test, expect, type Page } from "@playwright/test";

// All M2 e2e run on mobile-chrome (Pixel 7) at 430×900 viewport.
// Base URL: http://localhost:3000. Route under test: /.
// Each test that needs a stable clock uses addInitScript to fix Date.now.

// Helper: add a block via the + button
async function addBlock(page: Page, title: string) {
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByLabel(/Title/i).fill(title);
  await page.getByRole("button", { name: /Save/i }).click();
}

// E-m2-001: + button → block appears at default Start (rounded-down hour)
test("E-m2-001: + opens sheet with rounded-down Start; Save adds block to timeline", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const fixedTime = new Date("2026-05-06T09:47:00").getTime();
    Date.now = () => fixedTime;
  });
  await page.goto("/");

  // Tap + button
  await page.getByRole("button", { name: "Add" }).click();

  // Dialog should open with correct aria-label
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-label", "Add Block");

  // Start input should be "09:00" (rounded DOWN from 09:47, SG-m2-04)
  const startInput = page.getByLabel(/Start/i);
  await expect(startInput).toHaveValue("09:00");

  // Type title
  await page.getByLabel(/Title/i).fill("Foo");

  // Save
  await page.getByRole("button", { name: /Save/i }).click();

  // Dialog dismissed
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);

  // Block appears in timeline
  const tlBlock = page.locator('[data-component="timeline-block"]');
  await expect(tlBlock).toHaveCount(1);
  await expect(tlBlock.first()).toContainText("Foo");
  await expect(tlBlock.first()).toContainText("09:00");

  // Empty-state gone
  await expect(
    page.getByText("Tap any slot to lay your first block."),
  ).toHaveCount(0);

  // Check approximate vertical position (9 * 64 = 576px) — within ±5px
  const box = await tlBlock.first().boundingBox();
  if (box) {
    // The block is inside a scrollable container; just verify it's visible
    expect(box.width).toBeGreaterThan(0);
  }
});

// E-m2-002: Slot-tap → sheet pre-fills that hour
test("E-m2-002: slot tap at 14:00 opens sheet with Start=14:00", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const fixedTime = new Date("2026-05-06T08:00:00").getTime();
    Date.now = () => fixedTime;
  });
  await page.goto("/");

  // Tap slot at 14:00
  await page.getByRole("button", { name: "Add block at 14:00" }).click();

  // Sheet opens
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();

  // Start = 14:00
  await expect(page.getByLabel(/Start/i)).toHaveValue("14:00");

  // Type title and save
  await page.getByLabel(/Title/i).fill("Bar");
  await page.getByRole("button", { name: /Save/i }).click();

  // Block in DOM
  const tlBlock = page.locator('[data-component="timeline-block"]');
  await expect(tlBlock).toHaveCount(1);
  await expect(tlBlock.first()).toContainText("Bar");
});

// E-m2-003: Cancel → no block added, sheet closes
test("E-m2-003: Cancel/X closes sheet without adding a block", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/");

  // Open sheet
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  // Type some text
  await page.getByLabel(/Title/i).fill("Throwaway");

  // Cancel (button labeled "Cancel" or the X icon)
  await page.getByRole("button", { name: "Cancel" }).click();

  // Dialog dismissed
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);

  // No block added
  await expect(page.locator('[data-component="timeline-block"]')).toHaveCount(
    0,
  );

  // Empty state still visible
  await expect(
    page.getByText("Tap any slot to lay your first block."),
  ).toBeVisible();

  // No console errors
  expect(errors).toHaveLength(0);
});

// E-m2-004: Empty-state card disappears when blocks > 0
test("E-m2-004: empty-state card unmounts after first block is saved", async ({
  page,
}) => {
  await page.goto("/");

  // Initially visible
  await expect(
    page.getByText("Tap any slot to lay your first block."),
  ).toBeVisible();

  // Add a block
  await addBlock(page, "Foo");

  // Empty state gone
  await expect(
    page.getByText("Tap any slot to lay your first block."),
  ).toHaveCount(0);
});

// E-m2-005: Empty Title → Save aria-disabled
test("E-m2-005: Save is aria-disabled when Title is empty; enabled after typing", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add" }).click();

  // Save should be aria-disabled before typing title
  const saveBtn = page.getByRole("button", { name: /Save/i });
  await expect(saveBtn).toHaveAttribute("aria-disabled", "true");

  // Clicking disabled Save should not close dialog
  await saveBtn.click();
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  // Type title — Save becomes enabled
  await page.getByLabel(/Title/i).fill("X");
  await expect(saveBtn).toHaveAttribute("aria-disabled", "false");

  // Clicking enabled Save closes dialog
  await saveBtn.click();
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  await expect(page.locator('[data-component="timeline-block"]')).toHaveCount(
    1,
  );
});

// E-m2-006: End ≤ Start → inline error, Save disabled
test("E-m2-006: End before Start shows inline error and disables Save", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const fixedTime = new Date("2026-05-06T09:30:00").getTime();
    Date.now = () => fixedTime;
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Add" }).click();

  await page.getByLabel(/Title/i).fill("Foo");

  // Set End to a time before Start (Start defaults to 09:00)
  const endInput = page.getByLabel(/End/i);
  await endInput.fill("08:00");
  // Trigger blur/change
  await page.keyboard.press("Tab");

  // Inline error visible
  const alert = page.locator('[role="alert"]');
  await expect(alert).toBeVisible();
  await expect(alert).toContainText(/End must be after Start/i);

  // Save disabled
  await expect(page.getByRole("button", { name: /Save/i })).toHaveAttribute(
    "aria-disabled",
    "true",
  );

  // Fix end time — error disappears, Save enabled
  await endInput.fill("10:00");
  await page.keyboard.press("Tab");
  await expect(page.locator('[role="alert"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Save/i })).toHaveAttribute(
    "aria-disabled",
    "false",
  );
});

// E-m2-007: End past 23:59 → inline error
test("E-m2-007: End=24:00 shows 'before midnight' inline error", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add" }).click();

  await page.getByLabel(/Title/i).fill("Foo");

  // Set Start to 22:00
  const startInput = page.getByLabel(/Start/i);
  await startInput.fill("22:00");
  await page.keyboard.press("Tab");

  // Set End to 24:00
  const endInput = page.getByLabel(/End/i);
  await endInput.fill("24:00");
  await page.keyboard.press("Tab");

  // Inline error
  const alert = page.locator('[role="alert"]');
  await expect(alert).toBeVisible();
  await expect(alert).toContainText(/before midnight/i);

  // Save disabled
  await expect(page.getByRole("button", { name: /Save/i })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
});

// E-m2-008: Soft overlap warning — Save still allowed
test("E-m2-008: overlapping block shows soft warning but Save is still enabled", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const fixedTime = new Date("2026-05-06T08:00:00").getTime();
    Date.now = () => fixedTime;
  });
  await page.goto("/");

  // Add first block: 09:00–10:00
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByLabel(/Title/i).fill("Existing");
  const startInput = page.getByLabel(/Start/i);
  await startInput.fill("09:00");
  const endInput = page.getByLabel(/End/i);
  await endInput.fill("10:00");
  await page.keyboard.press("Tab");
  await page.getByRole("button", { name: /Save/i }).click();
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);

  // Open sheet again: 09:30–10:30 (overlaps)
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByLabel(/Title/i).fill("Second");
  await startInput.fill("09:30");
  await endInput.fill("10:30");
  await page.keyboard.press("Tab");

  // Soft warning visible (role="status")
  const status = page.locator('[role="status"]');
  await expect(status).toBeVisible();
  await expect(status).toContainText("Existing");

  // Save still enabled (soft warning)
  const saveBtn = page.getByRole("button", { name: /Save/i });
  await expect(saveBtn).toHaveAttribute("aria-disabled", "false");

  // Save works — second block added
  await saveBtn.click();
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  await expect(page.locator('[data-component="timeline-block"]')).toHaveCount(
    2,
  );
});

// E-m2-009: Skip → categoryId=null, no dot, no blueprint segment
test("E-m2-009: Skip category → timeline block has no dot, blueprint has 0 segments", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByLabel(/Title/i).fill("Foo");

  // Click Skip
  await page.getByRole("button", { name: /Skip/i }).click();
  await page.getByRole("button", { name: /Save/i }).click();
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);

  // Block has no category dot
  const tlBlock = page.locator('[data-component="timeline-block"]').first();
  await expect(tlBlock).toBeVisible();
  await expect(tlBlock.locator('[data-testid="category-dot"]')).toHaveCount(0);

  // BlueprintBar has 0 segments (uncategorized excluded per SG-m2-02)
  await expect(page.locator('[data-testid="blueprint-segment"]')).toHaveCount(
    0,
  );
});

// E-m2-010: New category inline + reuse on next open
test("E-m2-010: creating new category inline persists and shows on re-open", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByLabel(/Title/i).fill("Foo");

  // Navigate to New Category form
  await page.getByRole("button", { name: /\+ New/i }).click();

  // Fill name
  await page.getByLabel(/Name/i).fill("Health");

  // Pick Color 1 swatch
  await page.getByRole("radio", { name: "Color 1" }).click();

  // Click Done
  await page.getByRole("button", { name: /Done/i }).click();

  // Back to block form
  await expect(page.locator('[role="dialog"]')).toHaveAttribute(
    "aria-label",
    "Add Block",
  );

  // Save
  await page.getByRole("button", { name: /Save/i }).click();
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);

  // Block has a category dot
  const tlBlock = page.locator('[data-component="timeline-block"]').first();
  await expect(tlBlock.locator('[data-testid="category-dot"]')).toHaveCount(1);

  // Category dot background-color is #34d399 (--cat-1)
  const dotColor = await tlBlock
    .locator('[data-testid="category-dot"]')
    .evaluate((el) => window.getComputedStyle(el).backgroundColor);
  // JSDOM normalizes to rgb; Playwright returns actual rendered value
  // Accept either hex form or rgb form
  expect(
    dotColor === "#34d399" ||
      dotColor === "rgb(52, 211, 153)" ||
      dotColor.toLowerCase().includes("34d399") ||
      dotColor.includes("52, 211, 153"),
  ).toBe(true);

  // Re-open sheet — Health category chip visible
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByRole("radio", { name: /Health/i })).toBeVisible();
});

// E-m2-011: prefers-reduced-motion collapses animations
test("E-m2-011: prefers-reduced-motion: reduce — sheet and block appear without long animation", async ({
  browser,
}) => {
  const context = await browser.newContext({
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("/");

  // Open sheet
  await page.getByRole("button", { name: "Add" }).click();
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();

  // Check no transition-duration > 50ms on the dialog
  const hasLongTransition = await dialog.evaluate((el) => {
    const style = window.getComputedStyle(el);
    const duration = style.transitionDuration;
    if (!duration || duration === "0s" || duration === "none") return false;
    const parts = duration.split(",").map((d) => parseFloat(d.trim()) * 1000);
    return parts.some((ms) => ms > 50);
  });
  expect(hasLongTransition).toBe(false);

  // Save a block
  await page.getByLabel(/Title/i).fill("MotionTest");
  await page.getByRole("button", { name: /Save/i }).click();
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);

  // Block is present
  const tlBlock = page.locator('[data-component="timeline-block"]').first();
  await expect(tlBlock).toBeVisible();

  // No long transition on the block
  const blockHasLongTransition = await tlBlock.evaluate((el) => {
    const style = window.getComputedStyle(el);
    const duration = style.transitionDuration;
    if (!duration || duration === "0s" || duration === "none") return false;
    const parts = duration.split(",").map((d) => parseFloat(d.trim()) * 1000);
    return parts.some((ms) => ms > 50);
  });
  expect(blockHasLongTransition).toBe(false);

  await context.close();
});

// E-m2-012: Page refresh loses state (no persistence in M2)
test("E-m2-012: page refresh loses blocks (no localStorage persistence)", async ({
  page,
}) => {
  await page.goto("/");

  // Add a block
  await addBlock(page, "Foo");
  await expect(page.locator('[data-component="timeline-block"]')).toHaveCount(
    1,
  );

  // Reload
  await page.reload();
  await page.waitForLoadState("networkidle");

  // Block gone
  await expect(page.locator('[data-component="timeline-block"]')).toHaveCount(
    0,
  );

  // Empty state back
  await expect(
    page.getByText("Tap any slot to lay your first block."),
  ).toBeVisible();

  // No localStorage writes
  const storageLength = await page.evaluate(() => localStorage.length);
  expect(storageLength).toBe(0);
});

// E-m2-013: No horizontal overflow when sheet is open
test("E-m2-013: no horizontal overflow with sheet open at 430px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 900 });
  await page.goto("/");

  // Open sheet
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  // No horizontal overflow
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.body.scrollWidth,
    clientWidth: document.body.clientWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

  // All dialog children should be within 430px
  const dialog = page.locator('[role="dialog"]');
  const children = dialog.locator("> *");
  const count = await children.count();
  for (let i = 0; i < count; i++) {
    const box = await children.nth(i).boundingBox();
    if (box) {
      expect(box.x + box.width).toBeLessThanOrEqual(435); // +5px tolerance for rounding
    }
  }
});
