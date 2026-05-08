import { describe, it, expect } from "vitest";
import { defaultState, reducer } from "./data";
import type { AppState, Block, Brick } from "./types";

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
          done: false,
          categoryId: null,
          parentBlockId: null,
        },
      ],
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
              done: false,
              categoryId: null,
              parentBlockId: "block-1",
            },
            {
              id: "b2",
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
  it("goal brick with matching id remains unchanged (no done field flip)", () => {
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
              kind: "goal",
              count: 3,
              target: 10,
              unit: "",
              categoryId: null,
              parentBlockId: "block-1",
            },
          ],
        },
      ],
      categories: [],
      looseBricks: [],
    };
    const next = reducer(state, { type: "LOG_TICK_BRICK", brickId: "g1" });
    const brick = next.blocks[0].bricks[0];
    expect(brick.kind).toBe("goal");
    if (brick.kind === "goal") {
      expect(brick.count).toBe(3);
      expect(brick.target).toBe(10);
    }
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
    const state: AppState = { blocks: [], categories: [], looseBricks: [] };
    expect(() => reducer(state, { type: "__never__" } as never)).toThrow();
  });
});

// ─── U-m4b-001: LOG_GOAL_BRICK increments count by 1 ─────────────────────────

/** Narrow a Brick to the goal variant. Throws if kind !== "goal". */
function asGoal(b: Brick): Extract<Brick, { kind: "goal" }> {
  if (b.kind !== "goal") throw new Error(`expected goal brick, got ${b.kind}`);
  return b;
}

describe("U-m4b-001: LOG_GOAL_BRICK increments count on a goal brick inside a block", () => {
  it("returned state brick has count === 4; all other fields deep-equal", () => {
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
              name: "pushups",
              kind: "goal",
              count: 3,
              target: 10,
              unit: "reps",
              categoryId: null,
              parentBlockId: "block-1",
            },
          ],
        },
      ],
      categories: [],
      looseBricks: [],
    };
    const next = reducer(state, {
      type: "LOG_GOAL_BRICK",
      brickId: "g1",
      delta: 1,
    });
    const brick = asGoal(next.blocks[0].bricks[0]);
    expect(brick.count).toBe(4);
    expect(brick.target).toBe(10);
    expect(brick.unit).toBe("reps");
    expect(brick.name).toBe("pushups");
  });
});

// ─── U-m4b-002: LOG_GOAL_BRICK decrements count by 1 ─────────────────────────

describe("U-m4b-002: LOG_GOAL_BRICK decrements count on a goal brick inside a block", () => {
  it("returned state brick has count === 3; all other fields deep-equal", () => {
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
              name: "pushups",
              kind: "goal",
              count: 4,
              target: 10,
              unit: "reps",
              categoryId: null,
              parentBlockId: "block-1",
            },
          ],
        },
      ],
      categories: [],
      looseBricks: [],
    };
    const next = reducer(state, {
      type: "LOG_GOAL_BRICK",
      brickId: "g1",
      delta: -1,
    });
    const brick = asGoal(next.blocks[0].bricks[0]);
    expect(brick.count).toBe(3);
    expect(brick.target).toBe(10);
    expect(brick.unit).toBe("reps");
    expect(brick.name).toBe("pushups");
  });
});

// ─── U-m4b-003: LOG_GOAL_BRICK clamp at top → identity short-circuit ──────────

describe("U-m4b-003: LOG_GOAL_BRICK returns same state reference when clamped at ceiling", () => {
  it("prevState === nextState when count === target and delta: 1", () => {
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
              name: "pushups",
              kind: "goal",
              count: 10,
              target: 10,
              unit: "reps",
              categoryId: null,
              parentBlockId: "block-1",
            },
          ],
        },
      ],
      categories: [],
      looseBricks: [],
    };
    const next = reducer(state, {
      type: "LOG_GOAL_BRICK",
      brickId: "g1",
      delta: 1,
    });
    expect(next).toBe(state);
    expect(asGoal(next.blocks[0].bricks[0]).count).toBe(10);
  });
});

// ─── U-m4b-004: LOG_GOAL_BRICK clamp at bottom → identity short-circuit ────────

describe("U-m4b-004: LOG_GOAL_BRICK returns same state reference when clamped at floor", () => {
  it("prevState === nextState when count === 0 and delta: -1", () => {
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
              name: "pushups",
              kind: "goal",
              count: 0,
              target: 10,
              unit: "",
              categoryId: null,
              parentBlockId: "block-1",
            },
          ],
        },
      ],
      categories: [],
      looseBricks: [],
    };
    const next = reducer(state, {
      type: "LOG_GOAL_BRICK",
      brickId: "g1",
      delta: -1,
    });
    expect(next).toBe(state);
    expect(asGoal(next.blocks[0].bricks[0]).count).toBe(0);
  });
});
