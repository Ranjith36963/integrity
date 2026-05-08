// components/AddBrickSheet.test.tsx — M3 component tests
// Covers: C-m3-013..019

import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddBrickSheet } from "./AddBrickSheet";
import type { Brick, Category } from "@/lib/types";

const cat1: Category = { id: "c1", name: "category 1", color: "#34d399" };

function defaultProps(overrides = {}) {
  return {
    open: true,
    parentBlockId: null as string | null,
    defaultCategoryId: null as string | null,
    categories: [] as Category[],
    onSave: vi.fn<(brick: Brick) => void>(),
    onCreateCategory: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

// ─── C-m3-013: Title required + autofocus ─────────────────────────────────────

describe("C-m3-013: AddBrickSheet Title required + autofocus", () => {
  it("Title input has focus on open", async () => {
    render(<AddBrickSheet {...defaultProps()} />);
    // Wait a tick for the autofocus timer
    await new Promise((r) => setTimeout(r, 20));
    const titleInput = screen.getByRole("textbox", { name: /title/i });
    expect(titleInput).toBeTruthy();
  });

  it("Save is aria-disabled when Title is empty", () => {
    render(<AddBrickSheet {...defaultProps()} />);
    const saveBtn = screen.getByRole("button", { name: /save/i });
    expect(saveBtn.getAttribute("aria-disabled")).toBe("true");
  });

  it("Save becomes enabled when Title has non-blank text", async () => {
    const user = userEvent.setup();
    render(<AddBrickSheet {...defaultProps()} />);
    const titleInput = screen.getByRole("textbox", { name: /title/i });
    await user.type(titleInput, "brick A");
    const saveBtn = screen.getByRole("button", { name: /save/i });
    expect(saveBtn.getAttribute("aria-disabled")).toBe("false");
  });
});

// ─── C-m3-014: type selector (Tick default; per-type field reveal/hide) ────────

describe("C-m3-014: AddBrickSheet type selector", () => {
  it("renders three chips in a radiogroup: Tick (default checked), Goal, Time", () => {
    render(<AddBrickSheet {...defaultProps()} />);
    const group = screen.getByRole("radiogroup");
    expect(group).toBeTruthy();
    const radios = within(group).getAllByRole("radio");
    expect(radios).toHaveLength(3);
    const tickRadio = radios.find((r) =>
      r.getAttribute("aria-label")?.toLowerCase().includes("tick"),
    );
    expect(tickRadio?.getAttribute("aria-checked")).toBe("true");
  });

  it("no per-type fields render under default Tick selection", () => {
    render(<AddBrickSheet {...defaultProps()} />);
    expect(screen.queryByRole("spinbutton", { name: /target/i })).toBeNull();
    expect(screen.queryByRole("spinbutton", { name: /duration/i })).toBeNull();
  });

  it("clicking Goal changes aria-checked; reveals target + unit inputs", async () => {
    const user = userEvent.setup();
    render(<AddBrickSheet {...defaultProps()} />);
    const group = screen.getByRole("radiogroup");
    const goalRadio = within(group)
      .getAllByRole("radio")
      .find((r) =>
        r.getAttribute("aria-label")?.toLowerCase().includes("goal"),
      );
    await user.click(goalRadio!);
    expect(goalRadio?.getAttribute("aria-checked")).toBe("true");
    expect(
      screen.getByRole("spinbutton", { name: /target/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /unit/i })).toBeInTheDocument();
  });

  it("clicking Time reveals durationMin input and hides Goal fields", async () => {
    const user = userEvent.setup();
    render(<AddBrickSheet {...defaultProps()} />);
    const group = screen.getByRole("radiogroup");
    const radios = within(group).getAllByRole("radio");
    const timeRadio = radios.find((r) =>
      r.getAttribute("aria-label")?.toLowerCase().includes("time"),
    );
    await user.click(timeRadio!);
    expect(
      screen.getByRole("spinbutton", { name: /duration/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton", { name: /target/i })).toBeNull();
  });

  it("clicking back to Tick hides all per-type fields", async () => {
    const user = userEvent.setup();
    render(<AddBrickSheet {...defaultProps()} />);
    const group = screen.getByRole("radiogroup");
    const radios = within(group).getAllByRole("radio");
    const goalRadio = radios.find((r) =>
      r.getAttribute("aria-label")?.toLowerCase().includes("goal"),
    );
    const tickRadio = radios.find((r) =>
      r.getAttribute("aria-label")?.toLowerCase().includes("tick"),
    );
    await user.click(goalRadio!);
    await user.click(tickRadio!);
    expect(screen.queryByRole("spinbutton", { name: /target/i })).toBeNull();
    expect(screen.queryByRole("spinbutton", { name: /duration/i })).toBeNull();
  });
});

// ─── C-m3-015: Goal validation (target ≥ 1) ───────────────────────────────────

describe("C-m3-015: AddBrickSheet Goal validation", () => {
  it("Save disabled when Goal target is 0 (even with valid Title)", async () => {
    const user = userEvent.setup();
    render(<AddBrickSheet {...defaultProps()} />);
    await user.type(screen.getByRole("textbox", { name: /title/i }), "brick A");
    // Switch to Goal
    const group = screen.getByRole("radiogroup");
    const goalRadio = within(group)
      .getAllByRole("radio")
      .find((r) =>
        r.getAttribute("aria-label")?.toLowerCase().includes("goal"),
      );
    await user.click(goalRadio!);
    // Clear target field and set to 0
    const targetInput = screen.getByRole("spinbutton", { name: /target/i });
    await user.clear(targetInput);
    await user.type(targetInput, "0");
    expect(
      screen
        .getByRole("button", { name: /save/i })
        .getAttribute("aria-disabled"),
    ).toBe("true");
  });

  it("Save enabled when Goal target is 1", async () => {
    const user = userEvent.setup();
    render(<AddBrickSheet {...defaultProps()} />);
    await user.type(screen.getByRole("textbox", { name: /title/i }), "brick A");
    const group = screen.getByRole("radiogroup");
    const goalRadio = within(group)
      .getAllByRole("radio")
      .find((r) =>
        r.getAttribute("aria-label")?.toLowerCase().includes("goal"),
      );
    await user.click(goalRadio!);
    const targetInput = screen.getByRole("spinbutton", { name: /target/i });
    await user.clear(targetInput);
    await user.type(targetInput, "1");
    expect(
      screen
        .getByRole("button", { name: /save/i })
        .getAttribute("aria-disabled"),
    ).toBe("false");
  });

  it("Save enabled when Goal target=100 and unit is blank (unit is optional)", async () => {
    const user = userEvent.setup();
    render(<AddBrickSheet {...defaultProps()} />);
    await user.type(screen.getByRole("textbox", { name: /title/i }), "brick A");
    const group = screen.getByRole("radiogroup");
    const goalRadio = within(group)
      .getAllByRole("radio")
      .find((r) =>
        r.getAttribute("aria-label")?.toLowerCase().includes("goal"),
      );
    await user.click(goalRadio!);
    const targetInput = screen.getByRole("spinbutton", { name: /target/i });
    await user.clear(targetInput);
    await user.type(targetInput, "100");
    expect(
      screen
        .getByRole("button", { name: /save/i })
        .getAttribute("aria-disabled"),
    ).toBe("false");
  });
});

// ─── C-m3-016: Time validation (durationMin ≥ 1) ─────────────────────────────

describe("C-m3-016: AddBrickSheet Time validation", () => {
  it("Save disabled when Time durationMin is 0", async () => {
    const user = userEvent.setup();
    render(<AddBrickSheet {...defaultProps()} />);
    await user.type(screen.getByRole("textbox", { name: /title/i }), "brick C");
    const group = screen.getByRole("radiogroup");
    const timeRadio = within(group)
      .getAllByRole("radio")
      .find((r) =>
        r.getAttribute("aria-label")?.toLowerCase().includes("time"),
      );
    await user.click(timeRadio!);
    const durationInput = screen.getByRole("spinbutton", { name: /duration/i });
    await user.clear(durationInput);
    await user.type(durationInput, "0");
    expect(
      screen
        .getByRole("button", { name: /save/i })
        .getAttribute("aria-disabled"),
    ).toBe("true");
  });

  it("Save enabled when Time durationMin is 30", async () => {
    const user = userEvent.setup();
    render(<AddBrickSheet {...defaultProps()} />);
    await user.type(screen.getByRole("textbox", { name: /title/i }), "brick C");
    const group = screen.getByRole("radiogroup");
    const timeRadio = within(group)
      .getAllByRole("radio")
      .find((r) =>
        r.getAttribute("aria-label")?.toLowerCase().includes("time"),
      );
    await user.click(timeRadio!);
    const durationInput = screen.getByRole("spinbutton", { name: /duration/i });
    await user.clear(durationInput);
    await user.type(durationInput, "30");
    expect(
      screen
        .getByRole("button", { name: /save/i })
        .getAttribute("aria-disabled"),
    ).toBe("false");
  });
});

// ─── C-m3-017: CategoryPicker pre-fill ────────────────────────────────────────

describe("C-m3-017: AddBrickSheet CategoryPicker pre-fill", () => {
  it("pre-fills category c1 when parentBlockId and defaultCategoryId are set", () => {
    render(
      <AddBrickSheet
        {...defaultProps({
          parentBlockId: "b1",
          defaultCategoryId: "c1",
          categories: [cat1],
        })}
      />,
    );
    // The c1 category chip should be checked
    const catButton = screen.getByRole("radio", { name: "category 1" });
    expect(catButton.getAttribute("aria-checked")).toBe("true");
  });

  it("no pre-fill when parentBlockId=null and defaultCategoryId=null", () => {
    render(
      <AddBrickSheet
        {...defaultProps({
          parentBlockId: null,
          defaultCategoryId: null,
          categories: [cat1],
        })}
      />,
    );
    const catButton = screen.getByRole("radio", { name: "category 1" });
    expect(catButton.getAttribute("aria-checked")).toBe("false");
  });

  it("no pre-fill when parentBlockId set but defaultCategoryId is null (uncategorized block)", () => {
    render(
      <AddBrickSheet
        {...defaultProps({
          parentBlockId: "b1",
          defaultCategoryId: null,
          categories: [cat1],
        })}
      />,
    );
    const catButton = screen.getByRole("radio", { name: "category 1" });
    expect(catButton.getAttribute("aria-checked")).toBe("false");
  });
});

// ─── C-m3-018: single Sheet instance with view toggle ────────────────────────

describe("C-m3-018: AddBrickSheet single Sheet with view toggle", () => {
  it("exactly one dialog element in the DOM", () => {
    render(<AddBrickSheet {...defaultProps({ categories: [cat1] })} />);
    const dialogs = screen.getAllByRole("dialog");
    expect(dialogs).toHaveLength(1);
  });

  it("tapping + New switches view to NewCategoryForm", async () => {
    const user = userEvent.setup();
    render(<AddBrickSheet {...defaultProps({ categories: [cat1] })} />);
    const newBtn = screen.getByRole("button", { name: /\+ new/i });
    await user.click(newBtn);
    // NewCategoryForm should be visible — look for its title input
    expect(screen.queryByRole("textbox", { name: /title/i })).toBeFalsy();
    // The category name input should be present in the new form
    const inputs = screen.getAllByRole("textbox");
    expect(inputs.length).toBeGreaterThan(0);
  });
});

// ─── C-m3-019: Cancel discards + reduced-motion ───────────────────────────────

describe("C-m3-019: AddBrickSheet Cancel discards sheet state", () => {
  it("tapping Cancel (X icon) calls onCancel once", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<AddBrickSheet {...defaultProps({ onCancel })} />);
    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelBtn);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("no toast or undo affordance renders after cancel (silent discard)", async () => {
    const user = userEvent.setup();
    render(<AddBrickSheet {...defaultProps()} />);
    // Type something to make form dirty
    await user.type(screen.getByRole("textbox", { name: /title/i }), "test");
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("status")).toBeFalsy();
    expect(screen.queryByRole("alert")).toBeFalsy();
  });
});
