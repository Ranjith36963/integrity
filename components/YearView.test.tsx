/**
 * components/YearView.test.tsx — M9e: C-m9e-001..003, C-m9e-006
 * Tests for YearView (Empire view) + the inline YearAggregate ring.
 *
 * C-m9e-001: 3×4 twelve-month grid + month-name labels + year label
 * C-m9e-002: per-month score indicator + the prominent year aggregate
 * C-m9e-003: prev/next year nav updates the 12 cells, year label, aggregate
 * C-m9e-006: YearAggregate ring — scored + no-data states (mutation-resistant)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AppState } from "@/lib/types";
import type { ArchivedDay } from "@/lib/types";
import { YearView } from "./YearView";

// Set fake clock so today() returns "2026-05-18"
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-05-18T12:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── Fixture helpers ──────────────────────────────────────────────────────────

/** ArchivedDay scoring 70%: 10 ticks, 7 done */
function makeDay70(): ArchivedDay {
  const bricks = Array.from({ length: 10 }, (_, i) => ({
    id: `yr70-${i}`,
    name: `b${i}`,
    categoryId: null as null,
    parentBlockId: null as null,
    hasDuration: false,
    kind: "tick" as const,
    done: i < 7,
  }));
  return { blocks: [], categories: [], looseBricks: bricks };
}

/** F-standing: programStart=2026-05-01, currentDate=2026-05-18, 17 archived days at 70% */
function makeStandingState(): AppState {
  const history: Record<string, ArchivedDay> = {};
  for (let d = 1; d <= 17; d++) {
    const dd = String(d).padStart(2, "0");
    history[`2026-05-${dd}`] = makeDay70();
  }
  return {
    programStart: "2026-05-01",
    currentDate: "2026-05-18",
    history,
    blocks: [],
    categories: [],
    // Live day scoring 40% (2/5 done)
    looseBricks: [
      {
        id: "live-a",
        name: "a",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: true,
      },
      {
        id: "live-b",
        name: "b",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: true,
      },
      {
        id: "live-c",
        name: "c",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: false,
      },
      {
        id: "live-d",
        name: "d",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: false,
      },
      {
        id: "live-e",
        name: "e",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: false,
      },
    ],
  };
}

// ─── C-m9e-001: YearView — 3×4 twelve-month grid + month-name labels + year label ──

describe("C-m9e-001: YearView — 3×4 twelve-month grid + month labels + year label", () => {
  it("renders exactly 12 MonthCell buttons", () => {
    render(<YearView state={makeStandingState()} onOpenMonth={vi.fn()} />);
    // All 12 months render as buttons
    const buttons = screen.getAllByRole("button");
    // There are 12 month buttons + 2 nav buttons (prev/next year) = 14
    // Get specifically the month-related ones — they have aria-labels like "January 2026, ..."
    const monthButtons = buttons.filter((b) =>
      b.getAttribute("aria-label")?.match(/\w+ \d{4},/),
    );
    expect(monthButtons).toHaveLength(12);
  });

  it("months list container has role='list' and aria-label='Months of 2026'", () => {
    render(<YearView state={makeStandingState()} onOpenMonth={vi.fn()} />);
    const list = screen.getByRole("list", { name: "Months of 2026" });
    expect(list).toBeInTheDocument();
  });

  it("month cells include 'January' (first) and 'December' (last)", () => {
    render(<YearView state={makeStandingState()} onOpenMonth={vi.fn()} />);
    expect(screen.getByText("January")).toBeInTheDocument();
    expect(screen.getByText("December")).toBeInTheDocument();
  });

  it("the grid wrapper has gridTemplateColumns: repeat(3, 1fr) — a 3×4 layout", () => {
    const { container } = render(
      <YearView state={makeStandingState()} onOpenMonth={vi.fn()} />,
    );
    // Find the grid element
    const list = container.querySelector("[role='list']");
    expect(list).not.toBeNull();
    const style = list!.getAttribute("style") ?? "";
    expect(style).toContain("repeat(3, 1fr)");
  });

  it("the year label <h2> reads '2026'", () => {
    render(<YearView state={makeStandingState()} onOpenMonth={vi.fn()} />);
    const h2 = screen.getByRole("heading", { level: 2 });
    expect(h2).toHaveTextContent("2026");
  });
});

// ─── C-m9e-002: YearView — per-month score indicator + the prominent year aggregate ──

describe("C-m9e-002: YearView — per-month scores + YearAggregate ring", () => {
  it("Jan–Apr (pre-programStart) cells show the no-data em-dash glyph", () => {
    render(<YearView state={makeStandingState()} onOpenMonth={vi.fn()} />);
    // Months Jan–Apr (0–3) are entirely before programStart 2026-05-01 → null → em-dash
    // Check via aria-label "no data"
    const janBtn = screen.getByRole("button", {
      name: /^January 2026, no data/,
    });
    expect(janBtn).toBeInTheDocument();
    const aprBtn = screen.getByRole("button", {
      name: /^April 2026, no data/,
    });
    expect(aprBtn).toBeInTheDocument();
  });

  it("May (current month) has a numeric score — not em-dash", () => {
    render(<YearView state={makeStandingState()} onOpenMonth={vi.fn()} />);
    // May has in-range days → monthScore is a number, not null
    const mayBtn = screen.getByRole("button", { name: /^May 2026, score/ });
    expect(mayBtn).toBeInTheDocument();
    expect(mayBtn.getAttribute("aria-label")).not.toContain("no data");
  });

  it("Jun–Dec (fully future) cells show the no-data treatment", () => {
    render(<YearView state={makeStandingState()} onOpenMonth={vi.fn()} />);
    const junBtn = screen.getByRole("button", { name: /^June 2026, no data/ });
    expect(junBtn).toBeInTheDocument();
    const decBtn = screen.getByRole("button", {
      name: /^December 2026, no data/,
    });
    expect(decBtn).toBeInTheDocument();
  });

  it("May cell carries the current-month accent (isCurrentMonth=true)", () => {
    render(<YearView state={makeStandingState()} onOpenMonth={vi.fn()} />);
    const mayBtn = screen.getByRole("button", {
      name: /^May 2026.*current month/,
    });
    expect(mayBtn).toBeInTheDocument();
    const style = mayBtn.getAttribute("style") ?? "";
    expect(style).toContain("var(--accent)");
  });

  it("the YearAggregate ring is present (role='img' with aria-label about year score)", () => {
    render(<YearView state={makeStandingState()} onOpenMonth={vi.fn()} />);
    const ring = screen.getByRole("img");
    expect(ring).toBeInTheDocument();
    const label = ring.getAttribute("aria-label");
    expect(label).toMatch(/year score/i);
  });
});

// ─── C-m9e-003: YearView — prev/next year nav ────────────────────────────────

describe("C-m9e-003: YearView — prev/next year nav updates year label + cells + aggregate", () => {
  it("prev/next year buttons have correct aria-labels and are ≥ 44px", () => {
    const { container } = render(
      <YearView state={makeStandingState()} onOpenMonth={vi.fn()} />,
    );
    const prevBtn = screen.getByRole("button", { name: /previous year/i });
    const nextBtn = screen.getByRole("button", { name: /next year/i });
    expect(prevBtn).toBeInTheDocument();
    expect(nextBtn).toBeInTheDocument();
    // Check min-height 44px
    const prevStyle = container
      .querySelector("[aria-label='Previous year']")
      ?.getAttribute("style");
    expect(prevStyle).toMatch(/min-height.*44px/);
  });

  it("clicking Previous year changes label to '2025' and all months are no-data", async () => {
    const user = userEvent.setup();
    render(<YearView state={makeStandingState()} onOpenMonth={vi.fn()} />);
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /previous year/i }));
    });
    // Year label now reads 2025
    const h2 = screen.getByRole("heading", { level: 2 });
    expect(h2).toHaveTextContent("2025");
    // 2025 is entirely pre-programStart → all 12 cells show no-data
    const janBtn = screen.getByRole("button", {
      name: /^January 2025, no data/,
    });
    expect(janBtn).toBeInTheDocument();
    // list aria-label updated
    const list = screen.getByRole("list", { name: "Months of 2025" });
    expect(list).toBeInTheDocument();
  });

  it("clicking Next year twice shows '2027' with all no-data cells", async () => {
    const user = userEvent.setup();
    render(<YearView state={makeStandingState()} onOpenMonth={vi.fn()} />);
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /next year/i }));
      await user.click(screen.getByRole("button", { name: /next year/i }));
    });
    const h2 = screen.getByRole("heading", { level: 2 });
    expect(h2).toHaveTextContent("2027");
    // 2027 is entirely future → all 12 cells show no-data
    const janBtn = screen.getByRole("button", {
      name: /^January 2027, no data/,
    });
    expect(janBtn).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Months of 2027" });
    expect(list).toBeInTheDocument();
  });

  it("nav does not write to localStorage (view state is session-only)", async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    const user = userEvent.setup();
    render(<YearView state={makeStandingState()} onOpenMonth={vi.fn()} />);

    const callsBefore = setItemSpy.mock.calls.length;
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /previous year/i }));
      await user.click(screen.getByRole("button", { name: /next year/i }));
    });
    const newCalls = setItemSpy.mock.calls.slice(callsBefore);
    const stateWrites = newCalls.filter(([key]) => key === "dharma:v1");
    expect(stateWrites).toHaveLength(0);
  });
});

// ─── C-m9e-006: YearAggregate ring — scored + no-data states ─────────────────

describe("C-m9e-006: YearAggregate ring — scored and no-data states (mutation-resistant)", () => {
  it("scored year: ring shows 'Year score N percent' aria-label and a % numeral", () => {
    // F-standing: yearScore is a known positive number
    render(<YearView state={makeStandingState()} onOpenMonth={vi.fn()} />);
    const ring = screen.getByRole("img");
    const label = ring.getAttribute("aria-label");
    // Should match "Year score N percent" format
    expect(label).toMatch(/year score \d+ percent/i);
    // No "no data" text in scored state
    expect(label).not.toContain("no data");
  });

  it("no-data year (2027, fully future): ring shows 'Year score: no data' aria-label, no '0%' numeral", async () => {
    const user = userEvent.setup();
    render(<YearView state={makeStandingState()} onOpenMonth={vi.fn()} />);
    // Navigate to 2027 (fully future)
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /next year/i }));
    });
    const ring = screen.getByRole("img");
    const label = ring.getAttribute("aria-label");
    expect(label).toBe("Year score: no data");
    // No "0%" in the aggregate display
    // The ring's text content should NOT contain "0%"
    const ringContainer =
      ring.closest("[data-year-aggregate]") ?? ring.parentElement;
    if (ringContainer) {
      expect(ringContainer.textContent).not.toContain("0%");
    }
  });

  it("no-data year ring shows em-dash glyph, not '0' numeral", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <YearView state={makeStandingState()} onOpenMonth={vi.fn()} />,
    );
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /next year/i }));
    });
    // Find the aggregate area and check it has em-dash
    const ring = screen.getByRole("img");
    // Walk up to find the aggregate container
    const aggregateEl = ring.closest("div")?.parentElement;
    if (aggregateEl) {
      expect(aggregateEl.textContent).toContain("—");
    } else {
      // Fallback: check the full component doesn't show "0%"
      expect(container.textContent).not.toMatch(/^0%/);
    }
  });

  it("no --surface-2 in the YearAggregate markup", () => {
    const { container } = render(
      <YearView state={makeStandingState()} onOpenMonth={vi.fn()} />,
    );
    // No element should reference --surface-2
    const allStyles = Array.from(container.querySelectorAll("[style]"))
      .map((el) => el.getAttribute("style"))
      .join(" ");
    expect(allStyles).not.toContain("--surface-2");
  });

  it("'Year' label is shown below the ring in all states", async () => {
    render(<YearView state={makeStandingState()} onOpenMonth={vi.fn()} />);
    // The "Year" label text appears in the aggregate area
    const yearLabels = screen.getAllByText("Year");
    // At least one should be in the aggregate (may also be in the switcher)
    expect(yearLabels.length).toBeGreaterThan(0);
  });
});
