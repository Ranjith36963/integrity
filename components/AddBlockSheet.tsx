"use client";
// AddBlockSheet — new for M2 (plan.md § Components — Add Block sheet):
// - Composes M0 <Sheet> + form: Title / Start / End / Recurrence / Category / Save / Cancel
// - Owns local form state + view toggle ('block' | 'newCategory')
// - Focus trap LOCAL to AddBlockSheet (SG-m2-09 — does NOT modify <Sheet> primitive)
// - Validation: isValidStart, isValidEnd, endAfterStart, isValidCustomRange (inline alerts)
// M4e retroactive upgrade: overlap warning → role="alert" + data-testid="overlap-warning"
//   + Save disabled when overlapping (replaces M2's soft role="status" / Save-enabled pattern).
//   Overlap engine now uses findOverlaps + selectAllTimedItems (includes timed loose bricks).
// - onSave(block) / onCancel() / onCreateCategory(category) props from BuildingClient
// - Single <Sheet> instance with view state; no nested portals (plan.md § Cross-cutting)
// - aria-label updates per view ("Add Block" vs "New Category")
// - Auto-select newly created category after Done (SG-m2-12)

import { useState, useRef, useEffect, useCallback } from "react";
import { uuid } from "@/lib/uuid";
import type { AppState, Block, Category, Recurrence } from "@/lib/types";
import {
  isValidStart,
  isValidEnd,
  endAfterStart,
  isValidCustomRange,
} from "@/lib/blockValidation";
import { findOverlaps, selectAllTimedItems } from "@/lib/overlap";
import { currentDayBlocks } from "@/lib/currentDayBlocks";
import { Sheet } from "@/components/ui/Sheet";
import { RecurrenceChips } from "@/components/RecurrenceChips";
import { CategoryPicker } from "@/components/CategoryPicker";
import { NewCategoryForm } from "@/components/NewCategoryForm";
import { haptics } from "@/lib/haptics";
import { today } from "@/lib/dharma";

interface Props {
  open: boolean;
  defaultStart: string;
  categories: Category[];
  blocks: Block[];
  /** M4e: full state for overlap detection against timed loose bricks. Optional for backward compat. */
  state?: AppState;
  onSave: (block: Block) => void;
  onCancel: () => void;
  onCreateCategory: (cat: Pick<Category, "id" | "name" | "color">) => void;
}

type View = "block" | "newCategory";

// R7-ROOT-M2-P0-1: the previous module-load constant
// `new Date().toISOString().slice(0, 10)` produced UTC midnight — same bug
// class as R1-P2-3 (Jan-1 negative-UTC). today() from lib/dharma.ts is the
// local-TZ canonical (via R7 isoToLocalDate). Read lazily inside the
// component on each render so a tab left open across midnight can't lock in
// yesterday's ISO.

export function AddBlockSheet({
  open,
  defaultStart,
  categories,
  blocks,
  state,
  onSave,
  onCancel,
  onCreateCategory,
}: Props) {
  const [view, setView] = useState<View>("block");
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState("");
  // R7-ROOT-M2-P0-1 + M2-07: today() is local-TZ canonical (R7 isoToLocalDate);
  // computed lazily inside the component so a tab open across midnight
  // doesn't lock in yesterday's ISO. defaultPersisted() applies the same
  // pattern.
  const [recurrence, setRecurrence] = useState<Recurrence>(() => ({
    kind: "just-today",
    date: today(),
  }));
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );

  const titleRef = useRef<HTMLInputElement>(null);
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);
  const sheetContentRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // Sync defaultStart prop → start state when the sheet opens.
  // AddBlockSheet is always mounted but initially closed (BuildingClient single-instance pattern).
  // When opened via the M4d chooser, the defaultStart prop changes at the same tick as open→true.
  // Without this sync, useState(defaultStart) keeps the stale "00:00" from initial mount.
  //
  // R7-ROOT-M2-06: also reset title/end/recurrence/selectedCategoryId/view on
  // each open. Pre-R7 these states leaked across sheet sessions (Cancel left
  // the form dirty so the next "+" reopened with stale values). Spec AC #12
  // requires "Cancel discards sheet state and closes" — this is now enforced
  // structurally on the open→true edge, not relying on Cancel to remember to
  // clear.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- M2-06 reset on open: defaultStart + clear stale form state per AC #12. The set fires before the user can interact with the freshly-shown sheet.
    setStart(defaultStart);
    setTitle("");
    setEnd("");
    setRecurrence({ kind: "just-today", date: today() });
    setSelectedCategoryId(null);
    setView("block");
  }, [open, defaultStart]);

  // Focus trap and autofocus.
  // R7-ROOT-M2-08: returnFocusRef is captured ONLY on the open→true edge
  // (deps reduced from [open, view] to [open]). Pre-R7 every view-toggle
  // (e.g., clicking "+ New") overwrote returnFocusRef with the toggled
  // button itself, so Cancel restored focus to a now-unmounted node instead
  // of the original "+" trigger.
  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement;
  }, [open]);

  // Autofocus: refocus on view change so block↔newCategory view shifts the cursor.
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      titleRef.current?.focus();
    }, 10);
    return () => clearTimeout(timer);
  }, [open, view]);

  // Focus trap: Tab/Shift+Tab cycles within the sheet
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const container = sheetContentRef.current;
      if (!container) return;

      // R7-ROOT-M2-10: dropped the dead .filter — the CSS selector already
      // excludes self-aria-disabled elements, and the previous filter was a
      // tautological `!closest(disabled) || getAttribute !== "true"`
      // (always true). If a future need to exclude ancestor-disabled trees
      // returns, use `&&` not `||`.
      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(
          'button:not([disabled]):not([aria-disabled="true"]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );

      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, view]);

  const handleClose = useCallback(() => {
    // Restore focus to the return target
    returnFocusRef.current?.focus();
    onCancel();
  }, [onCancel]);

  // Validation
  const titleValid = title.trim().length > 0;
  const startValid = isValidStart(start);
  const endEmpty = end === "";
  const endValid = endEmpty || isValidEnd(end);
  const endAfterStartOk = endEmpty || endAfterStart(start, end);
  const customRangeValid = isValidCustomRange(recurrence);

  const endPastMidnight = !endEmpty && !isValidEnd(end);
  const endBeforeStart =
    !endEmpty && isValidEnd(end) && !endAfterStart(start, end);

  const candidate = endEmpty ? null : { start, end };

  // M4e: use findOverlaps + selectAllTimedItems so timed loose bricks are also checked.
  // Only check when there is a valid end time AND title is filled (avoids noisy alerts).
  // M8: programStart is required on AppState (ADR-044); placeholder used here
  // because AddBlockSheet only needs blocks/categories/looseBricks for overlap detection.
  //
  // R7-ROOT-M2-14: filter `blocks` through currentDayBlocks(state) so blocks
  // the user deleted-today don't show as overlap candidates. Pre-R7 a recurring
  // block deleted for today was still "in the way" — user couldn't create a new
  // block at that slot.
  const effectiveState = state ?? {
    blocks,
    categories,
    looseBricks: [],
    programStart: "",
    currentDate: "", // M9b — placeholder for overlap detection only
    history: {}, // M9b — placeholder for overlap detection only
    deletions: {}, // M5 — placeholder for overlap detection only
  };
  const stateForOverlap = {
    ...effectiveState,
    blocks: currentDayBlocks(effectiveState),
  };
  const overlaps =
    titleValid && candidate
      ? findOverlaps(candidate, selectAllTimedItems(stateForOverlap))
      : [];
  const hasOverlap = overlaps.length > 0;

  const isValid =
    titleValid &&
    startValid &&
    endValid &&
    endAfterStartOk &&
    customRangeValid &&
    !hasOverlap;

  function handleSave() {
    if (!isValid) {
      haptics.medium();
      return;
    }
    // Defense-in-depth: read the LIVE DOM values via ref and re-validate.
    // React's value tracker can be bypassed by direct DOM mutation
    // (`el.value = "25:99"` + dispatchEvent), leaving React state stale
    // while the displayed value is invalid. Re-reading from the ref + the
    // pure HH:MM validator catches that case before any block is created.
    // Surfaced by the HOSTILE lifecycle audit's "invalid-time-25-99" probe.
    const liveStart = startInputRef.current?.value ?? start;
    const liveEndRaw = endInputRef.current?.value ?? end;
    const liveEndForBlock = liveEndRaw === "" ? undefined : liveEndRaw;
    if (!isValidStart(liveStart) || !isValidEnd(liveEndForBlock)) {
      haptics.medium();
      return;
    }
    const block: Block = {
      id: uuid(),
      name: title.trim(),
      start: liveStart,
      end: liveEndForBlock,
      recurrence,
      categoryId: selectedCategoryId,
      bricks: [],
    };
    onSave(block);
  }

  function handleCreateCategory(cat: Pick<Category, "id" | "name" | "color">) {
    onCreateCategory(cat);
    // Auto-select the newly created category (SG-m2-12)
    setSelectedCategoryId(cat.id);
    setView("block");
    // Refocus title after returning to block view
    setTimeout(() => titleRef.current?.focus(), 10);
  }

  function handleCancelCategory() {
    setView("block");
  }

  const sheetTitle = view === "block" ? "Add Block" : "New Category";

  return (
    <Sheet open={open} onClose={handleClose} title={sheetTitle}>
      <div
        ref={sheetContentRef}
        style={{ display: "flex", flexDirection: "column", flex: 1 }}
      >
        {view === "block" ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              flex: 1,
            }}
          >
            {/* Title */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "4px" }}
            >
              <label
                htmlFor="block-title"
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--fs-12)",
                  color: "var(--ink-dim)",
                }}
              >
                Title
              </label>
              <input
                ref={titleRef}
                id="block-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Morning pages, Workout, Stand-up…"
                autoFocus
                aria-describedby={
                  !titleValid && title !== "" ? "title-error" : undefined
                }
                style={{
                  height: "44px",
                  borderRadius: "8px",
                  border: "1px solid var(--ink-dim)",
                  background: "var(--bg-elev)",
                  color: "var(--ink)",
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--fs-14)",
                  padding: "0 12px",
                  width: "100%",
                }}
              />
            </div>

            {/* Start / End */}
            <div style={{ display: "flex", gap: "8px" }}>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <label
                  htmlFor="block-start"
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: "var(--fs-12)",
                    color: "var(--ink-dim)",
                  }}
                >
                  Start
                </label>
                <input
                  id="block-start"
                  ref={startInputRef}
                  type="text"
                  inputMode="numeric"
                  placeholder="HH:MM"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  style={{
                    height: "44px",
                    borderRadius: "8px",
                    border: "1px solid var(--ink-dim)",
                    background: "var(--bg-elev)",
                    color: "var(--ink)",
                    fontFamily: "var(--font-ui)",
                    fontSize: "var(--fs-14)",
                    padding: "0 12px",
                    width: "100%",
                  }}
                />
              </div>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <label
                  htmlFor="block-end"
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: "var(--fs-12)",
                    color: "var(--ink-dim)",
                  }}
                >
                  End (optional)
                </label>
                <input
                  id="block-end"
                  ref={endInputRef}
                  type="text"
                  inputMode="numeric"
                  placeholder="HH:MM"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  aria-invalid={
                    endPastMidnight || endBeforeStart ? "true" : "false"
                  }
                  style={{
                    height: "44px",
                    borderRadius: "8px",
                    border: `1px solid ${endPastMidnight || endBeforeStart ? "var(--accent-deep)" : "var(--ink-dim)"}`,
                    background: "var(--bg-elev)",
                    color: "var(--ink)",
                    fontFamily: "var(--font-ui)",
                    fontSize: "var(--fs-14)",
                    padding: "0 12px",
                    width: "100%",
                  }}
                />
              </div>
            </div>

            {/* End validation alerts */}
            {endBeforeStart && (
              <p
                role="alert"
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--fs-12)",
                  color: "var(--accent-deep)",
                  margin: 0,
                }}
              >
                End must be after Start
              </p>
            )}
            {endPastMidnight && (
              <p
                role="alert"
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--fs-12)",
                  color: "var(--accent-deep)",
                  margin: 0,
                }}
              >
                End must be before midnight
              </p>
            )}

            {/* Custom-range weekday error */}
            {!customRangeValid && (
              <p
                role="alert"
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--fs-12)",
                  color: "var(--accent-deep)",
                  margin: 0,
                }}
              >
                Pick at least one weekday
              </p>
            )}

            {/* M4e hard overlap warning — role=alert + Save disabled (ADR-042) */}
            {hasOverlap && (
              <p
                data-testid="overlap-warning"
                role="alert"
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--fs-12)",
                  color: "var(--accent-deep)",
                  margin: 0,
                }}
              >
                {`⚠ overlaps with ${overlaps
                  .slice(0, 3)
                  .map(
                    (it) =>
                      `${it.kind === "block" ? "Block" : "Brick"}: ${it.name}, ${it.start}–${it.end}`,
                  )
                  .join(
                    "; ",
                  )}${overlaps.length > 3 ? `; +${overlaps.length - 3} more` : ""}`}
              </p>
            )}

            {/* Recurrence chips */}
            <RecurrenceChips
              value={recurrence}
              onChange={setRecurrence}
              today={today()}
            />

            {/* Category picker */}
            <CategoryPicker
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
              onSkip={() => setSelectedCategoryId(null)}
              onRequestNewCategory={() => setView("newCategory")}
            />

            {/* Save — full-width primary action. The Sheet header owns the
                Close (×) affordance, so the action bar is single-purpose. */}
            <div
              style={{
                display: "flex",
                marginTop: "auto",
                paddingTop: "24px",
              }}
            >
              <button
                type="button"
                data-testid="add-block-save"
                aria-disabled={isValid ? "false" : "true"}
                aria-describedby={hasOverlap ? "block-save-hint" : undefined}
                onClick={handleSave}
                className="tap"
                style={{
                  flex: 1,
                  height: "48px",
                  borderRadius: "8px",
                  border: "none",
                  background: "var(--accent)",
                  color: "var(--bg)",
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--fs-14)",
                  cursor: isValid ? "pointer" : "not-allowed",
                  opacity: isValid ? 1 : 0.6,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Save
              </button>
              {hasOverlap && (
                <span id="block-save-hint" className="sr-only">
                  Resolve the overlap to save.
                </span>
              )}
            </div>
          </div>
        ) : (
          <NewCategoryForm
            onCreate={handleCreateCategory}
            onCancel={handleCancelCategory}
          />
        )}
      </div>
    </Sheet>
  );
}
