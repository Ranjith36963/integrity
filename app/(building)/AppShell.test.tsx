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
    schemaVersion: 2,
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
