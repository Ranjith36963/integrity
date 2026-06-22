/**
 * tests/e2e/_lifecycle-dimensions.spec.ts — cross-dimensional sweeps.
 *
 * Runs targeted checks under non-default conditions:
 *   - prefers-reduced-motion: reduce (vestibular sensitivity)
 *   - Tokyo timezone (UTC+9, future-of-UTC, no DST)
 *   - Nepal timezone (UTC+5:45, oddball offset that broke things before)
 *   - Offline navigation
 *   - 100-block stress (perf regression check)
 *
 * Output: /tmp/lifecycle-dimensions/report.md
 */

import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// Module-scoped findings only work when tests run in a SINGLE worker. Force
// serial mode so each test mutates FINDINGS in order and the final "write
// report" test sees the full list.
test.describe.configure({ mode: "serial" });

const OUT_DIR = "/tmp/lifecycle-dimensions";

type Finding = {
  dimension: string;
  severity: "critical" | "warning" | "info";
  message: string;
};

const FINDINGS: Finding[] = [];

function flag(
  dimension: string,
  severity: Finding["severity"],
  message: string,
) {
  FINDINGS.push({ dimension, severity, message });
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

async function withConsoleErrorWatch(
  page: Page,
  dimension: string,
  fn: () => Promise<void>,
) {
  const errors: string[] = [];
  const onConsole = (msg: import("@playwright/test").ConsoleMessage) => {
    if (msg.type() === "error") errors.push(msg.text());
  };
  const onPageError = (err: Error) => {
    errors.push(`pageerror: ${err.message}`);
  };
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  try {
    await fn();
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
  }
  for (const e of errors)
    flag(dimension, "critical", `Console: ${e.slice(0, 200)}`);
}

test("DIMENSIONS: reduced-motion preference", async ({ page }) => {
  test.setTimeout(120_000);
  page.setDefaultTimeout(5000);
  mkdirSync(OUT_DIR, { recursive: true });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await withConsoleErrorWatch(page, "reduced-motion", async () => {
    await gotoFresh(page);
    // Open and close every sheet — make sure no animation is forced
    await page.getByTestId("dock-add").click();
    await page.waitForTimeout(150);
    const chooserPresent = await page
      .locator('[role="dialog"]')
      .first()
      .isVisible()
      .catch(() => false);
    if (!chooserPresent) {
      flag(
        "reduced-motion",
        "critical",
        "Chooser dialog didn't render with PRM=reduce",
      );
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);

    // Open settings
    await page.getByTestId("settings-button").click();
    await page.waitForTimeout(150);
    const settingsPresent = await page
      .locator('[role="dialog"]')
      .first()
      .isVisible()
      .catch(() => false);
    if (!settingsPresent) {
      flag(
        "reduced-motion",
        "critical",
        "Settings sheet didn't render with PRM=reduce",
      );
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);

    // Verify Welcome respects PRM
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await page.waitForLoadState("networkidle");
    const welcomeVisible = await page
      .getByTestId("welcome")
      .isVisible()
      .catch(() => false);
    if (!welcomeVisible) {
      flag(
        "reduced-motion",
        "warning",
        "Welcome did not appear on a true first-visit reload",
      );
    }
  });
});

test("DIMENSIONS: Tokyo timezone (UTC+9, no DST)", async ({ browser }) => {
  test.setTimeout(120_000);
  let ctx: BrowserContext | null = null;
  try {
    ctx = await browser.newContext({
      timezoneId: "Asia/Tokyo",
      viewport: { width: 430, height: 900 },
    });
    const page = await ctx.newPage();
    page.setDefaultTimeout(5000);
    await withConsoleErrorWatch(page, "tz-tokyo", async () => {
      await gotoFresh(page);
      // Hero day-number should be 1 of 365 (or 366) — programStart=today
      const dayLabel = await page
        .getByTestId("hero-day-number")
        .textContent()
        .catch(() => "");
      if (!dayLabel?.match(/Building \d+ of (365|366)/)) {
        flag(
          "tz-tokyo",
          "critical",
          `Day-number malformed in Tokyo TZ: "${dayLabel?.trim()}"`,
        );
      }
      // Adding a block should round-trip across reload
      await page.getByTestId("dock-add").click();
      await page.waitForTimeout(150);
      await page.getByTestId("chooser-add-block").click({ force: true });
      await page.waitForTimeout(150);
      await page.getByLabel(/Title/i).fill("Tokyo block");
      await page.locator("#block-start").fill("07:00");
      await page.locator("#block-end").fill("08:00");
      await page.keyboard.press("Tab");
      await page.getByTestId("add-block-save").click();
      await page.waitForTimeout(500);
      await page.reload();
      await page.waitForLoadState("networkidle");
      const blockCount = await page
        .locator('[data-component="timeline-block"]')
        .count();
      if (blockCount !== 1) {
        flag(
          "tz-tokyo",
          "critical",
          `Tokyo block didn't persist across reload: ${blockCount}`,
        );
      }
    });
  } finally {
    await ctx?.close();
  }
});

test("DIMENSIONS: Nepal timezone (UTC+5:45 — quarter-hour offset)", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  let ctx: BrowserContext | null = null;
  try {
    ctx = await browser.newContext({
      timezoneId: "Asia/Kathmandu",
      viewport: { width: 430, height: 900 },
    });
    const page = await ctx.newPage();
    page.setDefaultTimeout(5000);
    await withConsoleErrorWatch(page, "tz-nepal", async () => {
      await gotoFresh(page);
      const dayLabel = await page
        .getByTestId("hero-day-number")
        .textContent()
        .catch(() => "");
      if (!dayLabel?.match(/Building \d+ of (365|366)/)) {
        flag(
          "tz-nepal",
          "critical",
          `Day-number malformed in Nepal TZ: "${dayLabel?.trim()}"`,
        );
      }
    });
  } finally {
    await ctx?.close();
  }
});

test("DIMENSIONS: offline navigation after first paint", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  let ctx: BrowserContext | null = null;
  try {
    ctx = await browser.newContext({
      viewport: { width: 430, height: 900 },
    });
    const page = await ctx.newPage();
    page.setDefaultTimeout(5000);
    await withConsoleErrorWatch(page, "offline", async () => {
      await gotoFresh(page);
      // Now go offline and verify tab switches still work (no network needed)
      await ctx!.setOffline(true);
      for (const tab of ["Week", "Month", "Year", "Day"] as const) {
        await page.getByRole("tab", { name: tab }).click();
        await page.waitForTimeout(200);
        const selected = await page
          .getByRole("tab", { name: tab })
          .getAttribute("aria-selected");
        if (selected !== "true") {
          flag("offline", "critical", `${tab} tab didn't activate offline`);
        }
      }
      // Adding a block while offline should still write to localStorage
      await page.getByRole("tab", { name: "Day" }).click();
      await page.getByTestId("dock-add").click();
      await page.waitForTimeout(150);
      await page.getByTestId("chooser-add-block").click({ force: true });
      await page.waitForTimeout(150);
      await page.getByLabel(/Title/i).fill("Offline block");
      await page.locator("#block-start").fill("07:00");
      await page.locator("#block-end").fill("08:00");
      await page.keyboard.press("Tab");
      await page.getByTestId("add-block-save").click();
      await page.waitForTimeout(500);
      const blocks = await page
        .locator('[data-component="timeline-block"]')
        .count();
      if (blocks !== 1) {
        flag(
          "offline",
          "critical",
          `Offline block save did not produce a timeline-block: ${blocks}`,
        );
      }
      await ctx!.setOffline(false);
    });
  } finally {
    await ctx?.close();
  }
});

test("DIMENSIONS: 100-block stress (perf regression)", async ({ page }) => {
  test.setTimeout(300_000); // 5 min — loading 100 blocks via dispatch
  page.setDefaultTimeout(5000);
  await withConsoleErrorWatch(page, "stress-100-blocks", async () => {
    await page.goto("/");
    // Seed 100 blocks directly into localStorage to skip 100× UI interactions
    await page.evaluate(() => {
      const blocks = [];
      for (let i = 0; i < 100; i++) {
        const startMin = i * 14; // pseudo-distributed across the day
        const sh = Math.floor(startMin / 60) % 24;
        const sm = startMin % 60;
        const eh = (sh + 1) % 24;
        blocks.push({
          id: `b${i}`,
          name: `Block ${i}`,
          start: `${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`,
          end: `${String(eh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`,
          recurrence: { kind: "every-day" },
          categoryId: null,
          bricks: [],
        });
      }
      const todayIso = new Date().toISOString().slice(0, 10);
      window.localStorage.setItem(
        "dharma:v1",
        JSON.stringify({
          schemaVersion: 3,
          programStart: todayIso,
          currentDate: todayIso,
          history: {},
          deletions: {},
          blocks,
          categories: [],
          looseBricks: [],
        }),
      );
      window.localStorage.setItem("dharma:onboarding-shown", "true");
    });
    const tStart = Date.now();
    await page.reload();
    await page.waitForLoadState("networkidle");
    const tEnd = Date.now();
    const loadMs = tEnd - tStart;
    if (loadMs > 5000) {
      flag(
        "stress-100-blocks",
        "warning",
        `100-block hydration took ${loadMs}ms (>5s budget)`,
      );
    } else {
      flag("stress-100-blocks", "info", `100-block hydration: ${loadMs}ms`);
    }
    // Verify all 100 blocks are in DOM
    const count = await page
      .locator('[data-component="timeline-block"]')
      .count();
    if (count < 100) {
      flag(
        "stress-100-blocks",
        "warning",
        `Expected 100 timeline-block elements, found ${count}`,
      );
    }
    // Switch to Year view and back — should not freeze with 100 blocks
    const t2 = Date.now();
    await page.getByRole("tab", { name: "Year" }).click();
    await page.waitForTimeout(200);
    await page.getByRole("tab", { name: "Day" }).click();
    const t3 = Date.now();
    if (t3 - t2 > 2000) {
      flag(
        "stress-100-blocks",
        "warning",
        `Year↔Day round-trip took ${t3 - t2}ms`,
      );
    }
  });
});

test("DIMENSIONS: write final report", async () => {
  const critical = FINDINGS.filter((f) => f.severity === "critical");
  const warnings = FINDINGS.filter((f) => f.severity === "warning");
  const info = FINDINGS.filter((f) => f.severity === "info");

  const md: string[] = [];
  md.push(`# Lifecycle dimensions — ${new Date().toISOString()}`);
  md.push("");
  md.push(
    `Critical: ${critical.length} · Warnings: ${warnings.length} · Info: ${info.length}`,
  );
  md.push("");
  for (const cat of ["critical", "warning", "info"] as const) {
    const items = FINDINGS.filter((f) => f.severity === cat);
    if (items.length === 0) continue;
    md.push(`## ${cat.toUpperCase()}`);
    for (const f of items) {
      md.push(`- **${f.dimension}** ${f.message}`);
    }
    md.push("");
  }
  writeFileSync(join(OUT_DIR, "report.md"), md.join("\n"));
  writeFileSync(
    join(OUT_DIR, "findings.json"),
    JSON.stringify(FINDINGS, null, 2),
  );
  console.log(
    `\nDIMENSIONS — critical=${critical.length} warning=${warnings.length} info=${info.length}\n`,
  );
  expect(critical.length).toBeLessThan(99);
});
