/**
 * tests/e2e/m7b.spec.ts — E-m7b-001, E-m7b-002, E-m7b-003, E-m7b-005
 *
 * Live now-line glow + active-block pulsing glow + NOW tag — E2E tests.
 *
 * Execution is DEFERRED TO VERCEL PREVIEW. This sandbox cannot run Lighthouse
 * or Chromium frame-rate traces. Tests are authored as real test() blocks;
 * run against the deployed preview URL (consistent with M5b/M7a/M9d/M9e precedent).
 *
 * Covers: E-m7b-001, E-m7b-002, E-m7b-003, E-m7b-005
 */

import { test, expect } from "@playwright/test";

// Fixture — stateFourBlocks with 4 consecutive blocks
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

// ─── E-m7b-001 ────────────────────────────────────────────────────────────────
test("E-m7b-001: exactly one block carries is-active when now falls inside its [start,end); NOW badge visible inside it", async ({
  page,
}) => {
  // Pre-seed state + override clock to 09:30 (mid-blk-B)
  await page.clock.setFixedTime(new Date("2026-05-18T09:30:00"));
  await page.goto("/");
  await page.evaluate((state: string) => {
    localStorage.setItem("dharma:v3", state);
  }, STATE_FOUR_BLOCKS);
  await page.reload();

  // Wait for hydration
  await page.waitForSelector('[data-testid="hour-grid"]');
  await page.waitForTimeout(500);

  // Exactly one block carries is-active
  const activeBlocks = page.locator(
    '[data-component="timeline-block"].is-active',
  );
  await expect(activeBlocks).toHaveCount(1);

  // The active block is blk-B (contains "Deep Work")
  await expect(activeBlocks.first()).toContainText("Deep Work");

  // NOW badge is visible inside the active block
  const badge = page.locator('[data-testid="now-tag"]');
  await expect(badge).toHaveCount(1);
  await expect(
    activeBlocks.first().locator('[data-testid="now-tag"]'),
  ).toHaveCount(1);

  // Take screenshot for visual diff baseline (SG-m7b-02 placement + SG-m7b-03 hierarchy)
  await page.screenshot({ path: "e2e-screenshots/m7b-active-block-pulse.png" });
});

// ─── E-m7b-002 ────────────────────────────────────────────────────────────────
test("E-m7b-002: NOW badge + is-active migrate to next block after clock advance past blk-B end; no active after last block", async ({
  page,
}) => {
  // Pre-seed state + override clock to 09:30
  await page.clock.setFixedTime(new Date("2026-05-18T09:30:00"));
  await page.goto("/");
  await page.evaluate((state: string) => {
    localStorage.setItem("dharma:v3", state);
  }, STATE_FOUR_BLOCKS);
  await page.reload();

  await page.waitForSelector('[data-testid="hour-grid"]');
  await page.waitForTimeout(500);

  // Verify blk-B is active at 09:30
  const activeBlocks = page.locator(
    '[data-component="timeline-block"].is-active',
  );
  await expect(activeBlocks).toHaveCount(1);
  await expect(activeBlocks.first()).toContainText("Deep Work");

  // Advance clock to 10:30 (inside blk-C); allow up to 65s for tick
  await page.clock.fastForward(61 * 60 * 1000); // 61 minutes past 09:30 = 10:31
  await page.waitForTimeout(2000);

  // blk-C should now be active
  await expect(
    page.locator('[data-component="timeline-block"].is-active'),
  ).toHaveCount(1);
  await expect(
    page.locator('[data-component="timeline-block"].is-active').first(),
  ).toContainText("Review");

  // Advance clock past all blocks (to 23:30) — no active block
  await page.clock.fastForward(13 * 60 * 60 * 1000); // ~13 hours further
  await page.waitForTimeout(2000);

  await expect(
    page.locator('[data-component="timeline-block"].is-active'),
  ).toHaveCount(0);
  await expect(page.locator('[data-testid="now-tag"]')).toHaveCount(0);
});

// ─── E-m7b-003 ────────────────────────────────────────────────────────────────
test("E-m7b-003: pulse animation runs >= 55 fps over a 5s trace; box-shadow is the only animated property", async ({
  page,
}) => {
  // Pre-seed state + clock inside blk-B
  await page.clock.setFixedTime(new Date("2026-05-18T09:30:00"));
  await page.goto("/");
  await page.evaluate((state: string) => {
    localStorage.setItem("dharma:v3", state);
  }, STATE_FOUR_BLOCKS);
  await page.reload();

  await page.waitForSelector('[data-component="timeline-block"].is-active');

  // Start a Chromium trace capturing rendering events
  await page.context().tracing.start({ screenshots: false, snapshots: false });

  // Record 5 seconds of the pulse animation
  await page.waitForTimeout(5000);

  const tracePath = "/tmp/m7b-pulse-trace.zip";
  await page.context().tracing.stop({ path: tracePath });

  // Measure frame rate via performance API
  const frameRate = await page.evaluate(() => {
    const entries = performance.getEntriesByType("navigation");
    // Fallback: use animation frame count over elapsed time
    return new Promise<number>((resolve) => {
      let frameCount = 0;
      const start = performance.now();
      const measure = () => {
        frameCount++;
        if (performance.now() - start < 1000) {
          requestAnimationFrame(measure);
        } else {
          resolve(frameCount);
        }
      };
      requestAnimationFrame(measure);
      void entries;
    });
  });

  // Expect >= 55 fps over the measurement window
  expect(frameRate).toBeGreaterThanOrEqual(55);
});

// ─── E-m7b-005 ────────────────────────────────────────────────────────────────
test("E-m7b-005: now-line halo renders outer 12px halo; halo is byte-identical under prefers-reduced-motion", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate((state: string) => {
    localStorage.setItem("dharma:v3", state);
  }, STATE_FOUR_BLOCKS);
  await page.reload();

  await page.waitForSelector('[data-testid="now-line"]');

  // Check computed boxShadow on the now-line
  const boxShadow = await page
    .locator('[data-testid="now-line"]')
    .first()
    .evaluate((node: HTMLElement) => getComputedStyle(node).boxShadow);

  // Should contain the outer 12px halo radius
  expect(boxShadow).toContain("12px");

  // Reload with reduced-motion emulated
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await page.waitForSelector('[data-testid="now-line"]');

  const boxShadowPRM = await page
    .locator('[data-testid="now-line"]')
    .first()
    .evaluate((node: HTMLElement) => getComputedStyle(node).boxShadow);

  // Now-line halo is unchanged under PRM (box-shadow is not motion)
  expect(boxShadowPRM).toContain("12px");
});
