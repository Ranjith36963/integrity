// app/(building)/BuildingClient.m4b.test.tsx — M4f BuildingClient integration
// Covers: C-m4f-009 (day-100 cross-up via onUnitsOpenSheet/UnitsEntrySheet/SET_UNITS_DONE)
// M4f: migrated from C-m4b-022 (goal → units, count → done, LOG_GOAL_BRICK → SET_UNITS_DONE).
//      Tap is now chip-tap → UnitsEntrySheet → Save with done=10 (target).
// M8: defaultState() mock replaced with localStorage pre-seeding (usePersistedState hydrates
//     from dharma:v1, not from defaultState()). State is pre-seeded via saveState() in beforeEach.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BuildingClient } from "./BuildingClient";
import { saveState } from "@/lib/persist";

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

// M8: pre-seed localStorage with the test state instead of mocking defaultState().
// usePersistedState hydrates from dharma:v1 post-mount; defaultState() is not the seeding path.
beforeEach(() => {
  localStorage.clear();
  saveState({
    schemaVersion: 1,
    programStart: "2026-05-09",
    blocks: [
      {
        id: "b1",
        name: "Block 1",
        start: "09:00",
        end: "10:00",
        recurrence: { kind: "just-today", date: "2026-05-09" },
        categoryId: "c1",
        bricks: [
          {
            id: "g1",
            name: "pushups",
            kind: "units",
            hasDuration: false,
            done: 9,
            target: 10,
            unit: "reps",
            categoryId: "c1",
            parentBlockId: "b1",
          },
        ],
      },
    ],
    looseBricks: [],
    categories: [{ id: "c1", name: "Health", color: "#34d399" }],
  });
});

describe("C-m4f-009: BuildingClient + on units at done:9/target:10 dispatches SET_UNITS_DONE; day-100 fires", () => {
  it("after tap chip → UnitsEntrySheet → Save 10, haptics.notification fires once; playChime fires; Fireworks active", async () => {
    const { haptics } = await import("@/lib/haptics");
    const { playChime } = await import("@/lib/audio");
    vi.clearAllMocks();

    const user = userEvent.setup();
    const { container } = render(<BuildingClient />);
    // Flush effects so hydration loads the pre-seeded state from localStorage
    await act(async () => {});

    const card = container.querySelector(
      '[data-component="timeline-block"]',
    ) as HTMLElement;
    expect(card).not.toBeNull();
    await user.click(card);

    // M4f: units chip is a simple button (no stepper); tap opens UnitsEntrySheet
    const chipBtn = await screen.findByRole("button", {
      name: /pushups.*units/i,
    });
    await user.click(chipBtn);

    // UnitsEntrySheet should be open
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();

    // Clear and type "10" (target) to trigger cross-up
    const input = screen.getByRole("spinbutton");
    await user.clear(input);
    await user.type(input, "10");

    // Click Save
    const saveBtn = screen.getByRole("button", { name: /^save$/i });
    await user.click(saveBtn);

    expect(haptics.notification).toHaveBeenCalledTimes(1);
    // playChime fires for both block-100 and day-100 cross-up cascades
    expect(vi.mocked(playChime).mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("fireworks")).toBeInTheDocument();
  });
});
