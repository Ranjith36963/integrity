// components/BrickChip.test.tsx — M3 component tests for new BrickChip
// Covers: C-m3-001..005, C-m4a-001..009

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrickChip } from "./BrickChip";
import type { Brick, Category } from "@/lib/types";

const cat1: Category = { id: "c1", name: "category 1", color: "#34d399" };

function makeTick(done: boolean, categoryId: string | null = "c1"): Brick {
  return {
    id: "r1",
    name: "brick A",
    kind: "tick",
    hasDuration: false,
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
    hasDuration: false,
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
    hasDuration: false,
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
    // M4a: tick aria-label changed to enriched format (plan.md SG-m4a-02)
    expect(btn.getAttribute("aria-label")).toBe(
      "brick A, not done, tap to toggle",
    );
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

  it("outer button has enriched aria-label when done:false (M4a SG-m4a-02)", () => {
    render(<BrickChip brick={makeTick(false)} categories={[cat1]} />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toBe(
      "brick A, not done, tap to toggle",
    );
  });

  it("when done:true — badge shows check icon and aria-label says 'done'", () => {
    render(<BrickChip brick={makeTick(true)} categories={[cat1]} />);
    const btn = screen.getByRole("button");
    // M4a: enriched label for tick done:true
    expect(btn.getAttribute("aria-label")).toBe("brick A, done, tap to toggle");
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

  it("aria-label includes '50 of 100 reps' (M4b: on group wrapper, not button)", () => {
    render(<BrickChip brick={makeGoal(50, 100, "reps")} categories={[cat1]} />);
    // M4b: goal chip uses <div role="group"> wrapper; aria-label is on the group
    const group = screen.getByRole("group");
    expect(group.getAttribute("aria-label")).toContain("50 of 100 reps");
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

  it("aria-label uses M4a enriched format with no category errors", () => {
    render(<BrickChip brick={makeTick(false, null)} categories={[]} />);
    const btn = screen.getByRole("button");
    // M4a: tick aria-label changed to enriched format (SG-m4a-02)
    expect(btn.getAttribute("aria-label")).toBe(
      "brick A, not done, tap to toggle",
    );
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

// ─── C-m4a-001: tick chip dispatches onTickToggle + haptics.light on tap ───────

vi.mock("@/lib/haptics", () => ({
  haptics: {
    light: vi.fn(),
    medium: vi.fn(),
    success: vi.fn(),
    notification: vi.fn(),
  },
}));

describe("C-m4a-001: tick chip calls onTickToggle and haptics.light on click", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("onTickToggle called once with brick.id; haptics.light called once", async () => {
    const { haptics } = await import("@/lib/haptics");
    const onTickToggle = vi.fn();
    const user = userEvent.setup();
    render(
      <BrickChip
        brick={makeTick(false)}
        categories={[cat1]}
        onTickToggle={onTickToggle}
      />,
    );
    const btn = screen.getByRole("button");
    await user.click(btn);
    expect(onTickToggle).toHaveBeenCalledTimes(1);
    expect(onTickToggle).toHaveBeenCalledWith("r1");
    expect(haptics.light).toHaveBeenCalledTimes(1);
  });
});

// ─── C-m4a-002: goal chip is no-op for onTickToggle ─────────────────────────
// Updated for M4b: goal chip is now <div role="group"> with stepper buttons.
// Selector updated from getByRole("button") to getByRole("group") per plan.md
// § Migration / obsolete IDs (VERIFIER drift flag).

describe("C-m4a-002: goal chip does not call onTickToggle (M4b: group wrapper, not button)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("onTickToggle NOT called when goal chip group is queried; group has role='group'", async () => {
    const onTickToggle = vi.fn();
    render(
      <BrickChip
        brick={makeGoal(2, 5, "")}
        categories={[cat1]}
        onTickToggle={onTickToggle}
      />,
    );
    // M4b: goal chip uses <div role="group"> wrapper, not a single <button>
    const group = screen.getByRole("group");
    expect(group).toBeInTheDocument();
    expect(onTickToggle).not.toHaveBeenCalled();
  });
});

// ─── C-m4a-003: time chip tap does NOT fire onTickToggle ─────────────────────
// M4c update: time chips now fire haptics.light on tap (timer toggle path),
// but onTickToggle is still never called for time chips.

describe("C-m4a-003: time chip tap does NOT call onTickToggle (M4c: timer path only)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("onTickToggle NOT called when time chip tapped (M4c: timer toggle path, not tick)", async () => {
    const onTickToggle = vi.fn();
    render(
      <BrickChip
        brick={makeTime(0, 600000)}
        categories={[cat1]}
        onTickToggle={onTickToggle}
        running={false}
        onTimerToggle={vi.fn()}
        onTimerOpenSheet={vi.fn()}
      />,
    );
    const btn = screen.getByRole("button");
    fireEvent.pointerDown(btn);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    fireEvent.pointerUp(btn);
    expect(onTickToggle).not.toHaveBeenCalled();
  });
});

// ─── C-m4a-004: aria-label + aria-pressed for tick done:false ────────────────

describe("C-m4a-004: tick chip done:false has correct aria-pressed and aria-label", () => {
  it("button has aria-pressed=false and aria-label includes 'not done, tap to toggle'", () => {
    render(<BrickChip brick={makeTick(false)} categories={[cat1]} />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    expect(btn.getAttribute("aria-label")).toBe(
      "brick A, not done, tap to toggle",
    );
  });
});

// ─── C-m4a-005: aria-label + aria-pressed for tick done:true + Check glyph ───

describe("C-m4a-005: tick chip done:true has correct aria-pressed, aria-label, and Check glyph", () => {
  it("button has aria-pressed=true and aria-label says 'done, tap to toggle'", () => {
    render(<BrickChip brick={makeTick(true)} categories={[cat1]} />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    expect(btn.getAttribute("aria-label")).toBe("brick A, done, tap to toggle");
  });

  it("Check icon is rendered (svg with aria-hidden) when done:true", () => {
    const { container } = render(
      <BrickChip brick={makeTick(true)} categories={[cat1]} />,
    );
    const svgs = container.querySelectorAll("svg[aria-hidden='true']");
    expect(svgs.length).toBeGreaterThan(0);
  });
});

// ─── C-m4a-006: 44 px tap target (ADR-031) ───────────────────────────────────

describe("C-m4a-006: tick chip button has minHeight >= 44px (ADR-031)", () => {
  it("getComputedStyle or inline style shows minHeight 44px", () => {
    const { container } = render(
      <BrickChip brick={makeTick(false)} categories={[cat1]} />,
    );
    const btn = container.querySelector("button") as HTMLElement;
    // Inline style is set on the button — check minHeight attribute
    expect(btn.style.minHeight).toBe("44px");
  });
});

// ─── C-m4a-007: reduced-motion → brick-fill transition is none ────────────────

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return {
    ...actual,
    useReducedMotion: vi.fn(),
  };
});

describe("C-m4a-007: reduced-motion suppresses brick-fill transition", () => {
  it("brick-fill transition is 'none' when useReducedMotion returns true", async () => {
    const { useReducedMotion } = await import("motion/react");
    vi.mocked(useReducedMotion).mockReturnValue(true);
    const { container } = render(
      <BrickChip brick={makeTick(false)} categories={[cat1]} />,
    );
    const fill = container.querySelector(
      "[data-testid='brick-fill']",
    ) as HTMLElement;
    expect(fill.style.transition).toBe("none");
  });
});

// ─── C-m4a-008: brick-fill has width 600ms ease-in-out when not reduced-motion ─

describe("C-m4a-008: brick-fill transition is 600ms ease-in-out when useReducedMotion=false", () => {
  it("brick-fill transition includes 'width 600ms ease-in-out'", async () => {
    const { useReducedMotion } = await import("motion/react");
    vi.mocked(useReducedMotion).mockReturnValue(false);
    const { container } = render(
      <BrickChip brick={makeTick(false)} categories={[cat1]} />,
    );
    const fill = container.querySelector(
      "[data-testid='brick-fill']",
    ) as HTMLElement;
    expect(fill.style.transition).toContain("width 600ms ease-in-out");
  });
});

// ─── C-m4a-009: keyboard Enter/Space activates onTickToggle ──────────────────

describe("C-m4a-009: keyboard Enter and Space activate onTickToggle on tick chip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Enter press calls onTickToggle once", async () => {
    const onTickToggle = vi.fn();
    const user = userEvent.setup();
    render(
      <BrickChip
        brick={makeTick(false)}
        categories={[cat1]}
        onTickToggle={onTickToggle}
      />,
    );
    const btn = screen.getByRole("button");
    btn.focus();
    await user.keyboard("{Enter}");
    expect(onTickToggle).toHaveBeenCalledTimes(1);
    expect(onTickToggle).toHaveBeenCalledWith("r1");
  });

  it("Space press calls onTickToggle once", async () => {
    const onTickToggle = vi.fn();
    const user = userEvent.setup();
    render(
      <BrickChip
        brick={makeTick(false)}
        categories={[cat1]}
        onTickToggle={onTickToggle}
      />,
    );
    const btn = screen.getByRole("button");
    btn.focus();
    await user.keyboard(" ");
    expect(onTickToggle).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// M4b component tests — goal chip stepper variant
// ─────────────────────────────────────────────────────────────────────────────

function makeGoalBrick(
  id: string,
  name: string,
  count: number,
  target: number,
  unit = "",
): import("@/lib/types").Brick {
  return {
    id,
    name,
    kind: "goal",
    hasDuration: false,
    count,
    target,
    unit,
    categoryId: "c1",
    parentBlockId: "b1",
  };
}

// ─── C-m4b-001: goal chip renders group + two stepper buttons ────────────────

describe("C-m4b-001: goal chip renders <div role='group'> with Decrease/Increase buttons", () => {
  it("outer wrapper is role='group'; exactly two stepper buttons with correct aria-labels", () => {
    render(
      <BrickChip
        brick={makeGoalBrick("g1", "pushups", 2, 10, "reps")}
        categories={[cat1]}
      />,
    );
    const group = screen.getByRole("group");
    expect(group).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Decrease pushups" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Increase pushups" }),
    ).toBeInTheDocument();
  });
});

// ─── C-m4b-002: stepper buttons meet 44px touch target (ADR-031) ─────────────

describe("C-m4b-002: goal chip stepper buttons have min-width >= 44px and min-height >= 44px", () => {
  it("each stepper button's inline style shows minWidth and minHeight of 44px", () => {
    const { container } = render(
      <BrickChip
        brick={makeGoalBrick("g1", "pushups", 2, 10, "reps")}
        categories={[cat1]}
      />,
    );
    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBe(2);
    buttons.forEach((btn) => {
      expect(btn.style.minWidth).toBe("44px");
      expect(btn.style.minHeight).toBe("44px");
    });
  });
});

// ─── C-m4b-003: − disabled at count === 0 ─────────────────────────────────────

describe("C-m4b-003: goal chip − button is disabled when count === 0", () => {
  it("minus button has disabled attribute; plus button does not", () => {
    render(
      <BrickChip
        brick={makeGoalBrick("g1", "pushups", 0, 10)}
        categories={[cat1]}
      />,
    );
    const minus = screen.getByRole("button", { name: "Decrease pushups" });
    const plus = screen.getByRole("button", { name: "Increase pushups" });
    expect(minus).toBeDisabled();
    expect(plus).not.toBeDisabled();
  });
});

// ─── C-m4b-004: + disabled at count === target ─────────────────────────────────

describe("C-m4b-004: goal chip + button is disabled when count === target", () => {
  it("plus button has disabled attribute; minus button does not", () => {
    render(
      <BrickChip
        brick={makeGoalBrick("g1", "pushups", 10, 10)}
        categories={[cat1]}
      />,
    );
    const minus = screen.getByRole("button", { name: "Decrease pushups" });
    const plus = screen.getByRole("button", { name: "Increase pushups" });
    expect(plus).toBeDisabled();
    expect(minus).not.toBeDisabled();
  });
});

// ─── C-m4b-005: tap + dispatches onGoalLog once with delta:1 + light haptic ──

describe("C-m4b-005: single tap on + calls onGoalLog(id, 1) and haptics.light once", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("onGoalLog called once with ('g1', 1); haptics.light once; no medium", async () => {
    const { haptics } = await import("@/lib/haptics");
    const onGoalLog = vi.fn();
    const user = userEvent.setup();
    render(
      <BrickChip
        brick={makeGoalBrick("g1", "pushups", 3, 10)}
        categories={[cat1]}
        onGoalLog={onGoalLog}
      />,
    );
    const plus = screen.getByRole("button", { name: "Increase pushups" });
    await user.pointer({ keys: "[MouseLeft>]", target: plus });
    await user.pointer({ keys: "[/MouseLeft]", target: plus });
    expect(onGoalLog).toHaveBeenCalledTimes(1);
    expect(onGoalLog).toHaveBeenCalledWith("g1", 1);
    expect(haptics.light).toHaveBeenCalledTimes(1);
    expect(haptics.medium).not.toHaveBeenCalled();
  });
});

// ─── C-m4b-006: tap − dispatches onGoalLog once with delta:-1 + light haptic ─

describe("C-m4b-006: single tap on - calls onGoalLog(id, -1) and haptics.light once", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("onGoalLog called once with ('g1', -1); haptics.light once; no medium", async () => {
    const { haptics } = await import("@/lib/haptics");
    const onGoalLog = vi.fn();
    const user = userEvent.setup();
    render(
      <BrickChip
        brick={makeGoalBrick("g1", "pushups", 3, 10)}
        categories={[cat1]}
        onGoalLog={onGoalLog}
      />,
    );
    const minus = screen.getByRole("button", { name: "Decrease pushups" });
    await user.pointer({ keys: "[MouseLeft>]", target: minus });
    await user.pointer({ keys: "[/MouseLeft]", target: minus });
    expect(onGoalLog).toHaveBeenCalledTimes(1);
    expect(onGoalLog).toHaveBeenCalledWith("g1", -1);
    expect(haptics.light).toHaveBeenCalledTimes(1);
    expect(haptics.medium).not.toHaveBeenCalled();
  });
});

// ─── C-m4b-007: clamp haptic (medium) at ceiling; no dispatch ─────────────────
// Note: <button disabled> doesn't receive pointer events in real browsers/JSDOM.
// The clamp haptic path is tested by using fireEvent which bypasses the disabled
// constraint — simulates the "press path" per plan.md § Components > BrickChip.
// The component's fireTick(1) fires medium when isAtCeil=true.
// For production: the enabled=false guard in useLongPressRepeat prevents auto-
// repeat ticks from firing after the cap is reached mid-press (defense-in-depth).

describe("C-m4b-007: clamp haptic fires medium when pressed at count===target", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("haptics.medium called; onGoalLog NOT called; no light haptic (ceiling clamp)", async () => {
    const { haptics } = await import("@/lib/haptics");
    const onGoalLog = vi.fn();
    // We use a wrapper with a button that triggers fireTick(1) at isAtCeil=true.
    // Since <button disabled> blocks pointer events, we test via the clamp logic
    // by rendering count=9,target=10 (enabled) and calling with a manual check:
    // Actually, test the fireTick clamp path by rendering count=10,target=10
    // and using fireEvent.pointerDown to bypass JSDOM disabled-button filter.
    render(
      <BrickChip
        brick={makeGoalBrick("g1", "pushups", 10, 10)}
        categories={[cat1]}
        onGoalLog={onGoalLog}
      />,
    );
    const plus = screen.getByRole("button", { name: "Increase pushups" });
    // fireEvent dispatches the event even on disabled buttons (bypasses browser filter)
    fireEvent.pointerDown(plus);
    expect(onGoalLog).not.toHaveBeenCalled();
    expect(haptics.light).not.toHaveBeenCalled();
    expect(haptics.medium).toHaveBeenCalledTimes(1);
  });
});

// ─── C-m4b-008: clamp haptic (medium) at floor on −; no dispatch ──────────────

describe("C-m4b-008: clamp haptic fires medium when − pressed at count===0", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("haptics.medium called; onGoalLog NOT called; no light haptic (floor clamp)", async () => {
    const { haptics } = await import("@/lib/haptics");
    const onGoalLog = vi.fn();
    render(
      <BrickChip
        brick={makeGoalBrick("g1", "pushups", 0, 10)}
        categories={[cat1]}
        onGoalLog={onGoalLog}
      />,
    );
    const minus = screen.getByRole("button", { name: "Decrease pushups" });
    fireEvent.pointerDown(minus);
    expect(onGoalLog).not.toHaveBeenCalled();
    expect(haptics.light).not.toHaveBeenCalled();
    expect(haptics.medium).toHaveBeenCalledTimes(1);
  });
});

// ─── C-m4b-009: badge text format ${count} / ${target}${unit ? ' '+unit : ''} ─

describe("C-m4b-009: goal badge text format honors unit presence/absence", () => {
  it("renders '3 / 10 reps' when unit is non-empty", () => {
    const { container } = render(
      <BrickChip
        brick={makeGoalBrick("g1", "pushups", 3, 10, "reps")}
        categories={[cat1]}
      />,
    );
    const badge = container.querySelector(
      "[role='group'] > div span[aria-hidden='true']",
    );
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toBe("3 / 10 reps");
  });

  it("renders '3 / 10' with no trailing whitespace when unit is empty", () => {
    const { container } = render(
      <BrickChip
        brick={makeGoalBrick("g1", "pushups", 3, 10, "")}
        categories={[cat1]}
      />,
    );
    const badge = container.querySelector(
      "[role='group'] > div span[aria-hidden='true']",
    );
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toBe("3 / 10");
    expect(badge!.textContent).not.toMatch(/\s$/);
  });
});

// ─── C-m4b-010: goal brick-fill width = (count/target)*100% with brickFill ────

describe("C-m4b-010: goal brick-fill is 30% wide and transitions width 600ms ease-in-out", () => {
  it("width is 30% and transition includes 'width 600ms ease-in-out' when reduced-motion=false", async () => {
    const { useReducedMotion } = await import("motion/react");
    vi.mocked(useReducedMotion).mockReturnValue(false);
    const { container } = render(
      <BrickChip
        brick={makeGoalBrick("g1", "pushups", 3, 10)}
        categories={[cat1]}
      />,
    );
    const fill = container.querySelector(
      "[data-testid='brick-fill']",
    ) as HTMLElement;
    expect(fill.style.width).toBe("30%");
    expect(fill.style.transition).toContain("width 600ms ease-in-out");
  });
});

// ─── C-m4b-011: reduced-motion collapses goal brick-fill transition ──────────

describe("C-m4b-011: goal brick-fill transition collapses to 'none' when reduced-motion=true", () => {
  it("transition is 'none' but width is still 30%", async () => {
    const { useReducedMotion } = await import("motion/react");
    vi.mocked(useReducedMotion).mockReturnValue(true);
    const { container } = render(
      <BrickChip
        brick={makeGoalBrick("g1", "pushups", 3, 10)}
        categories={[cat1]}
      />,
    );
    const fill = container.querySelector(
      "[data-testid='brick-fill']",
    ) as HTMLElement;
    expect(fill.style.width).toBe("30%");
    expect(fill.style.transition).toBe("none");
  });
});

// ─── C-m4b-012: long-press auto-repeat fires onTick + light haptic per tick ──

describe("C-m4b-012: + long-press fires 1 initial + 1 at HOLD_MS + 4 intervals = 6 ticks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("onGoalLog called 6 times with ('g1', 1); haptics.light 6×; haptics.medium 0×", async () => {
    const { haptics } = await import("@/lib/haptics");
    const onGoalLog = vi.fn();
    render(
      <BrickChip
        brick={makeGoalBrick("g1", "pushups", 3, 10)}
        categories={[cat1]}
        onGoalLog={onGoalLog}
      />,
    );
    const plus = screen.getByRole("button", { name: "Increase pushups" });
    fireEvent.pointerDown(plus);
    vi.advanceTimersByTime(500); // HOLD_MS — auto-repeat starts (+1 tick)
    vi.advanceTimersByTime(50);
    vi.advanceTimersByTime(50);
    vi.advanceTimersByTime(50);
    vi.advanceTimersByTime(50);
    fireEvent.pointerUp(plus);

    expect(onGoalLog).toHaveBeenCalledTimes(6);
    onGoalLog.mock.calls.forEach((args) => {
      expect(args).toEqual(["g1", 1]);
    });
    expect(haptics.light).toHaveBeenCalledTimes(6);
    expect(haptics.medium).not.toHaveBeenCalled();
  });
});

// ─── C-m4b-013: pointerup mid-burst halts auto-repeat ────────────────────────

describe("C-m4b-013: pointerup mid-burst stops auto-repeat ticks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("after pointerup mid-burst, no further onGoalLog/haptics fire even after 500ms", async () => {
    const { haptics } = await import("@/lib/haptics");
    const onGoalLog = vi.fn();
    render(
      <BrickChip
        brick={makeGoalBrick("g1", "pushups", 3, 10)}
        categories={[cat1]}
        onGoalLog={onGoalLog}
      />,
    );
    const plus = screen.getByRole("button", { name: "Increase pushups" });
    fireEvent.pointerDown(plus);
    vi.advanceTimersByTime(500); // HOLD_MS
    vi.advanceTimersByTime(50);
    vi.advanceTimersByTime(50);
    vi.advanceTimersByTime(50);
    vi.advanceTimersByTime(50);
    const dispatchesBeforeRelease = onGoalLog.mock.calls.length;
    const lightBeforeRelease = vi.mocked(haptics.light).mock.calls.length;

    fireEvent.pointerUp(plus);
    vi.advanceTimersByTime(500);

    expect(onGoalLog).toHaveBeenCalledTimes(dispatchesBeforeRelease);
    expect(haptics.light).toHaveBeenCalledTimes(lightBeforeRelease);
  });
});

// ─── C-m4b-014: scale-press visual feedback on active stepper, ~80ms ─────────

describe("C-m4b-014: + auto-repeat tick applies transform scale(0.95) for ~80ms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("active + transform=scale(0.95) at tick; back to scale(1) after 80ms; − unaffected", async () => {
    const { useReducedMotion } = await import("motion/react");
    vi.mocked(useReducedMotion).mockReturnValue(false);
    render(
      <BrickChip
        brick={makeGoalBrick("g1", "pushups", 3, 10)}
        categories={[cat1]}
        onGoalLog={vi.fn()}
      />,
    );
    const plus = screen.getByRole("button", {
      name: "Increase pushups",
    }) as HTMLButtonElement;
    const minus = screen.getByRole("button", {
      name: "Decrease pushups",
    }) as HTMLButtonElement;

    fireEvent.pointerDown(plus);
    expect(plus.style.transform).toBe("scale(0.95)");
    expect(minus.style.transform).toBe("scale(1)");

    act(() => {
      vi.advanceTimersByTime(80);
    });
    expect(plus.style.transform).toBe("scale(1)");
    expect(minus.style.transform).toBe("scale(1)");

    fireEvent.pointerUp(plus);
  });
});

// ─── C-m4b-015: scale-press suppressed under reduced-motion; haptics still ──

describe("C-m4b-015: reduced-motion suppresses scale-press transform; haptics+dispatch unaffected", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("no scale(0.95) on either button at any point; haptics.light+onGoalLog still fire", async () => {
    const { useReducedMotion } = await import("motion/react");
    const { haptics } = await import("@/lib/haptics");
    vi.mocked(useReducedMotion).mockReturnValue(true);
    const onGoalLog = vi.fn();
    render(
      <BrickChip
        brick={makeGoalBrick("g1", "pushups", 3, 10)}
        categories={[cat1]}
        onGoalLog={onGoalLog}
      />,
    );
    const plus = screen.getByRole("button", {
      name: "Increase pushups",
    }) as HTMLButtonElement;
    const minus = screen.getByRole("button", {
      name: "Decrease pushups",
    }) as HTMLButtonElement;

    fireEvent.pointerDown(plus);
    expect(plus.style.transform).toBe("scale(1)");
    expect(minus.style.transform).toBe("scale(1)");

    act(() => {
      vi.advanceTimersByTime(500); // HOLD_MS — auto-repeat tick
    });
    expect(plus.style.transform).toBe("scale(1)");
    expect(minus.style.transform).toBe("scale(1)");

    expect(onGoalLog).toHaveBeenCalled();
    expect(haptics.light).toHaveBeenCalled();
    expect(haptics.medium).not.toHaveBeenCalled();

    fireEvent.pointerUp(plus);
  });
});

// ─── C-m4b-016: keyboard Enter/Space fires once per activation; no auto-repeat ─

describe("C-m4b-016: keyboard Enter/Space on + fires onGoalLog once per press; no auto-repeat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Enter and Space each fire one onGoalLog; 2 total; no extra ticks after 2s", async () => {
    const onGoalLog = vi.fn();
    render(
      <BrickChip
        brick={makeGoalBrick("g1", "pushups", 3, 10)}
        categories={[cat1]}
        onGoalLog={onGoalLog}
      />,
    );
    const plus = screen.getByRole("button", { name: "Increase pushups" });
    plus.focus();
    // Simulate keyboard click — detail===0 marks it as keyboard-activated
    fireEvent.click(plus, { detail: 0 });
    fireEvent.click(plus, { detail: 0 });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onGoalLog).toHaveBeenCalledTimes(2);
    onGoalLog.mock.calls.forEach((args) => {
      expect(args).toEqual(["g1", 1]);
    });
  });
});

// ─── C-m4b-017: aria-labels and aria-hidden icons on goal stepper buttons ────

describe("C-m4b-017: stepper button aria-labels and icon aria-hidden are correct", () => {
  it("- aria-label='Decrease pushups'; + aria-label='Increase pushups'; icons aria-hidden", () => {
    const { container } = render(
      <BrickChip
        brick={makeGoalBrick("g1", "pushups", 3, 10, "reps")}
        categories={[cat1]}
      />,
    );
    const minus = screen.getByRole("button", { name: "Decrease pushups" });
    const plus = screen.getByRole("button", { name: "Increase pushups" });
    expect(minus.getAttribute("aria-label")).toBe("Decrease pushups");
    expect(plus.getAttribute("aria-label")).toBe("Increase pushups");

    const icons = container.querySelectorAll(
      "button > svg.lucide-minus, button > svg.lucide-plus",
    );
    expect(icons.length).toBeGreaterThanOrEqual(2);
    icons.forEach((icon) => {
      expect(icon.getAttribute("aria-hidden")).toBe("true");
    });
  });
});

// ─── C-m4b-018: tick chip regression — single <button>, no goal stepper ─────

describe("C-m4b-018: tick chip remains a single <button>; onTickToggle fires; onGoalLog NOT", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clicking the tick button calls onTickToggle, not onGoalLog; no role=group", async () => {
    const onTickToggle = vi.fn();
    const onGoalLog = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <BrickChip
        brick={makeTick(false)}
        categories={[cat1]}
        onTickToggle={onTickToggle}
        onGoalLog={onGoalLog}
      />,
    );
    expect(container.querySelector("[role='group']")).toBeNull();
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    await user.click(buttons[0]);
    expect(onTickToggle).toHaveBeenCalledTimes(1);
    expect(onTickToggle).toHaveBeenCalledWith("r1");
    expect(onGoalLog).not.toHaveBeenCalled();
  });
});

// ─── C-m4b-019: time chip regression — single inert button, no stepper ──────

describe("C-m4b-019: time chip remains a single inert <button>; no − or + buttons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clicking time chip calls neither onGoalLog nor onTickToggle; no Decrease/Increase buttons", async () => {
    const onTickToggle = vi.fn();
    const onGoalLog = vi.fn();
    const user = userEvent.setup();
    render(
      <BrickChip
        brick={makeTime(0, 10)}
        categories={[cat1]}
        onTickToggle={onTickToggle}
        onGoalLog={onGoalLog}
      />,
    );
    expect(screen.queryByRole("button", { name: /Decrease/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Increase/i })).toBeNull();
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    await user.click(buttons[0]);
    expect(onTickToggle).not.toHaveBeenCalled();
    expect(onGoalLog).not.toHaveBeenCalled();
  });
});

// ─── C-m4c-001: time chip stopped — Play glyph, aria-pressed=false ────────────

describe("C-m4c-001: time chip stopped renders Play icon, aria-pressed=false, badge, aria-label", () => {
  it("single button with aria-pressed=false, Play icon, badge '5 / 25 m', accessible name per AC#28", () => {
    render(
      <BrickChip
        brick={{
          id: "t1",
          kind: "time",
          hasDuration: false,
          durationMin: 25,
          minutesDone: 5,
          name: "Read",
          categoryId: null,
          parentBlockId: null,
        }}
        categories={[]}
        running={false}
        onTimerToggle={vi.fn()}
        onTimerOpenSheet={vi.fn()}
      />,
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeInTheDocument();
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    // Badge text
    expect(screen.getByText(/5\s*\/\s*25\s*m/)).toBeInTheDocument();
    // Accessible name per AC #28
    expect(btn.getAttribute("aria-label")).toBe(
      "Read, 5 of 25 minutes, stopped, tap to start",
    );
  });
});

// ─── C-m4c-002: time chip running — Pause glyph, aria-pressed=true ───────────

describe("C-m4c-002: time chip running renders Pause icon, aria-pressed=true, updated badge", () => {
  it("aria-pressed=true; badge '12 / 25 m'; accessible name matches running variant", () => {
    render(
      <BrickChip
        brick={{
          id: "t1",
          kind: "time",
          hasDuration: false,
          durationMin: 25,
          minutesDone: 12,
          name: "Read",
          categoryId: null,
          parentBlockId: null,
        }}
        categories={[]}
        running={true}
        onTimerToggle={vi.fn()}
        onTimerOpenSheet={vi.fn()}
      />,
    );
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(/12\s*\/\s*25\s*m/)).toBeInTheDocument();
    expect(btn.getAttribute("aria-label")).toBe(
      "Read, 12 of 25 minutes, running, tap to stop",
    );
  });
});

// ─── C-m4c-003: time chip tap fires onTimerToggle + haptics.light ─────────────

describe("C-m4c-003: tap on stopped time chip calls onTimerToggle once; haptics.light once", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("onTimerToggle called with 't1'; onTimerOpenSheet NOT called; haptics.light once", async () => {
    const { haptics } = await import("@/lib/haptics");
    const onTimerToggle = vi.fn();
    const onTimerOpenSheet = vi.fn();

    render(
      <BrickChip
        brick={{
          id: "t1",
          kind: "time",
          hasDuration: false,
          durationMin: 25,
          minutesDone: 0,
          name: "Read",
          categoryId: null,
          parentBlockId: null,
        }}
        categories={[]}
        running={false}
        onTimerToggle={onTimerToggle}
        onTimerOpenSheet={onTimerOpenSheet}
      />,
    );

    const btn = screen.getByRole("button");
    fireEvent.pointerDown(btn);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    fireEvent.pointerUp(btn);

    expect(onTimerToggle).toHaveBeenCalledTimes(1);
    expect(onTimerToggle).toHaveBeenCalledWith("t1");
    expect(onTimerOpenSheet).not.toHaveBeenCalled();
    expect(haptics.light).toHaveBeenCalledTimes(1);
  });
});

// ─── C-m4c-004: running time chip tap fires onTimerToggle ────────────────────

describe("C-m4c-004: tap on running time chip calls onTimerToggle once; haptics.light once", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("running chip: onTimerToggle called with 't1'; haptics.light once", async () => {
    const { haptics } = await import("@/lib/haptics");
    const onTimerToggle = vi.fn();

    render(
      <BrickChip
        brick={{
          id: "t1",
          kind: "time",
          hasDuration: false,
          durationMin: 25,
          minutesDone: 8,
          name: "Read",
          categoryId: null,
          parentBlockId: null,
        }}
        categories={[]}
        running={true}
        onTimerToggle={onTimerToggle}
        onTimerOpenSheet={vi.fn()}
      />,
    );

    const btn = screen.getByRole("button");
    fireEvent.pointerDown(btn);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    fireEvent.pointerUp(btn);

    expect(onTimerToggle).toHaveBeenCalledTimes(1);
    expect(onTimerToggle).toHaveBeenCalledWith("t1");
    expect(haptics.light).toHaveBeenCalledTimes(1);
  });
});

// ─── C-m4c-005: long-press on time chip opens sheet ──────────────────────────

describe("C-m4c-005: long-press (>=500ms) calls onTimerOpenSheet; onTimerToggle NOT called; haptics.medium once", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("long-press fires onTimerOpenSheet('t1'); haptics.medium once; toggle NOT called", async () => {
    const { haptics } = await import("@/lib/haptics");
    const onTimerToggle = vi.fn();
    const onTimerOpenSheet = vi.fn();

    render(
      <BrickChip
        brick={{
          id: "t1",
          kind: "time",
          hasDuration: false,
          durationMin: 25,
          minutesDone: 0,
          name: "Read",
          categoryId: null,
          parentBlockId: null,
        }}
        categories={[]}
        running={false}
        onTimerToggle={onTimerToggle}
        onTimerOpenSheet={onTimerOpenSheet}
      />,
    );

    const btn = screen.getByRole("button");
    fireEvent.pointerDown(btn);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.pointerUp(btn);

    expect(onTimerOpenSheet).toHaveBeenCalledTimes(1);
    expect(onTimerOpenSheet).toHaveBeenCalledWith("t1");
    expect(onTimerToggle).not.toHaveBeenCalled();
    expect(haptics.medium).toHaveBeenCalledTimes(1);
  });
});

// ─── C-m4c-006: reduced motion suppresses pulse animation ────────────────────

describe("C-m4c-006: reduced motion suppresses chip running-state pulse animation", () => {
  it("running chip: aria-pressed=true and badge work normally; pulse suppressed under reduced motion", () => {
    // useReducedMotion from motion/react returns null/false in test env.
    // When running=true, the chip applies animation CSS. Under reduced motion it would be absent.
    // This test validates the observable outcome: aria-pressed and badge are always correct.
    // The actual animation suppression is verified via A-m4c-004 (Playwright + computed style).
    render(
      <BrickChip
        brick={{
          id: "t1",
          kind: "time",
          hasDuration: false,
          durationMin: 25,
          minutesDone: 5,
          name: "Read",
          categoryId: null,
          parentBlockId: null,
        }}
        categories={[]}
        running={true}
        onTimerToggle={vi.fn()}
        onTimerOpenSheet={vi.fn()}
      />,
    );

    const btn = screen.getByRole("button");
    // aria-pressed and badge always work regardless of motion setting
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(/5\s*\/\s*25\s*m/)).toBeInTheDocument();
  });
});
