import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Brick } from "./Brick";

function renderBrick(
  props: Partial<Parameters<typeof Brick>[0]> & { editMode?: boolean },
) {
  const defaults = {
    brick: { kind: "tick" as const, name: "test", done: false },
    category: "health" as const,
    index: 0,
    onLog: vi.fn(),
    editMode: false,
  };
  const merged = { ...defaults, ...props };
  return render(<Brick {...merged} />);
}

// C-bld-022: tick brick done:false has class brick--empty in view mode
describe("C-bld-022: tick brick done:false has brick--empty class", () => {
  it("has brick--empty class", () => {
    const { container } = renderBrick({
      brick: { kind: "tick", name: "test", done: false },
    });
    const btn = container.querySelector("button");
    expect(btn?.className).toMatch(/brick--empty/);
  });
});

// C-bld-023: goal brick with current:80, target:100 has brick--partial class
describe("C-bld-023: goal brick 80/100 has brick--partial class", () => {
  it("has brick--partial class", () => {
    const { container } = renderBrick({
      brick: { kind: "goal", name: "pushups", current: 80, target: 100 },
    });
    const btn = container.querySelector("button");
    expect(btn?.className).toMatch(/brick--partial/);
  });
});

// C-bld-024: tick brick done:true has neither brick--empty nor brick--partial
describe("C-bld-024: tick brick done:true is in full state", () => {
  it("has neither brick--empty nor brick--partial", () => {
    const { container } = renderBrick({
      brick: { kind: "tick", name: "test", done: true },
    });
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
    renderBrick({
      brick: { kind: "tick", name: "test", done: false },
      onLog,
      editMode: false,
    });
    const btn = screen.getByRole("button");
    await user.click(btn);
    expect(onLog).toHaveBeenCalledWith({
      kind: "tick",
      name: "test",
      done: true,
    });
  });
});

// C-bld-026: clicking goal brick opens stepper with current value; clicking + calls onLog
describe("C-bld-026: clicking goal brick shows stepper, + increments", () => {
  it("shows stepper with value 4 and clicking + calls onLog with current:5", async () => {
    const user = userEvent.setup();
    const onLog = vi.fn();
    renderBrick({
      brick: { kind: "goal", name: "follow-ups", current: 4, target: 5 },
      onLog,
      editMode: false,
    });
    // Click the main brick button to open stepper
    const btn = screen.getByRole("button", { name: /follow-ups/i });
    await user.click(btn);
    // Stepper should be visible with value 4
    expect(screen.getByDisplayValue("4")).toBeInTheDocument();
    // Click the + button
    const plusBtn = screen.getByRole("button", { name: /increment/i });
    await user.click(plusBtn);
    expect(onLog).toHaveBeenCalledWith({
      kind: "goal",
      name: "follow-ups",
      current: 5,
      target: 5,
    });
  });
});

// C-bld-027: in edit mode, × button present; clicking brick body does NOT call onLog
describe("C-bld-027: edit mode shows delete button, brick body does not log", () => {
  it("has Delete brick button and clicking body does not call onLog", async () => {
    const user = userEvent.setup();
    const onLog = vi.fn();
    const { container } = renderBrick({
      brick: { kind: "tick", name: "test", done: false },
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
      brick: { kind: "tick", name: "morning stretch", done: true },
    });
    const btn = screen.getByRole("button", { name: /morning stretch/i });
    expect(btn).toBeInTheDocument();
    expect(btn.tagName).toBe("BUTTON");
  });
});
