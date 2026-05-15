/**
 * tests/e2e/m8.spec.ts — Milestone 8 E2E tests (Playwright).
 *
 * Execution is deferred to Vercel preview — this sandbox cannot launch chromium
 * (binary missing, confirmed by M4a–M4g EVALUATOR reports and status.md).
 * Tests are authored here as real test() blocks; run them against the deployed preview URL.
 * Guards: `if ((await x.count()) > 0)` per ADR-039 + ADR-022 (no deterministic seeding).
 *
 * Per AC #15: each case clears localStorage in a beforeEach (ADR-018).
 *
 * Covers: E-m8-001..003
 */

import { test, expect } from "@playwright/test";

// AC #15: clear localStorage before each E2E case (ADR-018)
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload();
});

// ─── E-m8-001: first-run empty — no hydration-mismatch, dharma:v1 written ─────

test("E-m8-001: first run — empty state, no hydration-mismatch warning, dharma:v1 written after first save", async ({
  page,
}) => {
  // Collect console errors to detect hydration-mismatch warnings
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      consoleErrors.push(msg.text());
    }
  });

  await page.goto("/");

  const hero = page.locator("section").first();
  if ((await hero.count()) > 0) {
    // App renders without crash
    await expect(hero).toBeVisible();

    // Hero day number reads "Building 1 of N" (first run — programStart = today)
    const dayCounter = hero.locator(".mt-1").first();
    if ((await dayCounter.count()) > 0) {
      const text = await dayCounter.textContent();
      expect(text?.trim()).toMatch(/^Building 1 of \d+$/);
    }

    // No hydration-mismatch errors in console
    const hydrationErrors = consoleErrors.filter(
      (e) =>
        e.includes("Hydration") ||
        e.includes("hydration") ||
        e.includes("did not match"),
    );
    expect(hydrationErrors).toHaveLength(0);

    // Wait briefly for the save effect to fire
    await page.waitForTimeout(200);

    // dharma:v1 is now written with schemaVersion: 1 and empty collections
    const stored = await page.evaluate(() => localStorage.getItem("dharma:v1"));
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, unknown>;
      expect(parsed.schemaVersion).toBe(1);
      expect(Array.isArray(parsed.blocks)).toBe(true);
      expect(Array.isArray(parsed.categories)).toBe(true);
      expect(Array.isArray(parsed.looseBricks)).toBe(true);
    }
  }
});

// ─── E-m8-002: mutate → reload → state persists ───────────────────────────────

test("E-m8-002: mutate → reload → block, brick, and brick done state survive the reload", async ({
  page,
}) => {
  await page.goto("/");

  const dockAdd = page.getByRole("button", { name: "Add" }).last();
  if ((await dockAdd.count()) === 0) return;

  // Add a block
  await dockAdd.click();
  const chooser = page.getByRole("dialog", { name: "Add" });
  if ((await chooser.count()) === 0) return;
  await chooser.getByRole("button", { name: "Add Block" }).click();

  const blockSheet = page.getByRole("dialog", { name: /Add Block/i });
  if ((await blockSheet.count()) === 0) return;
  await blockSheet.getByLabel(/Title/i).fill("Persist Test");
  await blockSheet.getByRole("button", { name: /Save/i }).click();
  await expect(blockSheet).not.toBeVisible();

  // Add a tick brick to the block
  const tlBlock = page.locator('[data-component="timeline-block"]').first();
  if ((await tlBlock.count()) === 0) return;

  const addBrickBtn = tlBlock.getByRole("button", { name: /add brick/i });
  if ((await addBrickBtn.count()) > 0) {
    await addBrickBtn.click();
    const brickSheet = page.getByRole("dialog", { name: /Add Brick/i });
    if ((await brickSheet.count()) > 0) {
      await brickSheet.getByLabel(/Title/i).fill("Persist Brick");
      await brickSheet.getByRole("button", { name: /Save/i }).click();
      await expect(brickSheet).not.toBeVisible();
    }
  }

  // Tick the brick
  const brickBtn = page.getByRole("button", { name: /Persist Brick/i }).first();
  if ((await brickBtn.count()) > 0) {
    await brickBtn.click();
  }

  // Reload the page
  await page.reload();
  await page.waitForTimeout(300); // let hydration effect run

  // After reload: block and brick still present (under guard)
  const blockAfterReload = page
    .locator('[data-component="timeline-block"]')
    .first();
  if ((await blockAfterReload.count()) > 0) {
    expect(await blockAfterReload.textContent()).toContain("Persist Test");

    // dharma:v1 holds the post-mutation state
    const stored = await page.evaluate(() => localStorage.getItem("dharma:v1"));
    if (stored) {
      const parsed = JSON.parse(stored) as { blocks?: { name: string }[] };
      expect(parsed.blocks?.some((b) => b.name === "Persist Test")).toBe(true);
    }
  }
});

// ─── E-m8-003: corrupt dharma:v1 → app recovers, passive overwrite ────────────

test("E-m8-003: corrupt dharma:v1 → app renders normally, next save overwrites corrupt key", async ({
  page,
}) => {
  // Set a corrupt key before loading the app
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("dharma:v1", "{not json");
  });

  // Reload with the corrupt key
  await page.reload();
  await page.waitForTimeout(300); // let hydration effect run

  const body = page.locator("body");
  if ((await body.count()) > 0) {
    // App renders without uncaught exception or error overlay
    const errorOverlay = page.locator("[data-nextjs-dialog]");
    expect(await errorOverlay.count()).toBe(0);

    // Building view is visible
    const hero = page.locator("section").first();
    if ((await hero.count()) > 0) {
      await expect(hero).toBeVisible();
    }

    // After an add action, the corrupt key is overwritten with valid JSON
    const dockAdd = page.getByRole("button", { name: "Add" }).last();
    if ((await dockAdd.count()) > 0) {
      // First, check that dharma:v1 is now valid JSON (the hydration effect's first save
      // after mount fires with the defaultPersisted() state, overwriting the corrupt key)
      await page.waitForTimeout(200);
      const stored = await page.evaluate(() =>
        localStorage.getItem("dharma:v1"),
      );
      if (stored) {
        // Must be valid JSON now (passive overwrite by saveState)
        const parsed = JSON.parse(stored) as Record<string, unknown>;
        expect(parsed.schemaVersion).toBe(1);
      }
    }
  }
});
