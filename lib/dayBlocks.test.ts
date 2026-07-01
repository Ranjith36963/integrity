import { describe, it, expect } from "vitest";
import { dayBlocksFor } from "./dayBlocks";
import type { AppState, Block, Category } from "./types";

const cat: Category = { id: "c1", name: "Work", color: "#38bdf8" };
function blk(id: string): Block {
  return {
    id,
    name: id,
    start: "09:00",
    end: "10:00",
    recurrence: { kind: "every-day" },
    categoryId: "c1",
    bricks: [],
  };
}

function baseState(over: Partial<AppState> = {}): AppState {
  return {
    blocks: [],
    categories: [cat],
    looseBricks: [],
    programStart: "2026-06-01",
    currentDate: "2026-07-01",
    history: {},
    deletions: {},
    ...over,
  };
}

describe("dayBlocksFor", () => {
  it("returns today's live blocks + current categories for the current date", () => {
    const state = baseState({ blocks: [blk("t1")] });
    const { blocks, categories } = dayBlocksFor(state, "2026-07-01");
    expect(blocks.map((b) => b.id)).toEqual(["t1"]);
    expect(categories).toEqual([cat]);
  });

  it("respects today's deletions", () => {
    const state = baseState({
      blocks: [blk("t1"), blk("t2")],
      deletions: { "2026-07-01:t2": true },
    });
    const { blocks } = dayBlocksFor(state, "2026-07-01");
    expect(blocks.map((b) => b.id)).toEqual(["t1"]);
  });

  it("returns the archived snapshot for a past day", () => {
    const archivedCat: Category = { id: "cA", name: "Old", color: "#111" };
    const state = baseState({
      history: {
        "2026-06-30": {
          blocks: [blk("h1")],
          categories: [archivedCat],
          looseBricks: [],
        },
      },
    });
    const { blocks, categories } = dayBlocksFor(state, "2026-06-30");
    expect(blocks.map((b) => b.id)).toEqual(["h1"]);
    expect(categories).toEqual([archivedCat]);
  });

  it("returns empty for a future / missing day", () => {
    const state = baseState();
    const { blocks, categories } = dayBlocksFor(state, "2026-12-25");
    expect(blocks).toEqual([]);
    expect(categories).toEqual([]);
  });
});
