// components/UnitsEntrySheet.test.tsx — M4f (NEW)
// Covers: C-m4f-001..008

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UnitsEntrySheet } from "./UnitsEntrySheet";
import type { Brick } from "@/lib/types";

vi.mock("@/lib/haptics", () => ({
  haptics: {
    light: vi.fn(),
    medium: vi.fn(),
    success: vi.fn(),
    notification: vi.fn(),
  },
}));

function makeUnitsBrick(
  overrides: Partial<Brick> = {},
): Extract<Brick, { kind: "units" }> {
  return {
    id: "u1",
    kind: "units",
    name: "Meditate",
    target: 30,
    unit: "minutes",
    done: 12,
    categoryId: null,
    parentBlockId: null,
    hasDuration: false,
    ...overrides,
  } as Extract<Brick, { kind: "units" }>;
}

// ─── C-m4f-001: heading = name; sub-heading = "Today's <unit>"; input pre-filled ─

describe("C-m4f-001: UnitsEntrySheet heading, sub-heading, and input pre-filled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("heading is brick name; sub-heading is 'Today's minutes'; input value is '12'", () => {
    render(
      <UnitsEntrySheet
        brick={makeUnitsBrick()}
        open={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    // Heading = brick name
    expect(screen.getByText("Meditate")).toBeInTheDocument();
    // Sub-heading = "Today's " + unit
    expect(screen.getByText("Today's minutes")).toBeInTheDocument();
    // Input pre-filled with done=12
    const input = screen.getByRole("spinbutton");
    expect(input).toHaveValue(12);
  });
});

// ─── C-m4f-002: type/inputMode/min/step attributes; sub-heading reflects unit ─

describe("C-m4f-002: number input attributes and sub-heading for 'reps' unit", () => {
  it("input has type=number, inputMode=numeric, min=0, step=1; sub-heading is 'Today's reps'", () => {
    render(
      <UnitsEntrySheet
        brick={makeUnitsBrick({ unit: "reps", done: 0 })}
        open={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText("Today's reps")).toBeInTheDocument();
    const input = screen.getByRole("spinbutton");
    expect(input).toHaveValue(0);
    expect(input).toHaveAttribute("type", "number");
    expect(input).toHaveAttribute("inputMode", "numeric");
    expect(input).toHaveAttribute("min", "0");
    expect(input).toHaveAttribute("step", "1");
  });
});

// ─── C-m4f-003: Save with valid value calls onSave + onClose + haptics.light ─

describe("C-m4f-003: Save with valid value dispatches onSave + closes + light haptic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("onSave called once with ('u1', 20); onClose once; haptics.light once", async () => {
    const { haptics } = await import("@/lib/haptics");
    const onSave = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <UnitsEntrySheet
        brick={makeUnitsBrick({ done: 12 })}
        open={true}
        onClose={onClose}
        onSave={onSave}
      />,
    );
    const input = screen.getByRole("spinbutton");
    await user.clear(input);
    await user.type(input, "20");
    const saveBtn = screen.getByRole("button", { name: /save/i });
    await user.click(saveBtn);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith("u1", 20);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(haptics.light).toHaveBeenCalledTimes(1);
  });
});

// ─── C-m4f-004: empty input → Save aria-disabled; tap fires medium haptic + hint ─

describe("C-m4f-004: empty input disables Save + medium haptic + sr-only hint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Save aria-disabled=true; clicking does NOT call onSave; haptics.medium once; hint present; onClose not called", async () => {
    const { haptics } = await import("@/lib/haptics");
    const onSave = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <UnitsEntrySheet
        brick={makeUnitsBrick({ done: 12 })}
        open={true}
        onClose={onClose}
        onSave={onSave}
      />,
    );
    const input = screen.getByRole("spinbutton");
    await user.clear(input);
    const saveBtn = screen.getByRole("button", { name: /save/i });
    expect(saveBtn).toHaveAttribute("aria-disabled", "true");
    await user.click(saveBtn);
    expect(onSave).not.toHaveBeenCalled();
    expect(haptics.medium).toHaveBeenCalledTimes(1);
    // sr-only hint present
    const hint = document.getElementById("units-save-hint");
    expect(hint).not.toBeNull();
    expect(hint?.textContent).toContain("Enter a number to save.");
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ─── C-m4f-005: negative / decimal / whitespace → Save aria-disabled ─────────

describe("C-m4f-005: negative, decimal, whitespace values disable Save", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("'-5' disables Save", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <UnitsEntrySheet
        brick={makeUnitsBrick({ done: 0 })}
        open={true}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );
    const input = screen.getByRole("spinbutton");
    await user.clear(input);
    await user.type(input, "-5");
    const saveBtn = screen.getByRole("button", { name: /save/i });
    expect(saveBtn).toHaveAttribute("aria-disabled", "true");
    await user.click(saveBtn);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("'20.5' disables Save", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <UnitsEntrySheet
        brick={makeUnitsBrick({ done: 0 })}
        open={true}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );
    const input = screen.getByRole("spinbutton");
    await user.clear(input);
    await user.type(input, "20.5");
    const saveBtn = screen.getByRole("button", { name: /save/i });
    expect(saveBtn).toHaveAttribute("aria-disabled", "true");
    await user.click(saveBtn);
    expect(onSave).not.toHaveBeenCalled();
  });
});

// ─── C-m4f-006: Cancel closes without dispatching; no haptic ─────────────────

describe("C-m4f-006: Cancel calls onClose; onSave NOT called; no haptic on Cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clicking Cancel calls onClose once; onSave not called; no haptics fire", async () => {
    const { haptics } = await import("@/lib/haptics");
    const onSave = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <UnitsEntrySheet
        brick={makeUnitsBrick({ done: 12 })}
        open={true}
        onClose={onClose}
        onSave={onSave}
      />,
    );
    const input = screen.getByRole("spinbutton");
    await user.clear(input);
    await user.type(input, "99");
    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
    expect(haptics.light).not.toHaveBeenCalled();
    expect(haptics.medium).not.toHaveBeenCalled();
  });
});

// ─── C-m4f-007: uses M0 <Sheet> primitive (role=dialog + aria-modal); M0 Input + Button ─

describe("C-m4f-007: uses M0 Sheet primitive; role=dialog + aria-modal; auto-focus on open", () => {
  it("root has role=dialog and aria-modal=true (from Sheet primitive)", () => {
    render(
      <UnitsEntrySheet
        brick={makeUnitsBrick()}
        open={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("number input receives focus when open transitions to true", async () => {
    render(
      <UnitsEntrySheet
        brick={makeUnitsBrick()}
        open={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    // Allow useEffect to run
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    const input = screen.getByRole("spinbutton");
    expect(document.activeElement).toBe(input);
  });
});

// ─── C-m4f-008: brick swap re-seeds input while sheet stays open ──────────────

describe("C-m4f-008: brick swap re-seeds input heading and sub-heading", () => {
  it("re-renders with new brick: heading, sub-heading, and input update", () => {
    const brick1 = makeUnitsBrick({
      id: "u1",
      name: "Meditate",
      done: 5,
      unit: "minutes",
    });
    const brick2: Extract<Brick, { kind: "units" }> = {
      id: "u2",
      kind: "units",
      name: "Read",
      target: 50,
      unit: "pages",
      done: 40,
      categoryId: null,
      parentBlockId: null,
      hasDuration: false,
    };
    const { rerender } = render(
      <UnitsEntrySheet
        brick={brick1}
        open={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText("Meditate")).toBeInTheDocument();
    expect(screen.getByText("Today's minutes")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton")).toHaveValue(5);

    rerender(
      <UnitsEntrySheet
        brick={brick2}
        open={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText("Read")).toBeInTheDocument();
    expect(screen.getByText("Today's pages")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton")).toHaveValue(40);
  });
});
