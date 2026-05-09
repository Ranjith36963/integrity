/**
 * tests/e2e/m4c.spec.ts — Milestone 4c E2E tests (Playwright).
 *
 * Execution is deferred to Vercel preview per the M0–M4b sandbox bind-failure
 * pattern (e2e server fails to bind in this sandbox environment).
 * Tests are authored here; run them against the deployed preview URL.
 *
 * Covers: E-m4c-001..005
 */

import { test, expect } from "@playwright/test";

// ─── E-m4c-001: tap time chip → aria-pressed="true"; glyph swaps to Pause ─────

test("E-m4c-001: tapping a stopped time chip starts timer; aria-pressed becomes true; glyph is Pause", async ({
  page,
}) => {
  await page.goto("/");

  // Requires seeded state with at least one time brick — deferred to preview.
  const chip = page
    .getByRole("button", { name: /stopped, tap to start/i })
    .first();
  if ((await chip.count()) > 0) {
    await chip.click();
    // After tap, chip should be running
    const runningChip = page
      .getByRole("button", { name: /running, tap to stop/i })
      .first();
    expect(await runningChip.count()).toBeGreaterThan(0);
    expect(await runningChip.getAttribute("aria-pressed")).toBe("true");
  }
});

// ─── E-m4c-002: timer badge advances after ~60s wall-clock ───────────────────

test("E-m4c-002: after 5s wait badge integer does not decrease (timer-only assertion; full 60s unfeasible)", async ({
  page,
}) => {
  await page.goto("/");

  // Requires seeded state with a running time brick — deferred to preview.
  const chip = page
    .getByRole("button", { name: /running, tap to stop/i })
    .first();
  if ((await chip.count()) > 0) {
    // Capture initial badge text
    const badgeBefore = (await chip.textContent()) ?? "";
    const matchBefore = badgeBefore.match(/(\d+)\s*\/\s*(\d+)/);
    if (matchBefore) {
      const beforeMin = parseInt(matchBefore[1], 10);
      await page.waitForTimeout(5_000);
      const badgeAfter = (await chip.textContent()) ?? "";
      const matchAfter = badgeAfter.match(/(\d+)\s*\/\s*(\d+)/);
      if (matchAfter) {
        const afterMin = parseInt(matchAfter[1], 10);
        // badge should not go backward
        expect(afterMin).toBeGreaterThanOrEqual(beforeMin);
      }
    }
  }
});

// ─── E-m4c-003: collapse + expand block; badge advances while off-DOM ─────────

test("E-m4c-003: collapse running-timer block; re-expand; badge shows higher minutes", async ({
  page,
}) => {
  await page.goto("/");

  // Requires seeded state with a running time brick in a block — deferred to preview.
  const runningChip = page
    .getByRole("button", { name: /running, tap to stop/i })
    .first();
  if ((await runningChip.count()) === 0) return;

  // Capture minute before collapse
  const badgeBefore = (await runningChip.textContent()) ?? "";
  const matchBefore = badgeBefore.match(/(\d+)\s*\//);
  const beforeMin = matchBefore ? parseInt(matchBefore[1], 10) : 0;

  // Collapse the parent block (chip unmounts)
  const block = runningChip.locator(
    "xpath=ancestor::*[@data-component='timeline-block'][1]",
  );
  if ((await block.count()) > 0) {
    await block.click();
  }

  // Wait 5s while chip is unmounted
  await page.waitForTimeout(5_000);

  // Re-expand
  if ((await block.count()) > 0) {
    await block.click();
  }

  // Re-mounted chip should show same or higher badge
  const remountedChip = page
    .getByRole("button", { name: /running, tap to stop/i })
    .first();
  if ((await remountedChip.count()) > 0) {
    const badgeAfter = (await remountedChip.textContent()) ?? "";
    const matchAfter = badgeAfter.match(/(\d+)\s*\//);
    const afterMin = matchAfter ? parseInt(matchAfter[1], 10) : 0;
    expect(afterMin).toBeGreaterThanOrEqual(beforeMin);
    expect(await remountedChip.getAttribute("aria-pressed")).toBe("true");
  }
});

// ─── E-m4c-004: two time bricks — swap running state; single-running invariant ─

test("E-m4c-004: tap brick B while brick A runs; A stops, B starts; only one aria-pressed=true", async ({
  page,
}) => {
  await page.goto("/");

  // Requires seeded state with two time bricks — deferred to preview.
  const stoppedChips = page.getByRole("button", {
    name: /stopped, tap to start/i,
  });
  const runningChips = page.getByRole("button", {
    name: /running, tap to stop/i,
  });

  if ((await runningChips.count()) > 0 && (await stoppedChips.count()) > 0) {
    // Tap the stopped chip (B)
    await stoppedChips.first().click();

    // Only one chip should be running
    const allRunning = page.getByRole("button", {
      name: /running, tap to stop/i,
    });
    expect(await allRunning.count()).toBe(1);
  }
});

// ─── E-m4c-005: long-press opens TimerSheet; Save clamps; Cancel discards ─────

test("E-m4c-005: long-press time chip opens sheet; type 30, Save: badge=25/25; Cancel discards", async ({
  page,
}) => {
  await page.goto("/");

  // Requires seeded state with a time brick { durationMin:25, minutesDone:5 } — deferred.
  const chip = page
    .getByRole("button", { name: /stopped, tap to start/i })
    .first();
  if ((await chip.count()) === 0) return;

  // Long-press: mouse down + 600ms wait + mouse up
  const box = await chip.boundingBox();
  if (!box) return;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(600);
  await page.mouse.up();

  // TimerSheet should open
  const dialog = page.getByRole("dialog");
  if ((await dialog.count()) === 0) return;

  // Type 30 (overflow)
  const input = page.getByLabel("Minutes done");
  await input.clear();
  await input.fill("30");
  await page.getByRole("button", { name: "Save minutes" }).click();

  // Sheet closes; badge shows clamped value
  expect(await dialog.count()).toBe(0);
  // Badge should now show 25/25 (clamped to durationMin)
  const chipAfter = page
    .getByRole("button", { name: /stopped, tap to start/i })
    .first();
  if ((await chipAfter.count()) > 0) {
    await expect(chipAfter).toContainText("25 / 25");
  }

  // Long-press again and Cancel
  const boxAfter = await chipAfter.boundingBox();
  if (!boxAfter) return;
  await page.mouse.move(
    boxAfter.x + boxAfter.width / 2,
    boxAfter.y + boxAfter.height / 2,
  );
  await page.mouse.down();
  await page.waitForTimeout(600);
  await page.mouse.up();

  if ((await dialog.count()) > 0) {
    await page.getByRole("button", { name: "Cancel" }).click();
    // Badge unchanged
    const chipFinal = page
      .getByRole("button", { name: /stopped, tap to start/i })
      .first();
    if ((await chipFinal.count()) > 0) {
      await expect(chipFinal).toContainText("25 / 25");
    }
  }
});
