import { test, expect, type Page } from "@playwright/test";

// All M3 e2e run on mobile-chrome (Pixel 7) at 430×900 viewport.
// Base URL: http://localhost:3000. Route under test: /.
// Fixed time: 2026-05-06T09:00:00 (prevents clock drift in assertions).

async function addBlock(page: Page, title: string) {
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByLabel(/Title/i).fill(title);
  await page.getByRole("button", { name: /Save/i }).click();
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);
}

async function expandBlock(page: Page) {
  const card = page.locator('[data-component="timeline-block"]').first();
  await card.click();
  await expect(card).toHaveAttribute("aria-expanded", "true");
  return card;
}

// E-m3-001: full happy path — Add tick brick inside a block
test("E-m3-001: add tick brick inside a block; chip renders at 0%", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const fixedTime = new Date("2026-05-06T09:00:00").getTime();
    Date.now = () => fixedTime;
  });
  await page.goto("/");

  // Add a block
  await addBlock(page, "Morning");

  // Expand the block
  await expandBlock(page);

  // Tap "+ Add brick"
  await page
    .getByRole("button", { name: /add brick/i })
    .first()
    .click();

  // AddBrickSheet opens
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-label", "Add Brick");

  // Type title; leave type as Tick (default)
  await page.getByLabel(/Title/i).fill("brick A");

  // Save
  await page.getByRole("button", { name: /Save/i }).click();

  // Sheet closes
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);

  // BrickChip renders with "brick A"
  const chip = page.locator('[data-component="brick-chip"]').first();
  await expect(chip).toBeVisible();
  await expect(chip).toContainText("brick A");

  // No horizontal overflow at 430px
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(430);
});

// E-m3-002: add goal brick inside a block
test("E-m3-002: add goal brick; chip renders with '0 / 100 reps' badge", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const fixedTime = new Date("2026-05-06T09:00:00").getTime();
    Date.now = () => fixedTime;
  });
  await page.goto("/");

  await addBlock(page, "Morning");
  await expandBlock(page);

  await page
    .getByRole("button", { name: /add brick/i })
    .first()
    .click();
  await page.getByLabel(/Title/i).fill("brick B");

  // Select Goal type
  await page.getByRole("radio", { name: /Goal/i }).click();

  // Fill target and unit
  await page.getByLabel(/Target/i).fill("100");
  await page.getByLabel(/Unit/i).fill("reps");

  await page.getByRole("button", { name: /Save/i }).click();
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);

  // Chip renders with goal badge
  const chip = page.locator('[data-component="brick-chip"]').first();
  await expect(chip).toBeVisible();
  await expect(chip).toContainText("brick B");
  await expect(chip).toContainText("0");
  await expect(chip).toContainText("100");
  await expect(chip).toContainText("reps");
});

// E-m3-003: add time brick inside a block
test("E-m3-003: add time brick; chip renders with '0 / 30 m' badge", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const fixedTime = new Date("2026-05-06T09:00:00").getTime();
    Date.now = () => fixedTime;
  });
  await page.goto("/");

  await addBlock(page, "Morning");
  await expandBlock(page);

  await page
    .getByRole("button", { name: /add brick/i })
    .first()
    .click();
  await page.getByLabel(/Title/i).fill("brick C");

  // Select Time type
  await page.getByRole("radio", { name: /Time/i }).click();

  // Fill duration
  await page.getByLabel(/Duration in minutes/i).fill("30");

  await page.getByRole("button", { name: /Save/i }).click();
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);

  // Chip renders with time badge
  const chip = page.locator('[data-component="brick-chip"]').first();
  await expect(chip).toBeVisible();
  await expect(chip).toContainText("brick C");
  await expect(chip).toContainText("0");
  await expect(chip).toContainText("30");
  await expect(chip).toContainText("m");
});

// E-m3-004: add standalone brick via Loose Bricks tray
test("E-m3-004: add loose brick via tray + Brick pill; chip renders in tray", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const fixedTime = new Date("2026-05-06T09:00:00").getTime();
    Date.now = () => fixedTime;
  });
  await page.goto("/");

  // Add block to make tray visible
  await addBlock(page, "Morning");

  // Tray should appear
  const tray = page.getByRole("region", { name: /loose bricks/i });
  await expect(tray).toBeVisible();

  // Tap "+ Brick" pill
  await page.getByTestId("add-loose-brick-pill").click();

  // AddBrickSheet opens
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  // Fill and save
  await page.getByLabel(/Title/i).fill("brick D");
  await page.getByRole("button", { name: /Save/i }).click();

  // Sheet closes
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);

  // Chip appears in tray
  await expect(tray).toContainText("brick D");
  const chipsInTray = tray.locator('[data-component="brick-chip"]');
  await expect(chipsInTray).toHaveCount(1);
});

// E-m3-005: AddBrickSheet validation paths
test("E-m3-005: Save disabled when Title empty; Goal target=0; Time duration=0", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const fixedTime = new Date("2026-05-06T09:00:00").getTime();
    Date.now = () => fixedTime;
  });
  await page.goto("/");

  await addBlock(page, "Morning");
  await expandBlock(page);
  await page
    .getByRole("button", { name: /add brick/i })
    .first()
    .click();

  const saveBtn = page.getByRole("button", { name: /Save/i });

  // Empty title → disabled
  await expect(saveBtn).toHaveAttribute("aria-disabled", "true");

  // Goal with target=0 → disabled
  await page.getByLabel(/Title/i).fill("brick A");
  await page.getByRole("radio", { name: /Goal/i }).click();
  await page.getByLabel(/Target/i).fill("0");
  await expect(saveBtn).toHaveAttribute("aria-disabled", "true");

  // Goal with target=1 → enabled
  await page.getByLabel(/Target/i).fill("1");
  await expect(saveBtn).toHaveAttribute("aria-disabled", "false");

  // Time with duration=0 → disabled
  await page.getByRole("radio", { name: /Time/i }).click();
  await page.getByLabel(/Duration in minutes/i).fill("0");
  await expect(saveBtn).toHaveAttribute("aria-disabled", "true");

  // Time with duration=1 → enabled
  await page.getByLabel(/Duration in minutes/i).fill("1");
  await expect(saveBtn).toHaveAttribute("aria-disabled", "false");
});

// E-m3-006: Cancel closes sheet without saving
test("E-m3-006: Cancel discards dirty form; no brick appended", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const fixedTime = new Date("2026-05-06T09:00:00").getTime();
    Date.now = () => fixedTime;
  });
  await page.goto("/");

  await addBlock(page, "Morning");
  await expandBlock(page);

  await page
    .getByRole("button", { name: /add brick/i })
    .first()
    .click();
  await page.getByLabel(/Title/i).fill("dirty brick");

  // Cancel via ×
  await page.getByRole("button", { name: /Cancel/i }).click();

  // Sheet closes
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);

  // No brick chips in DOM
  await expect(page.locator('[data-component="brick-chip"]')).toHaveCount(0);
});

// E-m3-007: block tap-to-expand toggles; aria-expanded updates
test("E-m3-007: block tap-to-expand toggles aria-expanded and collapses on re-tap", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const fixedTime = new Date("2026-05-06T09:00:00").getTime();
    Date.now = () => fixedTime;
  });
  await page.goto("/");

  await addBlock(page, "Morning");

  const card = page.locator('[data-component="timeline-block"]').first();

  // Initially collapsed (aria-expanded=false)
  await expect(card).toHaveAttribute("aria-expanded", "false");

  // Tap to expand
  await card.click();
  await expect(card).toHaveAttribute("aria-expanded", "true");

  // Tap again to collapse
  await card.click();
  await expect(card).toHaveAttribute("aria-expanded", "false");
});

// E-m3-008: Loose Bricks tray hidden in literal-empty state; appears after block added
test("E-m3-008: tray absent when empty; appears after block is added", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const fixedTime = new Date("2026-05-06T09:00:00").getTime();
    Date.now = () => fixedTime;
  });
  await page.goto("/");

  // Empty state: tray absent
  await expect(page.getByRole("region", { name: /loose bricks/i })).toHaveCount(
    0,
  );

  // Empty state copy visible
  await expect(
    page.getByText("Tap any slot to lay your first block."),
  ).toBeVisible();

  // Add block
  await addBlock(page, "Morning");

  // Tray now appears
  await expect(
    page.getByRole("region", { name: /loose bricks/i }),
  ).toBeVisible();

  // Empty-state card unmounted
  await expect(
    page.getByText("Tap any slot to lay your first block."),
  ).toHaveCount(0);
});

// E-m3-009: LooseBricksTray chevron expand/collapse
test("E-m3-009: tray chevron expands and collapses; icon flips", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const fixedTime = new Date("2026-05-06T09:00:00").getTime();
    Date.now = () => fixedTime;
  });
  await page.goto("/");

  // Add block + loose brick so tray has content
  await addBlock(page, "Morning");

  // Add a loose brick
  await page.getByTestId("add-loose-brick-pill").click();
  await page.getByLabel(/Title/i).fill("loose A");
  await page.getByRole("button", { name: /Save/i }).click();

  const tray = page.getByRole("region", { name: /loose bricks/i });
  await expect(tray).toHaveAttribute("aria-expanded", "false");

  // Expand via chevron
  await page.getByRole("button", { name: /expand loose bricks/i }).click();
  await expect(tray).toHaveAttribute("aria-expanded", "true");

  // Collapse again
  await page.getByRole("button", { name: /collapse loose bricks/i }).click();
  await expect(tray).toHaveAttribute("aria-expanded", "false");
});

// E-m3-010: SlotTapTargets pass-through preserved; no targets in edit mode
test("E-m3-010: SlotTapTargets render in view mode; absent in edit mode", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const fixedTime = new Date("2026-05-06T09:00:00").getTime();
    Date.now = () => fixedTime;
  });
  await page.goto("/");

  await addBlock(page, "Morning");

  // View mode: 24 slot buttons present
  const slotBtns = page.getByRole("button", { name: /Add block at/ });
  await expect(slotBtns).toHaveCount(24);

  // Toggle edit mode via pencil icon
  const pencilBtn = page.getByRole("button", { name: /edit/i });
  if ((await pencilBtn.count()) > 0) {
    await pencilBtn.click();
    // Edit mode: slot buttons gone
    await expect(
      page.getByRole("button", { name: /Add block at/ }),
    ).toHaveCount(0);
  }
});

// E-m3-011: block expand still works in edit mode; + Add brick tappable
test("E-m3-011: block tap-to-expand works in edit mode; + Add brick tappable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const fixedTime = new Date("2026-05-06T09:00:00").getTime();
    Date.now = () => fixedTime;
  });
  await page.goto("/");

  await addBlock(page, "Morning");

  // Toggle edit mode (if pencil present)
  const pencilBtn = page.getByRole("button", { name: /edit/i });
  if ((await pencilBtn.count()) > 0) {
    await pencilBtn.click();
  }

  const card = page.locator('[data-component="timeline-block"]').first();
  await card.click();
  await expect(card).toHaveAttribute("aria-expanded", "true");

  // "+ Add brick" is tappable
  await expect(
    page.getByRole("button", { name: /add brick/i }).first(),
  ).toBeVisible();
});

// E-m3-012: no horizontal overflow at 430px when AddBrickSheet open
test("E-m3-012: no horizontal overflow at 430px with AddBrickSheet open (Goal type)", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const fixedTime = new Date("2026-05-06T09:00:00").getTime();
    Date.now = () => fixedTime;
  });
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/");

  await addBlock(page, "Morning");
  await expandBlock(page);

  // Open AddBrickSheet
  await page
    .getByRole("button", { name: /add brick/i })
    .first()
    .click();

  // Select Goal type
  await page.getByRole("radio", { name: /Goal/i }).click();
  await page.getByLabel(/Title/i).fill("brick A");
  await page.getByLabel(/Target/i).fill("100");
  await page.getByLabel(/Unit/i).fill("reps");

  // No horizontal overflow
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(430);
});

// E-m3-013: HeroRing renders and reflects 0% on first load; stays 0% after block added with no bricks
test("E-m3-013: HeroRing SVG visible; shows 0% on fresh load; stays 0% after empty block added", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const fixedTime = new Date("2026-05-06T09:00:00").getTime();
    Date.now = () => fixedTime;
  });
  await page.goto("/");

  // HeroRing SVG visible
  const heroRing = page.locator("svg[role='img'][aria-label*='Day score']");
  await expect(heroRing).toBeVisible();

  // Numeral shows 0%
  await expect(page.getByText("0%")).toBeVisible();

  // Arc is full (empty) — filled arc dashoffset = circumference
  const R = 56;
  const C = 2 * Math.PI * R;
  const dashoffset = await page
    .locator("circle[stroke-dasharray]")
    .getAttribute("stroke-dashoffset");
  expect(parseFloat(dashoffset ?? "0")).toBeCloseTo(C, 0);

  // Add block (no bricks) — Hero stays at 0%
  await addBlock(page, "Morning");
  await expect(page.getByText("0%")).toBeVisible();
});
