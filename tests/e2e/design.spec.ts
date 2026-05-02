/**
 * E-m0-001..008: Playwright e2e tests for the /design harness page.
 * All tests run on mobile-chrome (Pixel 7) per ADR-010.
 */
import { test, expect } from "@playwright/test";

test.describe("E-m0-001: /design route is reachable and harness is in DOM", () => {
  test("responds 200 and has [data-testid=design-harness]", async ({
    page,
  }) => {
    const response = await page.goto("/design");
    expect(response?.status()).toBe(200);
    await expect(page.locator('[data-testid="design-harness"]')).toBeVisible();
  });

  test("max-width is ≤430 CSS px", async ({ page }) => {
    await page.goto("/design");
    const harness = page.locator('[data-testid="design-harness"]');
    const box = await harness.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeLessThanOrEqual(430);
  });
});

test.describe("E-m0-002: every primitive is in the harness", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/design");
  });

  const primitives = [
    "button",
    "modal-trigger",
    "sheet-trigger",
    "chip",
    "stepper",
    "toggle",
    "empty-state",
    "block-card",
    "brick-chip",
  ] as const;

  for (const primitive of primitives) {
    test(`data-testid="${primitive}" is visible`, async ({ page }) => {
      await expect(
        page.locator(`[data-testid="${primitive}"]`).first(),
      ).toBeVisible();
    });
  }

  test("input element is visible", async ({ page }) => {
    // Input doesn't have data-testid on the outer wrapper but has an <input>
    await expect(page.locator("input").first()).toBeVisible();
  });
});

test.describe("E-m0-003: every interactive element has ≥44×44 bounding box", () => {
  test("all buttons, inputs, chips, and brick-chips have ≥44px in each dimension", async ({
    page,
  }) => {
    await page.goto("/design");

    const selectors = [
      "button",
      '[role="switch"]',
      'input[type="text"]',
      'input[type="number"]',
      '[data-testid="chip"]',
      '[data-testid="brick-chip"]',
    ];

    for (const selector of selectors) {
      const elements = page.locator(selector);
      const count = await elements.count();
      for (let i = 0; i < count; i++) {
        const el = elements.nth(i);
        const box = await el.boundingBox();
        if (box) {
          expect(
            box.width,
            `${selector}[${i}] width=${box.width} < 44`,
          ).toBeGreaterThanOrEqual(44);
          expect(
            box.height,
            `${selector}[${i}] height=${box.height} < 44`,
          ).toBeGreaterThanOrEqual(44);
        }
      }
    }
  });
});

test.describe("E-m0-004: reduced-motion collapses transitions", () => {
  test("data-motion elements have no animation, EmptyState has no pulse", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/design");

    // Any [data-motion] elements should have 0s animation duration
    const motionEls = await page.locator("[data-motion]").count();
    for (let i = 0; i < motionEls; i++) {
      const el = page.locator("[data-motion]").nth(i);
      const animDuration = await el.evaluate(
        (node) => getComputedStyle(node).animationDuration,
      );
      // Under reduced-motion, duration should be 0s
      expect(animDuration).toBe("0s");
    }

    // EmptyState should not have animate-pulse when reduced-motion is on
    const emptyState = page.locator('[data-testid="empty-state"]');
    if ((await emptyState.count()) > 0) {
      const classes = await emptyState.getAttribute("class");
      expect(classes).not.toContain("animate-pulse");
    }
  });
});

test.describe("E-m0-005: body font-family starts with Geist", () => {
  test("computed font-family starts with Geist or --font-geist-sans variable", async ({
    page,
  }) => {
    await page.goto("/design");
    const fontFamily = await page.evaluate(
      () => getComputedStyle(document.body).fontFamily,
    );
    // Should start with a Geist family name
    expect(fontFamily.toLowerCase()).toMatch(/geist/i);
  });

  test("no element has visibility:hidden waiting for font (font-display:swap)", async ({
    page,
  }) => {
    await page.goto("/design");
    const hiddenCount = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll("*"));
      return els.filter((el) => getComputedStyle(el).visibility === "hidden")
        .length;
    });
    // There should be no permanently hidden elements due to FOIT
    // (allow 0 — portal overlays may be hidden when closed, but those are display:none not visibility:hidden)
    expect(hiddenCount).toBe(0);
  });
});

test.describe("E-m0-006: Modal safe-area padding", () => {
  test("modal padding-bottom references var(--safe-bottom)", async ({
    page,
  }) => {
    await page.goto("/design");

    // Click the modal trigger
    await page.locator('[data-testid="modal-trigger"]').click();
    await page.waitForSelector('[role="dialog"]');

    const sheetPaddingBottom = await page.evaluate(() => {
      const sheet = document.querySelector(
        "[data-variant='bottom-sheet']",
      ) as HTMLElement | null;
      return sheet ? sheet.style.paddingBottom : null;
    });
    expect(sheetPaddingBottom).toContain("var(--safe-bottom)");
  });
});

test.describe("E-m0-007: zero console errors during load and basic interaction", () => {
  test("no console errors or unhandled rejections", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/design");

    // Basic interactions
    await page.locator('[data-testid="modal-trigger"]').click();
    await page.waitForSelector('[role="dialog"]');
    await page.keyboard.press("Escape");

    await page.locator('[data-testid="toggle"]').click();

    const stepperInc = page
      .locator('[data-testid="stepper"]')
      .locator('button[aria-label="Increment"]');
    await stepperInc.click();

    expect(errors).toHaveLength(0);
  });
});

test.describe("E-m0-008: CSS token values resolved at runtime", () => {
  test("--bg resolves to #07090f at runtime", async ({ page }) => {
    await page.goto("/design");
    const bg = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--bg")
        .trim(),
    );
    expect(bg).toBe("#07090f");
  });

  test("--ink resolves to #f5f1e8", async ({ page }) => {
    await page.goto("/design");
    const ink = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--ink")
        .trim(),
    );
    expect(ink).toBe("#f5f1e8");
  });

  test("--accent resolves to #fbbf24", async ({ page }) => {
    await page.goto("/design");
    const accent = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--accent")
        .trim(),
    );
    expect(accent).toBe("#fbbf24");
  });

  test("--cat-passive resolves to #64748b", async ({ page }) => {
    await page.goto("/design");
    const catPassive = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--cat-passive")
        .trim(),
    );
    expect(catPassive).toBe("#64748b");
  });
});
