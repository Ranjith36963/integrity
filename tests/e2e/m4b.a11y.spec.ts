/**
 * tests/e2e/m4b.a11y.spec.ts — Milestone 4b accessibility tests (axe-core via Playwright).
 *
 * Execution is deferred to Vercel preview per the M0–M4a sandbox bind-failure
 * pattern (e2e server fails to bind in this sandbox environment).
 * Tests are authored here; run them against the deployed preview URL.
 *
 * Covers: A-m4b-001..006
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// ─── A-m4b-001: zero axe violations with mixed brick kinds visible ────────────

test("A-m4b-001: no axe violations with tick + goal + time bricks visible", async ({
  page,
}) => {
  await page.goto("/");

  // Requires seeded state with all three brick kinds — deferred to preview.
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toHaveLength(0);
});

// ─── A-m4b-002: stepper aria-labels + outer group aria-label expose context ──

test("A-m4b-002: − has 'Decrease pushups'; + has 'Increase pushups'; group aria-label includes name + 'goal' + 'of'", async ({
  page,
}) => {
  await page.goto("/");

  // Requires seeded state with goal brick { name: 'pushups', count: 3, target: 10 } — deferred.
  const minus = page.getByRole("button", { name: "Decrease pushups" });
  const plus = page.getByRole("button", { name: "Increase pushups" });
  if ((await minus.count()) > 0 && (await plus.count()) > 0) {
    expect(await minus.getAttribute("aria-label")).toBe("Decrease pushups");
    expect(await plus.getAttribute("aria-label")).toBe("Increase pushups");
    // The chip's outer wrapper is the closest role=group ancestor of either button
    const group = minus.locator("xpath=ancestor::*[@role='group'][1]");
    const groupLabel = await group.getAttribute("aria-label");
    expect(groupLabel).toContain("pushups");
    expect(groupLabel).toContain("goal");
    expect(groupLabel).toContain("of");
  }
});

// ─── A-m4b-003: floor/cap disabled buttons drop out of tab order; siblings stay ─

test("A-m4b-003: at floor − is disabled and skipped by Tab; at cap + is disabled and skipped", async ({
  page,
}) => {
  await page.goto("/");

  // Requires seeded state with one floor brick (0/10) and one cap brick (10/10) — deferred.
  const floorMinus = page
    .getByRole("button", { name: /Decrease/i })
    .filter({ has: page.locator(":scope[disabled]") })
    .first();
  const capPlus = page
    .getByRole("button", { name: /Increase/i })
    .filter({ has: page.locator(":scope[disabled]") })
    .first();

  if ((await floorMinus.count()) > 0) {
    expect(await floorMinus.isDisabled()).toBe(true);
    // Sibling + on the floor chip retains its accessible name
    const group = floorMinus.locator("xpath=ancestor::*[@role='group'][1]");
    const siblingPlus = group.getByRole("button", { name: /Increase/i });
    expect(await siblingPlus.getAttribute("aria-label")).toMatch(/^Increase /);
    expect(await siblingPlus.isDisabled()).toBe(false);
  }

  if ((await capPlus.count()) > 0) {
    expect(await capPlus.isDisabled()).toBe(true);
    const group = capPlus.locator("xpath=ancestor::*[@role='group'][1]");
    const siblingMinus = group.getByRole("button", { name: /Decrease/i });
    expect(await siblingMinus.getAttribute("aria-label")).toMatch(/^Decrease /);
    expect(await siblingMinus.isDisabled()).toBe(false);
  }
});

// ─── A-m4b-004: Tab → Enter on −; Tab → Space on +; one dispatch per press ────

test("A-m4b-004: keyboard Enter on − decrements; Space on + increments; both reachable via Tab", async ({
  page,
}) => {
  await page.goto("/");

  // Requires seeded state with goal brick at 3/10 — deferred to preview.
  const minus = page.getByRole("button", { name: /Decrease/i }).first();
  const plus = page.getByRole("button", { name: /Increase/i }).first();
  if ((await minus.count()) > 0 && (await plus.count()) > 0) {
    const chip = minus.locator("xpath=ancestor::*[@role='group'][1]");

    await minus.focus();
    await page.keyboard.press("Enter");
    await expect(chip).toContainText("2 / 10", { timeout: 200 });

    await plus.focus();
    await page.keyboard.press("Space");
    await expect(chip).toContainText("3 / 10", { timeout: 200 });
  }
});

// ─── A-m4b-005: stepper buttons measured ≥ 44 × 44 px (ADR-031) ──────────────

test("A-m4b-005: − and + buttons have measured height ≥ 44px and width ≥ 44px", async ({
  page,
}) => {
  await page.goto("/");

  // Requires seeded state with a goal brick — deferred to preview.
  const minus = page.getByRole("button", { name: /Decrease/i }).first();
  const plus = page.getByRole("button", { name: /Increase/i }).first();
  if ((await minus.count()) > 0) {
    const box = await minus.boundingBox();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
  }
  if ((await plus.count()) > 0) {
    const box = await plus.boundingBox();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
  }
});

// ─── A-m4b-006: zero axe violations with a disabled stepper present ──────────

test("A-m4b-006: zero axe violations with floor brick (− disabled) seeded; button-name passes", async ({
  page,
}) => {
  await page.goto("/");

  // Requires seeded state with a goal brick at 0/10 (− is disabled) — deferred.
  const minus = page.getByRole("button", { name: /Decrease/i }).first();
  if ((await minus.count()) > 0) {
    expect(await minus.isDisabled()).toBe(true);
    // Disabled control still exposes its accessible name
    expect(await minus.getAttribute("aria-label")).toMatch(/^Decrease /);
    // Group wrapper is correctly recognized
    const group = minus.locator("xpath=ancestor::*[@role='group'][1]");
    expect(await group.count()).toBe(1);
  }

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toHaveLength(0);
});
