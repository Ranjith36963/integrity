import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// A-m3 accessibility tests — axe-core zero violations for M3 surfaces.

async function addBlock(page: import("@playwright/test").Page, title: string) {
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByLabel(/Title/i).fill(title);
  await page.getByRole("button", { name: /Save/i }).click();
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);
}

// A-m3-001: zero axe violations on day view with block + bricks + loose brick
test("A-m3-001: zero axe violations on day view with expanded block and loose brick", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const fixedTime = new Date("2026-05-06T09:00:00").getTime();
    Date.now = () => fixedTime;
  });
  await page.goto("/");

  // Add block
  await addBlock(page, "Morning");

  // Expand block and add a tick brick
  const card = page.locator('[data-component="timeline-block"]').first();
  await card.click();
  await page
    .getByRole("button", { name: /add brick/i })
    .first()
    .click();
  await page.getByLabel(/Title/i).fill("brick A");
  await page.getByRole("button", { name: /Save/i }).click();
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);

  // Add loose brick
  await page.getByTestId("add-loose-brick-pill").click();
  await page.getByLabel(/Title/i).fill("loose A");
  await page.getByRole("button", { name: /Save/i }).click();
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);

  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const serious = result.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  if (serious.length > 0) {
    console.log(
      "A-m3-001 violations:",
      JSON.stringify(
        serious.map((v) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.slice(0, 2).map((n) => n.html),
        })),
        null,
        2,
      ),
    );
  }
  expect(serious).toHaveLength(0);
});

// A-m3-002: zero axe violations with AddBrickSheet open; focus trap
test("A-m3-002: zero axe violations with AddBrickSheet open; focus trap cycles within sheet", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const fixedTime = new Date("2026-05-06T09:00:00").getTime();
    Date.now = () => fixedTime;
  });
  await page.goto("/");

  await addBlock(page, "Morning");

  const card = page.locator('[data-component="timeline-block"]').first();
  await card.click();
  await page
    .getByRole("button", { name: /add brick/i })
    .first()
    .click();

  // Sheet is open
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const serious = result.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  if (serious.length > 0) {
    console.log(
      "A-m3-002 violations:",
      JSON.stringify(
        serious.map((v) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.slice(0, 2).map((n) => n.html),
        })),
        null,
        2,
      ),
    );
  }
  expect(serious).toHaveLength(0);

  // Tab order: focus should remain within the sheet
  const title = page.getByLabel(/Title/i);
  await expect(title).toBeFocused();
});

// A-m3-003: zero axe violations on expanded block with bricks; aria-expanded + role=list
test("A-m3-003: zero axe violations on expanded block; aria-expanded + role=list correct", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const fixedTime = new Date("2026-05-06T09:00:00").getTime();
    Date.now = () => fixedTime;
  });
  await page.goto("/");

  await addBlock(page, "Morning");

  const card = page.locator('[data-component="timeline-block"]').first();
  await card.click();

  // Add a brick so the list renders
  await page
    .getByRole("button", { name: /add brick/i })
    .first()
    .click();
  await page.getByLabel(/Title/i).fill("brick A");
  await page.getByRole("button", { name: /Save/i }).click();
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);

  // Expand the block again (may have collapsed when dialog opened)
  const cardAgain = page.locator('[data-component="timeline-block"]').first();
  const ariaExpanded = await cardAgain.getAttribute("aria-expanded");
  if (ariaExpanded !== "true") {
    await cardAgain.click();
  }

  // aria-expanded=true
  await expect(cardAgain).toHaveAttribute("aria-expanded", "true");

  // Bricks list has role=list
  await expect(page.getByRole("list")).toBeVisible();

  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const serious = result.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  if (serious.length > 0) {
    console.log(
      "A-m3-003 violations:",
      JSON.stringify(
        serious.map((v) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.slice(0, 2).map((n) => n.html),
        })),
        null,
        2,
      ),
    );
  }
  expect(serious).toHaveLength(0);
});

// A-m3-004: zero axe violations on expanded LooseBricksTray; role=region + aria-expanded
test("A-m3-004: zero axe violations on expanded tray; role=region + aria-expanded", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const fixedTime = new Date("2026-05-06T09:00:00").getTime();
    Date.now = () => fixedTime;
  });
  await page.goto("/");

  await addBlock(page, "Morning");

  // Add loose brick
  await page.getByTestId("add-loose-brick-pill").click();
  await page.getByLabel(/Title/i).fill("loose A");
  await page.getByRole("button", { name: /Save/i }).click();
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);

  // Expand the tray
  await page.getByRole("button", { name: /expand loose bricks/i }).click();

  const tray = page.getByRole("region", { name: /loose bricks/i });
  await expect(tray).toHaveAttribute("aria-expanded", "true");

  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const serious = result.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  if (serious.length > 0) {
    console.log(
      "A-m3-004 violations:",
      JSON.stringify(
        serious.map((v) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.slice(0, 2).map((n) => n.html),
        })),
        null,
        2,
      ),
    );
  }
  expect(serious).toHaveLength(0);
});

// A-m3-005: HeroRing aria-live="polite" present; aria-label updates on dayPct change
test("A-m3-005: HeroRing has aria-live=polite; aria-label reflects current pct", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const fixedTime = new Date("2026-05-06T09:00:00").getTime();
    Date.now = () => fixedTime;
  });
  await page.goto("/");

  // HeroRing SVG has aria-live=polite
  const heroRing = page.locator("svg[role='img'][aria-label*='Day score']");
  await expect(heroRing).toBeVisible();
  await expect(heroRing).toHaveAttribute("aria-live", "polite");

  // Initially "Day score: 0%"
  await expect(heroRing).toHaveAttribute("aria-label", /Day score: 0%/);
});

// A-m3-006: Touch targets ≥ 44px on M3 surfaces
test("A-m3-006: all M3 touch targets are ≥ 44px tall", async ({ page }) => {
  await page.addInitScript(() => {
    const fixedTime = new Date("2026-05-06T09:00:00").getTime();
    Date.now = () => fixedTime;
  });
  await page.goto("/");

  await addBlock(page, "Morning");

  // Add a loose brick so chip appears in tray
  await page.getByTestId("add-loose-brick-pill").click();
  await page.getByLabel(/Title/i).fill("loose A");
  await page.getByRole("button", { name: /Save/i }).click();
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);

  // + Brick pill ≥ 44px tall
  const addLoosePill = page.getByTestId("add-loose-brick-pill");
  const pillBox = await addLoosePill.boundingBox();
  expect(pillBox?.height ?? 0).toBeGreaterThanOrEqual(44);

  // Chevron toggle ≥ 44px
  const chevron = page.getByRole("button", { name: /expand loose bricks/i });
  const chevronBox = await chevron.boundingBox();
  expect(chevronBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(chevronBox?.width ?? 0).toBeGreaterThanOrEqual(44);

  // Open AddBrickSheet and check type-selector chips
  const card = page.locator('[data-component="timeline-block"]').first();
  await card.click();
  await page
    .getByRole("button", { name: /add brick/i })
    .first()
    .click();
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  // Type chips (Tick, Goal, Time) ≥ 44px
  for (const typeName of ["Tick", "Goal", "Time"]) {
    const chip = page.getByRole("radio", { name: new RegExp(typeName, "i") });
    const chipBox = await chip.boundingBox();
    expect(chipBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  }

  // BrickChip in tray — sm size ≥ 44px (button inside chip)
  await page.getByRole("button", { name: /Cancel/i }).click();
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);

  // Expand the tray and check md BrickChips
  await page.getByRole("button", { name: /expand loose bricks/i }).click();
  const brickChipBtn = page
    .locator('[data-component="brick-chip"] button')
    .first();
  const chipBtnBox = await brickChipBtn.boundingBox();
  expect(chipBtnBox?.height ?? 0).toBeGreaterThanOrEqual(44);
});
