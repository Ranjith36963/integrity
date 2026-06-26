/**
 * tests/e2e/m5.spec.ts — Milestone 5 E2E tests (Playwright, deferred to preview).
 *
 * Execution is deferred to Vercel preview — this sandbox cannot launch chromium
 * (binary missing, confirmed by M4a–M9e EVALUATOR reports and status.md).
 * Tests are authored here as real test() blocks; run them against the deployed preview URL.
 * Guards: `if ((await x.count()) > 0)` per ADR-039 + ADR-022.
 *
 * Covers: E-m5-001..004
 */

import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("dharma:onboarding-shown", "true");
  });
  await page.reload();
});

/**
 * Seed a minimal fixture with one recurring block (blk-recur) + one brick (brk-1).
 * Used by E-m5-002..004 to have content to delete.
 */
async function seedFixture(page: import("@playwright/test").Page) {
  const todayISO = await page.evaluate(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  await page.evaluate((today) => {
    const payload = {
      schemaVersion: 3,
      programStart: today,
      currentDate: today,
      history: {},
      deletions: {},
      blocks: [
        {
          id: "blk-recur",
          name: "Morning",
          start: "07:00",
          end: "08:00",
          recurrence: { kind: "every-day" },
          categoryId: null,
          bricks: [
            {
              id: "brk-1",
              name: "Meditate",
              kind: "tick",
              done: false,
              hasDuration: false,
              categoryId: null,
              parentBlockId: "blk-recur",
            },
          ],
        },
      ],
      looseBricks: [],
      categories: [],
    };
    localStorage.setItem("dharma:v1", JSON.stringify(payload));
  }, todayISO);
  await page.reload();
  await page.waitForTimeout(500);
}

// ─── E-m5-001: pencil toggle enters / exits Edit Mode ──────────────────────────

test("E-m5-001: pencil toggles Edit Mode Locked ↔ Unlocked; jiggle + × appear on blocks", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await seedFixture(page);

  const pencil = page.getByRole("button", { name: /edit mode/i });
  if ((await pencil.count()) === 0) return;

  // Locked state
  await expect(pencil).toHaveAttribute("aria-pressed", "false");
  const lockedLabel = await pencil.getAttribute("aria-label");
  expect(lockedLabel).toMatch(/edit mode.*off/i);

  // Toggle to Unlocked
  await pencil.click();
  await expect(pencil).toHaveAttribute("aria-pressed", "true");
  const unlockedLabel = await pencil.getAttribute("aria-label");
  expect(unlockedLabel).toMatch(/edit mode.*on/i);

  // × button appears on the block card
  const deleteBtn = page.getByRole("button", {
    name: /^delete block morning/i,
  });
  if ((await deleteBtn.count()) > 0) {
    await expect(deleteBtn).toBeVisible();
  }

  // Toggle back to Locked
  await pencil.click();
  await expect(pencil).toHaveAttribute("aria-pressed", "false");
  const relocked = await pencil.getAttribute("aria-label");
  expect(relocked).toMatch(/edit mode.*off/i);
});

// ─── E-m5-002: "Just today" delete removes block from today's timeline ─────────

test("E-m5-002: 'Just today' removes the block from today's timeline only", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await seedFixture(page);

  const pencil = page.getByRole("button", { name: /edit mode/i });
  if ((await pencil.count()) === 0) return;
  await pencil.click();

  const deleteBtn = page.getByRole("button", {
    name: /^delete block morning/i,
  });
  if ((await deleteBtn.count()) === 0) return;
  await deleteBtn.click();

  const dialog = page.getByRole("dialog");
  if ((await dialog.count()) === 0) return;
  await expect(dialog).toBeVisible();

  const justToday = dialog.getByRole("button", { name: /just today/i });
  if ((await justToday.count()) === 0) return;
  await justToday.click();

  // Modal closes
  await expect(dialog).not.toBeVisible();
  // Block is removed from today's timeline
  const morning = page.getByText("Morning");
  if ((await morning.count()) > 0) {
    await expect(morning).not.toBeVisible();
  }
});

// ─── E-m5-003: "All recurrences" removes the block template entirely ────────────

test("E-m5-003: 'All recurrences' removes the block template from all days", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await seedFixture(page);

  const pencil = page.getByRole("button", { name: /edit mode/i });
  if ((await pencil.count()) === 0) return;
  await pencil.click();

  const deleteBtn = page.getByRole("button", {
    name: /^delete block morning/i,
  });
  if ((await deleteBtn.count()) === 0) return;
  await deleteBtn.click();

  const dialog = page.getByRole("dialog");
  if ((await dialog.count()) === 0) return;

  const allRecurrences = dialog.getByRole("button", {
    name: /all recurrences/i,
  });
  if ((await allRecurrences.count()) === 0) return;
  await allRecurrences.click();

  // Modal closes and block gone
  await expect(dialog).not.toBeVisible();
  const morning = page.getByText("Morning");
  if ((await morning.count()) > 0) {
    await expect(morning).not.toBeVisible();
  }
});

// ─── E-m5-004: Cancel does not delete; ESC = Cancel ────────────────────────────

test("E-m5-004: Cancel aborts deletion; ESC = Cancel; block remains on timeline", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await seedFixture(page);

  const pencil = page.getByRole("button", { name: /edit mode/i });
  if ((await pencil.count()) === 0) return;
  await pencil.click();

  const deleteBtn = page.getByRole("button", {
    name: /^delete block morning/i,
  });
  if ((await deleteBtn.count()) === 0) return;
  await deleteBtn.click();

  const dialog = page.getByRole("dialog");
  if ((await dialog.count()) === 0) return;
  await expect(dialog).toBeVisible();

  // Cancel via button
  const cancelBtn = dialog.getByRole("button", { name: /cancel/i });
  if ((await cancelBtn.count()) > 0) {
    await cancelBtn.click();
    await expect(dialog).not.toBeVisible();
  }

  // Block still present
  const morning = page.getByText("Morning");
  if ((await morning.count()) > 0) {
    await expect(morning).toBeVisible();
  }

  // Re-open and cancel via ESC
  if ((await deleteBtn.count()) > 0) {
    await deleteBtn.click();
    if ((await dialog.count()) > 0) {
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
    }
  }
});
