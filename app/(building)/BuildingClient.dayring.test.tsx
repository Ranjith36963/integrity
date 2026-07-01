// BuildingClient.dayring.test.tsx — Phase 2: Line/Ring day-view toggle.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

describe("Day view Line/Ring toggle", () => {
  it("defaults to the linear timeline (Line active, no ring)", async () => {
    render(<Harness />);
    await act(async () => {});
    expect(
      screen.getByTestId("day-view-line").getAttribute("aria-checked"),
    ).toBe("true");
    expect(screen.queryByTestId("day-ring")).toBeNull();
  });

  it("tapping Ring shows the DayRing; tapping Line brings the timeline back", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await act(async () => {});

    await user.click(screen.getByTestId("day-view-ring"));
    expect(screen.getByTestId("day-ring")).toBeInTheDocument();
    expect(
      screen.getByTestId("day-view-ring").getAttribute("aria-checked"),
    ).toBe("true");

    await user.click(screen.getByTestId("day-view-line"));
    expect(screen.queryByTestId("day-ring")).toBeNull();
  });
});
