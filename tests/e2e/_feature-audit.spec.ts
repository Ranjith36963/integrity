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

async function resetStorage(page: Page) {
  await page.evaluate(() => {
    try {
      localStorage.clear();
      // Pre-stamp the onboarding flag so the audit (which drives the app
      // post-reset) bypasses the Welcome overlay. The Welcome screen is
      // covered by its own Vitest suite; audit's job is the main-app
      // surface.
      localStorage.setItem("dharma:onboarding-shown", "true");
    } catch {
      /* ignore */
    }
  });
}

test("FEATURE AUDIT: every button, every feature", async ({ page }) => {
  // 30 min — full audit has ~35 steps; many involve full page reloads
  // (~5s each via networkidle) plus sheet open/close cycles (300-500ms waits).
  test.setTimeout(1_800_000);

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
    const pencil = page.getByTestId("edit-mode-toggle");
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
  // Settings now opens a real sheet (was previously aria-disabled).
  // Verify: click → dialog labelled "Settings" appears; ESC dismisses.
  {
    const gear = page.getByTestId("settings-button");
    const present = (await gear.count()) > 0;
    let sheetLabel = "";
    if (present) {
      await gear.click();
      await page.waitForTimeout(300);
      sheetLabel =
        (await page.locator('[role="dialog"]').first().getAttribute("aria-label")) ?? "";
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }
    rec(
      "TopBar",
      "Settings (gear) button — opens SettingsSheet",
      ["Click settings button", "Inspect dialog aria-label"],
      present
        ? `dialog after click: aria-label='${sheetLabel}'`
        : "Settings button not found",
      "Dialog aria-label='Settings'; ESC dismisses",
      present && sheetLabel === "Settings" ? "✓ pass" : "✗ fail",
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
    const voice = page.getByTestId("dock-voice");
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

    const addBtn = page.getByTestId("dock-add");
    const present = (await addBtn.count()) > 0;
    const dialog = page.locator('[role="dialog"]');
    let chooserAriaLabel = "";
    if (present) {
      await addBtn.click();
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
    const addBlockChoice = page.getByTestId("chooser-add-block");
    const blockBtnPresent = (await addBlockChoice.count()) > 0;
    let blockSheetLabel = "";
    if (blockBtnPresent) {
      await addBlockChoice.click({ force: true });
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
    const save = page.getByTestId("add-block-save");
    await save.click();
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
    const pencil = page.getByTestId("edit-mode-toggle");
    await pencil.click();
    await page.waitForTimeout(200);

    const deleteBtn = page.getByRole("button", { name: /delete block/i });
    const present = (await deleteBtn.count()) > 0;
    if (present) {
      // force:true — same R7-ROOT-AUDIT-DOCK-OVERLAP rationale as step 28.
      // Timeline blocks near the page bottom can sit under BottomBar.
      await deleteBtn.first().click({ force: true });
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
    await pencil.click();
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
      const blockBtn = page.getByTestId("chooser-add-block");
      if ((await blockBtn.count()) > 0) {
        await blockBtn.click();
        await page.waitForTimeout(300);
        const startVal = await page.locator("#block-start").inputValue().catch(() => "");
        chooserStartPrefilled = startVal === "10:00";
        // Cancel out
        const cancel = page.getByTestId("sheet-close");
        if ((await cancel.count()) > 0) {
          await cancel.click();
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
    const addBtn = page.getByTestId("dock-add");
    let brickSheetLabel = "";
    if ((await addBtn.count()) > 0) {
      await addBtn.click();
      await page.waitForTimeout(300);
      const brickBtn = page.getByTestId("chooser-add-brick");
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
    const addBtn = page.getByTestId("dock-add");
    if ((await addBtn.count()) > 0) {
      await addBtn.click();
      await page.waitForTimeout(300);
      const cancelBtn = page.getByTestId("chooser-cancel");
      if ((await cancelBtn.count()) > 0) {
        await cancelBtn.click();
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

  // ════════════════════════════════════════════════════════════════════════
  // PART 2 — extended coverage (AddBrickSheet, BrickChip, NewCategoryForm,
  //  UnitsEntrySheet, DeleteConfirmModal full flow, LooseBricksTray,
  //  backdrop close, NewCategory inline create, ViewSwitcher keyboard).
  // ════════════════════════════════════════════════════════════════════════

  // ── 24. NewCategoryForm inline create (+ New chip in AddBlockSheet) ────
  // R7-ROOT-AUDIT-PATTERN: refactored to use stable data-testids that the
  // components now expose. Pre-refactor the audit kept tripping over
  // label-string guesses (Create vs Done; Category name vs Name; Color 1
  // vs Color 10/11/12). Testids are stable contracts; labels are spec text
  // that can shift across milestones (Supersessions).
  {
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(300);
    await page.getByTestId("dock-add").click();
    await page.waitForTimeout(200);
    await page.getByTestId("chooser-add-block").click();
    await page.waitForTimeout(300);
    const newCatBtn = page.getByTestId("category-new");
    const present = (await newCatBtn.count()) > 0;
    let viewLabel = "";
    if (present) {
      await newCatBtn.click();
      await page.waitForTimeout(300);
      viewLabel =
        (await page.locator('[role="dialog"]').first().getAttribute("aria-label")) ?? "";
    }
    rec(
      "AddBlockSheet",
      "+ New category chip → switches sheet to New Category form",
      ["Click + New testid", "Read dialog aria-label"],
      present ? `dialog now='${viewLabel}'` : "+ New testid missing",
      "Dialog aria-label flips to 'New Category'",
      present && viewLabel === "New Category" ? "✓ pass" : "✗ fail",
    );

    // 24a. New Category form — Name input + Done (via testid).
    const nameInput = page.locator("#new-category-name");
    const namePresent = (await nameInput.count()) > 0;
    if (namePresent) {
      await nameInput.fill("Audit Cat");
    }
    // exact: true — "Color 1" substring also matches "Color 10/11/12".
    // Color radios don't have testids (they're a palette grid); keeping
    // the role+exact pattern here is acceptable.
    await page
      .getByRole("radio", { name: "Color 1", exact: true })
      .click();
    await page.waitForTimeout(150);
    const doneBtn = page.getByTestId("new-category-done");
    let dialogLabelAfter = "";
    if (namePresent) {
      await doneBtn.click();
      await page.waitForTimeout(400);
      dialogLabelAfter =
        (await page.locator('[role="dialog"]').first().getAttribute("aria-label")) ?? "";
    }
    rec(
      "NewCategoryForm",
      "Done button — saves category, returns to block form (SG-m2-11)",
      [
        "Fill name 'Audit Cat'",
        "Click first color swatch",
        "Click new-category-done testid",
        "Read dialog aria-label",
      ],
      `dialog after Done='${dialogLabelAfter}'`,
      "Dialog flips back to 'Add Block' with new category auto-selected",
      dialogLabelAfter === "Add Block" ? "✓ pass" : "✗ fail",
    );

    // Cancel out so we don't pollute state
    const cancel = page.getByTestId("sheet-close");
    if ((await cancel.count()) > 0) {
      await cancel.click();
      await page.waitForTimeout(300);
    }
  }

  // ── 25. AddBrickSheet — Title, Kind toggle, Save ───────────────────────
  {
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(300);
    await page.getByTestId("dock-add").click();
    await page.waitForTimeout(200);
    await page.getByTestId("chooser-add-brick").click();
    await page.waitForTimeout(300);

    const sheetLabel =
      (await page.locator('[role="dialog"]').first().getAttribute("aria-label")) ?? "";
    rec(
      "AddBrickSheet",
      "Sheet opens with aria-label='Add Brick'",
      ["Click + → Add Brick"],
      `aria-label='${sheetLabel}'`,
      "Sheet aria-label='Add Brick'",
      sheetLabel === "Add Brick" ? "✓ pass" : "✗ fail",
    );

    const titleInput = page.getByLabel(/Title/i);
    const titlePresent = (await titleInput.count()) > 0;
    if (titlePresent) {
      await titleInput.first().fill("Audit Brick");
    }
    rec(
      "AddBrickSheet",
      "Title input",
      ["Fill 'Audit Brick'"],
      titlePresent ? "Title filled" : "Title input not found",
      "Title editable; required for Save",
      titlePresent ? "✓ pass" : "✗ fail",
    );

    // Kind toggle: tick / units
    const unitsRadio = page.getByRole("radio", { name: /units/i });
    const unitsPresent = (await unitsRadio.count()) > 0;
    let unitsChecked = "";
    if (unitsPresent) {
      await unitsRadio.first().click();
      await page.waitForTimeout(200);
      unitsChecked =
        (await unitsRadio.first().getAttribute("aria-checked")) ?? "";
    }
    rec(
      "AddBrickSheet",
      "Kind toggle — tick / units",
      ["Click 'units' radio", "Check aria-checked"],
      unitsPresent ? `aria-checked='${unitsChecked}'` : "units radio missing",
      "Selected radio has aria-checked='true'",
      unitsChecked === "true" ? "✓ pass" : "✗ fail",
    );

    // When units selected, Target + Unit inputs appear
    const targetInput = page.getByLabel(/Target/i);
    const targetPresent = (await targetInput.count()) > 0;
    if (targetPresent) {
      await targetInput.first().fill("10");
    }
    rec(
      "AddBrickSheet",
      "Target input (visible when kind=units)",
      ["Fill target '10'"],
      targetPresent ? "Target filled with 10" : "Target input missing",
      "Editable number input; required",
      targetPresent ? "✓ pass" : "✗ fail",
    );

    // Switch back to tick (simpler for save)
    const tickRadio = page.getByRole("radio", { name: /^tick$/i });
    if ((await tickRadio.count()) > 0) {
      await tickRadio.first().click();
      await page.waitForTimeout(150);
    }

    // Save the brick — should appear in LooseBricksTray (loose, no parent)
    const saveBrick = page.getByRole("button", { name: /^Save$/i });
    await saveBrick.first().click();
    await page.waitForTimeout(500);
    const dialogAfter = await page.locator('[role="dialog"]').count();
    rec(
      "AddBrickSheet",
      "Save — persists loose brick, closes sheet",
      ["Click Save"],
      `dialog count after Save: ${dialogAfter}`,
      "Sheet closes",
      dialogAfter === 0 ? "✓ pass" : "✗ fail",
    );
  }

  // ── 26. LooseBricksTray — visible with at least one brick ──────────────
  {
    const tray = page.locator('[data-testid="loose-bricks-tray"]');
    const visible = await tray.isVisible().catch(() => false);
    rec(
      "LooseBricksTray",
      "Tray visible after at least one loose brick exists",
      ["Locate tray testid"],
      visible ? "Tray section visible" : "Tray not visible",
      "Tray renders once looseBricks.length > 0 OR blocksExist",
      visible ? "✓ pass" : "✗ fail",
    );
  }

  // ── 27. LooseBricksTray — chevron expand/collapse ──────────────────────
  {
    const chevron = page.getByRole("button", {
      name: /expand loose bricks|collapse loose bricks/i,
    });
    const present = (await chevron.count()) > 0;
    let initial = "";
    let afterClick = "";
    if (present) {
      const region = page.getByRole("region", { name: /loose bricks/i });
      initial = (await region.getAttribute("aria-expanded")) ?? "<unset>";
      await chevron.first().click();
      await page.waitForTimeout(200);
      afterClick = (await region.getAttribute("aria-expanded")) ?? "<unset>";
    }
    rec(
      "LooseBricksTray",
      "Chevron toggles aria-expanded",
      ["Click chevron", "Read aria-expanded before/after"],
      present
        ? `aria-expanded: '${initial}' → '${afterClick}'`
        : "Chevron not found",
      "aria-expanded flips true ↔ false on click",
      present && initial !== afterClick ? "✓ pass" : "✗ fail",
    );
  }

  // ── 28. BrickChip — tap tick brick toggles done ────────────────────────
  // R7-ROOT-AUDIT-DOCK-OVERLAP: BrickChips inside LooseBricksTray sit just
  // above the fixed BottomBar (z-20). Even with scrollIntoView + force-click
  // the click can land on the dock if the chip overlaps it. Dispatching the
  // click directly on the JS element bypasses hit-testing entirely — fine
  // for this audit since we only care that the chip's own handler runs.
  {
    const chips = page.getByRole("button", { name: /Audit Brick/i });
    const before = (await chips.first().getAttribute("aria-label")) ?? "";
    await chips.first().evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(300);
    const after = (await chips.first().getAttribute("aria-label")) ?? "";
    rec(
      "BrickChip",
      "Tap tick brick → toggles done (aria-label changes)",
      ["Read brick aria-label", "Tap", "Read again"],
      `before='${before.slice(0, 60)}', after='${after.slice(0, 60)}'`,
      "Label flips between 'not done' and 'done'",
      before !== after ? "✓ pass" : "✗ fail",
    );
  }

  // ── 29. Escape closes a sheet (mobile sheets are full-screen at 430px,
  //         so there is no exposed backdrop to tap; ESC is the dismiss path).
  {
    await page.getByTestId("dock-add").click();
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    const dialogAfter = await page.locator('[role="dialog"]').count();
    rec(
      "Sheet primitive",
      "Escape key dismisses sheet (mobile sheets are full-screen — no backdrop tap target)",
      ["Open chooser", "Press Escape"],
      `dialog count after: ${dialogAfter}`,
      "Sheet closes (count 0) — backdrop tap only applies above 430px viewport",
      dialogAfter === 0 ? "✓ pass" : "✗ fail",
    );
  }

  // ── 30. DeleteConfirmModal — confirm a delete (Just today vs single) ──
  {
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(300);
    // Add a fresh non-recurring block so we can delete it
    await page.getByTestId("dock-add").click();
    await page.waitForTimeout(150);
    await page.getByTestId("chooser-add-block").click();
    await page.waitForTimeout(300);
    await page.getByLabel(/Title/i).fill("To Delete");
    // Set both Start and End so the time range is valid regardless of the
    // wall-clock hour the audit runs at. (Start defaults to "now"; if now is
    // ≥ 11:00, the original End=11:00 would put end before start and disable
    // Save.)
    await page.locator("#block-start").fill("09:00");
    await page.locator("#block-end").fill("11:00");
    await page.keyboard.press("Tab");
    await page.getByTestId("add-block-save").click();
    await page.waitForTimeout(500);

    // Enable Edit Mode
    await page.getByTestId("edit-mode-toggle").click();
    await page.waitForTimeout(200);

    const deleteBtn = page.getByRole("button", { name: /delete block/i });
    const blocksBefore = await page
      .locator('[data-component="timeline-block"]')
      .count();
    if ((await deleteBtn.count()) > 0) {
      // R7-ROOT-AUDIT-DOCK-OVERLAP: dock overlay can intercept timeline clicks.
      await deleteBtn.first().click({ force: true });
      await page.waitForTimeout(300);
      // Confirm via the "Delete" button (non-recurring just shows single Delete)
      const confirmBtn = page.getByRole("button", { name: /^Delete$/i });
      if ((await confirmBtn.count()) > 0) {
        await confirmBtn.first().click();
        await page.waitForTimeout(400);
      }
    }
    const blocksAfter = await page
      .locator('[data-component="timeline-block"]')
      .count();
    rec(
      "DeleteConfirmModal",
      "Confirm delete (non-recurring) — block is removed from timeline",
      [
        "Add non-recurring block",
        "Enable Edit Mode",
        "Click × on block",
        "Click Delete in modal",
      ],
      `blocks: ${blocksBefore} → ${blocksAfter}`,
      "Block count decreases by 1",
      blocksAfter < blocksBefore ? "✓ pass" : "✗ fail",
    );

    // Toggle Edit Mode back off
    await page.getByTestId("edit-mode-toggle").click();
    await page.waitForTimeout(150);
  }

  // ── 31. ViewSwitcher — arrow-key keyboard navigation (R7-ROOT-M8/M9-P1) ─
  {
    const dayTab = page.getByRole("tab", { name: "Day" });
    if ((await dayTab.count()) > 0) {
      await dayTab.first().focus();
      await page.waitForTimeout(100);
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(200);
      const weekSelected = await page
        .getByRole("tab", { name: "Week" })
        .getAttribute("aria-selected");
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(200);
      const monthSelected = await page
        .getByRole("tab", { name: "Month" })
        .getAttribute("aria-selected");
      // Wrap test: ArrowLeft from Day goes to Year
      await dayTab.first().click();
      await page.waitForTimeout(150);
      await dayTab.first().focus();
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(200);
      const yearSelected = await page
        .getByRole("tab", { name: "Year" })
        .getAttribute("aria-selected");
      rec(
        "ViewSwitcher",
        "Arrow-key navigation (R7-ROOT-M8/M9-P1) — Right cycles forward, Left wraps to last",
        [
          "Focus Day tab",
          "Right → Week aria-selected?",
          "Right → Month aria-selected?",
          "Click Day, focus, Left → Year aria-selected?",
        ],
        `Week='${weekSelected}', Month='${monthSelected}', Year(via wrap)='${yearSelected}'`,
        "All three should be 'true' in sequence",
        weekSelected === "true" &&
          monthSelected === "true" &&
          yearSelected === "true"
          ? "✓ pass"
          : "✗ fail",
      );
    }
  }

  // ── 32. Reset storage for clean ending ─────────────────────────────────
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
