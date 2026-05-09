// app/(building)/BuildingClient.m4b.test.tsx — M4b BuildingClient integration
// Covers: C-m4b-022 (day-100 cross-up via onGoalLog)
// Lives in a separate file because it must mock defaultState() with a seeded
// AppState containing one goal brick at 9/10 — that mock would break the empty
// state expected by the rest of BuildingClient.test.tsx.

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
              kind: "goal",
              count: 9,
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
      runningTimerBrickId: null,
    }),
  };
});

describe("C-m4b-022: BuildingClient + on goal at 9/10 dispatches LOG_GOAL_BRICK; day-100 fires", () => {
  it("after tap, haptics.notification fires once; playChime fires; Fireworks active", async () => {
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

    const plus = await screen.findByRole("button", {
      name: "Increase pushups",
    });
    await user.click(plus);

    expect(haptics.notification).toHaveBeenCalledTimes(1);
    // playChime fires for both block-100 and day-100 cross-up cascades
    expect(vi.mocked(playChime).mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("fireworks")).toBeInTheDocument();
  });
});
