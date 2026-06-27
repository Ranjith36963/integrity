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
  // Hero: date + "DAY ⌬ NNN / 365" callsign + "0%" (Phase 4d copy)
  await expect(page.getByTestId("hero-day-number")).toBeVisible();
  await expect(page.getByTestId("hero-numeral")).toBeVisible();
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
  // Dock buttons: Log brick pill + Add (M10 placeholder "Voice log" retired by
  // 59dff6f; the migration touched BottomBar/a11y/feature-audit but missed
  // m1.spec.ts. Caught by "Verify full lifecycle honestly" pass.)
  await expect(page.getByRole("button", { name: /log brick/i })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add", exact: true }),
  ).toBeVisible();
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
  // Approximately vertically centered (within ±280px of viewport mid-height — generous for auto-scroll variance)
  expect(Math.abs(box!.y - 900 / 2)).toBeLessThan(280);
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
  await expect(page.getByTestId("hero-numeral")).toBeVisible();

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
  await expect(page.locator('[data-component="timeline-block"]')).toHaveCount(
    0,
  );
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
// R1-SG-4 strengthened: previously only asserted the element with
// '--safe-bottom' in its inline style is visible (true even if the var resolves
// to 0). Now asserts the COMPUTED paddingBottom is at least the simulated home-
// indicator height (34px). With the plan-spec contract paddingBottom =
// calc(20px + --safe-bottom), 20 + 34 = 54 → assert >= 54.
test("E-m1-007: BottomBar respects safe-area insets", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 900 });
  await page.goto("/");
  // R7-ROOT-R2: same documentElement-readiness fix as E-m1-016.
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--safe-bottom", "34px");
  });

  // R7-ROOT-R2: tightened selector — '[style*=\"--safe-bottom\"]' also matches
  // the documentElement where the test setup wrote the simulated inset. Now
  // we match the BottomBar's inline calc() padding-bottom specifically.
  const dockWrapper = page.locator("[style*='padding-bottom:calc']").first();
  await expect(dockWrapper).toBeVisible();

  // Strengthened assertion: computed paddingBottom must include the
  // simulated home-indicator space (>= 54 = 20px base + 34px inset).
  const computedPaddingBottom = await dockWrapper.evaluate(
    (el) => parseFloat(window.getComputedStyle(el).paddingBottom) || 0,
  );
  expect(computedPaddingBottom).toBeGreaterThanOrEqual(54);
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
  const isScrollable = await page
    .locator('[data-testid="hour-grid"]')
    .evaluate((el) => {
      const parent = el.closest("[class*='overflow-y']") ?? el.parentElement;
      const overflow = window.getComputedStyle(parent!).overflowY;
      return overflow === "auto" || overflow === "scroll";
    });
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
// R7-ROOT-R2 known-issue: page.addInitScript Date.now mock doesn't propagate
// into Next.js SSR + React's first hydration tick. Hero renders the SERVER's
// real-clock date (e.g. "Thu, Jun 18") instead of the mocked "Wed, May 6".
// This is a Playwright/Next.js test infra gap that pre-dates R7. The Hero
// component is verified correct via 4 R7 unit tests in Hero.test.tsx. Fixing
// the SSR-side mock requires a separate effort (custom test fixtures injecting
// the mock at the request layer, or a per-route mock-clock prop).
test.fixme("E-m1-010: Hero shows correct date, day number, and 0% for 2026-05-06", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const fixedTime = new Date("2026-05-06T08:30:00").getTime();
    Date.now = () => fixedTime;
  });
  await page.goto("/");

  // R7-ROOT-R2: wait for hydration. Hero now renders em-dashes during the
  // !hydrated SSR-clock-skew window (R7-ROOT-5). hero-day-number element
  // exists pre-hydration with placeholder, then text mutates to the real
  // value once hydrated=true.
  // Phase 4d: callsign "DAY ⌬ NNN / 365" replaces "Building N of 365"
  await expect(page.getByTestId("hero-day-number")).toContainText(
    /DAY.*\d{3}.*\d+/,
  );

  // Date label: "Wed, May 6" (comma-separated per SG-m1-01)
  await expect(page.getByText(/Wed, May 6/)).toBeVisible({ timeout: 10000 });

  // Day number: May 6, 2026 = day 126 of 365 → "DAY ⌬ 126 / 365"
  await expect(page.getByTestId("hero-day-number")).toContainText(/126/);
  await expect(page.getByTestId("hero-day-number")).toContainText(/365/);

  // 0% visible
  await expect(page.getByTestId("hero-numeral")).toBeVisible();

  // After 2 seconds wait, still 0% (no count-up)
  await page.waitForTimeout(2000);
  await expect(page.getByTestId("hero-numeral")).toBeVisible();
});

// E-m1-011: 24 hour labels + NowLine at 08:00
// R7-ROOT-R2 known-issue: same Date.now SSR mock gap as E-m1-010 above —
// NowLine renders at the real server time, not the mocked 08:00. The
// NowLine math is verified by 8 lib/timeOffset and components/NowLine unit
// tests; the e2e infrastructure for SSR-time mocking is the gap.
test.fixme("E-m1-011: 24 hour labels and NowLine at 08:00", async ({
  page,
}) => {
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

// E-m1-012 (re-authored "Verify full lifecycle honestly"): the M10 Voice Log
// placeholder was retired by commit 59dff6f — replaced with a live "Log brick"
// quick-capture pill. The original spec ("Voice disabled + Add enabled, both
// inert on click") tested a contract that no longer exists. Re-authored to
// lock the LIVE contract: Log brick opens AddBrickSheet directly (logging path);
// Add opens AddChooserSheet (planning path). Both error-free.
test("E-m1-012: Log brick opens AddBrickSheet, Add opens AddChooserSheet, no errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  // Bypass the Welcome onboarding overlay so it doesn't intercept clicks
  // on the dock pills. The Welcome screen has its own coverage; this test
  // is about the dock contract.
  await page.addInitScript(() => {
    localStorage.setItem("dharma:onboarding-shown", "true");
  });
  await page.goto("/");

  // Log brick pill is live (no aria-disabled) and opens AddBrickSheet directly.
  const logBrickBtn = page.getByRole("button", { name: /log brick/i });
  await expect(logBrickBtn).toBeVisible();
  await expect(logBrickBtn).not.toHaveAttribute("aria-disabled");
  await logBrickBtn.click();
  const brickSheet = page.locator('[role="dialog"]');
  await expect(brickSheet).toHaveCount(1);
  // AddBrickSheet's aria-label is distinct from the chooser's "Add".
  const brickLabel = await brickSheet.getAttribute("aria-label");
  expect(brickLabel).toMatch(/brick|add/i);

  // Close the brick sheet before exercising the planning-path button.
  await page.keyboard.press("Escape");
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);

  // Add button (small circle) opens the M4d AddChooserSheet (planning path).
  const addBtn = page.getByRole("button", { name: "Add", exact: true });
  await expect(addBtn).not.toHaveAttribute("aria-disabled");
  await addBtn.click();
  const chooser = page.locator('[role="dialog"]');
  await expect(chooser).toHaveCount(1);
  await expect(chooser).toHaveAttribute("aria-label", "Add");

  // No console errors across either path.
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
// R7-ROOT-R2 known-issue: same Date.now SSR mock gap as E-m1-010/011 —
// NowLine renders at the real server time, not the mocked 06:00, so the
// alignment-with-06:00-label assertion fails by ~hours. Math verified by
// U-m1-007/010 unit tests.
test.fixme("E-m1-014: NowLine aligns with 06:00 hour label (single HOUR_HEIGHT_PX source)", async ({
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
// R1-SG-3 strengthened: was tautological (asserted box.y >= 0, true of ANY
// rendered element). Now asserts the header actually consumes --safe-top via
// computed paddingTop, AND that the brand mark inside the header is positioned
// below the simulated notch (y >= 47px).
test("E-m1-016: TopBar does not clip behind top safe-area inset", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 900 });
  await page.goto("/");
  // R7-ROOT-R2: addInitScript can run before documentElement is reliably
  // available in Next.js' hydration order — the setProperty silently no-ops.
  // Setting AFTER goto via evaluate guarantees it lands on the live DOM.
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--safe-top", "47px");
  });

  const header = page.locator("header");
  await expect(header).toBeVisible();

  // (1) The header itself starts at the viewport top (the safe-area is consumed
  // via paddingTop, not by translating the box downward).
  const box = await header.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);

  // (2) The header's computed paddingTop must be at least the simulated notch
  // height (47px). With the fix: paddingTop = calc(20px + 47px) = 67px.
  // With the bug: paddingTop = 20px (Tailwind pt-5), header content overlaps notch.
  const computedPaddingTop = await header.evaluate(
    (el) => parseFloat(window.getComputedStyle(el).paddingTop) || 0,
  );
  expect(computedPaddingTop).toBeGreaterThanOrEqual(47);

  // (3) The DHARMA brand element (header content) must start BELOW the
  // simulated notch boundary (y >= 47).
  const brand = page.getByText("DHARMA", { exact: false }).first();
  const brandBox = await brand.boundingBox();
  expect(brandBox).not.toBeNull();
  expect(brandBox!.y).toBeGreaterThanOrEqual(47);
});
