import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddBlockSheet } from "./AddBlockSheet";
import type { AppState, Block, Brick } from "@/lib/types";
import { defaultState } from "@/lib/data";

vi.mock("@/lib/uuid", () => ({ uuid: () => "uuid-1" }));
vi.mock("@/lib/haptics", () => ({
  haptics: { light: vi.fn(), medium: vi.fn(), success: vi.fn() },
}));

import { haptics } from "@/lib/haptics";

const mockSave = vi.fn();
const mockCancel = vi.fn();
const mockCreate = vi.fn();

const defaultProps = {
  open: true,
  defaultStart: "09:00",
  categories: [],
  blocks: [] as Block[],
  state: defaultState(),
  onSave: mockSave,
  onCancel: mockCancel,
  onCreateCategory: mockCreate,
};

function stateWithBlock(
  block: Partial<Block> & {
    id: string;
    name: string;
    start: string;
    end?: string;
  },
): AppState {
  return {
    ...defaultState(),
    blocks: [
      {
        id: block.id,
        name: block.name,
        start: block.start,
        end: block.end,
        categoryId: null,
        bricks: [],
        recurrence: { kind: "just-today", date: "2026-05-14" },
      },
    ],
  };
}

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

// C-m2-006: Overlap warning (M4e retroactive upgrade: role="status"→"alert", Save disabled)
describe("C-m2-006: Overlap warning (M4e: role=alert, Save disabled)", () => {
  const existingBlock: Block = {
    id: "b1",
    name: "Existing",
    start: "09:00",
    end: "10:00",
    recurrence: { kind: "just-today", date: "2026-05-06" },
    categoryId: null,
    bricks: [],
  };

  it("shows overlap-warning chip with role=alert and disables Save (M4e upgrade)", async () => {
    const user = userEvent.setup();
    const state = stateWithBlock({
      id: "b1",
      name: "Existing",
      start: "09:00",
      end: "10:00",
    });
    render(
      <AddBlockSheet
        {...defaultProps}
        defaultStart="09:30"
        blocks={[existingBlock]}
        state={state}
      />,
    );
    await user.type(screen.getByLabelText(/Title/i), "Foo");
    const endInput = screen.getByLabelText(/End/i);
    await user.type(endInput, "10:30");
    const chip = screen.getByTestId("overlap-warning");
    expect(chip.getAttribute("role")).toBe("alert");
    expect(chip.textContent).toMatch(/overlaps with.*Existing/i);
    expect(screen.getByRole("button", { name: /Save/i })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("clicking Save with overlap calls haptics.medium, NOT onSave (M4e upgrade)", async () => {
    vi.mocked(haptics.medium).mockClear();
    const user = userEvent.setup();
    const state = stateWithBlock({
      id: "b1",
      name: "Existing",
      start: "09:00",
      end: "10:00",
    });
    render(
      <AddBlockSheet
        {...defaultProps}
        defaultStart="09:30"
        blocks={[existingBlock]}
        state={state}
        onSave={mockSave}
      />,
    );
    await user.type(screen.getByLabelText(/Title/i), "Foo");
    await user.type(screen.getByLabelText(/End/i), "10:30");
    fireEvent.click(screen.getByRole("button", { name: /Save/i }));
    expect(vi.mocked(haptics.medium)).toHaveBeenCalledTimes(1);
    expect(mockSave).not.toHaveBeenCalled();
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

// ─── C-m4e-024: AddBlockSheet overlap-warning with role=alert + Save disabled ──

describe("C-m4e-024: AddBlockSheet shows overlap-warning (role=alert) and disables Save", () => {
  it("chip has data-testid=overlap-warning, role=alert, Save aria-disabled=true", async () => {
    const user = userEvent.setup();
    const state = stateWithBlock({
      id: "bk1",
      name: "Standup",
      start: "09:00",
      end: "10:00",
    });
    render(<AddBlockSheet {...defaultProps} state={state} />);
    // Type title
    await user.type(screen.getByLabelText(/Title/i), "Run");
    // Set Start to overlap
    fireEvent.change(screen.getByLabelText(/^Start$/i), {
      target: { value: "09:30" },
    });
    // Set End to overlap
    fireEvent.change(screen.getByLabelText(/^End/i), {
      target: { value: "10:30" },
    });
    const chip = screen.getByTestId("overlap-warning");
    expect(chip.getAttribute("role")).toBe("alert");
    expect(chip.textContent).toMatch(
      /overlaps with.*Block.*Standup.*09:00.*10:00/i,
    );
    expect(
      screen
        .getByRole("button", { name: /save/i })
        .getAttribute("aria-disabled"),
    ).toBe("true");
  });
});

// ─── C-m4e-025: AddBlockSheet overlap with timed loose brick ─────────────────

describe("C-m4e-025: AddBlockSheet detects overlap with timed loose brick", () => {
  it("overlap-warning chip present; Save disabled when block overlaps a timed loose brick", async () => {
    const user = userEvent.setup();
    const timedBrick: Brick = {
      id: "r1",
      name: "Pushups",
      kind: "goal",
      target: 5,
      count: 0,
      unit: "reps",
      hasDuration: true,
      start: "09:30",
      end: "10:00",
      recurrence: { kind: "just-today", date: "2026-05-14" },
      categoryId: null,
      parentBlockId: null,
    };
    const state: AppState = { ...defaultState(), looseBricks: [timedBrick] };
    render(<AddBlockSheet {...defaultProps} state={state} />);
    await user.type(screen.getByLabelText(/Title/i), "Run");
    fireEvent.change(screen.getByLabelText(/^Start$/i), {
      target: { value: "09:00" },
    });
    fireEvent.change(screen.getByLabelText(/^End/i), {
      target: { value: "10:30" },
    });
    const chip = screen.getByTestId("overlap-warning");
    expect(chip.getAttribute("role")).toBe("alert");
    expect(chip.textContent).toMatch(
      /overlaps with.*Brick.*Pushups.*09:30.*10:00/i,
    );
    expect(
      screen
        .getByRole("button", { name: /save/i })
        .getAttribute("aria-disabled"),
    ).toBe("true");
  });
});

// ─── C-m4e-026: AddBlockSheet disabled-Save click fires haptics.medium ────────

describe("C-m4e-026: click disabled Save fires haptics.medium; onSave not called", () => {
  it("haptics.medium called once; onSave not called when overlap active", async () => {
    vi.mocked(haptics.medium).mockClear();
    const user = userEvent.setup();
    const state = stateWithBlock({
      id: "bk1",
      name: "Standup",
      start: "09:00",
      end: "10:00",
    });
    const onSave = vi.fn();
    render(<AddBlockSheet {...defaultProps} state={state} onSave={onSave} />);
    await user.type(screen.getByLabelText(/Title/i), "Run");
    fireEvent.change(screen.getByLabelText(/^Start$/i), {
      target: { value: "09:30" },
    });
    fireEvent.change(screen.getByLabelText(/^End/i), {
      target: { value: "10:30" },
    });
    // Click disabled Save
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(vi.mocked(haptics.medium)).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});
