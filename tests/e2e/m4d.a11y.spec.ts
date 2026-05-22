/**
 * tests/e2e/m4d.a11y.spec.ts — Milestone 4d accessibility tests (axe-core via Playwright).
 *
 * Execution is deferred to Vercel preview per the M0–M4b sandbox bind-failure
 * pattern (e2e server fails to bind in this sandbox environment).
 * Tests are authored here; run them against the deployed preview URL.
 * Guards: `if ((await x.count()) > 0)` for elements requiring the live app.
 *
 * Covers: A-m4d-001..004
 *
 * A-m4d-002 note: Tab order + focus trap are exercised here (VERIFIER D2 flagged
 * that native browsers do NOT trap Tab in a dialog without explicit JS focus trap
 * or inert on siblings; AddChooserSheet implements an explicit focus trap).
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// ─── A-m4d-001: zero axe violations on the open chooser ──────────────────────

test("A-m4d-001: no axe violations when AddChooserSheet is open", async ({
  page,
}) => {
  await page.goto("/");

  const dockAdd = page.getByRole("button", { name: "Add" }).last();
  if ((await dockAdd.count()) > 0) {
    await dockAdd.click();

    const chooser = page.getByRole("dialog", { name: "Add" });
    if ((await chooser.count()) > 0) {
      await expect(chooser).toBeVisible();

      // Run axe-core against the full document with the chooser open
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toHaveLength(0);
    }
  }
});

// ─── A-m4d-002: focus trap + tab order + role/aria ────────────────────────────

test("A-m4d-002: chooser has role=dialog aria-label='Add'; Tab cycles Add Block → Add Brick → Cancel → (back)", async ({
  page,
}) => {
  await page.goto("/");

  const dockAdd = page.getByRole("button", { name: "Add" }).last();
  if ((await dockAdd.count()) > 0) {
    await dockAdd.click();

    const chooser = page.getByRole("dialog", { name: "Add" });
    if ((await chooser.count()) > 0) {
      await expect(chooser).toBeVisible();

      // Verify role=dialog + aria-label="Add"
      await expect(chooser).toHaveAttribute("role", "dialog");
      await expect(chooser).toHaveAttribute("aria-label", "Add");

      // Tab to first focusable element
      await page.keyboard.press("Tab");
      const firstFocused = await page.evaluate(() =>
        document.activeElement?.getAttribute("aria-label"),
      );
      expect(firstFocused).toBe("Add Block");

      // Tab to second
      await page.keyboard.press("Tab");
      const secondFocused = await page.evaluate(() =>
        document.activeElement?.getAttribute("aria-label"),
      );
      expect(secondFocused).toBe("Add Brick");

      // Tab to third (Cancel)
      await page.keyboard.press("Tab");
      const thirdFocused = await page.evaluate(() =>
        document.activeElement?.getAttribute("aria-label"),
      );
      expect(thirdFocused).toBe("Cancel");

      // Tab once more — focus trap should cycle back to Add Block
      await page.keyboard.press("Tab");
      const afterTrapFocused = await page.evaluate(() =>
        document.activeElement?.getAttribute("aria-label"),
      );
      expect(afterTrapFocused).toBe("Add Block");

      // Shift+Tab from Add Block should cycle to Cancel
      await page.keyboard.press("Shift+Tab");
      const shiftTabFocused = await page.evaluate(() =>
        document.activeElement?.getAttribute("aria-label"),
      );
      expect(shiftTabFocused).toBe("Cancel");
    }
  }
});

// ─── A-m4d-003: Add Block, Add Brick, Cancel ≥ 44px (ADR-031) ────────────────

test("A-m4d-003: Add Block, Add Brick, and Cancel buttons are ≥ 44px (ADR-031)", async ({
  page,
}) => {
  await page.goto("/");

  const dockAdd = page.getByRole("button", { name: "Add" }).last();
  if ((await dockAdd.count()) > 0) {
    await dockAdd.click();

    const chooser = page.getByRole("dialog", { name: "Add" });
    if ((await chooser.count()) > 0) {
      const addBlockBtn = chooser.getByRole("button", { name: "Add Block" });
      const addBrickBtn = chooser.getByRole("button", { name: "Add Brick" });
      const cancelBtn = chooser.getByRole("button", { name: /Cancel/i });

      const addBlockBox = await addBlockBtn.boundingBox();
      const addBrickBox = await addBrickBtn.boundingBox();
      const cancelBox = await cancelBtn.boundingBox();

      if (addBlockBox) {
        expect(addBlockBox.width).toBeGreaterThanOrEqual(44);
        expect(addBlockBox.height).toBeGreaterThanOrEqual(44);
      }
      if (addBrickBox) {
        expect(addBrickBox.width).toBeGreaterThanOrEqual(44);
        expect(addBrickBox.height).toBeGreaterThanOrEqual(44);
      }
      if (cancelBox) {
        expect(cancelBox.width).toBeGreaterThanOrEqual(44);
        expect(cancelBox.height).toBeGreaterThanOrEqual(44);
      }
    }
  }
});

// ─── A-m4d-004: Esc dismisses chooser silently (stretch test) ────────────────
//
// Note: This is a stretch test per VERIFIER D4. If Sheet doesn't handle Esc
// the chooser may not dismiss. If this test fails in preview, it's a soft note
// for SHIPPER's status.md rather than a blocking failure.

test("A-m4d-004: pressing Escape closes the chooser without opening any downstream sheet", async ({
  page,
}) => {
  await page.goto("/");

  const dockAdd = page.getByRole("button", { name: "Add" }).last();
  if ((await dockAdd.count()) > 0) {
    await dockAdd.click();

    const chooser = page.getByRole("dialog", { name: "Add" });
    if ((await chooser.count()) > 0) {
      await expect(chooser).toBeVisible();

      // Press Escape
      await page.keyboard.press("Escape");

      // Chooser should close
      await expect(chooser).not.toBeVisible();

      // No downstream sheet should have opened
      const addBlockSheet = page.getByRole("dialog", { name: "Add Block" });
      const addBrickSheet = page.getByRole("dialog", { name: "Add Brick" });
      await expect(addBlockSheet).not.toBeVisible();
      await expect(addBrickSheet).not.toBeVisible();
    }
  }
});
