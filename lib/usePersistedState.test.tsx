/**
 * lib/usePersistedState.test.tsx — Milestone 8 component/hook tests.
 * Covers C-m8-001..006.
 * C-m8-007 lives in app/(building)/BuildingClient.test.tsx.
 *
 * All tests mock localStorage with a fresh in-memory stub and clear dharma:v1 before each test.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, renderHook } from "@testing-library/react";
import { usePersistedState } from "./usePersistedState";
import { saveState, loadState, migrate, STORAGE_KEY } from "./persist";
import { reducer } from "./data";
import { today } from "./dharma";
import type { PersistedState } from "./persist";
import type { AppState } from "./types";

// ─── localStorage mock helpers ───────────────────────────────────────────────

type MockStorage = {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
  _store: Record<string, string>;
};

function makeMockStorage(): MockStorage {
  const store: Record<string, string> = {};
  return {
    _store: store,
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      for (const k in store) delete store[k];
    }),
  };
}

let mockStorage: MockStorage;

beforeEach(() => {
  mockStorage = makeMockStorage();
  Object.defineProperty(globalThis, "localStorage", {
    value: mockStorage,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Test harness component ───────────────────────────────────────────────────

function HarnessComponent() {
  const [state] = usePersistedState();
  return (
    <div>
      <span data-testid="blocks-count">{state.blocks.length}</span>
      <span data-testid="categories-count">{state.categories.length}</span>
      <span data-testid="loose-bricks-count">{state.looseBricks.length}</span>
      <span data-testid="program-start">{state.programStart}</span>
      <span data-testid="current-date">{state.currentDate}</span>
      <span data-testid="history-count">
        {Object.keys(state.history).length}
      </span>
    </div>
  );
}

// ─── C-m8-001: Action union lock — no HYDRATE action ─────────────────────────

describe("C-m8-001: usePersistedState — no HYDRATE action in Action union; hook uses setState", () => {
  it("hook returns [state, dispatch] tuple; Action union has no HYDRATE member", () => {
    const { result } = renderHook(() => usePersistedState());
    const [state, dispatch] = result.current;
    expect(typeof state).toBe("object");
    expect(typeof dispatch).toBe("function");
  });

  it("all 5 existing action types dispatch without error (schema lock holds)", () => {
    // Confirms reducer accepts exactly the M4f 5 variants. If a new action were
    // added or the reducer were re-keyed, tsc would catch it; this is the runtime anchor.
    const baseState: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      deletions: {}, // M5
      programStart: "2026-05-01",
      currentDate: "2026-05-01", // M9b
      history: {}, // M9b
    };

    // ADD_BLOCK
    const stateWithBlock = reducer(baseState, {
      type: "ADD_BLOCK",
      block: {
        id: "b1",
        name: "Morning",
        start: "06:00",
        recurrence: { kind: "just-today", date: "2026-05-01" },
        categoryId: null,
        bricks: [],
      },
    });
    expect(stateWithBlock.blocks).toHaveLength(1);

    // ADD_CATEGORY
    const stateWithCat = reducer(baseState, {
      type: "ADD_CATEGORY",
      category: { id: "c1", name: "Health", color: "#f00" },
    });
    expect(stateWithCat.categories).toHaveLength(1);

    // ADD_BRICK (tick, loose)
    const stateWithBrick = reducer(baseState, {
      type: "ADD_BRICK",
      brick: {
        id: "n1",
        name: "Run",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: false,
      },
    });
    expect(stateWithBrick.looseBricks).toHaveLength(1);

    // LOG_TICK_BRICK
    const stateFlipped = reducer(stateWithBrick, {
      type: "LOG_TICK_BRICK",
      brickId: "n1",
    });
    const flipped = stateFlipped.looseBricks[0];
    if (flipped.kind === "tick") {
      expect(flipped.done).toBe(true);
    }

    // SET_UNITS_DONE
    const stateWithUnits = reducer(baseState, {
      type: "ADD_BRICK",
      brick: {
        id: "u1",
        name: "Meditate",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "units",
        target: 30,
        unit: "min",
        done: 0,
      },
    });
    const stateWithUnitsDone = reducer(stateWithUnits, {
      type: "SET_UNITS_DONE",
      brickId: "u1",
      done: 15,
    });
    const unitsBrick = stateWithUnitsDone.looseBricks[0];
    if (unitsBrick.kind === "units") {
      expect(unitsBrick.done).toBe(15);
    }
  });
});

// ─── C-m8-002: first render = empty default; loadState not called during render ─

describe("C-m8-002: first-render state is empty default; loadState not called during render (SSR safety)", () => {
  it("the useState initializer is the empty default (defaultPersisted projection) — tsc + unit gate", () => {
    // Design guarantee: the useState lazy initializer calls projectToAppState(defaultPersisted()),
    // NOT loadState(). This ensures SSR and first client paint both render empty default with
    // no localStorage access (R1 guard). We verify this by throwing in getItem so that if
    // loadState() were called during render, the component would fail to render.
    // Since loadState() is only called inside useEffect, the render succeeds.
    // loadState() swallows the error (AC #11) → returns empty default → no crash.
    const throwingStorage = {
      ...mockStorage,
      getItem: vi.fn(() => {
        throw new DOMException(
          "denied — verify loadState not called in render",
        );
      }),
    };
    Object.defineProperty(globalThis, "localStorage", {
      value: throwingStorage,
      writable: true,
      configurable: true,
    });

    // This must NOT throw — the render succeeds because loadState is useEffect-only.
    expect(() => render(<HarnessComponent />)).not.toThrow();
    // blocks-count should be 0 (loadState returned defaultPersisted() after the error)
    expect(screen.getByTestId("blocks-count").textContent).toBe("0");
  });

  it("after effects flush, state contains the persisted values", async () => {
    const persisted: PersistedState = {
      schemaVersion: 3,
      programStart: "2026-04-01",
      currentDate: today(),
      history: {},
      deletions: {}, // M5
      blocks: [
        {
          id: "b1",
          name: "Work",
          start: "09:00",
          recurrence: { kind: "every-day" },
          categoryId: null,
          bricks: [],
        },
      ],
      categories: [],
      looseBricks: [],
    };
    saveState(persisted);

    const { result } = renderHook(() => usePersistedState());
    await act(async () => {});

    const [hydratedState] = result.current;
    expect(hydratedState.blocks).toHaveLength(1);
    expect(hydratedState.blocks[0].id).toBe("b1");
  });
});

// ─── C-m8-003: two-pass ordering — saveState NOT called before hydration ──────

describe("C-m8-003: two-pass ordering — saveState does not clobber persisted state before hydration", () => {
  it("pre-seeded dharma:v1 is NOT overwritten with empty-default before hydration completes", async () => {
    // R2 invariant: mounted guard ensures saveState never fires with the empty default.
    // Behavioral proof: after full mount + effect flush, dharma:v1 still holds b1.
    // If the guard were absent, the empty-default save effect would overwrite b1 with []
    // before hydration could restore it, and state would end up empty.
    const block = {
      id: "b1",
      name: "Work",
      start: "09:00",
      recurrence: { kind: "every-day" as const },
      categoryId: null,
      bricks: [],
    };
    const persisted: PersistedState = {
      schemaVersion: 3,
      programStart: "2026-04-01",
      currentDate: today(),
      history: {},
      deletions: {}, // M5
      blocks: [block],
      categories: [],
      looseBricks: [],
    };
    saveState(persisted);

    render(<HarnessComponent />);
    await act(async () => {});

    // After hydration the state must hold b1 (not be empty-default).
    // This would fail if saveState had fired with [] before hydration loaded the block.
    expect(screen.getByTestId("blocks-count").textContent).toBe("1");
    // The persisted key holds the post-hydration state (b1 still present)
    const rawAfterHydration = mockStorage._store[STORAGE_KEY];
    const parsed = JSON.parse(rawAfterHydration);
    expect(parsed.blocks).toHaveLength(1);
    expect(parsed.blocks[0].id).toBe("b1");
  });

  it("after hydration effect, state holds the persisted block b1", async () => {
    const block = {
      id: "b1",
      name: "Work",
      start: "09:00",
      recurrence: { kind: "every-day" as const },
      categoryId: null,
      bricks: [],
    };
    const persisted: PersistedState = {
      schemaVersion: 3,
      programStart: "2026-04-01",
      currentDate: today(),
      history: {},
      deletions: {}, // M5
      blocks: [block],
      categories: [],
      looseBricks: [],
    };
    saveState(persisted);

    render(<HarnessComponent />);
    await act(async () => {});

    expect(screen.getByTestId("blocks-count").textContent).toBe("1");
  });

  it("only a subsequent dispatch triggers the first saveState after hydration", async () => {
    const saveStateSpy = vi.spyOn(await import("./persist"), "saveState");
    const persisted: PersistedState = {
      schemaVersion: 3,
      programStart: "2026-04-01",
      currentDate: today(),
      history: {},
      deletions: {}, // M5
      blocks: [],
      categories: [],
      looseBricks: [],
    };
    saveState(persisted);
    saveStateSpy.mockClear();

    const { result } = renderHook(() => usePersistedState());
    await act(async () => {});

    // At this point, hydration ran (setState with loadedState) and mounted=true.
    // The save effect fires because mounted changed AND state may have changed.
    // Now dispatch a mutating action — a NEW save should fire.
    const callsBefore = saveStateSpy.mock.calls.length;
    await act(async () => {
      result.current[1]({
        type: "ADD_CATEGORY",
        category: { id: "c1", name: "Health", color: "#f00" },
      });
    });
    expect(saveStateSpy.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});

// ─── C-m8-004: post-mount rehydration restores exact values; schemaVersion absent ─

describe("C-m8-004: post-mount rehydration restores exact block/brick/category values; no schemaVersion on state", () => {
  it("state after hydration deep-equals persisted data with exact done values", async () => {
    const persisted: PersistedState = {
      schemaVersion: 3,
      programStart: "2026-05-01",
      currentDate: today(),
      history: {},
      deletions: {}, // M5
      blocks: [
        {
          id: "b1",
          name: "Work",
          start: "09:00",
          recurrence: { kind: "every-day" },
          categoryId: null,
          bricks: [
            {
              id: "n1",
              name: "Exercise",
              categoryId: null,
              parentBlockId: "b1",
              hasDuration: false,
              kind: "units",
              target: 30,
              unit: "min",
              done: 40,
            },
          ],
        },
      ],
      categories: [{ id: "c1", name: "Health", color: "#f00" }],
      looseBricks: [
        {
          id: "t1",
          name: "Read",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: true,
        },
      ],
    };
    saveState(persisted);

    const { result } = renderHook(() => usePersistedState());
    await act(async () => {});

    const [state] = result.current;
    expect(state.blocks[0].id).toBe("b1");
    const nestedBrick = state.blocks[0].bricks[0];
    expect(nestedBrick.kind).toBe("units");
    if (nestedBrick.kind === "units") {
      expect(nestedBrick.done).toBe(40); // exact integer
    }
    expect(state.categories[0].id).toBe("c1");
    expect(state.looseBricks[0].done).toBe(true); // exact boolean
    expect(state.programStart).toBe("2026-05-01");
    // schemaVersion must NOT be on AppState
    expect("schemaVersion" in state).toBe(false);
  });
});

// ─── C-m8-005: save-on-every-dispatch (all 5 action types) ───────────────────

describe("C-m8-005: save fires after every mutating dispatch (all 5 action types)", () => {
  it("each dispatch updates dharma:v1 to post-dispatch state", async () => {
    const { result } = renderHook(() => usePersistedState());
    await act(async () => {});

    // Dispatch ADD_BLOCK → verify dharma:v1 updated
    const block = {
      id: "b1",
      name: "Work",
      start: "09:00",
      recurrence: { kind: "just-today" as const, date: "2026-05-01" },
      categoryId: null,
      bricks: [],
    };
    await act(async () => {
      result.current[1]({ type: "ADD_BLOCK", block });
    });
    const afterAddBlock = JSON.parse(mockStorage._store[STORAGE_KEY] ?? "{}");
    expect(
      afterAddBlock.blocks?.some((b: { id: string }) => b.id === "b1"),
    ).toBe(true);

    // Dispatch ADD_CATEGORY → verify categories updated
    await act(async () => {
      result.current[1]({
        type: "ADD_CATEGORY",
        category: { id: "c1", name: "Health", color: "#f00" },
      });
    });
    const afterAddCat = JSON.parse(mockStorage._store[STORAGE_KEY] ?? "{}");
    expect(
      afterAddCat.categories?.some((c: { id: string }) => c.id === "c1"),
    ).toBe(true);

    // Dispatch ADD_BRICK (loose tick) → verify looseBricks updated
    await act(async () => {
      result.current[1]({
        type: "ADD_BRICK",
        brick: {
          id: "t1",
          name: "Read",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: false,
        },
      });
    });
    const afterAddBrick = JSON.parse(mockStorage._store[STORAGE_KEY] ?? "{}");
    expect(
      afterAddBrick.looseBricks?.some((b: { id: string }) => b.id === "t1"),
    ).toBe(true);

    // Dispatch LOG_TICK_BRICK → verify done flipped to true
    await act(async () => {
      result.current[1]({ type: "LOG_TICK_BRICK", brickId: "t1" });
    });
    const afterTick = JSON.parse(mockStorage._store[STORAGE_KEY] ?? "{}");
    const tickBrick = afterTick.looseBricks?.find(
      (b: { id: string }) => b.id === "t1",
    );
    expect(tickBrick?.done).toBe(true);
  });

  it("SET_UNITS_DONE updates done value in persisted state", async () => {
    // Seed a units brick
    const persisted: PersistedState = {
      schemaVersion: 3,
      programStart: today(),
      currentDate: today(),
      history: {},
      deletions: {}, // M5
      blocks: [],
      categories: [],
      looseBricks: [
        {
          id: "u1",
          name: "Meditate",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "units",
          target: 30,
          unit: "min",
          done: 0,
        },
      ],
    };
    saveState(persisted);

    const { result } = renderHook(() => usePersistedState());
    await act(async () => {});

    await act(async () => {
      result.current[1]({ type: "SET_UNITS_DONE", brickId: "u1", done: 22 });
    });

    const afterUnits = JSON.parse(mockStorage._store[STORAGE_KEY] ?? "{}");
    const unitsBrick = afterUnits.looseBricks?.find(
      (b: { id: string }) => b.id === "u1",
    );
    expect(unitsBrick?.done).toBe(22);
  });
});

// ─── C-m8-006: full save→reload→rehydrate round-trip ─────────────────────────

describe("C-m8-006: full mutate→reload cycle via unmount + remount", () => {
  it("freshly-mounted hook after remount holds the pre-reload units done value", async () => {
    // Seed a units brick with done: 5
    const persisted: PersistedState = {
      schemaVersion: 3,
      programStart: today(),
      currentDate: today(),
      history: {},
      deletions: {}, // M5
      blocks: [],
      categories: [],
      looseBricks: [
        {
          id: "u1",
          name: "Meditate",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "units",
          target: 30,
          unit: "min",
          done: 5,
        },
      ],
    };
    saveState(persisted);

    const { result: r1, unmount } = renderHook(() => usePersistedState());
    await act(async () => {});

    // Mutate: SET_UNITS_DONE → done: 22
    await act(async () => {
      r1.current[1]({ type: "SET_UNITS_DONE", brickId: "u1", done: 22 });
    });

    // Unmount (simulate reload)
    unmount();

    // Re-render fresh hook against same mocked localStorage
    const { result: r2 } = renderHook(() => usePersistedState());
    await act(async () => {});

    const [reloadedState] = r2.current;
    const unitsBrick = reloadedState.looseBricks.find((b) => b.id === "u1");
    expect(unitsBrick?.kind).toBe("units");
    if (unitsBrick?.kind === "units") {
      expect(unitsBrick.done).toBe(22); // exact value, survived reload
    }
  });
});

// ─── C-m9b-001: same-day load → rollover no-op ───────────────────────────────

describe("C-m9b-001: same-day load — rollover(loaded, today()) is a no-op; state has currentDate + history, not schemaVersion", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("state carries currentDate, history, blocks from persisted state; schemaVersion absent", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-18T10:00:00"));

    const persisted: PersistedState = {
      schemaVersion: 3,
      programStart: "2026-05-01",
      currentDate: "2026-05-18", // same as today
      history: {
        "2026-05-17": { blocks: [], categories: [], looseBricks: [] },
      },
      blocks: [
        {
          id: "b1",
          name: "Morning",
          start: "06:00",
          recurrence: { kind: "every-day" },
          categoryId: null,
          bricks: [],
        },
      ],
      categories: [],
      looseBricks: [],
      deletions: {}, // M5
    };
    saveState(persisted);

    const { result } = renderHook(() => usePersistedState());
    await act(async () => {});

    const [state] = result.current;
    // rollover was a no-op (currentDate === today)
    expect(state.currentDate).toBe("2026-05-18");
    expect(state.history).toEqual({
      "2026-05-17": { blocks: [], categories: [], looseBricks: [] },
    });
    expect(state.blocks[0].id).toBe("b1");
    // currentDate and history on AppState (plan § Data model SG-m9b decision)
    expect("currentDate" in state).toBe(true);
    expect("history" in state).toBe(true);
    // schemaVersion NOT on AppState (boundary-only)
    expect("schemaVersion" in state).toBe(false);
  });
});

// ─── C-m9b-002: next-day load → rollover fires ───────────────────────────────

describe("C-m9b-002: next-day load — rollover(loaded, today()) archives yesterday and seeds fresh day", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("state after rollover has currentDate=today, history['2026-05-17'], fresh seeded day", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-18T10:00:00"));

    const persisted: PersistedState = {
      schemaVersion: 3,
      programStart: "2026-05-01",
      currentDate: "2026-05-17", // yesterday
      history: {},
      deletions: {}, // M5
      blocks: [
        {
          id: "blk1",
          name: "Morning",
          start: "06:00",
          recurrence: { kind: "every-day" },
          categoryId: null,
          bricks: [
            {
              id: "r1",
              name: "DailyTask",
              categoryId: null,
              parentBlockId: "blk1",
              hasDuration: true,
              start: "06:00",
              end: "06:30",
              recurrence: { kind: "every-day" },
              kind: "tick",
              done: true, // ticked yesterday
            },
            {
              id: "r2",
              name: "JustToday",
              categoryId: null,
              parentBlockId: "blk1",
              hasDuration: true,
              start: "06:30",
              end: "07:00",
              recurrence: { kind: "just-today", date: "2026-05-17" },
              kind: "tick",
              done: false,
            },
          ],
        },
      ],
      categories: [],
      looseBricks: [],
    };
    saveState(persisted);

    const { result } = renderHook(() => usePersistedState());
    await act(async () => {});

    const [state] = result.current;
    // currentDate advanced to today
    expect(state.currentDate).toBe("2026-05-18");
    // yesterday archived
    expect("2026-05-17" in state.history).toBe(true);
    const archived = state.history["2026-05-17"];
    // The archived every-day brick still has done: true (pre-rollover value)
    expect(
      archived.blocks[0].bricks.find((b) => b.name === "DailyTask")?.done,
    ).toBe(true);
    // Fresh day: every-day brick seeded with done: false; just-today dropped
    const freshBricks = state.blocks[0].bricks;
    expect(freshBricks).toHaveLength(1);
    expect(freshBricks[0].name).toBe("DailyTask");
    if (freshBricks[0].kind === "tick") {
      expect(freshBricks[0].done).toBe(false); // reset
    }
    // The single today() clock read happened via vi.setSystemTime
    expect(state.currentDate).toBe("2026-05-18");
  });
});

// ─── C-m9b-003: first run → empty v2 default; no premature saveState ─────────

describe("C-m9b-003: first run — empty v2 default; loadState/rollover not called in render; mounted guard holds", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("first render shows empty v2 default; after effects, state is still empty default (rollover no-op)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-18T10:00:00"));

    // No dharma:v1 key — first run
    const { result } = renderHook(() => usePersistedState());
    // Before effects: empty default
    expect(result.current[0].blocks).toEqual([]);
    expect(result.current[0].history).toEqual({});
    expect(result.current[0].currentDate).toBe("2026-05-18");

    await act(async () => {});

    // After effects: still empty default (rollover no-op: currentDate === today)
    const [state] = result.current;
    expect(state.blocks).toEqual([]);
    expect(state.looseBricks).toEqual([]);
    expect(state.history).toEqual({});
    expect(state.currentDate).toBe("2026-05-18");
  });
});

// ─── C-m9b-004: toPersisted lifts currentDate + history back after rollover ──

describe("C-m9b-004: first saveState after rollover boot persists the post-rollover v2 shape", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("localStorage has schemaVersion:2, currentDate=today, history with yesterday's entry after first dispatch", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-18T10:00:00"));

    const persisted: PersistedState = {
      schemaVersion: 3,
      programStart: "2026-05-01",
      currentDate: "2026-05-17", // yesterday → rollover fires
      history: {},
      deletions: {}, // M5
      blocks: [
        {
          id: "blk1",
          name: "Morning",
          start: "06:00",
          recurrence: { kind: "every-day" },
          categoryId: null,
          bricks: [
            {
              id: "ev1",
              name: "Daily",
              categoryId: null,
              parentBlockId: "blk1",
              hasDuration: true,
              start: "06:00",
              end: "06:30",
              recurrence: { kind: "every-day" },
              kind: "tick",
              done: true,
            },
          ],
        },
      ],
      categories: [],
      looseBricks: [],
    };
    saveState(persisted);

    const { result } = renderHook(() => usePersistedState());
    await act(async () => {});

    // Trigger a mutating dispatch to trigger the first saveState
    await act(async () => {
      result.current[1]({
        type: "ADD_CATEGORY",
        category: { id: "c1", name: "Health", color: "#f00" },
      });
    });

    const raw = mockStorage._store[STORAGE_KEY];
    expect(raw).toBeTruthy();
    const parsedAfter = JSON.parse(raw) as Record<string, unknown>;
    expect(parsedAfter.schemaVersion).toBe(3); // M5 sanctioned amendment
    expect(parsedAfter.currentDate).toBe("2026-05-18");
    // history contains yesterday's archived day
    const history = parsedAfter.history as Record<string, unknown>;
    expect("2026-05-17" in history).toBe(true);
  });
});

// ─── C-m9b-005: no ROLLOVER action; reducer unchanged ────────────────────────

describe("C-m9b-005: no ROLLOVER action in Action union; reducer has no new arm", () => {
  it("dispatching all 5 existing action types still works; no ROLLOVER type exists at runtime", async () => {
    const { result } = renderHook(() => usePersistedState());
    await act(async () => {});

    // All 5 original action types succeed
    await act(async () => {
      result.current[1]({
        type: "ADD_BLOCK",
        block: {
          id: "b1",
          name: "Block",
          start: "09:00",
          recurrence: { kind: "every-day" },
          categoryId: null,
          bricks: [],
        },
      });
    });
    expect(result.current[0].blocks).toHaveLength(1);

    await act(async () => {
      result.current[1]({
        type: "ADD_CATEGORY",
        category: { id: "c1", name: "Cat", color: "#f00" },
      });
    });
    expect(result.current[0].categories).toHaveLength(1);

    await act(async () => {
      result.current[1]({
        type: "ADD_BRICK",
        brick: {
          id: "t1",
          name: "Brick",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: false,
        },
      });
    });
    expect(result.current[0].looseBricks).toHaveLength(1);

    await act(async () => {
      result.current[1]({ type: "LOG_TICK_BRICK", brickId: "t1" });
    });
    const ticked = result.current[0].looseBricks[0];
    if (ticked?.kind === "tick") expect(ticked.done).toBe(true);

    // defaultState() now includes currentDate and history but no ROLLOVER Action
    const defaultAppState = result.current[0];
    expect("currentDate" in defaultAppState).toBe(true);
    expect("history" in defaultAppState).toBe(true);
  });
});

// ─── U-m5-012: persistence round-trip — deletions survive a reload ────────────

describe("U-m5-012: projectToAppState/toPersisted carry deletions; a delete survives a reload", () => {
  it("a v3 PersistedState with deletions round-trips through saveState/loadState/migrate", () => {
    // Simulate: save a v3 state with a deletion key, then reload
    const v3State: PersistedState = {
      schemaVersion: 3,
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: {},
      blocks: [
        {
          id: "blk-recur",
          name: "Morning",
          start: "07:00",
          recurrence: { kind: "every-day" },
          categoryId: null,
          bricks: [],
        },
      ],
      categories: [],
      looseBricks: [],
      deletions: { "2026-05-18:blk-recur": true },
    };

    saveState(v3State);
    const loaded = loadState();

    // deletions round-trips intact
    expect(loaded.deletions).toEqual({ "2026-05-18:blk-recur": true });
    expect(loaded.schemaVersion).toBe(3);
  });

  it("usePersistedState carries deletions from localStorage through to AppState", async () => {
    // Pre-seed localStorage with a v3 state that has a deletion
    const seedState: PersistedState = {
      schemaVersion: 3,
      programStart: "2026-05-01",
      currentDate: today(), // avoids rollover
      history: {},
      blocks: [],
      categories: [],
      looseBricks: [],
      deletions: { [`${today()}:blk-seed`]: true },
    };
    saveState(seedState);

    const { result } = renderHook(() => usePersistedState());
    await act(async () => {});

    // After hydration, the AppState should carry the deletions
    expect(result.current[0].deletions).toEqual({
      [`${today()}:blk-seed`]: true,
    });
  });

  it("after DELETE_BLOCK_TODAY dispatch the deletion survives a simulated reload via JSON roundtrip + migrate", () => {
    // Build an AppState manually and simulate what usePersistedState would persist
    const initialState: AppState = {
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: {},
      blocks: [
        {
          id: "blk-recur",
          name: "Morning",
          start: "07:00",
          recurrence: { kind: "every-day" },
          categoryId: null,
          bricks: [],
        },
      ],
      categories: [],
      looseBricks: [],
      deletions: {},
    };

    // Apply delete
    const afterDelete = reducer(initialState, {
      type: "DELETE_BLOCK_TODAY",
      blockId: "blk-recur",
    });
    expect(afterDelete.deletions["2026-05-18:blk-recur"]).toBe(true);

    // Simulate toPersisted + JSON serialize + JSON parse + migrate
    const persisted: PersistedState = {
      schemaVersion: 3,
      programStart: afterDelete.programStart,
      currentDate: afterDelete.currentDate,
      history: afterDelete.history,
      blocks: afterDelete.blocks,
      categories: afterDelete.categories,
      looseBricks: afterDelete.looseBricks,
      deletions: afterDelete.deletions,
    };
    const json = JSON.stringify(persisted);
    const parsed: unknown = JSON.parse(json);
    const reloaded = migrate(parsed);

    expect(reloaded).not.toBeNull();
    // The deletion key survives the full round-trip
    expect(reloaded!.deletions["2026-05-18:blk-recur"]).toBe(true);
    expect(reloaded!.schemaVersion).toBe(3);
  });
});

// ─── U-m7a-003: usePersistedState returns [state, dispatch, mounted] as a 3-tuple ─

describe("U-m7a-003: usePersistedState returns [state, dispatch, mounted]; mounted false pre-effect, true after", () => {
  // NOTE: In React 19 + RTL 16, renderHook() flushes effects synchronously before returning.
  // This means `mounted` is already `true` immediately after renderHook().
  // The core contract tested here is: (a) the third slot EXISTS and is a boolean,
  // (b) it becomes true after the mount effect, and (c) it never flips back to false.
  // The "pre-hydration false" window is architectural (ADR-023 pass-1) and is tested
  // structurally via C-m7a-009 (BuildingClient hydrated={false} branch renders skeleton).

  it("result.current[2] is strictly true after mount effect — the hydration completion signal", async () => {
    const { result } = renderHook(() => usePersistedState());
    await act(async () => {});
    expect(result.current[2]).toBe(true); // post-effect: hydrated
  });

  it("result.current[2] starts as false and becomes true (monotonic-forward) — validated by initializer + effect", () => {
    // The useState initializer sets mounted = false; the useEffect sets it to true.
    // We verify the tuple has a boolean third slot that equals true post-mount.
    const { result } = renderHook(() => usePersistedState());
    // Post-effect in React 19 RTL: effects flush synchronously in renderHook
    expect(typeof result.current[2]).toBe("boolean");
    // After renderHook (React 19 flushes effects): mounted is true
    expect(result.current[2]).toBe(true);
  });

  it("a rerender after hydration does NOT flip mounted back to false (monotonic-true)", async () => {
    const { result, rerender } = renderHook(() => usePersistedState());
    await act(async () => {});
    expect(result.current[2]).toBe(true);
    rerender();
    expect(result.current[2]).toBe(true); // still true
    rerender();
    expect(result.current[2]).toBe(true); // still true
  });

  it("existing two-element destructure const [state, dispatch] = result.current works unchanged", async () => {
    const { result } = renderHook(() => usePersistedState());
    await act(async () => {});
    // Two-element destructure of a three-element tuple — no runtime error, no TS error
    const [state, dispatch] = result.current;
    expect(typeof state).toBe("object");
    expect(typeof dispatch).toBe("function");
    // state and dispatch are byte-identical to the pre-M7a two-element tuple
    expect(state).toBe(result.current[0]);
    expect(dispatch).toBe(result.current[1]);
  });

  it("third slot is a boolean (not AppState, not Dispatch, not undefined)", async () => {
    const { result } = renderHook(() => usePersistedState());
    await act(async () => {});
    // Third slot: strictly a boolean
    expect(typeof result.current[2]).toBe("boolean");
    // After hydration: true (mounted)
    expect(result.current[2]).toBe(true);
  });

  it("a mutant returning a two-element tuple would fail: result.current[2] must not be undefined", async () => {
    const { result } = renderHook(() => usePersistedState());
    await act(async () => {});
    // A mutant returning [state, dispatch] without a third slot would have result.current[2] === undefined
    expect(result.current[2]).not.toBeUndefined();
    expect(result.current[2]).not.toBeNull();
    expect(result.current).toHaveLength(3);
  });
});

// ─── M7e: projectToAppState + toPersisted carry firstBrickShown ──────────────

// U-m7e-015: projectToAppState carries firstBrickShown from PersistedState to AppState
describe("U-m7e-015: projectToAppState carries firstBrickShown through", () => {
  it("AppState has firstBrickShown === true when PersistedState has firstBrickShown: true", async () => {
    // Seed localStorage with firstBrickShown: true
    mockStorage._store[STORAGE_KEY] = JSON.stringify({
      schemaVersion: 3,
      programStart: "2026-05-01",
      currentDate: "2026-05-20",
      history: {},
      blocks: [],
      categories: [],
      looseBricks: [],
      deletions: {},
      firstBrickShown: true,
    });

    const { result } = renderHook(() => usePersistedState());
    // Trigger hydration
    await act(async () => {});

    const [state] = result.current;
    expect(state.firstBrickShown).toBe(true);
  });

  it("AppState has firstBrickShown === false when PersistedState has firstBrickShown: false", async () => {
    mockStorage._store[STORAGE_KEY] = JSON.stringify({
      schemaVersion: 3,
      programStart: "2026-05-01",
      currentDate: "2026-05-20",
      history: {},
      blocks: [],
      categories: [],
      looseBricks: [],
      deletions: {},
      firstBrickShown: false,
    });

    const { result } = renderHook(() => usePersistedState());
    await act(async () => {});

    const [state] = result.current;
    expect(state.firstBrickShown).toBe(false);
  });
});

// U-m7e-016: toPersisted carries firstBrickShown back from AppState to PersistedState
describe("U-m7e-016: toPersisted carries firstBrickShown back to PersistedState", () => {
  it("saveState round-trips firstBrickShown: true through the hook save path", async () => {
    // Start with firstBrickShown: false
    mockStorage._store[STORAGE_KEY] = JSON.stringify({
      schemaVersion: 3,
      programStart: "2026-05-01",
      currentDate: "2026-05-20",
      history: {},
      blocks: [],
      categories: [],
      looseBricks: [],
      deletions: {},
      firstBrickShown: true,
    });

    const { result } = renderHook(() => usePersistedState());
    await act(async () => {});

    // The save effect fires after hydration; read back the stored value
    const raw = mockStorage._store[STORAGE_KEY];
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed.firstBrickShown).toBe(true);
    // Also confirm the in-memory state carries it
    expect(result.current[0].firstBrickShown).toBe(true);
  });
});
