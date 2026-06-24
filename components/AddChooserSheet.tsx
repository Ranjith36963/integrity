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
  // R7-ROOT-M2-09: also autofocus the first focusable inside the chooser on
  // open IF focus is currently outside the dialog. The "outside" check lets
  // tests (and any future caller) pre-position focus on a specific button
  // without being clobbered by the autofocus pass. setTimeout(10) ensures
  // the focus call runs AFTER the Sheet portal mounts.
  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement;
    const timer = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      const focusInside =
        document.activeElement instanceof Node &&
        container.contains(document.activeElement);
      if (focusInside) return;
      const firstButton = container.querySelector<HTMLElement>(
        "button:not([disabled]):not([aria-disabled='true'])",
      );
      firstButton?.focus();
    }, 10);
    return () => clearTimeout(timer);
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
    onPick("block");
  }

  function handleBrick() {
    haptics.light();
    onPick("brick");
  }

  return (
    <Sheet open={open} onClose={handleClose} title="Add" variant="compact">
      <div ref={containerRef}>
        <div
          role="group"
          aria-label="Choose what to add"
          className="flex flex-col gap-3 p-5 pt-0"
        >
          <Button
            variant="primary"
            className="w-full"
            onClick={handleBlock}
            aria-label="Add Block"
            data-testid="chooser-add-block"
          >
            Add Block
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={handleBrick}
            aria-label="Add Brick"
            data-testid="chooser-add-brick"
          >
            Add Brick
          </Button>
          <button
            type="button"
            data-testid="chooser-cancel"
            onClick={handleClose}
            aria-label="Cancel"
            className="tap mt-1 flex h-11 w-full items-center justify-center rounded-lg border border-[var(--ink-dim)] bg-transparent font-mono [font-size:var(--fs-14)] tracking-wide text-[var(--ink-dim)] uppercase hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            Cancel
          </button>
        </div>
      </div>
    </Sheet>
  );
}
