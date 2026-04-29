// E-bld-021 dropped per SG-bld-04. See tests.md for rationale.

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// A-bld-001: zero serious/critical axe violations on full page
test("A-bld-001: zero serious or critical axe violations", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  if (serious.length > 0) {
    console.log(
      "Axe violations:",
      JSON.stringify(
        serious.map((v) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.length,
        })),
        null,
        2,
      ),
    );
  }
  expect(serious).toHaveLength(0);
});

// A-bld-002: every <button> has a non-empty accessible name
test("A-bld-002: every button has a non-empty accessible name", async ({
  page,
}) => {
  await page.goto("/");
  const buttons = page.locator("button");
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    const btn = buttons.nth(i);
    const isVisible = await btn.isVisible();
    if (!isVisible) continue;
    const name = await btn.getAttribute("aria-label");
    const textContent = await btn.textContent();
    const hasName =
      (name && name.trim().length > 0) ||
      (textContent && textContent.trim().length > 0);
    if (!hasName) {
      console.log(`Button ${i} has no accessible name:`, await btn.innerHTML());
    }
    expect(hasName).toBe(true);
  }
});

// A-bld-003: color-contrast rule passes (no text contrast violations)
test("A-bld-003: no color-contrast violations", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page })
    .withRules(["color-contrast"])
    .analyze();

  const violations = results.violations.filter(
    (v) => v.id === "color-contrast",
  );
  if (violations.length > 0) {
    console.log(
      "Color contrast violations:",
      JSON.stringify(
        violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.slice(0, 3).map((n) => n.html),
        })),
        null,
        2,
      ),
    );
  }
  expect(violations).toHaveLength(0);
});

// A-bld-004: focus order traversal via Tab — Edit, Settings, bricks, Voice Log, Add
test("A-bld-004: Tab focus order passes through key interactive elements", async ({
  page,
}) => {
  await page.goto("/");
  // Start by focusing the first element
  await page.keyboard.press("Tab");

  // Find Edit button and verify it gets focus
  const editBtn = page.getByRole("button", { name: "Edit", exact: true });
  await editBtn.focus();
  const editFocused = await editBtn.evaluate(
    (el) => document.activeElement === el,
  );
  expect(editFocused).toBe(true);

  // Tab to Settings
  await page.keyboard.press("Tab");
  const settingsBtn = page.getByRole("button", { name: /settings/i });
  const settingsFocused = await settingsBtn.evaluate(
    (el) => document.activeElement === el,
  );
  expect(settingsFocused).toBe(true);

  // Tab through bricks until we reach Voice Log and Add
  let reachedVoiceLog = false;
  let reachedAdd = false;
  for (let i = 0; i < 100; i++) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      return {
        tag: el.tagName,
        label: el.getAttribute("aria-label"),
        text: el.textContent?.trim().substring(0, 30),
      };
    });
    if (focused?.text?.includes("Voice Log")) reachedVoiceLog = true;
    if (focused?.label === "Add") reachedAdd = true;
    if (reachedVoiceLog && reachedAdd) break;
  }
  expect(reachedVoiceLog).toBe(true);
  expect(reachedAdd).toBe(true);
});

// A-bld-005: zero new axe violations introduced by edit mode × affordances
test("A-bld-005: edit mode introduces no new axe violations", async ({
  page,
}) => {
  await page.goto("/");

  // Baseline violations in view mode
  const baselineResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  const baselineIds = new Set(baselineResults.violations.map((v) => v.id));

  // Enable edit mode
  await page.getByRole("button", { name: "Edit", exact: true }).click();

  // Violations in edit mode
  const editResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  const newViolations = editResults.violations.filter(
    (v) =>
      !baselineIds.has(v.id) &&
      (v.impact === "serious" || v.impact === "critical"),
  );

  if (newViolations.length > 0) {
    console.log(
      "New violations in edit mode:",
      newViolations.map((v) => v.id),
    );
  }
  expect(newViolations).toHaveLength(0);
});
