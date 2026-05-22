/**
 * A-m0-001..005: Accessibility tests for the /design harness page.
 * Uses @axe-core/playwright for WCAG checks.
 */
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("A-m0-001: zero serious/critical violations on /design", () => {
  test("axe finds no serious or critical violations", async ({ page }) => {
    await page.goto("/design");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const seriousOrCritical = results.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    );
    expect(
      seriousOrCritical,
      `Violations: ${JSON.stringify(
        seriousOrCritical.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.length,
        })),
        null,
        2,
      )}`,
    ).toHaveLength(0);
  });
});

test.describe("A-m0-002: color-contrast rule passes for --ink and --ink-dim on --bg", () => {
  test("axe color-contrast rule finds no violations", async ({ page }) => {
    await page.goto("/design");
    const results = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();
    expect(
      results.violations,
      `Contrast violations: ${JSON.stringify(
        results.violations.map((v) => ({ id: v.id, nodes: v.nodes.length })),
        null,
        2,
      )}`,
    ).toHaveLength(0);
  });
});

test.describe("A-m0-003: all interactive elements have accessible names", () => {
  test("every button, [role=button], and [role=switch] has non-empty accessible name", async ({
    page,
  }) => {
    await page.goto("/design");

    const interactives = await page
      .locator('button, [role="button"], [role="switch"]')
      .all();

    for (const el of interactives) {
      const name =
        (await el.getAttribute("aria-label")) ??
        (await el.getAttribute("aria-labelledby")) ??
        (await el.textContent());
      const trimmedName = name?.trim() ?? "";
      expect(
        trimmedName.length,
        `Interactive element has no accessible name: ${await el.evaluate((n) => n.outerHTML.slice(0, 200))}`,
      ).toBeGreaterThan(0);
    }
  });
});

test.describe("A-m0-004: tab order traverses all interactive primitives with focus ring", () => {
  test("all focusable elements are reachable via Tab and show visible focus ring", async ({
    page,
  }) => {
    await page.goto("/design");

    // Click somewhere neutral first
    await page.click("body");

    // Tab through all focusable elements
    const maxTabs = 40;
    const focused: string[] = [];

    for (let i = 0; i < maxTabs; i++) {
      await page.keyboard.press("Tab");
      const focusedEl = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const style = getComputedStyle(el);
        return {
          tag: el.tagName,
          outlineStyle: style.outlineStyle,
          boxShadow: style.boxShadow,
          label:
            el.getAttribute("aria-label") ??
            el.textContent?.trim().slice(0, 40) ??
            "",
        };
      });

      if (!focusedEl) break;
      focused.push(focusedEl.label);

      // Focus ring: outline is not "none" OR box-shadow has a token
      const hasFocusRing =
        focusedEl.outlineStyle !== "none" || focusedEl.boxShadow !== "none";

      expect(
        hasFocusRing,
        `Element "${focusedEl.label}" (${focusedEl.tag}) has no visible focus ring. outline=${focusedEl.outlineStyle} shadow=${focusedEl.boxShadow}`,
      ).toBe(true);
    }

    // Should have tabbed through at least some elements
    expect(focused.length).toBeGreaterThan(3);
  });
});

test.describe("A-m0-005: open Modal introduces no new a11y violations", () => {
  test("axe finds no violations with modal open", async ({ page }) => {
    await page.goto("/design");

    // Open the modal
    await page.locator('[data-testid="modal-trigger"]').click();
    await page.waitForSelector('[role="dialog"]');

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const seriousOrCritical = results.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    );
    expect(
      seriousOrCritical,
      `Violations with modal open: ${JSON.stringify(
        seriousOrCritical.map((v) => ({ id: v.id, impact: v.impact })),
        null,
        2,
      )}`,
    ).toHaveLength(0);

    // Verify dialog semantics
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");
  });
});
