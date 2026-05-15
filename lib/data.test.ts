import { describe, it, expect } from "vitest";
import { defaultState, reducer, withDurationDefaults } from "./data";
import type { AppState, Block, Brick } from "./types";
// M4f: findUnitsBrickById exported from lib/data.ts
import { findUnitsBrickById } from "./data";

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
    };
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reducer(state, { type: "NOPE" } as any),
    ).toThrow();
  });

  it("defaultState() returns { blocks: [], categories: [], looseBricks: [] }", () => {
    const s = defaultState();
    // M8: programStart added to AppState (ADR-044); toEqual includes it
    expect(s).toEqual({
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: s.programStart, // ISO date — exact value is clock-dependent
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
    };
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reducer(state, { type: "NOPE" } as any),
    ).toThrow();
  });

  it("defaultState() returns { blocks: [], categories: [], looseBricks: [] } (M4f: no runningTimerBrickId)", () => {
    const s = defaultState();
    // M8: programStart added to AppState (ADR-044)
    expect(s).toEqual({
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: s.programStart,
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
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => reducer(state, { type: "NOPE" } as any)).toThrow();
  });

  it("defaultState() deep-equal matches expected shape (no new AppState fields in M4e)", () => {
    const s = defaultState();
    // M8: programStart added to AppState (ADR-044); shape verified here
    expect(s).toEqual({
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: s.programStart,
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
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => reducer(state, { type: "NOPE" } as any)).toThrow();
  });

  it("defaultState() has no runningTimerBrickId key", () => {
    const s = defaultState();
    expect("runningTimerBrickId" in s).toBe(false);
    // M8: programStart added to AppState (ADR-044)
    expect(s).toEqual({
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: s.programStart,
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
    };
    expect(findUnitsBrickById(state, "t1")).toBeNull();
  });

  it("returns null when id does not exist", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      programStart: "2026-01-01",
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
