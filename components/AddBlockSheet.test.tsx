import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddBlockSheet } from "./AddBlockSheet";
import type { Block } from "@/lib/types";

vi.mock("@/lib/uuid", () => ({ uuid: () => "uuid-1" }));

const mockSave = vi.fn();
const mockCancel = vi.fn();
const mockCreate = vi.fn();

const defaultProps = {
  open: true,
  defaultStart: "09:00",
  categories: [],
  blocks: [] as Block[],
  onSave: mockSave,
  onCancel: mockCancel,
  onCreateCategory: mockCreate,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// C-m2-002: AddBlockSheet opens with default Start prefill
describe("C-m2-002: AddBlockSheet opens with default Start prefill", () => {
  it("autofocuses the Title input on open", async () => {
    render(<AddBlockSheet {...defaultProps} defaultStart="09:00" />);
    // Wait for the setTimeout autofocus
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    const titleInput = screen.getByLabelText(/Title/i);
    expect(titleInput).toBeInTheDocument();
    expect(titleInput).toBe(document.activeElement);
  });

  it("Start input has value '09:00'", () => {
    render(<AddBlockSheet {...defaultProps} defaultStart="09:00" />);
    const startInput = screen.getByLabelText(/Start/i);
    expect(startInput).toHaveValue("09:00");
  });

  it("End input is empty", () => {
    render(<AddBlockSheet {...defaultProps} />);
    const endInput = screen.getByLabelText(/End/i);
    expect(endInput).toHaveValue("");
  });

  it("recurrence picker has 'Just today' selected by default", () => {
    render(<AddBlockSheet {...defaultProps} />);
    const justToday = screen.getByRole("radio", { name: /Just today/i });
    expect(justToday).toHaveAttribute("aria-checked", "true");
    const everyWeekday = screen.getByRole("radio", {
      name: /Every weekday/i,
    });
    expect(everyWeekday).toHaveAttribute("aria-checked", "false");
  });

  it("dialog has aria-label='Add Block'", () => {
    render(<AddBlockSheet {...defaultProps} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-label", "Add Block");
  });
});

// C-m2-003: Empty Title disables Save with inline error
describe("C-m2-003: Empty Title disables Save", () => {
  it("Save is aria-disabled=true when Title is blank", () => {
    render(<AddBlockSheet {...defaultProps} />);
    const save = screen.getByRole("button", { name: /Save/i });
    expect(save).toHaveAttribute("aria-disabled", "true");
  });

  it("clicking Save with blank Title does NOT invoke onSave", async () => {
    const user = userEvent.setup();
    render(<AddBlockSheet {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: /Save/i }));
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("typing Title flips Save aria-disabled to false and clicking Save invokes onSave", async () => {
    const user = userEvent.setup();
    render(<AddBlockSheet {...defaultProps} />);
    await user.type(screen.getByLabelText(/Title/i), "Foo");
    const save = screen.getByRole("button", { name: /Save/i });
    expect(save).toHaveAttribute("aria-disabled", "false");
    await user.click(save);
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Foo" }),
    );
  });

  it("clearing Title flips Save back to aria-disabled=true", async () => {
    const user = userEvent.setup();
    render(<AddBlockSheet {...defaultProps} />);
    const titleInput = screen.getByLabelText(/Title/i);
    await user.type(titleInput, "Foo");
    expect(screen.getByRole("button", { name: /Save/i })).toHaveAttribute(
      "aria-disabled",
      "false",
    );
    await user.clear(titleInput);
    expect(screen.getByRole("button", { name: /Save/i })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});

// C-m2-004: End ≤ Start inline error + Save disabled
describe("C-m2-004: End ≤ Start shows inline error and disables Save", () => {
  it("End before Start shows alert and disables Save", async () => {
    const user = userEvent.setup();
    render(<AddBlockSheet {...defaultProps} defaultStart="10:00" />);
    await user.type(screen.getByLabelText(/Title/i), "Foo");
    // Set End before Start
    const endInput = screen.getByLabelText(/End/i);
    await user.type(endInput, "09:00");
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("alert").textContent).toMatch(
      /End must be after Start/i,
    );
    expect(screen.getByRole("button", { name: /Save/i })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("updating End to valid value removes alert and enables Save", async () => {
    const user = userEvent.setup();
    render(<AddBlockSheet {...defaultProps} defaultStart="10:00" />);
    await user.type(screen.getByLabelText(/Title/i), "Foo");
    const endInput = screen.getByLabelText(/End/i);
    await user.type(endInput, "09:00");
    await user.clear(endInput);
    await user.type(endInput, "11:00");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button", { name: /Save/i })).toHaveAttribute(
      "aria-disabled",
      "false",
    );
  });
});

// C-m2-005: End past 23:59 inline error
describe("C-m2-005: End past 23:59 shows inline error", () => {
  it("End=24:00 shows 'before midnight' alert and disables Save", async () => {
    const user = userEvent.setup();
    render(<AddBlockSheet {...defaultProps} defaultStart="22:00" />);
    await user.type(screen.getByLabelText(/Title/i), "Foo");
    const endInput = screen.getByLabelText(/End/i);
    await user.type(endInput, "24:00");
    // Alert should show "before midnight"
    const alerts = screen.queryAllByRole("alert");
    const midnightAlert = alerts.find((a) =>
      /before midnight/i.test(a.textContent ?? ""),
    );
    expect(midnightAlert).toBeTruthy();
    expect(screen.getByRole("button", { name: /Save/i })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});

// C-m2-006: Soft overlap warning — Save still enabled
describe("C-m2-006: Soft overlap warning, Save still enabled", () => {
  const existingBlock: Block = {
    id: "b1",
    name: "Existing",
    start: "09:00",
    end: "10:00",
    recurrence: { kind: "just-today", date: "2026-05-06" },
    categoryId: null,
    bricks: [],
  };

  it("shows overlap status message and keeps Save enabled", async () => {
    const user = userEvent.setup();
    render(
      <AddBlockSheet
        {...defaultProps}
        defaultStart="09:30"
        blocks={[existingBlock]}
      />,
    );
    await user.type(screen.getByLabelText(/Title/i), "Foo");
    const endInput = screen.getByLabelText(/End/i);
    await user.type(endInput, "10:30");
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("Existing");
    expect(screen.getByRole("button", { name: /Save/i })).toHaveAttribute(
      "aria-disabled",
      "false",
    );
  });

  it("clicking Save with overlap still invokes onSave", async () => {
    const user = userEvent.setup();
    render(
      <AddBlockSheet
        {...defaultProps}
        defaultStart="09:30"
        blocks={[existingBlock]}
      />,
    );
    await user.type(screen.getByLabelText(/Title/i), "Foo");
    await user.type(screen.getByLabelText(/End/i), "10:30");
    await user.click(screen.getByRole("button", { name: /Save/i }));
    expect(mockSave).toHaveBeenCalledTimes(1);
  });
});

// C-m2-008: Custom-range with zero weekdays disables Save
describe("C-m2-008: Custom-range zero weekdays disables Save", () => {
  it("shows weekday error and disables Save", async () => {
    const user = userEvent.setup();
    render(<AddBlockSheet {...defaultProps} />);
    await user.type(screen.getByLabelText(/Title/i), "Foo");
    await user.click(screen.getByRole("radio", { name: /Custom range/i }));
    // Check for the weekday alert
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toMatch(/at least one weekday/i);
    expect(screen.getByRole("button", { name: /Save/i })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("selecting a weekday removes alert and enables Save", async () => {
    const user = userEvent.setup();
    render(<AddBlockSheet {...defaultProps} />);
    await user.type(screen.getByLabelText(/Title/i), "Foo");
    await user.click(screen.getByRole("radio", { name: /Custom range/i }));
    // Click a weekday chip (Mon)
    const weekdayGroup = screen.getByRole("group", { name: /Weekdays/i });
    const monBtn = weekdayGroup.querySelector(
      '[aria-label="Mon"]',
    ) as HTMLElement;
    await user.click(monBtn);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button", { name: /Save/i })).toHaveAttribute(
      "aria-disabled",
      "false",
    );
  });
});

// C-m2-011: Sheet view-toggle: block ↔ newCategory inside one dialog
describe("C-m2-011: Sheet view-toggle inside single dialog", () => {
  it("clicking '+ New' updates dialog aria-label to 'New Category'", async () => {
    const user = userEvent.setup();
    render(<AddBlockSheet {...defaultProps} />);
    await user.type(screen.getByLabelText(/Title/i), "Foo");
    await user.click(screen.getByRole("button", { name: /\+ New/i }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-label", "New Category");
  });

  it("block-form fields are NOT visible in newCategory view", async () => {
    const user = userEvent.setup();
    render(<AddBlockSheet {...defaultProps} />);
    await user.type(screen.getByLabelText(/Title/i), "Foo");
    await user.click(screen.getByRole("button", { name: /\+ New/i }));
    expect(screen.queryByLabelText(/^Title$/i)).toBeNull();
    expect(screen.queryByLabelText(/^Start$/i)).toBeNull();
    expect(screen.queryByLabelText(/^End/i)).toBeNull();
  });

  it("only one dialog exists (no stacked sheets)", async () => {
    const user = userEvent.setup();
    render(<AddBlockSheet {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: /\+ New/i }));
    const dialogs = screen.getAllByRole("dialog");
    expect(dialogs).toHaveLength(1);
  });

  it("Cancel in NewCategoryForm returns to block view with preserved title", async () => {
    const user = userEvent.setup();
    render(<AddBlockSheet {...defaultProps} />);
    await user.type(screen.getByLabelText(/Title/i), "Foo");
    await user.click(screen.getByRole("button", { name: /\+ New/i }));
    // In newCategory view, click Cancel
    await user.click(screen.getByRole("button", { name: /Cancel/i }));
    // Back to block view
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-label", "Add Block");
    // Title should still hold "Foo"
    expect(screen.getByLabelText(/Title/i)).toHaveValue("Foo");
  });
});
