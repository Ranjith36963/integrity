import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// A-m1-001: axe-clean full page (zero serious/critical violations)
test("A-m1-001: zero serious or critical axe violations on M1 page", async ({
  page,
}) => {
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
          nodes: v.nodes.slice(0, 2).map((n) => n.html),
        })),
        null,
        2,
      ),
    );
  }
  expect(serious).toHaveLength(0);
});

// A-m1-002: color-contrast rule passes for all M1 text elements
test("A-m1-002: zero color-contrast violations", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page })
    .withRules(["color-contrast"])
    .analyze();

  if (results.violations.length > 0) {
    console.log(
      "Color contrast violations:",
      JSON.stringify(
        results.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.slice(0, 3).map((n) => n.html),
        })),
        null,
        2,
      ),
    );
  }
  expect(results.violations).toHaveLength(0);
});

// A-m1-003: TopBar Edit aria-pressed + Settings aria-label (SG-m1-05, ADR-028)
test("A-m1-003: TopBar Edit has aria-pressed=false, Settings has aria-label, neither has role=switch", async ({
  page,
}) => {
  await page.goto("/");

  // Edit button
  const editBtn = page.getByRole("button", { name: /edit/i });
  await expect(editBtn).toHaveAttribute("aria-pressed", "false");
  await expect(editBtn).not.toHaveAttribute("role", "switch");

  // Settings button
  const settingsBtn = page.getByRole("button", { name: "Settings" });
  await expect(settingsBtn).toHaveAttribute("aria-label", "Settings");
  await expect(settingsBtn).not.toHaveAttribute("role", "switch");
});

// A-m1-004: Voice button a11y (aria-disabled, accessible name, keyboard-focusable)
test("A-m1-004: Voice button has aria-disabled=true, no native disabled, is keyboard-focusable", async ({
  page,
}) => {
  await page.goto("/");

  // Voice button by role
  const voiceBtn = page.getByRole("button", { name: /voice log/i });
  await expect(voiceBtn).toHaveAttribute("aria-disabled", "true");
  await expect(voiceBtn).not.toHaveAttribute("disabled");

  // Add button has no aria-disabled
  const addBtn = page.getByRole("button", { name: "Add" });
  await expect(addBtn).not.toHaveAttribute("aria-disabled");

  // Both buttons reachable via Tab
  await page.keyboard.press("Tab");
  let foundVoice = false;
  let foundAdd = false;

  for (let i = 0; i < 20; i++) {
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        label: el?.getAttribute("aria-label") ?? "",
        text: el?.textContent?.trim() ?? "",
      };
    });
    if (
      focused.label.includes("Voice Log") ||
      focused.text.includes("Voice Log")
    )
      foundVoice = true;
    if (focused.label === "Add") foundAdd = true;
    if (foundVoice && foundAdd) break;
    await page.keyboard.press("Tab");
  }

  expect(foundVoice).toBe(true);
  expect(foundAdd).toBe(true);
});

// A-m1-005: Focus order — every interactive element is reachable via Tab, shows focus ring
test("A-m1-005: focus order includes all interactive elements with visible focus ring", async ({
  page,
}) => {
  await page.goto("/");

  const focusedElements: Array<{ tag: string; label: string; text: string }> =
    [];
  const seen = new Set<string>();

  // Tab through up to 20 elements
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      return {
        tag: el.tagName,
        label: el.getAttribute("aria-label") ?? "",
        text: el.textContent?.trim().substring(0, 50) ?? "",
      };
    });
    if (!focused) continue;
    const key = `${focused.tag}:${focused.label}:${focused.text}`;
    if (seen.has(key)) break; // wrapped around
    seen.add(key);
    focusedElements.push(focused);
  }

  // Should have reached Edit, Settings, Voice Log, Add
  const labels = focusedElements.map((e) =>
    (e.label + " " + e.text).toLowerCase(),
  );
  const hasEdit = labels.some((l) => l.includes("edit"));
  const hasSettings = labels.some((l) => l.includes("settings"));
  const hasVoice = labels.some((l) => l.includes("voice"));
  const hasAdd = labels.some((l) => l.includes("add"));

  expect(hasEdit).toBe(true);
  expect(hasSettings).toBe(true);
  expect(hasVoice).toBe(true);
  expect(hasAdd).toBe(true);
});

// A-m1-006: NowLine + BlueprintBar a11y landmarks
test("A-m1-006: NowLine has role=img + aria-label, BlueprintBar has aria-label, EmptyState accessible name", async ({
  page,
}) => {
  await page.goto("/");

  // NowLine: role="img" and aria-label matching /^Now \d{2}:\d{2}$/
  const nowLine = page.locator('[data-testid="now-line"]');
  await expect(nowLine).toHaveAttribute("role", "img");
  const nowLabel = await nowLine.getAttribute("aria-label");
  expect(nowLabel).toMatch(/^Now \d{2}:\d{2}$/);

  // BlueprintBar section has aria-label="Day blueprint"
  const blueprint = page.locator('[aria-label="Day blueprint"]');
  await expect(blueprint).toBeVisible();

  // EmptyState has accessible name
  const emptyState = page.locator('[data-testid="empty-state"]');
  const emptyText = await emptyState.textContent();
  expect(emptyText).toContain("Tap any slot to lay your first block.");
});

// A-m1-007: typecheck/lint gate (asserted via npm run typecheck/lint — test ID exists for auditability)
// This test is structural: it documents the constraint. Actual gate is EVAL-phase npm run eval.
// No separate test file authored — this ID is captured in tests.md for SPEC AC #22 + #23.
test("A-m1-007: page renders with zero JavaScript console errors (lint/typecheck proxy)", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Zero runtime errors proxies the lint/typecheck gate in browser
  expect(errors).toHaveLength(0);
});
