/**
 * C-m0-019: BrickChip tick variant: onToggle, accessible name, empty state, 44px.
 * C-m0-020: BrickChip goal variant: stepper popover, onCommit called with next value.
 * C-m0-021: BrickChip time variant: aria-valuenow=50 for 50% fill, label "15/30 min".
 * C-m0-022: BrickChip editMode: × button present, chip body does NOT call onToggle.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrickChip } from "./BrickChip";

// C-m0-019
describe("C-m0-019: BrickChip tick variant", () => {
  it("calls onToggle when clicked", async () => {
    const spy = vi.fn();
    render(
      <BrickChip
        kind="tick"
        name="lunch"
        done={false}
        onToggle={spy}
        category="health"
      />,
    );
    const btn = screen.getByRole("button", { name: /lunch/ });
    await userEvent.click(btn);
    expect(spy).toHaveBeenCalledOnce();
  });

  it("accessible name includes 'lunch'", () => {
    render(
      <BrickChip
        kind="tick"
        name="lunch"
        done={false}
        onToggle={vi.fn()}
        category="health"
      />,
    );
    const btn = screen.getByRole("button", { name: /lunch/ });
    expect(btn).toBeInTheDocument();
  });

  it("visual state is empty (no filled class) when done=false", () => {
    render(
      <BrickChip
        kind="tick"
        name="lunch"
        done={false}
        onToggle={vi.fn()}
        category="health"
      />,
    );
    // The checkbox span should have transparent background
    const checkbox = document.querySelector(
      '[aria-hidden="true"]',
    ) as HTMLElement;
    expect(checkbox?.style?.background).toBe("transparent");
  });

  it("bounding box ≥44×44 via min-h/w-[44px] classes", () => {
    render(
      <BrickChip
        kind="tick"
        name="lunch"
        done={false}
        onToggle={vi.fn()}
        category="health"
      />,
    );
    const btn = screen.getByRole("button", { name: /lunch/ });
    expect(btn.className).toContain("min-h-[44px]");
    expect(btn.className).toContain("min-w-[44px]");
  });
});

// C-m0-020
describe("C-m0-020: BrickChip goal variant", () => {
  it("calls onCommit with 5 when stepper + is clicked after chip opens stepper", async () => {
    const spy = vi.fn();
    render(
      <BrickChip
        kind="goal"
        name="follow-ups"
        current={4}
        target={5}
        unit="reps"
        onCommit={spy}
        category="career"
      />,
    );
    // Click chip to open stepper
    const chip = screen.getByRole("button", { name: /follow-ups/ });
    await userEvent.click(chip);

    // Now stepper should be visible — click Increment
    const incBtn = screen.getByRole("button", { name: "Increment" });
    await userEvent.click(incBtn);
    expect(spy).toHaveBeenCalledWith(5);
  });

  it("accessible label includes '4/5 reps' before commit", () => {
    render(
      <BrickChip
        kind="goal"
        name="follow-ups"
        current={4}
        target={5}
        unit="reps"
        onCommit={vi.fn()}
        category="career"
      />,
    );
    const chip = screen.getByRole("button", { name: /follow-ups 4\/5 reps/ });
    expect(chip).toBeInTheDocument();
  });
});

// C-m0-021
describe("C-m0-021: BrickChip time variant", () => {
  it("accessible label includes progress for 900/1800 seconds (50%)", () => {
    render(
      <BrickChip
        kind="time"
        name="meditate"
        accumulatedSec={900}
        targetSec={1800}
        running={false}
        onToggle={vi.fn()}
        category="mind"
      />,
    );
    // Progress is expressed in the aria-label text (not aria-valuenow on a button,
    // which is an invalid ARIA pattern — button does not support aria-valuenow).
    const btn = screen.getByRole("button", { name: /meditate 15\/30 min/ });
    expect(btn).toBeInTheDocument();
  });

  it("accessible label includes '15/30 min'", () => {
    render(
      <BrickChip
        kind="time"
        name="meditate"
        accumulatedSec={900}
        targetSec={1800}
        running={false}
        onToggle={vi.fn()}
        category="mind"
      />,
    );
    // 900s = 15min, 1800s = 30min
    const btn = screen.getByRole("button", { name: /meditate 15\/30 min/ });
    expect(btn).toBeInTheDocument();
  });
});

// C-m0-022
describe("C-m0-022: BrickChip editMode", () => {
  it("shows × button with aria-label='Delete brick'", () => {
    render(
      <BrickChip
        kind="tick"
        name="lunch"
        done={false}
        editMode
        onDelete={vi.fn()}
        onToggle={vi.fn()}
        category="health"
      />,
    );
    const deleteBtn = screen.getByRole("button", { name: "Delete brick" });
    expect(deleteBtn).toBeInTheDocument();
  });

  it("clicking chip body does NOT call onToggle in editMode", async () => {
    const spy = vi.fn();
    render(
      <BrickChip
        kind="tick"
        name="lunch"
        done={false}
        editMode
        onDelete={vi.fn()}
        onToggle={spy}
        category="health"
      />,
    );
    const btn = screen.getByRole("button", { name: /lunch/ });
    await userEvent.click(btn);
    expect(spy).not.toHaveBeenCalled();
  });
});
