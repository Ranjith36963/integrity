import { describe, it, expect } from "vitest";
import { defaultState, reducer, withDurationDefaults } from "./data";
import type { AppState, Block, Brick, ArchivedDay } from "./types";
// M4f: findUnitsBrickById exported from lib/data.ts
import { findUnitsBrickById } from "./data";
// M6: scoring helpers for U-m6-014
import { dayPct, blockPct } from "./dharma";

/** Narrow a Brick to the tick variant. Throws if kind !== "tick". */
function asTick(b: Brick): Extract<Brick, { kind: "tick" }> {
  if (b.kind !== "tick") throw new Error(`expected tick brick, got ${b.kind}`);
  return b;
}

const testBlock: Block = {
  id: "b1",
  name: "Foo",
  start: "09:00",
  recurrence: { kind: "just-today", date: "2026-05-06" },
  categoryId: null,
  bricks: [],
};

// U-m2-008: reducer handles ADD_BLOCK (immutable append)
describe("U-m2-008: reducer ADD_BLOCK appends immutably", () => {
  it("returns a new state with blocks.length === 1", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const next = reducer(state, { type: "ADD_BLOCK", block: testBlock });
    expect(next).not.toBe(state);
    expect(next.blocks).toHaveLength(1);
    expect(next.blocks[0].id).toBe("b1");
  });

  it("does not mutate the original state", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    reducer(state, { type: "ADD_BLOCK", block: testBlock });
    expect(state.blocks).toHaveLength(0);
  });

  it("preserves categories by reference", () => {
    const cats = [{ id: "c1", name: "Health", color: "#34d399" }];
    const state: AppState = {
      blocks: [],
      categories: cats,
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const next = reducer(state, { type: "ADD_BLOCK", block: testBlock });
    expect(next.categories).toBe(cats);
  });
});

// U-m2-009: reducer handles ADD_CATEGORY + assertNever + defaultState
describe("U-m2-009: reducer ADD_CATEGORY, assertNever, and defaultState", () => {
  it("ADD_CATEGORY appends a new category", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const next = reducer(state, {
      type: "ADD_CATEGORY",
      category: { id: "c1", name: "Health", color: "#34d399" },
    });
    expect(next.categories).toHaveLength(1);
    expect(next.categories[0].id).toBe("c1");
    expect(next.blocks).toHaveLength(0);
  });

  it("unknown action fires assertNever and throws", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reducer(state, { type: "NOPE" } as any),
    ).toThrow();
  });

  it("defaultState() returns { blocks: [], categories: [], looseBricks: [] }", () => {
    const s = defaultState();
    // M8: programStart added to AppState (ADR-044)
    // M9b: currentDate + history added (ADR-045)
    // M5 sanctioned amendment: deletions: {} added (expected M5 collateral)
    expect(s).toEqual({
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: s.programStart, // ISO date — exact value is clock-dependent
      currentDate: s.currentDate, // M9b — clock-dependent
      history: {}, // M9b — empty on first run
      deletions: {}, // M5 — empty on first run
    });
    expect(typeof s.programStart).toBe("string");
  });
});

// ─── U-m3-009: reducer ADD_BRICK routes by parentBlockId !== null ──────────────

describe("U-m3-009: reducer ADD_BRICK routes to block.bricks when parentBlockId !== null", () => {
  const blockWithId: Block = {
    id: "b1",
    name: "block one",
    start: "09:00",
    recurrence: { kind: "just-today", date: "2026-05-06" },
    categoryId: null,
    bricks: [],
  };

  it("appends brick to matching block's bricks array", () => {
    const state: AppState = {
      blocks: [blockWithId],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const next = reducer(state, {
      type: "ADD_BRICK",
      brick: {
        id: "r1",
        name: "brick A",
        kind: "tick",
        hasDuration: false,
        done: false,
        categoryId: null,
        parentBlockId: "b1",
      },
    });
    expect(next.blocks[0].bricks).toHaveLength(1);
    expect(next.blocks[0].bricks[0].id).toBe("r1");
  });

  it("does not mutate the original state — block.bricks still empty", () => {
    const state: AppState = {
      blocks: [blockWithId],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    reducer(state, {
      type: "ADD_BRICK",
      brick: {
        id: "r1",
        name: "brick A",
        kind: "tick",
        hasDuration: false,
        done: false,
        categoryId: null,
        parentBlockId: "b1",
      },
    });
    expect(state.blocks[0].bricks).toHaveLength(0);
  });

  it("preserves looseBricks unchanged", () => {
    const state: AppState = {
      blocks: [blockWithId],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const next = reducer(state, {
      type: "ADD_BRICK",
      brick: {
        id: "r1",
        name: "brick A",
        kind: "tick",
        hasDuration: false,
        done: false,
        categoryId: null,
        parentBlockId: "b1",
      },
    });
    expect(next.looseBricks).toEqual([]);
  });

  it("is a no-op when parentBlockId references a non-existent block", () => {
    const state: AppState = {
      blocks: [blockWithId],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const next = reducer(state, {
      type: "ADD_BRICK",
      brick: {
        id: "r9",
        name: "brick A",
        kind: "tick",
        hasDuration: false,
        done: false,
        categoryId: null,
        parentBlockId: "non-existent",
      },
    });
    // blocks unchanged (no throw, just silent no-op on the map)
    expect(next.blocks[0].bricks).toHaveLength(0);
  });
});

// ─── U-m3-010: reducer ADD_BRICK routes parentBlockId === null to looseBricks ─

describe("U-m3-010: reducer ADD_BRICK routes to looseBricks when parentBlockId === null", () => {
  it("appends brick to looseBricks", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const next = reducer(state, {
      type: "ADD_BRICK",
      brick: {
        id: "r2",
        name: "brick B",
        kind: "units",
        hasDuration: false,
        target: 100,
        done: 0,
        unit: "",
        categoryId: null,
        parentBlockId: null,
      } as unknown as Brick,
    });
    expect(next.looseBricks).toHaveLength(1);
    expect(next.looseBricks[0].id).toBe("r2");
  });

  it("preserves state.blocks by reference (untouched)", () => {
    const existingBlocks: Block[] = [];
    const state: AppState = {
      blocks: existingBlocks,
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const next = reducer(state, {
      type: "ADD_BRICK",
      brick: {
        id: "r2",
        name: "brick B",
        kind: "units",
        hasDuration: false,
        target: 100,
        done: 0,
        unit: "",
        categoryId: null,
        parentBlockId: null,
      } as unknown as Brick,
    });
    expect(next.blocks).toBe(existingBlocks);
  });

  it("immutable update: original state unchanged", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    reducer(state, {
      type: "ADD_BRICK",
      brick: {
        id: "r2",
        name: "brick B",
        kind: "units",
        hasDuration: false,
        target: 100,
        done: 0,
        unit: "",
        categoryId: null,
        parentBlockId: null,
      } as unknown as Brick,
    });
    expect(state.looseBricks).toHaveLength(0);
  });
});

// ─── U-m3-011: assertNever + defaultState ─────────────────────────────────────

describe("U-m3-011: assertNever exhaustiveness + defaultState looseBricks", () => {
  it("unknown action fires assertNever and throws (M3 Action union including ADD_BRICK)", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reducer(state, { type: "NOPE" } as any),
    ).toThrow();
  });

  it("defaultState() returns { blocks: [], categories: [], looseBricks: [] } (M4f: no runningTimerBrickId)", () => {
    const s = defaultState();
    // M8: programStart added to AppState (ADR-044)
    // M9b: currentDate + history added (ADR-045)
    // M5 sanctioned amendment: deletions: {} added (expected M5 collateral)
    expect(s).toEqual({
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: s.programStart,
      currentDate: s.currentDate, // M9b
      history: {}, // M9b
      deletions: {}, // M5 — empty on first run
    });
  });
});

// ─── U-m4a-001: LOG_TICK_BRICK flips done false→true in block.bricks ──────────

describe("U-m4a-001: LOG_TICK_BRICK flips done false→true for brick inside a block", () => {
  it("returns state with brick.done === true; all other fields unchanged", () => {
    const state: AppState = {
      blocks: [
        {
          id: "block-1",
          name: "block 1",
          start: "09:00",
          recurrence: { kind: "just-today", date: "2026-05-06" },
          categoryId: null,
          bricks: [
            {
              id: "b1",
              name: "brick A",
              kind: "tick",
              hasDuration: false,
              done: false,
              categoryId: null,
              parentBlockId: "block-1",
            },
          ],
        },
      ],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const next = reducer(state, { type: "LOG_TICK_BRICK", brickId: "b1" });
    const brick = next.blocks[0].bricks[0];
    expect(asTick(brick).done).toBe(true);
    // All other fields on the brick are unchanged
    expect(brick.id).toBe("b1");
    expect(brick.name).toBe("brick A");
    expect(brick.kind).toBe("tick");
    expect(brick.categoryId).toBeNull();
  });
});

// ─── U-m4a-002: LOG_TICK_BRICK untoggle done true→false ───────────────────────

describe("U-m4a-002: LOG_TICK_BRICK flips done true→false (toggle, not one-way)", () => {
  it("returns state with brick.done === false when brick was done:true", () => {
    const state: AppState = {
      blocks: [
        {
          id: "block-1",
          name: "block 1",
          start: "09:00",
          recurrence: { kind: "just-today", date: "2026-05-06" },
          categoryId: null,
          bricks: [
            {
              id: "b1",
              name: "brick A",
              kind: "tick",
              hasDuration: false,
              done: true,
              categoryId: null,
              parentBlockId: "block-1",
            },
          ],
        },
      ],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const next = reducer(state, { type: "LOG_TICK_BRICK", brickId: "b1" });
    expect(asTick(next.blocks[0].bricks[0]).done).toBe(false);
  });
});

// ─── U-m4a-003: LOG_TICK_BRICK flips done on looseBricks ─────────────────────

describe("U-m4a-003: LOG_TICK_BRICK flips done on looseBricks (no blocks)", () => {
  it("flips looseBricks[0].done to true; state.blocks unchanged", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [
        {
          id: "lb1",
          name: "brick A",
          kind: "tick",
          hasDuration: false,
          done: false,
          categoryId: null,
          parentBlockId: null,
        },
      ],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const next = reducer(state, { type: "LOG_TICK_BRICK", brickId: "lb1" });
    expect(asTick(next.looseBricks[0]).done).toBe(true);
    expect(next.blocks).toEqual([]);
  });
});

// ─── U-m4a-004: LOG_TICK_BRICK no-op when id not found ───────────────────────

describe("U-m4a-004: LOG_TICK_BRICK is a no-op when brickId does not match any brick", () => {
  it("bricks deep-equal to input when id is unmatched", () => {
    const state: AppState = {
      blocks: [
        {
          id: "block-1",
          name: "block 1",
          start: "09:00",
          recurrence: { kind: "just-today", date: "2026-05-06" },
          categoryId: null,
          bricks: [
            {
              id: "b1",
              name: "brick A",
              kind: "tick",
              hasDuration: false,
              done: false,
              categoryId: null,
              parentBlockId: "block-1",
            },
            {
              id: "b2",
              name: "brick A",
              kind: "tick",
              hasDuration: false,
              done: false,
              categoryId: null,
              parentBlockId: "block-1",
            },
          ],
        },
      ],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const next = reducer(state, {
      type: "LOG_TICK_BRICK",
      brickId: "does-not-exist",
    });
    expect(asTick(next.blocks[0].bricks[0]).done).toBe(false);
    expect(asTick(next.blocks[0].bricks[1]).done).toBe(false);
  });
});

// ─── U-m4a-005: LOG_TICK_BRICK no-op when kind !== "tick" ────────────────────

describe("U-m4a-005: LOG_TICK_BRICK is a no-op when brick kind is not tick", () => {
  it("units brick with matching id remains unchanged (no done field flip)", () => {
    const state: AppState = {
      blocks: [
        {
          id: "block-1",
          name: "block 1",
          start: "09:00",
          recurrence: { kind: "just-today", date: "2026-05-06" },
          categoryId: null,
          bricks: [
            {
              id: "g1",
              name: "brick A",
              kind: "units",
              hasDuration: false,
              done: 3,
              target: 10,
              unit: "",
              categoryId: null,
              parentBlockId: "block-1",
            } as unknown as Brick,
          ],
        },
      ],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const next = reducer(state, { type: "LOG_TICK_BRICK", brickId: "g1" });
    const brick = next.blocks[0].bricks[0] as unknown as {
      kind: string;
      done: number;
      target: number;
    };
    expect(brick.kind).toBe("units");
    expect(brick.done).toBe(3);
    expect(brick.target).toBe(10);
  });
});

// ─── U-m4a-006: LOG_TICK_BRICK immutability ───────────────────────────────────

describe("U-m4a-006: LOG_TICK_BRICK returns new top-level reference; no in-place mutation", () => {
  it("prevState !== nextState and prevState.blocks reference is same as before call", () => {
    const prevState: AppState = {
      blocks: [
        {
          id: "block-1",
          name: "block 1",
          start: "09:00",
          recurrence: { kind: "just-today", date: "2026-05-06" },
          categoryId: null,
          bricks: [
            {
              id: "b1",
              name: "brick A",
              kind: "tick",
              hasDuration: false,
              done: false,
              categoryId: null,
              parentBlockId: "block-1",
            },
          ],
        },
      ],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const originalBlocks = prevState.blocks;
    const nextState = reducer(prevState, {
      type: "LOG_TICK_BRICK",
      brickId: "b1",
    });
    // New top-level object
    expect(nextState).not.toBe(prevState);
    // Original reference's bricks not mutated — done is still false on the original
    expect(asTick(prevState.blocks[0].bricks[0]).done).toBe(false);
    // The original blocks array reference itself was not mutated in place
    // (nextState.blocks is a new array since we use .map())
    expect(nextState.blocks).not.toBe(originalBlocks);
  });
});

// ─── U-m4a-007: assertNever exhaustiveness with LOG_TICK_BRICK in union ───────

describe("U-m4a-007: assertNever fires for unknown action shape (exhaustiveness)", () => {
  it("default branch throws for unknown action type", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    expect(() => reducer(state, { type: "__never__" } as never)).toThrow();
  });
});

// ─── U-m4e-015: ADD_BRICK happy path with hasDuration:true ───────────────────

describe("U-m4e-015: ADD_BRICK with hasDuration:true and all three fields present — appends to looseBricks", () => {
  it("stores brick with hasDuration:true, start, end, recurrence in looseBricks", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const next = reducer(state, {
      type: "ADD_BRICK",
      brick: {
        id: "r1",
        kind: "tick",
        done: false,
        name: "Run",
        categoryId: null,
        parentBlockId: null,
        hasDuration: true,
        start: "09:00",
        end: "09:30",
        recurrence: { kind: "just-today", date: "2026-05-14" },
      },
    });
    expect(next.looseBricks).toHaveLength(1);
    const saved = next.looseBricks[0];
    expect(saved.hasDuration).toBe(true);
    if (saved.hasDuration) {
      expect(saved.start).toBe("09:00");
      expect(saved.end).toBe("09:30");
      expect(saved.recurrence).toEqual({
        kind: "just-today",
        date: "2026-05-14",
      });
    }
  });
});

// ─── U-m4e-016: ADD_BRICK rejects when hasDuration:true but fields missing ───

describe("U-m4e-016: ADD_BRICK with hasDuration:true but missing end/start/recurrence — returns same state (identity)", () => {
  it("returns same reference when end is undefined", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const out = reducer(state, {
      type: "ADD_BRICK",
      brick: {
        id: "r1",
        kind: "tick",
        done: false,
        name: "Run",
        categoryId: null,
        parentBlockId: null,
        hasDuration: true,
        start: "09:00",
        end: undefined,
        recurrence: { kind: "just-today", date: "2026-05-14" },
      },
    });
    expect(Object.is(out, state)).toBe(true);
  });

  it("returns same reference when start is undefined", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const out = reducer(state, {
      type: "ADD_BRICK",
      brick: {
        id: "r1",
        kind: "tick",
        done: false,
        name: "Run",
        categoryId: null,
        parentBlockId: null,
        hasDuration: true,
        start: undefined,
        end: "09:30",
        recurrence: { kind: "just-today", date: "2026-05-14" },
      },
    });
    expect(Object.is(out, state)).toBe(true);
  });

  it("returns same reference when recurrence is undefined", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const out = reducer(state, {
      type: "ADD_BRICK",
      brick: {
        id: "r1",
        kind: "tick",
        done: false,
        name: "Run",
        categoryId: null,
        parentBlockId: null,
        hasDuration: true,
        start: "09:00",
        end: "09:30",
        recurrence: undefined,
      },
    });
    expect(Object.is(out, state)).toBe(true);
  });
});

// ─── U-m4e-017: ADD_BRICK rejects when hasDuration:false but fields present ──

describe("U-m4e-017: ADD_BRICK with hasDuration:false but time fields present — returns same state (identity)", () => {
  it("returns same reference when start is defined but hasDuration:false", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const out = reducer(state, {
      type: "ADD_BRICK",
      brick: {
        id: "r1",
        kind: "tick",
        done: false,
        name: "Run",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        start: "09:00",
      },
    });
    expect(Object.is(out, state)).toBe(true);
  });

  it("returns same reference when end is defined but hasDuration:false", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const out = reducer(state, {
      type: "ADD_BRICK",
      brick: {
        id: "r1",
        kind: "tick",
        done: false,
        name: "Run",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        end: "09:30",
      },
    });
    expect(Object.is(out, state)).toBe(true);
  });

  it("returns same reference when recurrence is defined but hasDuration:false", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const out = reducer(state, {
      type: "ADD_BRICK",
      brick: {
        id: "r1",
        kind: "tick",
        done: false,
        name: "Run",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        recurrence: { kind: "just-today", date: "2026-05-14" },
      },
    });
    expect(Object.is(out, state)).toBe(true);
  });
});

// ─── U-m4e-018: ADD_BRICK happy path with hasDuration:false (M3 byte-identical) ─

describe("U-m4e-018: ADD_BRICK with hasDuration:false and no time fields — valid path (M3/M4a/b/c byte-identical)", () => {
  it("appends brick with hasDuration:false; start/end/recurrence all undefined on stored shape", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const next = reducer(state, {
      type: "ADD_BRICK",
      brick: {
        id: "r1",
        kind: "tick",
        done: false,
        name: "Run",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
      },
    });
    expect(next.looseBricks).toHaveLength(1);
    const saved = next.looseBricks[0];
    expect(saved.hasDuration).toBe(false);
    expect(saved.start).toBeUndefined();
    expect(saved.end).toBeUndefined();
    expect(saved.recurrence).toBeUndefined();
  });
});

// ─── U-m4e-019: withDurationDefaults fills missing hasDuration field ─────────

describe("U-m4e-019: withDurationDefaults — fills hasDuration:false when field absent", () => {
  it("adds hasDuration:false; preserves all other fields; start/end/recurrence remain absent", () => {
    // Cast through unknown to simulate a pre-M4e brick without hasDuration
    const preMigration = {
      id: "r1",
      kind: "tick" as const,
      done: false as const,
      name: "Run",
      categoryId: null,
      parentBlockId: null,
    } as unknown as Brick;
    const result = withDurationDefaults(preMigration);
    expect(result.hasDuration).toBe(false);
    expect(result.start).toBeUndefined();
    expect(result.end).toBeUndefined();
    expect(result.recurrence).toBeUndefined();
    expect(result.id).toBe("r1");
    expect(result.kind).toBe("tick");
    expect(result.name).toBe("Run");
    expect(result.categoryId).toBeNull();
    expect(result.parentBlockId).toBeNull();
  });
});

// ─── U-m4e-020: withDurationDefaults is idempotent when hasDuration is set ───

describe("U-m4e-020: withDurationDefaults — idempotent when hasDuration is already a boolean", () => {
  it("returns same reference when hasDuration:true already set", () => {
    const brick: Brick = {
      id: "r1",
      kind: "tick",
      done: false,
      name: "Run",
      categoryId: null,
      parentBlockId: null,
      hasDuration: true,
      start: "09:00",
      end: "09:30",
      recurrence: { kind: "just-today", date: "2026-05-14" },
    };
    const result = withDurationDefaults(brick);
    expect(Object.is(result, brick)).toBe(true);
  });

  it("returns same reference when hasDuration:false already set", () => {
    const brick: Brick = {
      id: "r1",
      kind: "tick",
      done: false,
      name: "Run",
      categoryId: null,
      parentBlockId: null,
      hasDuration: false,
    };
    const result = withDurationDefaults(brick);
    expect(Object.is(result, brick)).toBe(true);
  });
});

// ─── U-m4e-021: assertNever exhaustiveness preserved + defaultState unchanged ─

describe("U-m4e-021: assertNever exhaustiveness preserved after M4e; defaultState unchanged", () => {
  it("throws for unknown action type NOPE", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => reducer(state, { type: "NOPE" } as any)).toThrow();
  });

  it("defaultState() deep-equal matches expected shape (no new AppState fields in M4e)", () => {
    const s = defaultState();
    // M8: programStart added to AppState (ADR-044)
    // M9b: currentDate + history added (ADR-045)
    // M5 sanctioned amendment: deletions: {} added (expected M5 collateral)
    expect(s).toEqual({
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: s.programStart,
      currentDate: s.currentDate, // M9b
      history: {}, // M9b
      deletions: {}, // M5 — empty on first run
    });
  });
});

// ─── U-m4f-001: SET_UNITS_DONE on a loose units brick ────────────────────────

describe("U-m4f-001: SET_UNITS_DONE updates done on loose units brick", () => {
  it("sets done=20 on a loose units brick; preserves blocks/categories by reference", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [
        {
          id: "u1",
          name: "Meditate",
          kind: "units",
          target: 30,
          unit: "minutes",
          done: 0,
          hasDuration: false,
          categoryId: null,
          parentBlockId: null,
        } as unknown as Brick,
      ],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const next = reducer(state, {
      type: "SET_UNITS_DONE",
      brickId: "u1",
      done: 20,
    } as unknown as Parameters<typeof reducer>[1]);
    const brick = next.looseBricks[0] as unknown as {
      done: number;
      target: number;
      unit: string;
    };
    expect(brick.done).toBe(20);
    expect(brick.target).toBe(30);
    expect(brick.unit).toBe("minutes");
    expect(next.blocks).toBe(state.blocks);
    expect(next.categories).toBe(state.categories);
    expect(next.looseBricks).not.toBe(state.looseBricks);
  });
});

// ─── U-m4f-002: SET_UNITS_DONE on a nested units brick ───────────────────────

describe("U-m4f-002: SET_UNITS_DONE updates done on a nested units brick inside a block", () => {
  it("updates done=55 in nested brick; block ref changes; looseBricks+categories unchanged", () => {
    const blockBrick = {
      id: "n1",
      name: "Squats",
      kind: "units",
      target: 100,
      unit: "reps",
      done: 10,
      hasDuration: false,
      categoryId: null,
      parentBlockId: "b1",
    } as unknown as Brick;
    const b1: Block = {
      id: "b1",
      name: "Morning",
      start: "09:00",
      recurrence: { kind: "just-today", date: "2026-05-15" },
      categoryId: null,
      bricks: [blockBrick],
    };
    const state: AppState = {
      blocks: [b1],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const next = reducer(state, {
      type: "SET_UNITS_DONE",
      brickId: "n1",
      done: 55,
    } as unknown as Parameters<typeof reducer>[1]);
    const updatedBrick = next.blocks[0].bricks[0] as unknown as {
      done: number;
    };
    expect(updatedBrick.done).toBe(55);
    expect(next.blocks[0]).not.toBe(b1);
    expect(next.looseBricks).toBe(state.looseBricks);
    expect(next.categories).toBe(state.categories);
  });
});

// ─── U-m4f-003: SET_UNITS_DONE clamp (negative, decimal, negative decimal) ───

describe("U-m4f-003: SET_UNITS_DONE applies Math.max(0, Math.floor(done)) clamp", () => {
  function makeLooseUnitsState(done: number) {
    return {
      blocks: [],
      categories: [],
      looseBricks: [
        {
          id: "u1",
          name: "Meditate",
          kind: "units",
          target: 30,
          unit: "minutes",
          done,
          hasDuration: false,
          categoryId: null,
          parentBlockId: null,
        } as unknown as Brick,
      ],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    } satisfies AppState;
  }

  it("negative value → clamped to 0", () => {
    const state = makeLooseUnitsState(5);
    const next = reducer(state, {
      type: "SET_UNITS_DONE",
      brickId: "u1",
      done: -7,
    } as unknown as Parameters<typeof reducer>[1]);
    expect((next.looseBricks[0] as unknown as { done: number }).done).toBe(0);
  });

  it("decimal value → floored", () => {
    const state = makeLooseUnitsState(5);
    const next = reducer(state, {
      type: "SET_UNITS_DONE",
      brickId: "u1",
      done: 20.9,
    } as unknown as Parameters<typeof reducer>[1]);
    expect((next.looseBricks[0] as unknown as { done: number }).done).toBe(20);
  });

  it("negative decimal → clamped to 0", () => {
    const state = makeLooseUnitsState(5);
    const next = reducer(state, {
      type: "SET_UNITS_DONE",
      brickId: "u1",
      done: -3.4,
    } as unknown as Parameters<typeof reducer>[1]);
    expect((next.looseBricks[0] as unknown as { done: number }).done).toBe(0);
  });
});

// ─── U-m4f-004: SET_UNITS_DONE identity short-circuit when done unchanged ────

describe("U-m4f-004: SET_UNITS_DONE returns same state reference when done is unchanged", () => {
  it("returns Object.is(out, state) === true when done already equals clamped value", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [
        {
          id: "u1",
          name: "Meditate",
          kind: "units",
          target: 30,
          unit: "minutes",
          done: 5,
          hasDuration: false,
          categoryId: null,
          parentBlockId: null,
        } as unknown as Brick,
      ],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const next = reducer(state, {
      type: "SET_UNITS_DONE",
      brickId: "u1",
      done: 5,
    } as unknown as Parameters<typeof reducer>[1]);
    expect(Object.is(next, state)).toBe(true);
  });
});

// ─── U-m4f-005: SET_UNITS_DONE no-op when brickId not found ─────────────────

describe("U-m4f-005: SET_UNITS_DONE is a no-op when brickId does not exist", () => {
  it("returns same state reference when brickId not found", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [
        {
          id: "u1",
          name: "Meditate",
          kind: "units",
          target: 30,
          unit: "minutes",
          done: 5,
          hasDuration: false,
          categoryId: null,
          parentBlockId: null,
        } as unknown as Brick,
      ],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const next = reducer(state, {
      type: "SET_UNITS_DONE",
      brickId: "does-not-exist",
      done: 9,
    } as unknown as Parameters<typeof reducer>[1]);
    expect(Object.is(next, state)).toBe(true);
  });
});

// ─── U-m4f-006: SET_UNITS_DONE no-op on a tick brick ────────────────────────

describe("U-m4f-006: SET_UNITS_DONE is a no-op when targeting a tick brick", () => {
  it("returns same state reference; tick brick done stays boolean false", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [
        {
          id: "t1",
          name: "Run",
          kind: "tick",
          done: false,
          hasDuration: false,
          categoryId: null,
          parentBlockId: null,
        },
      ],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const next = reducer(state, {
      type: "SET_UNITS_DONE",
      brickId: "t1",
      done: 12,
    } as unknown as Parameters<typeof reducer>[1]);
    expect(Object.is(next, state)).toBe(true);
    expect(next.looseBricks[0].kind).toBe("tick");
    if (next.looseBricks[0].kind === "tick") {
      expect(next.looseBricks[0].done).toBe(false);
    }
  });
});

// ─── U-m4f-007: ADD_BRICK defensive kind reject ───────────────────────────────

describe("U-m4f-007: ADD_BRICK defensively rejects stale kind literals", () => {
  it("rejects kind:'goal' (stale pre-M4f); returns same state reference", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const goalBrick = {
      id: "g1",
      name: "pushups",
      kind: "goal",
      target: 10,
      count: 0,
      unit: "reps",
      hasDuration: false,
      categoryId: null,
      parentBlockId: null,
    } as unknown as Brick;
    const next = reducer(state, { type: "ADD_BRICK", brick: goalBrick });
    expect(Object.is(next, state)).toBe(true);
  });

  it("rejects kind:'time' (stale pre-M4f); returns same state reference", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const timeBrick = {
      id: "tm1",
      name: "Meditation",
      kind: "time",
      durationMin: 30,
      minutesDone: 0,
      hasDuration: false,
      categoryId: null,
      parentBlockId: null,
    } as unknown as Brick;
    const next = reducer(state, { type: "ADD_BRICK", brick: timeBrick });
    expect(Object.is(next, state)).toBe(true);
  });
});

// ─── U-m4f-008: ADD_BRICK accepts units and tick kinds ───────────────────────

describe("U-m4f-008: ADD_BRICK accepts both units and tick variants; M4e invariant preserved", () => {
  it("accepts kind:'units' brick; verifies fields", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const unitsBrick = {
      id: "u1",
      name: "Meditate",
      kind: "units",
      target: 30,
      unit: "minutes",
      done: 0,
      hasDuration: false,
      categoryId: null,
      parentBlockId: null,
    } as unknown as Brick;
    const next = reducer(state, { type: "ADD_BRICK", brick: unitsBrick });
    expect(next.looseBricks).toHaveLength(1);
    const saved = next.looseBricks[0] as unknown as {
      kind: string;
      target: number;
      unit: string;
      done: number;
    };
    expect(saved.kind).toBe("units");
    expect(saved.target).toBe(30);
    expect(saved.unit).toBe("minutes");
    expect(saved.done).toBe(0);
  });

  it("accepts kind:'tick' brick", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const next = reducer(state, {
      type: "ADD_BRICK",
      brick: {
        id: "t1",
        name: "Run",
        kind: "tick",
        done: false,
        hasDuration: false,
        categoryId: null,
        parentBlockId: null,
      },
    });
    expect(next.looseBricks).toHaveLength(1);
    expect(next.looseBricks[0].kind).toBe("tick");
  });

  it("M4e invariant: units brick with hasDuration:true but missing end is rejected", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const malformed = {
      id: "u1",
      name: "Meditate",
      kind: "units",
      target: 30,
      unit: "minutes",
      done: 0,
      hasDuration: true,
      start: "06:00",
      // end is missing
      recurrence: { kind: "just-today", date: "2026-05-15" },
      categoryId: null,
      parentBlockId: null,
    } as unknown as Brick;
    const next = reducer(state, { type: "ADD_BRICK", brick: malformed });
    expect(Object.is(next, state)).toBe(true);
  });
});

// ─── U-m4f-009: LOG_TICK_BRICK unchanged from M4a ────────────────────────────

describe("U-m4f-009: LOG_TICK_BRICK behavior unchanged by schema collapse", () => {
  it("flips tick done false→true; second call flips back to false", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [
        {
          id: "t1",
          name: "Run",
          kind: "tick",
          done: false,
          hasDuration: false,
          categoryId: null,
          parentBlockId: null,
        },
      ],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const next1 = reducer(state, { type: "LOG_TICK_BRICK", brickId: "t1" });
    expect(
      (next1.looseBricks[0] as Extract<Brick, { kind: "tick" }>).done,
    ).toBe(true);
    const next2 = reducer(next1, { type: "LOG_TICK_BRICK", brickId: "t1" });
    expect(
      (next2.looseBricks[0] as Extract<Brick, { kind: "tick" }>).done,
    ).toBe(false);
  });
});

// ─── U-m4f-010: assertNever + defaultState after M4f collapse ────────────────

describe("U-m4f-010: assertNever exhaustiveness + defaultState shape post-M4f", () => {
  it("throws for unknown action type NOPE (assertNever preserved)", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => reducer(state, { type: "NOPE" } as any)).toThrow();
  });

  it("defaultState() has no runningTimerBrickId key", () => {
    const s = defaultState();
    expect("runningTimerBrickId" in s).toBe(false);
    // M8: programStart added to AppState (ADR-044)
    // M9b: currentDate + history added (ADR-045)
    // M5 sanctioned amendment: deletions: {} added (expected M5 collateral)
    expect(s).toEqual({
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: s.programStart,
      currentDate: s.currentDate, // M9b
      history: {}, // M9b
      deletions: {}, // M5 — empty on first run
    });
  });
});

// ─── U-m4f-011: findUnitsBrickById helper ────────────────────────────────────

describe("U-m4f-011: findUnitsBrickById returns correct brick or null", () => {
  it("finds a loose units brick by id", () => {
    const unitsBrick = {
      id: "u1",
      name: "Meditate",
      kind: "units",
      target: 30,
      unit: "minutes",
      done: 5,
      hasDuration: false,
      categoryId: null,
      parentBlockId: null,
    } as unknown as Brick;
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [unitsBrick],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const found = findUnitsBrickById(state, "u1");
    expect(found).not.toBeNull();
    expect(found?.id).toBe("u1");
  });

  it("finds a nested units brick inside a block", () => {
    const nestedBrick = {
      id: "n1",
      name: "Squats",
      kind: "units",
      target: 100,
      unit: "reps",
      done: 10,
      hasDuration: false,
      categoryId: null,
      parentBlockId: "b1",
    } as unknown as Brick;
    const state: AppState = {
      blocks: [
        {
          id: "b1",
          name: "Morning",
          start: "09:00",
          recurrence: { kind: "just-today", date: "2026-05-15" },
          categoryId: null,
          bricks: [nestedBrick],
        },
      ],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    const found = findUnitsBrickById(state, "n1");
    expect(found).not.toBeNull();
    expect(found?.id).toBe("n1");
  });

  it("returns null for a tick brick id (wrong kind)", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [
        {
          id: "t1",
          name: "Run",
          kind: "tick",
          done: false,
          hasDuration: false,
          categoryId: null,
          parentBlockId: null,
        },
      ],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    expect(findUnitsBrickById(state, "t1")).toBeNull();
  });

  it("returns null when id does not exist", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
      currentDate: "2026-01-01",
      history: {},
      deletions: {}, // M5
    };
    expect(findUnitsBrickById(state, "missing")).toBeNull();
  });
});

// ─── U-m4f-012: Brick union shape contract (runtime anchor) ──────────────────

describe("U-m4f-012: Brick union has two variants with correct field shapes", () => {
  it("units variant has kind, target, unit, done; no count field", () => {
    const brick = {
      id: "u1",
      name: "Meditate",
      kind: "units",
      target: 30,
      unit: "minutes",
      done: 0,
      hasDuration: false,
      categoryId: null,
      parentBlockId: null,
    } as unknown as Brick;
    expect(brick.kind).toBe("units");
    const u = brick as unknown as {
      target: number;
      unit: string;
      done: number;
    };
    expect(typeof u.target).toBe("number");
    expect(typeof u.unit).toBe("string");
    expect(typeof u.done).toBe("number");
    expect("count" in brick).toBe(false);
  });

  it("tick variant exposes done as boolean", () => {
    const brick: Brick = {
      id: "t1",
      name: "Run",
      kind: "tick",
      done: false,
      hasDuration: false,
      categoryId: null,
      parentBlockId: null,
    };
    expect(brick.kind).toBe("tick");
    if (brick.kind === "tick") {
      expect(typeof brick.done).toBe("boolean");
    }
  });
});

// ─── U-m4f-013: M4e BrickBase fields on units + AppState shape ───────────────

describe("U-m4f-013: M4e BrickBase fields preserved on units variant; AppState has no runningTimerBrickId", () => {
  it("units brick retains all four M4e BrickBase fields", () => {
    const brick = {
      id: "u1",
      name: "Meditate",
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
    } as unknown as Brick;
    const b = brick as unknown as {
      hasDuration: boolean;
      start: string;
      end: string;
      recurrence: unknown;
    };
    expect(b.hasDuration).toBe(true);
    expect(b.start).toBe("06:00");
    expect(b.end).toBe("06:40");
    expect(b.recurrence).toBeDefined();
  });

  it("defaultState() has no runningTimerBrickId key (runtime anchor for tsc-gate)", () => {
    const s = defaultState();
    expect("runningTimerBrickId" in s).toBe(false);
  });
});

// ─── M5 Fixture vocabulary ─────────────────────────────────────────────────────

const m5BlkRecur: Block = {
  id: "blk-recur",
  name: "Morning",
  start: "06:00",
  recurrence: { kind: "every-day" },
  categoryId: null,
  bricks: [
    {
      id: "brk-1",
      name: "Stretch",
      kind: "tick",
      hasDuration: false,
      done: false,
      categoryId: null,
      parentBlockId: "blk-recur",
    },
    {
      id: "brk-2",
      name: "Water",
      kind: "units",
      hasDuration: false,
      target: 8,
      unit: "glasses",
      done: 0,
      categoryId: null,
      parentBlockId: "blk-recur",
    },
  ],
};

const m5BlkOnce: Block = {
  id: "blk-once",
  name: "One-off",
  start: "09:00",
  recurrence: { kind: "just-today", date: "2026-05-18" },
  categoryId: null,
  bricks: [
    {
      id: "brk-3",
      name: "Task",
      kind: "tick",
      hasDuration: false,
      done: false,
      categoryId: null,
      parentBlockId: "blk-once",
    },
  ],
};

const m5BrkLoose: Brick = {
  id: "brk-loose",
  name: "Journal",
  kind: "tick",
  hasDuration: false,
  done: false,
  categoryId: null,
  parentBlockId: null,
};

function makeM5State(): AppState {
  return {
    blocks: [m5BlkRecur, m5BlkOnce],
    categories: [],
    looseBricks: [m5BrkLoose],
    programStart: "2026-05-01",
    currentDate: "2026-05-18",
    history: {},
    deletions: {},
  };
}

// ─── U-m5-001: DELETE_BLOCK_TODAY — exact key + idempotent ────────────────────

describe("U-m5-001: reducer DELETE_BLOCK_TODAY writes exact key, idempotent", () => {
  it("sets deletions['2026-05-18:blk-recur'] = true; exactly one key added", () => {
    const state = makeM5State();
    const next = reducer(state, {
      type: "DELETE_BLOCK_TODAY",
      blockId: "blk-recur",
    });
    expect(next.deletions["2026-05-18:blk-recur"]).toBe(true);
    expect(Object.keys(next.deletions)).toHaveLength(1);
  });

  it("is idempotent — dispatching a second time leaves deletions unchanged", () => {
    const state = makeM5State();
    const next1 = reducer(state, {
      type: "DELETE_BLOCK_TODAY",
      blockId: "blk-recur",
    });
    const next2 = reducer(next1, {
      type: "DELETE_BLOCK_TODAY",
      blockId: "blk-recur",
    });
    expect(Object.keys(next2.deletions)).toHaveLength(1);
    expect(next2.deletions["2026-05-18:blk-recur"]).toBe(true);
    expect(next2).toEqual(next1);
  });
});

// ─── U-m5-002: DELETE_BLOCK_TODAY — blocks reference unchanged ────────────────

describe("U-m5-002: reducer DELETE_BLOCK_TODAY leaves state.blocks untouched", () => {
  it("next.blocks is the same reference as state.blocks — template survives", () => {
    const state = makeM5State();
    const next = reducer(state, {
      type: "DELETE_BLOCK_TODAY",
      blockId: "blk-recur",
    });
    expect(next.blocks).toBe(state.blocks);
  });

  it("looseBricks, categories, and history are also same references", () => {
    const state = makeM5State();
    const next = reducer(state, {
      type: "DELETE_BLOCK_TODAY",
      blockId: "blk-recur",
    });
    expect(next.looseBricks).toBe(state.looseBricks);
    expect(next.categories).toBe(state.categories);
    expect(next.history).toBe(state.history);
  });

  it("blk-recur still present with both bricks intact in next.blocks", () => {
    const state = makeM5State();
    const next = reducer(state, {
      type: "DELETE_BLOCK_TODAY",
      blockId: "blk-recur",
    });
    const blk = next.blocks.find((b) => b.id === "blk-recur");
    expect(blk).toBeDefined();
    expect(blk?.bricks).toHaveLength(2);
  });
});

// ─── U-m5-003: DELETE_BLOCK_TODAY — immutable; ghost-id is harmless ──────────

describe("U-m5-003: DELETE_BLOCK_TODAY — immutable; key set even for ghost blockId", () => {
  it("does not throw under freeze; returns new top-level object", () => {
    const state = makeM5State();
    const frozen = Object.freeze({
      ...state,
      blocks: Object.freeze(state.blocks.map(Object.freeze)) as Block[],
      looseBricks: Object.freeze(
        state.looseBricks.map(Object.freeze),
      ) as Brick[],
      deletions: Object.freeze({ ...state.deletions }),
      categories: Object.freeze([...state.categories]),
      history: Object.freeze({ ...state.history }),
    }) as AppState;
    expect(() =>
      reducer(frozen, { type: "DELETE_BLOCK_TODAY", blockId: "blk-recur" }),
    ).not.toThrow();
    const next = reducer(frozen, {
      type: "DELETE_BLOCK_TODAY",
      blockId: "blk-recur",
    });
    expect(next).not.toBe(frozen);
  });

  it("ghost-id still sets the deletion key unconditionally", () => {
    const state = makeM5State();
    const next = reducer(state, {
      type: "DELETE_BLOCK_TODAY",
      blockId: "ghost-id",
    });
    expect(next.deletions["2026-05-18:ghost-id"]).toBe(true);
    expect(Object.keys(next.deletions)).toHaveLength(1);
  });
});

// ─── U-m5-004: DELETE_BLOCK_ALL — removes template; history untouched ─────────

describe("U-m5-004: DELETE_BLOCK_ALL removes template from blocks; history reference unchanged", () => {
  it("blk-recur absent from next.blocks; blk-once still present", () => {
    const archivedDay = {
      blocks: [{ ...m5BlkRecur }],
      categories: [],
      looseBricks: [],
    };
    const state: AppState = {
      ...makeM5State(),
      history: { "2026-05-10": archivedDay },
    };
    const next = reducer(state, {
      type: "DELETE_BLOCK_ALL",
      blockId: "blk-recur",
    });
    expect(next.blocks.find((b) => b.id === "blk-recur")).toBeUndefined();
    expect(next.blocks.find((b) => b.id === "blk-once")).toBeDefined();
  });

  it("next.history is the same reference (ADR-045 — history read-only)", () => {
    const archivedDay = {
      blocks: [{ ...m5BlkRecur }],
      categories: [],
      looseBricks: [],
    };
    const state: AppState = {
      ...makeM5State(),
      history: { "2026-05-10": archivedDay },
    };
    const next = reducer(state, {
      type: "DELETE_BLOCK_ALL",
      blockId: "blk-recur",
    });
    expect(next.history).toBe(state.history);
    // Archived day still contains blk-recur
    expect(next.history["2026-05-10"].blocks[0].id).toBe("blk-recur");
  });

  it("next.deletions is the same reference (stale keys not pruned, SG-m5-06)", () => {
    const state: AppState = {
      ...makeM5State(),
      deletions: { "2026-05-18:blk-recur": true },
    };
    const next = reducer(state, {
      type: "DELETE_BLOCK_ALL",
      blockId: "blk-recur",
    });
    expect(next.deletions).toBe(state.deletions);
  });
});

// ─── U-m5-005: DELETE_BLOCK_ALL — immutable; no-op on ghost id ───────────────

describe("U-m5-005: DELETE_BLOCK_ALL — immutable; no-op on missing blockId", () => {
  it("does not throw under freeze; returns new object for found id", () => {
    const state = makeM5State();
    const frozen = Object.freeze({
      ...state,
      blocks: Object.freeze(state.blocks.map(Object.freeze)) as Block[],
      looseBricks: Object.freeze(
        state.looseBricks.map(Object.freeze),
      ) as Brick[],
      deletions: Object.freeze({ ...state.deletions }),
      categories: Object.freeze([...state.categories]),
      history: Object.freeze({ ...state.history }),
    }) as AppState;
    expect(() =>
      reducer(frozen, { type: "DELETE_BLOCK_ALL", blockId: "blk-once" }),
    ).not.toThrow();
    const next = reducer(frozen, {
      type: "DELETE_BLOCK_ALL",
      blockId: "blk-once",
    });
    expect(next).not.toBe(frozen);
    expect(next.blocks.find((b) => b.id === "blk-once")).toBeUndefined();
  });

  it("ghost-id returns a state that deep-equals original blocks (filter no-op)", () => {
    const state = makeM5State();
    const next = reducer(state, {
      type: "DELETE_BLOCK_ALL",
      blockId: "ghost-id",
    });
    expect(next.blocks).toHaveLength(state.blocks.length);
    expect(next.blocks.map((b) => b.id)).toEqual(state.blocks.map((b) => b.id));
  });
});

// ─── U-m5-006: DELETE_BRICK — removes from parent block AND from looseBricks ──

describe("U-m5-006: DELETE_BRICK removes a brick from parent block or looseBricks; immutable", () => {
  it("removes brk-1 from blk-recur.bricks; brk-2 survives; looseBricks unchanged", () => {
    const state = makeM5State();
    const frozen = Object.freeze({
      ...state,
      blocks: Object.freeze(state.blocks.map(Object.freeze)) as Block[],
      looseBricks: Object.freeze(
        state.looseBricks.map(Object.freeze),
      ) as Brick[],
      deletions: Object.freeze({ ...state.deletions }),
      categories: Object.freeze([...state.categories]),
      history: Object.freeze({ ...state.history }),
    }) as AppState;
    expect(() =>
      reducer(frozen, { type: "DELETE_BRICK", brickId: "brk-1" }),
    ).not.toThrow();
    const next = reducer(frozen, { type: "DELETE_BRICK", brickId: "brk-1" });
    expect(next).not.toBe(frozen);
    const blkRecur = next.blocks.find((b) => b.id === "blk-recur");
    expect(blkRecur?.bricks.find((br) => br.id === "brk-1")).toBeUndefined();
    expect(blkRecur?.bricks.find((br) => br.id === "brk-2")).toBeDefined();
    expect(next.looseBricks).toHaveLength(1);
  });

  it("removes brk-loose from looseBricks; state.blocks unchanged", () => {
    const state = makeM5State();
    const frozen = Object.freeze({
      ...state,
      blocks: Object.freeze(state.blocks.map(Object.freeze)) as Block[],
      looseBricks: Object.freeze(
        state.looseBricks.map(Object.freeze),
      ) as Brick[],
      deletions: Object.freeze({ ...state.deletions }),
      categories: Object.freeze([...state.categories]),
      history: Object.freeze({ ...state.history }),
    }) as AppState;
    expect(() =>
      reducer(frozen, { type: "DELETE_BRICK", brickId: "brk-loose" }),
    ).not.toThrow();
    const next = reducer(frozen, {
      type: "DELETE_BRICK",
      brickId: "brk-loose",
    });
    expect(next.looseBricks).toHaveLength(0);
    expect(next.blocks).toHaveLength(2);
    // history is the same reference as the frozen input's history (ADR-045 — history untouched)
    expect(next.history).toBe(frozen.history);
  });
});

// ─── U-m5-007: DELETE_BRICK — no-op on ghost id returns original state ref ───

describe("U-m5-007: DELETE_BRICK — no-op on missing brickId returns original state reference", () => {
  it("next === state when brickId not found anywhere (array-identity pattern)", () => {
    const state = makeM5State();
    const next = reducer(state, {
      type: "DELETE_BRICK",
      brickId: "ghost-brick",
    });
    expect(next).toBe(state);
  });
});

// ─── U-m5-008: Action union exhaustiveness — three new arms compile-force ─────

describe("U-m5-008: Action union exhaustiveness — three new arms are handled", () => {
  it("DELETE_BLOCK_TODAY dispatches and returns a defined AppState", () => {
    const state = makeM5State();
    const next = reducer(state, {
      type: "DELETE_BLOCK_TODAY",
      blockId: "blk-recur",
    });
    expect(next).toBeDefined();
    expect(typeof next).toBe("object");
  });

  it("DELETE_BLOCK_ALL dispatches and returns a defined AppState", () => {
    const state = makeM5State();
    const next = reducer(state, {
      type: "DELETE_BLOCK_ALL",
      blockId: "blk-recur",
    });
    expect(next).toBeDefined();
  });

  it("DELETE_BRICK dispatches and returns a defined AppState", () => {
    const state = makeM5State();
    const next = reducer(state, {
      type: "DELETE_BRICK",
      brickId: "brk-1",
    });
    expect(next).toBeDefined();
  });

  it("existing actions still work byte-identically (ADD_BLOCK, LOG_TICK_BRICK)", () => {
    const state = makeM5State();
    const newBlock: Block = {
      id: "new-blk",
      name: "Evening",
      start: "20:00",
      recurrence: { kind: "just-today", date: "2026-05-18" },
      categoryId: null,
      bricks: [],
    };
    const next = reducer(state, { type: "ADD_BLOCK", block: newBlock });
    expect(next.blocks).toHaveLength(3);
    expect(next.blocks[2].id).toBe("new-blk");

    const toggled = reducer(state, {
      type: "LOG_TICK_BRICK",
      brickId: "brk-1",
    });
    const blk = toggled.blocks.find((b) => b.id === "blk-recur");
    const brk = blk?.bricks.find((br) => br.id === "brk-1");
    if (brk?.kind === "tick") expect(brk.done).toBe(true);
  });
});

// ─── U-m5-011: defaultState carries deletions: {}; no schemaVersion ───────────

describe("U-m5-011: defaultState() carries deletions:{}; schemaVersion is PersistedState-only", () => {
  it("defaultState().deletions is an empty object (no overrides on fresh start)", () => {
    const s = defaultState();
    expect(s.deletions).toEqual({});
  });

  it("defaultState() does not carry a schemaVersion key (schemaVersion is PersistedState-only — SG-m8-04)", () => {
    const s = defaultState();
    expect("schemaVersion" in s).toBe(false);
  });

  it("defaultState() carries no editMode/edit-mode field (SG-m5-04 — Edit Mode is never persisted)", () => {
    const s = defaultState();
    expect("editMode" in s).toBe(false);
    expect("edit_mode" in s).toBe(false);
    expect("edit-mode" in s).toBe(false);
  });
});

// ─── M6 fixture vocabulary ────────────────────────────────────────────────────
// Defined once here; each test that needs them builds a fresh state from these.

const brkA1: Brick = {
  id: "brk-A1",
  name: "Push-ups",
  kind: "tick",
  done: true,
  categoryId: null,
  parentBlockId: "blk-A",
  hasDuration: false,
};
const brkA2: Brick = {
  id: "brk-A2",
  name: "Pull-ups",
  kind: "units",
  done: 3,
  target: 5,
  unit: "reps",
  categoryId: null,
  parentBlockId: "blk-A",
  hasDuration: false,
};
const brkA3: Brick = {
  id: "brk-A3",
  name: "Sit-ups",
  kind: "tick",
  done: false,
  categoryId: null,
  parentBlockId: "blk-A",
  hasDuration: false,
};

const blkA: Block = {
  id: "blk-A",
  name: "Morning",
  start: "08:00",
  end: "09:00",
  recurrence: { kind: "every-day" },
  categoryId: null,
  bricks: [brkA1, brkA2, brkA3],
};

const brkB1: Brick = {
  id: "brk-B1",
  name: "Jog",
  kind: "tick",
  done: false,
  categoryId: null,
  parentBlockId: "blk-B",
  hasDuration: false,
};

const blkB: Block = {
  id: "blk-B",
  name: "Workout",
  start: "10:00",
  end: "11:00",
  recurrence: { kind: "every-day" },
  categoryId: null,
  bricks: [brkB1],
};

const brkO1: Brick = {
  id: "brk-O1",
  name: "Read",
  kind: "tick",
  done: false,
  categoryId: null,
  parentBlockId: "blk-open",
  hasDuration: false,
};

const blkOpen: Block = {
  id: "blk-open",
  name: "Open",
  start: "14:00",
  // end: undefined — open-ended
  recurrence: { kind: "every-day" },
  categoryId: null,
  bricks: [brkO1],
};

const brkT1: Brick = {
  id: "brk-T1",
  name: "Sprint",
  kind: "tick",
  done: false,
  categoryId: null,
  parentBlockId: "blk-timed-brick",
  hasDuration: true,
  start: "16:15",
  end: "16:45",
  recurrence: { kind: "every-day" },
};

const brkT2: Brick = {
  id: "brk-T2",
  name: "Rest",
  kind: "tick",
  done: false,
  categoryId: null,
  parentBlockId: "blk-timed-brick",
  hasDuration: false,
};

const blkTimedBrick: Block = {
  id: "blk-timed-brick",
  name: "Intervals",
  start: "16:00",
  end: "17:00",
  recurrence: { kind: "every-day" },
  categoryId: null,
  bricks: [brkT1, brkT2],
};

const brkS1: Brick = {
  id: "brk-S1",
  name: "Single",
  kind: "tick",
  done: false,
  categoryId: null,
  parentBlockId: "blk-single",
  hasDuration: false,
};

const blkSingle: Block = {
  id: "blk-single",
  name: "Single block",
  start: "19:00",
  end: "20:00",
  recurrence: { kind: "every-day" },
  categoryId: null,
  bricks: [brkS1],
};

// ArchivedDay snapshot capturing blk-A at its original "08:00"-"09:00" times.
const archivedDay: ArchivedDay = {
  blocks: [{ ...blkA, start: "08:00", end: "09:00" }, { ...blkB }],
  categories: [],
  looseBricks: [],
};

function makeM6State(): AppState {
  return {
    blocks: [blkA, blkB, blkOpen, blkTimedBrick, blkSingle],
    categories: [],
    looseBricks: [],
    programStart: "2026-05-01",
    currentDate: "2026-05-18",
    history: { "2026-05-10": archivedDay },
    deletions: {},
  };
}

// ─── U-m6-001: REORDER_BLOCK — writes the EXACT new start/end ─────────────────

describe("U-m6-001: REORDER_BLOCK writes new start/end on named block; others byte-identical", () => {
  it("writes the exact newStart and newEnd on blk-A; other blocks and state fields unchanged", () => {
    const state = makeM6State();
    const next = reducer(state, {
      type: "REORDER_BLOCK",
      blockId: "blk-A",
      newStart: "13:00",
      newEnd: "14:00",
    });

    // The named block got new times
    const updated = next.blocks.find((b) => b.id === "blk-A");
    expect(updated?.start).toBe("13:00");
    expect(updated?.end).toBe("14:00");

    // New top-level state object
    expect(next).not.toBe(state);
    // New blocks array
    expect(next.blocks).not.toBe(state.blocks);

    // Other blocks are by reference the same (byte-identical)
    const blkBNext = next.blocks.find((b) => b.id === "blk-B");
    expect(blkBNext).toBe(blkB);

    const blkOpenNext = next.blocks.find((b) => b.id === "blk-open");
    expect(blkOpenNext).toBe(blkOpen);

    // Side-table fields unchanged by reference
    expect(next.deletions).toBe(state.deletions);
    expect(next.categories).toBe(state.categories);
    expect(next.looseBricks).toBe(state.looseBricks);
    expect(next.history).toBe(state.history);
  });
});

// ─── U-m6-002: REORDER_BLOCK — overlap rejection returns original state ref ───

describe("U-m6-002: REORDER_BLOCK returns original state reference on overlap", () => {
  it("returns the SAME state reference when the proposed drop overlaps blk-B", () => {
    const state = makeM6State();
    // blk-A at 08:00-09:00; blk-B at 10:00-11:00.
    // Proposed: move blk-A to 10:30-11:30 — overlaps blk-B's [10:00, 11:00)
    const next = reducer(state, {
      type: "REORDER_BLOCK",
      blockId: "blk-A",
      newStart: "10:30",
      newEnd: "11:30",
    });
    expect(next).toBe(state);
  });

  it("touching-boundary drop (newStart === blk-B.end) is VALID — ADR-006 half-open intervals", () => {
    const state = makeM6State();
    // blk-B ends at 11:00; placing blk-A at 11:00-12:00 is a touching boundary — valid
    const next = reducer(state, {
      type: "REORDER_BLOCK",
      blockId: "blk-A",
      newStart: "11:00",
      newEnd: "12:00",
    });
    expect(next).not.toBe(state);
    const updated = next.blocks.find((b) => b.id === "blk-A");
    expect(updated?.start).toBe("11:00");
    expect(updated?.end).toBe("12:00");
  });

  it("block does not overlap itself — excludeId skips the dragged block in the probe", () => {
    const state = makeM6State();
    // Moving blk-A to a new slot that would overlap its own old position is fine
    // because excludeId === blockId skips blk-A from the collision list.
    const next = reducer(state, {
      type: "REORDER_BLOCK",
      blockId: "blk-A",
      newStart: "08:30",
      newEnd: "09:30",
    });
    // blk-A's old slot [08:00-09:00] is not probed; [08:30-09:30] only overlaps blk-A itself
    // which is excluded → write succeeds
    expect(next).not.toBe(state);
  });
});

// ─── U-m6-003: REORDER_BLOCK — does NOT rewrite state.history ────────────────

describe("U-m6-003: REORDER_BLOCK leaves state.history unchanged (ADR-045)", () => {
  it("next.history is the SAME reference as state.history after re-timing blk-A", () => {
    const state = makeM6State();
    const next = reducer(state, {
      type: "REORDER_BLOCK",
      blockId: "blk-A",
      newStart: "13:00",
      newEnd: "14:00",
    });
    // ADR-045: history is read-only
    expect(next.history).toBe(state.history);
  });

  it("archived blk-A snapshot still shows old 08:00-09:00 times after template re-time", () => {
    const state = makeM6State();
    const next = reducer(state, {
      type: "REORDER_BLOCK",
      blockId: "blk-A",
      newStart: "13:00",
      newEnd: "14:00",
    });
    // The ArchivedDay at 2026-05-10 preserves the pre-M6 times
    const archived = next.history["2026-05-10"];
    const archivedBlkA = archived?.blocks.find((b) => b.id === "blk-A");
    expect(archivedBlkA?.start).toBe("08:00");
    expect(archivedBlkA?.end).toBe("09:00");
  });

  it("the template gets new times (all-future semantics, SG-m6-02)", () => {
    const state = makeM6State();
    const next = reducer(state, {
      type: "REORDER_BLOCK",
      blockId: "blk-A",
      newStart: "13:00",
      newEnd: "14:00",
    });
    const template = next.blocks.find((b) => b.id === "blk-A");
    expect(template?.start).toBe("13:00");
    expect(template?.end).toBe("14:00");
    // Recurrence is unchanged so appliesOn still resolves correctly
    expect(template?.recurrence).toEqual({ kind: "every-day" });
  });
});

// ─── U-m6-004: REORDER_BLOCK — newEnd: null preserves end: undefined ─────────

describe("U-m6-004: REORDER_BLOCK with newEnd: null preserves end: undefined", () => {
  it("open-ended block keeps end === undefined after re-time with newEnd: null", () => {
    // Use an isolated state with only the open-ended block (no other timed items
    // to collide with during the probe-to-24:00 overlap check)
    const state: AppState = {
      blocks: [blkOpen],
      categories: [],
      looseBricks: [],
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: {},
      deletions: {},
    };
    const next = reducer(state, {
      type: "REORDER_BLOCK",
      blockId: "blk-open",
      newStart: "15:00",
      newEnd: null,
    });
    const updated = next.blocks.find((b) => b.id === "blk-open");
    expect(updated?.start).toBe("15:00");
    // Strictly undefined — NOT null, NOT "24:00", NOT the old value
    expect(updated?.end).toBeUndefined();
    expect("end" in (updated ?? {})).toBe(false);
  });

  it("closed block with newEnd string keeps that exact end value", () => {
    // Use an isolated state with only blk-A so the 10:00-11:00 slot is clear
    const state: AppState = {
      blocks: [blkA],
      categories: [],
      looseBricks: [],
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: {},
      deletions: {},
    };
    const next = reducer(state, {
      type: "REORDER_BLOCK",
      blockId: "blk-A",
      newStart: "10:00",
      newEnd: "11:00",
    });
    const updated = next.blocks.find((b) => b.id === "blk-A");
    expect(updated?.end).toBe("11:00");
  });
});

// ─── U-m6-005: REORDER_BLOCK — immutable; no-op on missing blockId ───────────

describe("U-m6-005: REORDER_BLOCK is immutable and no-ops on missing blockId", () => {
  it("does not throw or mutate when state is deeply frozen", () => {
    const state = makeM6State();
    // Deep freeze
    Object.freeze(state);
    Object.freeze(state.blocks);
    state.blocks.forEach((b) => {
      Object.freeze(b);
      Object.freeze(b.bricks);
      b.bricks.forEach((br) => Object.freeze(br));
    });
    Object.freeze(state.looseBricks);
    Object.freeze(state.deletions);
    Object.freeze(state.history);

    expect(() =>
      reducer(state, {
        type: "REORDER_BLOCK",
        blockId: "blk-A",
        newStart: "13:00",
        newEnd: "14:00",
      }),
    ).not.toThrow();

    // blk-A got new times (valid write)
    const next = reducer(state, {
      type: "REORDER_BLOCK",
      blockId: "blk-A",
      newStart: "13:00",
      newEnd: "14:00",
    });
    expect(next).not.toBe(state);
    expect(next.blocks.find((b) => b.id === "blk-A")?.start).toBe("13:00");
  });

  it("ghost blockId is a no-op — no crash, no mutation", () => {
    const state = makeM6State();
    Object.freeze(state);
    Object.freeze(state.blocks);
    state.blocks.forEach((b) => Object.freeze(b));

    expect(() =>
      reducer(state, {
        type: "REORDER_BLOCK",
        blockId: "ghost-id",
        newStart: "13:00",
        newEnd: "14:00",
      }),
    ).not.toThrow();

    // The map produces an equivalent array — blk-A unchanged
    const next = reducer(state, {
      type: "REORDER_BLOCK",
      blockId: "ghost-id",
      newStart: "13:00",
      newEnd: "14:00",
    });
    // ghost-id is not found; the proposal hits no timed item (no block with id ghost-id)
    // so the overlap probe sees no hit OR the map produces a new array with all blocks unchanged
    // Either way blk-A retains its original start
    const blkANext = next.blocks.find((b) => b.id === "blk-A");
    expect(blkANext?.start).toBe("08:00");
  });
});

// ─── U-m6-006: REORDER_BRICK_IN_BLOCK — exact post-splice array order ────────

describe("U-m6-006: REORDER_BRICK_IN_BLOCK splices to the exact post-removal order", () => {
  it("moves brk-A1 from index 0 to index 2 → [brk-A2, brk-A3, brk-A1]", () => {
    const state = makeM6State();
    const next = reducer(state, {
      type: "REORDER_BRICK_IN_BLOCK",
      blockId: "blk-A",
      fromIndex: 0,
      toIndex: 2,
    });

    const bricks = next.blocks.find((b) => b.id === "blk-A")?.bricks;
    expect(bricks?.map((b) => b.id)).toEqual(["brk-A2", "brk-A3", "brk-A1"]);

    // Each brick object is the SAME reference (not cloned)
    expect(bricks?.[0]).toBe(brkA2);
    expect(bricks?.[1]).toBe(brkA3);
    expect(bricks?.[2]).toBe(brkA1);
  });

  it("other blocks remain the SAME reference after a brick reorder in blk-A", () => {
    const state = makeM6State();
    const next = reducer(state, {
      type: "REORDER_BRICK_IN_BLOCK",
      blockId: "blk-A",
      fromIndex: 0,
      toIndex: 2,
    });
    expect(next.blocks.find((b) => b.id === "blk-B")).toBe(blkB);
    expect(next.deletions).toBe(state.deletions);
    expect(next.categories).toBe(state.categories);
    expect(next.looseBricks).toBe(state.looseBricks);
    expect(next.history).toBe(state.history);
  });
});

// ─── U-m6-007: REORDER_BRICK_IN_BLOCK — immutable; bounds-checked no-op ──────

describe("U-m6-007: REORDER_BRICK_IN_BLOCK returns original state on out-of-bounds or missing", () => {
  it("returns the SAME state reference for four out-of-bounds cases", () => {
    const state = makeM6State();
    Object.freeze(state);
    Object.freeze(state.blocks);
    state.blocks.forEach((b) => {
      Object.freeze(b);
      Object.freeze(b.bricks);
      b.bricks.forEach((br) => Object.freeze(br));
    });
    Object.freeze(state.looseBricks);
    Object.freeze(state.deletions);
    Object.freeze(state.history);

    // (a) fromIndex: -1
    expect(
      reducer(state, {
        type: "REORDER_BRICK_IN_BLOCK",
        blockId: "blk-A",
        fromIndex: -1,
        toIndex: 2,
      }),
    ).toBe(state);

    // (b) toIndex: 5 (> bricks.length - 1 which is 2)
    expect(
      reducer(state, {
        type: "REORDER_BRICK_IN_BLOCK",
        blockId: "blk-A",
        fromIndex: 0,
        toIndex: 5,
      }),
    ).toBe(state);

    // (c) fromIndex: 3 (>= bricks.length === 3)
    expect(
      reducer(state, {
        type: "REORDER_BRICK_IN_BLOCK",
        blockId: "blk-A",
        fromIndex: 3,
        toIndex: 1,
      }),
    ).toBe(state);

    // (d) ghost blockId
    expect(
      reducer(state, {
        type: "REORDER_BRICK_IN_BLOCK",
        blockId: "ghost-id",
        fromIndex: 0,
        toIndex: 2,
      }),
    ).toBe(state);
  });

  it("a valid splice does not throw under the freeze", () => {
    const state = makeM6State();
    Object.freeze(state);
    Object.freeze(state.blocks);
    state.blocks.forEach((b) => {
      Object.freeze(b);
      Object.freeze(b.bricks);
      b.bricks.forEach((br) => Object.freeze(br));
    });

    expect(() =>
      reducer(state, {
        type: "REORDER_BRICK_IN_BLOCK",
        blockId: "blk-A",
        fromIndex: 1,
        toIndex: 0,
      }),
    ).not.toThrow();
    const next = reducer(state, {
      type: "REORDER_BRICK_IN_BLOCK",
      blockId: "blk-A",
      fromIndex: 1,
      toIndex: 0,
    });
    expect(next).not.toBe(state);
  });
});

// ─── U-m6-008: REORDER_BRICK_IN_BLOCK — identity short-circuit fromIndex===toIndex

describe("U-m6-008: REORDER_BRICK_IN_BLOCK returns original state when fromIndex === toIndex", () => {
  it("returns the SAME state reference for fromIndex === toIndex", () => {
    const state = makeM6State();
    const next = reducer(state, {
      type: "REORDER_BRICK_IN_BLOCK",
      blockId: "blk-A",
      fromIndex: 1,
      toIndex: 1,
    });
    expect(next).toBe(state);
  });

  it("round-trip (0→1 then 1→0) restores the original brick order", () => {
    const state = makeM6State();
    const step1 = reducer(state, {
      type: "REORDER_BRICK_IN_BLOCK",
      blockId: "blk-A",
      fromIndex: 0,
      toIndex: 1,
    });
    // After 0→1: [brk-A2, brk-A1, brk-A3]
    expect(
      step1.blocks.find((b) => b.id === "blk-A")?.bricks.map((b) => b.id),
    ).toEqual(["brk-A2", "brk-A1", "brk-A3"]);

    const step2 = reducer(step1, {
      type: "REORDER_BRICK_IN_BLOCK",
      blockId: "blk-A",
      fromIndex: 1,
      toIndex: 0,
    });
    // After 1→0: [brk-A1, brk-A2, brk-A3] — original order restored
    expect(
      step2.blocks.find((b) => b.id === "blk-A")?.bricks.map((b) => b.id),
    ).toEqual(["brk-A1", "brk-A2", "brk-A3"]);
  });
});

// ─── U-m6-009: REORDER_BRICK_IN_BLOCK — timed brick keeps start/end unchanged ─

describe("U-m6-009: REORDER_BRICK_IN_BLOCK keeps hasDuration brick start/end unchanged", () => {
  it("brk-T1 retains start:16:15 and end:16:45 after array shuffle", () => {
    const state = makeM6State();
    const next = reducer(state, {
      type: "REORDER_BRICK_IN_BLOCK",
      blockId: "blk-timed-brick",
      fromIndex: 0,
      toIndex: 1,
    });

    const bricks = next.blocks.find((b) => b.id === "blk-timed-brick")?.bricks;
    // brk-T1 moved to index 1
    const brkT1Next = bricks?.find((b) => b.id === "brk-T1");
    expect(brkT1Next?.start).toBe("16:15");
    expect(brkT1Next?.end).toBe("16:45");
    // Array order is [brk-T2, brk-T1]
    expect(bricks?.map((b) => b.id)).toEqual(["brk-T2", "brk-T1"]);
  });
});

// ─── U-m6-013: Action union exhaustiveness — two new arms compile + handle ────

describe("U-m6-013: Action union exhaustiveness — REORDER_BLOCK and REORDER_BRICK_IN_BLOCK", () => {
  it("REORDER_BLOCK dispatches and returns a defined AppState (not assertNever)", () => {
    const state: AppState = {
      blocks: [blkA],
      categories: [],
      looseBricks: [],
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: {},
      deletions: {},
    };
    const next = reducer(state, {
      type: "REORDER_BLOCK",
      blockId: "blk-A",
      newStart: "13:00",
      newEnd: "14:00",
    });
    expect(next).toBeDefined();
    expect(typeof next).toBe("object");
  });

  it("REORDER_BRICK_IN_BLOCK dispatches and returns a defined AppState (not assertNever)", () => {
    const state = makeM6State();
    const next = reducer(state, {
      type: "REORDER_BRICK_IN_BLOCK",
      blockId: "blk-A",
      fromIndex: 0,
      toIndex: 2,
    });
    expect(next).toBeDefined();
    expect(typeof next).toBe("object");
  });

  it("existing M1-M5 actions still work byte-identically after union widening", () => {
    const state = makeM6State();

    // ADD_BLOCK
    const afterAdd = reducer(state, {
      type: "ADD_BLOCK",
      block: {
        id: "new-blk",
        name: "New",
        start: "06:00",
        recurrence: { kind: "every-day" },
        categoryId: null,
        bricks: [],
      },
    });
    expect(afterAdd.blocks.length).toBe(state.blocks.length + 1);

    // LOG_TICK_BRICK still flips done
    const afterLog = reducer(state, {
      type: "LOG_TICK_BRICK",
      brickId: "brk-A1",
    });
    const flipped = afterLog.blocks
      .find((b) => b.id === "blk-A")
      ?.bricks.find((b) => b.id === "brk-A1");
    if (flipped?.kind === "tick") expect(flipped.done).toBe(false); // was true, toggled
  });
});

// ─── U-m6-014: scoring invariance under brick reorder ─────────────────────────

describe("U-m6-014: dayPct and blockPct are unchanged after REORDER_BRICK_IN_BLOCK", () => {
  it("dayPct is byte-identical before and after a brick shuffle", () => {
    const state = makeM6State();
    const before = dayPct(state);
    const blkABefore = blockPct(blkA);

    const next = reducer(state, {
      type: "REORDER_BRICK_IN_BLOCK",
      blockId: "blk-A",
      fromIndex: 0,
      toIndex: 2,
    });

    expect(dayPct(next)).toBe(before);
    const blkANext = next.blocks.find((b) => b.id === "blk-A")!;
    expect(blockPct(blkANext)).toBe(blkABefore);
  });
});

// ─── M7e: firstBrickShown flag flip ──────────────────────────────────────────

const validBrickFixture: Brick = {
  id: "m7e-brick-1",
  name: "Morning stretch",
  categoryId: null,
  parentBlockId: null,
  hasDuration: false,
  kind: "tick",
  done: false,
};

const anotherBrickFixture: Brick = {
  id: "m7e-brick-2",
  name: "Meditation",
  categoryId: null,
  parentBlockId: null,
  hasDuration: false,
  kind: "tick",
  done: false,
};

// Units-brick missing duration — violates the hasDuration invariant guard
const invalidBrickFixture: Brick & { hasDuration: true } = {
  id: "m7e-brick-invalid",
  name: "Run 5k",
  categoryId: null,
  parentBlockId: null,
  hasDuration: true,
  // Missing start/end/recurrence — violates presence invariant
  kind: "tick",
  done: false,
};

function makeBaseState(overrides: Partial<AppState> = {}): AppState {
  return {
    blocks: [],
    categories: [],
    looseBricks: [],
    programStart: "2026-05-01",
    currentDate: "2026-05-20",
    history: {},
    deletions: {},
    ...overrides,
  };
}

// U-m7e-001: ADD_BRICK flips firstBrickShown from undefined to true
describe("U-m7e-001: ADD_BRICK flips firstBrickShown from undefined to true", () => {
  it("sets firstBrickShown === true on the first valid ADD_BRICK dispatch", () => {
    const state = makeBaseState({ firstBrickShown: undefined });
    const next = reducer(state, {
      type: "ADD_BRICK",
      brick: validBrickFixture,
    });
    expect(next.firstBrickShown).toBe(true);
    // brick is present in looseBricks (parentBlockId === null)
    expect(next.looseBricks).toHaveLength(1);
  });
});

// U-m7e-002: ADD_BRICK is idempotent on firstBrickShown (second dispatch leaves flag true)
describe("U-m7e-002: ADD_BRICK idempotent on firstBrickShown — second dispatch keeps flag true", () => {
  it("keeps firstBrickShown === true after a second valid ADD_BRICK dispatch", () => {
    const state = makeBaseState({ firstBrickShown: undefined });
    const state1 = reducer(state, {
      type: "ADD_BRICK",
      brick: validBrickFixture,
    });
    expect(state1.firstBrickShown).toBe(true);
    const state2 = reducer(state1, {
      type: "ADD_BRICK",
      brick: anotherBrickFixture,
    });
    expect(state2.firstBrickShown).toBe(true);
    // never goes to false or undefined
    expect(state2.firstBrickShown).not.toBe(false);
    expect(state2.firstBrickShown).not.toBeUndefined();
  });
});

// U-m7e-003: Rejected ADD_BRICK does NOT flip firstBrickShown
describe("U-m7e-003: rejected ADD_BRICK does NOT flip firstBrickShown", () => {
  it("returns state unchanged when brick violates the hasDuration presence invariant", () => {
    const state = makeBaseState({ firstBrickShown: false });
    const next = reducer(state, {
      type: "ADD_BRICK",
      brick: invalidBrickFixture,
    });
    // Reducer rejects and returns state unchanged
    expect(next.firstBrickShown).toBe(false);
    expect(next).toBe(state); // same reference — not a new object
  });
});

// U-m7e-004: Other action arms do NOT flip firstBrickShown
describe("U-m7e-004: other action arms do NOT flip firstBrickShown", () => {
  const baseBlock: Block = {
    id: "blk-u4",
    name: "Block U4",
    start: "08:00",
    recurrence: { kind: "just-today", date: "2026-05-20" },
    categoryId: null,
    bricks: [{ ...validBrickFixture, id: "br-u4", parentBlockId: "blk-u4" }],
  };
  const stateWithBlock = makeBaseState({
    blocks: [baseBlock],
    firstBrickShown: false,
  });

  it("ADD_BLOCK does NOT flip firstBrickShown", () => {
    const next = reducer(stateWithBlock, {
      type: "ADD_BLOCK",
      block: { ...baseBlock, id: "blk-new" },
    });
    expect(next.firstBrickShown).toBe(false);
  });

  it("DELETE_BLOCK_TODAY does NOT flip firstBrickShown", () => {
    const next = reducer(stateWithBlock, {
      type: "DELETE_BLOCK_TODAY",
      blockId: "blk-u4",
    });
    expect(next.firstBrickShown).toBe(false);
  });

  it("DELETE_BLOCK_ALL does NOT flip firstBrickShown", () => {
    const next = reducer(stateWithBlock, {
      type: "DELETE_BLOCK_ALL",
      blockId: "blk-u4",
    });
    expect(next.firstBrickShown).toBe(false);
  });

  it("LOG_TICK_BRICK does NOT flip firstBrickShown", () => {
    const next = reducer(stateWithBlock, {
      type: "LOG_TICK_BRICK",
      brickId: "br-u4",
    });
    expect(next.firstBrickShown).toBe(false);
  });

  it("SET_UNITS_DONE does NOT flip firstBrickShown", () => {
    // No units brick in state — this will be a no-op but the flag must stay false
    const next = reducer(stateWithBlock, {
      type: "SET_UNITS_DONE",
      brickId: "nonexistent",
      done: 5,
    });
    expect(next.firstBrickShown).toBe(false);
  });

  it("DELETE_BRICK does NOT flip firstBrickShown", () => {
    const next = reducer(stateWithBlock, {
      type: "DELETE_BRICK",
      brickId: "br-u4",
    });
    expect(next.firstBrickShown).toBe(false);
  });
});

describe("FREEZE_DAY — streak-freeze reducer", () => {
  function bare(): AppState {
    return {
      schemaVersion: 3,
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: "2026-06-01",
      currentDate: "2026-06-22",
      history: {},
      deletions: {},
    } as unknown as AppState;
  }

  it("sets freezes[date] = true on first call", () => {
    const s = reducer(bare(), { type: "FREEZE_DAY", isoDate: "2026-06-22" });
    expect(s.freezes).toEqual({ "2026-06-22": true });
  });

  it("is idempotent — re-freezing returns state unchanged", () => {
    const a = reducer(bare(), { type: "FREEZE_DAY", isoDate: "2026-06-22" });
    const b = reducer(a, { type: "FREEZE_DAY", isoDate: "2026-06-22" });
    expect(b).toBe(a);
  });

  it("allows 2 freezes per calendar month", () => {
    const a = reducer(bare(), { type: "FREEZE_DAY", isoDate: "2026-06-10" });
    const b = reducer(a, { type: "FREEZE_DAY", isoDate: "2026-06-22" });
    expect(Object.keys(b.freezes ?? {})).toHaveLength(2);
  });

  it("silently no-ops on the 3rd freeze in the same month", () => {
    let s = bare();
    s = reducer(s, { type: "FREEZE_DAY", isoDate: "2026-06-05" });
    s = reducer(s, { type: "FREEZE_DAY", isoDate: "2026-06-10" });
    const blocked = reducer(s, { type: "FREEZE_DAY", isoDate: "2026-06-15" });
    expect(blocked).toBe(s); // no state change
    expect(Object.keys(blocked.freezes ?? {})).toHaveLength(2);
  });

  it("counts freezes per-month — June + July each get 2", () => {
    let s = bare();
    s = reducer(s, { type: "FREEZE_DAY", isoDate: "2026-06-05" });
    s = reducer(s, { type: "FREEZE_DAY", isoDate: "2026-06-10" });
    s = reducer(s, { type: "FREEZE_DAY", isoDate: "2026-07-01" });
    s = reducer(s, { type: "FREEZE_DAY", isoDate: "2026-07-15" });
    expect(Object.keys(s.freezes ?? {})).toHaveLength(4);
  });
});
