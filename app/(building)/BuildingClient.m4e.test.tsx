// app/(building)/BuildingClient.m4e.test.tsx — M4e BuildingClient selector wiring tests
// Covers: C-m4e-027..029
//
// NOTE: vi.mock is hoisted — we can only have one mock factory for @/lib/data per file.
// Each test mutates `seedState` in beforeEach; the mock's `defaultState()` reads it.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { BuildingClient } from "./BuildingClient";
import type { AppState, Brick } from "@/lib/types";
import { HOUR_HEIGHT_PX, timeToOffsetPx } from "@/lib/timeOffset";

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

// Mutable seed — tests mutate this before render; `defaultState` factory reads it.
let seedState: AppState = {
  blocks: [],
  looseBricks: [],
  categories: [],
};

vi.mock("@/lib/data", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/data")>("@/lib/data");
  return {
    ...actual,
    defaultState: () => seedState,
  };
});

// ─── C-m4e-027: selectTrayBricks + selectTimelineItems wired in BuildingClient ──

describe("C-m4e-027: tray shows non-timed brick only; timeline shows block + TimedLooseBrickCard", () => {
  beforeEach(() => {
    // Seed: 1 block (bk1), 1 non-timed loose brick (r1), 1 timed loose brick (r2)
    seedState = {
      blocks: [
        {
          id: "bk1",
          name: "Morning run",
          start: "08:00",
          end: "09:00",
          recurrence: { kind: "just-today", date: "2026-05-14" },
          categoryId: null,
          bricks: [
            {
              id: "n1",
              name: "Stretch",
              kind: "tick",
              done: false,
              hasDuration: false,
              categoryId: null,
              parentBlockId: "bk1",
            },
          ],
        },
      ],
      looseBricks: [
        {
          id: "r1",
          name: "Hydrate",
          kind: "tick",
          done: false,
          hasDuration: false,
          categoryId: null,
          parentBlockId: null,
        },
        {
          id: "r2",
          name: "Pushups",
          kind: "tick",
          done: false,
          hasDuration: true,
          start: "10:00",
          end: "10:30",
          recurrence: { kind: "just-today", date: "2026-05-14" },
          categoryId: null,
          parentBlockId: null,
        },
      ],
      categories: [],
    };
    vi.clearAllMocks();
  });

  it("LooseBricksTray renders exactly 1 chip (r1); r2 NOT in tray", () => {
    const { container } = render(<BuildingClient />);
    const tray = container.querySelector(
      '[data-testid="loose-bricks-tray"]',
    ) as HTMLElement | null;
    expect(tray).not.toBeNull();
    // r1 chip present in tray
    expect(tray!.textContent).toContain("Hydrate");
    // r2 NOT in tray (it's timed, promoted to timeline)
    expect(tray!.textContent).not.toContain("Pushups");
  });

  it("Timeline renders TimedLooseBrickCard for r2 at 10:00 offset", () => {
    const { container } = render(<BuildingClient />);
    const timedCard = container.querySelector(
      '[data-testid="timed-loose-brick"]',
    ) as HTMLElement | null;
    expect(timedCard).not.toBeNull();
    const expectedTop = timeToOffsetPx("10:00", HOUR_HEIGHT_PX);
    expect(timedCard!.style.top).toBe(`${expectedTop}px`);
  });

  it("Timeline renders TimelineBlock for bk1", () => {
    const { container } = render(<BuildingClient />);
    const tlBlock = container.querySelector(
      '[data-component="timeline-block"]',
    );
    expect(tlBlock).not.toBeNull();
  });
});

// ─── C-m4e-028: tray hidden when only timed loose brick exists (no blocks) ───

describe("C-m4e-028: tray hidden when looseBricks all have hasDuration=true and no blocks", () => {
  beforeEach(() => {
    seedState = {
      blocks: [],
      looseBricks: [
        {
          id: "r1",
          name: "Yoga",
          kind: "tick",
          done: false,
          hasDuration: true,
          start: "10:00",
          end: "10:30",
          recurrence: { kind: "just-today", date: "2026-05-14" },
          categoryId: null,
          parentBlockId: null,
        },
      ],
      categories: [],
    };
    vi.clearAllMocks();
  });

  it("LooseBricksTray is NOT in the DOM", () => {
    const { container } = render(<BuildingClient />);
    const tray = container.querySelector('[data-testid="loose-bricks-tray"]');
    expect(tray).toBeNull();
  });

  it("Timeline renders TimedLooseBrickCard for the timed brick at 10:00 offset", () => {
    const { container } = render(<BuildingClient />);
    const timedCard = container.querySelector(
      '[data-testid="timed-loose-brick"]',
    ) as HTMLElement | null;
    expect(timedCard).not.toBeNull();
    const expectedTop = timeToOffsetPx("10:00", HOUR_HEIGHT_PX);
    expect(timedCard!.style.top).toBe(`${expectedTop}px`);
  });
});

// ─── C-m4e-029: withDurationDefaults migration in lazy useReducer initializer ─

describe("C-m4e-029: pre-M4e brick without hasDuration gets hasDuration:false via withDurationDefaults", () => {
  beforeEach(() => {
    seedState = {
      blocks: [],
      looseBricks: [
        // Cast through unknown to simulate pre-M4e brick without hasDuration field.
        // withDurationDefaults in the useReducer initializer fills hasDuration:false (C-m4e-029 / SG-m4e-06).
        {
          id: "legacy1",
          name: "Legacy Brick",
          kind: "tick",
          done: false,
          categoryId: null,
          parentBlockId: null,
        } as unknown as Brick,
      ],
      categories: [],
    };
    vi.clearAllMocks();
  });

  it("legacy brick renders in tray as non-timed chip (hasDuration:false after migration)", () => {
    const { container } = render(<BuildingClient />);
    const tray = container.querySelector(
      '[data-testid="loose-bricks-tray"]',
    ) as HTMLElement | null;
    // Tray should be visible (brick is non-timed after migration)
    expect(tray).not.toBeNull();
    expect(tray!.textContent).toContain("Legacy Brick");
  });

  it("no brick-time-window badge on the migrated chip (hasDuration:false)", () => {
    const { container } = render(<BuildingClient />);
    const timeWindow = container.querySelector(
      '[data-testid="brick-time-window"]',
    );
    expect(timeWindow).toBeNull();
  });
});
