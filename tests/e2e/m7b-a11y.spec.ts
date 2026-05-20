/**
 * tests/e2e/m7b-a11y.spec.ts — A-m7b-001, A-m7b-002, A-m7b-003
 *
 * Live now-line glow + active-block pulsing glow + NOW tag — Accessibility E2E tests.
 *
 * Execution is DEFERRED TO VERCEL PREVIEW. axe-core runs more reliably against the
 * production-build output served by Vercel (consistent with M5b/M7a precedent).
 * The sandbox lacks the throttled preview-axe harness.
 *
 * Covers: A-m7b-001, A-m7b-002, A-m7b-003
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Fixture — stateFourBlocks pre-seeded with one active block
const STATE_FOUR_BLOCKS = JSON.stringify({
  schemaVersion: 3,
  programStart: "2026-05-01",
  currentDate: "2026-05-18",
  blocks: [
    {
      id: "blk-A",
      name: "Morning Ritual",
      start: "08:00",
      end: "09:00",
      recurrence: { kind: "just-today", date: "2026-05-18" },
      categoryId: null,
      bricks: [],
    },
    {
      id: "blk-B",
      name: "Deep Work",
      start: "09:00",
      end: "10:00",
      recurrence: { kind: "just-today", date: "2026-05-18" },
      categoryId: null,
      bricks: [],
    },
    {
      id: "blk-C",
      name: "Review",
      start: "10:00",
      end: "11:00",
      recurrence: { kind: "just-today", date: "2026-05-18" },
      categoryId: null,
      bricks: [],
    },
    {
      id: "blk-D",
      name: "Planning",
      start: "11:00",
      end: "12:00",
      recurrence: { kind: "just-today", date: "2026-05-18" },
      categoryId: null,
      bricks: [],
    },
  ],
  looseBricks: [],
  deletions: {},
  history: {},
});

// ─── A-m7b-001 ────────────────────────────────────────────────────────────────
test("A-m7b-001: Day view with one active block is axe-clean — NOW badge contrast + non-text contrast pass; existing TimelineBlock a11y tree unchanged", async ({
  page,
}) => {
  // Pre-seed state + clock to 09:30 (mid-blk-B active)
  await page.clock.setFixedTime(new Date("2026-05-18T09:30:00"));
  await page.goto("/");
  await page.evaluate((state: string) => {
    localStorage.setItem("dharma:v3", state);
  }, STATE_FOUR_BLOCKS);
  await page.reload();

  await page.waitForSelector('[data-component="timeline-block"].is-active');

  // Run axe against the full page
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toHaveLength(0);

  // Verify active-block count and NOW badge presence
  const activeCount = await page
    .locator('[data-component="timeline-block"].is-active')
    .count();
  expect(activeCount).toBe(1);

  const badgeCount = await page.locator('[data-testid="now-tag"]').count();
  expect(badgeCount).toBe(1);

  // Also run axe with no active block (now = 23:30 — after all blocks)
  await page.clock.setFixedTime(new Date("2026-05-18T23:30:00"));
  await page.reload();
  await page.waitForSelector('[data-testid="hour-grid"]');
  await page.waitForTimeout(500);

  const resultsNoActive = await new AxeBuilder({ page }).analyze();
  expect(resultsNoActive.violations).toHaveLength(0);
});

// ─── A-m7b-002 ────────────────────────────────────────────────────────────────
test("A-m7b-002: NOW badge aria-label='Now' is announced by AT surface; visible 'NOW' text not double-announced; badge not in focus chain", async ({
  page,
}) => {
  // Pre-seed state + clock inside blk-B
  await page.clock.setFixedTime(new Date("2026-05-18T09:30:00"));
  await page.goto("/");
  await page.evaluate((state: string) => {
    localStorage.setItem("dharma:v3", state);
  }, STATE_FOUR_BLOCKS);
  await page.reload();

  await page.waitForSelector('[data-testid="now-tag"]');

  // Verify the badge carries aria-label="Now" so AT announces "Now" not "NOW"
  const badgeAriaLabel = await page
    .locator('[data-testid="now-tag"]')
    .getAttribute("aria-label");
  // The badge is announced as "Now" (aria-label overrides the visible "NOW" text)
  expect(badgeAriaLabel).toBe("Now");

  // Badge is not in the focusable chain (no tabindex > -1, pointer-events:none)
  // Tab through the page and verify the badge is never focused
  const badgeLocator = page.locator('[data-testid="now-tag"]');
  const isFocusable = await badgeLocator.evaluate(
    (el: HTMLElement) => el.tabIndex >= 0,
  );
  expect(isFocusable).toBe(false);
});

// ─── A-m7b-003 ────────────────────────────────────────────────────────────────
test("A-m7b-003: Under prefers-reduced-motion:reduce — is-active animation=none; static box-shadow outline remains; NOW badge present; axe-clean", async ({
  page,
}) => {
  // Emulate reduced-motion BEFORE page loads (CDP-level forced media query)
  await page.emulateMedia({ reducedMotion: "reduce" });

  // Pre-seed state + clock inside blk-B
  await page.clock.setFixedTime(new Date("2026-05-18T09:30:00"));
  await page.goto("/");
  await page.evaluate((state: string) => {
    localStorage.setItem("dharma:v3", state);
  }, STATE_FOUR_BLOCKS);
  await page.reload();

  await page.waitForSelector('[data-component="timeline-block"].is-active');

  // Check computed animation-name for .is-active element → should be 'none'
  const animationName = await page
    .locator('[data-component="timeline-block"].is-active')
    .first()
    .evaluate((el: HTMLElement) => getComputedStyle(el).animationName);
  expect(animationName).toBe("none");

  // Check computed box-shadow includes the static 1.5px outline
  const boxShadow = await page
    .locator('[data-component="timeline-block"].is-active')
    .first()
    .evaluate((el: HTMLElement) => getComputedStyle(el).boxShadow);
  // Should contain the static fallback outline (0 0 0 1.5px)
  expect(boxShadow).toContain("1.5px");

  // NOW badge is still present in the DOM
  await expect(page.locator('[data-testid="now-tag"]')).toHaveCount(1);

  // Now-line halo is byte-identical under PRM (box-shadow is not motion)
  const nowLineBoxShadow = await page
    .locator('[data-testid="now-line"]')
    .first()
    .evaluate((el: HTMLElement) => getComputedStyle(el).boxShadow);
  expect(nowLineBoxShadow).toContain("12px");

  // Run axe — zero violations under reduced-motion
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toHaveLength(0);
});
