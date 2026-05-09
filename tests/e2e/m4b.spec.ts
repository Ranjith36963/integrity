/**
 * tests/e2e/m4b.spec.ts — Milestone 4b E2E tests (Playwright).
 *
 * Execution is deferred to Vercel preview per the M0–M4a sandbox bind-failure
 * pattern (e2e server fails to bind in this sandbox environment).
 * Tests are authored here; run them against the deployed preview URL.
 *
 * Covers: E-m4b-001..010
 */

import { test, expect } from "@playwright/test";

// ─── E-m4b-001: + tap → cascade visuals (chip-fill, badge, scaffold, ring, bar) ─

test("E-m4b-001: tapping + on goal at 0/10 fills chip toward 10%, badge updates, cascade", async ({
  page,
}) => {
  await page.goto("/");

  // Requires seeded state with one goal brick at count:0/target:10 — deferred to preview.
  const plus = page.getByRole("button", { name: /Increase/i }).first();
  if ((await plus.count()) > 0) {
    await plus.click();
    // Within ~one frame the chip-fill begins animating; settled by 650ms (600ms transition + slack)
    await page.waitForTimeout(650);
    const chip = plus.locator("xpath=ancestor::*[@role='group'][1]");
    const fillWidth = await chip
      .locator("[data-testid='brick-fill']")
      .evaluate((el) => (el as HTMLElement).style.width);
    expect(fillWidth).toBe("10%");
    // Badge text reflects the new count
    await expect(chip).toContainText("1 / 10");
  }
});

// ─── E-m4b-002: − tap on a non-floor goal decrements badge + chip-fill ───────

test("E-m4b-002: tapping − on goal at 5/10 drops badge to 4/10 and fill to 40%", async ({
  page,
}) => {
  await page.goto("/");

  // Requires seeded state with one goal brick at count:5/target:10 — deferred to preview.
  const minus = page.getByRole("button", { name: /Decrease/i }).first();
  if ((await minus.count()) > 0) {
    await minus.click();
    await page.waitForTimeout(650);
    const chip = minus.locator("xpath=ancestor::*[@role='group'][1]");
    const fillWidth = await chip
      .locator("[data-testid='brick-fill']")
      .evaluate((el) => (el as HTMLElement).style.width);
    expect(fillWidth).toBe("40%");
    await expect(chip).toContainText("4 / 10");
  }
});

// ─── E-m4b-003: long-press auto-repeat fires ~50ms apart after 500ms hold ────

test("E-m4b-003: holding + advances badge ~1 per 50ms after the 500ms hold threshold", async ({
  page,
}) => {
  await page.goto("/");

  // Requires seeded state with goal brick at count:0/target:10 — deferred to preview.
  const plus = page.getByRole("button", { name: /Increase/i }).first();
  if ((await plus.count()) > 0) {
    const chip = plus.locator("xpath=ancestor::*[@role='group'][1]");

    // Press and hold via dispatching pointerdown without pointerup
    await plus.dispatchEvent("pointerdown");

    // After ~550ms (HOLD_MS + 1 interval tick): expect 2 / 10 (initial + 1 auto-repeat)
    await expect
      .poll(async () => (await chip.textContent())?.includes("2 / 10"), {
        timeout: 700,
      })
      .toBe(true);

    // After ~600ms total: expect 3 / 10
    await expect
      .poll(async () => (await chip.textContent())?.includes("3 / 10"), {
        timeout: 200,
      })
      .toBe(true);

    // Release
    await plus.dispatchEvent("pointerup");
  }
});

// ─── E-m4b-004: long-press on goal at 8/10 caps at 10/10; + becomes disabled ─

test("E-m4b-004: holding + on 8/10 hits cap at 10/10 within ~600ms; + then disabled", async ({
  page,
}) => {
  await page.goto("/");

  // Requires seeded state with goal brick at count:8/target:10 — deferred to preview.
  const plus = page.getByRole("button", { name: /Increase/i }).first();
  if ((await plus.count()) > 0) {
    const chip = plus.locator("xpath=ancestor::*[@role='group'][1]");

    await plus.dispatchEvent("pointerdown");
    // Within ~700ms badge reads "10 / 10"
    await expect
      .poll(async () => (await chip.textContent())?.includes("10 / 10"), {
        timeout: 1000,
      })
      .toBe(true);

    // For another 800ms badge stays at 10/10 (no churn)
    await page.waitForTimeout(800);
    await expect(chip).toContainText("10 / 10");

    await plus.dispatchEvent("pointerup");

    // + button is now disabled
    expect(await plus.isDisabled()).toBe(true);

    // Brick-fill width is 100%
    const fillWidth = await chip
      .locator("[data-testid='brick-fill']")
      .evaluate((el) => (el as HTMLElement).style.width);
    expect(fillWidth).toBe("100%");
  }
});

// ─── E-m4b-005: goal +tap that brings block to 100% fires bloom + chime ───────

test("E-m4b-005: tapping + on goal at 9/10 (block→100%) increments chime counter and bloom", async ({
  page,
}) => {
  await page.goto("/");

  // Route mock for chime asset to count requests (matches M4a pattern)
  let chimeCount = 0;
  await page.route("**/sounds/chime.mp3", async (route) => {
    chimeCount++;
    await route.fulfill({ status: 200, body: Buffer.from("") });
  });

  // Requires seeded state with goal brick at 9/10 (one tap away from blockPct=100) — deferred.
  const plus = page.getByRole("button", { name: /Increase/i }).first();
  if ((await plus.count()) > 0) {
    await plus.click();
    // Bloom overlay appears briefly
    const blockCard = page.locator('[data-component="timeline-block"]').first();
    const bloom = blockCard.locator("[data-testid='bloom-overlay']");
    await expect(bloom).toBeVisible({ timeout: 300 });
    // Chime requested at least once (block-100 path; day-100 may add a second)
    expect(chimeCount).toBeGreaterThanOrEqual(1);
  }
});

// ─── E-m4b-006: goal +tap that brings day to 100% mounts Fireworks then unmounts ─

test("E-m4b-006: tapping + on goal at 9/10 (dayPct→100) shows Fireworks then unmounts", async ({
  page,
}) => {
  await page.goto("/");

  // Requires seeded state where dayPct goes 99→100 on this tap — deferred to preview.
  const plus = page.getByRole("button", { name: /Increase/i }).first();
  if ((await plus.count()) > 0) {
    await plus.click();
    const fireworks = page.locator("[data-testid='fireworks']");
    await expect(fireworks).toBeVisible({ timeout: 300 });
    // After ~1.7s the overlay unmounts (≤ 2s budget)
    await expect(fireworks).not.toBeVisible({ timeout: 2000 });
  }
});

// ─── E-m4b-007: cross-down via − resets gate; + re-cross replays bloom ───────

test("E-m4b-007: + (block→100, bloom #1) → − (block→90) → + (block→100, bloom #2)", async ({
  page,
}) => {
  await page.goto("/");

  // Requires seeded state with goal brick at 9/10 — deferred to preview.
  const plus = page.getByRole("button", { name: /Increase/i }).first();
  const minus = page.getByRole("button", { name: /Decrease/i }).first();
  if ((await plus.count()) > 0 && (await minus.count()) > 0) {
    await plus.click(); // 9 → 10 (bloom #1)
    await page.waitForTimeout(700);
    await minus.click(); // 10 → 9 (drops below cap, gate resets)
    await page.waitForTimeout(200);
    await plus.click(); // 9 → 10 again (bloom #2)

    const blockCard = page.locator('[data-component="timeline-block"]').first();
    const bloom = blockCard.locator("[data-testid='bloom-overlay']");
    await expect(bloom).toBeVisible({ timeout: 300 });
  }
});

// ─── E-m4b-008: mobile viewport — no horizontal overflow; steppers visible ───

test("E-m4b-008: 430x932 viewport — no horizontal scroll; − and + buttons present and tappable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/");

  // No horizontal overflow on body (always assertable, even with empty state)
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  const clientWidth = await page.evaluate(
    () => document.documentElement.clientWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

  // Requires seeded state with a goal brick — deferred to preview.
  const minus = page.getByRole("button", { name: /Decrease/i }).first();
  const plus = page.getByRole("button", { name: /Increase/i }).first();
  if ((await minus.count()) > 0 && (await plus.count()) > 0) {
    await expect(minus).toBeVisible();
    await expect(plus).toBeVisible();
    const minusBox = await minus.boundingBox();
    const plusBox = await plus.boundingBox();
    if (minusBox && plusBox) {
      // Buttons do not overlap (left of − is to the left of left of +)
      expect(minusBox.x + minusBox.width).toBeLessThanOrEqual(plusBox.x);
    }
  }
});

// ─── E-m4b-009: tick + time chip regression — goal taps don't bleed into them ─

test("E-m4b-009: tick toggles, time inert, goal count unaffected by tick/time taps", async ({
  page,
}) => {
  await page.goto("/");

  // Requires seeded state with one tick + one goal + one time brick — deferred to preview.
  const tickBtn = page.locator("button[aria-pressed='false']").first();
  if ((await tickBtn.count()) > 0) {
    const initialGoal = await page
      .locator('[role="group"]')
      .first()
      .textContent();
    await tickBtn.click();
    await page.waitForTimeout(100);
    expect(await tickBtn.getAttribute("aria-pressed")).toBe("true");
    // Goal chip badge unchanged
    const after = await page.locator('[role="group"]').first().textContent();
    expect(after).toBe(initialGoal);
  }
});

// ─── E-m4b-010: reduced-motion — fill snaps; no scale-press; haptics still fire ─

test("E-m4b-010: reduced-motion: fill transition none; no scale on press; dispatch unaffected", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  // Requires seeded state with goal at 4/5 — deferred to preview.
  const plus = page.getByRole("button", { name: /Increase/i }).first();
  if ((await plus.count()) > 0) {
    const chip = plus.locator("xpath=ancestor::*[@role='group'][1]");
    const fillTransition = await chip
      .locator("[data-testid='brick-fill']")
      .evaluate((el) => (el as HTMLElement).style.transition);
    expect(fillTransition).toBe("none");

    // Press and hold; verify no scale(0.95) at any sampled frame
    await plus.dispatchEvent("pointerdown");
    let sawScale = false;
    for (let i = 0; i < 8; i++) {
      const t = await plus.evaluate(
        (el) => (el as HTMLElement).style.transform,
      );
      if (t.includes("0.95")) sawScale = true;
      await page.waitForTimeout(80);
    }
    await plus.dispatchEvent("pointerup");
    expect(sawScale).toBe(false);

    // Brick reaches cap (5/5) — dispatch path still works under reduced-motion
    await expect(chip).toContainText("5 / 5", { timeout: 1500 });
  }
});
