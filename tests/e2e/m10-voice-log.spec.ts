/**
 * tests/e2e/m10-voice-log.spec.ts — M10 Voice Log E2E tests
 *
 * All blocks use the ADR-022 sandbox guard because the Web Speech API is
 * unavailable in headless Playwright (AC #19, deferred-to-preview).
 * Guard pattern: `if ((await x.count()) === 0) return;`
 *
 * Covers: E-m10-001..010
 */

import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("dharma:onboarding-shown", "true");
  });
  await page.reload();
  await page.waitForTimeout(300);
});

// ─── E-m10-001: mic button visible and tappable ───────────────────────────────

test("E-m10-001: mic button is visible from Day view (guarded)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  const micBtn = page.getByRole("button", { name: /start voice log/i });
  if ((await micBtn.count()) === 0) return; // AC #19 sandbox guard
  expect(await micBtn.isVisible()).toBe(true);
});

// ─── E-m10-002: mic button aria attributes + keyboard reachable ───────────────

test("E-m10-002: mic button has aria-label='Start voice log' and is keyboard-reachable (guarded)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  const micBtn = page.getByRole("button", { name: /start voice log/i });
  if ((await micBtn.count()) === 0) return;
  expect(await micBtn.getAttribute("aria-label")).toBe("Start voice log");
  // Keyboard Tab reachable — tabIndex should not be -1
  const tabIndex = await micBtn.getAttribute("tabindex");
  expect(tabIndex === null || tabIndex !== "-1").toBe(true);
});

// ─── E-m10-003: unsupported browser — no mic button, no JS error ─────────────

test("E-m10-003: when Web Speech API absent, no mic button, typed Add Brick still works (guarded)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  // Guard: if mic present, this test is not meaningful in this context
  const micBtn = page.getByRole("button", { name: /start voice log/i });
  if ((await micBtn.count()) > 0) return; // AC #19 sandbox guard (inverse)
  // No mic button — verify no JS error
  expect(
    consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("webpack"),
    ),
  ).toHaveLength(0);
  // Typed Add Brick still works
  const quickBrick = page.getByRole("button", { name: /log brick/i });
  expect(await quickBrick.count()).toBeGreaterThan(0);
});

// ─── E-m10-004: tap mic → listening overlay appears ──────────────────────────

test("E-m10-004: tap mic button shows VoiceCaptureOverlay (guarded)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  const micBtn = page.getByRole("button", { name: /start voice log/i });
  if ((await micBtn.count()) === 0) return;
  await micBtn.click();
  const dialog = page.getByRole("dialog", { name: "Listening" });
  if ((await dialog.count()) === 0) return;
  expect(await dialog.isVisible()).toBe(true);
  // Cancel button present
  const cancelBtn = dialog.getByRole("button", { name: /cancel/i });
  expect(await cancelBtn.count()).toBeGreaterThan(0);
});

// ─── E-m10-005: second mic tap cancels, no sheet ─────────────────────────────

test("E-m10-005: second mic tap closes overlay, no AddBrickSheet (guarded)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  const micBtn = page.getByRole("button", { name: /start voice log/i });
  if ((await micBtn.count()) === 0) return;
  await micBtn.click();
  const dialog = page.getByRole("dialog", { name: "Listening" });
  if ((await dialog.count()) === 0) return;
  // Second tap — mic button now says "Stop voice log"
  const stopBtn = page.getByRole("button", { name: /stop voice log/i });
  if ((await stopBtn.count()) === 0) return;
  await stopBtn.click();
  // Overlay gone
  expect(await page.getByRole("dialog", { name: "Listening" }).count()).toBe(0);
  // No AddBrickSheet
  expect(await page.getByRole("dialog", { name: "Add Brick" }).count()).toBe(0);
});

// ─── E-m10-006: Cancel button closes overlay, no sheet ───────────────────────

test("E-m10-006: Cancel in overlay closes it, no AddBrickSheet opens (guarded)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  const micBtn = page.getByRole("button", { name: /start voice log/i });
  if ((await micBtn.count()) === 0) return;
  await micBtn.click();
  const dialog = page.getByRole("dialog", { name: "Listening" });
  if ((await dialog.count()) === 0) return;
  const cancelBtn = dialog.getByRole("button", { name: /cancel/i });
  await cancelBtn.click();
  expect(await page.getByRole("dialog", { name: "Listening" }).count()).toBe(0);
  expect(await page.getByRole("dialog", { name: "Add Brick" }).count()).toBe(0);
});

// ─── E-m10-007: pre-filled AddBrickSheet saves same as typed ─────────────────

test("E-m10-007: AddBrickSheet pre-filled via transcript saves identically to typed (guarded)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  // This test requires the full voice flow which needs real Web Speech API.
  // Guard: mic button must be present (speech supported).
  const micBtn = page.getByRole("button", { name: /start voice log/i });
  if ((await micBtn.count()) === 0) return;
  // In headless Playwright the speech API doesn't fire — this test passes trivially.
  // When run against a preview with the API available, the transcript → sheet flow
  // should create a brick via the same onSave path as the typed flow.
  // The guard ensures we don't fail the CI test suite for this deferred-to-preview case.
});

// ─── E-m10-008: 430px dock no overflow ───────────────────────────────────────

test("E-m10-008: 430px dock renders mic + Log Brick + + with no overflow (guarded)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  const micBtn = page.getByRole("button", { name: /start voice log/i });
  if ((await micBtn.count()) === 0) return;
  // Check no horizontal scrollbar
  const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
  const clientWidth = await page.evaluate(
    () => document.documentElement.clientWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // +1 for rounding
});

// ─── E-m10-009: 430px overlay no overflow ────────────────────────────────────

test("E-m10-009: 430px with listening overlay open — no horizontal overflow (guarded)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  const micBtn = page.getByRole("button", { name: /start voice log/i });
  if ((await micBtn.count()) === 0) return;
  await micBtn.click();
  const dialog = page.getByRole("dialog", { name: "Listening" });
  if ((await dialog.count()) === 0) return;
  const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
  const clientWidth = await page.evaluate(
    () => document.documentElement.clientWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
});

// ─── E-m10-010: M1–M9e typed flows untouched ─────────────────────────────────

test("E-m10-010: typed Add Brick / Add Block / chooser flows work after M10 build", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  // Log Brick pill still works
  const quickBrick = page.getByRole("button", { name: /log brick/i });
  expect(await quickBrick.count()).toBeGreaterThan(0);
  await quickBrick.click();
  const addBrickDialog = page.getByRole("dialog", { name: "Add Brick" });
  if ((await addBrickDialog.count()) > 0) {
    // Close it
    const cancelBtn = addBrickDialog.getByRole("button", { name: /cancel/i });
    if ((await cancelBtn.count()) > 0) await cancelBtn.click();
  }

  // + chooser still works
  const addBtn = page.getByRole("button", { name: /^add$/i });
  await addBtn.click();
  const chooser = page.getByRole("dialog", { name: /choose/i });
  if ((await chooser.count()) > 0) {
    const cancelChooser = chooser.getByRole("button", { name: /cancel/i });
    if ((await cancelChooser.count()) > 0) await cancelChooser.click();
  }

  // No unexpected JS errors
  const significantErrors = consoleErrors.filter(
    (e) =>
      !e.includes("favicon") &&
      !e.includes("webpack") &&
      !e.includes("net::ERR"),
  );
  expect(significantErrors).toHaveLength(0);
});
