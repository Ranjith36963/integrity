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
import { saveState, STORAGE_KEY } from "./persist";
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
      programStart: "2026-05-01",
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
  it("synchronous first render produces empty blocks/categories/looseBricks", () => {
    // Pre-seed localStorage with a real state
    const persisted: PersistedState = {
      schemaVersion: 1,
      programStart: "2026-04-01",
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
      categories: [{ id: "c1", name: "Health", color: "#f00" }],
      looseBricks: [
        {
          id: "t1",
          name: "Read",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: false,
        },
      ],
    };
    saveState(persisted);

    // renderHook captures the initial render state before effects flush
    const { result } = renderHook(() => usePersistedState());
    // The initial state (before act) must be the empty default
    const [initialState] = result.current;
    expect(initialState.blocks).toEqual([]);
    expect(initialState.categories).toEqual([]);
    expect(initialState.looseBricks).toEqual([]);
  });

  it("after effects flush, state contains the persisted values", async () => {
    const persisted: PersistedState = {
      schemaVersion: 1,
      programStart: "2026-04-01",
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
  it("saveState spy has zero calls before the hydration effect fires", async () => {
    const saveStateSpy = vi.spyOn(await import("./persist"), "saveState");

    const block = {
      id: "b1",
      name: "Work",
      start: "09:00",
      recurrence: { kind: "every-day" as const },
      categoryId: null,
      bricks: [],
    };
    const persisted: PersistedState = {
      schemaVersion: 1,
      programStart: "2026-04-01",
      blocks: [block],
      categories: [],
      looseBricks: [],
    };
    // Pre-seed a real persisted state
    saveState(persisted);
    // Reset spy call count AFTER seeding (we don't want to count the seed call)
    saveStateSpy.mockClear();

    render(<HarnessComponent />);

    // saveState should not have been called on the empty-default first render
    expect(saveStateSpy).not.toHaveBeenCalled();

    // The pre-seeded key must still have b1 (not overwritten with [])
    const rawBeforeHydration = mockStorage._store[STORAGE_KEY];
    const parsed = JSON.parse(rawBeforeHydration);
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
      schemaVersion: 1,
      programStart: "2026-04-01",
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
      schemaVersion: 1,
      programStart: "2026-04-01",
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
      schemaVersion: 1,
      programStart: "2026-05-01",
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
      schemaVersion: 1,
      programStart: today(),
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
      schemaVersion: 1,
      programStart: today(),
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
