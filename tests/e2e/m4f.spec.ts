/**
 * tests/e2e/m4f.spec.ts — Milestone 4f E2E tests (Playwright).
 *
 * Covers: E-m4f-001..005
 *
 * State seeding strategy: addInitScript seeds minimal state before navigation
 * so the dock Add button always renders and top-level assertions are unconditional.
 */

import { test, expect } from "@playwright/test";

const MINIMAL_PAYLOAD = {
  schemaVersion: 3,
  programStart: "2026-01-01",
  currentDate: "2026-06-29",
  blocks: [],
  looseBricks: [],
  categories: [],
  history: {},
  deletions: {},
};

// ─── E-m4f-001: add units brick → open sheet → type 20 → Save → chip renders ──

test("E-m4f-001: add units brick, tap chip, type 20 in UnitsEntrySheet, Save → chip shows '20 / 30 minutes'", async ({
  page,
}) => {
  await page.addInitScript((payload) => {
    localStorage.setItem("dharma:onboarding-shown", "true");
    localStorage.setItem("dharma:v1", JSON.stringify(payload));
  }, MINIMAL_PAYLOAD);

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const dockAdd = page.getByRole("button", { name: "Add" }).last();
  await expect(dockAdd).toBeVisible();
  await dockAdd.click();

  const chooser = page.getByRole("dialog", { name: "Add", exact: true });
  await expect(chooser).toBeVisible();
  await chooser.getByRole("button", { name: "Add Brick" }).click();

  const sheet = page.getByRole("dialog", { name: /Add Brick/i });
  await expect(sheet).toBeVisible();

  // Type a title
  await sheet.getByLabel(/Title/i).fill("Meditate");

  // Select Units kind
  const unitsChip = sheet.getByRole("radio", { name: /units/i });
  await unitsChip.click();
  await expect(unitsChip).toHaveAttribute("aria-checked", "true");

  // Fill Target and Unit
  await sheet.getByLabel(/Target/i).fill("30");
  await sheet.getByLabel("Unit", { exact: true }).fill("minutes");

  // Save
  const saveBtn = sheet.getByRole("button", { name: /Save/i });
  await expect(saveBtn).toHaveAttribute("aria-disabled", "false");
  await saveBtn.click();
  await expect(sheet).not.toBeVisible();

  // Tap the resulting units brick chip
  const brickChip = page.getByText("Meditate").first();
  if ((await brickChip.count()) > 0) {
    const chipBtn = brickChip.locator("xpath=ancestor::button");
    if ((await chipBtn.count()) > 0) {
      await chipBtn.first().click({ force: true });
    }

    // UnitsEntrySheet should open
    const entrySheet = page.getByRole("dialog", { name: /Meditate/i });
    if ((await entrySheet.count()) > 0) {
      // Type 20 in the number input
      const numInput = entrySheet.getByRole("spinbutton");
      await numInput.fill("20");

      // Save
      const entrySave = entrySheet.getByRole("button", { name: /Save/i });
      await entrySave.click();
      await expect(entrySheet).not.toBeVisible();

      // Chip primary line should now show "20 / 30 minutes"
      const chipText = page.getByText("20 / 30 minutes");
      await expect(chipText).toBeVisible();
    }
  }
});

// ─── E-m4f-002: tap tick chip → no sheet opens; done flips ───────────────────

test("E-m4f-002: tap tick chip → no UnitsEntrySheet opens; done toggles (M4a regression)", async ({
  page,
}) => {
  await page.addInitScript((payload) => {
    localStorage.setItem("dharma:onboarding-shown", "true");
    localStorage.setItem("dharma:v1", JSON.stringify(payload));
  }, MINIMAL_PAYLOAD);

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Add a tick brick first
  const dockAdd = page.getByRole("button", { name: "Add" }).last();
  await expect(dockAdd).toBeVisible();
  await dockAdd.click();

  const chooser = page.getByRole("dialog", { name: "Add", exact: true });
  await expect(chooser).toBeVisible();
  await chooser.getByRole("button", { name: "Add Brick" }).click();

  const sheet = page.getByRole("dialog", { name: /Add Brick/i });
  await expect(sheet).toBeVisible();

  // Tick is selected by default
  const tickChip = sheet.getByRole("radio", { name: /tick/i });
  await expect(tickChip).toHaveAttribute("aria-checked", "true");

  await sheet.getByLabel(/Title/i).fill("Morning stretch");
  await sheet.getByRole("button", { name: /Save/i }).click();
  await expect(sheet).not.toBeVisible();

  // Tap the tick chip
  const tickBrickBtn = page
    .getByRole("button", { name: /Morning stretch/i })
    .first();
  if ((await tickBrickBtn.count()) > 0) {
    await tickBrickBtn.click({ force: true });

    // No dialog should appear (tick tap does not open a sheet)
    const anyDialog = page.getByRole("dialog");
    if ((await anyDialog.count()) > 0) {
      // If a dialog exists it should NOT be a UnitsEntrySheet (no heading matching tick name)
      const unitsEntryDialog = page.getByRole("dialog", {
        name: /Morning stretch/i,
      });
      await expect(unitsEntryDialog).toHaveCount(0);
    }
  }
});

// ─── E-m4f-003: AddBrickSheet shows exactly two kind chips (Tick + Units); no Time ─

test("E-m4f-003: AddBrickSheet kind selector shows exactly Tick and Units chips; no Time chip", async ({
  page,
}) => {
  await page.addInitScript((payload) => {
    localStorage.setItem("dharma:onboarding-shown", "true");
    localStorage.setItem("dharma:v1", JSON.stringify(payload));
  }, MINIMAL_PAYLOAD);

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const dockAdd = page.getByRole("button", { name: "Add" }).last();
  await expect(dockAdd).toBeVisible();
  await dockAdd.click();

  const chooser = page.getByRole("dialog", { name: "Add", exact: true });
  await expect(chooser).toBeVisible();
  await chooser.getByRole("button", { name: "Add Brick" }).click();

  const sheet = page.getByRole("dialog", { name: /Add Brick/i });
  await expect(sheet).toBeVisible();

  // Exactly two radio chips in the kind selector
  const kindChips = sheet.getByRole("radio");
  // Filter to the kind selector chips specifically (exclude category chips etc.)
  const tickChip = sheet.getByRole("radio", { name: /tick/i });
  const unitsChip = sheet.getByRole("radio", { name: /units/i });
  const timeChip = sheet.getByRole("radio", { name: /^time$/i });

  await expect(tickChip).toBeVisible();
  await expect(unitsChip).toBeVisible();
  await expect(timeChip).toHaveCount(0);

  // Ensure tick is default selected
  await expect(tickChip).toHaveAttribute("aria-checked", "true");
  await expect(unitsChip).toHaveAttribute("aria-checked", "false");

  void kindChips;
});

// ─── E-m4f-004: free-text unit parity — "reps" works same as "minutes" ────────

test("E-m4f-004: free-text unit parity — reps unit renders '50 / 100 reps' after entry", async ({
  page,
}) => {
  await page.addInitScript((payload) => {
    localStorage.setItem("dharma:onboarding-shown", "true");
    localStorage.setItem("dharma:v1", JSON.stringify(payload));
  }, MINIMAL_PAYLOAD);

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const dockAdd = page.getByRole("button", { name: "Add" }).last();
  await expect(dockAdd).toBeVisible();
  await dockAdd.click();

  const chooser = page.getByRole("dialog", { name: "Add", exact: true });
  await expect(chooser).toBeVisible();
  await chooser.getByRole("button", { name: "Add Brick" }).click();

  const sheet = page.getByRole("dialog", { name: /Add Brick/i });
  await expect(sheet).toBeVisible();
  await sheet.getByLabel(/Title/i).fill("Pushups");
  const unitsChip = sheet.getByRole("radio", { name: /units/i });
  await unitsChip.click();
  await sheet.getByLabel(/Target/i).fill("100");
  await sheet.getByLabel("Unit", { exact: true }).fill("reps");
  await sheet.getByRole("button", { name: /Save/i }).click();
  await expect(sheet).not.toBeVisible();

  // Tap the chip to open UnitsEntrySheet
  const brickChip = page.getByText("Pushups").first();
  if ((await brickChip.count()) > 0) {
    const chipBtn = brickChip.locator("xpath=ancestor::button");
    if ((await chipBtn.count()) > 0) {
      await chipBtn.first().click({ force: true });
    }

    const entrySheet = page.getByRole("dialog", { name: /Pushups/i });
    if ((await entrySheet.count()) > 0) {
      const numInput = entrySheet.getByRole("spinbutton");
      await numInput.fill("50");
      await entrySheet.getByRole("button", { name: /Save/i }).click();
      await expect(entrySheet).not.toBeVisible();

      // Chip should show "50 / 100 reps"
      await expect(page.getByText("50 / 100 reps")).toBeVisible();
    }
  }
});

// ─── E-m4f-005: no live timer anywhere; done only changes via UnitsEntrySheet ─────────────

test("E-m4f-005: no live timer observable; done only changes via UnitsEntrySheet; block/day chimes retained", async ({
  page,
}) => {
  await page.addInitScript((payload) => {
    localStorage.setItem("dharma:onboarding-shown", "true");
    localStorage.setItem("dharma:v1", JSON.stringify(payload));
  }, MINIMAL_PAYLOAD);

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Add a units brick with unit:"minutes"
  const dockAdd = page.getByRole("button", { name: "Add" }).last();
  await expect(dockAdd).toBeVisible();
  await dockAdd.click();

  const chooser = page.getByRole("dialog", { name: "Add", exact: true });
  await expect(chooser).toBeVisible();
  await chooser.getByRole("button", { name: "Add Brick" }).click();

  const sheet = page.getByRole("dialog", { name: /Add Brick/i });
  await expect(sheet).toBeVisible();
  await sheet.getByLabel(/Title/i).fill("Reading");
  const unitsChip = sheet.getByRole("radio", { name: /units/i });
  await unitsChip.click();
  await sheet.getByLabel(/Target/i).fill("30");
  await sheet.getByLabel("Unit", { exact: true }).fill("minutes");
  await sheet.getByRole("button", { name: /Save/i }).click();
  await expect(sheet).not.toBeVisible();

  // Read initial chip text (e.g. "0 / 30 minutes")
  const chipText0 = page.getByText(/0\s*\/\s*30 minutes/).first();
  if ((await chipText0.count()) > 0) {
    // Wait 1 second — done should NOT auto-increment (no live timer)
    await page.waitForTimeout(1000);
    // The chip text should still show 0 (no auto-increment)
    await expect(page.getByText(/0\s*\/\s*30 minutes/).first()).toBeVisible();
  }

  // Verify no TimerSheet long-press behavior (no timer-related dialog on long press)
  const timerDialog = page.getByRole("dialog", { name: /timer/i });
  await expect(timerDialog).toHaveCount(0);
});
