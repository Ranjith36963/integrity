// BuildingClient.dayring.test.tsx — Day view stacks the clock Ring above the
// Timeline (no toggle — both are always shown, in sequence).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { BuildingClient } from "./BuildingClient";
import { usePersistedState } from "@/lib/usePersistedState";
import { saveState } from "@/lib/persist";
import type { PersistedState } from "@/lib/persist";
import { today } from "@/lib/dharma";

function Harness() {
  const [state, dispatch] = usePersistedState();
  return <BuildingClient state={state} dispatch={dispatch} />;
}

vi.mock("@/lib/haptics", () => ({
  haptics: { light: vi.fn(), medium: vi.fn(), success: vi.fn() },
}));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  const seed: PersistedState = {
    schemaVersion: 3,
    programStart: "2026-07-01",
    currentDate: today(),
    history: {},
    blocks: [
      {
        id: "bk1",
        name: "Sleep",
        start: "22:00",
        end: "04:00", // overnight — renders as one ring arc
        recurrence: { kind: "every-day" },
        categoryId: null,
        bricks: [],
      },
    ],
    categories: [],
    looseBricks: [],
    deletions: {},
  };
  saveState(seed);
});

describe("Day view — Ring above, Timeline below (no toggle)", () => {
  it("shows BOTH the clock ring and the timeline, always", async () => {
    render(<Harness />);
    await act(async () => {});
    // Both surfaces are present at once — the ring...
    expect(screen.getByTestId("day-ring")).toBeInTheDocument();
    // ...and the timeline hour-grid.
    expect(screen.getByTestId("hour-grid")).toBeInTheDocument();
  });

  it("no longer renders a Line/Ring view toggle", async () => {
    render(<Harness />);
    await act(async () => {});
    expect(screen.queryByTestId("day-view-line")).toBeNull();
    expect(screen.queryByTestId("day-view-ring")).toBeNull();
  });

  it("renders the ring before the timeline in document order", async () => {
    render(<Harness />);
    await act(async () => {});
    const ring = screen.getByTestId("day-ring");
    const grid = screen.getByTestId("hour-grid");
    // ring comes first → Node.DOCUMENT_POSITION_FOLLOWING (4) for grid.
    expect(
      ring.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
