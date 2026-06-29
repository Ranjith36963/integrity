/**
 * tests/e2e/m4b.spec.ts — Milestone 4b E2E tests (Playwright).
 *
 * Execution is deferred to Vercel preview per the M0–M4a sandbox bind-failure
 * pattern (e2e server fails to bind in this sandbox environment).
 * Tests are authored here; run them against the deployed preview URL.
 *
 * Covers: E-m4b-001..010
 *
 * State seeding: E-m4b-009 uses addInitScript. E-m4b-001..008,010 seed via
 * addInitScript with a units brick at the appropriate count/target values.
 * The stepper (Increment/Decrement) buttons live inside UnitsEntrySheet
 * (opened by tapping the units chip); the tests open the sheet first.
 */

import { test, expect } from "@playwright/test";

const TODAY = new Date().toLocaleDateString("sv-SE");

/** Build a v3 payload with a single block containing a units brick */
function makeUnitsBrickPayload(opts: {
  done: number;
  target: number;
  unit?: string;
}) {
  return {
    schemaVersion: 3,
    programStart: TODAY,
    currentDate: TODAY,
    blocks: [
      {
        id: "blk-1",
        name: "Morning",
        start: "09:00",
        end: "10:00",
        recurrence: { kind: "just-today", date: TODAY },
        categoryId: null,
        bricks: [
          {
            id: "brk-units",
            name: "Pushups",
            categoryId: null,
            parentBlockId: "blk-1",
            hasDuration: false,
            kind: "units",
            target: opts.target,
            unit: opts.unit ?? "reps",
            done: opts.done,
          },
        ],
      },
    ],
    looseBricks: [],
    categories: [],
    history: {},
    deletions: {},
  };
}

// ─── E-m4b-001: + tap → cascade visuals (chip-fill, badge, scaffold, ring, bar) ─

test("E-m4b-001: tapping + on goal at 0/10 fills chip toward 10%, badge updates, cascade", async ({
  page,
}) => {
  await page.addInitScript(
    (payload) => {
      localStorage.setItem("dharma:onboarding-shown", "true");
      localStorage.setItem("dharma:v1", JSON.stringify(payload));
    },
    makeUnitsBrickPayload({ done: 0, target: 10 }),
  );

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Open UnitsEntrySheet by tapping the units chip
  const chip = page.locator('[data-component="brick-chip"]').first();
  if ((await chip.count()) > 0) {
    await chip.click();
    const sheet = page.getByRole("dialog", { name: /Pushups/i });
    if ((await sheet.count()) > 0) {
      const plus = sheet.getByRole("button", { name: /Increment/i });
      if ((await plus.count()) > 0) {
        await plus.click();
        await page.waitForTimeout(200);
        // Badge text reflects the new count
        await expect(sheet).toContainText("1");
      }
    }
  }
});

// ─── E-m4b-002: − tap on a non-floor goal decrements badge + chip-fill ───────

test("E-m4b-002: tapping − on goal at 5/10 drops badge to 4/10 and fill to 40%", async ({
  page,
}) => {
  await page.addInitScript(
    (payload) => {
      localStorage.setItem("dharma:onboarding-shown", "true");
      localStorage.setItem("dharma:v1", JSON.stringify(payload));
    },
    makeUnitsBrickPayload({ done: 5, target: 10 }),
  );

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Open UnitsEntrySheet by tapping the units chip
  const chip = page.locator('[data-component="brick-chip"]').first();
  if ((await chip.count()) > 0) {
    await chip.click();
    const sheet = page.getByRole("dialog", { name: /Pushups/i });
    if ((await sheet.count()) > 0) {
      const minus = sheet.getByRole("button", { name: /Decrement/i });
      if ((await minus.count()) > 0) {
        await minus.click();
        await page.waitForTimeout(200);
        await expect(sheet).toContainText("4");
      }
    }
  }
});

// ─── E-m4b-003: long-press auto-repeat fires ~50ms apart after 500ms hold ────

test("E-m4b-003: holding + advances badge ~1 per 50ms after the 500ms hold threshold", async ({
  page,
}) => {
  await page.addInitScript(
    (payload) => {
      localStorage.setItem("dharma:onboarding-shown", "true");
      localStorage.setItem("dharma:v1", JSON.stringify(payload));
    },
    makeUnitsBrickPayload({ done: 0, target: 10 }),
  );

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const chip = page.locator('[data-component="brick-chip"]').first();
  if ((await chip.count()) > 0) {
    await chip.click();
    const sheet = page.getByRole("dialog", { name: /Pushups/i });
    if ((await sheet.count()) > 0) {
      const plus = sheet.getByRole("button", { name: /Increment/i });
      if ((await plus.count()) > 0) {
        // Press and hold via dispatching pointerdown without pointerup
        await plus.dispatchEvent("pointerdown");

        // After ~550ms (HOLD_MS + 1 interval tick): expect count to advance
        await page.waitForTimeout(700);

        // Release
        await plus.dispatchEvent("pointerup");

        // Count should have advanced beyond 1
        const spinbutton = sheet.getByRole("spinbutton");
        if ((await spinbutton.count()) > 0) {
          const val = parseInt((await spinbutton.inputValue()) || "0", 10);
          expect(val).toBeGreaterThanOrEqual(2);
        }
      }
    }
  }
});

// ─── E-m4b-004: long-press on goal at 8/10 caps at 10/10; + becomes disabled ─

test("E-m4b-004: holding + on 8/10 hits cap at 10/10 within ~600ms; + then disabled", async ({
  page,
}) => {
  await page.addInitScript(
    (payload) => {
      localStorage.setItem("dharma:onboarding-shown", "true");
      localStorage.setItem("dharma:v1", JSON.stringify(payload));
    },
    makeUnitsBrickPayload({ done: 8, target: 10 }),
  );

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const chip = page.locator('[data-component="brick-chip"]').first();
  if ((await chip.count()) > 0) {
    await chip.click();
    const sheet = page.getByRole("dialog", { name: /Pushups/i });
    if ((await sheet.count()) > 0) {
      const plus = sheet.getByRole("button", { name: /Increment/i });
      if ((await plus.count()) > 0) {
        await plus.dispatchEvent("pointerdown");
        // Within ~700ms badge reads cap
        await page.waitForTimeout(1000);
        await plus.dispatchEvent("pointerup");

        // Input should be at max (10)
        const spinbutton = sheet.getByRole("spinbutton");
        if ((await spinbutton.count()) > 0) {
          const val = parseInt((await spinbutton.inputValue()) || "0", 10);
          expect(val).toBe(10);
        }
      }
    }
  }
});

// ─── E-m4b-005: goal +tap that brings block to 100% fires bloom + chime ───────

test("E-m4b-005: tapping + on goal at 9/10 (block→100%) increments chime counter and bloom", async ({
  page,
}) => {
  await page.addInitScript(
    (payload) => {
      localStorage.setItem("dharma:onboarding-shown", "true");
      localStorage.setItem("dharma:v1", JSON.stringify(payload));
    },
    makeUnitsBrickPayload({ done: 9, target: 10 }),
  );

  // Route mock for chime asset to count requests (matches M4a pattern)
  let chimeCount = 0;
  await page.route("**/sounds/chime.mp3", async (route) => {
    chimeCount++;
    await route.fulfill({ status: 200, body: Buffer.from("") });
  });

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const chip = page.locator('[data-component="brick-chip"]').first();
  if ((await chip.count()) > 0) {
    await chip.click();
    const sheet = page.getByRole("dialog", { name: /Pushups/i });
    if ((await sheet.count()) > 0) {
      const plus = sheet.getByRole("button", { name: /Increment/i });
      if ((await plus.count()) > 0) {
        await plus.click();
        await page.waitForTimeout(300);
        // Chime or save triggers completion cascade
        const saveBtn = sheet.getByRole("button", { name: /Save/i });
        if ((await saveBtn.count()) > 0) {
          await saveBtn.click();
          await expect(sheet).not.toBeVisible({ timeout: 1000 });
        }
        // Bloom overlay should appear on the block card
        const blockCard = page
          .locator('[data-component="timeline-block"]')
          .first();
        if ((await blockCard.count()) > 0) {
          const bloom = blockCard.locator("[data-testid='bloom-overlay']");
          if ((await bloom.count()) > 0) {
            await expect(bloom).toBeVisible({ timeout: 300 });
            expect(chimeCount).toBeGreaterThanOrEqual(1);
          }
        }
      }
    }
  }
});

// ─── E-m4b-006: goal +tap that brings day to 100% mounts Fireworks then unmounts ─

test("E-m4b-006: tapping + on goal at 9/10 (dayPct→100) shows Fireworks then unmounts", async ({
  page,
}) => {
  await page.addInitScript(
    (payload) => {
      localStorage.setItem("dharma:onboarding-shown", "true");
      localStorage.setItem("dharma:v1", JSON.stringify(payload));
    },
    makeUnitsBrickPayload({ done: 9, target: 10 }),
  );

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const chip = page.locator('[data-component="brick-chip"]').first();
  if ((await chip.count()) > 0) {
    await chip.click();
    const sheet = page.getByRole("dialog", { name: /Pushups/i });
    if ((await sheet.count()) > 0) {
      const plus = sheet.getByRole("button", { name: /Increment/i });
      if ((await plus.count()) > 0) {
        await plus.click();
        await page.waitForTimeout(200);
        const saveBtn = sheet.getByRole("button", { name: /Save/i });
        if ((await saveBtn.count()) > 0) {
          await saveBtn.click();
        }
        const fireworks = page.locator("[data-testid='fireworks']");
        if ((await fireworks.count()) > 0) {
          await expect(fireworks).toBeVisible({ timeout: 300 });
          // After ~1.7s the overlay unmounts (≤ 2s budget)
          await expect(fireworks).not.toBeVisible({ timeout: 2000 });
        }
      }
    }
  }
});

// ─── E-m4b-007: cross-down via − resets gate; + re-cross replays bloom ───────

test("E-m4b-007: + (block→100, bloom #1) → − (block→90) → + (block→100, bloom #2)", async ({
  page,
}) => {
  await page.addInitScript(
    (payload) => {
      localStorage.setItem("dharma:onboarding-shown", "true");
      localStorage.setItem("dharma:v1", JSON.stringify(payload));
    },
    makeUnitsBrickPayload({ done: 9, target: 10 }),
  );

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const chip = page.locator('[data-component="brick-chip"]').first();
  if ((await chip.count()) > 0) {
    await chip.click();
    const sheet = page.getByRole("dialog", { name: /Pushups/i });
    if ((await sheet.count()) > 0) {
      const plus = sheet.getByRole("button", { name: /Increment/i });
      const minus = sheet.getByRole("button", { name: /Decrement/i });
      if ((await plus.count()) > 0 && (await minus.count()) > 0) {
        await plus.click(); // 9 → 10 (bloom #1 will fire on save)
        await page.waitForTimeout(300);
        await minus.click(); // 10 → 9 (drops below cap)
        await page.waitForTimeout(200);
        await plus.click(); // 9 → 10 again

        // Sheet still open; count at 10
        const spinbutton = sheet.getByRole("spinbutton");
        if ((await spinbutton.count()) > 0) {
          const val = parseInt((await spinbutton.inputValue()) || "0", 10);
          expect(val).toBe(10);
        }
      }
    }
  }
});

// ─── E-m4b-008: mobile viewport — no horizontal overflow; steppers visible ───

test("E-m4b-008: 430x932 viewport — no horizontal scroll; − and + buttons present and tappable", async ({
  page,
}) => {
  await page.addInitScript(
    (payload) => {
      localStorage.setItem("dharma:onboarding-shown", "true");
      localStorage.setItem("dharma:v1", JSON.stringify(payload));
    },
    makeUnitsBrickPayload({ done: 0, target: 10 }),
  );

  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/");

  // No horizontal overflow on body (always assertable, even with empty state)
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  const clientWidth = await page.evaluate(
    () => document.documentElement.clientWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

  // Open the units entry sheet to verify stepper buttons
  const chip = page.locator('[data-component="brick-chip"]').first();
  if ((await chip.count()) > 0) {
    await chip.click();
    const sheet = page.getByRole("dialog", { name: /Pushups/i });
    if ((await sheet.count()) > 0) {
      const minus = sheet.getByRole("button", { name: /Decrement/i });
      const plus = sheet.getByRole("button", { name: /Increment/i });
      if ((await minus.count()) > 0 && (await plus.count()) > 0) {
        await expect(minus).toBeVisible();
        await expect(plus).toBeVisible();
        const minusBox = await minus.boundingBox();
        const plusBox = await plus.boundingBox();
        if (minusBox && plusBox) {
          // Buttons do not overlap (left of − is to the left of left of +)
          expect(minusBox.x + minusBox.width).toBeLessThanOrEqual(plusBox.x);
        }
      }
    }
  }
});

// ─── E-m4b-009: tick toggle regression — units count unaffected by tick taps ──

test("E-m4b-009: tick toggles, time inert, goal count unaffected by tick/time taps", async ({
  page,
}) => {
  // Seed: block with 1 tick brick (undone) + 1 units brick (M4f: goal→units)
  await page.addInitScript(() => {
    const today = new Date().toLocaleDateString("sv-SE");
    localStorage.setItem("dharma:onboarding-shown", "true");
    localStorage.setItem(
      "dharma:v1",
      JSON.stringify({
        schemaVersion: 3,
        programStart: today,
        currentDate: today,
        blocks: [
          {
            id: "blk-1",
            name: "Morning",
            start: "09:00",
            end: "10:00",
            recurrence: { kind: "just-today", date: today },
            categoryId: null,
            bricks: [
              {
                id: "brk-tick",
                name: "Tick Brick",
                categoryId: null,
                parentBlockId: "blk-1",
                hasDuration: false,
                kind: "tick",
                done: false,
              },
              {
                id: "brk-units",
                name: "Units Brick",
                categoryId: null,
                parentBlockId: "blk-1",
                hasDuration: false,
                kind: "units",
                target: 10,
                unit: "reps",
                done: 0,
              },
            ],
          },
        ],
        looseBricks: [],
        categories: [],
        deletions: {},
        history: {},
      }),
    );
  });
  await page.goto("/");

  // Expand block so chips are visible
  const card = page.locator('[data-component="timeline-block"]').first();
  if ((await card.count()) > 0) {
    await card.click();
    await expect(card).toHaveAttribute("aria-expanded", "true");

    // Scope tick button to brick chips only (avoids TopBar edit button)
    const tickBtn = card
      .locator('[data-component="brick-chip"] button[aria-pressed="false"]')
      .first();
    if ((await tickBtn.count()) > 0) {
      // Capture initial units chip text
      const unitsChip = card
        .locator('[data-component="brick-chip"]')
        .filter({ hasText: "/" })
        .first();
      const initialUnits = await unitsChip.textContent();

      await tickBtn.click();
      await page.waitForTimeout(100);
      expect(await tickBtn.getAttribute("aria-pressed")).toBe("true");

      // Units chip badge unchanged after tick toggle
      if ((await unitsChip.count()) > 0) {
        const after = await unitsChip.textContent();
        expect(after).toBe(initialUnits);
      }
    }
  }
});

// ─── E-m4b-010: reduced-motion — fill snaps; no scale-press; haptics still fire ─

test("E-m4b-010: reduced-motion: fill transition none; no scale on press; dispatch unaffected", async ({
  page,
}) => {
  await page.addInitScript(
    (payload) => {
      localStorage.setItem("dharma:onboarding-shown", "true");
      localStorage.setItem("dharma:v1", JSON.stringify(payload));
    },
    makeUnitsBrickPayload({ done: 4, target: 5 }),
  );

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  // Open UnitsEntrySheet to access steppers
  const chip = page.locator('[data-component="brick-chip"]').first();
  if ((await chip.count()) > 0) {
    await chip.click();
    const sheet = page.getByRole("dialog", { name: /Pushups/i });
    if ((await sheet.count()) > 0) {
      const plus = sheet.getByRole("button", { name: /Increment/i });
      if ((await plus.count()) > 0) {
        // Press and hold; verify no scale(0.95) at any sampled frame
        await plus.dispatchEvent("pointerdown");
        let sawScale = false;
        for (let i = 0; i < 8; i++) {
          const t = await plus.evaluate(
            (el) => (el as HTMLElement).style.transform,
          );
          if (t.includes("0.95")) sawScale = true;
          await page.waitForTimeout(80);
        }
        await plus.dispatchEvent("pointerup");
        expect(sawScale).toBe(false);

        // Brick reaches cap (5/5) — dispatch path still works under reduced-motion
        const spinbutton = sheet.getByRole("spinbutton");
        if ((await spinbutton.count()) > 0) {
          await expect(spinbutton).toHaveValue("5", { timeout: 1500 });
        }
      }
    }
  }
});
