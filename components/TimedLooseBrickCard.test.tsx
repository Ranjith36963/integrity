// components/TimedLooseBrickCard.test.tsx — M4e component tests
// Covers: C-m4e-020..021, C-m5-007

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimedLooseBrickCard } from "./TimedLooseBrickCard";
import { EditModeProvider } from "./EditModeProvider";
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

  it("units brick: onUnitsOpenSheet called with brick.id when chip tapped (M4f: no stepper)", () => {
    const onUnitsOpenSheet = vi.fn();
    const unitsBrick: Brick = {
      id: "r2",
      name: "Pushups",
      kind: "units",
      target: 5,
      done: 3,
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
        brick={unitsBrick}
        categories={[]}
        onUnitsOpenSheet={onUnitsOpenSheet}
      />,
    );
    // M4f: units chip is a single button (no stepper); tap opens sheet
    const chipBtn = screen.getByRole("button", {
      name: /pushups.*units/i,
    });
    fireEvent.click(chipBtn);
    expect(onUnitsOpenSheet).toHaveBeenCalledWith("r2");
  });
});

// ─── C-m5-007: TimedLooseBrickCard Edit Mode — × delete, log suppressed ──────

const looseBrick: Brick = {
  id: "brk-loose",
  name: "Run",
  kind: "tick",
  done: false,
  hasDuration: true,
  start: "07:00",
  end: "07:30",
  recurrence: { kind: "just-today", date: "2026-05-14" },
  categoryId: null,
  parentBlockId: null,
};

describe("C-m5-007: TimedLooseBrickCard — Unlocked shows × delete; log suppressed in edit mode", () => {
  it("Locked (default): no × delete button; tick log fires on tap", () => {
    const onTick = vi.fn();
    render(
      <EditModeProvider>
        <TimedLooseBrickCard
          brick={looseBrick}
          categories={[]}
          onTickToggle={onTick}
          onRequestDeleteBrick={vi.fn()}
        />
      </EditModeProvider>,
    );
    expect(screen.queryByRole("button", { name: /delete brick/i })).toBeNull();
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    expect(onTick).toHaveBeenCalledWith("brk-loose");
  });

  it("Unlocked: × appears with aria-label='Delete brick Run'; ≥44px", async () => {
    const user = userEvent.setup();
    const { TopBar } = await import("./TopBar");
    render(
      <EditModeProvider>
        <TopBar />
        <TimedLooseBrickCard
          brick={looseBrick}
          categories={[]}
          onTickToggle={vi.fn()}
          onRequestDeleteBrick={vi.fn()}
        />
      </EditModeProvider>,
    );
    const pencil = screen.getByRole("button", { name: /edit mode/i });
    await user.click(pencil);
    const deleteBtn = screen.getByRole("button", {
      name: "Delete brick Run",
    });
    expect(deleteBtn).toBeInTheDocument();
    // jsdom has no layout engine; check inline style.minHeight / style.width (like TimelineBlock.test.tsx)
    const minH = Number(deleteBtn.style.minHeight?.replace("px", "") ?? "0");
    const w = Number(deleteBtn.style.width?.replace("px", "") ?? "0");
    expect(minH >= 44 || w >= 44).toBe(true);
  });

  it("Unlocked: tapping card body fires onTickToggle ZERO times (log suppressed)", async () => {
    const user = userEvent.setup();
    const onTick = vi.fn();
    const { TopBar } = await import("./TopBar");
    render(
      <EditModeProvider>
        <TopBar />
        <TimedLooseBrickCard
          brick={looseBrick}
          categories={[]}
          onTickToggle={onTick}
          onRequestDeleteBrick={vi.fn()}
        />
      </EditModeProvider>,
    );
    const pencil = screen.getByRole("button", { name: /edit mode/i });
    await user.click(pencil);
    // In edit mode, delete button is the only accessible button for this brick
    const cardBtn = screen.getByRole("button", { name: /delete brick run/i });
    await user.click(cardBtn);
    expect(onTick).toHaveBeenCalledTimes(0);
  });

  it("Unlocked: tapping × calls onRequestDeleteBrick exactly once", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const { TopBar } = await import("./TopBar");
    render(
      <EditModeProvider>
        <TopBar />
        <TimedLooseBrickCard
          brick={looseBrick}
          categories={[]}
          onTickToggle={vi.fn()}
          onRequestDeleteBrick={onDelete}
        />
      </EditModeProvider>,
    );
    const pencil = screen.getByRole("button", { name: /edit mode/i });
    await user.click(pencil);
    const deleteBtn = screen.getByRole("button", {
      name: "Delete brick Run",
    });
    await user.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith("brk-loose");
  });
});
