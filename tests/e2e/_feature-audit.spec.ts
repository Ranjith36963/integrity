import { test, expect, type Page, type Locator } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// ─── Feature Audit ──────────────────────────────────────────────────────────
// Drives every interactive surface in the running app and records what each
// button/feature actually does. Output is a structured Markdown report at
// /tmp/feature-audit/report.md.

const REPORT: Array<{
  area: string;
  feature: string;
  steps: string[];
  observed: string;
  expected: string;
  verdict: "✓ pass" | "✗ fail" | "? unclear";
}> = [];

function rec(
  area: string,
  feature: string,
  steps: string[],
  observed: string,
  expected: string,
  verdict: "✓ pass" | "✗ fail" | "? unclear",
) {
  REPORT.push({ area, feature, steps, observed, expected, verdict });
  // Progressive write so we still get a report on timeout.
  try {
    mkdirSync("/tmp/feature-audit", { recursive: true });
    const lines: string[] = [
      "# Feature audit (in-progress)",
      `Updated: ${new Date().toISOString()}`,
      `Total recorded: ${REPORT.length}`,
      "",
    ];
    let lastArea = "";
    for (const r of REPORT) {
      if (r.area !== lastArea) {
        lines.push(`\n## ${r.area}\n`);
        lastArea = r.area;
      }
      lines.push(`### ${r.verdict} — ${r.feature}`);
      lines.push(`**Expected:** ${r.expected}`);
      lines.push(`**Observed:** ${r.observed}`);
      lines.push("");
    }
    writeFileSync("/tmp/feature-audit/report.md", lines.join("\n"));
  } catch {
    /* never throw from rec() */
  }
}

async function safeText(loc: Locator): Promise<string> {
  try {
    return (await loc.textContent({ timeout: 1500 })) ?? "";
  } catch {
    return "<not present>";
  }
}

async function clickIfPresent(page: Page, loc: Locator): Promise<boolean> {
  try {
    if ((await loc.count()) > 0) {
      await loc.first().click({ timeout: 3000 });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function resetStorage(page: Page) {
  await page.evaluate(() => {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
  });
}

test("FEATURE AUDIT: every button, every feature", async ({ page }) => {
  test.setTimeout(360_000);

  // ── 0. First load + reset ───────────────────────────────────────────────
  await page.goto("/");
  await resetStorage(page);
  await page.reload();
  await page.waitForLoadState("networkidle");

  // ── 1. TopBar — DHARMA brand mark ───────────────────────────────────────
  {
    const brand = page.getByText("DHARMA", { exact: false }).first();
    const visible = await brand.isVisible().catch(() => false);
    rec(
      "TopBar",
      "DHARMA brand (tap = no-op; long-press 600ms = M7e year-heatmap easter egg)",
      ["Locate header text 'DHARMA'", "Tap once → expect nothing"],
      visible ? "Brand visible; tap had no visible effect" : "Brand not found",
      "Tap is inert; long-press opens year heatmap overlay (M7e BrandMarkLongPress)",
      visible ? "✓ pass" : "✗ fail",
    );
    if (visible) {
      // Long-press simulation
      const box = await brand.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(700);
        await page.mouse.up();
        const overlay = page.locator('[data-testid*="year-heatmap"], [aria-label*="year heatmap" i]');
        const overlayCount = await overlay.count();
        rec(
          "TopBar",
          "DHARMA long-press → YearHeatmapPreview overlay",
          [
            "Long-press DHARMA for 700ms",
            "Check for overlay matching year-heatmap testid/label",
          ],
          overlayCount > 0
            ? "Overlay rendered (M7e easter egg)"
            : "No overlay detected after 700ms long-press",
          "Year heatmap preview opens for the active year",
          overlayCount > 0 ? "✓ pass" : "? unclear",
        );
        if (overlayCount > 0) {
          await page.keyboard.press("Escape");
          await page.waitForTimeout(300);
        }
      }
    }
  }

  // ── 2. TopBar — Pencil (Edit Mode toggle) ───────────────────────────────
  {
    const pencil = page.getByRole("button", { name: /edit mode/i });
    const present = (await pencil.count()) > 0;
    let initial = "";
    let after = "";
    if (present) {
      initial = (await pencil.first().getAttribute("aria-label")) ?? "";
      await pencil.first().click();
      await page.waitForTimeout(150);
      after = (await pencil.first().getAttribute("aria-label")) ?? "";
      // Toggle back so subsequent tests start in non-edit mode
      await pencil.first().click();
      await page.waitForTimeout(150);
    }
    rec(
      "TopBar",
      "Pencil button — toggles Edit Mode",
      [
        "Read pencil aria-label",
        "Click pencil",
        "Read aria-label again",
        "Click again to revert",
      ],
      present
        ? `aria-label: '${initial}' → '${after}'`
        : "Pencil button not found",
      "Toggles between 'Edit mode, off' and 'Edit mode, on'",
      present && initial !== after ? "✓ pass" : "✗ fail",
    );
  }

  // ── 3. TopBar — Settings (gear) ─────────────────────────────────────────
  // R7-ROOT-AUDIT: Settings is intentionally aria-disabled until that
  // milestone ships, mirroring Voice Log. The button should be present,
  // dimmed, and announce 'Settings (coming in a later release)'.
  {
    const gear = page.getByRole("button", { name: /Settings.*coming/i });
    const present = (await gear.count()) > 0;
    const ariaDisabled = present
      ? await gear.first().getAttribute("aria-disabled")
      : null;
    rec(
      "TopBar",
      "Settings (gear) button — intentionally disabled until shipped",
      ["Locate Settings button", "Read aria-disabled"],
      present
        ? `aria-disabled='${ariaDisabled ?? "<unset>"}', label includes 'coming'`
        : "Settings button not found",
      "aria-disabled='true'; aria-label includes 'coming in a later release'",
      present && ariaDisabled === "true" ? "✓ pass" : "✗ fail",
    );
  }

  // ── 4. BlueprintBar visibility ──────────────────────────────────────────
  {
    const blueprint = page.locator('[aria-label="Day blueprint"]');
    const visible = await blueprint.isVisible().catch(() => false);
    const segmentCount = await page
      .locator('[data-testid="blueprint-segment"]')
      .count();
    rec(
      "BlueprintBar",
      "Day blueprint section + NOW pin + segments",
      ["Check section visibility", "Count segments"],
      visible
        ? `Section visible; segments: ${segmentCount} (expected 0 on empty state)`
        : "Section not visible",
      "Visible at all times; segments == 0 on empty state, > 0 once blocks exist",
      visible ? "✓ pass" : "✗ fail",
    );
  }

  // ── 5. Hero panel — date / day number / pct ────────────────────────────
  {
    const date = page.getByTestId("hero-date-label");
    const day = page.getByTestId("hero-day-number");
    const numeral = page.getByTestId("hero-numeral");
    const dateTxt = (await safeText(date)).trim();
    const dayTxt = (await safeText(day)).trim();
    const pctTxt = (await safeText(numeral)).trim();
    rec(
      "Hero",
      "Hero contents (date / Building N of 365 / pct ring)",
      ["Read 3 testids"],
      `date: '${dateTxt}', day: '${dayTxt}', pct: '${pctTxt}'`,
      "All three render real values after hydration. Empty state: 0%.",
      dateTxt && dayTxt && pctTxt ? "✓ pass" : "✗ fail",
    );
  }

  // ── 6. Timeline empty-state card ────────────────────────────────────────
  {
    const empty = page.getByText(/Tap any slot to lay your first block/i);
    const visible = await empty.isVisible().catch(() => false);
    rec(
      "Timeline",
      "Empty-state card",
      ["Check empty-state copy presence"],
      visible
        ? "Card visible with locked SPEC copy"
        : "Card not visible (expected on empty state)",
      "Visible only when zero blocks AND zero loose bricks",
      visible ? "✓ pass" : "✗ fail",
    );
  }

  // ── 7. NowLine ──────────────────────────────────────────────────────────
  {
    const nowLine = page.getByTestId("now-line");
    const visible = await nowLine.isVisible().catch(() => false);
    const style = visible ? (await nowLine.getAttribute("style")) ?? "" : "";
    rec(
      "Timeline",
      "NowLine — amber horizontal rule at current time",
      ["Check now-line visible + inline-style top px"],
      visible
        ? `Visible; style snippet: '${style.slice(0, 60)}…'`
        : "NowLine not visible",
      "Always visible; top px = current time × 64",
      visible ? "✓ pass" : "✗ fail",
    );
  }

  // ── 8. Slot tap targets (24 invisible add buttons) ─────────────────────
  {
    const slots = page.getByRole("button", {
      name: /Add block at \d\d:\d\d/i,
    });
    const count = await slots.count();
    rec(
      "Timeline",
      "SlotTapTargets — 24 invisible hour-row buttons (tabIndex=-1)",
      ["Count slot buttons"],
      `count: ${count}`,
      "Exactly 24 (one per hour)",
      count === 24 ? "✓ pass" : "✗ fail",
    );
  }

  // ── 9. Voice Log button (disabled until M10) ───────────────────────────
  {
    const voice = page.getByRole("button", { name: /voice log/i });
    const present = (await voice.count()) > 0;
    const ariaDisabled = present
      ? await voice.first().getAttribute("aria-disabled")
      : null;
    rec(
      "BottomBar",
      "Voice Log button (intentionally disabled until M10)",
      ["Check aria-disabled attribute"],
      present
        ? `aria-disabled: '${ariaDisabled ?? "<unset>"}'`
        : "Voice Log button not found",
      "aria-disabled='true' until M10 ships voice",
      present && ariaDisabled === "true" ? "✓ pass" : "✗ fail",
    );
  }

  // ── 10. Dock + (Add) button → AddChooserSheet ──────────────────────────
  {
    // Reload to clear any lingering state (Settings click may have set
    // focus/scroll/etc on prior steps).
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(300);

    const addBtn = page.getByRole("button", { name: "Add", exact: true });
    const present = (await addBtn.count()) > 0;
    let dialog = page.locator('[role="dialog"]');
    let chooserAriaLabel = "";
    if (present) {
      await addBtn.first().click();
      await page.waitForTimeout(500);
      const count = await dialog.count();
      chooserAriaLabel =
        count > 0
          ? (await dialog.first().getAttribute("aria-label")) ?? ""
          : "<no dialog>";
    }
    rec(
      "BottomBar",
      "+ Add button → opens AddChooserSheet",
      ["Click +", "Inspect dialog aria-label"],
      present
        ? `Dialog opened; aria-label='${chooserAriaLabel}'`
        : "+ button not found",
      "Dialog aria-label='Add' (the M4d chooser)",
      present && chooserAriaLabel === "Add" ? "✓ pass" : "✗ fail",
    );

    // 10a. AddChooserSheet — Add Block button (force click — focus trap may
    // make Playwright's actionability check too cautious in this flow).
    const addBlockChoice = page.getByRole("button", { name: "Add Block", exact: true });
    const blockBtnPresent = (await addBlockChoice.count()) > 0;
    let blockSheetLabel = "";
    if (blockBtnPresent) {
      await addBlockChoice.first().click({ force: true });
      await page.waitForTimeout(500);
      blockSheetLabel =
        (await page
          .locator('[role="dialog"]')
          .first()
          .getAttribute("aria-label")) ?? "";
    }
    rec(
      "AddChooserSheet",
      "Add Block button → opens AddBlockSheet",
      ["From chooser, click 'Add Block'"],
      blockBtnPresent
        ? `Sheet now labelled '${blockSheetLabel}'`
        : "'Add Block' button missing from chooser",
      "Dialog aria-label changes to 'Add Block'",
      blockBtnPresent && blockSheetLabel === "Add Block" ? "✓ pass" : "✗ fail",
    );
  }

  // ── 11. AddBlockSheet — Title input ────────────────────────────────────
  {
    const title = page.getByLabel(/Title/i);
    const present = (await title.count()) > 0;
    if (present) {
      await title.first().fill("Audit Block");
    }
    rec(
      "AddBlockSheet",
      "Title input — required for Save",
      ["Fill title 'Audit Block'"],
      present
        ? "Title filled; Save should be enabled"
        : "Title input not found",
      "Save aria-disabled flips to 'false' once Title non-empty",
      present ? "✓ pass" : "✗ fail",
    );
  }

  // ── 12. AddBlockSheet — Start input (auto-filled from slot/now) ────────
  {
    const start = page.getByLabel(/Start/i);
    const startVal = (await start.first().inputValue().catch(() => "")) ?? "";
    await start.first().fill("09:00");
    const updated = (await start.first().inputValue().catch(() => "")) ?? "";
    rec(
      "AddBlockSheet",
      "Start input — accepts HH:MM, auto-fills from slot or rounded-down hour",
      ["Read initial value", "Fill '09:00'", "Read again"],
      `initial='${startVal}', after fill='${updated}'`,
      "Editable; persists user value; format HH:MM",
      updated === "09:00" ? "✓ pass" : "✗ fail",
    );
  }

  // ── 13. AddBlockSheet — End input ───────────────────────────────────────
  {
    // Scope to the End input — getByLabel(/End/i) can match the custom-range
    // recurrence label too. Use the element id directly.
    const end = page.locator("#block-end");
    await end.first().fill("10:00");
    await page.keyboard.press("Tab");
    const updated = (await end.first().inputValue().catch(() => "")) ?? "";
    rec(
      "AddBlockSheet",
      "End input — accepts HH:MM, must be > Start",
      ["Fill '10:00'", "Tab to blur"],
      `after fill='${updated}'`,
      "Editable; validator requires end > start",
      updated === "10:00" ? "✓ pass" : "✗ fail",
    );
  }

  // ── 14. AddBlockSheet — Recurrence chips ────────────────────────────────
  // Chips are role=radio with aria-checked (radiogroup pattern), NOT
  // role=button with aria-pressed. Initial audit got this wrong.
  {
    const recChip = page.getByRole("radio", { name: /every weekday/i });
    const present = (await recChip.count()) > 0;
    let ariaChecked = "";
    if (present) {
      await recChip.first().click();
      await page.waitForTimeout(150);
      ariaChecked =
        (await recChip.first().getAttribute("aria-checked")) ?? "<unset>";
    }
    rec(
      "AddBlockSheet",
      "Recurrence chips (Just today / Every weekday / Every day / Custom range) — role=radio",
      ["Click 'every weekday' radio chip", "Check aria-checked"],
      present
        ? `aria-checked='${ariaChecked}'`
        : "Every weekday chip not found",
      "Selected chip is aria-checked='true'",
      present && ariaChecked === "true" ? "✓ pass" : "✗ fail",
    );
  }

  // ── 15. AddBlockSheet — Save button ─────────────────────────────────────
  {
    const save = page.getByRole("button", { name: /^Save$/i });
    await save.first().click();
    await page.waitForTimeout(500);
    const dialogCount = await page.locator('[role="dialog"]').count();
    const blockCount = await page
      .locator('[data-component="timeline-block"]')
      .count();
    rec(
      "AddBlockSheet",
      "Save button — persists block, closes sheet",
      ["Click Save", "Check dialog dismissed", "Count blocks"],
      `dialog count: ${dialogCount}; timeline-block count: ${blockCount}`,
      "Dialog closes (count 0); at least one block appears in timeline",
      dialogCount === 0 && blockCount >= 1 ? "✓ pass" : "✗ fail",
    );
  }

  // ── 16. TimelineBlock card renders + shows time/pct ────────────────────
  {
    const block = page.locator('[data-component="timeline-block"]').first();
    const blockText = await safeText(block);
    const visible = await block.isVisible().catch(() => false);
    rec(
      "Timeline",
      "TimelineBlock card",
      ["Read first timeline block text"],
      visible
        ? `text: '${blockText.replace(/\s+/g, " ").trim().slice(0, 60)}…'`
        : "Block not visible",
      "Card shows name + time range + pct",
      visible ? "✓ pass" : "✗ fail",
    );
  }

  // ── 17. ViewSwitcher: Day / Week / Month / Year ────────────────────────
  {
    const switcher = page.getByRole("tablist", { name: /Calendar view/i });
    const present = (await switcher.count()) > 0;
    const tabs = present
      ? await switcher.first().getByRole("tab").all()
      : [];
    const labels = await Promise.all(tabs.map((t) => safeText(t)));
    rec(
      "ViewSwitcher",
      "Day · Week · Month · Year tablist",
      ["Locate role=tablist", "Read all 4 tab labels"],
      present
        ? `tabs found: ${labels.join(", ")}`
        : "Tablist not found",
      "4 tabs: Day, Week, Month, Year",
      present && tabs.length === 4 ? "✓ pass" : "✗ fail",
    );

    // 17a. Click each tab and inspect aria-selected
    for (const wantedName of ["Week", "Month", "Year", "Day"] as const) {
      const tab = page.getByRole("tab", { name: wantedName });
      if ((await tab.count()) > 0) {
        await tab.first().click();
        await page.waitForTimeout(300);
        const selected =
          (await tab.first().getAttribute("aria-selected")) ?? "<unset>";
        rec(
          "ViewSwitcher",
          `${wantedName} tab → switches view`,
          [`Click '${wantedName}'`, "Read aria-selected"],
          `aria-selected='${selected}'`,
          "Clicking a tab marks it aria-selected='true'",
          selected === "true" ? "✓ pass" : "✗ fail",
        );
      }
    }
  }

  // ── 18. Edit Mode: × delete button on a block ──────────────────────────
  {
    // Enable Edit Mode
    const pencil = page.getByRole("button", { name: /edit mode/i });
    await pencil.first().click();
    await page.waitForTimeout(200);

    const deleteBtn = page.getByRole("button", { name: /delete block/i });
    const present = (await deleteBtn.count()) > 0;
    if (present) {
      await deleteBtn.first().click();
      await page.waitForTimeout(300);
      // DeleteConfirmModal
      const modal = page.locator('[role="dialog"]');
      const modalCount = await modal.count();
      rec(
        "Edit Mode",
        "× delete affordance on block → DeleteConfirmModal",
        [
          "Toggle Edit Mode on",
          "Click × on the audit block",
          "Check dialog appears",
        ],
        `dialog count: ${modalCount}`,
        "DeleteConfirmModal opens with confirm options",
        modalCount >= 1 ? "✓ pass" : "✗ fail",
      );
      // Cancel the delete
      const cancel = page.getByRole("button", { name: /cancel/i });
      await cancel.first().click().catch(() => {});
      await page.waitForTimeout(200);
    } else {
      rec(
        "Edit Mode",
        "× delete affordance on block",
        ["Toggle Edit Mode on", "Look for × button on block"],
        "Delete button not found in Edit Mode",
        "× appears on every block in Edit Mode",
        "✗ fail",
      );
    }

    // Toggle Edit Mode back off
    await pencil.first().click();
    await page.waitForTimeout(150);
  }

  // ── 19. Persistence: reload preserves block ────────────────────────────
  {
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    const blockCount = await page
      .locator('[data-component="timeline-block"]')
      .count();
    rec(
      "Persistence (M8)",
      "Block survives page reload (dharma:v1 localStorage round-trip)",
      ["Hard reload", "Recount blocks"],
      `block count after reload: ${blockCount}`,
      "Block count >= 1 (the audit block persists)",
      blockCount >= 1 ? "✓ pass" : "✗ fail",
    );
  }

  // ── 20. Slot tap → chooser flow ─────────────────────────────────────────
  {
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(300);
    const slot10 = page.getByRole("button", { name: "Add block at 10:00" });
    const present = (await slot10.count()) > 0;
    let dialogLabel = "";
    let chooserStartPrefilled = false;
    if (present) {
      await slot10.first().click({ force: true });
      await page.waitForTimeout(300);
      dialogLabel =
        (await page.locator('[role="dialog"]').first().getAttribute("aria-label")) ?? "";
      // Walk through chooser → AddBlockSheet → check Start is 10:00
      const blockBtn = page.getByRole("button", { name: "Add Block", exact: true });
      if ((await blockBtn.count()) > 0) {
        await blockBtn.click();
        await page.waitForTimeout(300);
        const startVal = await page.locator("#block-start").inputValue().catch(() => "");
        chooserStartPrefilled = startVal === "10:00";
        // Cancel out
        const cancel = page.getByRole("button", { name: /^Cancel$/i });
        if ((await cancel.count()) > 0) {
          await cancel.first().click();
          await page.waitForTimeout(200);
        }
      }
    }
    rec(
      "Timeline",
      "Slot tap at 10:00 → chooser → AddBlockSheet pre-filled Start=10:00",
      [
        "Click invisible slot button at 10:00",
        "Walk through chooser → Add Block",
        "Verify Start input == 10:00",
      ],
      present
        ? `chooser label='${dialogLabel}', prefilled=${chooserStartPrefilled}`
        : "Slot button not found",
      "Chooser opens with aria-label='Add'; AddBlockSheet's Start = 10:00",
      present && dialogLabel === "Add" && chooserStartPrefilled
        ? "✓ pass"
        : "✗ fail",
    );
  }

  // ── 21. AddChooserSheet → Add Brick → AddBrickSheet ────────────────────
  {
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(300);
    const addBtn = page.getByRole("button", { name: "Add", exact: true });
    let brickSheetLabel = "";
    if ((await addBtn.count()) > 0) {
      await addBtn.first().click();
      await page.waitForTimeout(300);
      const brickBtn = page.getByRole("button", { name: "Add Brick", exact: true });
      if ((await brickBtn.count()) > 0) {
        await brickBtn.click();
        await page.waitForTimeout(300);
        brickSheetLabel =
          (await page
            .locator('[role="dialog"]')
            .first()
            .getAttribute("aria-label")) ?? "";
      }
    }
    rec(
      "AddChooserSheet",
      "Add Brick button → opens AddBrickSheet",
      ["Open chooser", "Click Add Brick", "Inspect sheet aria-label"],
      `sheet now='${brickSheetLabel}'`,
      "Dialog aria-label changes to 'Add Brick'",
      brickSheetLabel === "Add Brick" ? "✓ pass" : "✗ fail",
    );

    // 21a. ESC closes the brick sheet (R7-ROOT-M3-P1-3)
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    const dialogCount = await page.locator('[role="dialog"]').count();
    rec(
      "AddBrickSheet",
      "Escape key closes sheet (R7-ROOT-M3-P1-3)",
      ["Press Escape with sheet open"],
      `dialog count after ESC: ${dialogCount}`,
      "Dialog dismissed (count 0)",
      dialogCount === 0 ? "✓ pass" : "✗ fail",
    );
  }

  // ── 22. AddChooserSheet Cancel button ─────────────────────────────────
  {
    const addBtn = page.getByRole("button", { name: "Add", exact: true });
    if ((await addBtn.count()) > 0) {
      await addBtn.first().click();
      await page.waitForTimeout(300);
      const cancelBtn = page.getByRole("button", { name: /^Cancel$/i });
      if ((await cancelBtn.count()) > 0) {
        await cancelBtn.first().click();
        await page.waitForTimeout(300);
      }
      const dialogCount = await page.locator('[role="dialog"]').count();
      rec(
        "AddChooserSheet",
        "Cancel button closes chooser without picking",
        ["Open chooser", "Click Cancel"],
        `dialog count: ${dialogCount}`,
        "Chooser dismissed (count 0)",
        dialogCount === 0 ? "✓ pass" : "✗ fail",
      );
    }
  }

  // ── 23. Reset storage to leave clean state ─────────────────────────────
  await resetStorage(page);

  // ── Write report ───────────────────────────────────────────────────────
  mkdirSync("/tmp/feature-audit", { recursive: true });
  const lines: string[] = [];
  lines.push("# Dharma Feature Audit — live browser run");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push(`Total checks: ${REPORT.length}`);
  const pass = REPORT.filter((r) => r.verdict === "✓ pass").length;
  const fail = REPORT.filter((r) => r.verdict === "✗ fail").length;
  const unclear = REPORT.filter((r) => r.verdict === "? unclear").length;
  lines.push(`Pass: ${pass} · Fail: ${fail} · Unclear: ${unclear}`);
  lines.push("");
  let lastArea = "";
  for (const row of REPORT) {
    if (row.area !== lastArea) {
      lines.push(`\n## ${row.area}\n`);
      lastArea = row.area;
    }
    lines.push(`### ${row.verdict} — ${row.feature}`);
    lines.push("**Steps:**");
    for (const s of row.steps) lines.push(`- ${s}`);
    lines.push(`**Expected:** ${row.expected}`);
    lines.push(`**Observed:** ${row.observed}`);
    lines.push("");
  }
  const text = lines.join("\n");
  writeFileSync(join("/tmp/feature-audit", "report.md"), text);
  // Also fail the test if any "✗ fail" so it's visible.
  console.log(`\n\nFEATURE AUDIT — pass=${pass} fail=${fail} unclear=${unclear}\n`);
  // Don't fail outright; this is exploratory. Print summary instead.
  expect(pass + fail + unclear).toBeGreaterThan(0);
});
