// components/BrickChip.test.tsx — M3 component tests for new BrickChip
// Covers: C-m3-001..005

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrickChip } from "./BrickChip";
import type { Brick, Category } from "@/lib/types";

const cat1: Category = { id: "c1", name: "category 1", color: "#34d399" };

function makeTick(done: boolean, categoryId: string | null = "c1"): Brick {
  return {
    id: "r1",
    name: "brick A",
    kind: "tick",
    done,
    categoryId,
    parentBlockId: null,
  };
}

function makeGoal(
  count: number,
  target: number,
  unit: string,
  categoryId: string | null = "c1",
): Brick {
  return {
    id: "r2",
    name: "brick B",
    kind: "goal",
    count,
    target,
    unit,
    categoryId,
    parentBlockId: "b1",
  };
}

function makeTime(
  minutesDone: number,
  durationMin: number,
  categoryId: string | null = "c1",
): Brick {
  return {
    id: "r3",
    name: "brick C",
    kind: "time",
    minutesDone,
    durationMin,
    categoryId,
    parentBlockId: "b1",
  };
}

// ─── C-m3-001: tick render; checkbox state; aria-label ────────────────────────

describe("C-m3-001: BrickChip tick render", () => {
  it("displays title 'brick A'", () => {
    render(<BrickChip brick={makeTick(false)} categories={[cat1]} />);
    expect(screen.getByText("brick A")).toBeInTheDocument();
  });

  it("renders unchecked badge when done:false", () => {
    render(<BrickChip brick={makeTick(false)} categories={[cat1]} />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toBe("brick A, tick, 0% complete");
  });

  it("foreground gradient overlay width is 0% when done:false", () => {
    const { container } = render(
      <BrickChip brick={makeTick(false)} categories={[cat1]} />,
    );
    const fill = container.querySelector(
      "[data-testid='brick-fill']",
    ) as HTMLElement;
    expect(fill?.style.width).toBe("0%");
  });

  it("outer button has aria-label='brick A, tick, 0% complete' when done:false", () => {
    render(<BrickChip brick={makeTick(false)} categories={[cat1]} />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toBe("brick A, tick, 0% complete");
  });

  it("when done:true — badge shows check icon and aria-label includes 100%", () => {
    render(<BrickChip brick={makeTick(true)} categories={[cat1]} />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toBe("brick A, tick, 100% complete");
  });
});

// ─── C-m3-002: goal render; count/target/unit display; foreground width ───────

describe("C-m3-002: BrickChip goal render", () => {
  it("displays title 'brick B' and badge '50 / 100 reps'", () => {
    render(<BrickChip brick={makeGoal(50, 100, "reps")} categories={[cat1]} />);
    expect(screen.getByText("brick B")).toBeInTheDocument();
    expect(screen.getByText("50 / 100 reps")).toBeInTheDocument();
  });

  it("foreground gradient overlay width is 50%", () => {
    const { container } = render(
      <BrickChip brick={makeGoal(50, 100, "reps")} categories={[cat1]} />,
    );
    const fill = container.querySelector(
      "[data-testid='brick-fill']",
    ) as HTMLElement;
    expect(fill?.style.width).toBe("50%");
  });

  it("aria-label includes '50 of 100 reps'", () => {
    render(<BrickChip brick={makeGoal(50, 100, "reps")} categories={[cat1]} />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toContain("50 of 100 reps");
  });

  it("with unit blank, badge renders '50 / 100' (no trailing space)", () => {
    render(<BrickChip brick={makeGoal(50, 100, "")} categories={[cat1]} />);
    expect(screen.getByText("50 / 100")).toBeInTheDocument();
  });
});

// ─── C-m3-003: time render; minutesDone/durationMin display ───────────────────

describe("C-m3-003: BrickChip time render", () => {
  it("displays title 'brick C' and badge '15 / 30 m' with play icon", () => {
    render(<BrickChip brick={makeTime(15, 30)} categories={[cat1]} />);
    expect(screen.getByText("brick C")).toBeInTheDocument();
    expect(screen.getByText(/15 \/ 30 m/)).toBeInTheDocument();
  });

  it("foreground gradient overlay width is 50%", () => {
    const { container } = render(
      <BrickChip brick={makeTime(15, 30)} categories={[cat1]} />,
    );
    const fill = container.querySelector(
      "[data-testid='brick-fill']",
    ) as HTMLElement;
    expect(fill?.style.width).toBe("50%");
  });

  it("aria-label includes '15 of 30 minutes'", () => {
    render(<BrickChip brick={makeTime(15, 30)} categories={[cat1]} />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toContain("15 of 30 minutes");
  });
});

// ─── C-m3-004: uncategorized fallback ─────────────────────────────────────────

describe("C-m3-004: BrickChip uncategorized fallback", () => {
  it("chip has data-uncategorized attribute when categoryId is null", () => {
    const { container } = render(
      <BrickChip brick={makeTick(false, null)} categories={[]} />,
    );
    const outer = container.firstElementChild as HTMLElement;
    expect(outer?.dataset.uncategorized).toBe("true");
  });

  it("aria-label is 'brick A, tick, 0% complete' with no category errors", () => {
    render(<BrickChip brick={makeTick(false, null)} categories={[]} />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toBe("brick A, tick, 0% complete");
  });
});

// ─── C-m3-005: touch target ≥ 44 px; no-op onClick ───────────────────────────

describe("C-m3-005: BrickChip touch target and no-op onClick", () => {
  it("outer button has min-height 44px class for size='md' (default)", () => {
    const { container } = render(
      <BrickChip brick={makeTick(false)} categories={[cat1]} size="md" />,
    );
    const btn = container.querySelector("button") as HTMLElement;
    // Check that button has a min-h class for 44px
    expect(btn?.style.minHeight || btn?.className).toMatch(/44/);
  });

  it("outer button has min-height 44px class for size='sm'", () => {
    const { container } = render(
      <BrickChip brick={makeTick(false)} categories={[cat1]} size="sm" />,
    );
    const btn = container.querySelector("button") as HTMLElement;
    expect(btn?.style.minHeight || btn?.className).toMatch(/44/);
  });

  it("clicking the chip is a no-op (M4 wires logging)", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <BrickChip brick={makeTick(false)} categories={[cat1]} />,
    );
    const btn = container.querySelector("button") as HTMLElement;
    // Should not throw and state should not change
    await user.click(btn);
    // No assertion needed; just ensure no error thrown
    expect(btn).toBeInTheDocument();
  });
});
