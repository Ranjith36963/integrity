/**
 * C-m0-007: Sheet closes on backdrop click and ESC; has data-variant="full"
 *           and padding-bottom: var(--safe-bottom).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sheet } from "./Sheet";

describe("C-m0-007: Sheet close affordances and safe-area padding", () => {
  it("calls onClose when backdrop is clicked", async () => {
    const spy = vi.fn();
    render(
      <Sheet open onClose={spy} title="Test">
        body
      </Sheet>,
    );
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
      <Sheet open onClose={spy} title="Test">
        body
      </Sheet>,
    );
    await userEvent.keyboard("{Escape}");
    expect(spy).toHaveBeenCalledOnce();
  });

  it("sheet root has data-variant='full'", () => {
    render(
      <Sheet open onClose={vi.fn()}>
        body
      </Sheet>,
    );
    const dialog = screen.getByRole("dialog");
    const sheet = dialog.querySelector("[data-variant='full']") as HTMLElement;
    expect(sheet).toBeTruthy();
  });

  it("sheet root has padding-bottom: var(--safe-bottom)", () => {
    render(
      <Sheet open onClose={vi.fn()}>
        body
      </Sheet>,
    );
    const dialog = screen.getByRole("dialog");
    const sheet = dialog.querySelector("[data-variant='full']") as HTMLElement;
    expect(sheet).toBeTruthy();
    expect(sheet.style.paddingBottom).toContain("var(--safe-bottom)");
  });

  it("dialog not in DOM when open=false", () => {
    render(
      <Sheet open={false} onClose={vi.fn()}>
        body
      </Sheet>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
