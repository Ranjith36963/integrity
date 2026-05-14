"use client";
// AddBrickSheet — M3 foundation; M4e adds universal duration axis (ADR-042).
// Mirrors M2's <AddBlockSheet> single-Sheet-instance pattern.
// View toggle: 'brick' | 'newCategory' — single <Sheet> instance.
// M4e additions: Duration toggle (role="switch"), Start/End inputs,
//   RecurrenceChips, overlap detection via selectAllTimedItems + findOverlaps,
//   overlap-warning chip (role="alert"), Save-disable with haptics.medium.
// SG-m4e-07: field reveal is instant — no AnimatePresence wrapper.
// SG-m4e-08: RecurrenceChips reused verbatim from M2.

import { useState, useRef, useEffect, useCallback } from "react";
import { uuid } from "@/lib/uuid";
import type { AppState, Brick, Category, Recurrence } from "@/lib/types";
import {
  isValidBrickGoal,
  isValidBrickTime,
  endAfterStart,
  isValidCustomRange,
} from "@/lib/blockValidation";
import { findOverlaps, selectAllTimedItems } from "@/lib/overlap";
import { toMin } from "@/lib/dharma";
import { Sheet } from "@/components/ui/Sheet";
import { Toggle } from "@/components/ui/Toggle";
import { CategoryPicker } from "@/components/CategoryPicker";
import { NewCategoryForm } from "@/components/NewCategoryForm";
import { RecurrenceChips } from "@/components/RecurrenceChips";
import { haptics } from "@/lib/haptics";

// Today's ISO date for RecurrenceChips default
function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Current hour floored to HH:00
function currentHourFloor(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:00`;
}

// Add 30 minutes to an HH:MM string (wraps within same day)
function addThirtyMin(hhmm: string): string {
  const [hh, mm] = hhmm.split(":").map(Number);
  const total = hh * 60 + (mm ?? 0) + 30;
  const newHH = Math.floor(total / 60) % 24;
  const newMM = total % 60;
  return `${String(newHH).padStart(2, "0")}:${String(newMM).padStart(2, "0")}`;
}

interface Props {
  open: boolean;
  parentBlockId: string | null;
  defaultCategoryId: string | null;
  categories: Category[];
  state: AppState;
  onSave: (brick: Brick) => void;
  onCreateCategory: (cat: Pick<Category, "id" | "name" | "color">) => void;
  onCancel: () => void;
}

type View = "brick" | "newCategory";
type BrickKind = "tick" | "goal" | "time";

const DEFAULT_RECURRENCE: Recurrence = {
  kind: "just-today",
  date: "2026-05-14",
};

export function AddBrickSheet({
  open,
  parentBlockId,
  defaultCategoryId,
  categories,
  state,
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

  // M4e: Duration axis state
  const [hasDuration, setHasDuration] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>(DEFAULT_RECURRENCE);

  const titleRef = useRef<HTMLInputElement>(null);
  const sheetContentRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // Sync pre-fill when defaultCategoryId prop changes (SG-m3-04).
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

  // M4e: Duration toggle handler
  function handleDurationToggle() {
    haptics.light();
    if (!hasDuration) {
      // Turning ON: fill defaults
      if (parentBlockId !== null) {
        // Nested: use parent block's start/end
        const parentBlock = state.blocks.find((b) => b.id === parentBlockId);
        if (parentBlock) {
          setStart(parentBlock.start);
          setEnd(parentBlock.end ?? addThirtyMin(parentBlock.start));
        } else {
          const floor = currentHourFloor();
          setStart(floor);
          setEnd(addThirtyMin(floor));
        }
      } else {
        // Loose: current hour floor + 30 min
        const floor = currentHourFloor();
        setStart(floor);
        setEnd(addThirtyMin(floor));
      }
      setRecurrence({ kind: "just-today", date: todayISO() });
    }
    setHasDuration((prev) => !prev);
  }

  // M4e: Validation for time fields
  const startEndValid =
    !hasDuration ||
    (start.length > 0 && end.length > 0 && endAfterStart(start, end));
  const recurrenceValid = !hasDuration || isValidCustomRange(recurrence);

  // Determine the alert message for time validation
  let timeAlertMsg: string | null = null;
  if (hasDuration && start.length > 0 && end.length > 0) {
    if (!endAfterStart(start, end)) {
      // end is not after start — check if it looks like a midnight straddle
      // (i.e. end is in the early hours of the "next day" relative to start)
      const startMins = toMin(start);
      const endMins = toMin(end);
      // Straddle heuristic: start is in the evening and end is very early (large gap > 12h)
      if (startMins > endMins && startMins - endMins > 12 * 60) {
        timeAlertMsg = "Start and end must be on the same day";
      } else {
        timeAlertMsg = "End must be after start";
      }
    }
  }

  // M4e: Overlap detection
  const overlaps =
    hasDuration && start.length > 0 && end.length > 0 && !timeAlertMsg
      ? findOverlaps(
          { start, end },
          selectAllTimedItems(state),
          undefined, // no excludeId for new brick
        )
      : [];

  const hasOverlap = overlaps.length > 0;

  // Validation
  const titleValid = title.trim().length > 0;
  const target = parseInt(targetStr, 10);
  const durationMin = parseInt(durationStr, 10);
  const goalValid = kind !== "goal" || isValidBrickGoal(target);
  const timeValid = kind !== "time" || isValidBrickTime(durationMin);
  const isValid =
    titleValid &&
    goalValid &&
    timeValid &&
    startEndValid &&
    !timeAlertMsg &&
    recurrenceValid &&
    !hasOverlap;

  function handleSave() {
    if (!isValid) {
      haptics.medium();
      return;
    }
    haptics.success();

    const durationFields: Pick<
      import("@/lib/types").BrickBase,
      "hasDuration" | "start" | "end" | "recurrence"
    > = hasDuration
      ? { hasDuration: true, start, end, recurrence }
      : { hasDuration: false };

    let brick: Brick;
    if (kind === "tick") {
      brick = {
        id: uuid(),
        name: title.trim(),
        kind: "tick",
        done: false,
        categoryId: selectedCategoryId,
        parentBlockId,
        ...durationFields,
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
        ...durationFields,
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
        ...durationFields,
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

  // Overlap chip content: max 3 named items + "+N more"
  function overlapChipText(): string {
    const listed = overlaps.slice(0, 3);
    const extra = overlaps.length - 3;
    const parts = listed.map(
      (item) =>
        `${item.kind === "block" ? "Block" : "Brick"}: ${item.name}, ${item.start}–${item.end}`,
    );
    const base = parts.join("; ");
    return extra > 0 ? `${base}; +${extra} more` : base;
  }

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

            {/* M4e: Duration toggle row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <Toggle
                pressed={hasDuration}
                onPressedChange={handleDurationToggle}
                label="Duration"
              />
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "var(--fs-14)",
                  color: "var(--ink-dim)",
                }}
              >
                Duration
              </span>
            </div>

            {/* M4e: Time-window fields — instant reveal, no AnimatePresence */}
            {hasDuration && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {/* Start / End inputs */}
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
                      htmlFor="brick-start"
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: "var(--fs-12)",
                        color: "var(--ink-dim)",
                      }}
                    >
                      Start
                    </label>
                    <input
                      id="brick-start"
                      type="time"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                      aria-label="Start"
                      style={{
                        height: "44px",
                        borderRadius: "8px",
                        border: "1px solid var(--ink-dim)",
                        background: "var(--bg-elev)",
                        color: "var(--ink)",
                        fontFamily: "var(--font-mono)",
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
                      htmlFor="brick-end"
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: "var(--fs-12)",
                        color: "var(--ink-dim)",
                      }}
                    >
                      End
                    </label>
                    <input
                      id="brick-end"
                      type="time"
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                      aria-label="End"
                      style={{
                        height: "44px",
                        borderRadius: "8px",
                        border: "1px solid var(--ink-dim)",
                        background: "var(--bg-elev)",
                        color: "var(--ink)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "var(--fs-14)",
                        padding: "0 12px",
                        width: "100%",
                      }}
                    />
                  </div>
                </div>

                {/* Time validation alert */}
                {timeAlertMsg && (
                  <div
                    role="alert"
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: "var(--fs-12)",
                      color: "var(--error, #ef4444)",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: "rgba(239,68,68,0.1)",
                    }}
                  >
                    {timeAlertMsg}
                  </div>
                )}

                {/* Custom-range weekday validation alert */}
                {!timeAlertMsg &&
                  recurrence.kind === "custom-range" &&
                  recurrence.weekdays.length === 0 && (
                    <div
                      role="alert"
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: "var(--fs-12)",
                        color: "var(--error, #ef4444)",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: "rgba(239,68,68,0.1)",
                      }}
                    >
                      Pick at least one weekday
                    </div>
                  )}

                {/* Overlap warning chip */}
                {!timeAlertMsg && hasOverlap && (
                  <div
                    role="alert"
                    data-testid="overlap-warning"
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: "var(--fs-12)",
                      color: "var(--error, #ef4444)",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: "rgba(239,68,68,0.1)",
                    }}
                  >
                    {overlapChipText()}
                  </div>
                )}

                {/* Recurrence chips */}
                <RecurrenceChips
                  value={recurrence}
                  onChange={setRecurrence}
                  today={todayISO()}
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
