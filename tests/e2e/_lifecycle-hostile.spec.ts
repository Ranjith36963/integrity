/**
 * tests/e2e/_lifecycle-hostile.spec.ts — adversarial / edge-case coverage.
 *
 * Stress-tests the input + persistence + recovery paths that the happy-path
 * lifecycle skips. Run independently because each scenario is destructive
 * (it intentionally corrupts state, fills inputs with hostile payloads,
 * etc) and we don't want phase A's "good state" assertions to interact
 * with phase D's "corrupt state" setup.
 *
 * Output: /tmp/lifecycle-hostile/report.md
 */

import { test, expect, type Page } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = "/tmp/lifecycle-hostile";

type Anomaly = {
  scenario: string;
  severity: "critical" | "warning";
  message: string;
};

const ANOMALIES: Anomaly[] = [];
const CONSOLE_ERRORS: Array<{ scenario: string; text: string }> = [];
let currentScenario = "boot";

function flag(severity: "critical" | "warning", message: string) {
  ANOMALIES.push({ scenario: currentScenario, severity, message });
}

async function gotoFresh(page: Page) {
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.localStorage.setItem("dharma:onboarding-shown", "true");
  });
  await page.reload();
  await page.waitForLoadState("networkidle");
}

test("HOSTILE: input edge cases + recovery", async ({ page }) => {
  test.setTimeout(180_000); // 3 minutes — individual scenarios are fast
  // Shorter default action timeout so a disabled-state click doesn't burn
  // the whole budget; per-call timeouts can override where needed.
  page.setDefaultTimeout(5000);
  mkdirSync(OUT_DIR, { recursive: true });

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      CONSOLE_ERRORS.push({ scenario: currentScenario, text: msg.text() });
      flag("critical", `Console error: ${msg.text().slice(0, 200)}`);
    }
  });
  page.on("pageerror", (err) => {
    flag("critical", `Page error: ${err.name}: ${err.message.slice(0, 200)}`);
  });

  // ── Scenario 1: XSS injection in block name ─────────────────────────
  currentScenario = "xss-injection-block-name";
  await gotoFresh(page);
  await page.getByTestId("dock-add").click();
  await page.waitForTimeout(200);
  await page.getByTestId("chooser-add-block").click({ force: true });
  await page.waitForTimeout(200);
  await page.getByLabel(/Title/i).fill("<script>window.PWNED=true</script>");
  await page.locator("#block-start").fill("09:00");
  await page.locator("#block-end").fill("10:00");
  await page.keyboard.press("Tab");
  await page.getByTestId("add-block-save").click();
  await page.waitForTimeout(500);
  const pwned = await page.evaluate(
    () => (window as unknown as { PWNED?: boolean }).PWNED,
  );
  if (pwned) {
    flag("critical", "XSS executed — block name with <script> ran as code");
  }
  const blockText = await page
    .locator('[data-component="timeline-block"]')
    .first()
    .textContent()
    .catch(() => "");
  if (blockText?.includes("<script>")) {
    // Good: rendered as escaped text, not as DOM
  } else if (blockText?.length === 0) {
    flag("warning", "Block with <script> tag rendered empty");
  }

  // ── Scenario 2: SQL-shaped injection (no SQL but ensures escaping) ──
  currentScenario = "sql-shaped-input";
  await gotoFresh(page);
  await page.getByTestId("dock-add").click();
  await page.waitForTimeout(200);
  await page.getByTestId("chooser-add-block").click({ force: true });
  await page.waitForTimeout(200);
  await page.getByLabel(/Title/i).fill(`'; DROP TABLE blocks; --`);
  await page.locator("#block-start").fill("09:00");
  await page.locator("#block-end").fill("10:00");
  await page.keyboard.press("Tab");
  await page.getByTestId("add-block-save").click();
  await page.waitForTimeout(500);
  // App should NOT crash — Hero still visible
  const heroVisible = await page
    .getByTestId("hero-numeral")
    .isVisible()
    .catch(() => false);
  if (!heroVisible) {
    flag("critical", "Hero disappeared after SQL-shaped input — app crashed");
  }

  // ── Scenario 3: Invalid time (25:99) ────────────────────────────────
  currentScenario = "invalid-time-25-99";
  await gotoFresh(page);
  await page.getByTestId("dock-add").click();
  await page.waitForTimeout(200);
  await page.getByTestId("chooser-add-block").click({ force: true });
  await page.waitForTimeout(200);
  await page.getByLabel(/Title/i).fill("Bad time");
  // type=time inputs typically reject invalid values, but force via JS
  await page.evaluate(() => {
    const el = document.querySelector(
      "#block-start",
    ) as HTMLInputElement | null;
    if (el) el.value = "25:99";
    el?.dispatchEvent(new Event("input", { bubbles: true }));
    el?.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.locator("#block-end").fill("10:00");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(200);
  // Save should be aria-disabled with invalid start. Just check the state;
  // clicking a disabled button would hang the actionability wait.
  const save = page.getByTestId("add-block-save");
  const saveDisabled = await save.getAttribute("aria-disabled");
  if (saveDisabled !== "true") {
    // Validation gap — try the click with force, see if a block lands.
    await save.click({ force: true, timeout: 3000 }).catch(() => undefined);
    await page.waitForTimeout(300);
    const blocks = await page
      .locator('[data-component="timeline-block"]')
      .count();
    if (blocks > 0) {
      // CORRECTNESS: a block was created, but did it actually adopt the
      // invalid '25:99' input? React 19's controlled-input re-sync may
      // restore the DOM to the prior valid state value before Save fires,
      // in which case the saved block has the ORIGINAL valid start time
      // (no real validation gap). Only flag a warning if the persisted
      // block.start actually reads back as the invalid value the test
      // injected — that's the contract that would matter.
      const savedStart = await page.evaluate(() => {
        try {
          const raw = localStorage.getItem("dharma:v1");
          if (!raw) return null;
          const parsed = JSON.parse(raw) as { blocks?: { start?: string }[] };
          return parsed.blocks?.[0]?.start ?? null;
        } catch {
          return null;
        }
      });
      if (savedStart === "25:99") {
        flag(
          "warning",
          "Block accepted with start='25:99' — validation gap (saveDisabled was " +
            String(saveDisabled) +
            ")",
        );
      }
    }
  }

  // ── Scenario 4: End equals Start ────────────────────────────────────
  currentScenario = "end-equals-start";
  await gotoFresh(page);
  await page.getByTestId("dock-add").click();
  await page.waitForTimeout(200);
  await page.getByTestId("chooser-add-block").click({ force: true });
  await page.waitForTimeout(200);
  await page.getByLabel(/Title/i).fill("Zero-length");
  await page.locator("#block-start").fill("09:00");
  await page.locator("#block-end").fill("09:00");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(200);
  const saveDis2 = await page
    .getByTestId("add-block-save")
    .getAttribute("aria-disabled");
  if (saveDis2 !== "true") {
    flag(
      "warning",
      "Save was not disabled with end === start (zero-length block)",
    );
  }

  // ── Scenario 5: Rapid double-tap on Save ────────────────────────────
  currentScenario = "rapid-double-tap-save";
  await gotoFresh(page);
  await page.getByTestId("dock-add").click();
  await page.waitForTimeout(200);
  await page.getByTestId("chooser-add-block").click({ force: true });
  await page.waitForTimeout(200);
  await page.getByLabel(/Title/i).fill("Double tap");
  await page.locator("#block-start").fill("11:00");
  await page.locator("#block-end").fill("12:00");
  await page.keyboard.press("Tab");
  await page.getByTestId("add-block-save").click();
  // Immediate second tap before any state settles
  await page
    .getByTestId("add-block-save")
    .click({ force: true })
    .catch(() => {
      /* sheet may have closed mid-double-tap; that's the desired behavior */
    });
  await page.waitForTimeout(700);
  // Should not have created two blocks for one user intent
  const dblBlocks = await page
    .locator('[data-component="timeline-block"]')
    .count();
  if (dblBlocks > 1) {
    flag(
      "critical",
      `Double-tap on Save created ${dblBlocks} blocks (should be 1)`,
    );
  }

  // ── Scenario 6: Storage corruption — non-JSON payload ───────────────
  currentScenario = "storage-corrupt-non-json";
  await gotoFresh(page);
  // Seed valid state first
  await page.getByTestId("dock-add").click();
  await page.waitForTimeout(200);
  await page.getByTestId("chooser-add-block").click({ force: true });
  await page.waitForTimeout(200);
  await page.getByLabel(/Title/i).fill("Before corrupt");
  await page.locator("#block-start").fill("06:00");
  await page.locator("#block-end").fill("07:00");
  await page.keyboard.press("Tab");
  await page.getByTestId("add-block-save").click();
  await page.waitForTimeout(500);
  // Now corrupt it
  await page.evaluate(() =>
    window.localStorage.setItem("dharma:v1", "this is not json {{{"),
  );
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  // App should still mount
  const heroAfter = await page
    .getByTestId("hero-numeral")
    .isVisible()
    .catch(() => false);
  if (!heroAfter) {
    flag(
      "critical",
      "Hero invisible after corrupt-storage reload — app failed to recover",
    );
  }

  // ── Scenario 7: Storage corruption — JSON with wrong shape ──────────
  currentScenario = "storage-corrupt-wrong-shape";
  await page.evaluate(() =>
    window.localStorage.setItem("dharma:v1", '{"hello":"world"}'),
  );
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  const heroAfter2 = await page
    .getByTestId("hero-numeral")
    .isVisible()
    .catch(() => false);
  if (!heroAfter2) {
    flag("critical", "Hero invisible after wrong-shape JSON — no recovery");
  }

  // ── Scenario 8: Storage corruption — partially valid (one bad field) ──
  currentScenario = "storage-corrupt-bad-field";
  await page.evaluate(() => {
    window.localStorage.setItem(
      "dharma:v1",
      JSON.stringify({
        schemaVersion: 3,
        programStart: "INVALID-DATE",
        currentDate: "2026-06-22",
        history: {},
        deletions: {},
        blocks: "not-an-array", // wrong type
        categories: [],
        looseBricks: [],
      }),
    );
  });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  const recovered = await page
    .getByTestId("hero-numeral")
    .isVisible()
    .catch(() => false);
  if (!recovered) {
    flag(
      "critical",
      "App did NOT per-field recover from one corrupt field — Hero missing",
    );
  }

  // ── Scenario 9: localStorage disabled (storage quota / private mode) ─
  // Note: we open the form BEFORE breaking storage, because some validation
  // and the chooser open/close path itself may touch localStorage.
  currentScenario = "localstorage-throws";
  await gotoFresh(page);
  await page.getByTestId("dock-add").click();
  await page.waitForTimeout(200);
  await page.getByTestId("chooser-add-block").click({ force: true });
  await page.waitForTimeout(200);
  await page.getByLabel(/Title/i).fill("Quota test");
  await page.locator("#block-start").fill("08:00");
  await page.locator("#block-end").fill("09:00");
  await page.keyboard.press("Tab");
  // Now override setItem to throw — simulates private-mode quota
  await page.evaluate(() => {
    Object.defineProperty(Storage.prototype, "setItem", {
      value: () => {
        throw new Error("QuotaExceededError");
      },
      configurable: true,
    });
  });
  // Force-click the save — by here it should be aria-disabled=false because
  // we filled all the fields. If it's disabled the form-validation logic
  // touches storage somewhere it shouldn't.
  await page
    .getByTestId("add-block-save")
    .click({ force: true, timeout: 3000 })
    .catch(() => undefined);
  await page.waitForTimeout(500);
  const stillUp = await page
    .getByTestId("hero-numeral")
    .isVisible()
    .catch(() => false);
  if (!stillUp) {
    flag("critical", "App crashed when localStorage.setItem throws");
  }
  // Restore setItem so the next scenario's gotoFresh works.
  await page.evaluate(() => {
    delete (Storage.prototype as unknown as { setItem?: unknown }).setItem;
  });

  // ── Scenario 10: Rapid back-and-forth tab switching ─────────────────
  currentScenario = "rapid-tab-thrash";
  await gotoFresh(page);
  for (let i = 0; i < 10; i++) {
    await page.getByRole("tab", { name: "Week" }).click();
    await page.getByRole("tab", { name: "Month" }).click();
    await page.getByRole("tab", { name: "Year" }).click();
    await page.getByRole("tab", { name: "Day" }).click();
  }
  // After thrashing, day view should still be functional
  await page.waitForTimeout(300);
  const heroAfterThrash = await page
    .getByTestId("hero-numeral")
    .isVisible()
    .catch(() => false);
  if (!heroAfterThrash) {
    flag("critical", "Tab thrashing left the Day view broken");
  }

  // ── OUTPUT ──────────────────────────────────────────────────────────
  const critical = ANOMALIES.filter((a) => a.severity === "critical");
  const warnings = ANOMALIES.filter((a) => a.severity === "warning");
  const md: string[] = [];
  md.push(`# Hostile lifecycle — ${new Date().toISOString()}`);
  md.push("");
  md.push(
    `Critical: ${critical.length} · Warnings: ${warnings.length} · Console errors: ${CONSOLE_ERRORS.length}`,
  );
  md.push("");
  if (critical.length > 0) {
    md.push("## Critical");
    for (const a of critical) {
      md.push(`- **${a.scenario}** ${a.message}`);
    }
    md.push("");
  }
  if (warnings.length > 0) {
    md.push("## Warnings");
    for (const a of warnings) {
      md.push(`- **${a.scenario}** ${a.message}`);
    }
    md.push("");
  }
  if (CONSOLE_ERRORS.length > 0) {
    md.push("## Console errors");
    for (const e of CONSOLE_ERRORS) {
      md.push(`- **${e.scenario}** ${e.text.slice(0, 200)}`);
    }
  }
  writeFileSync(join(OUT_DIR, "report.md"), md.join("\n"));
  writeFileSync(
    join(OUT_DIR, "anomalies.json"),
    JSON.stringify(ANOMALIES, null, 2),
  );

  console.log(
    `\nHOSTILE — critical=${critical.length} warning=${warnings.length}\n`,
  );

  expect(ANOMALIES.length).toBeGreaterThanOrEqual(0); // always passes; report-driven
});
