import { describe, it, expect } from "vitest";
import { defaultState, reducer, withDurationDefaults } from "./data";
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
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      runningTimerBrickId: null,
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
      runningTimerBrickId: null,
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
      runningTimerBrickId: null,
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
      runningTimerBrickId: null,
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
      runningTimerBrickId: null,
    };
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reducer(state, { type: "NOPE" } as any),
    ).toThrow();
  });

  it("defaultState() returns { blocks: [], categories: [], looseBricks: [], runningTimerBrickId: null }", () => {
    const s = defaultState();
    expect(s).toEqual({
      blocks: [],
      categories: [],
      looseBricks: [],
      runningTimerBrickId: null,
    });
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
      runningTimerBrickId: null,
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
      runningTimerBrickId: null,
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
      runningTimerBrickId: null,
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
      runningTimerBrickId: null,
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
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      runningTimerBrickId: null,
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
    expect(next.looseBricks).toHaveLength(1);
    expect(next.looseBricks[0].id).toBe("r2");
  });

  it("preserves state.blocks by reference (untouched)", () => {
    const existingBlocks: Block[] = [];
    const state: AppState = {
      blocks: existingBlocks,
      categories: [],
      looseBricks: [],
      runningTimerBrickId: null,
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
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      runningTimerBrickId: null,
    };
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
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      runningTimerBrickId: null,
    };
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reducer(state, { type: "NOPE" } as any),
    ).toThrow();
  });

  it("defaultState() returns { blocks: [], categories: [], looseBricks: [], runningTimerBrickId: null }", () => {
    const s = defaultState();
    expect(s).toEqual({
      blocks: [],
      categories: [],
      looseBricks: [],
      runningTimerBrickId: null,
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
              done: false,
              categoryId: null,
              parentBlockId: "block-1",
            },
          ],
        },
      ],
      categories: [],
      looseBricks: [],
      runningTimerBrickId: null,
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
      runningTimerBrickId: null,
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
      runningTimerBrickId: null,
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
      runningTimerBrickId: null,
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
      runningTimerBrickId: null,
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
      runningTimerBrickId: null,
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
      runningTimerBrickId: null,
    };
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
      runningTimerBrickId: null,
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
      runningTimerBrickId: null,
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
      runningTimerBrickId: null,
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
      runningTimerBrickId: null,
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

// ─── U-m4b-005: LOG_GOAL_BRICK routes to looseBricks ─────────────────────────

describe("U-m4b-005: LOG_GOAL_BRICK increments looseBricks goal brick; state.blocks reference unchanged", () => {
  it("looseBricks[0].count === 3; state.blocks array reference-equal to input", () => {
    const existingBlocks: AppState["blocks"] = [];
    const state: AppState = {
      blocks: existingBlocks,
      categories: [],
      looseBricks: [
        {
          id: "lg1",
          name: "squats",
          kind: "goal",
          count: 2,
          target: 5,
          unit: "",
          categoryId: null,
          parentBlockId: null,
        },
      ],
      runningTimerBrickId: null,
    };
    const next = reducer(state, {
      type: "LOG_GOAL_BRICK",
      brickId: "lg1",
      delta: 1,
    });
    expect(asGoal(next.looseBricks[0]).count).toBe(3);
    expect(next.blocks).toBe(existingBlocks);
  });
});

// ─── U-m4b-006: LOG_GOAL_BRICK no-op when id not found ───────────────────────

describe("U-m4b-006: LOG_GOAL_BRICK is a no-op when brickId does not match any brick", () => {
  it("returned state is same reference when id does not exist", () => {
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
              count: 2,
              target: 5,
              unit: "",
              categoryId: null,
              parentBlockId: "block-1",
            },
          ],
        },
      ],
      categories: [],
      looseBricks: [],
      runningTimerBrickId: null,
    };
    const next = reducer(state, {
      type: "LOG_GOAL_BRICK",
      brickId: "does-not-exist",
      delta: 1,
    });
    expect(next).toBe(state);
  });
});

// ─── U-m4b-007: LOG_GOAL_BRICK no-op when kind is tick (id matches tick brick) ─

describe("U-m4b-007: LOG_GOAL_BRICK is a no-op when id matches a tick brick (kind mismatch)", () => {
  it("returned state is same reference; tick brick done field unchanged", () => {
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
              id: "t1",
              name: "task",
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
      runningTimerBrickId: null,
    };
    const next = reducer(state, {
      type: "LOG_GOAL_BRICK",
      brickId: "t1",
      delta: 1,
    });
    expect(next).toBe(state);
    expect(next.blocks[0].bricks[0].kind).toBe("tick");
    if (next.blocks[0].bricks[0].kind === "tick") {
      expect(next.blocks[0].bricks[0].done).toBe(false);
    }
  });
});

// ─── U-m4b-008: LOG_GOAL_BRICK no-op when kind is time (id matches time brick) ─

describe("U-m4b-008: LOG_GOAL_BRICK is a no-op when id matches a time brick (kind mismatch)", () => {
  it("returned state is same reference; time brick deep-equal to input", () => {
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
              id: "tm1",
              name: "timer",
              kind: "time",
              minutesDone: 0,
              durationMin: 600,
              categoryId: null,
              parentBlockId: "block-1",
            },
          ],
        },
      ],
      categories: [],
      looseBricks: [],
      runningTimerBrickId: null,
    };
    const next = reducer(state, {
      type: "LOG_GOAL_BRICK",
      brickId: "tm1",
      delta: 1,
    });
    expect(next).toBe(state);
    expect(next.blocks[0].bricks[0].kind).toBe("time");
  });
});

// ─── U-m4b-009: LOG_GOAL_BRICK returns new top-level reference on real change ──

describe("U-m4b-009: LOG_GOAL_BRICK returns new state reference on real change; no in-place mutation", () => {
  it("prevState !== nextState; original brick reference not mutated", () => {
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
              id: "g1",
              name: "pushups",
              kind: "goal",
              count: 2,
              target: 5,
              unit: "",
              categoryId: null,
              parentBlockId: "block-1",
            },
          ],
        },
      ],
      categories: [],
      looseBricks: [],
      runningTimerBrickId: null,
    };
    const originalBrick = prevState.blocks[0].bricks[0];
    const nextState = reducer(prevState, {
      type: "LOG_GOAL_BRICK",
      brickId: "g1",
      delta: 1,
    });
    expect(nextState).not.toBe(prevState);
    expect(asGoal(originalBrick).count).toBe(2);
    expect(asGoal(nextState.blocks[0].bricks[0]).count).toBe(3);
  });
});

// ─── U-m4b-010: assertNever preserves exhaustiveness with LOG_GOAL_BRICK ───────

describe("U-m4b-010: assertNever fires for unknown action after LOG_GOAL_BRICK added", () => {
  it("default branch throws for unknown action type", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      runningTimerBrickId: null,
    };
    expect(() => reducer(state, { type: "__never__" } as never)).toThrow();
  });
});

// ─── U-m4b-011: LOG_GOAL_BRICK with target === 0 (degenerate) ────────────────

describe("U-m4b-011: LOG_GOAL_BRICK is a no-op when target === 0 (degenerate case)", () => {
  it("returned state is same reference; count stays 0", () => {
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
              name: "degenerate",
              kind: "goal",
              count: 0,
              target: 0,
              unit: "",
              categoryId: null,
              parentBlockId: "block-1",
            },
          ],
        },
      ],
      categories: [],
      looseBricks: [],
      runningTimerBrickId: null,
    };
    const next = reducer(state, {
      type: "LOG_GOAL_BRICK",
      brickId: "g1",
      delta: 1,
    });
    expect(next).toBe(state);
    expect(asGoal(next.blocks[0].bricks[0]).count).toBe(0);
  });
});

// ─── U-m4c-001: START_TIMER sets runningTimerBrickId ─────────────────────────

describe("U-m4c-001: START_TIMER sets runningTimerBrickId to brickId", () => {
  it("sets runningTimerBrickId to t1; brick minutesDone unchanged; categories/looseBricks same ref", () => {
    const cats = [{ id: "c1", name: "Health", color: "#34d399" }];
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
              id: "t1",
              name: "Read",
              kind: "time",
              durationMin: 25,
              minutesDone: 0,
              categoryId: null,
              parentBlockId: "block-1",
            },
          ],
        },
      ],
      categories: cats,
      looseBricks: [],
      runningTimerBrickId: null,
    };
    const next = reducer(state, { type: "START_TIMER", brickId: "t1" });
    expect(next.runningTimerBrickId).toBe("t1");
    // brick minutesDone unchanged
    if (next.blocks[0].bricks[0].kind === "time") {
      expect(next.blocks[0].bricks[0].minutesDone).toBe(0);
    }
    // categories and looseBricks preserve referential equality
    expect(next.categories).toBe(cats);
    expect(next.looseBricks).toBe(state.looseBricks);
  });
});

// ─── U-m4c-002: START_TIMER while another timer running swaps id ──────────────

describe("U-m4c-002: START_TIMER while another timer is running swaps runningTimerBrickId", () => {
  it("runningTimerBrickId becomes t2; no separate STOP_TIMER needed; minutesDone unchanged", () => {
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
              id: "t1",
              name: "Read",
              kind: "time",
              durationMin: 25,
              minutesDone: 3,
              categoryId: null,
              parentBlockId: "block-1",
            },
            {
              id: "t2",
              name: "Write",
              kind: "time",
              durationMin: 30,
              minutesDone: 0,
              categoryId: null,
              parentBlockId: "block-1",
            },
          ],
        },
      ],
      categories: [],
      looseBricks: [],
      runningTimerBrickId: "t1",
    };
    const next = reducer(state, { type: "START_TIMER", brickId: "t2" });
    expect(next.runningTimerBrickId).toBe("t2");
    // t1's minutesDone stays as the last captured value
    if (next.blocks[0].bricks[0].kind === "time") {
      expect(next.blocks[0].bricks[0].minutesDone).toBe(3);
    }
    // t2's minutesDone unchanged
    if (next.blocks[0].bricks[1].kind === "time") {
      expect(next.blocks[0].bricks[1].minutesDone).toBe(0);
    }
  });
});

// ─── U-m4c-003: START_TIMER re-starting already-running brick is a no-op ──────

describe("U-m4c-003: START_TIMER re-start already-running brick returns same state reference", () => {
  it("Object.is(out, state) === true when brickId matches runningTimerBrickId", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      runningTimerBrickId: "t1",
    };
    const next = reducer(state, { type: "START_TIMER", brickId: "t1" });
    expect(Object.is(next, state)).toBe(true);
  });
});

// ─── U-m4c-004: STOP_TIMER clears runningTimerBrickId ────────────────────────

describe("U-m4c-004: STOP_TIMER sets runningTimerBrickId to null", () => {
  it("runningTimerBrickId becomes null after STOP_TIMER for running brick", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      runningTimerBrickId: "t1",
    };
    const next = reducer(state, { type: "STOP_TIMER", brickId: "t1" });
    expect(next.runningTimerBrickId).toBeNull();
  });
});

// ─── U-m4c-005: STOP_TIMER no-op when null or mismatched ─────────────────────

describe("U-m4c-005: STOP_TIMER is a no-op when no timer running or id mismatched", () => {
  it("returns same reference when runningTimerBrickId is null", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      runningTimerBrickId: null,
    };
    const next = reducer(state, { type: "STOP_TIMER", brickId: "t1" });
    expect(Object.is(next, state)).toBe(true);
  });

  it("returns same reference when brickId does not match running brick (t1 running, t2 stopped)", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      runningTimerBrickId: "t1",
    };
    const next = reducer(state, { type: "STOP_TIMER", brickId: "t2" });
    expect(Object.is(next, state)).toBe(true);
  });
});

// ─── U-m4c-006: TICK_TIMER writes minutesDone; array identity preserved ───────

describe("U-m4c-006: TICK_TIMER updates brick minutesDone; categories and looseBricks same ref", () => {
  it("brick minutesDone becomes 7; categories same ref; looseBricks same ref", () => {
    const cats = [{ id: "c1", name: "Health", color: "#34d399" }];
    const loose: AppState["looseBricks"] = [];
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
              id: "t1",
              name: "Read",
              kind: "time",
              durationMin: 25,
              minutesDone: 5,
              categoryId: null,
              parentBlockId: "block-1",
            },
          ],
        },
      ],
      categories: cats,
      looseBricks: loose,
      runningTimerBrickId: "t1",
    };
    const next = reducer(state, {
      type: "TICK_TIMER",
      brickId: "t1",
      minutesDone: 7,
    });
    if (next.blocks[0].bricks[0].kind === "time") {
      expect(next.blocks[0].bricks[0].minutesDone).toBe(7);
    }
    expect(next.runningTimerBrickId).toBe("t1");
    expect(next.categories).toBe(cats);
    expect(next.looseBricks).toBe(loose);
    // blocks array reference changed (new brick mutated)
    expect(next.blocks).not.toBe(state.blocks);
  });
});

// ─── U-m4c-007: TICK_TIMER identity short-circuit when minutesDone unchanged ──

describe("U-m4c-007: TICK_TIMER returns same state reference when minutesDone is unchanged", () => {
  it("Object.is(out, state) === true when minutesDone === 7 and dispatch carries 7", () => {
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
              id: "t1",
              name: "Read",
              kind: "time",
              durationMin: 25,
              minutesDone: 7,
              categoryId: null,
              parentBlockId: "block-1",
            },
          ],
        },
      ],
      categories: [],
      looseBricks: [],
      runningTimerBrickId: "t1",
    };
    const next = reducer(state, {
      type: "TICK_TIMER",
      brickId: "t1",
      minutesDone: 7,
    });
    expect(Object.is(next, state)).toBe(true);
  });
});

// ─── U-m4c-008: TICK_TIMER no-op when kind !== "time" ────────────────────────

describe("U-m4c-008: TICK_TIMER is a no-op when the matching brick has kind !== 'time'", () => {
  it("returns same reference when brickId matches a tick brick", () => {
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
              id: "tk1",
              name: "exercise",
              kind: "tick",
              done: false,
              categoryId: null,
              parentBlockId: "block-1",
            },
            {
              id: "t1",
              name: "Read",
              kind: "time",
              durationMin: 25,
              minutesDone: 0,
              categoryId: null,
              parentBlockId: "block-1",
            },
          ],
        },
      ],
      categories: [],
      looseBricks: [],
      runningTimerBrickId: null,
    };
    const next = reducer(state, {
      type: "TICK_TIMER",
      brickId: "tk1",
      minutesDone: 7,
    });
    expect(Object.is(next, state)).toBe(true);
  });
});

// ─── U-m4c-009: SET_TIMER_MINUTES clamp + identity short-circuit ─────────────

describe("U-m4c-009: SET_TIMER_MINUTES clamps to [0, durationMin] and identity short-circuits", () => {
  function makeTimerState(minutesDone: number, inLoose = false): AppState {
    const brick = {
      id: "t1",
      name: "Read",
      kind: "time" as const,
      durationMin: 25,
      minutesDone,
      categoryId: null,
      parentBlockId: inLoose ? null : "block-1",
    };
    if (inLoose) {
      return {
        blocks: [],
        categories: [],
        looseBricks: [brick],
        runningTimerBrickId: null,
      };
    }
    return {
      blocks: [
        {
          id: "block-1",
          name: "block 1",
          start: "09:00",
          recurrence: { kind: "just-today", date: "2026-05-06" },
          categoryId: null,
          bricks: [brick],
        },
      ],
      categories: [],
      looseBricks: [],
      runningTimerBrickId: null,
    };
  }

  it("in-range minutes: minutesDone set to 12 on loose brick", () => {
    const state = makeTimerState(5, true);
    const next = reducer(state, {
      type: "SET_TIMER_MINUTES",
      brickId: "t1",
      minutes: 12,
    });
    if (next.looseBricks[0].kind === "time") {
      expect(next.looseBricks[0].minutesDone).toBe(12);
    }
  });

  it("overflow minutes: clamped to durationMin (25) when minutes=30", () => {
    const state = makeTimerState(5, true);
    const next = reducer(state, {
      type: "SET_TIMER_MINUTES",
      brickId: "t1",
      minutes: 30,
    });
    if (next.looseBricks[0].kind === "time") {
      expect(next.looseBricks[0].minutesDone).toBe(25);
    }
  });

  it("under-zero minutes: clamped to 0 when minutes=-3", () => {
    const state = makeTimerState(5, true);
    const next = reducer(state, {
      type: "SET_TIMER_MINUTES",
      brickId: "t1",
      minutes: -3,
    });
    if (next.looseBricks[0].kind === "time") {
      expect(next.looseBricks[0].minutesDone).toBe(0);
    }
  });

  it("identity short-circuit: same reference when minutes === current minutesDone", () => {
    const state = makeTimerState(12, true);
    const next = reducer(state, {
      type: "SET_TIMER_MINUTES",
      brickId: "t1",
      minutes: 12,
    });
    expect(Object.is(next, state)).toBe(true);
  });
});

// ─── U-m4c-010: AppState requires runningTimerBrickId; defaultState includes it ─

describe("U-m4c-010: defaultState() includes runningTimerBrickId: null", () => {
  it("defaultState returns runningTimerBrickId: null", () => {
    const s = defaultState();
    expect(s.runningTimerBrickId).toBeNull();
  });

  it("defaultState deep-equal includes all fields including runningTimerBrickId", () => {
    const s = defaultState();
    expect(s).toEqual({
      blocks: [],
      categories: [],
      looseBricks: [],
      runningTimerBrickId: null,
    });
  });
});

// ─── U-m4c-011: assertNever exhaustiveness preserved with 4 new union members ──

describe("U-m4c-011: assertNever fires for unknown action (exhaustiveness with M4c actions)", () => {
  it("default branch throws for unknown action type cast through any", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      runningTimerBrickId: null,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => reducer(state, { type: "NOPE" } as any)).toThrow();
  });
});

// ─── U-m4e-015: ADD_BRICK happy path with hasDuration:true ───────────────────

describe("U-m4e-015: ADD_BRICK with hasDuration:true and all three fields present — appends to looseBricks", () => {
  it("stores brick with hasDuration:true, start, end, recurrence in looseBricks", () => {
    const state: AppState = {
      blocks: [],
      categories: [],
      looseBricks: [],
      runningTimerBrickId: null,
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
      expect(saved.recurrence).toEqual({ kind: "just-today", date: "2026-05-14" });
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
      runningTimerBrickId: null,
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
      runningTimerBrickId: null,
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
      runningTimerBrickId: null,
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
      runningTimerBrickId: null,
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
      runningTimerBrickId: null,
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
      runningTimerBrickId: null,
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
      runningTimerBrickId: null,
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
      runningTimerBrickId: null,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => reducer(state, { type: "NOPE" } as any)).toThrow();
  });

  it("defaultState() deep-equal matches expected shape (no new AppState fields in M4e)", () => {
    const s = defaultState();
    expect(s).toEqual({
      blocks: [],
      categories: [],
      looseBricks: [],
      runningTimerBrickId: null,
    });
  });
});
