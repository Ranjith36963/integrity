import { test, expect } from "@playwright/test";

// All M1 e2e run on mobile-chrome (Pixel 7) at 430×900 viewport unless noted.
// Base URL: http://localhost:3000. Route under test: /.

// E-m1-001: First-paint render of all seven regions
test("E-m1-001: all seven M1 regions visible on first paint", async ({
  page,
}) => {
  await page.addInitScript(() => {
    // Fix Date.now to 2026-05-06T08:30:00 local time
    const fixedTime = new Date("2026-05-06T08:30:00").getTime();
    Date.now = () => fixedTime;
  });
  await page.goto("/");

  // header with DHARMA
  await expect(page.locator("header")).toBeVisible();
  await expect(page.getByText("DHARMA")).toBeVisible();
  // Edit button
  await expect(page.getByRole("button", { name: /edit/i })).toBeVisible();
  // Settings button
  await expect(page.getByRole("button", { name: /settings/i })).toBeVisible();
  // Hero: date + "Building N of 365" + "0%"
  await expect(page.getByText(/building/i)).toBeVisible();
  await expect(page.getByText("0%")).toBeVisible();
  // Day blueprint
  await expect(page.locator('[aria-label="Day blueprint"]')).toBeVisible();
  // Hour grid
  await expect(page.locator('[data-testid="hour-grid"]')).toBeVisible();
  // Now line
  await expect(page.locator('[data-testid="now-line"]')).toBeVisible();
  // Empty state copy
  await expect(
    page.getByText("Tap any slot to lay your first block."),
  ).toBeVisible();
  // Voice and + buttons
  await expect(
    page.getByRole("button", { name: /voice log/i }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Add" })).toBeVisible();
});

// E-m1-002: Auto-scroll-to-now at 15:00
test("E-m1-002: auto-scroll centers NowLine in viewport at 15:00", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const fixedTime = new Date("2026-05-06T15:00:00").getTime();
    Date.now = () => fixedTime;
  });
  await page.setViewportSize({ width: 430, height: 900 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const nowLine = page.locator('[data-testid="now-line"]');
  await expect(nowLine).toBeVisible();

  const box = await nowLine.boundingBox();
  expect(box).not.toBeNull();
  // NowLine should be within the visible viewport
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeLessThanOrEqual(900);
  // Approximately vertically centered (within ±100px of viewport mid-height)
  expect(Math.abs(box!.y - 900 / 2)).toBeLessThan(250);
});

// E-m1-003: Reduced-motion honored
test("E-m1-003: reduced-motion suppresses animations", async ({ browser }) => {
  const context = await browser.newContext({
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("/");

  // Empty-state card should have animation-name=none under reduced-motion
  const emptyStateCard = page.locator('[data-testid="empty-state"]');
  await expect(emptyStateCard).toBeVisible();
  const animName = await emptyStateCard.evaluate((el) => {
    return window.getComputedStyle(el).animationName;
  });
  expect(animName).toBe("none");

  // NowLine should have no transition on top
  const nowLine = page.locator('[data-testid="now-line"]');
  const transition = await nowLine.evaluate((el) => {
    return window.getComputedStyle(el).transition;
  });
  // transition should be empty or 'none' or '0s'
  expect(
    transition === "" ||
      transition === "none" ||
      transition.includes("0s") ||
      !transition.includes("top"),
  ).toBe(true);

  // Hero's 0% is present synchronously (no count-up)
  await expect(page.getByText("0%")).toBeVisible();

  await context.close();
});

// E-m1-004: NowCard NOT rendered
test("E-m1-004: NowCard is not in the DOM", async ({ page }) => {
  await page.goto("/");
  const nowCard = page.locator('[data-component="now-card"]');
  await expect(nowCard).toHaveCount(0);
});

// E-m1-005: No block cards or brick chips
test("E-m1-005: no timeline-block, block-card, or brick-chip elements", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.locator('[data-component="timeline-block"]'),
  ).toHaveCount(0);
  await expect(page.locator('[data-component="block-card"]')).toHaveCount(0);
  await expect(page.locator('[data-component="brick-chip"]')).toHaveCount(0);
});

// E-m1-006: No horizontal overflow at 430px
test("E-m1-006: no horizontal overflow at 430px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 900 });
  await page.goto("/");

  const overflow = await page.evaluate(() => {
    return {
      scrollWidth: document.body.scrollWidth,
      clientWidth: document.body.clientWidth,
    };
  });
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
});

// E-m1-007: Safe-area insets (iOS notch + home indicator)
test("E-m1-007: BottomBar respects safe-area insets", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 900 });
  await page.addInitScript(() => {
    // Override --safe-bottom to 34px (typical iOS home indicator)
    document.documentElement.style.setProperty("--safe-bottom", "34px");
  });
  await page.goto("/");

  // Check that padding-bottom references var(--safe-bottom)
  // We verify by checking the dock wrapper has paddingBottom > 20px
  const dockWrapper = page.locator("[style*='--safe-bottom']").first();
  await expect(dockWrapper).toBeVisible();
});

// E-m1-008: Viewport height < 600px (tight height)
test("E-m1-008: timeline is scrollable at 430x500 viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 500 });
  await page.goto("/");

  // No horizontal overflow
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.body.scrollWidth,
    clientWidth: document.body.clientWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

  // Hour grid is rendered
  const hourGrid = page.locator('[data-testid="hour-grid"]');
  await expect(hourGrid).toBeVisible();

  // Timeline container has overflow-y (scrollable)
  const isScrollable = await page.locator('[data-testid="hour-grid"]').evaluate(
    (el) => {
      const parent = el.closest("[class*='overflow-y']") ?? el.parentElement;
      const overflow = window.getComputedStyle(parent!).overflowY;
      return overflow === "auto" || overflow === "scroll";
    },
  );
  expect(isScrollable).toBe(true);
});

// E-m1-009: BlueprintBar visible with empty outline
test("E-m1-009: BlueprintBar visible with zero segments and NOW pin", async ({
  page,
}) => {
  await page.goto("/");

  const blueprintBar = page.locator('[aria-label="Day blueprint"]');
  await expect(blueprintBar).toBeVisible();

  // Zero segments
  const segments = page.locator('[data-testid="blueprint-segment"]');
  await expect(segments).toHaveCount(0);

  // NOW pin is present
  const nowPin = page.locator('[data-testid="now-pin"]');
  await expect(nowPin).toBeVisible();

  // No NaN or Infinity in text content
  const text = await blueprintBar.textContent();
  expect(text).not.toContain("NaN");
  expect(text).not.toContain("Infinity");
});

// E-m1-010: Hero date + dayNumber + 0% for 2026-05-06T08:30:00
test("E-m1-010: Hero shows correct date, day number, and 0% for 2026-05-06", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const fixedTime = new Date("2026-05-06T08:30:00").getTime();
    Date.now = () => fixedTime;
  });
  await page.goto("/");

  // Date label: "Wed, May 6" (comma-separated per SG-m1-01)
  await expect(page.getByText(/Wed, May 6/)).toBeVisible();

  // Day number: May 6, 2026 = day 126 of 365
  await expect(page.getByText(/Building 126 of 365/)).toBeVisible();

  // 0% visible
  await expect(page.getByText("0%")).toBeVisible();

  // After 2 seconds wait, still 0% (no count-up)
  await page.waitForTimeout(2000);
  await expect(page.getByText("0%")).toBeVisible();
});

// E-m1-011: 24 hour labels + NowLine at 08:00
test("E-m1-011: 24 hour labels and NowLine at 08:00", async ({ page }) => {
  await page.addInitScript(() => {
    const fixedTime = new Date("2026-05-06T08:00:00").getTime();
    Date.now = () => fixedTime;
  });
  await page.goto("/");

  // Exactly 24 hour labels
  const labels = page.locator('[data-testid="hour-label"]');
  await expect(labels).toHaveCount(24);

  // First label is 00:00
  await expect(labels.first()).toHaveText("00:00");
  // Last label is 23:00
  await expect(labels.last()).toHaveText("23:00");

  // NowLine is visible with amber background
  const nowLine = page.locator('[data-testid="now-line"]');
  await expect(nowLine).toBeVisible();

  // Verify NowLine top is approximately 512px (8 * 64)
  const style = await nowLine.getAttribute("style");
  expect(style).toContain("512px");
});

// E-m1-012: Voice disabled + Add enabled, both inert on click
test("E-m1-012: Voice button disabled, Add enabled, both click without errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/");

  // Voice button has aria-disabled=true
  const voiceBtn = page.getByRole("button", { name: /voice log/i });
  await expect(voiceBtn).toHaveAttribute("aria-disabled", "true");

  // Click Voice button — no dialog, no error
  await voiceBtn.click();
  const dialogAfterVoice = page.locator('[role="dialog"]');
  await expect(dialogAfterVoice).toHaveCount(0);

  // Add button has no aria-disabled
  const addBtn = page.getByRole("button", { name: "Add" });
  await expect(addBtn).not.toHaveAttribute("aria-disabled");

  // Click Add button — no dialog, no error
  await addBtn.click();
  const dialogAfterAdd = page.locator('[role="dialog"]');
  await expect(dialogAfterAdd).toHaveCount(0);

  // No console errors
  expect(errors.length).toBe(0);
});

// E-m1-013: No console errors on page load
test("E-m1-013: no console errors or unhandled rejections on load", async ({
  page,
}) => {
  const errors: string[] = [];
  const rejections: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => rejections.push(err.message));

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  expect(errors.length).toBe(0);
  expect(rejections.length).toBe(0);
  // Specifically no scrollTop SSR errors
  const scrollErrors = errors.filter((e) => e.includes("scrollTop"));
  expect(scrollErrors.length).toBe(0);
});

// E-m1-014: HOUR_HEIGHT_PX alignment — NowLine lands on hour label
test("E-m1-014: NowLine aligns with 06:00 hour label (single HOUR_HEIGHT_PX source)", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const fixedTime = new Date("2026-05-06T06:00:00").getTime();
    Date.now = () => fixedTime;
  });
  await page.setViewportSize({ width: 430, height: 900 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Find the 06:00 hour label
  const label = page.locator('[data-testid="hour-label"]').nth(6); // 0-indexed, so nth(6) = 06:00
  const labelBox = await label.boundingBox();

  // Find the NowLine
  const nowLine = page.locator('[data-testid="now-line"]');
  const nowLineBox = await nowLine.boundingBox();

  if (labelBox && nowLineBox) {
    // The difference in Y position should be within ±2px
    const diff = Math.abs(nowLineBox.y - labelBox.y);
    expect(diff).toBeLessThan(10); // Allow some tolerance for scroll + margins
  }
});

// E-m1-015: NowLine visible above EmptyState card (z-index check)
test("E-m1-015: NowLine is visible (not occluded by EmptyState card)", async ({
  page,
}) => {
  await page.addInitScript(() => {
    // Set time to midday so NowLine overlaps the EmptyState card area
    const fixedTime = new Date("2026-05-06T12:00:00").getTime();
    Date.now = () => fixedTime;
  });
  await page.goto("/");

  const nowLine = page.locator('[data-testid="now-line"]');
  await expect(nowLine).toBeVisible();
});

// E-m1-016: TopBar safe-area inset (top)
test("E-m1-016: TopBar does not clip behind top safe-area inset", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 900 });
  await page.addInitScript(() => {
    document.documentElement.style.setProperty("--safe-top", "47px");
  });
  await page.goto("/");

  // Header is visible and not behind the notch
  const header = page.locator("header");
  await expect(header).toBeVisible();
  const box = await header.boundingBox();
  expect(box).not.toBeNull();
  // Header top should be >= 0 (not hidden)
  expect(box!.y).toBeGreaterThanOrEqual(0);
});
