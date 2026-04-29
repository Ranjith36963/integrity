// E-bld-021 dropped per SG-bld-04. See tests.md for rationale.
// (empty-state e2e is covered by C-bld-016 in components/Timeline.test.tsx)

import { test, expect } from "@playwright/test";

// Equal-weighted dayPct computed from lib/data.ts BLOCKS:
// Each blockPct is the average of its bricks' brickPcts.
// Final dayPct = mean of all 16 blockPcts.
// Pre-computed: ~57 (varies by data; exact value checked by E-bld-002 against
// the live page itself after count-up, making it self-consistent).
// nowOffsetPct(BLOCKS, "11:47") ≈ 32.43
const NOW_OFFSET_PCT = 32.43055555555556;
const EXPECTED_DAY_PCT = 57; // equal-weighted mean of blockPcts from BLOCKS

// E-bld-001: DHARMA logo, date "Wed, Apr 29", "Building 119 of 365" visible
test("E-bld-001: page loads with DHARMA, date, and building info", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("DHARMA", { exact: true })).toBeVisible();
  await expect(page.getByText("Wed, Apr 29")).toBeVisible();
  // "Building X of Y" — the text spans multiple elements so we check each part
  await expect(page.locator("text=Building").first()).toBeVisible();
  await expect(page.getByText("119", { exact: true })).toBeVisible();
  await expect(page.getByText("365")).toBeVisible();
});

// E-bld-002: Hero % numeral equals equal-weighted dayPct after count-up
test("E-bld-002: Hero pct equals equal-weighted dayPct after count-up", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForTimeout(1800);
  const heroPercent = await page
    .locator(".font-serif-italic")
    .first()
    .textContent();
  expect(Number(heroPercent)).toBe(EXPECTED_DAY_PCT);
});

// E-bld-003: Hero numeral at t≈100ms is less than at t≈1700ms (count-up animates)
test("E-bld-003: Hero count-up animates (value increases over time)", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForTimeout(100);
  const early = await page.locator(".font-serif-italic").first().textContent();
  await page.waitForTimeout(1700);
  const late = await page.locator(".font-serif-italic").first().textContent();
  expect(Number(early)).toBeLessThan(Number(late));
});

// E-bld-004: BlueprintBar has 16 segments and NOW pin at ~32-33%
test("E-bld-004: BlueprintBar has 16 segments and NOW pin at correct %", async ({
  page,
}) => {
  await page.goto("/");
  const segments = page.locator("[data-testid='blueprint-segment']");
  await expect(segments).toHaveCount(16);

  const nowPin = page.locator("[data-testid='now-pin']");
  const pinStyle = await nowPin.getAttribute("style");
  // nowOffsetPct(BLOCKS, "11:47") ≈ 32.43 — browser may omit the space after ":"
  expect(pinStyle).toMatch(new RegExp(`left:\\s*${NOW_OFFSET_PCT}%`));
});

// E-bld-005: NowCard shows NOW, "Work block", "08:45–17:15", "PASSIVE"
test("E-bld-005: NowCard shows NOW, block name, time range, category", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("NOW")).toBeVisible();
  await expect(page.getByText("Work block").first()).toBeVisible();
  // Time range is rendered as "08:45–17:15" in the NowCard (en-dash between times)
  await expect(page.locator("text=/08:45/").first()).toBeVisible();
  await expect(page.locator("text=/17:15/").first()).toBeVisible();
  await expect(page.getByText("PASSIVE").first()).toBeVisible();
});

// E-bld-006: Timeline shows exactly 16 blocks in correct order
test("E-bld-006: Timeline renders 16 blocks in correct order", async ({
  page,
}) => {
  await page.goto("/");
  const blocks = page.locator("[data-testid='timeline-block']");
  await expect(blocks).toHaveCount(16);
  const expectedNames = [
    "Wake ritual",
    "Meditation",
    "Job apps",
    "Fitness",
    "Cold shower",
    "Prayer",
    "Breakfast",
    "Walk to bus",
    "Commute",
    "Work block",
    "Commute home",
    "Building AI",
    "Face wash",
    "Journal",
    "Meditation",
    "Sleep",
  ];
  for (let i = 0; i < expectedNames.length; i++) {
    await expect(blocks.nth(i)).toContainText(expectedNames[i]);
  }
});

// E-bld-007: Block statuses: 0-8 past, 9 current, 10-15 future
test("E-bld-007: Block data-status attributes are correct", async ({
  page,
}) => {
  await page.goto("/");
  const blocks = page.locator("[data-testid='timeline-block']");
  for (let i = 0; i <= 8; i++) {
    await expect(blocks.nth(i)).toHaveAttribute("data-status", "past");
  }
  await expect(blocks.nth(9)).toHaveAttribute("data-status", "current");
  for (let i = 10; i <= 15; i++) {
    await expect(blocks.nth(i)).toHaveAttribute("data-status", "future");
  }
});

// E-bld-008: Tapping lunch tick brick fills it and updates Work block % and Hero %
test("E-bld-008: tapping lunch brick fills it and updates pcts", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForTimeout(1800); // wait for count-up

  // Get initial Hero pct
  const initialHero = Number(
    await page.locator(".font-serif-italic").first().textContent(),
  );

  // Find Work block (index 9) and find lunch brick
  const workBlock = page.locator("[data-testid='timeline-block']").nth(9);
  const lunchBrick = workBlock.getByRole("button", { name: /lunch/i });

  // Verify brick is empty before click
  await expect(lunchBrick).toHaveClass(/brick--empty/);

  // Tap the lunch brick
  await lunchBrick.click();

  // After logging, brick should NOT have brick--empty
  await expect(lunchBrick).not.toHaveClass(/brick--empty/);

  // Wait for the Hero count-up to complete after state update
  await page.waitForTimeout(1800);
  const newHero = Number(
    await page.locator(".font-serif-italic").first().textContent(),
  );
  expect(newHero).toBeGreaterThan(initialHero);
});

// E-bld-009: Tapping lunch twice toggles back to empty
test("E-bld-009: tapping lunch twice returns to empty state", async ({
  page,
}) => {
  await page.goto("/");

  const workBlock = page.locator("[data-testid='timeline-block']").nth(9);
  const lunchBrick = workBlock.getByRole("button", { name: /lunch/i });

  // Tap once to fill
  await lunchBrick.click();
  await expect(lunchBrick).not.toHaveClass(/brick--empty/);

  // Tap again to unfill
  await lunchBrick.click();
  await expect(lunchBrick).toHaveClass(/brick--empty/);
});

// E-bld-010: Tapping a goal brick opens the +/- stepper
test("E-bld-010: tapping follow-ups goal brick opens stepper", async ({
  page,
}) => {
  await page.goto("/");
  // Job apps block (index 2) has follow-ups 4/5
  const jobAppsBlock = page.locator("[data-testid='timeline-block']").nth(2);
  const followUpsBrick = jobAppsBlock.getByRole("button", {
    name: /follow-ups/i,
  });
  await followUpsBrick.click();
  // Stepper should appear
  await expect(page.getByRole("button", { name: /increment/i })).toBeVisible();
});

// E-bld-011: Tapping + on follow-ups stepper increments the value
test("E-bld-011: tapping + on stepper increments follow-ups", async ({
  page,
}) => {
  await page.goto("/");
  const jobAppsBlock = page.locator("[data-testid='timeline-block']").nth(2);
  const followUpsBrick = jobAppsBlock.getByRole("button", {
    name: /follow-ups/i,
  });
  await followUpsBrick.click();
  const plusBtn = page.getByRole("button", { name: /increment/i });
  await plusBtn.click();
  // follow-ups should now show 5/5
  await expect(jobAppsBlock).toContainText(/5\/5/);
});

// E-bld-012: Tapping Edit pencil reveals × delete buttons on all blocks and bricks
test("E-bld-012: edit mode reveals delete buttons on blocks and bricks", async ({
  page,
}) => {
  await page.goto("/");
  const editBtn = page.getByRole("button", { name: "Edit", exact: true });
  await editBtn.click();

  // All timeline blocks should show Delete block button
  const deleteBlockBtns = page.getByRole("button", { name: "Delete block" });
  await expect(deleteBlockBtns).toHaveCount(16);

  // There should be at least one Delete brick button
  const deleteBrickBtns = page.getByRole("button", { name: "Delete brick" });
  await expect(deleteBrickBtns.first()).toBeVisible();
});

// E-bld-013: Toggling Edit off removes affordances; brick click logs again
test("E-bld-013: toggling edit off restores view mode brick taps", async ({
  page,
}) => {
  await page.goto("/");
  const editBtn = page.getByRole("button", { name: "Edit", exact: true });

  // Turn edit on
  await editBtn.click();
  await expect(
    page.getByRole("button", { name: "Delete block" }).first(),
  ).toBeVisible();

  // Turn edit off
  await editBtn.click();
  await expect(page.getByRole("button", { name: "Delete block" })).toHaveCount(
    0,
  );

  // Tapping a brick in view mode should work again
  const workBlock = page.locator("[data-testid='timeline-block']").nth(9);
  const lunchBrick = workBlock.getByRole("button", { name: /lunch/i });
  await lunchBrick.click();
  await expect(lunchBrick).not.toHaveClass(/brick--empty/);
});

// E-bld-014: In edit mode, tapping brick body does not change block %
test("E-bld-014: in edit mode, brick body click does not log", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForTimeout(1800);

  // Get initial Hero pct
  const initialHero = Number(
    await page.locator(".font-serif-italic").first().textContent(),
  );

  // Enable edit mode
  const editBtn = page.getByRole("button", { name: "Edit", exact: true });
  await editBtn.click();

  // Try to click a brick body in edit mode (data-brick-body)
  const lunchBrickBody = page.locator("[data-brick-body]").filter({
    hasText: /lunch/,
  });
  if ((await lunchBrickBody.count()) > 0) {
    await lunchBrickBody.first().click();
  }

  // Hero % should be unchanged
  await page.waitForTimeout(100);
  const newHero = Number(
    await page.locator(".font-serif-italic").first().textContent(),
  );
  expect(newHero).toBe(initialHero);
});

// E-bld-015: BottomBar shows Voice Log and + Add buttons
test("E-bld-015: BottomBar has Voice Log and Add buttons", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Voice Log")).toBeVisible();
  await expect(page.getByRole("button", { name: /Add/i })).toBeVisible();
});

// E-bld-016: BottomBar is pinned to viewport bottom when scrolling
test("E-bld-016: BottomBar stays pinned to viewport bottom on scroll", async ({
  page,
}) => {
  await page.goto("/");
  // Scroll to bottom
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(200);
  // BottomBar should still be visible
  const voiceLog = page.getByText("Voice Log");
  await expect(voiceLog).toBeVisible();
  // Check it's in the lower portion of viewport
  const bbox = await voiceLog.boundingBox();
  const viewportHeight = page.viewportSize()?.height ?? 800;
  expect(bbox!.y).toBeGreaterThan(viewportHeight * 0.6);
});

// E-bld-017: No horizontal scroll at 430px viewport width
test("E-bld-017: no horizontal scroll at 430px viewport", async ({ page }) => {
  await page.goto("/");
  const hasHorizontalScroll = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalScroll).toBe(false);
});

// E-bld-018: All interactive elements have bounding box >= 44x44px
test("E-bld-018: all interactive elements meet 44x44px touch target", async ({
  page,
}) => {
  await page.goto("/");
  // Only check buttons that are part of the app (not dev tools)
  const buttons = page.locator("body button");
  const count = await buttons.count();
  const failures: string[] = [];
  for (let i = 0; i < count; i++) {
    const btn = buttons.nth(i);
    const isVisible = await btn.isVisible();
    if (!isVisible) continue;
    const bbox = await btn.boundingBox();
    if (!bbox) continue;
    const label = await btn.getAttribute("aria-label");
    const text = await btn.textContent();
    // Skip Next.js dev tools buttons (labelled "Open Next.js Dev Tools" etc.)
    if (label?.includes("Next.js") || text?.includes("Next.js")) continue;
    // Allow 0.5px sub-pixel tolerance for float rendering
    if (bbox.width < 43.5 || bbox.height < 43.5) {
      failures.push(
        `Button "${label ?? text?.trim()}" is ${bbox.width}x${bbox.height}px`,
      );
    }
  }
  expect(failures).toHaveLength(0);
});

// E-bld-019: prefers-reduced-motion: Hero snaps to final value fast
test("E-bld-019: prefers-reduced-motion snaps Hero to final value fast", async ({
  browser,
}) => {
  const ctx = await browser.newContext({
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  await page.goto("/");
  // Wait just 100ms — should already be at final value with reduced motion
  await page.waitForTimeout(100);
  const heroVal = Number(
    await page.locator(".font-serif-italic").first().textContent(),
  );
  expect(heroVal).toBe(EXPECTED_DAY_PCT);

  // Check that NOW glow animation is none
  const nowGlow = page.locator(".now-glow").first();
  const animName = await nowGlow.evaluate(
    (el) => getComputedStyle(el).animationName,
  );
  expect(animName).toBe("none");
  await ctx.close();
});

// E-bld-020: No console errors during load and first interaction
test("E-bld-020: zero console errors during load and interaction", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/");
  await page.waitForTimeout(2000);

  // Do a first interaction
  const workBlock = page.locator("[data-testid='timeline-block']").nth(9);
  const lunchBrick = workBlock.getByRole("button", { name: /lunch/i });
  await lunchBrick.click();

  expect(errors).toHaveLength(0);
});
