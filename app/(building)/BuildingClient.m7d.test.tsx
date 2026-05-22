/**
 * app/(building)/BuildingClient.m7d.test.tsx — M7d component tests for BuildingClient.
 *
 * Covers: C-m7d-006, C-m7d-007, C-m7d-008, C-m7d-009, C-m7d-010
 */

import React from "react";
import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import type { Dispatch } from "react";
import { BuildingClient } from "./BuildingClient";
import type { AppState, Action } from "@/lib/types";

// ── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("@/lib/audio", () => ({ playChime: vi.fn() }));
vi.mock("@/lib/haptics", () => ({
  haptics: {
    success: vi.fn(),
    notification: vi.fn(),
    light: vi.fn(),
    medium: vi.fn(),
  },
}));

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return {
    ...actual,
    useReducedMotion: vi.fn(() => false),
  };
});

// ── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_STATE: AppState = {
  blocks: [],
  categories: [],
  looseBricks: [],
  programStart: "2026-05-01",
  currentDate: "2026-05-20",
  history: {},
  deletions: {},
};

/** stateWithDayAt100: single block with one done tick brick → dayPct === 100 */
const stateWithDayAt100: AppState = {
  ...BASE_STATE,
  blocks: [
    {
      id: "blk-100",
      name: "Morning",
      start: "09:00",
      end: "10:00",
      recurrence: { kind: "just-today", date: "2026-05-20" },
      categoryId: null,
      bricks: [
        {
          id: "brk-100",
          name: "Brick A",
          kind: "tick",
          hasDuration: false,
          done: true,
          categoryId: null,
          parentBlockId: "blk-100",
          recurrence: { kind: "just-today", date: "2026-05-20" },
        },
      ],
    },
  ],
};

/** stateWithDayAt0: same block but brick NOT done → dayPct === 0 */
const stateWithDayAt0: AppState = {
  ...BASE_STATE,
  blocks: [
    {
      id: "blk-100",
      name: "Morning",
      start: "09:00",
      end: "10:00",
      recurrence: { kind: "just-today", date: "2026-05-20" },
      categoryId: null,
      bricks: [
        {
          id: "brk-100",
          name: "Brick A",
          kind: "tick",
          hasDuration: false,
          done: false,
          categoryId: null,
          parentBlockId: "blk-100",
          recurrence: { kind: "just-today", date: "2026-05-20" },
        },
      ],
    },
  ],
};

// ── C-m7d-006: hydration into dayPct===100 does NOT activate fireworks ────────

describe("C-m7d-006: <BuildingClient> with dayPct===100 at hydration does NOT activate fireworks", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("fireworks NOT active on first render at dayPct=100; day-complete-card absent", async () => {
    const dispatch = vi.fn() as unknown as Dispatch<Action>;

    render(
      <BuildingClient
        state={stateWithDayAt100}
        dispatch={dispatch}
        hydrated={true}
      />,
    );

    // Flush effects
    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    // Fireworks should NOT be active (data-testid="fireworks" only present when particles active)
    expect(screen.queryByTestId("fireworks")).toBeNull();
    // DayCompleteCard also absent
    expect(screen.queryByTestId("day-complete-card")).toBeNull();

    // Still inactive after 3000ms
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByTestId("fireworks")).toBeNull();
    expect(screen.queryByTestId("day-complete-card")).toBeNull();
  });
});

// ── C-m7d-007: 0→100 transition activates fireworks; timer fires 1700ms (motion ON) ──

describe("C-m7d-007: <BuildingClient> activates fireworks on <100→100 transition; flips back after 1700ms (motion ON)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("fireworks activates on 0→100 transition; deactivates 1700ms later under motion ON", async () => {
    const { useReducedMotion } = await import("motion/react");
    vi.mocked(useReducedMotion).mockReturnValue(false);

    const dispatch = vi.fn() as unknown as Dispatch<Action>;

    const { rerender } = render(
      <BuildingClient
        state={stateWithDayAt0}
        dispatch={dispatch}
        hydrated={true}
      />,
    );

    // Initially fireworks not active
    expect(screen.queryByTestId("fireworks")).toBeNull();

    // Transition to 100%
    await act(async () => {
      rerender(
        <BuildingClient
          state={stateWithDayAt100}
          dispatch={dispatch}
          hydrated={true}
        />,
      );
    });

    // After transition, fireworks should be active
    expect(screen.queryByTestId("fireworks")).not.toBeNull();

    // At 1699ms — still active
    await act(async () => {
      vi.advanceTimersByTime(1699);
    });
    expect(screen.queryByTestId("fireworks")).not.toBeNull();

    // At 1700ms — deactivates (particles set to null → fireworks returns null)
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByTestId("fireworks")).toBeNull();

    // Second crossing: back to 0, then back to 100 — should NOT re-fire (mount-shot)
    await act(async () => {
      rerender(
        <BuildingClient
          state={stateWithDayAt0}
          dispatch={dispatch}
          hydrated={true}
        />,
      );
    });
    await act(async () => {
      rerender(
        <BuildingClient
          state={stateWithDayAt100}
          dispatch={dispatch}
          hydrated={true}
        />,
      );
    });

    // Still no fireworks (mount-shot prevents re-fire)
    expect(screen.queryByTestId("fireworks")).toBeNull();
  });
});

// ── C-m7d-008: PRM — DayCompleteCard mounts on 0→100; Fireworks null; card unmounts at 2000ms ──

describe("C-m7d-008: under PRM, <BuildingClient> mounts <DayCompleteCard> on <100→100; Fireworks null; card unmounts at 2000ms", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("PRM path: DayCompleteCard mounts on 0→100; stays at 1700ms; unmounts at 2000ms", async () => {
    const { useReducedMotion } = await import("motion/react");
    vi.mocked(useReducedMotion).mockReturnValue(true);

    const dispatch = vi.fn() as unknown as Dispatch<Action>;

    const { rerender } = render(
      <BuildingClient
        state={stateWithDayAt0}
        dispatch={dispatch}
        hydrated={true}
      />,
    );

    expect(screen.queryByTestId("day-complete-card")).toBeNull();

    // Transition to 100%
    await act(async () => {
      rerender(
        <BuildingClient
          state={stateWithDayAt100}
          dispatch={dispatch}
          hydrated={true}
        />,
      );
    });

    // DayCompleteCard should mount
    const card = screen.queryByTestId("day-complete-card");
    expect(card).not.toBeNull();
    expect(card!.textContent).toContain("Day complete.");
    expect(card!.getAttribute("role")).toBe("status");
    expect(card!.getAttribute("aria-live")).toBe("polite");

    // Fireworks returns null under PRM (M4a behavior preserved)
    expect(screen.queryByTestId("fireworks")).toBeNull();

    // At 1700ms — card is STILL mounted (PRM timer is 2000ms, not 1700ms)
    await act(async () => {
      vi.advanceTimersByTime(1700);
    });
    expect(screen.queryByTestId("day-complete-card")).not.toBeNull();

    // At 2000ms total (+300ms more) — card unmounts
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByTestId("day-complete-card")).toBeNull();
  });
});

// ── C-m7d-009: motion ON — DayCompleteCard NEVER mounts (PRM-only) ────────────

describe("C-m7d-009: under motion ON, <BuildingClient> does NOT mount <DayCompleteCard> on <100→100", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("motion ON: fireworks active; DayCompleteCard NEVER mounts in 2000ms window", async () => {
    const { useReducedMotion } = await import("motion/react");
    vi.mocked(useReducedMotion).mockReturnValue(false);

    const dispatch = vi.fn() as unknown as Dispatch<Action>;

    const { rerender } = render(
      <BuildingClient
        state={stateWithDayAt0}
        dispatch={dispatch}
        hydrated={true}
      />,
    );

    // Transition to 100%
    await act(async () => {
      rerender(
        <BuildingClient
          state={stateWithDayAt100}
          dispatch={dispatch}
          hydrated={true}
        />,
      );
    });

    // Fireworks active under motion ON
    expect(screen.queryByTestId("fireworks")).not.toBeNull();

    // DayCompleteCard NEVER mounts under motion ON
    expect(screen.queryByTestId("day-complete-card")).toBeNull();

    // Check at multiple time points within 2000ms
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.queryByTestId("day-complete-card")).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.queryByTestId("day-complete-card")).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.queryByTestId("day-complete-card")).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.queryByTestId("day-complete-card")).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(499);
    });
    expect(screen.queryByTestId("day-complete-card")).toBeNull();
  });
});

// ── C-m7d-010: 0→100 fires haptics.notification once; zero playChime; source inspection ──

describe("C-m7d-010: <BuildingClient> on <100→100 invokes haptics.notification once; zero playChime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("haptics.notification called once; playChime zero times on 0→100 transition", async () => {
    const { haptics } = await import("@/lib/haptics");
    const { playChime } = await import("@/lib/audio");

    const dispatch = vi.fn() as unknown as Dispatch<Action>;

    const { rerender } = render(
      <BuildingClient
        state={stateWithDayAt0}
        dispatch={dispatch}
        hydrated={true}
      />,
    );

    await act(async () => {
      rerender(
        <BuildingClient
          state={stateWithDayAt100}
          dispatch={dispatch}
          hydrated={true}
        />,
      );
    });

    expect(haptics.notification).toHaveBeenCalledTimes(1);
    expect(playChime).toHaveBeenCalledTimes(0);
    // haptics.success is for block-level; day-level uses notification
    expect(haptics.success).toHaveBeenCalledTimes(0);
  });

  it("BuildingClient source does NOT import playChime directly", () => {
    const src = readFileSync(join(__dirname, "./BuildingClient.tsx"), "utf-8");
    expect(/import.*playChime.*from.*audio/.test(src)).toBe(false);
  });

  it("BuildingClient source contains celebrate('day', { withAudio: false }) call site", () => {
    const src = readFileSync(join(__dirname, "./BuildingClient.tsx"), "utf-8");
    expect(src).toContain('celebrate("day", { withAudio: false })');
  });
});
