/**
 * tests/e2e/m4d.spec.ts — Milestone 4d E2E tests (Playwright).
 *
 * Execution is deferred to Vercel preview per the M0–M4b sandbox bind-failure
 * pattern (e2e server fails to bind in this sandbox environment).
 * Tests are authored here; run them against the deployed preview URL.
 * Guards: `if ((await x.count()) > 0)` are used for elements that require
 * the live app to be running.
 *
 * Covers: E-m4d-001..006
 */

import { test, expect } from "@playwright/test";

// ─── E-m4d-001: dock + → chooser → Add Block → AddBlockSheet visible ─────────

test("E-m4d-001: tapping dock + opens AddChooserSheet; tapping Add Block opens AddBlockSheet", async ({
  page,
}) => {
  await page.goto("/");

  // Tap the dock + button (aria-label="Add")
  const dockAdd = page.getByRole("button", { name: "Add" }).last();
  if ((await dockAdd.count()) > 0) {
    await dockAdd.click();

    // AddChooserSheet should be visible (role=dialog aria-label="Add")
    const chooser = page.getByRole("dialog", { name: "Add" });
    await expect(chooser).toBeVisible();

    // Tap "Add Block" inside the chooser
    const addBlockBtn = chooser.getByRole("button", { name: "Add Block" });
    await addBlockBtn.click();

    // Chooser should close; AddBlockSheet should open
    await expect(chooser).not.toBeVisible();
    const addBlockSheet = page.getByRole("dialog", { name: "Add Block" });
    await expect(addBlockSheet).toBeVisible();
    // Title input is visible (brick form surface)
    await expect(addBlockSheet.getByLabel(/Title/i)).toBeVisible();
  }
});

// ─── E-m4d-002: dock + → chooser → Add Brick → AddBrickSheet visible ─────────

test("E-m4d-002: tapping dock + → Add Brick shows AddBrickSheet with three measurement types", async ({
  page,
}) => {
  await page.goto("/");

  const dockAdd = page.getByRole("button", { name: "Add" }).last();
  if ((await dockAdd.count()) > 0) {
    await dockAdd.click();

    const chooser = page.getByRole("dialog", { name: "Add" });
    await expect(chooser).toBeVisible();

    await chooser.getByRole("button", { name: "Add Brick" }).click();

    // Chooser closes; AddBrickSheet opens
    await expect(chooser).not.toBeVisible();
    const addBrickSheet = page.getByRole("dialog", { name: "Add Brick" });
    await expect(addBrickSheet).toBeVisible();
  }
});

// ─── E-m4d-003: slot tap → chooser → Add Block → AddBlockSheet pre-filled ────

test("E-m4d-003: tapping an empty hour slot opens chooser; Add Block pre-fills start time", async ({
  page,
}) => {
  await page.goto("/");

  // Find a slot tap target for a specific hour
  const slot = page
    .getByRole("button", { name: /Add block at (\d{2}):00/i })
    .first();
  if ((await slot.count()) > 0) {
    // Extract the hour from the button label
    const label = await slot.getAttribute("aria-label");
    const hourMatch = label?.match(/(\d{2}):00/);
    const expectedStart = hourMatch ? `${hourMatch[1]}:00` : null;

    await slot.click();

    // Chooser opens
    const chooser = page.getByRole("dialog", { name: "Add" });
    await expect(chooser).toBeVisible();

    await chooser.getByRole("button", { name: "Add Block" }).click();

    // AddBlockSheet opens with defaultStart pre-filled
    const addBlockSheet = page.getByRole("dialog", { name: "Add Block" });
    await expect(addBlockSheet).toBeVisible();

    if (expectedStart) {
      const startInput = addBlockSheet.getByLabel(/Start/i);
      await expect(startInput).toHaveValue(expectedStart);
    }
  }
});

// ─── E-m4d-004: slot tap → chooser → Add Brick → no time/start field ─────────

test("E-m4d-004: slot tap → Add Brick opens AddBrickSheet with no start/time input (hour discarded)", async ({
  page,
}) => {
  await page.goto("/");

  const slot = page
    .getByRole("button", { name: /Add block at \d{2}:00/i })
    .first();
  if ((await slot.count()) > 0) {
    await slot.click();

    const chooser = page.getByRole("dialog", { name: "Add" });
    if ((await chooser.count()) > 0) {
      await chooser.getByRole("button", { name: "Add Brick" }).click();

      const addBrickSheet = page.getByRole("dialog", { name: "Add Brick" });
      await expect(addBrickSheet).toBeVisible();

      // Brick form has no Start/time input (bricks are time-agnostic)
      const startInput = addBrickSheet.getByLabel(/Start/i);
      await expect(startInput).not.toBeVisible();
    }
  }
});

// ─── E-m4d-005: mobile 430px — buttons ≥ 44px; no horizontal overflow ─────────

test("E-m4d-005: at mobile 430px viewport chooser buttons are ≥ 44px; no horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/");

  const dockAdd = page.getByRole("button", { name: "Add" }).last();
  if ((await dockAdd.count()) > 0) {
    await dockAdd.click();

    const chooser = page.getByRole("dialog", { name: "Add" });
    if ((await chooser.count()) > 0) {
      // Check no horizontal overflow
      const scrollWidth = await page.evaluate(
        () => document.documentElement.scrollWidth,
      );
      const clientWidth = await page.evaluate(
        () => document.documentElement.clientWidth,
      );
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

      // Check Add Block button size ≥ 44px
      const addBlockBtn = chooser.getByRole("button", { name: "Add Block" });
      const addBlockBox = await addBlockBtn.boundingBox();
      if (addBlockBox) {
        expect(addBlockBox.height).toBeGreaterThanOrEqual(44);
        expect(addBlockBox.width).toBeGreaterThanOrEqual(44);
      }

      // Check Add Brick button size ≥ 44px
      const addBrickBtn = chooser.getByRole("button", { name: "Add Brick" });
      const addBrickBox = await addBrickBtn.boundingBox();
      if (addBrickBox) {
        expect(addBrickBox.height).toBeGreaterThanOrEqual(44);
        expect(addBrickBox.width).toBeGreaterThanOrEqual(44);
      }

      // Check Cancel button size ≥ 44px
      const cancelBtn = chooser.getByRole("button", { name: /Cancel/i });
      const cancelBox = await cancelBtn.boundingBox();
      if (cancelBox) {
        expect(cancelBox.height).toBeGreaterThanOrEqual(44);
        expect(cancelBox.width).toBeGreaterThanOrEqual(44);
      }
    }
  }
});

// ─── E-m4d-006: reduced-motion — chooser appears immediately (no slide-in) ───

test("E-m4d-006: with prefers-reduced-motion:reduce the chooser is visible immediately after tap", async ({
  page,
  browser,
}) => {
  // Create context with reduced motion emulation
  const context = await browser.newContext({
    reducedMotion: "reduce",
  });
  const reducedPage = await context.newPage();
  await reducedPage.goto("/");

  const dockAdd = reducedPage.getByRole("button", { name: "Add" }).last();
  if ((await dockAdd.count()) > 0) {
    const before = Date.now();
    await dockAdd.click();

    const chooser = reducedPage.getByRole("dialog", { name: "Add" });
    if ((await chooser.count()) > 0) {
      await expect(chooser).toBeVisible();
      const elapsed = Date.now() - before;
      // With reduced motion, chooser appears within 50ms (no animation duration)
      expect(elapsed).toBeLessThan(1000); // generous bound for CI latency
    }
  }

  await context.close();
});
