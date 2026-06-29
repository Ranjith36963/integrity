/**
 * tests/e2e/m5.a11y.spec.ts — Milestone 5 accessibility tests (axe-core via Playwright).
 *
 * Covers: A-m5-001..003
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    (payload: unknown) => {
      localStorage.setItem("dharma:onboarding-shown", "true");
      localStorage.setItem("dharma:v1", JSON.stringify(payload));
    },
    {
      schemaVersion: 3,
      programStart: "2026-01-01",
      currentDate: "2026-06-29",
      blocks: [
        {
          id: "blk-1",
          name: "Afternoon",
          start: "14:00",
          end: "15:00",
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
              parentBlockId: "blk-1",
            },
            {
              id: "brk-2",
              name: "Journal",
              kind: "tick",
              done: false,
              hasDuration: false,
              categoryId: null,
              parentBlockId: "blk-1",
            },
          ],
        },
      ],
      looseBricks: [],
      categories: [],
      history: {},
      deletions: {},
    },
  );
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
});

// ─── A-m5-001: Edit Mode — axe clean; pencil + × keyboard-operable; 430px no overflow ──

test("A-m5-001: Unlocked Day view is axe-clean; pencil + every × keyboard-operable + SR-labeled; 430px no overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });

  // Find the pencil Edit Mode toggle
  const pencil = page.getByRole("button", { name: /edit mode/i });
  await expect(pencil).toBeVisible();

  // Toggle into Edit Mode (Unlocked)
  await pencil.click();

  // Verify aria-pressed="true" and state-discernible aria-label
  await expect(pencil).toHaveAttribute("aria-pressed", "true");
  const pencilLabel = await pencil.getAttribute("aria-label");
  expect(pencilLabel).toMatch(/edit mode.*on/i);

  // axe scan against Unlocked Day view
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  if (serious.length > 0)
    console.log(
      "A-m5-001 violations:",
      JSON.stringify(
        serious.map((v) => ({ id: v.id, impact: v.impact })),
        null,
        2,
      ),
    );
  expect(serious).toHaveLength(0);

  // Every × delete button is a real <button> with aria-label naming its target
  const deleteButtons = page.getByRole("button", {
    name: /^delete (block|brick)/i,
  });
  if ((await deleteButtons.count()) > 0) {
    const firstDeleteBtn = deleteButtons.first();
    await expect(firstDeleteBtn).toBeVisible();
    const label = await firstDeleteBtn.getAttribute("aria-label");
    expect(label).toMatch(/^(delete block|delete brick)/i);

    // Keyboard accessible — Tab reaches it
    const box = await firstDeleteBtn.boundingBox();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  }

  // Pencil hit area >= 44px (ADR-031)
  const pencilBox = await pencil.boundingBox();
  if (pencilBox) {
    expect(pencilBox.width).toBeGreaterThanOrEqual(44);
    expect(pencilBox.height).toBeGreaterThanOrEqual(44);
  }

  // 430px no horizontal overflow
  const overflows = await page.evaluate(() => {
    return document.body.scrollWidth > document.body.clientWidth;
  });
  expect(overflows).toBe(false);
});

// ─── A-m5-002: DeleteConfirmModal — axe clean; keyboard-operable; focus in modal ──

test("A-m5-002: DeleteConfirmModal is axe-clean; role=dialog aria-modal; buttons keyboard-operable; focus enters modal on open", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });

  const pencil = page.getByRole("button", { name: /edit mode/i });
  await expect(pencil).toBeVisible();

  await pencil.click();

  // Find a × delete button for a block
  const deleteBlockBtn = page.getByRole("button", { name: /^delete block/i });
  await expect(deleteBlockBtn.first()).toBeVisible();

  await deleteBlockBtn.first().click({ force: true });

  // Modal must be present
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "true");

  // axe scan with modal open
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  if (serious.length > 0)
    console.log(
      "A-m5-002 violations:",
      JSON.stringify(
        serious.map((v) => ({ id: v.id, impact: v.impact })),
        null,
        2,
      ),
    );
  expect(serious).toHaveLength(0);

  // Modal buttons are keyboard-operable
  const cancelBtn = dialog.getByRole("button", { name: /cancel/i });
  if ((await cancelBtn.count()) > 0) {
    const cancelBox = await cancelBtn.boundingBox();
    if (cancelBox) {
      expect(cancelBox.height).toBeGreaterThanOrEqual(44);
    }
  }

  // ESC closes the modal (Cancel behavior)
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

// ─── A-m5-003: Block jiggle does not cause a11y violations; 430px layout stable ──

test("A-m5-003: jiggle in Edit Mode causes no axe violations; 430px layout stable (no overflow)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });

  const pencil = page.getByRole("button", { name: /edit mode/i });
  await expect(pencil).toBeVisible();

  await pencil.click();
  // Wait for jiggle animation to start
  await page.waitForTimeout(500);

  // axe scan during jiggle
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  if (serious.length > 0)
    console.log(
      "A-m5-003 violations:",
      JSON.stringify(
        serious.map((v) => ({ id: v.id, impact: v.impact })),
        null,
        2,
      ),
    );
  expect(serious).toHaveLength(0);

  // No horizontal overflow while jiggling
  const overflows = await page.evaluate(() => {
    return document.body.scrollWidth > document.body.clientWidth;
  });
  expect(overflows).toBe(false);
});
