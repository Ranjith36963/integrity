"use client";
// DeleteConfirmModal — M5: confirmation modal for block/brick deletion.
// Composes ui/Modal (bottom-sheet, ESC-close, aria-modal, portal) and ui/Button.
// Three variants: recurring block (3 buttons), non-recurring block (2 buttons), brick (2 buttons).
// haptics.medium fires on any confirm choice; Cancel fires no haptic.

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { haptics } from "@/lib/haptics";

export type DeleteTarget =
  | { kind: "block"; recurring: boolean }
  | { kind: "brick" };

interface Props {
  open: boolean;
  target: DeleteTarget | null;
  onConfirmJustToday(): void;
  onConfirmAll(): void;
  onConfirmDelete(): void;
  onCancel(): void;
}

export function DeleteConfirmModal({
  open,
  target,
  onConfirmJustToday,
  onConfirmAll,
  onConfirmDelete,
  onCancel,
}: Props) {
  if (!open || !target) return null;

  const isBrick = target.kind === "brick";
  const isRecurringBlock = target.kind === "block" && target.recurring;
  const title = isBrick ? "Delete this brick?" : "Delete this block?";

  function handleJustToday() {
    haptics.medium();
    onConfirmJustToday();
  }

  function handleAll() {
    haptics.medium();
    onConfirmAll();
  }

  function handleDelete() {
    haptics.medium();
    onConfirmDelete();
  }

  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          paddingBottom: "16px",
        }}
      >
        {isRecurringBlock ? (
          // Recurring block: Just today + All recurrences + Cancel
          <>
            <Button variant="secondary" onClick={handleJustToday}>
              Just today
            </Button>
            <Button variant="primary" onClick={handleAll}>
              All recurrences
            </Button>
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </>
        ) : (
          // Non-recurring block or brick: Delete + Cancel
          <>
            <Button variant="primary" onClick={handleDelete}>
              Delete
            </Button>
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
