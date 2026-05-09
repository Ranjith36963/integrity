"use client";
// AddBlockSheet — new for M2 (plan.md § Components — Add Block sheet):
// - Composes M0 <Sheet> + form: Title / Start / End / Recurrence / Category / Save / Cancel
// - Owns local form state + view toggle ('block' | 'newCategory')
// - Focus trap LOCAL to AddBlockSheet (SG-m2-09 — does NOT modify <Sheet> primitive)
// - Validation: isValidStart, isValidEnd, endAfterStart, isValidCustomRange (inline alerts)
// - Soft overlap warning: overlapsExistingBlock → role="status" (Save still enabled)
// - onSave(block) / onCancel() / onCreateCategory(category) props from BuildingClient
// - Single <Sheet> instance with view state; no nested portals (plan.md § Cross-cutting)
// - aria-label updates per view ("Add Block" vs "New Category")
// - Auto-select newly created category after Done (SG-m2-12)

import { useState, useRef, useEffect, useCallback } from "react";
import { uuid } from "@/lib/uuid";
import type { Block, Category, Recurrence } from "@/lib/types";
import {
  isValidStart,
  isValidEnd,
  endAfterStart,
  overlapsExistingBlock,
  isValidCustomRange,
} from "@/lib/blockValidation";
import { Sheet } from "@/components/ui/Sheet";
import { RecurrenceChips } from "@/components/RecurrenceChips";
import { CategoryPicker } from "@/components/CategoryPicker";
import { NewCategoryForm } from "@/components/NewCategoryForm";

interface Props {
  open: boolean;
  defaultStart: string;
  categories: Category[];
  blocks: Block[];
  onSave: (block: Block) => void;
  onCancel: () => void;
  onCreateCategory: (cat: Pick<Category, "id" | "name" | "color">) => void;
}

type View = "block" | "newCategory";

const TODAY_ISO = new Date().toISOString().slice(0, 10);

export function AddBlockSheet({
  open,
  defaultStart,
  categories,
  blocks,
  onSave,
  onCancel,
  onCreateCategory,
}: Props) {
  const [view, setView] = useState<View>("block");
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>({
    kind: "just-today",
    date: TODAY_ISO,
  });
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );

  const titleRef = useRef<HTMLInputElement>(null);
  const sheetContentRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // Sync defaultStart prop → start state when the sheet opens.
  // AddBlockSheet is always mounted but initially closed (BuildingClient single-instance pattern).
  // When opened via the M4d chooser, the defaultStart prop changes at the same tick as open→true.
  // Without this sync, useState(defaultStart) keeps the stale "00:00" from initial mount.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional prop-sync on open per M4d chooser routing (SG-m4d-03); same pattern as AddBrickSheet defaultCategoryId sync (SG-m3-04)
    setStart(defaultStart);
  }, [open, defaultStart]);

  // Focus trap and autofocus
  useEffect(() => {
    if (!open) return;
    // Store return target
    returnFocusRef.current = document.activeElement as HTMLElement;

    // Autofocus title input after mount
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

      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(
          'button:not([disabled]):not([aria-disabled="true"]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(
        (el) =>
          !el.closest("[aria-disabled='true']") ||
          el.getAttribute("aria-disabled") !== "true",
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

  const candidate = endEmpty ? { start } : { start, end };
  const overlapping = titleValid
    ? overlapsExistingBlock(blocks, candidate)
    : null;

  const isValid =
    titleValid && startValid && endValid && endAfterStartOk && customRangeValid;

  function handleSave() {
    if (!isValid) return;
    const block: Block = {
      id: uuid(),
      name: title.trim(),
      start,
      end: endEmpty ? undefined : end,
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
      <div ref={sheetContentRef}>
        {view === "block" ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
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
                placeholder="Block name"
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

            {/* Soft overlap warning */}
            {overlapping && (
              <p
                role="status"
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--fs-12)",
                  color: "var(--ink-dim)",
                  margin: 0,
                }}
              >
                Overlaps with {overlapping.name}
              </p>
            )}

            {/* Recurrence chips */}
            <RecurrenceChips
              value={recurrence}
              onChange={setRecurrence}
              today={TODAY_ISO}
            />

            {/* Category picker */}
            <CategoryPicker
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
              onSkip={() => setSelectedCategoryId(null)}
              onRequestNewCategory={() => setView("newCategory")}
            />

            {/* Save + Cancel */}
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <button
                type="button"
                aria-disabled={isValid ? "false" : "true"}
                onClick={handleSave}
                style={{
                  flex: 1,
                  height: "44px",
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
              <button
                type="button"
                onClick={handleClose}
                aria-label="Cancel"
                style={{
                  height: "44px",
                  width: "44px",
                  borderRadius: "8px",
                  border: "1px solid var(--ink-dim)",
                  background: "transparent",
                  color: "var(--ink-dim)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                ×
              </button>
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
