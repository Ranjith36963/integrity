import { describe, it, expect } from "vitest";
import { defaultState, reducer } from "./data";
import type { AppState, Block } from "./types";

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
    const state: AppState = { blocks: [], categories: [], looseBricks: [] };
    const next = reducer(state, { type: "ADD_BLOCK", block: testBlock });
    expect(next).not.toBe(state);
    expect(next.blocks).toHaveLength(1);
    expect(next.blocks[0].id).toBe("b1");
  });

  it("does not mutate the original state", () => {
    const state: AppState = { blocks: [], categories: [], looseBricks: [] };
    reducer(state, { type: "ADD_BLOCK", block: testBlock });
    expect(state.blocks).toHaveLength(0);
  });

  it("preserves categories by reference", () => {
    const cats = [{ id: "c1", name: "Health", color: "#34d399" }];
    const state: AppState = { blocks: [], categories: cats, looseBricks: [] };
    const next = reducer(state, { type: "ADD_BLOCK", block: testBlock });
    expect(next.categories).toBe(cats);
  });
});

// U-m2-009: reducer handles ADD_CATEGORY + assertNever + defaultState
describe("U-m2-009: reducer ADD_CATEGORY, assertNever, and defaultState", () => {
  it("ADD_CATEGORY appends a new category", () => {
    const state: AppState = { blocks: [], categories: [], looseBricks: [] };
    const next = reducer(state, {
      type: "ADD_CATEGORY",
      category: { id: "c1", name: "Health", color: "#34d399" },
    });
    expect(next.categories).toHaveLength(1);
    expect(next.categories[0].id).toBe("c1");
    expect(next.blocks).toHaveLength(0);
  });

  it("unknown action fires assertNever and throws", () => {
    const state: AppState = { blocks: [], categories: [], looseBricks: [] };
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reducer(state, { type: "NOPE" } as any),
    ).toThrow();
  });

  it("defaultState() returns { blocks: [], categories: [], looseBricks: [] }", () => {
    const s = defaultState();
    expect(s).toEqual({ blocks: [], categories: [], looseBricks: [] });
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
    };
    const next = reducer(state, {
      type: "ADD_BRICK",
      brick: {
        id: "r1",
        name: "brick A",
        kind: "tick",
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
    };
    reducer(state, {
      type: "ADD_BRICK",
      brick: {
        id: "r1",
        name: "brick A",
        kind: "tick",
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
    };
    const next = reducer(state, {
      type: "ADD_BRICK",
      brick: {
        id: "r1",
        name: "brick A",
        kind: "tick",
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
    };
    const next = reducer(state, {
      type: "ADD_BRICK",
      brick: {
        id: "r9",
        name: "brick A",
        kind: "tick",
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
    const state: AppState = { blocks: [], categories: [], looseBricks: [] };
    const next = reducer(state, {
      type: "ADD_BRICK",
      brick: {
        id: "r2",
        name: "brick B",
        kind: "goal",
        target: 100,
        count: 0,
        unit: "",
        categoryId: null,
        parentBlockId: null,
      },
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
    };
    const next = reducer(state, {
      type: "ADD_BRICK",
      brick: {
        id: "r2",
        name: "brick B",
        kind: "goal",
        target: 100,
        count: 0,
        unit: "",
        categoryId: null,
        parentBlockId: null,
      },
    });
    expect(next.blocks).toBe(existingBlocks);
  });

  it("immutable update: original state unchanged", () => {
    const state: AppState = { blocks: [], categories: [], looseBricks: [] };
    reducer(state, {
      type: "ADD_BRICK",
      brick: {
        id: "r2",
        name: "brick B",
        kind: "goal",
        target: 100,
        count: 0,
        unit: "",
        categoryId: null,
        parentBlockId: null,
      },
    });
    expect(state.looseBricks).toHaveLength(0);
  });
});

// ─── U-m3-011: assertNever + defaultState ─────────────────────────────────────

describe("U-m3-011: assertNever exhaustiveness + defaultState looseBricks", () => {
  it("unknown action fires assertNever and throws (M3 Action union including ADD_BRICK)", () => {
    const state: AppState = { blocks: [], categories: [], looseBricks: [] };
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reducer(state, { type: "NOPE" } as any),
    ).toThrow();
  });

  it("defaultState() returns { blocks: [], categories: [], looseBricks: [] }", () => {
    const s = defaultState();
    expect(s).toEqual({ blocks: [], categories: [], looseBricks: [] });
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
              done: false,
              categoryId: null,
              parentBlockId: "block-1",
            },
          ],
        },
      ],
      categories: [],
      looseBricks: [],
    };
    const next = reducer(state, { type: "LOG_TICK_BRICK", brickId: "b1" });
    const brick = next.blocks[0].bricks[0];
    expect(brick.done).toBe(true);
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
              done: true,
              categoryId: null,
              parentBlockId: "block-1",
            },
          ],
        },
      ],
      categories: [],
      looseBricks: [],
    };
    const next = reducer(state, { type: "LOG_TICK_BRICK", brickId: "b1" });
    expect(next.blocks[0].bricks[0].done).toBe(false);
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
          done: false,
          categoryId: null,
          parentBlockId: null,
        },
      ],
    };
    const next = reducer(state, { type: "LOG_TICK_BRICK", brickId: "lb1" });
    expect(next.looseBricks[0].done).toBe(true);
    expect(next.blocks).toEqual([]);
  });
});
