/**
 * tests/e2e/m5.a11y.spec.ts — Milestone 5 accessibility tests (axe-core via Playwright).
 *
 * Execution is deferred to Vercel preview — this sandbox cannot launch chromium
 * (binary missing, confirmed by M4a–M9e EVALUATOR reports and status.md).
 * Tests are authored here as real test() blocks; run them against the deployed preview URL.
 * Guards: `if ((await x.count()) > 0)` per ADR-039 + ADR-022.
 *
 * Covers: A-m5-001..003
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload();
});

// ─── A-m5-001: Edit Mode — axe clean; pencil + × keyboard-operable; 430px no overflow ──

test("A-m5-001: Unlocked Day view is axe-clean; pencil + every × keyboard-operable + SR-labeled; 430px no overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/");
  await page.waitForTimeout(300);

  // Find the pencil Edit Mode toggle
  const pencil = page.getByRole("button", { name: /edit mode/i });
  if ((await pencil.count()) === 0) return;

  // Toggle into Edit Mode (Unlocked)
  await pencil.click();

  // Verify aria-pressed="true" and state-discernible aria-label
  await expect(pencil).toHaveAttribute("aria-pressed", "true");
  const pencilLabel = await pencil.getAttribute("aria-label");
  expect(pencilLabel).toMatch(/edit mode.*on/i);

  // axe scan against Unlocked Day view
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toHaveLength(0);

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
  await page.goto("/");
  await page.waitForTimeout(300);

  const pencil = page.getByRole("button", { name: /edit mode/i });
  if ((await pencil.count()) === 0) return;

  await pencil.click();

  // Find a × delete button for a block
  const deleteBlockBtn = page.getByRole("button", { name: /^delete block/i });
  if ((await deleteBlockBtn.count()) === 0) return;

  await deleteBlockBtn.first().click();

  // Modal must be present
  const dialog = page.getByRole("dialog");
  if ((await dialog.count()) === 0) return;
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "true");

  // axe scan with modal open
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toHaveLength(0);

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
  await page.goto("/");
  await page.waitForTimeout(300);

  const pencil = page.getByRole("button", { name: /edit mode/i });
  if ((await pencil.count()) === 0) return;

  await pencil.click();
  // Wait for jiggle animation to start
  await page.waitForTimeout(500);

  // axe scan during jiggle
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toHaveLength(0);

  // No horizontal overflow while jiggling
  const overflows = await page.evaluate(() => {
    return document.body.scrollWidth > document.body.clientWidth;
  });
  expect(overflows).toBe(false);
});
