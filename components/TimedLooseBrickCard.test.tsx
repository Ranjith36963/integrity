// components/TimedLooseBrickCard.test.tsx — M4e component tests
// Covers: C-m4e-020..021

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TimedLooseBrickCard } from "./TimedLooseBrickCard";
import type { Brick, Category } from "@/lib/types";
import { HOUR_HEIGHT_PX, timeToOffsetPx } from "@/lib/timeOffset";

vi.mock("@/lib/haptics", () => ({
  haptics: { light: vi.fn(), medium: vi.fn(), success: vi.fn() },
}));

const cat1: Category = { id: "c1", name: "Running", color: "#fbbf24" };

function makeTickBrick(
  overrides: Partial<{
    id: string;
    name: string;
    categoryId: string | null;
    start: string;
    end: string;
  }> = {},
): Brick {
  return {
    id: overrides.id ?? "r1",
    name: overrides.name ?? "Run",
    kind: "tick",
    done: false,
    hasDuration: true,
    start: overrides.start ?? "09:00",
    end: overrides.end ?? "09:30",
    recurrence: { kind: "just-today", date: "2026-05-14" },
    categoryId:
      "categoryId" in overrides ? (overrides.categoryId ?? null) : "c1",
    parentBlockId: null,
  };
}

// ─── C-m4e-020: TimedLooseBrickCard positioning + dashed border ──────────────

describe("C-m4e-020: TimedLooseBrickCard absolute positioning and dashed border", () => {
  it("outer wrapper has data-testid=timed-loose-brick; top/height match timeToOffsetPx; border-style=dashed", () => {
    const { container } = render(
      <TimedLooseBrickCard
        brick={makeTickBrick({ start: "09:00", end: "09:30" })}
        categories={[cat1]}
        onTickToggle={vi.fn()}
      />,
    );
    const wrapper = container.querySelector(
      "[data-testid='timed-loose-brick']",
    ) as HTMLElement;
    expect(wrapper).toBeTruthy();

    const expectedTop = timeToOffsetPx("09:00", HOUR_HEIGHT_PX);
    const expectedHeight =
      timeToOffsetPx("09:30", HOUR_HEIGHT_PX) -
      timeToOffsetPx("09:00", HOUR_HEIGHT_PX);

    expect(wrapper.style.top).toBe(`${expectedTop}px`);
    expect(wrapper.style.height).toBe(`${expectedHeight}px`);
    expect(wrapper.style.borderStyle).toBe("dashed");
    // Border width 1.5px
    expect(wrapper.style.borderWidth).toBe("1.5px");
    // Border color is category color — JSDOM converts hex to rgb
    const borderColor = wrapper.style.borderColor;
    expect(
      borderColor === "#fbbf24" || borderColor === "rgb(251, 191, 36)",
    ).toBe(true);
  });

  it("border-color falls back to var(--ink-dim) when categoryId is null", () => {
    const { container } = render(
      <TimedLooseBrickCard
        brick={makeTickBrick({ categoryId: null })}
        categories={[cat1]}
        onTickToggle={vi.fn()}
      />,
    );
    const wrapper = container.querySelector(
      "[data-testid='timed-loose-brick']",
    ) as HTMLElement;
    expect(wrapper.style.borderColor).toBe("var(--ink-dim)");
  });
});

// ─── C-m4e-021: TimedLooseBrickCard interactivity ────────────────────────────

describe("C-m4e-021: TimedLooseBrickCard inner BrickChip is fully interactive", () => {
  it("tick brick: onTickToggle called with brick.id on chip click", () => {
    const onTickToggle = vi.fn();
    render(
      <TimedLooseBrickCard
        brick={makeTickBrick()}
        categories={[cat1]}
        onTickToggle={onTickToggle}
      />,
    );
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    expect(onTickToggle).toHaveBeenCalledWith("r1");
  });

  it("goal brick: onGoalLog called on stepper increase tap", () => {
    const onGoalLog = vi.fn();
    const goalBrick: Brick = {
      id: "r2",
      name: "Pushups",
      kind: "goal",
      target: 5,
      count: 3,
      unit: "reps",
      hasDuration: true,
      start: "09:00",
      end: "09:30",
      recurrence: { kind: "just-today", date: "2026-05-14" },
      categoryId: null,
      parentBlockId: null,
    };
    render(
      <TimedLooseBrickCard
        brick={goalBrick}
        categories={[]}
        onGoalLog={onGoalLog}
      />,
    );
    const plusBtn = screen.getByRole("button", { name: /increase pushups/i });
    fireEvent.pointerDown(plusBtn);
    fireEvent.pointerUp(plusBtn);
    expect(onGoalLog).toHaveBeenCalledWith("r2", 1);
  });
});
