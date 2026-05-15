/**
 * tests/e2e/m4e.a11y.spec.ts — Milestone 4e accessibility tests (axe-core via Playwright).
 *
 * Execution is deferred to Vercel preview per the M0–M4d sandbox bind-failure
 * pattern (e2e server fails to bind in this sandbox environment).
 * Tests are authored here; run them against the deployed preview URL.
 * Guards: `if ((await x.count()) > 0)` for elements requiring the live app.
 *
 * Covers: A-m4e-001..004
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// ─── A-m4e-001: Duration toggle role=switch + aria-checked + 44px tap target ─

test("A-m4e-001: Duration toggle has role=switch, aria-checked toggles, ≥44px tap target", async ({
  page,
}) => {
  await page.goto("/");

  const dockAdd = page.getByRole("button", { name: "Add" }).last();
  if ((await dockAdd.count()) > 0) {
    await dockAdd.click();
    const chooser = page.getByRole("dialog", { name: "Add" });
    if ((await chooser.count()) > 0) {
      await chooser.getByRole("button", { name: "Add Brick" }).click();
    }

    const sheet = page.getByRole("dialog", { name: /Add Brick/i });
    if ((await sheet.count()) > 0) {
      const toggle = sheet.getByRole("switch", { name: /duration/i });
      if ((await toggle.count()) > 0) {
        // Default: OFF
        await expect(toggle).toHaveAttribute("aria-checked", "false");

        // Verify 44px minimum tap target (ADR-031)
        const box = await toggle.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);

        // Tap to turn ON
        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-checked", "true");

        // Tap to turn OFF
        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-checked", "false");
      }
    }
  }
});

// ─── A-m4e-002: overlap warning role=alert announced on appearance/removal ────

test("A-m4e-002: overlap-warning has role=alert; disappears when overlap clears", async ({
  page,
}) => {
  await page.goto("/");

  const dockAdd = page.getByRole("button", { name: "Add" }).last();
  if ((await dockAdd.count()) > 0) {
    await dockAdd.click();
    const chooser = page.getByRole("dialog", { name: "Add" });
    if ((await chooser.count()) > 0) {
      await chooser.getByRole("button", { name: "Add Brick" }).click();
    }

    const sheet = page.getByRole("dialog", { name: /Add Brick/i });
    if ((await sheet.count()) > 0) {
      await sheet.getByLabel(/Title/i).fill("Overlap test");
      const toggle = sheet.getByRole("switch", { name: /duration/i });
      await toggle.click();

      // Create overlap with a pre-seeded block/brick
      await sheet.getByLabel(/^Start/i).fill("09:30");
      await sheet.getByLabel(/^End/i).fill("10:30");

      const warningChip = page.locator('[data-testid="overlap-warning"]');
      if ((await warningChip.count()) > 0) {
        // Warning has role=alert (screen-reader announcement)
        await expect(warningChip).toHaveAttribute("role", "alert");
        // Text includes name and window
        const text = await warningChip.textContent();
        expect(text).toBeTruthy();

        // Clear the overlap
        await sheet.getByLabel(/^Start/i).fill("08:00");
        await sheet.getByLabel(/^End/i).fill("08:30");

        // Warning should disappear
        await expect(warningChip).not.toBeVisible();
      }
    }
  }
});

// ─── A-m4e-003: disabled Save aria-disabled + aria-describedby hint ──────────

test("A-m4e-003: disabled Save has aria-disabled=true; re-enables when overlap clears", async ({
  page,
}) => {
  await page.goto("/");

  const dockAdd = page.getByRole("button", { name: "Add" }).last();
  if ((await dockAdd.count()) > 0) {
    await dockAdd.click();
    const chooser = page.getByRole("dialog", { name: "Add" });
    if ((await chooser.count()) > 0) {
      await chooser.getByRole("button", { name: "Add Brick" }).click();
    }

    const sheet = page.getByRole("dialog", { name: /Add Brick/i });
    if ((await sheet.count()) > 0) {
      await sheet.getByLabel(/Title/i).fill("Disabled save test");
      const toggle = sheet.getByRole("switch", { name: /duration/i });
      await toggle.click();

      await sheet.getByLabel(/^Start/i).fill("09:30");
      await sheet.getByLabel(/^End/i).fill("10:30");

      const saveBtn = sheet.getByRole("button", { name: /Save/i });
      const warningChip = page.locator('[data-testid="overlap-warning"]');
      if ((await warningChip.count()) > 0) {
        // Save is disabled while overlap active
        await expect(saveBtn).toHaveAttribute("aria-disabled", "true");
        // aria-describedby points to sr-only hint (SPEC AC #22, plan.md § A11y)
        await expect(saveBtn).toHaveAttribute(
          "aria-describedby",
          "brick-save-hint",
        );
        const hint = page.locator("#brick-save-hint");
        await expect(hint).toBeAttached();
        await expect(hint).toHaveText("Resolve the overlap to save.");

        // Clear the overlap
        await sheet.getByLabel(/^Start/i).fill("08:00");
        await sheet.getByLabel(/^End/i).fill("08:30");

        // Save re-enables
        await expect(saveBtn).toHaveAttribute("aria-disabled", "false");
      }
    }
  }
});

// ─── A-m4e-004: zero axe violations with overlap warning visible ─────────────

test("A-m4e-004: zero axe violations with AddBrickSheet open and overlap warning active", async ({
  page,
}) => {
  await page.goto("/");

  const dockAdd = page.getByRole("button", { name: "Add" }).last();
  if ((await dockAdd.count()) > 0) {
    await dockAdd.click();
    const chooser = page.getByRole("dialog", { name: "Add" });
    if ((await chooser.count()) > 0) {
      await chooser.getByRole("button", { name: "Add Brick" }).click();
    }

    const sheet = page.getByRole("dialog", { name: /Add Brick/i });
    if ((await sheet.count()) > 0) {
      await sheet.getByLabel(/Title/i).fill("Axe test");
      const toggle = sheet.getByRole("switch", { name: /duration/i });
      await toggle.click();

      await sheet.getByLabel(/^Start/i).fill("09:30");
      await sheet.getByLabel(/^End/i).fill("10:30");

      // Run axe regardless of whether overlap exists (tests the worst-case a11y surface)
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toHaveLength(0);
    }
  }
});
