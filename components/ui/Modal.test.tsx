/**
 * C-m0-005: Modal closes on backdrop click and ESC; absent from DOM when open=false.
 * C-m0-006: Modal sheet root has padding-bottom referencing var(--safe-bottom).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "./Modal";

// C-m0-005
describe("C-m0-005: Modal close affordances and open prop", () => {
  it("calls onClose when backdrop is clicked", async () => {
    const spy = vi.fn();
    render(
      <Modal open onClose={spy} title="Test">
        body
      </Modal>,
    );
    // The backdrop is the div with aria-hidden=true and inset-0
    const backdrop = document.querySelector(
      '[aria-hidden="true"]',
    ) as HTMLElement;
    expect(backdrop).toBeTruthy();
    await userEvent.click(backdrop);
    expect(spy).toHaveBeenCalledOnce();
  });

  it("calls onClose when ESC is pressed", async () => {
    const spy = vi.fn();
    render(
      <Modal open onClose={spy} title="Test">
        body
      </Modal>,
    );
    await userEvent.keyboard("{Escape}");
    expect(spy).toHaveBeenCalledOnce();
  });

  it("dialog node is not in the DOM when open=false", () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Test">
        body
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("dialog is in the DOM when open=true", () => {
    render(
      <Modal open onClose={vi.fn()} title="Hi">
        body
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

// C-m0-006
describe("C-m0-006: Modal sheet root has padding-bottom: var(--safe-bottom)", () => {
  it("sheet root has inline padding-bottom referencing --safe-bottom", () => {
    render(
      <Modal open onClose={vi.fn()}>
        body
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    // The sheet is the direct child of the dialog wrapper
    const sheet = dialog.querySelector(
      "[data-variant='bottom-sheet']",
    ) as HTMLElement;
    expect(sheet).toBeTruthy();
    expect(sheet.style.paddingBottom).toContain("var(--safe-bottom)");
  });

  it("enforces ESC listener cleanup on unmount", () => {
    const spy = vi.fn();
    const { unmount } = render(
      <Modal open onClose={spy}>
        body
      </Modal>,
    );
    unmount();
    // Firing ESC after unmount should not call spy again
    fireEvent.keyDown(document, { key: "Escape" });
    expect(spy).not.toHaveBeenCalled();
  });
});
