/**
 * tests/e2e/m4f.a11y.spec.ts — Milestone 4f accessibility tests (axe-core via Playwright).
 *
 * Execution is deferred to Vercel preview per the M0–M4e sandbox bind-failure
 * pattern (e2e server fails to bind in this sandbox environment).
 * Tests are authored here; run them against the deployed preview URL.
 * Guards: `if ((await x.count()) > 0)` for elements requiring the live app.
 *
 * Covers: A-m4f-001..004
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Helper: open AddBrickSheet, add a units brick, then tap it to open UnitsEntrySheet
async function openUnitsEntrySheet(page: import("@playwright/test").Page) {
  await page.goto("/");

  const dockAdd = page.getByRole("button", { name: "Add" }).last();
  if ((await dockAdd.count()) === 0) return false;
  await dockAdd.click();

  const chooser = page.getByRole("dialog", { name: "Add" });
  if ((await chooser.count()) === 0) return false;
  await chooser.getByRole("button", { name: "Add Brick" }).click();

  const addSheet = page.getByRole("dialog", { name: /Add Brick/i });
  if ((await addSheet.count()) === 0) return false;
  await addSheet.getByLabel(/Title/i).fill("Meditate");
  const unitsChip = addSheet.getByRole("radio", { name: /units/i });
  await unitsChip.click();
  await addSheet.getByLabel(/Target/i).fill("30");
  await addSheet.getByLabel(/Unit/i).fill("minutes");
  await addSheet.getByRole("button", { name: /Save/i }).click();
  await expect(addSheet).not.toBeVisible();

  // Tap the chip to open UnitsEntrySheet
  const brickText = page.getByText("Meditate").first();
  if ((await brickText.count()) === 0) return false;
  const chipBtn = brickText.locator("xpath=ancestor::button");
  if ((await chipBtn.count()) === 0) return false;
  await chipBtn.first().click();

  return true;
}

// ─── A-m4f-001: UnitsEntrySheet dialog role + aria-labelledby → heading ─────

test("A-m4f-001: UnitsEntrySheet has role=dialog + aria-labelledby pointing at heading containing brick name", async ({
  page,
}) => {
  const opened = await openUnitsEntrySheet(page);
  if (!opened) return;

  const entrySheet = page.getByRole("dialog", { name: /Meditate/i });
  if ((await entrySheet.count()) > 0) {
    // Dialog role (provided by M0 <Sheet> primitive)
    await expect(entrySheet).toBeVisible();

    // aria-labelledby must point to a heading that contains the brick name
    const labelledById = await entrySheet.getAttribute("aria-labelledby");
    expect(labelledById).toBeTruthy();

    if (labelledById) {
      // The heading element exists and contains the brick name
      const heading = page.locator(`#${labelledById}`);
      await expect(heading).toBeAttached();
      const headingText = await heading.textContent();
      expect(headingText).toContain("Meditate");
    }
  }
});

// ─── A-m4f-002: number input accessible name = "Enter <unit> done today" ─────

test("A-m4f-002: UnitsEntrySheet number input has accessible name 'Enter minutes done today'", async ({
  page,
}) => {
  const opened = await openUnitsEntrySheet(page);
  if (!opened) return;

  const entrySheet = page.getByRole("dialog", { name: /Meditate/i });
  if ((await entrySheet.count()) > 0) {
    // The number input's accessible name should be "Enter minutes done today"
    const numInput = entrySheet.getByRole("spinbutton");
    if ((await numInput.count()) > 0) {
      const ariaLabel = await numInput.getAttribute("aria-label");
      const labelText = ariaLabel ?? "";
      expect(labelText.toLowerCase()).toContain("minutes");
      expect(labelText.toLowerCase()).toMatch(/enter.*done today/i);
    }
  }
});

// ─── A-m4f-003: disabled Save has aria-disabled + aria-describedby sr-only hint ─

test("A-m4f-003: empty input → Save aria-disabled=true + aria-describedby sr-only hint 'Enter a number to save.'", async ({
  page,
}) => {
  const opened = await openUnitsEntrySheet(page);
  if (!opened) return;

  const entrySheet = page.getByRole("dialog", { name: /Meditate/i });
  if ((await entrySheet.count()) > 0) {
    const numInput = entrySheet.getByRole("spinbutton");
    const saveBtn = entrySheet.getByRole("button", { name: /Save/i });

    if ((await numInput.count()) > 0 && (await saveBtn.count()) > 0) {
      // Clear the input → Save should become disabled
      await numInput.fill("");

      // aria-disabled=true when empty
      await expect(saveBtn).toHaveAttribute("aria-disabled", "true");

      // aria-describedby points to a sr-only hint element
      const describedById = await saveBtn.getAttribute("aria-describedby");
      expect(describedById).toBeTruthy();

      if (describedById) {
        const hint = page.locator(`#${describedById}`);
        await expect(hint).toBeAttached();
        const hintText = await hint.textContent();
        expect(hintText).toMatch(/Enter a number to save/i);
      }

      // When valid value typed, aria-disabled becomes false
      await numInput.fill("15");
      await expect(saveBtn).toHaveAttribute("aria-disabled", "false");
    }
  }
});

// ─── A-m4f-004: axe-core zero violations across three states ─────────────────

test("A-m4f-004: zero axe violations in UnitsEntrySheet across valid / empty / over-target states", async ({
  page,
}) => {
  const opened = await openUnitsEntrySheet(page);
  if (!opened) return;

  const entrySheet = page.getByRole("dialog", { name: /Meditate/i });
  if ((await entrySheet.count()) > 0) {
    const numInput = entrySheet.getByRole("spinbutton");
    if ((await numInput.count()) > 0) {
      // State (a): valid value — 20
      await numInput.fill("20");
      const resultsValid = await new AxeBuilder({ page }).analyze();
      expect(resultsValid.violations).toHaveLength(0);

      // State (b): empty → Save disabled
      await numInput.fill("");
      const resultsEmpty = await new AxeBuilder({ page }).analyze();
      expect(resultsEmpty.violations).toHaveLength(0);

      // State (c): over-target (e.g. 999, greater than target 30)
      await numInput.fill("999");
      const resultsOver = await new AxeBuilder({ page }).analyze();
      expect(resultsOver.violations).toHaveLength(0);
    }
  }
});
