/**
 * tests/e2e/m5.spec.ts — Milestone 5 E2E tests (Playwright).
 *
 * Covers: E-m5-001..004
 *
 * State seeding strategy: addInitScript seeds localStorage before navigation
 * so the block always renders and guard-skip patterns are replaced with
 * unconditional assertions.
 */

import { test, expect } from "@playwright/test";

function makeTodayISO() {
  return new Date().toLocaleDateString("sv-SE");
}

function makePayload(today: string) {
  return {
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
          {
            id: "brk-2",
            name: "Journal",
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
}

test.beforeEach(async ({ page }) => {
  const today = makeTodayISO();
  await page.addInitScript(
    ({ today: t, payload }: { today: string; payload: unknown }) => {
      localStorage.setItem("dharma:onboarding-shown", "true");
      localStorage.setItem(
        "dharma:v1",
        JSON.stringify({
          ...(payload as object),
          currentDate: t,
          programStart: t,
        }),
      );
    },
    { today, payload: makePayload(today) },
  );
});

// ─── E-m5-001: pencil toggle enters / exits Edit Mode ──────────────────────────

test("E-m5-001: pencil toggles Edit Mode Locked ↔ Unlocked; jiggle + × appear on blocks", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const pencil = page.getByRole("button", { name: /edit mode/i });
  await expect(pencil).toBeVisible();

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
  await expect(deleteBtn).toBeVisible();

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
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const pencil = page.getByRole("button", { name: /edit mode/i });
  await expect(pencil).toBeVisible();
  await pencil.click();

  const deleteBtn = page.getByRole("button", {
    name: /^delete block morning/i,
  });
  await expect(deleteBtn).toBeVisible();
  await deleteBtn.click({ force: true });

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  const justToday = dialog.getByRole("button", { name: /just today/i });
  await expect(justToday).toBeVisible();
  await justToday.click();

  // Modal closes
  await expect(dialog).not.toBeVisible();
  // Block is removed from today's timeline
  await expect(page.getByText("Morning")).not.toBeVisible();
});

// ─── E-m5-003: "All recurrences" removes the block template entirely ────────────

test("E-m5-003: 'All recurrences' removes the block template from all days", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const pencil = page.getByRole("button", { name: /edit mode/i });
  await expect(pencil).toBeVisible();
  await pencil.click();

  const deleteBtn = page.getByRole("button", {
    name: /^delete block morning/i,
  });
  await expect(deleteBtn).toBeVisible();
  await deleteBtn.click({ force: true });

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  const allRecurrences = dialog.getByRole("button", {
    name: /all recurrences/i,
  });
  await expect(allRecurrences).toBeVisible();
  await allRecurrences.click();

  // Modal closes and block gone
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText("Morning")).not.toBeVisible();
});

// ─── E-m5-004: Cancel does not delete; ESC = Cancel ────────────────────────────

test("E-m5-004: Cancel aborts deletion; ESC = Cancel; block remains on timeline", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const pencil = page.getByRole("button", { name: /edit mode/i });
  await expect(pencil).toBeVisible();
  await pencil.click();

  const deleteBtn = page.getByRole("button", {
    name: /^delete block morning/i,
  });
  await expect(deleteBtn).toBeVisible();
  await deleteBtn.click({ force: true });

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Cancel via button
  const cancelBtn = dialog.getByRole("button", { name: /cancel/i });
  await expect(cancelBtn).toBeVisible();
  await cancelBtn.click();
  await expect(dialog).not.toBeVisible();

  // Block still present
  await expect(page.getByText("Morning")).toBeVisible();

  // Re-open and cancel via ESC
  await deleteBtn.click({ force: true });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});
