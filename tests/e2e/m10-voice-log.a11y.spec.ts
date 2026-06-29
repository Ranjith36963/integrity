/**
 * tests/e2e/m10-voice-log.a11y.spec.ts — M10 Voice Log accessibility tests (axe-core via Playwright).
 *
 * Execution is deferred to Vercel preview — headless Playwright cannot access the Web Speech API.
 * All blocks use the ADR-022 sandbox guard `if ((await x.count()) === 0) return;`.
 *
 * Per ADR-018: localStorage cleared in beforeEach.
 *
 * Covers: A-m10-001..003
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("dharma:onboarding-shown", "true");
  });
  await page.reload();
  await page.waitForTimeout(300);
});

// ─── A-m10-001: dock axe clean, mic button has accessible name ────────────────

test("A-m10-001: dock is axe-clean and mic button has accessible name (guarded)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });

  const micBtn = page.getByRole("button", { name: /start voice log/i });
  if ((await micBtn.count()) === 0) return; // AC #19 sandbox guard

  // axe scan on the full page
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  if (serious.length > 0)
    console.log(
      "A-m10-001 violations:",
      JSON.stringify(
        serious.map((v) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
        })),
        null,
        2,
      ),
    );
  expect(serious).toHaveLength(0);

  // Mic button must have an accessible name
  const label = await micBtn.getAttribute("aria-label");
  expect(label).toBe("Start voice log");

  // Mic button must not have tabindex=-1
  const tabIndex = await micBtn.getAttribute("tabindex");
  expect(tabIndex === null || tabIndex !== "-1").toBe(true);
});

// ─── A-m10-002: listening overlay axe clean, dialog role + live region ────────

test("A-m10-002: VoiceCaptureOverlay is axe-clean with correct dialog/live-region semantics (guarded)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });

  const micBtn = page.getByRole("button", { name: /start voice log/i });
  if ((await micBtn.count()) === 0) return; // AC #19 sandbox guard

  await micBtn.click();

  const dialog = page.getByRole("dialog", { name: "Listening" });
  if ((await dialog.count()) === 0) return; // guard: overlay may not open without real Speech API

  await expect(dialog).toBeVisible();

  // axe scan with overlay open
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  if (serious.length > 0)
    console.log(
      "A-m10-002 violations:",
      JSON.stringify(
        serious.map((v) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
        })),
        null,
        2,
      ),
    );
  expect(serious).toHaveLength(0);

  // Dialog has accessible name
  const dialogLabel = await dialog.getAttribute("aria-label");
  expect(dialogLabel).toBe("Listening");

  // Dialog is aria-modal
  const modalAttr = await dialog.getAttribute("aria-modal");
  expect(modalAttr).toBe("true");

  // Live region present inside dialog
  const liveRegion = dialog.getByRole("status");
  if ((await liveRegion.count()) > 0) {
    const ariaLive = await liveRegion.getAttribute("aria-live");
    expect(ariaLive).toBe("polite");
  }

  // Cancel button is present and has accessible name
  const cancelBtn = dialog.getByRole("button", { name: /cancel/i });
  expect(await cancelBtn.count()).toBeGreaterThan(0);
});

// ─── A-m10-003: overlay with prefers-reduced-motion: reduce — axe clean, no animation ──

test("A-m10-003: overlay with prefers-reduced-motion:reduce is axe-clean and no pulse animation (guarded)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });

  // Emulate prefers-reduced-motion: reduce
  await page.emulateMedia({ reducedMotion: "reduce" });

  const micBtn = page.getByRole("button", { name: /start voice log/i });
  if ((await micBtn.count()) === 0) return; // AC #19 sandbox guard

  await micBtn.click();

  const dialog = page.getByRole("dialog", { name: "Listening" });
  if ((await dialog.count()) === 0) return; // guard: overlay may not open without real Speech API

  await expect(dialog).toBeVisible();

  // axe scan with reduced motion
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  if (serious.length > 0)
    console.log(
      "A-m10-003 violations:",
      JSON.stringify(
        serious.map((v) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
        })),
        null,
        2,
      ),
    );
  expect(serious).toHaveLength(0);

  // Voice ring: data-prm attribute should be "true" (reduced motion active)
  const ring = page.getByTestId("voice-ring");
  if ((await ring.count()) > 0) {
    const prm = await ring.getAttribute("data-prm");
    expect(prm).toBe("true");

    // No pulse animation class — CSS only applies pulse via @media (prefers-reduced-motion: no-preference)
    const hasClass = await ring.evaluate((el) =>
      el.classList.contains("voice-ring-pulse"),
    );
    // The CSS animation is suppressed by the media query; class may or may not be present
    // but animation-play-state should be paused or animation should be "none"
    const animationName = await ring.evaluate(
      (el) => getComputedStyle(el).animationName,
    );
    // Under prefers-reduced-motion: reduce, animation should not be running (none or paused)
    // We check that the computed animation-name is either "none" (typical) or not "voiceListenPulse"
    // because the CSS uses @media (prefers-reduced-motion: no-preference) to guard it
    if (animationName !== "none") {
      // If animationName is present, playState should not be running
      const playState = await ring.evaluate(
        (el) => getComputedStyle(el).animationPlayState,
      );
      expect(playState).not.toBe("running");
    }
    // Primary assertion: no pulse animation active
    expect(hasClass && animationName === "voiceListenPulse").toBe(false);
  }
});
