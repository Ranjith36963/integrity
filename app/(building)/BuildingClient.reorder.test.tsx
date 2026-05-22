// app/(building)/BuildingClient.reorder.test.tsx — M6: reorder dispatch + aria-live
// Covers C-m6-014: aria-live announce on commit + rejection; score recompute
// is byte-identical after brick reorder.
//
// Timeline is mocked to capture onReorderRequest / onAnnounce / onReorderBrickInBlock
// so we can invoke them programmatically without real drag events.

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { BuildingClient } from "./BuildingClient";
import { saveState } from "@/lib/persist";
import type { PersistedState } from "@/lib/persist";
import { usePersistedState } from "@/lib/usePersistedState";
import { today } from "@/lib/dharma";
import type { TimelineItem } from "@/components/Timeline";

// ─── capture callbacks from Timeline ─────────────────────────────────────────

type CapturedCallbacks = {
  onReorderRequest:
    | ((blockId: string, newStart: string, newEnd: string | null) => void)
    | null;
  onAnnounce: ((message: string) => void) | null;
  onReorderBrickInBlock:
    | ((blockId: string, fromIndex: number, toIndex: number) => void)
    | null;
};

const captured: CapturedCallbacks = {
  onReorderRequest: null,
  onAnnounce: null,
  onReorderBrickInBlock: null,
};

vi.mock("@/components/Timeline", () => ({
  Timeline: ({
    onReorderRequest,
    onAnnounce,
    onReorderBrickInBlock,
  }: {
    items: TimelineItem[];
    categories: unknown[];
    now: string;
    onSlotTap?: (hour: number) => void;
    onReorderRequest?: (
      blockId: string,
      newStart: string,
      newEnd: string | null,
    ) => void;
    onAnnounce?: (message: string) => void;
    onReorderBrickInBlock?: (
      blockId: string,
      fromIndex: number,
      toIndex: number,
    ) => void;
    [key: string]: unknown;
  }) => {
    // Capture the callbacks each render
    captured.onReorderRequest = onReorderRequest ?? null;
    captured.onAnnounce = onAnnounce ?? null;
    captured.onReorderBrickInBlock = onReorderBrickInBlock ?? null;
    return <div data-testid="mock-timeline" />;
  },
}));

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

// ─── Fixture ─────────────────────────────────────────────────────────────────
// blk-A: "Morning" at 08:00-09:00 with bricks [brk-1, brk-2, brk-3]
// blk-B: "Workout" at 10:00-11:00 (for overlap testing)

const BASE_FIXTURE: PersistedState = {
  schemaVersion: 3,
  programStart: "2026-05-01",
  currentDate: today(),
  history: {},
  deletions: {},
  blocks: [
    {
      id: "blk-A",
      name: "Morning",
      start: "08:00",
      end: "09:00",
      recurrence: { kind: "every-day" },
      categoryId: null,
      bricks: [
        {
          id: "brk-1",
          name: "Meditate",
          kind: "tick",
          done: false,
          hasDuration: false,
          categoryId: null,
          parentBlockId: "blk-A",
        },
        {
          id: "brk-2",
          name: "Stretch",
          kind: "tick",
          done: false,
          hasDuration: false,
          categoryId: null,
          parentBlockId: "blk-A",
        },
        {
          id: "brk-3",
          name: "Journal",
          kind: "tick",
          done: false,
          hasDuration: false,
          categoryId: null,
          parentBlockId: "blk-A",
        },
      ],
    },
    {
      id: "blk-B",
      name: "Workout",
      start: "10:00",
      end: "11:00",
      recurrence: { kind: "every-day" },
      categoryId: null,
      bricks: [],
    },
  ],
  looseBricks: [],
  categories: [],
};

/**
 * BuildingClientHarness — M9c pattern.
 */
function BuildingClientHarness() {
  const [state, dispatch] = usePersistedState();
  return <BuildingClient state={state} dispatch={dispatch} />;
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  captured.onReorderRequest = null;
  captured.onAnnounce = null;
  captured.onReorderBrickInBlock = null;
  saveState(BASE_FIXTURE);
});

// ─── C-m6-014: aria-live region + announcements ───────────────────────────────

describe("C-m6-014: BuildingClient aria-live region + reorder announcements", () => {
  it("renders a polite aria-live region in the BuildingClient shell", async () => {
    await act(async () => {
      render(<BuildingClientHarness />);
    });

    // The aria-live region must be present (role="status" or aria-live="polite")
    const liveRegion = document.querySelector("[aria-live='polite']");
    expect(liveRegion).not.toBeNull();
    expect(liveRegion?.getAttribute("aria-atomic")).toBe("true");
  });

  it("(a) valid block re-time: aria-live region shows 'Block Morning moved to 13:00'", async () => {
    await act(async () => {
      render(<BuildingClientHarness />);
    });

    // Simulate a valid REORDER_BLOCK: blk-A 08:00→13:00 (non-overlapping)
    await act(async () => {
      captured.onReorderRequest?.("blk-A", "13:00", "14:00");
    });

    // After the dispatch, the reducer writes the new start; block.start !== "08:00"
    // BuildingClient detects success (new start !== old start) and announces
    const liveRegion = document.querySelector("[aria-live='polite']");
    expect(liveRegion?.textContent).toBe("Block Morning moved to 13:00");
  });

  it("(b) overlap-rejected drop: aria-live region shows 'Cannot move Morning — overlaps Workout'", async () => {
    await act(async () => {
      render(<BuildingClientHarness />);
    });

    // Simulate a REORDER_BLOCK that overlaps blk-B at 10:00-11:00
    // onReorderRequest is called with 10:30 which overlaps blk-B → reducer rejects
    await act(async () => {
      captured.onReorderRequest?.("blk-A", "10:30", "11:30");
    });

    // Reducer returns state unchanged; BuildingClient detects block.start === "08:00" still
    // and calls onAnnounce with the rejection message
    const liveRegion = document.querySelector("[aria-live='polite']");
    expect(liveRegion?.textContent).toBe(
      "Cannot move Morning — overlaps Workout",
    );
  });

  it("(c) brick reorder: aria-live region shows 'Brick Meditate moved'", async () => {
    await act(async () => {
      render(<BuildingClientHarness />);
    });

    // Simulate REORDER_BRICK_IN_BLOCK: move brk-1 from index 0 to index 2
    await act(async () => {
      captured.onReorderBrickInBlock?.("blk-A", 0, 2);
    });

    const liveRegion = document.querySelector("[aria-live='polite']");
    expect(liveRegion?.textContent).toBe("Brick Meditate moved");
  });

  it("(c) score recompute is byte-identical after brick reorder (no flicker)", async () => {
    await act(async () => {
      render(<BuildingClientHarness />);
    });

    // Get initial day score from HeroRing aria-label before reorder
    const heroRingBefore = document.querySelector("[aria-label*='Day score']");
    const scoreBefore = heroRingBefore?.getAttribute("aria-label") ?? "";

    // Simulate REORDER_BRICK_IN_BLOCK: brk-1 from 0 → 2
    await act(async () => {
      captured.onReorderBrickInBlock?.("blk-A", 0, 2);
    });

    // Score should be byte-identical (brick scoring is order-independent)
    const heroRingAfter = document.querySelector("[aria-label*='Day score']");
    const scoreAfter = heroRingAfter?.getAttribute("aria-label") ?? "";
    expect(scoreAfter).toBe(scoreBefore);
  });
});
