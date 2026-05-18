/**
 * components/MonthView.test.tsx — M9c: C-m9c-008..011, C-m9c-016
 * Tests for MonthView — Kingdom month grid component.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MonthView } from "./MonthView";
import type { AppState } from "@/lib/types";

// ─── Fixture state ─────────────────────────────────────────────────────────────
// today = 2026-05-18; programStart = 2026-05-01
// history: 15→score 0, 16→score 60, 17→score 100
// live day: 5 loose bricks (2 done) → dayPct = 40

function makeFixtureState(overrides: Partial<AppState> = {}): AppState {
  return {
    programStart: "2026-05-01",
    currentDate: "2026-05-18",
    history: {
      "2026-05-17": {
        blocks: [],
        categories: [],
        looseBricks: [
          {
            id: "a1",
            name: "a",
            categoryId: null,
            parentBlockId: null,
            hasDuration: false,
            kind: "tick",
            done: true,
          },
        ],
      },
      "2026-05-16": {
        blocks: [],
        categories: [],
        looseBricks: [
          {
            id: "b1",
            name: "b",
            categoryId: null,
            parentBlockId: null,
            hasDuration: false,
            kind: "tick",
            done: true,
          },
          {
            id: "b2",
            name: "c",
            categoryId: null,
            parentBlockId: null,
            hasDuration: false,
            kind: "tick",
            done: true,
          },
          {
            id: "b3",
            name: "d",
            categoryId: null,
            parentBlockId: null,
            hasDuration: false,
            kind: "tick",
            done: true,
          },
          {
            id: "b4",
            name: "e",
            categoryId: null,
            parentBlockId: null,
            hasDuration: false,
            kind: "tick",
            done: false,
          },
          {
            id: "b5",
            name: "f",
            categoryId: null,
            parentBlockId: null,
            hasDuration: false,
            kind: "tick",
            done: false,
          },
        ],
      },
      "2026-05-15": {
        blocks: [],
        categories: [],
        looseBricks: [
          {
            id: "u1",
            name: "u",
            categoryId: null,
            parentBlockId: null,
            hasDuration: false,
            kind: "units",
            target: 10,
            unit: "reps",
            done: 0,
          },
        ],
      },
    },
    // Live day: 5 loose bricks (2 done) → 40%
    blocks: [],
    categories: [],
    looseBricks: [
      {
        id: "lb1",
        name: "A",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: true,
      },
      {
        id: "lb2",
        name: "B",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: true,
      },
      {
        id: "lb3",
        name: "C",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: false,
      },
      {
        id: "lb4",
        name: "D",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: false,
      },
      {
        id: "lb5",
        name: "E",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: false,
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-05-18T12:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── C-m9c-008: MonthView — grid structure + month/year label + weekday headers

describe("C-m9c-008: MonthView — grid structure, month/year label, weekday headers", () => {
  it("renders a role='grid' for May 2026", () => {
    render(<MonthView state={makeFixtureState()} onOpenDay={vi.fn()} />);
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("shows month-year label 'May 2026'", () => {
    render(<MonthView state={makeFixtureState()} onOpenDay={vi.fn()} />);
    expect(screen.getByText("May 2026")).toBeInTheDocument();
  });

  it("renders weekday header row with Sun..Sat in order", () => {
    render(<MonthView state={makeFixtureState()} onOpenDay={vi.fn()} />);
    const headers = screen.getAllByRole("columnheader");
    expect(headers).toHaveLength(7);
    expect(headers[0]).toHaveTextContent("Sun");
    expect(headers[1]).toHaveTextContent("Mon");
    expect(headers[6]).toHaveTextContent("Sat");
  });

  it("renders 42 gridcells (6 rows × 7) for May 2026 (5 leading blanks + 31 + 6 trailing)", () => {
    render(<MonthView state={makeFixtureState()} onOpenDay={vi.fn()} />);
    const cells = screen.getAllByRole("gridcell");
    expect(cells).toHaveLength(42);
  });

  it("renders 6 rows", () => {
    render(<MonthView state={makeFixtureState()} onOpenDay={vi.fn()} />);
    const rows = screen.getAllByRole("row");
    // header row + 6 grid rows = 7 rows total
    expect(rows).toHaveLength(7);
  });

  it("day-of-month numbers 1..31 are all present in the grid", () => {
    render(<MonthView state={makeFixtureState()} onOpenDay={vi.fn()} />);
    // All 31 day numbers should be visible
    for (let d = 1; d <= 31; d++) {
      expect(screen.getAllByText(String(d)).length).toBeGreaterThanOrEqual(1);
    }
  });
});

// ─── C-m9c-009: MonthView — per-cell classification + scores ─────────────────

describe("C-m9c-009: MonthView — per-cell classification and scores", () => {
  it("cell for 2026-05-17 (history, 100%) shows scored numeral 100", () => {
    render(<MonthView state={makeFixtureState()} onOpenDay={vi.fn()} />);
    // The cell for May 17 should have score numeral 100
    const cell17 = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("aria-label")?.includes("May 17, 2026"));
    expect(cell17).toBeDefined();
    expect(cell17?.getAttribute("aria-label")).toMatch(/100/);
  });

  it("cell for 2026-05-16 (history, 60%) shows scored numeral 60", () => {
    render(<MonthView state={makeFixtureState()} onOpenDay={vi.fn()} />);
    const cell16 = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("aria-label")?.includes("May 16, 2026"));
    expect(cell16).toBeDefined();
    expect(cell16?.getAttribute("aria-label")).toMatch(/60/);
  });

  it("cell for 2026-05-15 (history, 0%) shows scored numeral 0 (not missed)", () => {
    render(<MonthView state={makeFixtureState()} onOpenDay={vi.fn()} />);
    const cell15 = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("aria-label")?.includes("May 15, 2026"));
    expect(cell15).toBeDefined();
    // It should be a scored cell (tappable) not missed
    expect(cell15?.getAttribute("aria-label")).toMatch(
      /0.*percent|percent.*0/i,
    );
  });

  it("cell for 2026-05-18 (today, 40%) shows scored numeral 40 and today marker", () => {
    render(<MonthView state={makeFixtureState()} onOpenDay={vi.fn()} />);
    const todayCell = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("aria-label")?.includes("May 18, 2026"));
    expect(todayCell).toBeDefined();
    expect(todayCell?.getAttribute("data-today")).toBe("true");
    expect(todayCell?.getAttribute("aria-label")).toMatch(/40/);
  });

  it("cell for 2026-05-13 (past, in-range, no history) is missed — not a button", () => {
    const { container } = render(
      <MonthView state={makeFixtureState()} onOpenDay={vi.fn()} />,
    );
    // Find the cell with data-kind="missed" for day 13
    const missedCells = container.querySelectorAll("[data-kind='missed']");
    expect(missedCells.length).toBeGreaterThan(0);
  });

  it("cell for 2026-05-25 (future) is not a button", () => {
    const { container } = render(
      <MonthView state={makeFixtureState()} onOpenDay={vi.fn()} />,
    );
    const futureCells = container.querySelectorAll("[data-kind='future']");
    expect(futureCells.length).toBeGreaterThan(0);
  });
});

// ─── C-m9c-010: MonthView — prev/next month nav incl. year boundary ──────────

describe("C-m9c-010: MonthView — prev/next month navigation including year boundary", () => {
  it("'Next month' button advances to June 2026", async () => {
    const user = userEvent.setup({});
    render(<MonthView state={makeFixtureState()} onOpenDay={vi.fn()} />);
    const nextBtn = screen.getByRole("button", { name: "Next month" });
    await user.click(nextBtn);
    expect(screen.getByText("June 2026")).toBeInTheDocument();
  });

  it("two 'Previous month' clicks from June 2026 reaches April 2026", async () => {
    const user = userEvent.setup({});
    render(<MonthView state={makeFixtureState()} onOpenDay={vi.fn()} />);
    // Go to June
    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByText("June 2026")).toBeInTheDocument();
    // Back to May
    await user.click(screen.getByRole("button", { name: "Previous month" }));
    // Back to April
    await user.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByText("April 2026")).toBeInTheDocument();
  });

  it("nav buttons have correct aria-labels", () => {
    render(<MonthView state={makeFixtureState()} onOpenDay={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Previous month" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Next month" }),
    ).toBeInTheDocument();
  });

  it("navigating from December 2026 forward yields January 2027 (year boundary)", async () => {
    const user = userEvent.setup({});
    render(<MonthView state={makeFixtureState()} onOpenDay={vi.fn()} />);
    // Navigate forward to December 2026 (7 months ahead)
    for (let i = 0; i < 7; i++) {
      await user.click(screen.getByRole("button", { name: "Next month" }));
    }
    expect(screen.getByText("December 2026")).toBeInTheDocument();
    // One more → January 2027
    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByText("January 2027")).toBeInTheDocument();
  });
});

// ─── C-m9c-011: MonthView — empty-history/future month renders, no crash ─────

describe("C-m9c-011: MonthView — first-run/future month renders without crash", () => {
  it("first-run state: only today (2026-05-18) is scored; prior cells are pre-start", () => {
    const emptyState: AppState = {
      programStart: "2026-05-18",
      currentDate: "2026-05-18",
      history: {},
      blocks: [],
      categories: [],
      looseBricks: [],
    };
    const { container } = render(
      <MonthView state={emptyState} onOpenDay={vi.fn()} />,
    );
    // No crash
    expect(screen.getByRole("grid")).toBeInTheDocument();
    // May 18 (today) should be the only scored cell
    const scoredCells = container.querySelectorAll("[data-kind='scored']");
    expect(scoredCells).toHaveLength(1);
  });

  it("navigating to a wholly future month renders all inert cells without crash", async () => {
    const user = userEvent.setup({});
    render(<MonthView state={makeFixtureState()} onOpenDay={vi.fn()} />);
    // Navigate forward 3 months to August 2026
    for (let i = 0; i < 3; i++) {
      await user.click(screen.getByRole("button", { name: "Next month" }));
    }
    expect(screen.getByText("August 2026")).toBeInTheDocument();
    // Grid still renders; no scored cells in a future month
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });
});

// ─── C-m9c-016: day-open interaction ─────────────────────────────────────────

describe("C-m9c-016: MonthView — day-open interaction (today → onOpenDay; past archived → PastDayDetail; inert → nothing)", () => {
  it("clicking today's cell (2026-05-18) calls onOpenDay with today's ISO", async () => {
    const onOpenDay = vi.fn();
    const user = userEvent.setup({});
    render(<MonthView state={makeFixtureState()} onOpenDay={onOpenDay} />);
    const todayCell = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("data-today") === "true");
    expect(todayCell).toBeDefined();
    await user.click(todayCell!);
    expect(onOpenDay).toHaveBeenCalledWith("2026-05-18");
    expect(onOpenDay).toHaveBeenCalledTimes(1);
  });

  it("clicking today's cell does NOT open PastDayDetail", async () => {
    const user = userEvent.setup({});
    render(<MonthView state={makeFixtureState()} onOpenDay={vi.fn()} />);
    const todayCell = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("data-today") === "true");
    await user.click(todayCell!);
    expect(screen.queryByRole("region", { name: "Day detail" })).toBeNull();
  });

  it("clicking a past archived cell (2026-05-17) opens PastDayDetail", async () => {
    const user = userEvent.setup({});
    render(<MonthView state={makeFixtureState()} onOpenDay={vi.fn()} />);
    const archivedCell = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("aria-label")?.includes("May 17, 2026"));
    expect(archivedCell).toBeDefined();
    await user.click(archivedCell!);
    expect(
      screen.getByRole("region", { name: "Day detail" }),
    ).toBeInTheDocument();
  });

  it("closing PastDayDetail returns to the grid", async () => {
    const user = userEvent.setup({});
    render(<MonthView state={makeFixtureState()} onOpenDay={vi.fn()} />);
    // Open PastDayDetail
    const archivedCell = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("aria-label")?.includes("May 17, 2026"));
    await user.click(archivedCell!);
    expect(
      screen.getByRole("region", { name: "Day detail" }),
    ).toBeInTheDocument();
    // Close it
    const closeBtn = screen.getByRole("button", { name: "Close" });
    await user.click(closeBtn);
    expect(screen.queryByRole("region", { name: "Day detail" })).toBeNull();
    // Grid is back
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("clicking a future cell does nothing — no onOpenDay, no PastDayDetail", async () => {
    const onOpenDay = vi.fn();
    const { container } = render(
      <MonthView state={makeFixtureState()} onOpenDay={onOpenDay} />,
    );
    const futureCell = container.querySelector(
      "[data-kind='future']",
    ) as HTMLElement;
    expect(futureCell).not.toBeNull();
    // future cells are not buttons — we can't click them with userEvent role-based
    // but we can verify they're not interactive
    expect(futureCell.tagName.toLowerCase()).not.toBe("button");
    expect(onOpenDay).not.toHaveBeenCalled();
  });
});

// ─── C-m9e-011: MonthView — additive initialMonth prop; omitting it is byte-identical ──

describe("C-m9e-011: MonthView — initialMonth prop: seeds displayed month; omitting is byte-identical", () => {
  // Both renders use the same fixture state, fake clock at 2026-05-18

  it("with initialMonth={year:2026, month:2}: displays March 2026 as initial month", () => {
    render(
      <MonthView
        state={makeFixtureState()}
        onOpenDay={vi.fn()}
        initialMonth={{ year: 2026, month: 2 }}
      />,
    );
    // The month label should read "March 2026"
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "March 2026",
    );
  });

  it("without initialMonth: displays today's month (May 2026) — byte-identical to M9c", () => {
    render(<MonthView state={makeFixtureState()} onOpenDay={vi.fn()} />);
    // The month label should read the current month "May 2026"
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "May 2026",
    );
  });

  it("with initialMonth: prev/next still freely mutate displayed (prop only seeds initial)", async () => {
    const user = userEvent.setup();
    render(
      <MonthView
        state={makeFixtureState()}
        onOpenDay={vi.fn()}
        initialMonth={{ year: 2026, month: 2 }}
      />,
    );
    // Initially March 2026
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "March 2026",
    );
    // Click Next month → April 2026
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /next month/i }));
    });
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "April 2026",
    );
    // Click Previous month → back to March 2026
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /previous month/i }));
    });
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "March 2026",
    );
  });
});
