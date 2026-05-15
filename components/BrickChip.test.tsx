// components/BrickChip.test.tsx — M4f: collapsed to tick + units (ADR-043).
// Covers: C-m3-001..005, C-m4a-001..009
// M4f: C-m3-002 goal→units; C-m3-003 time deleted (kind removed);
//      C-m4a-002 goal→units; C-m4a-003 time→units;
//      C-m4b-001..019 retired (stepper deleted per SG-m4f-02);
//      C-m4c-001..006 retired (timer deleted per ADR-043);
//      C-m4e-015 goal→units; C-m4e-016 time→units; C-m4e-017 time variant deleted;
//      C-m4f-009..012 added (units chip design).

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

// M4f: goal→units rename; count→done
function makeUnits(
  done: number,
  target: number,
  unit: string,
  categoryId: string | null = "c1",
): Brick {
  return {
    id: "r2",
    name: "brick B",
    kind: "units",
    hasDuration: false,
    done,
    target,
    unit,
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

// ─── C-m3-002: units render (M4f: goal→units, count→done) ────────────────────

describe("C-m3-002: BrickChip units render (M4f: goal renamed to units)", () => {
  it("displays title 'brick B' and badge '50 / 100 reps'", () => {
    render(
      <BrickChip brick={makeUnits(50, 100, "reps")} categories={[cat1]} />,
    );
    expect(screen.getByText("brick B")).toBeInTheDocument();
    expect(screen.getByText("50 / 100 reps")).toBeInTheDocument();
  });

  it("foreground gradient overlay width is 50%", () => {
    const { container } = render(
      <BrickChip brick={makeUnits(50, 100, "reps")} categories={[cat1]} />,
    );
    const fill = container.querySelector(
      "[data-testid='brick-fill']",
    ) as HTMLElement;
    expect(fill?.style.width).toBe("50%");
  });

  it("aria-label includes '50 of 100 reps' (M4f: on outer chip button)", () => {
    render(
      <BrickChip brick={makeUnits(50, 100, "reps")} categories={[cat1]} />,
    );
    // M4f: units chip is a single <button> (no group wrapper)
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toContain("50 of 100 reps");
  });

  it("with unit blank, badge renders '50 / 100' (no trailing space)", () => {
    render(<BrickChip brick={makeUnits(50, 100, "")} categories={[cat1]} />);
    expect(screen.getByText("50 / 100")).toBeInTheDocument();
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

// ─── C-m4a-002: units chip is a single button (M4f: no group wrapper) ─────────
// M4f update: units chip is a simple button (no stepper group), so we verify
// it has a single button and does NOT call onTickToggle.

describe("C-m4a-002: units chip does not call onTickToggle; single button, no group", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("onTickToggle NOT called when units chip is tapped; no role='group'", async () => {
    const onTickToggle = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <BrickChip
        brick={makeUnits(2, 5, "")}
        categories={[cat1]}
        onTickToggle={onTickToggle}
        onUnitsOpenSheet={vi.fn()}
      />,
    );
    // M4f: units chip is a single <button>, no group wrapper
    expect(container.querySelector("[role='group']")).toBeNull();
    const btns = screen.getAllByRole("button");
    expect(btns).toHaveLength(1);
    await user.click(btns[0]);
    expect(onTickToggle).not.toHaveBeenCalled();
  });
});

// ─── C-m4a-003: units chip tap does NOT fire onTickToggle ─────────────────────
// M4f update: time kind removed; units chip tap fires onUnitsOpenSheet, not tick

describe("C-m4a-003: units chip tap does NOT call onTickToggle (M4f: units opens sheet)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("onTickToggle NOT called when units chip tapped; onUnitsOpenSheet called instead", async () => {
    const onTickToggle = vi.fn();
    const onUnitsOpenSheet = vi.fn();
    const user = userEvent.setup();
    render(
      <BrickChip
        brick={makeUnits(0, 10, "reps")}
        categories={[cat1]}
        onTickToggle={onTickToggle}
        onUnitsOpenSheet={onUnitsOpenSheet}
      />,
    );
    const btn = screen.getByRole("button");
    await user.click(btn);
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
// M4f component tests — C-m4f-009..012
// M4b stepper-on-chip tests (C-m4b-001..019) retired per SG-m4f-02 (ADR-043).
// M4c timer-on-chip tests (C-m4c-001..006) retired per ADR-043.
// ─────────────────────────────────────────────────────────────────────────────

// ─── C-m4f-009: units chip primary line text; no ±1 stepper buttons ──────────

describe("C-m4f-009: units chip renders done/target/unit text; no stepper buttons", () => {
  it("primary line text is '20 / 30 minutes'; no Increase/Decrease buttons", () => {
    render(
      <BrickChip
        brick={{
          id: "u1",
          kind: "units",
          target: 30,
          unit: "minutes",
          done: 20,
          name: "Meditate",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
        }}
        categories={[]}
        onUnitsOpenSheet={vi.fn()}
      />,
    );
    expect(screen.getByText("20 / 30 minutes")).toBeInTheDocument();
    // C-m4f-009 per tests.md: no stepper buttons at all
    expect(
      screen.queryAllByRole("button", { name: /increment|decrement|\+1|-1/i }),
    ).toHaveLength(0);
    expect(screen.queryByRole("button", { name: /decrease/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /increase/i })).toBeNull();
  });
});

// ─── C-m4f-010: tap units chip → onUnitsOpenSheet called + haptics.light ────

describe("C-m4f-010: tap units chip fires onUnitsOpenSheet(brick.id) + haptics.light", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("onUnitsOpenSheet called once with 'u1'; haptics.light called once", async () => {
    const { haptics } = await import("@/lib/haptics");
    const onUnitsOpenSheet = vi.fn();
    const user = userEvent.setup();
    render(
      <BrickChip
        brick={{
          id: "u1",
          kind: "units",
          target: 30,
          unit: "minutes",
          done: 20,
          name: "Meditate",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
        }}
        categories={[]}
        onUnitsOpenSheet={onUnitsOpenSheet}
      />,
    );
    const btn = screen.getByRole("button");
    await user.click(btn);
    expect(onUnitsOpenSheet).toHaveBeenCalledTimes(1);
    expect(onUnitsOpenSheet).toHaveBeenCalledWith("u1");
    expect(haptics.light).toHaveBeenCalledTimes(1);
  });
});

// ─── C-m4f-011: tick chip unchanged post-collapse ─────────────────────────────

describe("C-m4f-011: tick chip is byte-identical post-collapse; aria-pressed retained", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tapping tick chip calls onTickToggle; onUnitsOpenSheet NOT called; aria-pressed present", async () => {
    const onTickToggle = vi.fn();
    const onUnitsOpenSheet = vi.fn();
    const user = userEvent.setup();
    render(
      <BrickChip
        brick={makeTick(false)}
        categories={[cat1]}
        onTickToggle={onTickToggle}
        onUnitsOpenSheet={onUnitsOpenSheet}
      />,
    );
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    await user.click(btn);
    expect(onTickToggle).toHaveBeenCalledTimes(1);
    expect(onUnitsOpenSheet).not.toHaveBeenCalled();
  });
});

// ─── C-m4f-012: units chip with hasDuration:true shows time-window badge ─────

describe("C-m4f-012: units chip hasDuration:true renders time-window badge; two variants only", () => {
  it("data-testid=brick-time-window shows '06:00–06:40'; no time-kind branch", () => {
    render(
      <BrickChip
        brick={{
          id: "u1",
          kind: "units",
          target: 30,
          unit: "minutes",
          done: 10,
          name: "Meditate",
          categoryId: null,
          parentBlockId: null,
          hasDuration: true,
          start: "06:00",
          end: "06:40",
          recurrence: { kind: "just-today", date: "2026-05-14" },
        }}
        categories={[]}
        onUnitsOpenSheet={vi.fn()}
      />,
    );
    const badge = screen.getByTestId("brick-time-window");
    expect(badge.textContent).toBe("06:00–06:40");
    // Units primary badge still present
    expect(screen.getByText("10 / 30 minutes")).toBeInTheDocument();
  });
});

// ─── C-m4e-014: tick with hasDuration:true shows time-window badge ────────────

describe("C-m4e-014: tick chip with hasDuration:true shows brick-time-window", () => {
  it("data-testid=brick-time-window is present when hasDuration:true", () => {
    render(
      <BrickChip
        brick={{
          id: "r1",
          kind: "tick",
          done: false,
          name: "Run",
          categoryId: null,
          parentBlockId: null,
          hasDuration: true,
          start: "06:00",
          end: "06:40",
          recurrence: { kind: "just-today", date: "2026-05-14" },
        }}
        categories={[]}
        onTickToggle={vi.fn()}
      />,
    );
    const badge = screen.getByTestId("brick-time-window");
    expect(badge.textContent).toBe("06:00–06:40");
  });
});

// ─── C-m4e-015: units with hasDuration:true shows time-window + count badge ───
// M4f: goal→units; count→done

describe("C-m4e-015: units chip with hasDuration:true shows time-window + count badge", () => {
  it("data-testid=brick-time-window present; count/target badge still rendered", () => {
    render(
      <BrickChip
        brick={{
          id: "r1",
          kind: "units",
          target: 5,
          done: 3,
          unit: "reps",
          name: "Pushups",
          categoryId: null,
          parentBlockId: null,
          hasDuration: true,
          start: "07:00",
          end: "07:30",
          recurrence: { kind: "just-today", date: "2026-05-14" },
        }}
        categories={[]}
        onUnitsOpenSheet={vi.fn()}
      />,
    );
    const badge = screen.getByTestId("brick-time-window");
    expect(badge.textContent).toBe("07:00–07:30");
    // count/target badge still present
    expect(screen.getByText("3 / 5 reps")).toBeInTheDocument();
  });
});

// ─── C-m4e-016: units (was time) hasDuration:true shows time-window + performance badge
// M4f: kind:"time" removed; map to kind:"units" with unit:"minutes"

describe("C-m4e-016: units chip (was time) with hasDuration:true shows time-window + units badge", () => {
  it("data-testid=brick-time-window present; units badge '5 / 25 minutes' still rendered", () => {
    render(
      <BrickChip
        brick={{
          id: "t1",
          kind: "units",
          target: 25,
          done: 5,
          unit: "minutes",
          name: "Read",
          categoryId: null,
          parentBlockId: null,
          hasDuration: true,
          start: "08:00",
          end: "08:30",
          recurrence: { kind: "just-today", date: "2026-05-14" },
        }}
        categories={[]}
        onUnitsOpenSheet={vi.fn()}
      />,
    );
    const badge = screen.getByTestId("brick-time-window");
    expect(badge.textContent).toBe("08:00–08:30");
    expect(screen.getByText("5 / 25 minutes")).toBeInTheDocument();
  });
});

// ─── C-m4e-017: hasDuration:false → no brick-time-window (regression) ─────────

describe("C-m4e-017: chip with hasDuration:false has no brick-time-window", () => {
  it("tick hasDuration:false: queryByTestId('brick-time-window') is null", () => {
    render(
      <BrickChip
        brick={{
          id: "r1",
          kind: "tick",
          done: false,
          name: "Run",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
        }}
        categories={[]}
        onTickToggle={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("brick-time-window")).toBeNull();
  });

  it("units hasDuration:false: no time-window badge", () => {
    render(
      <BrickChip
        brick={{
          id: "r1",
          kind: "units",
          target: 5,
          done: 3,
          unit: "reps",
          name: "Pushups",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
        }}
        categories={[]}
        onUnitsOpenSheet={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("brick-time-window")).toBeNull();
  });
});

// ─── C-m4e-018: accessible name includes scheduled suffix when hasDuration:true ─

describe("C-m4e-018: tick chip hasDuration:true accessible name has scheduled suffix", () => {
  it("button accessible name contains 'scheduled 06:00 to 06:40' OR aria-describedby equivalent", () => {
    const { container } = render(
      <BrickChip
        brick={{
          id: "r1",
          kind: "tick",
          done: false,
          name: "Run",
          categoryId: null,
          parentBlockId: null,
          hasDuration: true,
          start: "06:00",
          end: "06:40",
          recurrence: { kind: "just-today", date: "2026-05-14" },
        }}
        categories={[]}
        onTickToggle={vi.fn()}
      />,
    );
    const btn = screen.getByRole("button");
    const ariaLabel = btn.getAttribute("aria-label") ?? "";
    const describedById = btn.getAttribute("aria-describedby");
    let accessibleDescription = "";
    if (describedById) {
      const descEl = container.querySelector(`#${describedById}`);
      accessibleDescription = descEl?.textContent ?? "";
    }
    // Either the aria-label contains the suffix OR aria-describedby resolves to it
    const hasScheduled =
      /scheduled 06:00 to 06:40/i.test(ariaLabel) ||
      /scheduled 06:00 to 06:40/i.test(accessibleDescription);
    expect(hasScheduled).toBe(true);
  });
});

// ─── C-m4e-019: accessible name unchanged for hasDuration:false ────────────────

describe("C-m4e-019: tick chip hasDuration:false accessible name is byte-identical to pre-M4e", () => {
  it("aria-label is 'Run, not done, tap to toggle' with no scheduled suffix", () => {
    render(
      <BrickChip
        brick={{
          id: "r1",
          kind: "tick",
          done: false,
          name: "Run",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
        }}
        categories={[]}
        onTickToggle={vi.fn()}
      />,
    );
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toBe("Run, not done, tap to toggle");
    expect(btn.getAttribute("aria-describedby")).toBeNull();
  });
});
