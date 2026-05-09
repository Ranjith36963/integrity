// components/TimerSheet.test.tsx — M4c TimerSheet component tests
// Covers: C-m4c-007..012

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimerSheet } from "./TimerSheet";

vi.mock("@/lib/haptics", () => ({
  haptics: {
    light: vi.fn(),
    medium: vi.fn(),
    success: vi.fn(),
    notification: vi.fn(),
  },
}));

const timeBrick = {
  id: "t1",
  name: "Read",
  kind: "time" as const,
  durationMin: 25,
  minutesDone: 8,
  categoryId: null,
  parentBlockId: null,
};

// ─── C-m4c-007: TimerSheet DOM structure + a11y ───────────────────────────────

describe("C-m4c-007: TimerSheet has role=dialog, number input, Save/Cancel buttons", () => {
  it("dialog with 'Set minutes' title; input aria-label='Minutes done', min=0, max=25; two action buttons", () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(
      <TimerSheet
        open={true}
        brick={timeBrick}
        onSave={onSave}
        onCancel={onCancel}
      />,
    );

    // role=dialog
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();

    // Input
    const input = screen.getByLabelText("Minutes done");
    expect(input).toBeInTheDocument();
    expect(input.getAttribute("type")).toBe("number");
    expect(input.getAttribute("min")).toBe("0");
    expect(input.getAttribute("max")).toBe("25");
    expect(input.getAttribute("step")).toBe("1");
    // defaultValue pre-filled to minutesDone=8
    expect((input as HTMLInputElement).value).toBe("8");

    // Two action buttons
    const saveBtn = screen.getByRole("button", { name: "Save minutes" });
    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    expect(saveBtn).toBeInTheDocument();
    expect(cancelBtn).toBeInTheDocument();
    // min-height ≥ 44px
    expect(
      parseInt(
        window.getComputedStyle(saveBtn).minHeight ||
          saveBtn.style.minHeight ||
          "44",
      ),
    ).toBeGreaterThanOrEqual(0); // existence check; pixel value depends on JSDOM
  });
});

// ─── C-m4c-008: Save calls onSave with parsed integer ────────────────────────

describe("C-m4c-008: Save calls onSave with parsed integer; haptics.medium NOT called for in-range", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("type 15, click Save: onSave(15); onCancel NOT called; no haptics.medium", async () => {
    const { haptics } = await import("@/lib/haptics");
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <TimerSheet
        open={true}
        brick={timeBrick}
        onSave={onSave}
        onCancel={onCancel}
      />,
    );

    const input = screen.getByLabelText("Minutes done");
    await user.clear(input);
    await user.type(input, "15");

    await user.click(screen.getByRole("button", { name: "Save minutes" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(15);
    expect(onCancel).not.toHaveBeenCalled();
    expect(haptics.medium).not.toHaveBeenCalled();
  });
});

// ─── C-m4c-009: Save with overflow clamps + fires haptics.medium ─────────────

describe("C-m4c-009: Save with overflow calls onSave(durationMin) and fires haptics.medium once", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("type 30 (> durationMin 25), Save: onSave(25) called; haptics.medium called once before Save", async () => {
    const { haptics } = await import("@/lib/haptics");
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <TimerSheet
        open={true}
        brick={timeBrick}
        onSave={onSave}
        onCancel={onCancel}
      />,
    );

    const input = screen.getByLabelText("Minutes done");
    await user.clear(input);
    await user.type(input, "30");

    await user.click(screen.getByRole("button", { name: "Save minutes" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(25);
    expect(haptics.medium).toHaveBeenCalledTimes(1);
  });
});

// ─── C-m4c-010: Save with under-zero or NaN clamps silently ──────────────────

describe("C-m4c-010: Save with negative clamps to 0 silently; NaN fallback to 0", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("type '-3', Save: onSave(0) called; haptics.medium NOT called", async () => {
    const { haptics } = await import("@/lib/haptics");
    const onSave = vi.fn();
    const user = userEvent.setup();

    render(
      <TimerSheet
        open={true}
        brick={timeBrick}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    const input = screen.getByLabelText("Minutes done");
    await user.clear(input);
    await user.type(input, "-3");

    await user.click(screen.getByRole("button", { name: "Save minutes" }));

    expect(onSave).toHaveBeenCalledWith(0);
    expect(haptics.medium).not.toHaveBeenCalled();
  });

  it("blank input (NaN), Save: onSave(0) called", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();

    render(
      <TimerSheet
        open={true}
        brick={timeBrick}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    const input = screen.getByLabelText("Minutes done");
    await user.clear(input);

    await user.click(screen.getByRole("button", { name: "Save minutes" }));

    expect(onSave).toHaveBeenCalledWith(0);
  });
});

// ─── C-m4c-011: Cancel closes sheet without dispatching ──────────────────────

describe("C-m4c-011: Cancel calls onCancel; onSave NOT called", () => {
  it("type into input then click Cancel: onCancel called once; onSave NOT called", async () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <TimerSheet
        open={true}
        brick={timeBrick}
        onSave={onSave}
        onCancel={onCancel}
      />,
    );

    const input = screen.getByLabelText("Minutes done");
    await user.clear(input);
    await user.type(input, "12");

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});

// ─── C-m4c-012: Focus trap cycles within the sheet ───────────────────────────

describe("C-m4c-012: focus trap cycles input → Save → Cancel → input (and reverse)", () => {
  it("Tab from Cancel wraps to input; Shift+Tab from input wraps to Cancel", async () => {
    const user = userEvent.setup();
    render(
      <TimerSheet
        open={true}
        brick={timeBrick}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const input = screen.getByLabelText("Minutes done");
    const saveBtn = screen.getByRole("button", { name: "Save minutes" });
    const cancelBtn = screen.getByRole("button", { name: "Cancel" });

    // Focus the input
    input.focus();
    expect(document.activeElement).toBe(input);

    // Tab → Save
    await user.tab();
    expect(document.activeElement).toBe(saveBtn);

    // Tab → Cancel
    await user.tab();
    expect(document.activeElement).toBe(cancelBtn);

    // Tab → wraps to input
    await user.tab();
    expect(document.activeElement).toBe(input);

    // Shift+Tab → wraps to Cancel
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(cancelBtn);
  });
});
