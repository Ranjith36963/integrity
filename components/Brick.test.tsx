import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Brick } from "./Brick";
import type { Brick as BrickT } from "@/lib/types";

// [obsolete] — Brick.tsx replaced by BrickChip in M3.
// Tests updated to match M3 Brick schema (id/categoryId/parentBlockId, count/minutesDone fields).

function makeTick(done: boolean): BrickT {
  return {
    id: "t1",
    name: "test",
    kind: "tick",
    hasDuration: false,
    done,
    categoryId: null,
    parentBlockId: null,
  };
}

function makeGoal(count: number, target: number, name = "follow-ups"): BrickT {
  return {
    id: "g1",
    name,
    kind: "goal",
    hasDuration: false,
    count,
    target,
    unit: "",
    categoryId: null,
    parentBlockId: null,
  };
}

function renderBrick(
  overrides: Partial<{
    brick: BrickT;
    color: string;
    index: number;
    onLog: (updated: BrickT) => void;
    editMode: boolean;
  }>,
) {
  const defaults = {
    brick: makeTick(false),
    color: "#34d399",
    index: 0,
    onLog: vi.fn(),
    editMode: false,
  };
  const merged = { ...defaults, ...overrides };
  return render(<Brick {...merged} />);
}

// C-bld-022: tick brick done:false has class brick--empty in view mode
describe("C-bld-022: tick brick done:false has brick--empty class", () => {
  it("has brick--empty class", () => {
    const { container } = renderBrick({ brick: makeTick(false) });
    const btn = container.querySelector("button");
    expect(btn?.className).toMatch(/brick--empty/);
  });
});

// C-bld-023: goal brick with count:80, target:100 has brick--partial class
describe("C-bld-023: goal brick 80/100 has brick--partial class", () => {
  it("has brick--partial class", () => {
    const { container } = renderBrick({ brick: makeGoal(80, 100, "pushups") });
    const btn = container.querySelector("button");
    expect(btn?.className).toMatch(/brick--partial/);
  });
});

// C-bld-024: tick brick done:true has neither brick--empty nor brick--partial
describe("C-bld-024: tick brick done:true is in full state", () => {
  it("has neither brick--empty nor brick--partial", () => {
    const { container } = renderBrick({ brick: makeTick(true) });
    const btn = container.querySelector("button");
    expect(btn?.className).not.toMatch(/brick--empty/);
    expect(btn?.className).not.toMatch(/brick--partial/);
  });
});

// C-bld-025: clicking tick brick in view mode calls onLog with toggled done
describe("C-bld-025: clicking tick brick toggles done and calls onLog", () => {
  it("calls onLog with done:true on click of done:false brick", async () => {
    const user = userEvent.setup();
    const onLog = vi.fn();
    renderBrick({ brick: makeTick(false), onLog, editMode: false });
    const btn = screen.getByRole("button");
    await user.click(btn);
    expect(onLog).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "tick", name: "test", done: true }),
    );
  });
});

// C-bld-026: clicking goal brick opens stepper with count value; clicking + calls onLog
describe("C-bld-026: clicking goal brick shows stepper, + increments", () => {
  it("shows stepper with count 4 and clicking + calls onLog with count 5", async () => {
    const user = userEvent.setup();
    const onLog = vi.fn();
    renderBrick({ brick: makeGoal(4, 5), onLog, editMode: false });
    // Click the main brick button to open stepper
    const btn = screen.getByRole("button", { name: /follow-ups/i });
    await user.click(btn);
    // Stepper should be visible with value 4
    expect(screen.getByDisplayValue("4")).toBeInTheDocument();
    // Click the + button
    const plusBtn = screen.getByRole("button", { name: /increment/i });
    await user.click(plusBtn);
    expect(onLog).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "goal", name: "follow-ups", count: 5 }),
    );
  });
});

// C-bld-027: in edit mode, × button present; clicking brick body does NOT call onLog
describe("C-bld-027: edit mode shows delete button, brick body does not log", () => {
  it("has Delete brick button and clicking body does not call onLog", async () => {
    const user = userEvent.setup();
    const onLog = vi.fn();
    const { container } = renderBrick({
      brick: makeTick(false),
      onLog,
      editMode: true,
    });
    // Delete brick button should be present
    expect(
      screen.getByRole("button", { name: "Delete brick" }),
    ).toBeInTheDocument();
    // Clicking the main brick button should NOT call onLog
    const brickBtn = container.querySelector("[data-brick-body]");
    if (brickBtn) await user.click(brickBtn as HTMLElement);
    expect(onLog).not.toHaveBeenCalled();
  });
});

// C-bld-031: interactive brick element has role=button and accessible name
describe("C-bld-031: brick is a button with accessible name", () => {
  it("is a button element with non-empty accessible name", () => {
    renderBrick({
      brick: {
        id: "t1",
        name: "morning stretch",
        kind: "tick",
        hasDuration: false,
        done: true,
        categoryId: null,
        parentBlockId: null,
      },
    });
    const btn = screen.getByRole("button", { name: /morning stretch/i });
    expect(btn).toBeInTheDocument();
    expect(btn.tagName).toBe("BUTTON");
  });
});
