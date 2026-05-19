/**
 * lib/currentDayBlocks.test.ts — M5 unit tests for currentDayBlocks.
 * Covers U-m5-013..014.
 *
 * currentDayBlocks(state) filters state.blocks by state.deletions (ADR-047):
 *   return state.blocks.filter(b => !state.deletions[`${state.currentDate}:${b.id}`])
 * It does NOT filter by appliesOn (deferred, per plan.md § Day-render wiring resolution (a)).
 */

import { describe, it, expect } from "vitest";
import { currentDayBlocks } from "./currentDayBlocks";
import type { AppState, Block } from "./types";

// ─── fixtures ────────────────────────────────────────────────────────────────

const blkRecur: Block = {
  id: "blk-recur",
  name: "Morning Run",
  start: "07:00",
  recurrence: { kind: "every-day" },
  categoryId: null,
  bricks: [],
};

const blkOnce: Block = {
  id: "blk-once",
  name: "Dentist",
  start: "10:00",
  recurrence: { kind: "just-today", date: "2026-05-18" },
  categoryId: null,
  bricks: [],
};

const blkRange: Block = {
  id: "blk-range",
  name: "Evening Walk",
  start: "18:00",
  recurrence: { kind: "every-day" },
  categoryId: null,
  bricks: [],
};

function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    programStart: "2026-05-01",
    currentDate: "2026-05-18",
    history: {},
    blocks: [blkRecur, blkOnce],
    categories: [],
    looseBricks: [],
    deletions: {},
    ...overrides,
  };
}

// ─── U-m5-013: drops a keyed block, keeps others, specificity ─────────────────

describe("U-m5-013: currentDayBlocks — drops a block keyed in deletions for currentDate, keeps every other", () => {
  it("returns only blk-once when deletions has currentDate:blk-recur key", () => {
    const state = makeState({
      deletions: { "2026-05-18:blk-recur": true },
    });
    const result = currentDayBlocks(state);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("blk-once");
  });

  it("a deletions key for a DIFFERENT date does NOT suppress today (specificity)", () => {
    // yesterday's key — should not suppress today
    const state = makeState({
      deletions: { "2026-05-17:blk-recur": true },
    });
    const result = currentDayBlocks(state);
    expect(result).toHaveLength(2);
    expect(result.map((b) => b.id)).toContain("blk-recur");
    expect(result.map((b) => b.id)).toContain("blk-once");
  });

  it("a deletions key for a block id not in state.blocks is harmless — it suppresses nothing", () => {
    const state = makeState({
      deletions: { "2026-05-18:nonexistent-block": true },
    });
    const result = currentDayBlocks(state);
    expect(result).toHaveLength(2);
  });

  it("suppresses a block only via the exact ${currentDate}:${id} join key", () => {
    // substring match on just the id without the date prefix must NOT suppress
    const state = makeState({
      deletions: {
        "blk-recur": true as unknown as true, // wrong key format — no date prefix
      },
    });
    const result = currentDayBlocks(state);
    // blk-recur is still returned because the key format is wrong
    expect(result.map((b) => b.id)).toContain("blk-recur");
  });

  it("returns a Block[] — the suppressed block is fully absent from the return value", () => {
    const state = makeState({
      deletions: {
        "2026-05-18:blk-recur": true,
        "2026-05-18:blk-once": true,
      },
    });
    const result = currentDayBlocks(state);
    expect(result).toHaveLength(0);
  });

  it("mutation-resistant — calling currentDayBlocks does not mutate state.blocks", () => {
    const state = makeState({
      deletions: { "2026-05-18:blk-recur": true },
    });
    const originalLength = state.blocks.length;
    currentDayBlocks(state);
    expect(state.blocks).toHaveLength(originalLength);
  });
});

// ─── U-m5-014: empty deletions is the identity filter; pure and immutable ─────

describe("U-m5-014: currentDayBlocks — empty deletions is identity filter; pure and immutable", () => {
  it("empty deletions returns all blocks in state.blocks order", () => {
    const state = makeState({
      blocks: [blkRecur, blkOnce, blkRange],
      deletions: {},
    });
    const result = currentDayBlocks(state);
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("blk-recur");
    expect(result[1].id).toBe("blk-once");
    expect(result[2].id).toBe("blk-range");
  });

  it("does not throw under a deeply frozen state", () => {
    const frozenDeletions = Object.freeze({}) as Record<string, true>;
    const frozenBlocks = Object.freeze([
      Object.freeze({ ...blkRecur }),
      Object.freeze({ ...blkOnce }),
      Object.freeze({ ...blkRange }),
    ]) as unknown as Block[];
    const frozenState = Object.freeze({
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: Object.freeze({}),
      blocks: frozenBlocks,
      categories: Object.freeze([]),
      looseBricks: Object.freeze([]),
      deletions: frozenDeletions,
    }) as unknown as AppState;

    expect(() => currentDayBlocks(frozenState)).not.toThrow();
    const result = currentDayBlocks(frozenState);
    expect(result).toHaveLength(3);
  });

  it("two calls with the same state return deep-equal results (pure — no clock read)", () => {
    const state = makeState({
      blocks: [blkRecur, blkOnce, blkRange],
      deletions: {},
    });
    const result1 = currentDayBlocks(state);
    const result2 = currentDayBlocks(state);
    expect(result1).toEqual(result2);
  });

  it("state is not mutated after two calls", () => {
    const state = makeState({
      blocks: [blkRecur, blkOnce, blkRange],
      deletions: {},
    });
    currentDayBlocks(state);
    currentDayBlocks(state);
    expect(state.blocks).toHaveLength(3);
    expect(state.deletions).toEqual({});
  });
});
