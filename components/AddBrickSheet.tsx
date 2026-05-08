"use client";
// AddBrickSheet — NEW in M3 (plan.md § Components — <AddBrickSheet>).
// Mirrors M2's <AddBlockSheet> single-Sheet-instance pattern.
// View toggle: 'brick' | 'newCategory' — single <Sheet> instance.
// Props: open, parentBlockId, defaultCategoryId, categories, onSave, onCreateCategory, onCancel.
// Accessibility: role="dialog" from Sheet, radiogroup for type selector, autofocus title.
// Focus trap per M2 pattern.

import { useState, useRef, useEffect, useCallback } from "react";
import { uuid } from "@/lib/uuid";
import type { Brick, Category } from "@/lib/types";
import { isValidBrickGoal, isValidBrickTime } from "@/lib/blockValidation";
import { Sheet } from "@/components/ui/Sheet";
import { CategoryPicker } from "@/components/CategoryPicker";
import { NewCategoryForm } from "@/components/NewCategoryForm";
import { haptics } from "@/lib/haptics";

interface Props {
  open: boolean;
  parentBlockId: string | null;
  defaultCategoryId: string | null;
  categories: Category[];
  onSave: (brick: Brick) => void;
  onCreateCategory: (cat: Pick<Category, "id" | "name" | "color">) => void;
  onCancel: () => void;
}

type View = "brick" | "newCategory";
type BrickKind = "tick" | "goal" | "time";

export function AddBrickSheet({
  open,
  parentBlockId,
  defaultCategoryId,
  categories,
  onSave,
  onCreateCategory,
  onCancel,
}: Props) {
  const [view, setView] = useState<View>("brick");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<BrickKind>("tick");
  const [targetStr, setTargetStr] = useState("");
  const [unit, setUnit] = useState("");
  const [durationStr, setDurationStr] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    defaultCategoryId,
  );

  const titleRef = useRef<HTMLInputElement>(null);
  const sheetContentRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // Sync pre-fill when defaultCategoryId prop changes (SG-m3-04: parent block's
  // category pre-fills inside-block; null for standalone). Acceptable prop-sync
  // here because the sheet is mounted continuously and prop changes when the
  // user opens it for a different parent block.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional prop-sync per SG-m3-04
    setSelectedCategoryId(defaultCategoryId);
  }, [defaultCategoryId, open]);

  // Focus trap and autofocus
  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement;
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
      ).filter((el) => el.getAttribute("aria-disabled") !== "true");
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
    returnFocusRef.current?.focus();
    onCancel();
  }, [onCancel]);

  // Validation
  const titleValid = title.trim().length > 0;
  const target = parseInt(targetStr, 10);
  const durationMin = parseInt(durationStr, 10);
  const goalValid = kind !== "goal" || isValidBrickGoal(target);
  const timeValid = kind !== "time" || isValidBrickTime(durationMin);
  const isValid = titleValid && goalValid && timeValid;

  function handleSave() {
    if (!isValid) {
      haptics.medium();
      return;
    }
    haptics.success();
    let brick: Brick;
    if (kind === "tick") {
      brick = {
        id: uuid(),
        name: title.trim(),
        kind: "tick",
        done: false,
        categoryId: selectedCategoryId,
        parentBlockId,
      };
    } else if (kind === "goal") {
      brick = {
        id: uuid(),
        name: title.trim(),
        kind: "goal",
        target,
        count: 0,
        unit: unit.trim(),
        categoryId: selectedCategoryId,
        parentBlockId,
      };
    } else {
      brick = {
        id: uuid(),
        name: title.trim(),
        kind: "time",
        durationMin,
        minutesDone: 0,
        categoryId: selectedCategoryId,
        parentBlockId,
      };
    }
    onSave(brick);
  }

  function handleKindSelect(k: BrickKind) {
    haptics.light();
    setKind(k);
  }

  function handleCreateCategory(cat: Pick<Category, "id" | "name" | "color">) {
    onCreateCategory(cat);
    setSelectedCategoryId(cat.id);
    setView("brick");
    setTimeout(() => titleRef.current?.focus(), 10);
  }

  function handleCancelCategory() {
    setView("brick");
  }

  const sheetTitle = view === "brick" ? "Add Brick" : "New Category";

  return (
    <Sheet open={open} onClose={handleClose} title={sheetTitle}>
      <div ref={sheetContentRef}>
        {view === "brick" ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {/* Title */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "4px" }}
            >
              <label
                htmlFor="brick-title"
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
                id="brick-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brick name"
                autoFocus
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

            {/* Type selector */}
            <div
              role="radiogroup"
              aria-label="Brick type"
              style={{ display: "flex", gap: "8px" }}
            >
              {(["tick", "goal", "time"] as BrickKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-label={k.charAt(0).toUpperCase() + k.slice(1)}
                  aria-checked={kind === k}
                  onClick={() => handleKindSelect(k)}
                  style={{
                    flex: 1,
                    minHeight: "44px",
                    minWidth: "44px",
                    borderRadius: "8px",
                    border:
                      kind === k
                        ? "2px solid var(--accent)"
                        : "1px solid var(--ink-dim)",
                    background:
                      kind === k ? "rgba(245,158,11,0.1)" : "transparent",
                    color: kind === k ? "var(--accent)" : "var(--ink-dim)",
                    fontFamily: "var(--font-ui)",
                    fontSize: "var(--fs-12)",
                    cursor: "pointer",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>

            {/* Per-type fields */}
            {kind === "goal" && (
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
                    htmlFor="brick-target"
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: "var(--fs-12)",
                      color: "var(--ink-dim)",
                    }}
                  >
                    Target
                  </label>
                  <input
                    id="brick-target"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={targetStr}
                    onChange={(e) => setTargetStr(e.target.value)}
                    placeholder="e.g. 100"
                    aria-label="Target"
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
                    htmlFor="brick-unit"
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: "var(--fs-12)",
                      color: "var(--ink-dim)",
                    }}
                  >
                    Unit (optional)
                  </label>
                  <input
                    id="brick-unit"
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="e.g. reps"
                    aria-label="Unit"
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
              </div>
            )}

            {kind === "time" && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "4px" }}
              >
                <label
                  htmlFor="brick-duration"
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: "var(--fs-12)",
                    color: "var(--ink-dim)",
                  }}
                >
                  Duration (minutes)
                </label>
                <input
                  id="brick-duration"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={durationStr}
                  onChange={(e) => setDurationStr(e.target.value)}
                  placeholder="e.g. 30"
                  aria-label="Duration in minutes"
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
            )}

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
                aria-label="Save"
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
