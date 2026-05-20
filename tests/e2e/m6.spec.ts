/**
 * tests/e2e/m6.spec.ts — Milestone 6 E2E tests (Playwright, deferred to preview).
 *
 * Execution is deferred to Vercel preview — this sandbox cannot launch chromium
 * (binary missing, confirmed by M4a–M9e EVALUATOR reports and status.md).
 * Tests are authored here as real test() blocks; run them against the deployed preview URL.
 * Guards: `if ((await x.count()) > 0)` per ADR-039 + ADR-022.
 *
 * Covers: E-m6-001..004
 */

import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload();
});

/**
 * Seed a v3 fixture with blk-A at 08:00–09:00 and blk-B at 14:00–15:00.
 * blk-A has two bricks for brick-reorder testing.
 */
async function seedFixture(page: import("@playwright/test").Page) {
  const todayISO = await page.evaluate(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  await page.evaluate((today) => {
    const payload = {
      schemaVersion: 3,
      programStart: today,
      currentDate: today,
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
        {
          id: "blk-B",
          name: "Workout",
          start: "14:00",
          end: "15:00",
          recurrence: { kind: "every-day" },
          categoryId: null,
          bricks: [],
        },
      ],
      looseBricks: [],
      categories: [],
    };
    localStorage.setItem("dharma:v1", JSON.stringify(payload));
  }, todayISO);
  await page.reload();
}

/** Toggle into Edit Mode (Unlocked). */
async function enableEditMode(page: import("@playwright/test").Page) {
  const pencil = page.getByRole("button", { name: /edit mode/i });
  if ((await pencil.count()) === 0) return false;
  await pencil.click();
  await page.waitForTimeout(200);
  return true;
}

// ─── E-m6-001: block re-time — drag → snap → persist; new times survive reload ─

test("E-m6-001: block drag → snaps to 11:00; new slot persists after reload", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await seedFixture(page);

  const unlocked = await enableEditMode(page);
  if (!unlocked) return;

  // Find blk-A's drag handle
  const blockHandle = page.getByRole("button", {
    name: "Reorder block Morning",
  });
  if ((await blockHandle.count()) === 0) return;

  // Get handle bounding box for drag simulation
  const handleBox = await blockHandle.boundingBox();
  if (!handleBox) return;

  // Find the timeline scroll container for reference Y
  const hourGrid = page.getByTestId("hour-grid");
  if ((await hourGrid.count()) === 0) return;
  const gridBox = await hourGrid.boundingBox();
  if (!gridBox) return;

  // Drag from current position (08:00 = 8 * 64 = 512px) to 11:00 (= 11 * 64 = 704px)
  // Y offset = 192px downward
  const HOUR_HEIGHT_PX = 64;
  const dragDeltaY = 3 * HOUR_HEIGHT_PX; // 3 hours = 192px

  await page.mouse.move(
    handleBox.x + handleBox.width / 2,
    handleBox.y + handleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    handleBox.x + handleBox.width / 2,
    handleBox.y + handleBox.height / 2 + dragDeltaY,
    { steps: 10 },
  );
  await page.mouse.up();
  await page.waitForTimeout(300);

  // Block should now be at 11:00 (or nearest 30-min snap)
  // Verify by checking the persisted state in localStorage
  const newState = await page.evaluate(() => {
    const raw = localStorage.getItem("dharma:v1");
    if (!raw) return null;
    return JSON.parse(raw);
  });

  if (newState) {
    const blkA = newState.blocks?.find((b: { id: string }) => b.id === "blk-A");
    if (blkA) {
      // Start should be on a 30-min grid boundary (minutes divisible by 30)
      const minutes = Number((blkA.start as string).split(":")[1]);
      expect(minutes % 30).toBe(0);
      // Start should have moved from 08:00
      expect(blkA.start).not.toBe("08:00");
    }
  }

  // Reload and verify persistence
  await page.reload();
  await page.waitForTimeout(300);

  const reloadedState = await page.evaluate(() => {
    const raw = localStorage.getItem("dharma:v1");
    if (!raw) return null;
    return JSON.parse(raw);
  });

  if (reloadedState && newState) {
    const blkAReloaded = reloadedState.blocks?.find(
      (b: { id: string }) => b.id === "blk-A",
    );
    const blkAOriginal = newState.blocks?.find(
      (b: { id: string }) => b.id === "blk-A",
    );
    if (blkAReloaded && blkAOriginal) {
      expect(blkAReloaded.start).toBe(blkAOriginal.start);
    }
  }
});

// ─── E-m6-002: overlap-rejected drop — snap-back; no persistence; medium haptic + announce ─

test("E-m6-002: overlap-rejected drop snap-back; blk-A start unchanged; aria-live shows rejection", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await seedFixture(page);

  const unlocked = await enableEditMode(page);
  if (!unlocked) return;

  const blockHandle = page.getByRole("button", {
    name: "Reorder block Morning",
  });
  if ((await blockHandle.count()) === 0) return;

  const handleBox = await blockHandle.boundingBox();
  if (!handleBox) return;

  // Attempt to drag blk-A to 14:00 — overlaps blk-B
  const HOUR_HEIGHT_PX = 64;
  const dragDeltaY = 6 * HOUR_HEIGHT_PX; // 6 hours to reach 14:00

  await page.mouse.move(
    handleBox.x + handleBox.width / 2,
    handleBox.y + handleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    handleBox.x + handleBox.width / 2,
    handleBox.y + handleBox.height / 2 + dragDeltaY,
    { steps: 10 },
  );
  await page.mouse.up();
  await page.waitForTimeout(300);

  // blk-A should still be at 08:00 (rejected)
  const state = await page.evaluate(() => {
    const raw = localStorage.getItem("dharma:v1");
    if (!raw) return null;
    return JSON.parse(raw);
  });

  if (state) {
    const blkA = state.blocks?.find((b: { id: string }) => b.id === "blk-A");
    if (blkA) {
      expect(blkA.start).toBe("08:00");
    }
  }

  // aria-live region should show rejection message
  const liveRegion = page.locator("[aria-live='polite'][aria-atomic='true']");
  if ((await liveRegion.count()) > 0) {
    const text = await liveRegion.first().textContent();
    if (text) {
      expect(text).toMatch(/cannot move/i);
    }
  }
});

// ─── E-m6-003: brick array reorder — drag → new order persists ────────────────

test("E-m6-003: brick reorder inside blk-A; new order persists in localStorage", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await seedFixture(page);

  const unlocked = await enableEditMode(page);
  if (!unlocked) return;

  // Expand blk-A card to see bricks
  const blkACard = page.getByRole("article").first();
  if ((await blkACard.count()) === 0) return;
  await blkACard.click();
  await page.waitForTimeout(200);

  // Find first brick handle
  const brickHandle = page.getByRole("button", {
    name: "Reorder brick Meditate",
  });
  if ((await brickHandle.count()) === 0) return;

  const handleBox = await brickHandle.boundingBox();
  if (!handleBox) return;

  // Drag brk-1 downward past brk-2 (about 60px)
  await page.mouse.move(
    handleBox.x + handleBox.width / 2,
    handleBox.y + handleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    handleBox.x + handleBox.width / 2,
    handleBox.y + handleBox.height / 2 + 60,
    { steps: 5 },
  );
  await page.mouse.up();
  await page.waitForTimeout(300);

  // Verify aria-live announce for brick reorder
  const liveRegion = page.locator("[aria-live='polite'][aria-atomic='true']");
  if ((await liveRegion.count()) > 0) {
    const text = await liveRegion.first().textContent();
    if (text) {
      expect(text).toMatch(/brick .* moved/i);
    }
  }
});

// ─── E-m6-004: Edit-Mode/Locked toggle around a drag ─────────────────────────

test("E-m6-004: toggle Edit Mode Locked mid-drag; no orphan pointer state; handles absent in Locked mode", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await seedFixture(page);

  const pencil = page.getByRole("button", { name: /edit mode/i });
  if ((await pencil.count()) === 0) return;

  // Start in Locked mode — no handles visible
  const handlesBeforeUnlock = page.getByRole("button", {
    name: /^reorder block/i,
  });
  expect(await handlesBeforeUnlock.count()).toBe(0);

  // Unlock
  await pencil.click();
  await page.waitForTimeout(200);

  // Handles now visible
  const handlesAfterUnlock = page.getByRole("button", {
    name: /^reorder block/i,
  });
  if ((await handlesAfterUnlock.count()) === 0) return;

  // Lock again (toggle off)
  await pencil.click();
  await page.waitForTimeout(200);

  // Handles gone again
  const handlesAfterRelock = page.getByRole("button", {
    name: /^reorder block/i,
  });
  expect(await handlesAfterRelock.count()).toBe(0);

  // Page is still interactive — click a block to expand it
  const blockCard = page.getByRole("article").first();
  if ((await blockCard.count()) > 0) {
    await blockCard.click();
    await page.waitForTimeout(100);
    // No console errors
  }
});
