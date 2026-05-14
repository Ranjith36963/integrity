// lib/overlap.test.ts — M4e unit tests for the pure overlap engine.
// Covers U-m4e-001..014.

import { describe, it, expect } from "vitest";
import {
  intervalsOverlap,
  findOverlaps,
  selectAllTimedItems,
  selectTrayBricks,
  selectTimelineItems,
  type TimedItem,
} from "./overlap";
import type { AppState, Block, Brick } from "./types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeState(partial: Partial<AppState> = {}): AppState {
  return {
    blocks: [],
    categories: [],
    looseBricks: [],
    runningTimerBrickId: null,
    ...partial,
  };
}

function makeBlock(
  id: string,
  start: string,
  end: string | undefined,
  name = "Block",
): Block {
  return {
    id,
    name,
    start,
    end,
    recurrence: { kind: "just-today", date: "2026-05-14" },
    categoryId: null,
    bricks: [],
  };
}

function makeTimedLooseBrick(
  id: string,
  start: string,
  end: string,
  kind: "tick" | "goal" | "time" = "tick",
  name = "Brick",
): Brick {
  if (kind === "goal") {
    return {
      id,
      name,
      kind: "goal",
      target: 5,
      count: 0,
      unit: "",
      categoryId: null,
      parentBlockId: null,
      hasDuration: true,
      start,
      end,
      recurrence: { kind: "just-today", date: "2026-05-14" },
    };
  }
  if (kind === "time") {
    return {
      id,
      name,
      kind: "time",
      durationMin: 30,
      minutesDone: 0,
      categoryId: null,
      parentBlockId: null,
      hasDuration: true,
      start,
      end,
      recurrence: { kind: "just-today", date: "2026-05-14" },
    };
  }
  return {
    id,
    name,
    kind: "tick",
    done: false,
    categoryId: null,
    parentBlockId: null,
    hasDuration: true,
    start,
    end,
    recurrence: { kind: "just-today", date: "2026-05-14" },
  };
}

function makeUntimedLooseBrick(id: string, name = "Brick"): Brick {
  return {
    id,
    name,
    kind: "tick",
    done: false,
    categoryId: null,
    parentBlockId: null,
    hasDuration: false,
  };
}

// ─── U-m4e-001: classic overlap ───────────────────────────────────────────────

describe("U-m4e-001: intervalsOverlap — classic overlap (b starts before a ends)", () => {
  it("returns true when intervals overlap", () => {
    const a = { start: "09:00", end: "10:00" };
    const b = { start: "09:30", end: "10:30" };
    expect(intervalsOverlap(a, b)).toBe(true);
  });

  it("is symmetric: intervalsOverlap(b, a) also returns true", () => {
    const a = { start: "09:00", end: "10:00" };
    const b = { start: "09:30", end: "10:30" };
    expect(intervalsOverlap(b, a)).toBe(true);
  });
});

// ─── U-m4e-002: touching boundary — NOT an overlap (half-open) ───────────────

describe("U-m4e-002: intervalsOverlap — touching boundary is not an overlap (ADR-006)", () => {
  it("returns false when a.end === b.start (back-to-back)", () => {
    const a = { start: "09:00", end: "10:00" };
    const b = { start: "10:00", end: "11:00" };
    expect(intervalsOverlap(a, b)).toBe(false);
  });

  it("is symmetric: intervalsOverlap(b, a) also returns false", () => {
    const a = { start: "09:00", end: "10:00" };
    const b = { start: "10:00", end: "11:00" };
    expect(intervalsOverlap(b, a)).toBe(false);
  });
});

// ─── U-m4e-003: no overlap (separated) ───────────────────────────────────────

describe("U-m4e-003: intervalsOverlap — no overlap when intervals are separated", () => {
  it("returns false when a.end <= b.start with gap between", () => {
    const a = { start: "09:00", end: "09:30" };
    const b = { start: "10:00", end: "10:30" };
    expect(intervalsOverlap(a, b)).toBe(false);
  });
});

// ─── U-m4e-004: identical intervals ──────────────────────────────────────────

describe("U-m4e-004: intervalsOverlap — identical non-degenerate intervals overlap", () => {
  it("returns true for identical non-empty intervals", () => {
    const a = { start: "09:00", end: "10:00" };
    const b = { start: "09:00", end: "10:00" };
    expect(intervalsOverlap(a, b)).toBe(true);
  });
});

// ─── U-m4e-005: containment ───────────────────────────────────────────────────

describe("U-m4e-005: intervalsOverlap — fully contained intervals overlap", () => {
  it("returns true when b is fully inside a", () => {
    const a = { start: "09:00", end: "11:00" };
    const b = { start: "09:30", end: "10:30" };
    expect(intervalsOverlap(a, b)).toBe(true);
  });

  it("is symmetric: intervalsOverlap(b, a) also returns true", () => {
    const a = { start: "09:00", end: "11:00" };
    const b = { start: "09:30", end: "10:30" };
    expect(intervalsOverlap(b, a)).toBe(true);
  });
});

// ─── U-m4e-006: findOverlaps — multi-collision, sorted ───────────────────────

describe("U-m4e-006: findOverlaps — returns all overlapping items sorted by start asc", () => {
  it("returns b1 and b2, excludes b3", () => {
    const candidate = { start: "09:30", end: "10:30" };
    const items: TimedItem[] = [
      {
        kind: "block",
        id: "b1",
        start: "09:00",
        end: "10:00",
        name: "A",
        categoryId: null,
      },
      {
        kind: "block",
        id: "b2",
        start: "10:00",
        end: "11:00",
        name: "B",
        categoryId: null,
      },
      {
        kind: "block",
        id: "b3",
        start: "12:00",
        end: "13:00",
        name: "C",
        categoryId: null,
      },
    ];
    const result = findOverlaps(candidate, items);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("b1");
    expect(result[1].id).toBe("b2");
  });
});

// ─── U-m4e-007: findOverlaps — sort tiebreakers (kind then name) ─────────────

describe("U-m4e-007: findOverlaps — sort tiebreaker: kind (block before brick), then name", () => {
  it("block before brick when both start at same time", () => {
    const candidate = { start: "09:30", end: "10:30" };
    const items: TimedItem[] = [
      {
        kind: "block",
        id: "b1",
        start: "09:00",
        end: "10:00",
        name: "A",
        categoryId: null,
      },
      {
        kind: "brick",
        id: "r1",
        start: "09:00",
        end: "10:00",
        name: "B",
        categoryId: null,
      },
    ];
    const result = findOverlaps(candidate, items);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("b1");
    expect(result[1].id).toBe("r1");
  });

  it("two blocks with same start are sorted by name alphabetic", () => {
    const candidate = { start: "09:30", end: "10:30" };
    const items: TimedItem[] = [
      {
        kind: "block",
        id: "b1",
        start: "09:00",
        end: "10:00",
        name: "A",
        categoryId: null,
      },
      {
        kind: "brick",
        id: "r1",
        start: "09:00",
        end: "10:00",
        name: "B",
        categoryId: null,
      },
      {
        kind: "block",
        id: "b2",
        start: "09:00",
        end: "10:00",
        name: "AA",
        categoryId: null,
      },
    ];
    const result = findOverlaps(candidate, items);
    expect(result).toHaveLength(3);
    // order: b2 (AA), b1 (A), r1 (B) — blocks first, then alphabetic within kind
    expect(result[0].id).toBe("b2"); // AA
    expect(result[1].id).toBe("b1"); // A
    expect(result[2].id).toBe("r1"); // brick B
  });
});

// ─── U-m4e-008: findOverlaps — excludeId filter ──────────────────────────────

describe("U-m4e-008: findOverlaps — excludeId filters self out", () => {
  it("excludes the item with excludeId from results", () => {
    const candidate = { start: "09:30", end: "10:30" };
    const items: TimedItem[] = [
      {
        kind: "block",
        id: "self",
        start: "09:00",
        end: "10:00",
        name: "Self",
        categoryId: null,
      },
      {
        kind: "block",
        id: "other",
        start: "09:00",
        end: "10:00",
        name: "Other",
        categoryId: null,
      },
    ];
    const result = findOverlaps(candidate, items, "self");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("other");
  });

  it("undefined excludeId returns both items", () => {
    const candidate = { start: "09:30", end: "10:30" };
    const items: TimedItem[] = [
      {
        kind: "block",
        id: "self",
        start: "09:00",
        end: "10:00",
        name: "Self",
        categoryId: null,
      },
      {
        kind: "block",
        id: "other",
        start: "09:00",
        end: "10:00",
        name: "Other",
        categoryId: null,
      },
    ];
    const result = findOverlaps(candidate, items, undefined);
    expect(result).toHaveLength(2);
  });
});

// ─── U-m4e-009: findOverlaps — empty items list ──────────────────────────────

describe("U-m4e-009: findOverlaps — empty items list returns empty array", () => {
  it("returns [] without throwing", () => {
    const result = findOverlaps({ start: "09:00", end: "10:00" }, []);
    expect(result).toEqual([]);
  });
});

// ─── U-m4e-010: selectAllTimedItems ──────────────────────────────────────────

describe("U-m4e-010: selectAllTimedItems — collects blocks with end + bricks with hasDuration", () => {
  it("returns 3 items: b1 (block), n1 (nested brick), r1 (loose timed brick); excludes b2 (no-end) and r2 (no duration)", () => {
    const n1: Brick = {
      id: "n1",
      name: "Nested",
      kind: "time",
      durationMin: 30,
      minutesDone: 0,
      categoryId: null,
      parentBlockId: "b1",
      hasDuration: true,
      start: "09:15",
      end: "09:45",
      recurrence: { kind: "just-today", date: "2026-05-14" },
    };
    const b1 = makeBlock("b1", "09:00", "10:00");
    b1.bricks = [n1];
    const b2 = makeBlock("b2", "11:00", undefined); // no end
    const r1 = makeTimedLooseBrick("r1", "09:30", "10:30", "tick", "Run");
    const r2: Brick = {
      id: "r2",
      name: "Goal",
      kind: "goal",
      target: 5,
      count: 0,
      unit: "",
      categoryId: null,
      parentBlockId: null,
      hasDuration: false,
    };

    const state = makeState({ blocks: [b1, b2], looseBricks: [r1, r2] });
    const result = selectAllTimedItems(state);

    expect(result).toHaveLength(3);
    const ids = result.map((i) => i.id);
    expect(ids).toContain("b1");
    expect(ids).toContain("n1");
    expect(ids).toContain("r1");
    expect(ids).not.toContain("b2");
    expect(ids).not.toContain("r2");

    // Check each item's discriminant
    const blockItem = result.find((i) => i.id === "b1");
    expect(blockItem?.kind).toBe("block");
    const nestedItem = result.find((i) => i.id === "n1");
    expect(nestedItem?.kind).toBe("brick");
    const looseItem = result.find((i) => i.id === "r1");
    expect(looseItem?.kind).toBe("brick");
  });
});

// ─── U-m4e-011: empty state — all three selectors return [] ──────────────────

describe("U-m4e-011: empty state — all selectors return []", () => {
  it("selectAllTimedItems returns []", () => {
    expect(selectAllTimedItems(makeState())).toEqual([]);
  });

  it("selectTrayBricks returns []", () => {
    expect(selectTrayBricks(makeState())).toEqual([]);
  });

  it("selectTimelineItems returns []", () => {
    expect(selectTimelineItems(makeState())).toEqual([]);
  });
});

// ─── U-m4e-012: selectTrayBricks — filters out timed bricks ─────────────────

describe("U-m4e-012: selectTrayBricks — keeps only hasDuration !== true bricks", () => {
  it("returns r1 and r3, excludes r2 (hasDuration:true)", () => {
    const r1 = makeUntimedLooseBrick("r1");
    const r2 = makeTimedLooseBrick("r2", "10:00", "11:00");
    const r3 = makeUntimedLooseBrick("r3");
    const state = makeState({ looseBricks: [r1, r2, r3] });

    const result = selectTrayBricks(state);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("r1");
    expect(result[1].id).toBe("r3");
  });
});

// ─── U-m4e-013: selectTimelineItems — union sorted by start ──────────────────

describe("U-m4e-013: selectTimelineItems — union of blocks + timed loose bricks sorted by start asc", () => {
  it("returns 4 items sorted by start asc (b2@08, r1@09, b1@10, r3@11)", () => {
    const b1 = makeBlock("b1", "10:00", "11:00");
    const b2 = makeBlock("b2", "08:00", "09:00");
    const r1 = makeTimedLooseBrick("r1", "09:00", "09:30");
    const r2 = makeUntimedLooseBrick("r2"); // excluded
    const r3 = makeTimedLooseBrick("r3", "11:00", "11:30");

    const state = makeState({
      blocks: [b1, b2],
      looseBricks: [r1, r2, r3],
    });

    const result = selectTimelineItems(state);
    expect(result).toHaveLength(4);

    // Check kinds
    expect(result[0].kind).toBe("block");
    expect(result[1].kind).toBe("brick");
    expect(result[2].kind).toBe("block");
    expect(result[3].kind).toBe("brick");

    // Check ids (sorted by start)
    if (result[0].kind === "block") expect(result[0].block.id).toBe("b2");
    if (result[1].kind === "brick") expect(result[1].brick.id).toBe("r1");
    if (result[2].kind === "block") expect(result[2].block.id).toBe("b1");
    if (result[3].kind === "brick") expect(result[3].brick.id).toBe("r3");
  });
});

// ─── U-m4e-014: selectTimelineItems — defensive guard for malformed brick ────

describe("U-m4e-014: selectTimelineItems + selectAllTimedItems — defensive guard for brick with hasDuration true but no start", () => {
  it("excludes malformed brick from selectTimelineItems", () => {
    const malformed: Brick = {
      id: "bad",
      name: "Bad",
      kind: "tick",
      done: false,
      categoryId: null,
      parentBlockId: null,
      hasDuration: true,
      // start is intentionally absent here (simulated malformed shape)
      end: "10:30",
      recurrence: { kind: "just-today", date: "2026-05-14" },
    };
    // We cast to any to bypass TS and simulate a runtime malformed shape
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- simulating pre-invariant brick to test defensive guard
    const state = makeState({ looseBricks: [malformed as any] });

    const timelineItems = selectTimelineItems(state);
    expect(timelineItems.find((i) => i.kind === "brick" && i.brick.id === "bad")).toBeUndefined();

    const allTimed = selectAllTimedItems(state);
    expect(allTimed.find((i) => i.id === "bad")).toBeUndefined();
  });
});
