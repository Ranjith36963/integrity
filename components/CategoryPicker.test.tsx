import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CategoryPicker } from "./CategoryPicker";
import type { Category } from "@/lib/types";

// C-m2-009: CategoryPicker — zero categories shows only "+ New" + "Skip"
describe("C-m2-009: CategoryPicker — zero categories renders only + New and Skip", () => {
  it("renders Skip and + New buttons when categories=[]", () => {
    render(
      <CategoryPicker
        categories={[]}
        selectedCategoryId={null}
        onSelect={vi.fn()}
        onSkip={vi.fn()}
        onRequestNewCategory={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Skip/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /\+ New/i })).toBeInTheDocument();
  });

  it("renders no category chips when categories=[]", () => {
    render(
      <CategoryPicker
        categories={[]}
        selectedCategoryId={null}
        onSelect={vi.fn()}
        onSkip={vi.fn()}
        onRequestNewCategory={vi.fn()}
      />,
    );
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();
  });

  it("clicking + New calls onRequestNewCategory", async () => {
    const mockNew = vi.fn();
    const user = userEvent.setup();
    render(
      <CategoryPicker
        categories={[]}
        selectedCategoryId={null}
        onSelect={vi.fn()}
        onSkip={vi.fn()}
        onRequestNewCategory={mockNew}
      />,
    );
    await user.click(screen.getByRole("button", { name: /\+ New/i }));
    expect(mockNew).toHaveBeenCalledTimes(1);
  });

  it("clicking Skip calls onSkip", async () => {
    const mockSkip = vi.fn();
    const user = userEvent.setup();
    render(
      <CategoryPicker
        categories={[]}
        selectedCategoryId={null}
        onSelect={vi.fn()}
        onSkip={mockSkip}
        onRequestNewCategory={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Skip/i }));
    expect(mockSkip).toHaveBeenCalledTimes(1);
  });

  it("two same-name categories render as distinct chips with different data-category-id", () => {
    const categories: Category[] = [
      { id: "c1", name: "Health", color: "#34d399" },
      { id: "c2", name: "Health", color: "#fb7185" },
    ];
    render(
      <CategoryPicker
        categories={categories}
        selectedCategoryId={null}
        onSelect={vi.fn()}
        onSkip={vi.fn()}
        onRequestNewCategory={vi.fn()}
      />,
    );
    const chips = screen.getAllByRole("radio");
    expect(chips).toHaveLength(2);
    expect(chips[0].getAttribute("data-category-id")).toBe("c1");
    expect(chips[1].getAttribute("data-category-id")).toBe("c2");
  });
});
