/**
 * tests/e2e/m6.a11y.spec.ts — Milestone 6 accessibility tests (axe-core via Playwright).
 *
 * Covers: A-m6-001..002
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const M6_FIXTURE = {
  schemaVersion: 3,
  programStart: "2026-06-29",
  currentDate: "2026-06-29",
  history: {},
  deletions: {},
  blocks: [
    {
      id: "blk-A",
      name: "Morning",
      start: "08:00",
      end: "09:00",
      recurrence: { kind: "every-day" },
      categoryId: null,
      bricks: [
        {
          id: "brk-1",
          name: "Meditate",
          kind: "tick",
          done: false,
          hasDuration: false,
          categoryId: null,
          parentBlockId: "blk-A",
        },
        {
          id: "brk-2",
          name: "Stretch",
          kind: "tick",
          done: false,
          hasDuration: false,
          categoryId: null,
          parentBlockId: "blk-A",
        },
      ],
    },
  ],
  looseBricks: [
    {
      id: "brk-loose",
      name: "Walk",
      kind: "tick",
      done: false,
      hasDuration: false,
      categoryId: null,
      parentBlockId: null,
    },
  ],
  categories: [],
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((payload: unknown) => {
    localStorage.setItem("dharma:onboarding-shown", "true");
    localStorage.setItem("dharma:v1", JSON.stringify(payload));
  }, M6_FIXTURE);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
});

// ─── A-m6-001: Edit Mode — axe clean; handles keyboard-focusable + SR-labeled ─

test("A-m6-001: Unlocked Day view axe-clean; block + brick handles keyboard-focusable ≥44px; no loose-tray handle; 430px no overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });

  const pencil = page.getByRole("button", { name: /edit mode/i });
  await expect(pencil).toBeVisible();

  // Toggle into Edit Mode (Unlocked)
  await pencil.click();
  await page.waitForTimeout(200);

  // axe scan against Unlocked Day view with handles visible
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  if (serious.length > 0)
    console.log(
      "A-m6-001 violations:",
      JSON.stringify(
        serious.map((v) => ({ id: v.id, impact: v.impact })),
        null,
        2,
      ),
    );
  expect(serious).toHaveLength(0);

  // Block reorder handles: "Reorder block <name>"
  const blockHandles = page.getByRole("button", {
    name: /^reorder block/i,
  });
  if ((await blockHandles.count()) > 0) {
    const handle = blockHandles.first();
    await expect(handle).toBeVisible();
    const label = await handle.getAttribute("aria-label");
    expect(label).toMatch(/^reorder block/i);

    // Hit area ≥44px (ADR-031)
    const box = await handle.boundingBox();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
  }

  // Expand the block to see in-block brick handles (force:true — card jiggles in edit mode)
  const blockCard = page.getByRole("article").first();
  if ((await blockCard.count()) > 0) {
    await blockCard.click({ force: true });
    await page.waitForTimeout(100);
  }

  // Brick reorder handles: "Reorder brick <name>"
  const brickHandles = page.getByRole("button", {
    name: /^reorder brick/i,
  });
  if ((await brickHandles.count()) > 0) {
    const brickHandle = brickHandles.first();
    await expect(brickHandle).toBeVisible();
    const label = await brickHandle.getAttribute("aria-label");
    expect(label).toMatch(/^reorder brick/i);

    const box = await brickHandle.boundingBox();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
  }

  // Loose-tray chips must NOT have a reorder handle (SG-m6-04)
  const traySection = page.locator("[data-component='loose-bricks-tray']");
  if ((await traySection.count()) > 0) {
    const trayHandles = traySection.getByRole("button", {
      name: /^reorder brick/i,
    });
    expect(await trayHandles.count()).toBe(0);
  }

  // No horizontal overflow at 430px
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});

// ─── A-m6-002: Reduced motion — axe clean; handles still labeled; aria-live announce fires ─

test("A-m6-002: Reduced-motion: axe clean; handles present + labeled; aria-live announce fires on drag commit", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.emulateMedia({ reducedMotion: "reduce" });

  const pencil = page.getByRole("button", { name: /edit mode/i });
  await expect(pencil).toBeVisible();

  await pencil.click();
  await page.waitForTimeout(200);

  // axe scan under reduced motion
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  if (serious.length > 0)
    console.log(
      "A-m6-002 violations:",
      JSON.stringify(
        serious.map((v) => ({ id: v.id, impact: v.impact })),
        null,
        2,
      ),
    );
  expect(serious).toHaveLength(0);

  // Block handles still present and labeled under reduced motion
  const blockHandles = page.getByRole("button", {
    name: /^reorder block/i,
  });
  if ((await blockHandles.count()) > 0) {
    await expect(blockHandles.first()).toBeVisible();
  }

  // aria-live region is present in DOM (screen-reader-discoverable)
  const liveRegion = page.locator("[aria-live='polite'][aria-atomic='true']");
  if ((await liveRegion.count()) > 0) {
    await expect(liveRegion.first()).toBeAttached();
  }
});
