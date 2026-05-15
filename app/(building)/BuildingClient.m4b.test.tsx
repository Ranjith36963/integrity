// app/(building)/BuildingClient.m4b.test.tsx — M4f BuildingClient integration
// Covers: C-m4f-009 (day-100 cross-up via onUnitsOpenSheet/UnitsEntrySheet/SET_UNITS_DONE)
// M4f: migrated from C-m4b-022 (goal → units, count → done, LOG_GOAL_BRICK → SET_UNITS_DONE).
//      Tap is now chip-tap → UnitsEntrySheet → Save with done=10 (target).
// Lives in a separate file because it must mock defaultState() with a seeded
// AppState containing one units brick at done:9/target:10 — that mock would break the empty
// state expected by the rest of BuildingClient.test.tsx.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BuildingClient } from "./BuildingClient";

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

vi.mock("@/lib/data", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/data")>("@/lib/data");
  return {
    ...actual,
    defaultState: () => ({
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
    }),
  };
});

describe("C-m4f-009: BuildingClient + on units at done:9/target:10 dispatches SET_UNITS_DONE; day-100 fires", () => {
  it("after tap chip → UnitsEntrySheet → Save 10, haptics.notification fires once; playChime fires; Fireworks active", async () => {
    const { haptics } = await import("@/lib/haptics");
    const { playChime } = await import("@/lib/audio");
    vi.clearAllMocks();

    const user = userEvent.setup();
    const { container } = render(<BuildingClient />);

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
