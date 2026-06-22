/**
 * components/WeekView.test.tsx — M9d: C-m9d-001..003, C-m9d-008..009, C-m9d-014
 * Tests for WeekView — the Castle week view.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WeekView } from "./WeekView";
import type { AppState } from "@/lib/types";
import type { ArchivedDay } from "@/lib/types";

// ─── Fixture helpers ──────────────────────────────────────────────────────────

/** ArchivedDay scoring 100%: 1 done tick brick */
function makeArchivedDay100(): ArchivedDay {
  return {
    blocks: [
      {
        id: "b-arch100",
        name: "Morning",
        start: "06:00",
        recurrence: { kind: "every-day" },
        categoryId: null,
        bricks: [
          {
            id: "r-arch100",
            name: "Meditate",
            categoryId: null,
            parentBlockId: "b-arch100",
            hasDuration: false,
            kind: "tick",
            done: true,
          },
        ],
      },
    ],
    categories: [],
    looseBricks: [],
  };
}

/** W-today fixture state: programStart=2026-05-01, currentDate=2026-05-18, live day = 40% */
function makeWTodayState(overrides: Partial<AppState> = {}): AppState {
  return {
    programStart: "2026-05-01",
    currentDate: "2026-05-18",
    history: {
      "2026-05-17": makeArchivedDay100(),
    },
    blocks: [],
    categories: [],
    deletions: {}, // M5
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

// ─── C-m9d-001: WeekView — seven Sun→Sat rows + date-range label ──────────────

describe("C-m9d-001: WeekView — seven Sun→Sat rows + date-range label", () => {
  it("renders exactly seven WeekDayCell rows in a role='list' container", () => {
    render(<WeekView state={makeWTodayState()} onOpenDay={vi.fn()} />);
    const list = screen.getByRole("list", { name: "Week days" });
    expect(list).toBeInTheDocument();
    // Scope to the week-days list — the view also renders an InsightStrip
    // <ul> below the grid, so getAllByRole on the document would also pick
    // up its cards.
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(7);
  });

  it("first row has weekday 'Sun' and last row has weekday 'Sat'", () => {
    render(<WeekView state={makeWTodayState()} onOpenDay={vi.fn()} />);
    const list = screen.getByRole("list", { name: "Week days" });
    const items = within(list).getAllByRole("listitem");
    expect(within(items[0]).getByText("Sun")).toBeInTheDocument();
    expect(within(items[6]).getByText("Sat")).toBeInTheDocument();
  });

  it("each row shows its day-of-month number (17..23 for W-today)", () => {
    render(<WeekView state={makeWTodayState()} onOpenDay={vi.fn()} />);
    for (let d = 17; d <= 23; d++) {
      expect(screen.getByText(String(d))).toBeInTheDocument();
    }
  });

  it("renders a date-range label 'May 17–23, 2026'", () => {
    render(<WeekView state={makeWTodayState()} onOpenDay={vi.fn()} />);
    expect(screen.getByText("May 17–23, 2026")).toBeInTheDocument();
  });
});

// ─── C-m9d-002: WeekView — prev/next week nav updates layout, label, aggregate ─

describe("C-m9d-002: WeekView — prev/next week nav updates layout and label", () => {
  it("renders Previous week and Next week buttons", () => {
    render(<WeekView state={makeWTodayState()} onOpenDay={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Previous week" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Next week" }),
    ).toBeInTheDocument();
  });

  it("clicking Previous week changes label to 'May 10–16, 2026'", async () => {
    const user = userEvent.setup();
    render(<WeekView state={makeWTodayState()} onOpenDay={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Previous week" }));
    expect(screen.getByText("May 10–16, 2026")).toBeInTheDocument();
    // Rows should be 05-10..05-16
    for (let d = 10; d <= 16; d++) {
      expect(screen.getByText(String(d))).toBeInTheDocument();
    }
  });

  it("clicking Next week once from W-today reaches W-future (May 24–30, 2026)", async () => {
    const user = userEvent.setup();
    render(<WeekView state={makeWTodayState()} onOpenDay={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Next week" }));
    expect(screen.getByText("May 24–30, 2026")).toBeInTheDocument();
  });

  it("nav does not write to localStorage (session-only anchor state)", async () => {
    const user = userEvent.setup();
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    render(<WeekView state={makeWTodayState()} onOpenDay={vi.fn()} />);
    const callsBefore = setItemSpy.mock.calls.length;
    await user.click(screen.getByRole("button", { name: "Previous week" }));
    // No new localStorage writes attributable to nav
    const newCalls = setItemSpy.mock.calls.slice(callsBefore);
    const navWrites = newCalls.filter(([key]) => key === "dharma:v1");
    expect(navWrites).toHaveLength(0);
  });
});

// ─── C-m9d-003: WeekView — prev/next across month and year boundaries ─────────

describe("C-m9d-003: WeekView — prev/next across month and year boundaries", () => {
  it("navigating to W-monthcross renders rows 2026-05-31…2026-06-06 with correct label", async () => {
    // Start from a state where we can navigate to the month-crossing week
    const state = makeWTodayState({
      programStart: "2026-01-01",
      currentDate: "2026-06-10",
    });
    // Set clock to June 10 for this test
    vi.setSystemTime(new Date("2026-06-10T12:00:00"));

    const user = userEvent.setup();
    render(<WeekView state={state} onOpenDay={vi.fn()} />);

    // Navigate: from 2026-06-07..13 back 1 week → 2026-05-31..06-06
    await user.click(screen.getByRole("button", { name: "Previous week" }));
    expect(screen.getByText("May 31 – Jun 6, 2026")).toBeInTheDocument();
    // Rows cross month boundary: 31 (May) + 1..6 (June)
    expect(screen.getByText("31")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
  });

  it("navigating to W-yearcross renders rows 2026-12-27…2027-01-02 with correct label", async () => {
    const state = makeWTodayState({
      programStart: "2026-01-01",
      currentDate: "2027-01-05",
    });
    vi.setSystemTime(new Date("2027-01-05T12:00:00"));

    const user = userEvent.setup();
    render(<WeekView state={state} onOpenDay={vi.fn()} />);

    // 2027-01-05 is in the week 2026-12-27..2027-01-02? No, Jan 5 is in 2027-01-04..2027-01-10
    // Navigate back 1 week to reach 2026-12-27..2027-01-02
    await user.click(screen.getByRole("button", { name: "Previous week" }));
    expect(screen.getByText("Dec 27, 2026 – Jan 2, 2027")).toBeInTheDocument();
    expect(screen.getByText("27")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});

// ─── C-m9d-008: WeekAggregate — no-data state renders em-dash, never 0 ────────

describe("C-m9d-008: WeekAggregate — no-data state: em-dash, no '0%', ring aria-label", () => {
  it("navigating to a fully-future week shows the em-dash glyph, not a numeral", async () => {
    const user = userEvent.setup();
    render(<WeekView state={makeWTodayState()} onOpenDay={vi.fn()} />);

    // Navigate 1 week forward to reach W-future (fully future: 2026-05-24..2026-05-30)
    await user.click(screen.getByRole("button", { name: "Next week" }));

    // em-dash should be visible in the WeekAggregate (the InsightStrip below
    // the day list ALSO renders "—" when its avg-score is null, hence the
    // scoped query into the aggregate's labelled SVG).
    const ringRegion = screen.getByLabelText(/Week score/i);
    expect(ringRegion.parentElement?.textContent).toContain("—");
  });

  it("no '0%' is rendered for a no-data week", async () => {
    const user = userEvent.setup();
    render(<WeekView state={makeWTodayState()} onOpenDay={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Next week" }));

    // No "0%" text should be present for no-data
    const content = screen.queryByText("0%");
    expect(content).toBeNull();
  });

  it("aggregate ring is role='img' with aria-label='Week score: no data' for no-data week", async () => {
    const user = userEvent.setup();
    render(<WeekView state={makeWTodayState()} onOpenDay={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Next week" }));

    const ring = screen.getByRole("img");
    expect(ring).toHaveAttribute("aria-label", "Week score: no data");
  });
});

// ─── C-m9d-009: WeekAggregate — week score displayed prominently as ring + numeral ─

describe("C-m9d-009: WeekAggregate — ring + centered numeral for W-today week", () => {
  it("renders the week score as a percentage string '70%'", () => {
    // W-today: (100 + 40) / 2 = 70
    render(<WeekView state={makeWTodayState()} onOpenDay={vi.fn()} />);
    // The aggregate should show "70%" or "70" + "%"
    expect(screen.getByText(/70%/)).toBeInTheDocument();
  });

  it("aggregate ring is role='img' with aria-label='Week score 70 percent'", () => {
    render(<WeekView state={makeWTodayState()} onOpenDay={vi.fn()} />);
    const ring = screen.getByRole("img");
    expect(ring).toHaveAttribute("aria-label", "Week score 70 percent");
  });

  it("aggregate ring uses only defined M0 tokens", () => {
    // Original assertion was "DOM contains no --surface-2 reference" because
    // --surface-2 was an undefined CSS var at the time. globals.css now
    // defines --surface-2 (the InsightStrip border tint), so that defensive
    // guard no longer makes sense. We still want the aggregate RING to use
    // only the legacy tokens — scope the check to the svg subtree.
    render(<WeekView state={makeWTodayState()} onOpenDay={vi.fn()} />);
    const ring = screen.getByRole("img");
    expect(ring.outerHTML).not.toContain("--surface-2");
  });
});

// ─── C-m9d-014: WeekView — day-tap routing ───────────────────────────────────

describe("C-m9d-014: WeekView — day-tap routing: today → onOpenDay; past archived → PastDayDetail; future → nothing", () => {
  it("tapping today's row calls onOpenDay with today's ISO once", async () => {
    const onOpenDay = vi.fn();
    const user = userEvent.setup();
    render(<WeekView state={makeWTodayState()} onOpenDay={onOpenDay} />);

    // Today is 2026-05-18 (Mon) — find it by aria-label containing "today"
    const todayBtn = screen.getByRole("button", { name: /today/ });
    await user.click(todayBtn);
    expect(onOpenDay).toHaveBeenCalledTimes(1);
    expect(onOpenDay).toHaveBeenCalledWith("2026-05-18");
  });

  it("tapping today's row does NOT open PastDayDetail", async () => {
    const user = userEvent.setup();
    render(<WeekView state={makeWTodayState()} onOpenDay={vi.fn()} />);
    const todayBtn = screen.getByRole("button", { name: /today/ });
    await user.click(todayBtn);
    expect(screen.queryByRole("region", { name: "Day detail" })).toBeNull();
  });

  it("tapping a past archived row opens PastDayDetail panel", async () => {
    const user = userEvent.setup();
    render(<WeekView state={makeWTodayState()} onOpenDay={vi.fn()} />);
    // 2026-05-17 (Sun) is archived
    const pastBtn = screen.getByRole("button", {
      name: /Sunday, May 17, 2026/,
    });
    await user.click(pastBtn);
    expect(
      screen.getByRole("region", { name: "Day detail" }),
    ).toBeInTheDocument();
  });

  it("PastDayDetail Close button dismisses the panel", async () => {
    const user = userEvent.setup();
    render(<WeekView state={makeWTodayState()} onOpenDay={vi.fn()} />);
    await user.click(
      screen.getByRole("button", { name: /Sunday, May 17, 2026/ }),
    );
    expect(
      screen.getByRole("region", { name: "Day detail" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("region", { name: "Day detail" })).toBeNull();
  });

  it("tapping a future row does nothing — no onOpenDay call, no PastDayDetail", async () => {
    const onOpenDay = vi.fn();
    const user = userEvent.setup();
    render(<WeekView state={makeWTodayState()} onOpenDay={onOpenDay} />);

    // Future rows (05-19..05-23) are not buttons — no click target
    // Verify none of the future day cells have a button role
    const items = screen.getAllByRole("listitem");
    // Days 05-19..05-23 are indexes 2..6 (Sun=0=05-17, Mon=1=05-18, Tue=2=05-19...)
    for (let i = 2; i <= 6; i++) {
      expect(within(items[i]).queryByRole("button")).toBeNull();
    }
    expect(onOpenDay).not.toHaveBeenCalled();
    expect(screen.queryByRole("region", { name: "Day detail" })).toBeNull();
  });
});

// Helper — import within from testing-library
import { within } from "@testing-library/react";
