// components/DeleteConfirmModal.test.tsx — M5: DeleteConfirmModal variants
// Covers: C-m5-010, C-m5-011, C-m5-012

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DeleteConfirmModal } from "./DeleteConfirmModal";

vi.mock("@/lib/haptics", () => ({
  haptics: { light: vi.fn(), medium: vi.fn(), success: vi.fn() },
}));

let hapticsModule: { haptics: { medium: ReturnType<typeof vi.fn> } };

beforeEach(async () => {
  hapticsModule = (await import("@/lib/haptics")) as typeof hapticsModule;
  vi.clearAllMocks();
});

// ─── C-m5-010: recurring block — Just today / All recurrences / Cancel ────────

describe("C-m5-010: DeleteConfirmModal — recurring block shows three actions", () => {
  it("renders title 'Delete this block?' with three buttons for recurring block", () => {
    const onJustToday = vi.fn();
    const onAll = vi.fn();
    const onCancel = vi.fn();
    render(
      <DeleteConfirmModal
        open={true}
        target={{ kind: "block", recurring: true }}
        onConfirmJustToday={onJustToday}
        onConfirmAll={onAll}
        onConfirmDelete={vi.fn()}
        onCancel={onCancel}
      />,
    );
    expect(
      screen.getByRole("heading", { name: /delete this block\?/i }) ||
        screen.getByText(/delete this block\?/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /just today/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /all recurrences/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    // No single "Delete" button in recurring mode
    expect(screen.queryByRole("button", { name: /^delete$/i })).toBeNull();
  });

  it("Just today fires onConfirmJustToday once + haptics.medium", () => {
    const onJustToday = vi.fn();
    render(
      <DeleteConfirmModal
        open={true}
        target={{ kind: "block", recurring: true }}
        onConfirmJustToday={onJustToday}
        onConfirmAll={vi.fn()}
        onConfirmDelete={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /just today/i }));
    expect(onJustToday).toHaveBeenCalledTimes(1);
    expect(hapticsModule.haptics.medium).toHaveBeenCalledTimes(1);
  });

  it("All recurrences fires onConfirmAll once + haptics.medium", () => {
    const onAll = vi.fn();
    render(
      <DeleteConfirmModal
        open={true}
        target={{ kind: "block", recurring: true }}
        onConfirmJustToday={vi.fn()}
        onConfirmAll={onAll}
        onConfirmDelete={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /all recurrences/i }));
    expect(onAll).toHaveBeenCalledTimes(1);
    expect(hapticsModule.haptics.medium).toHaveBeenCalledTimes(1);
  });

  it("Cancel fires onCancel once, no haptic", () => {
    const onCancel = vi.fn();
    render(
      <DeleteConfirmModal
        open={true}
        target={{ kind: "block", recurring: true }}
        onConfirmJustToday={vi.fn()}
        onConfirmAll={vi.fn()}
        onConfirmDelete={vi.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(hapticsModule.haptics.medium).toHaveBeenCalledTimes(0);
  });
});

// ─── C-m5-011: non-recurring block — Delete + Cancel only ────────────────────

describe("C-m5-011: DeleteConfirmModal — non-recurring block shows Delete + Cancel", () => {
  it("renders 'Delete this block?' with Delete and Cancel, no Just today / All recurrences", () => {
    render(
      <DeleteConfirmModal
        open={true}
        target={{ kind: "block", recurring: false }}
        onConfirmJustToday={vi.fn()}
        onConfirmAll={vi.fn()}
        onConfirmDelete={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /^delete$/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /just today/i })).toBeNull();
    expect(
      screen.queryByRole("button", { name: /all recurrences/i }),
    ).toBeNull();
  });

  it("Delete fires onConfirmDelete once + haptics.medium", () => {
    const onConfirmDelete = vi.fn();
    render(
      <DeleteConfirmModal
        open={true}
        target={{ kind: "block", recurring: false }}
        onConfirmJustToday={vi.fn()}
        onConfirmAll={vi.fn()}
        onConfirmDelete={onConfirmDelete}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(onConfirmDelete).toHaveBeenCalledTimes(1);
    expect(hapticsModule.haptics.medium).toHaveBeenCalledTimes(1);
  });

  it("Cancel fires onCancel once, no haptic", () => {
    const onCancel = vi.fn();
    render(
      <DeleteConfirmModal
        open={true}
        target={{ kind: "block", recurring: false }}
        onConfirmJustToday={vi.fn()}
        onConfirmAll={vi.fn()}
        onConfirmDelete={vi.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(hapticsModule.haptics.medium).toHaveBeenCalledTimes(0);
  });
});

// ─── C-m5-012: brick variant — Delete + Cancel ───────────────────────────────

describe("C-m5-012: DeleteConfirmModal — brick variant shows Delete this brick? + Delete + Cancel", () => {
  it("renders 'Delete this brick?' with Delete and Cancel", () => {
    render(
      <DeleteConfirmModal
        open={true}
        target={{ kind: "brick" }}
        onConfirmJustToday={vi.fn()}
        onConfirmAll={vi.fn()}
        onConfirmDelete={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText(/delete this brick\?/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^delete$/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("Delete fires onConfirmDelete once + haptics.medium", () => {
    const onConfirmDelete = vi.fn();
    render(
      <DeleteConfirmModal
        open={true}
        target={{ kind: "brick" }}
        onConfirmJustToday={vi.fn()}
        onConfirmAll={vi.fn()}
        onConfirmDelete={onConfirmDelete}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(onConfirmDelete).toHaveBeenCalledTimes(1);
    expect(hapticsModule.haptics.medium).toHaveBeenCalledTimes(1);
  });

  it("modal does not render when open=false", () => {
    render(
      <DeleteConfirmModal
        open={false}
        target={{ kind: "brick" }}
        onConfirmJustToday={vi.fn()}
        onConfirmAll={vi.fn()}
        onConfirmDelete={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("ESC key calls onCancel (no destructive default)", () => {
    const onCancel = vi.fn();
    render(
      <DeleteConfirmModal
        open={true}
        target={{ kind: "brick" }}
        onConfirmJustToday={vi.fn()}
        onConfirmAll={vi.fn()}
        onConfirmDelete={vi.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
