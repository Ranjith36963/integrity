"use client";
// UnitsEntrySheet — NEW in M4f (plan.md § Component design <UnitsEntrySheet>).
// Opens when a units chip is tapped (C-m4f-010). Lets the user type the current
// done value for a units brick. Dispatches SET_UNITS_DONE via onSave callback.
//
// Design:
// - Uses M0 <Sheet> primitive for role=dialog + aria-modal + slide-in animation.
// - Heading: brick.name  (id="units-entry-heading" → aria-labelledby on Sheet)
// - Sub-heading: "Today's <unit>"
// - Single number input (type=number, inputMode=numeric, min=0, step=1)
//   - aria-label="Enter <unit> done today"
//   - pre-filled with brick.done; re-seeds via useEffect keyed on brick?.id
//   - auto-focuses and selects on open
// - Save button: aria-disabled when draft is invalid (non-digit / empty / negative)
//   - Valid Save: haptics.light + onSave(brick.id, Number(draft)) + onClose
//   - Disabled tap: haptics.medium + no dispatch
// - Cancel button: onClose only, no haptic
// - Validation: draft.trim() must match /^\d+$/ (non-negative integers only)
// - Accessibility: aria-describedby on Save → #units-save-hint (sr-only)
//
// ADR-043: timer removed; this is the sole units-done editing surface.

import { useState, useEffect, useRef } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { haptics } from "@/lib/haptics";
import type { Brick } from "@/lib/types";

interface Props {
  brick: Extract<Brick, { kind: "units" }> | null;
  open: boolean;
  onClose: () => void;
  /** Called with (brickId, newDone) when user confirms a valid integer. */
  onSave: (brickId: string, done: number) => void;
}

function isValidDraft(draft: string): boolean {
  return /^\d+$/.test(draft.trim());
}

export function UnitsEntrySheet({ brick, open, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<string>(() =>
    brick ? String(brick.done) : "",
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Re-seed draft when brick changes (single-sheet swap pattern per plan.md)
  useEffect(() => {
    if (brick) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- re-seeds draft on brick swap per C-m4f-008 single-sheet pattern (ADR-043)
      setDraft(String(brick.done));
    }
  }, [brick?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- keyed on id, not full brick

  // Auto-focus + select on open
  useEffect(() => {
    if (!open || !inputRef.current) return;
    const el = inputRef.current;
    // Small timeout to ensure DOM is visible before focus
    const tid = window.setTimeout(() => {
      el.focus();
      el.select();
    }, 0);
    return () => window.clearTimeout(tid);
  }, [open, brick?.id]);

  if (!brick) return null;

  const isValid = isValidDraft(draft);

  function handleSaveClick() {
    if (!isValid) {
      haptics.medium();
      return;
    }
    haptics.light();
    onSave(brick!.id, Number(draft.trim()));
    onClose();
  }

  function handleCancelClick() {
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      aria-labelledby="units-entry-heading"
      variant="compact"
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          padding: "24px 20px",
        }}
      >
        {/* Heading */}
        <div>
          <h2
            id="units-entry-heading"
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "var(--fs-20)",
              color: "var(--ink)",
              margin: 0,
            }}
          >
            {brick.name}
          </h2>
          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "var(--fs-14)",
              color: "var(--ink-dim)",
              margin: "4px 0 0",
            }}
          >
            {/* R7-ROOT-M4-P2-1: brick.unit can be empty string (UI labels
                it "Unit (optional)" in AddBrickSheet). Fall back to "count"
                so SR readout isn't "Today's " with a dangling trailing space
                and the visible text reads naturally. */}
            {brick.unit ? `Today's ${brick.unit}` : "Today's count"}
          </p>
        </div>

        {/* Number input */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <input
            ref={inputRef}
            id="units-entry-input"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            aria-label={
              brick.unit
                ? `Enter ${brick.unit} done today`
                : "Enter count done today"
            }
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "var(--fs-20)",
              color: "var(--ink)",
              background: "var(--bg-elev)",
              border: "1px solid var(--card-edge)",
              borderRadius: "8px",
              padding: "12px 16px",
              width: "100%",
              height: "48px",
              boxSizing: "border-box",
            }}
          />
          {/* sr-only hint — referenced by Save via aria-describedby */}
          <span
            id="units-save-hint"
            style={{
              position: "absolute",
              width: "1px",
              height: "1px",
              padding: 0,
              margin: "-1px",
              overflow: "hidden",
              clip: "rect(0,0,0,0)",
              whiteSpace: "nowrap",
              borderWidth: 0,
            }}
          >
            {isValid ? "" : "Enter a number to save."}
          </span>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "12px" }}>
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            aria-label="Cancel"
            onClick={handleCancelClick}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            className="flex-1"
            aria-label="Save"
            aria-disabled={isValid ? "false" : "true"}
            aria-describedby="units-save-hint"
            onClick={handleSaveClick}
            style={
              !isValid
                ? {
                    background: "var(--surface-2)",
                    color: "var(--ink-dim)",
                    opacity: 0.6,
                    cursor: "not-allowed",
                  }
                : undefined
            }
          >
            Save
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
