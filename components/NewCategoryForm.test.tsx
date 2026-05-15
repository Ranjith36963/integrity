import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewCategoryForm } from "./NewCategoryForm";

vi.mock("@/lib/uuid", () => ({ uuid: () => "uuid-test-1" }));

// C-m2-010: NewCategoryForm — Name + 12-color palette grid
describe("C-m2-010: NewCategoryForm Name input and 12-color palette", () => {
  it("renders a Name input", () => {
    render(<NewCategoryForm onCreate={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
  });

  it("renders exactly 12 color swatches with role='radio' and aria-label 'Color N'", () => {
    render(<NewCategoryForm onCreate={vi.fn()} onCancel={vi.fn()} />);
    const swatches = screen.getAllByRole("radio");
    expect(swatches).toHaveLength(12);
    for (let i = 1; i <= 12; i++) {
      expect(
        screen.getByRole("radio", { name: `Color ${i}` }),
      ).toBeInTheDocument();
    }
  });

  it("each swatch background uses var(--cat-N), not inline hex", () => {
    render(<NewCategoryForm onCreate={vi.fn()} onCancel={vi.fn()} />);
    const radioGroup = screen.getByRole("radiogroup");
    const swatches = radioGroup.querySelectorAll(
      "button",
    ) as NodeListOf<HTMLElement>;
    expect(swatches).toHaveLength(12);
    swatches.forEach((swatch, i) => {
      const bg = swatch.style.background ?? swatch.style.backgroundColor;
      // Should reference CSS var, not raw hex
      expect(bg).toContain(`var(--cat-${i + 1})`);
    });
  });

  it("Done button is aria-disabled=true initially (Name blank, no color)", () => {
    render(<NewCategoryForm onCreate={vi.fn()} onCancel={vi.fn()} />);
    const done = screen.getByRole("button", { name: /Done/i });
    expect(done).toHaveAttribute("aria-disabled", "true");
  });

  it("Done button aria-disabled flips to false after typing Name AND selecting color", async () => {
    const user = userEvent.setup();
    render(<NewCategoryForm onCreate={vi.fn()} onCancel={vi.fn()} />);
    const nameInput = screen.getByLabelText(/Name/i);
    await user.type(nameInput, "Health");
    // Done should still be disabled (no color yet)
    expect(screen.getByRole("button", { name: /Done/i })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    // Select Color 1
    await user.click(screen.getByRole("radio", { name: "Color 1" }));
    expect(screen.getByRole("button", { name: /Done/i })).toHaveAttribute(
      "aria-disabled",
      "false",
    );
  });

  it("clicking Done calls onCreate with id, name, and color hex", async () => {
    const onCreate = vi.fn();
    const user = userEvent.setup();
    render(<NewCategoryForm onCreate={onCreate} onCancel={vi.fn()} />);
    await user.type(screen.getByLabelText(/Name/i), "Health");
    await user.click(screen.getByRole("radio", { name: "Color 1" }));
    await user.click(screen.getByRole("button", { name: /Done/i }));
    expect(onCreate).toHaveBeenCalledWith({
      id: "uuid-test-1",
      name: "Health",
      color: "#34d399",
    });
  });
});
