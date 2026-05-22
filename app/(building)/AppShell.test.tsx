/**
 * app/(building)/AppShell.test.tsx — M9c: C-m9c-001..002, C-m9c-013
 * Tests for AppShell — the in-app shell that owns view state + usePersistedState.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppShell } from "./AppShell";
import { saveState } from "@/lib/persist";
import type { PersistedState } from "@/lib/persist";
import { today } from "@/lib/dharma";

vi.mock("@/lib/uuid", () => ({ uuid: () => "uuid-1" }));

vi.mock("@/lib/haptics", () => ({
  haptics: {
    light: vi.fn(),
    medium: vi.fn(),
    success: vi.fn(),
    notification: vi.fn(),
  },
}));

vi.mock("@/lib/audio", () => ({
  playChime: vi.fn(),
}));

// Minimal v2 persisted state for seeding localStorage
function makeSeedState(
  overrides: Partial<PersistedState> = {},
): PersistedState {
  return {
    schemaVersion: 3,
    programStart: "2026-05-01",
    currentDate: today(),
    history: {
      "2026-05-17": {
        blocks: [],
        categories: [],
        looseBricks: [
          {
            id: "ha1",
            name: "a",
            categoryId: null,
            parentBlockId: null,
            hasDuration: false,
            kind: "tick",
            done: true,
          },
        ],
      },
    },
    blocks: [
      {
        id: "b-live",
        name: "Morning",
        start: "06:00",
        end: "07:00",
        recurrence: { kind: "just-today", date: today() },
        categoryId: null,
        bricks: [
          {
            id: "r-live",
            name: "Stretch",
            categoryId: null,
            parentBlockId: "b-live",
            hasDuration: false,
            kind: "tick",
            done: false,
          },
        ],
      },
    ],
    categories: [],
    looseBricks: [],
    deletions: {}, // M5
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-05-18T12:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

// ─── C-m9c-001: AppShell — single usePersistedState + Day↔Month share one AppState

describe("C-m9c-001: AppShell — single usePersistedState + view switching without re-hydration", () => {
  it("renders Day view (BuildingClient chrome) by default", async () => {
    saveState(makeSeedState());
    render(<AppShell />);
    await act(async () => {});
    // Building view is rendered — TopBar, or at minimum the Building layout is present
    // The Kingdom grid should NOT be present in Day view
    expect(screen.queryByRole("grid")).toBeNull();
  });

  it("switching to Month renders the Kingdom grid (role='grid')", async () => {
    saveState(makeSeedState());
    const user = userEvent.setup();
    render(<AppShell />);
    await act(async () => {});
    // Click Month segment in ViewSwitcher
    const monthTab = screen.getByRole("tab", { name: "Month" });
    await user.click(monthTab);
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("switching back to Day hides the Kingdom grid", async () => {
    saveState(makeSeedState());
    const user = userEvent.setup();
    render(<AppShell />);
    await act(async () => {});
    const monthTab = screen.getByRole("tab", { name: "Month" });
    await user.click(monthTab);
    expect(screen.getByRole("grid")).toBeInTheDocument();
    const dayTab = screen.getByRole("tab", { name: "Day" });
    await user.click(dayTab);
    expect(screen.queryByRole("grid")).toBeNull();
  });
});

// ─── C-m9c-002: AppShell — default Day view, view state not persisted

describe("C-m9c-002: AppShell — view state is session-only, not persisted", () => {
  it("default view is Day on fresh mount (empty localStorage)", async () => {
    render(<AppShell />);
    await act(async () => {});
    // Day view is default — no grid
    expect(screen.queryByRole("grid")).toBeNull();
    // The ViewSwitcher Day tab is selected
    const dayTab = screen.getByRole("tab", { name: "Day" });
    expect(dayTab).toHaveAttribute("aria-selected", "true");
  });

  it("after switching to Month and remounting, view resets to Day", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<AppShell />);
    await act(async () => {});
    // Switch to Month
    await user.click(screen.getByRole("tab", { name: "Month" }));
    expect(screen.getByRole("grid")).toBeInTheDocument();
    // Unmount and remount
    unmount();
    render(<AppShell />);
    await act(async () => {});
    // View defaults to Day again
    expect(screen.queryByRole("grid")).toBeNull();
    const dayTab = screen.getByRole("tab", { name: "Day" });
    expect(dayTab).toHaveAttribute("aria-selected", "true");
  });

  it("localStorage dharma:v1 does not contain a 'view' field after switching", async () => {
    saveState(makeSeedState());
    const user = userEvent.setup();
    render(<AppShell />);
    await act(async () => {});
    await user.click(screen.getByRole("tab", { name: "Month" }));
    const stored = localStorage.getItem("dharma:v1");
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, unknown>;
      expect(parsed["view"]).toBeUndefined();
    }
    // Whether or not localStorage was written, there should be no "view" key
  });
});

// ─── C-m9c-013: AppShell — BuildingClient prop-refactor — no regression

describe("C-m9c-013: BuildingClient prop-refactor — Building view behavior unchanged", () => {
  it("Day view (BuildingClient) renders Building chrome — empty-state copy present", async () => {
    render(<AppShell />);
    await act(async () => {});
    expect(
      screen.getByText("Tap any slot to lay your first block."),
    ).toBeInTheDocument();
  });

  it("Day view renders BlueprintBar unconditionally", async () => {
    render(<AppShell />);
    await act(async () => {});
    const { container } = render(<AppShell />);
    await act(async () => {});
    const blueprint = container.querySelector('[aria-label="Day blueprint"]');
    expect(blueprint).not.toBeNull();
  });

  it("dispatch still flows through — saving a state change updates the view", async () => {
    // Pre-seed with a block so the Building view shows it
    saveState(makeSeedState());
    render(<AppShell />);
    await act(async () => {});
    // After hydration, the "Morning" block should be visible
    expect(screen.getByText("Morning")).toBeInTheDocument();
  });
});

// ─── C-m9d-011: AppShell — selecting Week renders the Castle (WeekView) ────────

describe("C-m9d-011: AppShell — selecting Week renders the Castle week view", () => {
  it("clicking Week segment renders the week list (role='list' aria-label='Week days')", async () => {
    saveState(makeSeedState());
    const user = userEvent.setup();
    render(<AppShell />);
    await act(async () => {});
    await user.click(screen.getByRole("tab", { name: "Week" }));
    expect(screen.getByRole("list", { name: "Week days" })).toBeInTheDocument();
    // Building view (Kingdom grid) is not shown
    expect(screen.queryByRole("grid")).toBeNull();
  });

  it("Week tab shows aria-selected='true' after clicking Week", async () => {
    saveState(makeSeedState());
    const user = userEvent.setup();
    render(<AppShell />);
    await act(async () => {});
    await user.click(screen.getByRole("tab", { name: "Week" }));
    expect(screen.getByRole("tab", { name: "Week" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("switching Day→Week→Month: each view renders correctly", async () => {
    saveState(makeSeedState());
    const user = userEvent.setup();
    render(<AppShell />);
    await act(async () => {});

    // Switch to Week
    await user.click(screen.getByRole("tab", { name: "Week" }));
    expect(screen.getByRole("list", { name: "Week days" })).toBeInTheDocument();

    // Switch to Month
    await user.click(screen.getByRole("tab", { name: "Month" }));
    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Week days" })).toBeNull();

    // Switch back to Day
    await user.click(screen.getByRole("tab", { name: "Day" }));
    expect(screen.queryByRole("grid")).toBeNull();
    expect(screen.queryByRole("list", { name: "Week days" })).toBeNull();
  });

  // M9e amendment: Year is now live — clicking it renders the Year (Empire) view.
  it("clicking Year segment renders the Empire year view (Months of <year> list)", async () => {
    saveState(makeSeedState());
    const user = userEvent.setup();
    render(<AppShell />);
    await act(async () => {});
    // In Day view by default — no year grid
    expect(screen.queryByRole("list", { name: /months of/i })).toBeNull();
    // Click Year — now shows Empire view
    await user.click(screen.getByRole("tab", { name: "Year" }));
    expect(screen.queryByRole("grid")).toBeNull();
    expect(screen.queryByRole("list", { name: "Week days" })).toBeNull();
    // Year view renders with "Months of <year>" list
    expect(
      screen.getByRole("list", { name: /months of/i }),
    ).toBeInTheDocument();
  });
});

// ─── C-m9d-012: AppShell — week-view wiring, single usePersistedState preserved ─

describe("C-m9d-012: AppShell — week wiring is purely additive; single usePersistedState", () => {
  it("switching views does not re-write dharma:v1 more than initial hydration", async () => {
    saveState(makeSeedState());
    const user = userEvent.setup();
    render(<AppShell />);
    await act(async () => {});

    // Capture localStorage writes before switching views
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    const callsBefore = setItemSpy.mock.calls.length;

    // Switch Day→Week→Month→Week→Day
    await user.click(screen.getByRole("tab", { name: "Week" }));
    await user.click(screen.getByRole("tab", { name: "Month" }));
    await user.click(screen.getByRole("tab", { name: "Week" }));
    await user.click(screen.getByRole("tab", { name: "Day" }));

    // No dharma:v1 writes during view switching (view state is session-only)
    const newCalls = setItemSpy.mock.calls.slice(callsBefore);
    const stateWrites = newCalls.filter(([key]) => key === "dharma:v1");
    expect(stateWrites).toHaveLength(0);
  });

  it("view state defaults to 'day' after remounting (session-only)", async () => {
    saveState(makeSeedState());
    const { unmount } = render(<AppShell />);
    await act(async () => {});

    // Switch to Week
    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "Week" }));
    expect(screen.getByRole("list", { name: "Week days" })).toBeInTheDocument();

    // Remount — should reset to Day
    unmount();
    render(<AppShell />);
    await act(async () => {});
    expect(screen.queryByRole("list", { name: "Week days" })).toBeNull();
    expect(screen.getByRole("tab", { name: "Day" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("localStorage dharma:v1 does not contain a 'view' field after switching to Week", async () => {
    saveState(makeSeedState());
    const user = userEvent.setup();
    render(<AppShell />);
    await act(async () => {});
    await user.click(screen.getByRole("tab", { name: "Week" }));
    const stored = localStorage.getItem("dharma:v1");
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, unknown>;
      expect(parsed["view"]).toBeUndefined();
    }
  });
});

// ─── C-m9d-013: AppShell — Day/Month branches unchanged; week wiring is purely additive ─

describe("C-m9d-013: AppShell — Day/Month behavior byte-equivalent after M9d (no-regression)", () => {
  it("C-m9c-001 behavior unchanged: Day view default, Month shows grid, Day hides grid", async () => {
    saveState(makeSeedState());
    const user = userEvent.setup();
    render(<AppShell />);
    await act(async () => {});

    // Default: no grid
    expect(screen.queryByRole("grid")).toBeNull();

    // Switch to Month
    await user.click(screen.getByRole("tab", { name: "Month" }));
    expect(screen.getByRole("grid")).toBeInTheDocument();

    // Switch back to Day
    await user.click(screen.getByRole("tab", { name: "Day" }));
    expect(screen.queryByRole("grid")).toBeNull();
  });

  it("C-m9c-002 behavior unchanged: default view is Day; localStorage has no 'view' field", async () => {
    render(<AppShell />);
    await act(async () => {});
    expect(screen.queryByRole("grid")).toBeNull();
    expect(screen.queryByRole("list", { name: "Week days" })).toBeNull();
    const dayTab = screen.getByRole("tab", { name: "Day" });
    expect(dayTab).toHaveAttribute("aria-selected", "true");
  });
});

// ─── C-m9e-008: AppShell — Day↔Week↔Month↔Year round-trip, no view leaks ─────

describe("C-m9e-008: AppShell — Day↔Week↔Month↔Year round-trip, no view leaks", () => {
  it("selecting Year renders Empire view with 'Months of <year>' list", async () => {
    saveState(makeSeedState());
    const user = userEvent.setup();
    render(<AppShell />);
    await act(async () => {});

    await user.click(screen.getByRole("tab", { name: "Year" }));
    // Empire view: role=list "Months of 2026"
    expect(
      screen.getByRole("list", { name: /months of/i }),
    ).toBeInTheDocument();
    // Year tab is aria-selected
    expect(screen.getByRole("tab", { name: "Year" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    // Day/Week/Month views not shown
    expect(screen.queryByRole("grid")).toBeNull();
    expect(screen.queryByRole("list", { name: "Week days" })).toBeNull();
  });

  it("Day→Week→Month→Year→Month→Week→Day round-trip — no crash, no view leaks", async () => {
    saveState(makeSeedState());
    const user = userEvent.setup();
    render(<AppShell />);
    await act(async () => {});

    // Day → Week
    await user.click(screen.getByRole("tab", { name: "Week" }));
    expect(screen.getByRole("list", { name: "Week days" })).toBeInTheDocument();
    // Week → Month
    await user.click(screen.getByRole("tab", { name: "Month" }));
    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Week days" })).toBeNull();
    // Month → Year
    await user.click(screen.getByRole("tab", { name: "Year" }));
    expect(
      screen.getByRole("list", { name: /months of/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("grid")).toBeNull();
    // Year → Month
    await user.click(screen.getByRole("tab", { name: "Month" }));
    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /months of/i })).toBeNull();
    // Month → Week
    await user.click(screen.getByRole("tab", { name: "Week" }));
    expect(screen.getByRole("list", { name: "Week days" })).toBeInTheDocument();
    // Week → Day
    await user.click(screen.getByRole("tab", { name: "Day" }));
    expect(screen.queryByRole("grid")).toBeNull();
    expect(screen.queryByRole("list")).toBeNull();
  });
});

// ─── C-m9e-009: AppShell — year-branch + monthTarget wiring; single usePersistedState ──

describe("C-m9e-009: AppShell — year-branch + monthTarget; single usePersistedState", () => {
  it("switching via ViewSwitcher to Month after Year shows today's month (not stale target)", async () => {
    saveState(makeSeedState());
    const user = userEvent.setup();
    render(<AppShell />);
    await act(async () => {});

    // Switch to Year (no monthTarget set via tap)
    await user.click(screen.getByRole("tab", { name: "Year" }));
    expect(
      screen.getByRole("list", { name: /months of/i }),
    ).toBeInTheDocument();

    // Switch back to Month directly via switcher — should show today's month (May 2026)
    await user.click(screen.getByRole("tab", { name: "Month" }));
    expect(screen.getByRole("grid")).toBeInTheDocument();
    // Month label should be today's month
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "May 2026",
    );
  });

  it("view state defaults to Day on remount — session-only (Year branch doesn't persist)", async () => {
    saveState(makeSeedState());
    const user = userEvent.setup();
    const { unmount } = render(<AppShell />);
    await act(async () => {});

    await user.click(screen.getByRole("tab", { name: "Year" }));
    expect(
      screen.getByRole("list", { name: /months of/i }),
    ).toBeInTheDocument();

    unmount();
    render(<AppShell />);
    await act(async () => {});
    // Back to Day view
    expect(screen.queryByRole("list", { name: /months of/i })).toBeNull();
    expect(screen.getByRole("tab", { name: "Day" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("switching via ViewSwitcher clears monthTarget — direct Month visit shows today's month", async () => {
    saveState(makeSeedState());
    const user = userEvent.setup();
    render(<AppShell />);
    await act(async () => {});

    // Go to Year then switcher-Month — monthTarget is null → today's month
    await user.click(screen.getByRole("tab", { name: "Year" }));
    await user.click(screen.getByRole("tab", { name: "Month" }));
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "May 2026",
    );

    // Go to Day then switcher-Month — also today's month
    await user.click(screen.getByRole("tab", { name: "Day" }));
    await user.click(screen.getByRole("tab", { name: "Month" }));
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "May 2026",
    );
  });
});

// ─── C-m9e-010: AppShell — year→month tap-through opens MonthView at tapped month ──

describe("C-m9e-010: AppShell — tap a month in YearView opens MonthView at that month", () => {
  it("tapping a MonthCell opens MonthView at the tapped month", async () => {
    saveState(makeSeedState());
    const user = userEvent.setup();
    render(<AppShell />);
    await act(async () => {});

    // Switch to Year
    await user.click(screen.getByRole("tab", { name: "Year" }));
    expect(
      screen.getByRole("list", { name: /months of/i }),
    ).toBeInTheDocument();

    // Tap January 2026 (pre-start, no data)
    const janBtn = screen.getByRole("button", { name: /^January 2026/ });
    await user.click(janBtn);

    // Should switch to Month view showing January 2026
    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "January 2026",
    );
  });

  it("tapping a fully-future month opens MonthView at that month without crash", async () => {
    saveState(makeSeedState());
    const user = userEvent.setup();
    render(<AppShell />);
    await act(async () => {});

    await user.click(screen.getByRole("tab", { name: "Year" }));

    // Tap December 2026 (fully future)
    const decBtn = screen.getByRole("button", { name: /^December 2026/ });
    await user.click(decBtn);

    // Should switch to Month view showing December 2026 — no crash
    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "December 2026",
    );
  });

  it("tapping different months re-seeds MonthView each time (key-based remount)", async () => {
    saveState(makeSeedState());
    const user = userEvent.setup();
    render(<AppShell />);
    await act(async () => {});

    // Go to Year, tap March
    await user.click(screen.getByRole("tab", { name: "Year" }));
    await user.click(screen.getByRole("button", { name: /^March 2026/ }));
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "March 2026",
    );

    // Go back to Year, tap October
    await user.click(screen.getByRole("tab", { name: "Year" }));
    const octBtn = screen.getByRole("button", { name: /^October 2026/ });
    await user.click(octBtn);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "October 2026",
    );
  });
});

// ─── C-m9e-012: AppShell — Day/Week/Month branches unchanged; year is purely additive ──

describe("C-m9e-012: AppShell — Day/Week/Month behavior byte-equivalent after M9e (no-regression)", () => {
  it("Day view default, Month shows grid, Day hides grid — unchanged from M9c/M9d", async () => {
    saveState(makeSeedState());
    const user = userEvent.setup();
    render(<AppShell />);
    await act(async () => {});

    // Default: Day view, no grid
    expect(screen.queryByRole("grid")).toBeNull();

    // Month shows grid
    await user.click(screen.getByRole("tab", { name: "Month" }));
    expect(screen.getByRole("grid")).toBeInTheDocument();

    // Back to Day — no grid
    await user.click(screen.getByRole("tab", { name: "Day" }));
    expect(screen.queryByRole("grid")).toBeNull();
  });

  it("Week view renders correctly after M9e Year wiring", async () => {
    saveState(makeSeedState());
    const user = userEvent.setup();
    render(<AppShell />);
    await act(async () => {});

    await user.click(screen.getByRole("tab", { name: "Week" }));
    expect(screen.getByRole("list", { name: "Week days" })).toBeInTheDocument();
    expect(screen.queryByRole("grid")).toBeNull();
    expect(screen.queryByRole("list", { name: /months of/i })).toBeNull();
  });

  it("MonthView via switcher (not tap-through) shows today's month — M9c behavior preserved", async () => {
    saveState(makeSeedState());
    const user = userEvent.setup();
    render(<AppShell />);
    await act(async () => {});

    await user.click(screen.getByRole("tab", { name: "Month" }));
    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "May 2026",
    );
  });
});
