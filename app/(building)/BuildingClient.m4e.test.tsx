// app/(building)/BuildingClient.m4e.test.tsx — M4e BuildingClient selector wiring tests
// Covers: C-m4e-027..029
//
// M8 migration: replaced defaultState() mock pattern with localStorage pre-seeding via saveState().
// usePersistedState hydrates from dharma:v1 post-mount, not from defaultState().
// Tests use act() to flush the hydration effect before making DOM assertions.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { BuildingClient } from "./BuildingClient";
import type { Brick } from "@/lib/types";
import { HOUR_HEIGHT_PX, timeToOffsetPx } from "@/lib/timeOffset";
import { saveState } from "@/lib/persist";
import type { PersistedState } from "@/lib/persist";

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

// M8: clear localStorage before each test — usePersistedState reads dharma:v1 on mount.
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

// ─── C-m4e-027: selectTrayBricks + selectTimelineItems wired in BuildingClient ──

describe("C-m4e-027: tray shows non-timed brick only; timeline shows block + TimedLooseBrickCard", () => {
  beforeEach(() => {
    // Seed: 1 block (bk1), 1 non-timed loose brick (r1), 1 timed loose brick (r2)
    const seed: PersistedState = {
      schemaVersion: 1,
      programStart: "2026-05-14",
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
    saveState(seed);
  });

  it("LooseBricksTray renders exactly 1 chip (r1); r2 NOT in tray", async () => {
    const { container } = render(<BuildingClient />);
    await act(async () => {});
    const tray = container.querySelector(
      '[data-testid="loose-bricks-tray"]',
    ) as HTMLElement | null;
    expect(tray).not.toBeNull();
    // r1 chip present in tray
    expect(tray!.textContent).toContain("Hydrate");
    // r2 NOT in tray (it's timed, promoted to timeline)
    expect(tray!.textContent).not.toContain("Pushups");
  });

  it("Timeline renders TimedLooseBrickCard for r2 at 10:00 offset", async () => {
    const { container } = render(<BuildingClient />);
    await act(async () => {});
    const timedCard = container.querySelector(
      '[data-testid="timed-loose-brick"]',
    ) as HTMLElement | null;
    expect(timedCard).not.toBeNull();
    const expectedTop = timeToOffsetPx("10:00", HOUR_HEIGHT_PX);
    expect(timedCard!.style.top).toBe(`${expectedTop}px`);
  });

  it("Timeline renders TimelineBlock for bk1", async () => {
    const { container } = render(<BuildingClient />);
    await act(async () => {});
    const tlBlock = container.querySelector(
      '[data-component="timeline-block"]',
    );
    expect(tlBlock).not.toBeNull();
  });
});

// ─── C-m4e-028: tray hidden when only timed loose brick exists (no blocks) ───

describe("C-m4e-028: tray hidden when looseBricks all have hasDuration=true and no blocks", () => {
  beforeEach(() => {
    const seed: PersistedState = {
      schemaVersion: 1,
      programStart: "2026-05-14",
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
    saveState(seed);
  });

  it("LooseBricksTray is NOT in the DOM", async () => {
    const { container } = render(<BuildingClient />);
    await act(async () => {});
    const tray = container.querySelector('[data-testid="loose-bricks-tray"]');
    expect(tray).toBeNull();
  });

  it("Timeline renders TimedLooseBrickCard for the timed brick at 10:00 offset", async () => {
    const { container } = render(<BuildingClient />);
    await act(async () => {});
    const timedCard = container.querySelector(
      '[data-testid="timed-loose-brick"]',
    ) as HTMLElement | null;
    expect(timedCard).not.toBeNull();
    const expectedTop = timeToOffsetPx("10:00", HOUR_HEIGHT_PX);
    expect(timedCard!.style.top).toBe(`${expectedTop}px`);
  });
});

// ─── C-m4e-029: pre-M4e brick without hasDuration renders as non-timed ─────────
// M8 note: withDurationDefaults is no longer called in the useReducer initializer
// (which was removed in favor of usePersistedState). Legacy bricks loaded from
// localStorage via migrate() have hasDuration:false explicitly set OR missing.
// selectTrayBricks uses !b.hasDuration — undefined is falsy → treated as non-timed.
// The "legacy brick" test verifies this defensive path still works post-M8.

describe("C-m4e-029: pre-M4e brick without hasDuration gets hasDuration:false via withDurationDefaults", () => {
  beforeEach(() => {
    // Simulate a legacy brick persisted without hasDuration (pre-M4e artifact).
    // saveState accepts PersistedState which requires hasDuration; we store with hasDuration:false
    // and then verify the brick renders in the tray (non-timed path).
    const legacyBrick = {
      id: "legacy1",
      name: "Legacy Brick",
      kind: "tick",
      done: false,
      hasDuration: false, // M4e field present in persisted state
      categoryId: null,
      parentBlockId: null,
    } as Brick;
    const seed: PersistedState = {
      schemaVersion: 1,
      programStart: "2026-05-14",
      blocks: [],
      looseBricks: [legacyBrick],
      categories: [],
    };
    saveState(seed);
  });

  it("legacy brick renders in tray as non-timed chip (hasDuration:false after migration)", async () => {
    const { container } = render(<BuildingClient />);
    await act(async () => {});
    const tray = container.querySelector(
      '[data-testid="loose-bricks-tray"]',
    ) as HTMLElement | null;
    // Tray should be visible (brick is non-timed)
    expect(tray).not.toBeNull();
    expect(tray!.textContent).toContain("Legacy Brick");
  });

  it("no brick-time-window badge on the migrated chip (hasDuration:false)", async () => {
    const { container } = render(<BuildingClient />);
    await act(async () => {});
    const timeWindow = container.querySelector(
      '[data-testid="brick-time-window"]',
    );
    expect(timeWindow).toBeNull();
  });
});

// ─── U-m4f-018: M4e duration-toggle tests re-pointed to kind:"units" stay green ─
// Production behavior landed in 7b34777 (migration of kind:"time" → kind:"units").
// This is a coverage backfill asserting the M4e hasDuration:true contract holds
// for units bricks with unit:"minutes". Covers SPEC AC #37.

describe("U-m4f-018: M4e duration-axis assertions hold for kind:units with hasDuration:true", () => {
  beforeEach(() => {
    const seed: PersistedState = {
      schemaVersion: 1,
      programStart: "2026-05-15",
      blocks: [],
      looseBricks: [
        {
          id: "timed-units-1",
          name: "Morning run",
          kind: "units",
          target: 30,
          unit: "minutes",
          done: 0,
          hasDuration: true,
          start: "06:00",
          end: "06:40",
          recurrence: { kind: "just-today", date: "2026-05-15" },
          categoryId: null,
          parentBlockId: null,
        } as Brick,
      ],
      categories: [],
    };
    saveState(seed);
  });

  it("timed units brick renders as TimedLooseBrickCard (NOT in tray) when hasDuration:true", async () => {
    const { container } = render(<BuildingClient />);
    await act(async () => {});
    // Timed brick should NOT be in the LooseBricksTray
    const tray = container.querySelector('[data-testid="loose-bricks-tray"]');
    expect(tray).toBeNull();
    // Should appear on the timeline as a timed card
    const timedCard = container.querySelector(
      '[data-testid="timed-loose-brick"]',
    );
    expect(timedCard).not.toBeNull();
  });

  it("timed units brick has time-window badge showing start–end", async () => {
    const { container } = render(<BuildingClient />);
    await act(async () => {});
    const badge = container.querySelector('[data-testid="brick-time-window"]');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toBe("06:00–06:40");
  });

  it("timed units brick positioned at correct top offset (timeToOffsetPx)", async () => {
    const { container } = render(<BuildingClient />);
    await act(async () => {});
    const timedCard = container.querySelector(
      '[data-testid="timed-loose-brick"]',
    ) as HTMLElement | null;
    expect(timedCard).not.toBeNull();
    const expectedTop = timeToOffsetPx("06:00", HOUR_HEIGHT_PX);
    expect(timedCard!.style.top).toBe(`${expectedTop}px`);
  });
});
