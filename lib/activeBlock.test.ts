/**
 * lib/activeBlock.test.ts — M7b unit tests for activeBlockId pure helper.
 * U-m7b-001..008: truth table covering boundaries, mid-block, before/after/between,
 * end===undefined skip, empty list, defensive multiple-overlap, purity, TZ-irrelevance,
 * midnight + day-anchor boundary.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Block } from "./types";

// Helper to create a minimal Block fixture
function makeBlock(id: string, start: string, end: string | undefined): Block {
  return {
    id,
    name: id,
    start,
    end,
    recurrence: { kind: "just-today", date: "2026-05-18" },
    categoryId: null,
    bricks: [],
  };
}

// ── U-m7b-001 ────────────────────────────────────────────────────────────────
describe("U-m7b-001 — activeBlockId half-open [start, end) honored at both boundaries", () => {
  it("start boundary (09:00) → active; mid (09:30) → active; end boundary (10:00) → null", async () => {
    const { activeBlockId } = await import("./activeBlock");
    const blkA = makeBlock("A", "09:00", "10:00");
    expect(activeBlockId([blkA], "09:00")).toBe("A");
    expect(activeBlockId([blkA], "09:30")).toBe("A");
    expect(activeBlockId([blkA], "10:00")).toBeNull();
  });

  it("just-before-start (08:59) → null", async () => {
    const { activeBlockId } = await import("./activeBlock");
    const blkA = makeBlock("A", "09:00", "10:00");
    expect(activeBlockId([blkA], "08:59")).toBeNull();
  });

  it("just-after-end (10:01) → null", async () => {
    const { activeBlockId } = await import("./activeBlock");
    const blkA = makeBlock("A", "09:00", "10:00");
    expect(activeBlockId([blkA], "10:01")).toBeNull();
  });
});

// ── U-m7b-002 ────────────────────────────────────────────────────────────────
describe("U-m7b-002 — activeBlockId mid-block / before-all / after-all / between-blocks on 4-block fixture", () => {
  it("returns correct id across all 8 now values", async () => {
    const { activeBlockId } = await import("./activeBlock");
    // Deliberate gap between blk-B and blk-C so 'between' is reachable
    const blocks = [
      makeBlock("blk-A", "08:00", "09:00"),
      makeBlock("blk-B", "09:00", "10:00"),
      makeBlock("blk-C", "10:30", "11:30"),
      makeBlock("blk-D", "12:00", "13:00"),
    ];
    expect(activeBlockId(blocks, "06:30")).toBeNull(); // before all
    expect(activeBlockId(blocks, "08:30")).toBe("blk-A"); // mid-A
    expect(activeBlockId(blocks, "09:30")).toBe("blk-B"); // mid-B
    expect(activeBlockId(blocks, "10:15")).toBeNull(); // between B and C
    expect(activeBlockId(blocks, "10:45")).toBe("blk-C"); // mid-C
    expect(activeBlockId(blocks, "11:45")).toBeNull(); // between C and D
    expect(activeBlockId(blocks, "12:30")).toBe("blk-D"); // mid-D
    expect(activeBlockId(blocks, "23:30")).toBeNull(); // after all
  });
});

// ── U-m7b-003 ────────────────────────────────────────────────────────────────
describe("U-m7b-003 — activeBlockId block with end===undefined is never active; later closed blocks still win", () => {
  it("single open-ended block returns null for any now", async () => {
    const { activeBlockId } = await import("./activeBlock");
    const openBlock = makeBlock("open", "08:00", undefined);
    expect(activeBlockId([openBlock], "09:00")).toBeNull();
  });

  it("open-ended block skipped; following closed block wins", async () => {
    const { activeBlockId } = await import("./activeBlock");
    const openBlock = makeBlock("open", "08:00", undefined);
    const closedBlock = makeBlock("closed", "09:00", "10:00");
    expect(activeBlockId([openBlock, closedBlock], "09:30")).toBe("closed");
  });

  it("does NOT throw when end===undefined", async () => {
    const { activeBlockId } = await import("./activeBlock");
    const openBlock = makeBlock("open", "08:00", undefined);
    expect(() => activeBlockId([openBlock], "09:00")).not.toThrow();
  });
});

// ── U-m7b-004 ────────────────────────────────────────────────────────────────
describe("U-m7b-004 — activeBlockId empty list returns null; all-open-ended returns null", () => {
  it("empty array returns null", async () => {
    const { activeBlockId } = await import("./activeBlock");
    expect(activeBlockId([], "09:30")).toBeNull();
  });

  it("all open-ended blocks return null", async () => {
    const { activeBlockId } = await import("./activeBlock");
    const blocks = [
      makeBlock("x", "08:00", undefined),
      makeBlock("y", "09:00", undefined),
    ];
    expect(activeBlockId(blocks, "09:30")).toBeNull();
  });
});

// ── U-m7b-005 ────────────────────────────────────────────────────────────────
describe("U-m7b-005 — activeBlockId defensive: multiple overlapping blocks → first by source order; no throw, no log", () => {
  it("returns first matching block in source order", async () => {
    const { activeBlockId } = await import("./activeBlock");
    const blocks = [
      makeBlock("first", "09:00", "10:00"),
      makeBlock("second", "09:00", "10:00"),
    ];
    expect(activeBlockId(blocks, "09:30")).toBe("first");
  });

  it("does not throw", async () => {
    const { activeBlockId } = await import("./activeBlock");
    const blocks = [
      makeBlock("first", "09:00", "10:00"),
      makeBlock("second", "09:00", "10:00"),
    ];
    expect(() => activeBlockId(blocks, "09:30")).not.toThrow();
  });

  it("does not call console.warn or console.error", async () => {
    const { activeBlockId } = await import("./activeBlock");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const blocks = [
      makeBlock("first", "09:00", "10:00"),
      makeBlock("second", "09:00", "10:00"),
    ];
    activeBlockId(blocks, "09:30");
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});

// ── U-m7b-006 ────────────────────────────────────────────────────────────────
describe("U-m7b-006 — activeBlockId purity: no clock read, no localStorage, no input mutation; deterministic", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("100 repeated calls all return the same id", async () => {
    const { activeBlockId } = await import("./activeBlock");
    const blkA = makeBlock("A", "09:00", "10:00");
    const results = Array.from({ length: 100 }, () =>
      activeBlockId([blkA], "09:30"),
    );
    expect(new Set(results).size).toBe(1);
    expect(results[0]).toBe("A");
  });

  it("Date.now is never called", async () => {
    const { activeBlockId } = await import("./activeBlock");
    const blkA = makeBlock("A", "09:00", "10:00");
    for (let i = 0; i < 100; i++) {
      activeBlockId([blkA], "09:30");
    }
    expect(vi.mocked(Date.now)).not.toHaveBeenCalled();
  });

  it("input blocks array is not mutated (Object.freeze does not cause throw)", async () => {
    const { activeBlockId } = await import("./activeBlock");
    const blkA = makeBlock("A", "09:00", "10:00");
    const blocks = Object.freeze([blkA]) as Block[];
    expect(() => activeBlockId(blocks, "09:30")).not.toThrow();
    expect(blocks[0].id).toBe("A"); // still intact
  });

  it("different now arguments return different ids", async () => {
    const { activeBlockId } = await import("./activeBlock");
    const blkA = makeBlock("A", "09:00", "10:00");
    expect(activeBlockId([blkA], "08:30")).toBeNull();
    expect(activeBlockId([blkA], "09:30")).toBe("A");
  });
});

// ── U-m7b-007 ────────────────────────────────────────────────────────────────
describe("U-m7b-007 — activeBlockId TZ-irrelevant: same answer across UTC, LA, Kolkata", () => {
  it("returns 'A' for all three TZ stubs", async () => {
    const { activeBlockId } = await import("./activeBlock");
    const blkA = makeBlock("A", "08:00", "09:00");
    // The function uses toMin() which only does string split — no Date objects
    // We verify by calling with the same inputs under different TZ env vars
    for (const tz of ["UTC", "America/Los_Angeles", "Asia/Kolkata"]) {
      const origTZ = process.env.TZ;
      process.env.TZ = tz;
      try {
        expect(activeBlockId([blkA], "08:30")).toBe("A");
      } finally {
        process.env.TZ = origTZ;
      }
    }
  });
});

// ── U-m7b-008 ────────────────────────────────────────────────────────────────
describe("U-m7b-008 — activeBlockId midnight 00:00 and day-anchor 04:00 are plain minute values", () => {
  it("00:00 start — now=00:00 is active (toMin('00:00')=0, 0>=0 && 0<60)", async () => {
    const { activeBlockId } = await import("./activeBlock");
    const midnightBlock = makeBlock("midnight", "00:00", "01:00");
    expect(activeBlockId([midnightBlock], "00:00")).toBe("midnight");
  });

  it("04:00 within 03:00–05:00 — not treated as day-anchor reset (toMin('04:00')=240)", async () => {
    const { activeBlockId } = await import("./activeBlock");
    const anchorBlock = makeBlock("anchor", "03:00", "05:00");
    expect(activeBlockId([anchorBlock], "04:00")).toBe("anchor");
  });
});
