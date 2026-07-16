"use client";
// AddChooserSheet — NEW in M4d (plan.md § Components — AddChooserSheet).
// Thin routing surface: opens <Sheet> with "Add Block" (primary) + "Add Brick" (secondary)
// + a Cancel button. Owns no form state. Fully driven by props.
// Focus trap follows the M2/M3 pattern (useFocusTrap via inline keydown handler).
// Per VERIFIER D2: Tab cycling is implemented explicitly to satisfy A-m4d-002.
// No new design tokens, no new motion — all inherited from <Sheet> + <Button>.

import { useEffect, useRef, useCallback } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { haptics } from "@/lib/haptics";

interface Props {
  open: boolean;
  onPick: (choice: "block" | "brick") => void;
  onCancel: () => void;
}

export function AddChooserSheet({ open, onPick, onCancel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // Store the element that triggered open so we can restore focus on close.
  // Focus the container div itself (tabIndex=-1) so that the FIRST Tab press
  // lands on "Add Block" (the first tabbable child). Focusing the first button
  // directly would mean Tab skips to "Add Brick" instead of "Add Block".
  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement;
    const container = containerRef.current;
    if (!container) return;
    if (container.contains(document.activeElement)) return;
    container.focus();
  }, [open]);

  // Focus trap: Tab/Shift+Tab cycles within the chooser dialog
  // Required by A-m4d-002 — Tab must cycle Add Block → Add Brick → Cancel → (back) Add Block
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const container = containerRef.current;
      if (!container) return;

      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(
          "button:not([disabled]):not([aria-disabled='true'])",
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
  }, [open]);

  const handleClose = useCallback(() => {
    returnFocusRef.current?.focus();
    onCancel();
  }, [onCancel]);

  function handleBlock() {
    haptics.light();
    // Restore focus to the original trigger before the chooser DOM is removed,
    // so downstream sheets (AddBlockSheet) capture the correct returnFocusRef.
    returnFocusRef.current?.focus();
    onPick("block");
  }

  function handleBrick() {
    haptics.light();
    returnFocusRef.current?.focus();
    onPick("brick");
  }

  return (
    <Sheet open={open} onClose={handleClose} title="Add" variant="compact">
      <div ref={containerRef} tabIndex={-1} style={{ outline: "none" }}>
        <div
          role="group"
          aria-label="Choose what to add"
          className="flex flex-col gap-3 p-5 pt-0"
        >
          <Button
            variant="primary"
            size="md"
            className="w-full"
            onClick={handleBlock}
            aria-label="Add Block"
            data-testid="chooser-add-block"
          >
            Add Block
          </Button>
          {/* Same glass-primary weight as Add Block (per user): both are
              first-class creation paths, not a primary/secondary pair. */}
          <Button
            variant="primary"
            size="md"
            className="w-full"
            onClick={handleBrick}
            aria-label="Add Brick"
            data-testid="chooser-add-brick"
          >
            Add Brick
          </Button>
          <Button
            variant="ghost"
            size="md"
            className="w-full"
            onClick={handleClose}
            aria-label="Cancel"
            data-testid="chooser-cancel"
          >
            Cancel
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
