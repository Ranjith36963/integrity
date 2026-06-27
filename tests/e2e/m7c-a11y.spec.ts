/**
 * tests/e2e/m7c-a11y.spec.ts — A-m7c-001, A-m7c-002, A-m7c-003
 *
 * Hero % count-up on first load — Accessibility E2E tests.
 *
 * Execution is DEFERRED TO VERCEL PREVIEW. axe-core runs more reliably against
 * the production-build output served by Vercel (consistent with M5b/M7a/M7b precedent).
 * The sandbox lacks the throttled preview-axe harness; the production-build axe scan
 * is more reliable than the dev-server scan per ADR-029.
 *
 * Covers: A-m7c-001, A-m7c-002, A-m7c-003
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Fixture factories — use today's date so rollover is a no-op.
function makeState50() {
  const today = new Date().toISOString().split("T")[0];
  return JSON.stringify({
    schemaVersion: 3,
    programStart: "2026-05-01",
    currentDate: today,
    blocks: [
      {
        id: "blk-a11y-50",
        name: "Morning",
        start: "09:00",
        recurrence: { kind: "just-today", date: today },
        categoryId: null,
        bricks: [
          {
            id: "brk-done-a11y",
            name: "Coffee",
            categoryId: null,
            parentBlockId: "blk-a11y-50",
            hasDuration: false,
            kind: "tick",
            done: true,
          },
          {
            id: "brk-undone-a11y",
            name: "Exercise",
            categoryId: null,
            parentBlockId: "blk-a11y-50",
            hasDuration: false,
            kind: "tick",
            done: false,
          },
        ],
      },
    ],
    categories: [],
    looseBricks: [],
    history: {},
    deletions: {},
  });
}

function makeState73() {
  const today = new Date().toISOString().split("T")[0];
  return JSON.stringify({
    schemaVersion: 3,
    programStart: "2026-05-01",
    currentDate: today,
    blocks: [
      {
        id: "blk-a11y-73",
        name: "Morning",
        start: "09:00",
        recurrence: { kind: "just-today", date: today },
        categoryId: null,
        bricks: [
          {
            id: "brk-done-a11y-1",
            name: "Coffee",
            categoryId: null,
            parentBlockId: "blk-a11y-73",
            hasDuration: false,
            kind: "tick",
            done: true,
          },
          {
            id: "brk-done-a11y-2",
            name: "Review",
            categoryId: null,
            parentBlockId: "blk-a11y-73",
            hasDuration: false,
            kind: "tick",
            done: true,
          },
          {
            id: "brk-undone-a11y",
            name: "Exercise",
            categoryId: null,
            parentBlockId: "blk-a11y-73",
            hasDuration: false,
            kind: "tick",
            done: false,
          },
        ],
      },
    ],
    categories: [],
    looseBricks: [],
    history: {},
    deletions: {},
  });
}

// ─── A-m7c-001: axe-clean DURING and AFTER the count-up tween ────────────────

test("A-m7c-001: Day view is axe-clean DURING (t=200ms) and AFTER (t=1700ms) the count-up tween", async ({
  page,
}) => {
  await page.addInitScript((stateStr) => {
    localStorage.setItem("dharma:v1", stateStr);
  }, makeState50());

  await page.goto("/");
  await page.waitForSelector("[data-testid='hero-ring']", { timeout: 10000 });

  // axe scan at t=200ms (mid-tween)
  await page.waitForTimeout(200);
  const resultsMidTween = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const seriousMid = resultsMidTween.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  if (seriousMid.length > 0)
    console.log(
      "A-m7c-001 (mid) violations:",
      JSON.stringify(
        seriousMid.map((v) => ({ id: v.id, impact: v.impact })),
        null,
        2,
      ),
    );
  expect(seriousMid).toHaveLength(0);

  // aria-label is on the svg[role=img] inside hero-ring, not on the outer div
  const midTweenLabel = await page
    .locator("[data-testid='hero-ring'] svg[role='img']")
    .getAttribute("aria-label");
  expect(midTweenLabel).toMatch(/^Day score: \d+%$/);

  // axe scan at t=1700ms (post-tween)
  await page.waitForTimeout(1500); // 200 + 1500 = 1700ms total
  const resultsPostTween = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const seriousPost = resultsPostTween.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  if (seriousPost.length > 0)
    console.log(
      "A-m7c-001 (post) violations:",
      JSON.stringify(
        seriousPost.map((v) => ({ id: v.id, impact: v.impact })),
        null,
        2,
      ),
    );
  expect(seriousPost).toHaveLength(0);

  // Verify aria-label at post-tween
  const postTweenLabel = await page
    .locator("[data-testid='hero-ring'] svg[role='img']")
    .getAttribute("aria-label");
  expect(postTweenLabel).toMatch(/^Day score: \d+%$/);
});

// ─── A-m7c-002: aria-label progresses with the tween ─────────────────────────

test("A-m7c-002: aria-label='Day score: N%' progresses monotonically with the tween", async ({
  page,
}) => {
  await page.addInitScript((stateStr) => {
    localStorage.setItem("dharma:v1", stateStr);
  }, makeState73());

  await page.goto("/");
  await page.waitForSelector("[data-testid='hero-ring']", { timeout: 10000 });

  // Sample aria-label at five intermediate timepoints
  const samplePoints = [200, 500, 800, 1100, 1700];
  const labels: { t: number; label: string; val: number }[] = [];
  let prevT = 0;

  for (const t of samplePoints) {
    await page.waitForTimeout(t - prevT);
    prevT = t;
    const label = await page
      .locator("[data-testid='hero-ring'] svg[role='img']")
      .getAttribute("aria-label");
    const val = label
      ? parseInt((label.match(/(\d+)%/) ?? [])[1] ?? "0", 10)
      : 0;
    labels.push({ t, label: label ?? "", val });
    // Each label must match the pattern
    expect(label).toMatch(/^Day score: \d+%$/);
  }

  // At t=1700ms (post-tween), the aria-label should read the final value
  const finalLabel = labels[labels.length - 1];
  const finalVal = finalLabel.val;
  expect(finalVal).toBeGreaterThan(0);

  // The live region inside hero-ring has aria-live="polite" (on span[role=status], not svg)
  const liveRegion = await page
    .locator("[data-testid='hero-ring'] [role='status']")
    .getAttribute("aria-live");
  expect(liveRegion).toBe("polite");

  // Values should be monotonically non-decreasing
  for (let i = 1; i < labels.length; i++) {
    expect(labels[i].val).toBeGreaterThanOrEqual(labels[i - 1].val);
  }
});

// ─── A-m7c-003: PRM path — no tween, final value immediately; axe-clean ──────

test("A-m7c-003: PRM active → final value painted immediately on mount; axe-clean", async ({
  page,
}) => {
  // Force reduced motion
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.addInitScript((stateStr) => {
    localStorage.setItem("dharma:v1", stateStr);
  }, makeState50());

  await page.goto("/");
  await page.waitForSelector("[data-testid='hero-ring']", { timeout: 10000 });

  // At t=200ms — axe scan
  await page.waitForTimeout(200);
  const axeResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = axeResults.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  if (serious.length > 0)
    console.log(
      "A-m7c-003 violations:",
      JSON.stringify(
        serious.map((v) => ({ id: v.id, impact: v.impact })),
        null,
        2,
      ),
    );
  expect(serious).toHaveLength(0);

  // Numeral reads final value (not 0% — PRM bypass snaps to pct)
  const numeral = await page
    .locator("[data-testid='hero-numeral']")
    .textContent();
  const val200 = parseInt((numeral ?? "0").replace(/%$/, ""), 10);
  expect(val200).toBeGreaterThan(0); // final value, not 0%

  // aria-label reads final value
  const label = await page
    .locator("[data-testid='hero-ring'] svg")
    .getAttribute("aria-label");
  expect(label).toBe(`Day score: ${val200}%`);

  // At t=1700ms (well past tween window) — value still stable
  await page.waitForTimeout(1500);
  const numeralLate = await page
    .locator("[data-testid='hero-numeral']")
    .textContent();
  const valLate = parseInt((numeralLate ?? "0").replace(/%$/, ""), 10);
  expect(valLate).toBe(val200); // No animation occurred

  // PRM media query is active
  const prmActive = await page.evaluate(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  expect(prmActive).toBe(true);
});
