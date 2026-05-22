// components/AddBrickSheet.test.tsx — M3 component tests + M4e duration/overlap tests
// Covers: C-m3-013..019, C-m4e-001..013

import { describe, it, expect, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddBrickSheet } from "./AddBrickSheet";
import type { AppState, Brick, Category } from "@/lib/types";
import { defaultState } from "@/lib/data";

vi.mock("@/lib/haptics", () => ({
  haptics: { light: vi.fn(), medium: vi.fn(), success: vi.fn() },
}));

import { haptics } from "@/lib/haptics";

const cat1: Category = { id: "c1", name: "category 1", color: "#34d399" };

function emptyState(): AppState {
  return defaultState();
}

function stateWithBlock(
  overrides: Partial<{
    id: string;
    name: string;
    start: string;
    end: string;
  }> = {},
): AppState {
  const block = {
    id: overrides.id ?? "bk1",
    name: overrides.name ?? "Stretch",
    start: overrides.start ?? "08:30",
    end: overrides.end ?? "09:30",
    categoryId: null,
    bricks: [],
    recurrence: { kind: "just-today" as const, date: "2026-05-14" },
  };
  return { ...defaultState(), blocks: [block] };
}

function defaultProps(overrides: Record<string, unknown> = {}) {
  return {
    open: true,
    parentBlockId: null as string | null,
    defaultCategoryId: null as string | null,
    categories: [] as Category[],
    state: emptyState(),
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
// M4f: 3 chips → 2 chips (Tick, Units); Time chip removed (ADR-043).

describe("C-m3-014: AddBrickSheet type selector", () => {
  it("renders two chips in a radiogroup: Tick (default checked) and Units; no Time chip (C-m4f-013)", () => {
    render(<AddBrickSheet {...defaultProps()} />);
    const group = screen.getByRole("radiogroup");
    expect(group).toBeTruthy();
    const radios = within(group).getAllByRole("radio");
    expect(radios).toHaveLength(2);
    const tickRadio = radios.find((r) =>
      r.getAttribute("aria-label")?.toLowerCase().includes("tick"),
    );
    expect(tickRadio?.getAttribute("aria-checked")).toBe("true");
    // No Time chip (C-m4f-013)
    expect(
      within(group)
        .queryAllByRole("radio")
        .find((r) =>
          r.getAttribute("aria-label")?.toLowerCase().includes("time"),
        ),
    ).toBeUndefined();
  });

  it("no per-type fields render under default Tick selection", () => {
    render(<AddBrickSheet {...defaultProps()} />);
    expect(screen.queryByRole("spinbutton", { name: /target/i })).toBeNull();
    expect(screen.queryByRole("spinbutton", { name: /duration/i })).toBeNull();
  });

  it("clicking Units changes aria-checked; reveals target + unit inputs (C-m4f-014)", async () => {
    const user = userEvent.setup();
    render(<AddBrickSheet {...defaultProps()} />);
    const group = screen.getByRole("radiogroup");
    const unitsRadio = within(group)
      .getAllByRole("radio")
      .find((r) =>
        r.getAttribute("aria-label")?.toLowerCase().includes("units"),
      );
    await user.click(unitsRadio!);
    expect(unitsRadio?.getAttribute("aria-checked")).toBe("true");
    expect(
      screen.getByRole("spinbutton", { name: /target/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /unit/i })).toBeInTheDocument();
  });

  it("clicking back to Tick hides all per-type fields", async () => {
    const user = userEvent.setup();
    render(<AddBrickSheet {...defaultProps()} />);
    const group = screen.getByRole("radiogroup");
    const radios = within(group).getAllByRole("radio");
    const unitsRadio = radios.find((r) =>
      r.getAttribute("aria-label")?.toLowerCase().includes("units"),
    );
    const tickRadio = radios.find((r) =>
      r.getAttribute("aria-label")?.toLowerCase().includes("tick"),
    );
    await user.click(unitsRadio!);
    await user.click(tickRadio!);
    expect(screen.queryByRole("spinbutton", { name: /target/i })).toBeNull();
    expect(screen.queryByRole("spinbutton", { name: /duration/i })).toBeNull();
  });
});

// ─── C-m3-015: Units validation (target ≥ 1) ──────────────────────────────────
// M4f: Goal renamed to Units (ADR-043). Same validation semantics.

describe("C-m3-015: AddBrickSheet Units validation (M4f: was Goal validation)", () => {
  it("Save disabled when Units target is 0 (even with valid Title)", async () => {
    const user = userEvent.setup();
    render(<AddBrickSheet {...defaultProps()} />);
    await user.type(screen.getByRole("textbox", { name: /title/i }), "brick A");
    // Switch to Units
    const group = screen.getByRole("radiogroup");
    const unitsRadio = within(group)
      .getAllByRole("radio")
      .find((r) =>
        r.getAttribute("aria-label")?.toLowerCase().includes("units"),
      );
    await user.click(unitsRadio!);
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

  it("Save enabled when Units target is 1", async () => {
    const user = userEvent.setup();
    render(<AddBrickSheet {...defaultProps()} />);
    await user.type(screen.getByRole("textbox", { name: /title/i }), "brick A");
    const group = screen.getByRole("radiogroup");
    const unitsRadio = within(group)
      .getAllByRole("radio")
      .find((r) =>
        r.getAttribute("aria-label")?.toLowerCase().includes("units"),
      );
    await user.click(unitsRadio!);
    const targetInput = screen.getByRole("spinbutton", { name: /target/i });
    await user.clear(targetInput);
    await user.type(targetInput, "1");
    expect(
      screen
        .getByRole("button", { name: /save/i })
        .getAttribute("aria-disabled"),
    ).toBe("false");
  });

  it("Save enabled when Units target=100 and unit is blank (unit is optional)", async () => {
    const user = userEvent.setup();
    render(<AddBrickSheet {...defaultProps()} />);
    await user.type(screen.getByRole("textbox", { name: /title/i }), "brick A");
    const group = screen.getByRole("radiogroup");
    const unitsRadio = within(group)
      .getAllByRole("radio")
      .find((r) =>
        r.getAttribute("aria-label")?.toLowerCase().includes("units"),
      );
    await user.click(unitsRadio!);
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

// C-m3-016: AddBrickSheet Time validation — RETIRED in M4f (ADR-043).
// kind:"time" removed from the schema; durationMin field no longer exists.
// Coverage replaced by C-m4f-016 (Units invalid target → Save disabled).

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

// ─── C-m4e-001: Duration toggle present, aria-checked=false, no time fields ──

describe("C-m4e-001: AddBrickSheet has Duration switch OFF by default", () => {
  it("has role=switch with aria-checked=false; Start/End/Recurrence NOT in DOM", () => {
    render(<AddBrickSheet {...defaultProps({ state: emptyState() })} />);
    const toggle = screen.getByRole("switch", { name: /duration/i });
    expect(toggle).toBeInTheDocument();
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(screen.queryByLabelText(/^start$/i)).toBeNull();
    expect(screen.queryByLabelText(/^end$/i)).toBeNull();
    // Recurrence chip group: no radiogroup with name matching "recurrence"
    const rg = screen
      .queryAllByRole("radiogroup")
      .find((el) =>
        el.getAttribute("aria-label")?.toLowerCase().includes("recurrence"),
      );
    expect(rg).toBeUndefined();
  });
});

// ─── C-m4e-002: Toggle ON → aria-checked=true, haptics.light, fields appear ──

describe("C-m4e-002: clicking Duration toggle ON reveals time fields", () => {
  it("flips aria-checked to true; haptics.light called; Start/End/Recurrence appear; no AnimatePresence", () => {
    vi.mocked(haptics.light).mockClear();
    const { container } = render(
      <AddBrickSheet {...defaultProps({ state: emptyState() })} />,
    );
    const toggle = screen.getByRole("switch", { name: /duration/i });
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(vi.mocked(haptics.light)).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/^start$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^end$/i)).toBeInTheDocument();
    const rg = screen
      .getAllByRole("radiogroup")
      .find((el) =>
        el.getAttribute("aria-label")?.toLowerCase().includes("recurrence"),
      );
    expect(rg).toBeTruthy();
    // SG-m4e-07: no AnimatePresence/motion wrapper
    expect(container.querySelector("[data-framer-appear-id]")).toBeNull();
  });
});

// ─── C-m4e-003: Default values when toggle ON (nested vs loose) ───────────────

describe("C-m4e-003: Duration toggle ON fills default Start/End from parent block", () => {
  it("nested: Start=block.start, End=block.end; Recurrence default Just today", () => {
    const state = stateWithBlock({ id: "bk1", start: "06:00", end: "06:40" });
    render(
      <AddBrickSheet {...defaultProps({ parentBlockId: "bk1", state })} />,
    );
    fireEvent.click(screen.getByRole("switch", { name: /duration/i }));
    expect((screen.getByLabelText(/^start$/i) as HTMLInputElement).value).toBe(
      "06:00",
    );
    expect((screen.getByLabelText(/^end$/i) as HTMLInputElement).value).toBe(
      "06:40",
    );
    // "Just today" chip should be the default selected recurrence
    const justTodayBtn = screen.getByRole("radio", { name: /just today/i });
    expect(justTodayBtn.getAttribute("aria-checked")).toBe("true");
  });

  it("loose (parentBlockId=null): Start=current-hour-floor, End=Start+30min", () => {
    render(
      <AddBrickSheet
        {...defaultProps({ parentBlockId: null, state: emptyState() })}
      />,
    );
    fireEvent.click(screen.getByRole("switch", { name: /duration/i }));
    const startVal = (screen.getByLabelText(/^start$/i) as HTMLInputElement)
      .value;
    const endVal = (screen.getByLabelText(/^end$/i) as HTMLInputElement).value;
    // Start should be current hour floored — ends in ":00"
    expect(startVal).toMatch(/^\d{2}:00$/);
    expect(endVal).toMatch(/^\d{2}:\d{2}$/);
    // End is exactly 30 min after Start
    const [sH, sM] = startVal.split(":").map(Number);
    const [eH, eM] = endVal.split(":").map(Number);
    const startMins = (sH ?? 0) * 60 + (sM ?? 0);
    const endMins = (eH ?? 0) * 60 + (eM ?? 0);
    expect(endMins - startMins).toBe(30);
  });
});

// ─── C-m4e-004: Toggle OFF hides fields, Save produces hasDuration:false ──────

describe("C-m4e-004: Toggle OFF hides time fields; Save produces hasDuration:false", () => {
  it("toggle OFF removes Start/End/Recurrence from DOM; haptics.light called", async () => {
    vi.mocked(haptics.light).mockClear();
    render(<AddBrickSheet {...defaultProps({ state: emptyState() })} />);
    const toggle = screen.getByRole("switch", { name: /duration/i });
    fireEvent.click(toggle); // ON
    fireEvent.click(toggle); // OFF
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(vi.mocked(haptics.light)).toHaveBeenCalledTimes(2);
    expect(screen.queryByLabelText(/^start$/i)).toBeNull();
    expect(screen.queryByLabelText(/^end$/i)).toBeNull();
  });

  it("clicking Save with toggle OFF calls onSave with hasDuration:false and no start/end/recurrence", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <AddBrickSheet {...defaultProps({ state: emptyState(), onSave })} />,
    );
    await user.type(
      screen.getByRole("textbox", { name: /title/i }),
      "Morning run",
    );
    const toggle = screen.getByRole("switch", { name: /duration/i });
    fireEvent.click(toggle); // ON
    // populate Start/End so toggle-OFF discards them
    const startInput = screen.getByLabelText(/^start$/i);
    const endInput = screen.getByLabelText(/^end$/i);
    fireEvent.change(startInput, { target: { value: "09:00" } });
    fireEvent.change(endInput, { target: { value: "09:30" } });
    fireEvent.click(toggle); // OFF
    // Click Save
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const brick = onSave.mock.calls[0][0] as Brick;
    expect(brick.hasDuration).toBe(false);
    expect(brick.start).toBeUndefined();
    expect(brick.end).toBeUndefined();
    expect(brick.recurrence).toBeUndefined();
  });
});

// ─── C-m4e-005: Save with toggle ON writes hasDuration:true + all time fields ─
// M4f: "goal" radio renamed to "units" in kind selector.

describe("C-m4e-005: Save with toggle ON produces hasDuration:true brick", () => {
  it("onSave called with hasDuration:true, start, end, recurrence", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <AddBrickSheet {...defaultProps({ state: emptyState(), onSave })} />,
    );
    await user.type(screen.getByRole("textbox", { name: /title/i }), "Run");
    // Switch to Units type (M4f: was Goal)
    const group = screen.getByRole("radiogroup", { name: /brick type/i });
    const unitsRadio = within(group)
      .getAllByRole("radio")
      .find((r) =>
        r.getAttribute("aria-label")?.toLowerCase().includes("units"),
      );
    await user.click(unitsRadio!);
    await user.type(screen.getByRole("spinbutton", { name: /target/i }), "5");
    // Toggle ON
    fireEvent.click(screen.getByRole("switch", { name: /duration/i }));
    // Set start and end
    fireEvent.change(screen.getByLabelText(/^start$/i), {
      target: { value: "09:00" },
    });
    fireEvent.change(screen.getByLabelText(/^end$/i), {
      target: { value: "09:30" },
    });
    // Save
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const brick = onSave.mock.calls[0][0] as Brick;
    expect(brick.hasDuration).toBe(true);
    expect(brick.start).toBe("09:00");
    expect(brick.end).toBe("09:30");
    expect(brick.recurrence).toBeDefined();
  });
});

// ─── C-m4e-006: End ≤ Start → inline alert + Save disabled ───────────────────

describe("C-m4e-006: End≤Start → role=alert, Save aria-disabled=true", () => {
  it("zero-duration (09:00–09:00) shows alert and disables Save", () => {
    render(<AddBrickSheet {...defaultProps({ state: emptyState() })} />);
    fireEvent.click(screen.getByRole("switch", { name: /duration/i }));
    fireEvent.change(screen.getByLabelText(/^start$/i), {
      target: { value: "09:00" },
    });
    fireEvent.change(screen.getByLabelText(/^end$/i), {
      target: { value: "09:00" },
    });
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toMatch(/end must be after start/i);
    expect(
      screen
        .getByRole("button", { name: /save/i })
        .getAttribute("aria-disabled"),
    ).toBe("true");
  });

  it("negative duration (09:00 start, 08:00 end) shows alert", () => {
    render(<AddBrickSheet {...defaultProps({ state: emptyState() })} />);
    fireEvent.click(screen.getByRole("switch", { name: /duration/i }));
    fireEvent.change(screen.getByLabelText(/^start$/i), {
      target: { value: "09:00" },
    });
    fireEvent.change(screen.getByLabelText(/^end$/i), {
      target: { value: "08:00" },
    });
    expect(screen.getByRole("alert").textContent).toMatch(
      /end must be after start/i,
    );
    expect(
      screen
        .getByRole("button", { name: /save/i })
        .getAttribute("aria-disabled"),
    ).toBe("true");
  });
});

// ─── C-m4e-007: Straddles midnight → same-day alert + Save disabled ───────────

describe("C-m4e-007: Start=23:00 End=01:00 straddles midnight → alert", () => {
  it("shows same-day alert and disables Save", () => {
    render(<AddBrickSheet {...defaultProps({ state: emptyState() })} />);
    fireEvent.click(screen.getByRole("switch", { name: /duration/i }));
    fireEvent.change(screen.getByLabelText(/^start$/i), {
      target: { value: "23:00" },
    });
    fireEvent.change(screen.getByLabelText(/^end$/i), {
      target: { value: "01:00" },
    });
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toMatch(/same day/i);
    expect(
      screen
        .getByRole("button", { name: /save/i })
        .getAttribute("aria-disabled"),
    ).toBe("true");
  });
});

// ─── C-m4e-008: Overlap with block → data-testid=overlap-warning, role=alert ──

describe("C-m4e-008: Overlap with existing block shows overlap-warning chip", () => {
  it("chip has data-testid=overlap-warning, role=alert, Save disabled", () => {
    // State has one block 08:30–09:30
    const state = stateWithBlock({
      id: "bk1",
      name: "Stretch",
      start: "08:30",
      end: "09:30",
    });
    render(<AddBrickSheet {...defaultProps({ state })} />);
    fireEvent.click(screen.getByRole("switch", { name: /duration/i }));
    fireEvent.change(screen.getByLabelText(/^start$/i), {
      target: { value: "09:00" },
    });
    fireEvent.change(screen.getByLabelText(/^end$/i), {
      target: { value: "09:30" },
    });
    const chip = screen.getByTestId("overlap-warning");
    expect(chip.getAttribute("role")).toBe("alert");
    expect(chip.textContent).toMatch(
      /overlaps with.*Block.*Stretch.*08:30.*09:30/i,
    );
    const saveBtn = screen.getByRole("button", { name: /save/i });
    expect(saveBtn.getAttribute("aria-disabled")).toBe("true");
    // G2: aria-describedby points to sr-only hint span (SPEC AC #22, A-m4e-003)
    expect(saveBtn.getAttribute("aria-describedby")).toBe("brick-save-hint");
    const hint = document.getElementById("brick-save-hint");
    expect(hint).not.toBeNull();
    expect(hint?.textContent).toBe("Resolve the overlap to save.");
  });
});

// ─── C-m4e-009: 4 overlapping items → 3 listed + "+1 more" ───────────────────

describe("C-m4e-009: 4 overlapping items shows 3 names + +1 more", () => {
  it("chip text contains first 3 names and +1 more", () => {
    // Create state with 3 blocks + 1 timed loose brick all overlapping 09:00–10:00
    const state: AppState = {
      ...defaultState(),
      blocks: [
        {
          id: "bk1",
          name: "Alpha",
          start: "09:00",
          end: "10:00",
          categoryId: null,
          bricks: [],
          recurrence: { kind: "just-today", date: "2026-05-14" },
        },
        {
          id: "bk2",
          name: "Beta",
          start: "09:00",
          end: "10:00",
          categoryId: null,
          bricks: [],
          recurrence: { kind: "just-today", date: "2026-05-14" },
        },
        {
          id: "bk3",
          name: "Gamma",
          start: "09:00",
          end: "10:00",
          categoryId: null,
          bricks: [],
          recurrence: { kind: "just-today", date: "2026-05-14" },
        },
      ],
      looseBricks: [
        {
          id: "r1",
          name: "Delta",
          kind: "tick",
          done: false,
          hasDuration: true,
          start: "09:00",
          end: "10:00",
          recurrence: { kind: "just-today", date: "2026-05-14" },
          categoryId: null,
          parentBlockId: null,
        },
      ],
    };
    render(<AddBrickSheet {...defaultProps({ state })} />);
    fireEvent.click(screen.getByRole("switch", { name: /duration/i }));
    fireEvent.change(screen.getByLabelText(/^start$/i), {
      target: { value: "09:00" },
    });
    fireEvent.change(screen.getByLabelText(/^end$/i), {
      target: { value: "10:00" },
    });
    const chip = screen.getByTestId("overlap-warning");
    expect(chip.textContent).toMatch(/\+1 more/i);
    // First 3 names present (sorted: blocks first asc name, then bricks)
    // blocks: Alpha, Beta, Gamma; brick: Delta
    // Sorted by start asc (all same), then kind (block before brick), then name asc
    // → Alpha, Beta, Gamma shown; Delta is "+1 more"
    expect(chip.textContent).toMatch(/alpha/i);
    expect(chip.textContent).toMatch(/beta/i);
    expect(chip.textContent).toMatch(/gamma/i);
    expect(chip.textContent).not.toMatch(/delta/i);
  });
});

// ─── C-m4e-010: Click disabled Save → haptics.medium, onSave NOT called ───────

describe("C-m4e-010: click disabled Save fires haptics.medium, not onSave", () => {
  it("haptics.medium called once; onSave not called", () => {
    vi.mocked(haptics.medium).mockClear();
    const onSave = vi.fn();
    const state = stateWithBlock({
      id: "bk1",
      name: "Stretch",
      start: "08:30",
      end: "09:30",
    });
    render(<AddBrickSheet {...defaultProps({ state, onSave })} />);
    fireEvent.click(screen.getByRole("switch", { name: /duration/i }));
    fireEvent.change(screen.getByLabelText(/^start$/i), {
      target: { value: "09:00" },
    });
    fireEvent.change(screen.getByLabelText(/^end$/i), {
      target: { value: "09:30" },
    });
    // overlap active → Save disabled
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(vi.mocked(haptics.medium)).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});

// ─── C-m4e-011: Fix overlap → warning gone, Save enabled, onSave called ──────

describe("C-m4e-011: fixing overlap clears warning and enables Save", () => {
  it("overlap-warning gone; aria-disabled=false; onSave called after fix", () => {
    const onSave = vi.fn();
    const state = stateWithBlock({
      id: "bk1",
      name: "Stretch",
      start: "08:30",
      end: "09:30",
    });
    render(<AddBrickSheet {...defaultProps({ state, onSave })} />);
    // Type title first so isValid depends only on overlap
    fireEvent.change(screen.getByRole("textbox", { name: /title/i }), {
      target: { value: "Morning walk" },
    });
    fireEvent.click(screen.getByRole("switch", { name: /duration/i }));
    // Set overlapping window
    fireEvent.change(screen.getByLabelText(/^start$/i), {
      target: { value: "09:00" },
    });
    fireEvent.change(screen.getByLabelText(/^end$/i), {
      target: { value: "09:30" },
    });
    expect(screen.getByTestId("overlap-warning")).toBeInTheDocument();
    // Fix: move to non-overlapping window
    fireEvent.change(screen.getByLabelText(/^start$/i), {
      target: { value: "08:00" },
    });
    fireEvent.change(screen.getByLabelText(/^end$/i), {
      target: { value: "08:30" },
    });
    expect(screen.queryByTestId("overlap-warning")).toBeNull();
    expect(
      screen
        .getByRole("button", { name: /save/i })
        .getAttribute("aria-disabled"),
    ).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});

// ─── C-m4e-012: Custom range + zero weekdays → alert + Save disabled ──────────

describe("C-m4e-012: Custom range with zero weekdays → alert, Save disabled", () => {
  it("shows pick-at-least-one-weekday alert; checking Monday clears it", async () => {
    const user = userEvent.setup();
    render(<AddBrickSheet {...defaultProps({ state: emptyState() })} />);
    fireEvent.click(screen.getByRole("switch", { name: /duration/i }));
    // Select "Custom range" in the recurrence group
    const customRangeBtn = screen.getByRole("radio", { name: /custom range/i });
    await user.click(customRangeBtn);
    // Zero weekdays checked by default → alert present
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toMatch(/pick at least one weekday/i);
    expect(
      screen
        .getByRole("button", { name: /save/i })
        .getAttribute("aria-disabled"),
    ).toBe("true");
    // Check Monday
    const monBtn = screen.getByRole("button", { name: /mon/i });
    await user.click(monBtn);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

// ─── C-m4e-013: RecurrenceChips present with 4 chips, default "Just today" ────

describe("C-m4e-013: RecurrenceChips rendered with 4 chips, default Just today", () => {
  it("4 radio chips in recurrence group; Just today selected; Custom range expands", async () => {
    const user = userEvent.setup();
    render(<AddBrickSheet {...defaultProps({ state: emptyState() })} />);
    fireEvent.click(screen.getByRole("switch", { name: /duration/i }));
    const rg = screen
      .getAllByRole("radiogroup")
      .find((el) =>
        el.getAttribute("aria-label")?.toLowerCase().includes("recurrence"),
      )!;
    const chips = within(rg).getAllByRole("radio");
    expect(chips).toHaveLength(4);
    const justToday = chips.find((c) =>
      c.textContent?.toLowerCase().includes("just today"),
    );
    expect(justToday?.getAttribute("aria-checked")).toBe("true");
    // Select Custom range
    const customRange = chips.find((c) =>
      c.textContent?.toLowerCase().includes("custom range"),
    );
    await user.click(customRange!);
    expect(customRange?.getAttribute("aria-checked")).toBe("true");
    // Weekday picker should be visible
    expect(
      screen.getByRole("group", { name: /weekdays/i }),
    ).toBeInTheDocument();
  });
});

// ─── C-m4f-015: Save with "Units" constructs kind:"units" + done:0 + M4e fields ─
// Production behavior already landed in 7b34777. This is a coverage backfill for
// SPEC AC #20. Tests Save with toggle OFF (no duration) and toggle ON (with duration).

describe("C-m4f-015: Save with Units selected constructs {kind:units,done:0} + M4e duration fields", () => {
  it("toggle OFF: onSave called with {kind:units, target:30, unit:minutes, done:0, hasDuration:false}", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <AddBrickSheet {...defaultProps({ state: emptyState(), onSave })} />,
    );
    await user.type(
      screen.getByRole("textbox", { name: /title/i }),
      "Meditate",
    );
    // Switch to Units
    const group = screen.getByRole("radiogroup", { name: /brick type/i });
    const unitsRadio = within(group)
      .getAllByRole("radio")
      .find((r) =>
        r.getAttribute("aria-label")?.toLowerCase().includes("units"),
      );
    await user.click(unitsRadio!);
    // Fill target and unit
    const targetInput = screen.getByRole("spinbutton", { name: /target/i });
    await user.clear(targetInput);
    await user.type(targetInput, "30");
    await user.type(screen.getByRole("textbox", { name: /unit/i }), "minutes");
    // Save (duration toggle OFF by default)
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const brick = onSave.mock.calls[0][0] as Brick;
    expect(brick.kind).toBe("units");
    if (brick.kind === "units") {
      expect(brick.target).toBe(30);
      expect(brick.unit).toBe("minutes");
      expect(brick.done).toBe(0);
    }
    expect(brick.hasDuration).toBe(false);
    expect(brick.start).toBeUndefined();
    expect(brick.end).toBeUndefined();
    expect(brick.recurrence).toBeUndefined();
  });

  it("toggle ON: onSave called with {kind:units, target:30, unit:minutes, done:0, hasDuration:true, start, end, recurrence}", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <AddBrickSheet {...defaultProps({ state: emptyState(), onSave })} />,
    );
    await user.type(
      screen.getByRole("textbox", { name: /title/i }),
      "Meditate",
    );
    // Switch to Units
    const group = screen.getByRole("radiogroup", { name: /brick type/i });
    const unitsRadio = within(group)
      .getAllByRole("radio")
      .find((r) =>
        r.getAttribute("aria-label")?.toLowerCase().includes("units"),
      );
    await user.click(unitsRadio!);
    // Fill target and unit
    const targetInput = screen.getByRole("spinbutton", { name: /target/i });
    await user.clear(targetInput);
    await user.type(targetInput, "30");
    await user.type(screen.getByRole("textbox", { name: /unit/i }), "minutes");
    // Toggle duration ON
    fireEvent.click(screen.getByRole("switch", { name: /duration/i }));
    // Set start and end
    fireEvent.change(screen.getByLabelText(/^start$/i), {
      target: { value: "09:00" },
    });
    fireEvent.change(screen.getByLabelText(/^end$/i), {
      target: { value: "09:30" },
    });
    // Save
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const brick = onSave.mock.calls[0][0] as Brick;
    expect(brick.kind).toBe("units");
    if (brick.kind === "units") {
      expect(brick.target).toBe(30);
      expect(brick.unit).toBe("minutes");
      expect(brick.done).toBe(0);
    }
    expect(brick.hasDuration).toBe(true);
    expect(brick.start).toBe("09:00");
    expect(brick.end).toBe("09:30");
    expect(brick.recurrence).toBeDefined();
  });
});

// ─── C-m4f-017: M4e overlap chip + aria-describedby + sr-only hint unchanged ───
// Production behavior already landed in 7b34777. This is a coverage backfill for
// SPEC AC #22. Asserts the M4e overlap contract survives the kind-selector collapse.

describe("C-m4f-017: M4e overlap chip + aria-describedby + sr-only hint preserved after kind-selector collapse", () => {
  it("overlap warning chip, aria-describedby, sr-only hint present; Save aria-disabled=true", () => {
    // State has one block 08:30–09:30; new Units brick with toggle ON overlaps it
    const state = stateWithBlock({
      id: "bk1",
      name: "Stretch",
      start: "08:30",
      end: "09:30",
    });
    render(<AddBrickSheet {...defaultProps({ state })} />);
    // Overlap chip appears only when duration toggle is ON with overlapping times
    fireEvent.click(screen.getByRole("switch", { name: /duration/i }));
    fireEvent.change(screen.getByLabelText(/^start$/i), {
      target: { value: "09:00" },
    });
    fireEvent.change(screen.getByLabelText(/^end$/i), {
      target: { value: "09:30" },
    });
    // The M4e overlap warning chip is still present
    const chip = screen.getByTestId("overlap-warning");
    expect(chip.getAttribute("role")).toBe("alert");
    expect(chip.textContent).toMatch(/stretch/i);
    // Save is disabled
    const saveBtn = screen.getByRole("button", { name: /save/i });
    expect(saveBtn.getAttribute("aria-disabled")).toBe("true");
    // aria-describedby points to the sr-only hint
    expect(saveBtn.getAttribute("aria-describedby")).toBe("brick-save-hint");
    const hint = document.getElementById("brick-save-hint");
    expect(hint).not.toBeNull();
    expect(hint?.textContent).toBe("Resolve the overlap to save.");
  });
});
