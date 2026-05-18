/**
 * lib/history.test.ts — M9b rollover unit tests + M9c dayScore unit tests.
 * Covers U-m9b-010..021, U-m9c-007..012.
 * M9e: monthScore/yearScore unit tests appended (U-m9e-004..009). No m9b/m9c/m9d ID touched.
 * Pure unit tests — no localStorage, no clock reads.
 * rollover(state, todayISO) and dayScore(state, isoDate) are called directly.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  rollover,
  dayScore,
  weekScore,
  monthScore,
  yearScore,
  NO_DATA,
} from "./history";
import type { PersistedState } from "./persist";
import type { ArchivedDay } from "./types";
import type { AppState } from "./types";

// ─── Fixture helpers ──────────────────────────────────────────────────────────

/** Minimal v2 PersistedState for testing. */
function makeState(overrides: Partial<PersistedState> = {}): PersistedState {
  return {
    schemaVersion: 2,
    programStart: "2026-05-01",
    currentDate: "2026-05-17",
    history: {},
    blocks: [],
    categories: [],
    looseBricks: [],
    ...overrides,
  };
}

// ─── U-m9b-010: DETECT — same-day and future → no-op (same reference) ────────

describe("U-m9b-010: rollover DETECT — currentDate >= todayISO → same reference no-op", () => {
  it("returns the exact same object reference when currentDate === todayISO", () => {
    const state = makeState({ currentDate: "2026-05-18" });
    const result = rollover(state, "2026-05-18");
    expect(result).toBe(state); // reference identity — AC #6
    expect(result.history).toBe(state.history);
    expect(result.blocks).toBe(state.blocks);
    expect(result.categories).toBe(state.categories);
    expect(result.looseBricks).toBe(state.looseBricks);
  });

  it("returns the same reference when currentDate is AFTER todayISO (should-not-occur future)", () => {
    const state = makeState({ currentDate: "2026-05-19" });
    const result = rollover(state, "2026-05-18");
    expect(result).toBe(state); // DETECT: currentDate >= todayISO
  });
});

// ─── U-m9b-011: ARCHIVE — in-progress day snapshotted under old date key ─────

describe("U-m9b-011: rollover ARCHIVE — in-progress day snapshotted into history[currentDate]", () => {
  it("archives the in-progress day under history['2026-05-17'] with pre-rollover values", () => {
    const state = makeState({
      currentDate: "2026-05-17",
      history: {},
      blocks: [
        {
          id: "b1",
          name: "Morning",
          start: "06:00",
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
              done: 9,
            },
          ],
        },
      ],
      categories: [{ id: "c1", name: "Health", color: "#abc" }],
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
    });

    const result = rollover(state, "2026-05-18");

    expect(Object.keys(result.history)).toContain("2026-05-17");
    const archived = result.history["2026-05-17"] as ArchivedDay;
    expect(archived.blocks[0].id).toBe("b1");
    const b = archived.blocks[0].bricks[0];
    expect(b.kind).toBe("units");
    if (b.kind === "units") {
      expect(b.done).toBe(9); // captured at pre-rollover value
    }
    expect(archived.looseBricks[0].done).toBe(true); // captured at pre-rollover value
    expect(archived.categories[0].id).toBe("c1");
  });
});

// ─── U-m9b-012: ADVANCE — currentDate advanced to todayISO ───────────────────

describe("U-m9b-012: rollover ADVANCE — currentDate advanced and result is a new object", () => {
  it("result.currentDate === '2026-05-18' and result !== state (new object)", () => {
    const state = makeState({ currentDate: "2026-05-17" });
    const result = rollover(state, "2026-05-18");

    expect(result).not.toBe(state); // new object
    expect(result.currentDate).toBe("2026-05-18"); // advanced
    expect(result.programStart).toBe(state.programStart); // carried forward
  });

  it("result.blocks is the freshly-seeded day, not the archived collections", () => {
    // The in-progress day has only a hasDuration:false brick (no recurrence) → drops on seed
    const state = makeState({
      currentDate: "2026-05-17",
      blocks: [
        {
          id: "b1",
          name: "Work",
          start: "09:00",
          recurrence: { kind: "every-day" },
          categoryId: null,
          bricks: [
            {
              id: "t1",
              name: "Task",
              categoryId: null,
              parentBlockId: "b1",
              hasDuration: false,
              kind: "tick",
              done: true,
            },
          ],
        },
      ],
    });

    const result = rollover(state, "2026-05-18");
    // hasDuration:false bricks are never seeded → block is dropped (zero seeded bricks)
    expect(result.blocks).toHaveLength(0);
    // The archived day still holds the original block
    expect(result.history["2026-05-17"].blocks[0].id).toBe("b1");
  });
});

// ─── U-m9b-013: multi-day skip — only currentDate archived, no intervening dates ─

describe("U-m9b-013: rollover multi-day skip — only state.currentDate archived", () => {
  it("archives only '2026-05-11'; no intervening-date entries; advances to '2026-05-18'", () => {
    const priorDay: ArchivedDay = {
      blocks: [
        {
          id: "old",
          name: "Old",
          start: "08:00",
          recurrence: { kind: "every-day" },
          categoryId: null,
          bricks: [],
        },
      ],
      categories: [],
      looseBricks: [],
    };
    const state = makeState({
      currentDate: "2026-05-11", // 7 days before today
      history: { "2026-05-04": priorDay },
      blocks: [
        {
          id: "b2",
          name: "Block",
          start: "09:00",
          recurrence: { kind: "every-day" },
          categoryId: null,
          bricks: [
            {
              id: "r1",
              name: "Brick",
              categoryId: null,
              parentBlockId: "b2",
              hasDuration: true,
              start: "09:00",
              end: "09:30",
              recurrence: { kind: "every-day" },
              kind: "tick",
              done: false,
            },
          ],
        },
      ],
    });

    const result = rollover(state, "2026-05-18");

    const keys = Object.keys(result.history).sort();
    expect(keys).toEqual(["2026-05-04", "2026-05-11"]); // only the two real entries
    // Confirm no intervening dates
    for (let d = 12; d <= 17; d++) {
      const isoDate = `2026-05-${String(d).padStart(2, "0")}`;
      expect(Object.keys(result.history)).not.toContain(isoDate);
    }
    expect(result.currentDate).toBe("2026-05-18"); // advanced straight to today
    // Prior '2026-05-04' entry preserved unchanged
    expect(result.history["2026-05-04"]).toEqual(priorDay);
  });
});

// ─── U-m9b-014: archived-day immutability (structuredClone) ──────────────────

describe("U-m9b-014: archived-day immutability — structuredClone prevents shared references", () => {
  it("mutating the post-rollover in-progress day leaves history['2026-05-17'] byte-identical", () => {
    const state = makeState({
      currentDate: "2026-05-17",
      blocks: [
        {
          id: "b1",
          name: "Morning",
          start: "06:00",
          recurrence: { kind: "every-day" },
          categoryId: null,
          bricks: [
            {
              id: "t1",
              name: "Meditate",
              categoryId: null,
              parentBlockId: "b1",
              hasDuration: true,
              start: "06:00",
              end: "06:20",
              recurrence: { kind: "every-day" },
              kind: "tick",
              done: false,
            },
          ],
        },
      ],
    });

    const result = rollover(state, "2026-05-18");

    // Capture a deep snapshot of the archived day before mutation
    const snapshotClone = structuredClone(result.history["2026-05-17"]);

    // Mutate the post-rollover in-progress day
    if (result.blocks.length > 0) {
      const seededBrick = result.blocks[0].bricks[0];
      if (seededBrick?.kind === "tick") {
        seededBrick.done = true; // intentional mutation to test isolation
      }
      // @ts-expect-error -- intentional mutation to test isolation
      result.blocks.push({ id: "x", name: "Extra" });
    }
    // @ts-expect-error -- intentional mutation to test isolation
    result.looseBricks.push({ id: "extra" });

    // The archived day must be byte-identical to the pre-mutation snapshot
    expect(result.history["2026-05-17"]).toEqual(snapshotClone);
    // Explicitly: the archived brick done is still false
    const archivedBrick = result.history["2026-05-17"].blocks[0].bricks[0];
    if (archivedBrick?.kind === "tick") {
      expect(archivedBrick.done).toBe(false);
    }
    // Archived day blocks array is a distinct reference from fresh day blocks
    expect(result.history["2026-05-17"].blocks).not.toBe(result.blocks);
  });
});

// ─── U-m9b-015: purity — no clock reads, no input mutation ───────────────────

describe("U-m9b-015: rollover purity — no clock reads, no input mutation", () => {
  it("does not throw when input state is deeply frozen", () => {
    const block = {
      id: "b1",
      name: "Work",
      start: "09:00",
      recurrence: { kind: "every-day" as const },
      categoryId: null,
      bricks: [
        {
          id: "t1",
          name: "Task",
          categoryId: null,
          parentBlockId: "b1",
          hasDuration: true,
          start: "09:00",
          end: "09:30",
          recurrence: { kind: "every-day" as const },
          kind: "tick" as const,
          done: false,
        },
      ],
    };
    const frozenState = Object.freeze({
      schemaVersion: 2 as const,
      programStart: "2026-05-01",
      currentDate: "2026-05-17",
      history: Object.freeze({}) as Record<string, never>,
      blocks: Object.freeze([block]),
      categories: Object.freeze([]),
      looseBricks: Object.freeze([]),
    }) as unknown as PersistedState;

    // Must not throw even though input is frozen
    expect(() => rollover(frozenState, "2026-05-18")).not.toThrow();

    // Input state is unchanged after the call
    expect(frozenState.currentDate).toBe("2026-05-17");
    expect(Object.keys(frozenState.history)).toHaveLength(0);
  });

  it("reads no clock — calling twice with the same args yields deep-equal results", () => {
    const state = makeState({ currentDate: "2026-05-17" });
    const r1 = rollover(state, "2026-05-18");
    const r2 = rollover(state, "2026-05-18");
    // Deep-equal (ids will differ since uuid() is called, but the shape is the same)
    expect(r1.currentDate).toBe(r2.currentDate);
    expect(r1.history["2026-05-17"]).toEqual(r2.history["2026-05-17"]);
    expect(r1.programStart).toBe(r2.programStart);
  });

  it("results differ purely by todayISO argument — not Date.now()", () => {
    const state = makeState({ currentDate: "2026-05-17" });
    const r18 = rollover(state, "2026-05-18");
    const r19 = rollover(state, "2026-05-19");
    expect(r18.currentDate).toBe("2026-05-18");
    expect(r19.currentDate).toBe("2026-05-19");
  });
});

// ─── U-m9b-016: per-brick seeding rule — every-day / just-today / no-recurrence ─

describe("U-m9b-016: fresh-day seeding — per-brick rule (every-day seeded, just-today dropped, hasDuration:false dropped)", () => {
  it("only the every-day brick is seeded; just-today and no-recurrence bricks are dropped", () => {
    const state = makeState({
      currentDate: "2026-05-17",
      blocks: [
        {
          id: "B",
          name: "Block B",
          start: "09:00",
          recurrence: { kind: "every-day" },
          categoryId: null,
          bricks: [
            {
              // r1: every-day → seeded
              id: "r1",
              name: "Daily",
              categoryId: null,
              parentBlockId: "B",
              hasDuration: true,
              start: "09:00",
              end: "09:30",
              recurrence: { kind: "every-day" },
              kind: "tick",
              done: true,
            },
            {
              // r2: just-today for 2026-05-17 → dropped (not 2026-05-18)
              id: "r2",
              name: "OneOff",
              categoryId: null,
              parentBlockId: "B",
              hasDuration: true,
              start: "09:30",
              end: "10:00",
              recurrence: { kind: "just-today", date: "2026-05-17" },
              kind: "tick",
              done: false,
            },
            {
              // r3: hasDuration:false → no recurrence → never seeded
              id: "r3",
              name: "NoTime",
              categoryId: null,
              parentBlockId: "B",
              hasDuration: false,
              kind: "tick",
              done: false,
            },
          ],
        },
      ],
    });

    const result = rollover(state, "2026-05-18");

    // Block B' carries (1 seeded brick: r1 instance)
    expect(result.blocks).toHaveLength(1);
    const freshBlock = result.blocks[0];
    expect(freshBlock.bricks).toHaveLength(1);
    expect(freshBlock.bricks[0].name).toBe("Daily"); // r1 instance (every-day)
  });
});

// ─── U-m9b-017: seeding across recurrence kinds ───────────────────────────────

describe("U-m9b-017: seeding across recurrence kinds at different todayISO values", () => {
  const looseBricks = [
    {
      id: "wd",
      name: "Weekday",
      categoryId: null,
      parentBlockId: null,
      hasDuration: true,
      start: "07:00",
      end: "07:30",
      recurrence: { kind: "every-weekday" as const },
      kind: "tick" as const,
      done: false,
    },
    {
      id: "wknd-check",
      name: "WkndCheck",
      categoryId: null,
      parentBlockId: null,
      hasDuration: true,
      start: "08:00",
      end: "08:30",
      recurrence: {
        kind: "custom-range" as const,
        start: "2026-05-01",
        end: "2026-05-31",
        weekdays: [0, 6], // Sun + Sat
      },
      kind: "tick" as const,
      done: false,
    },
    {
      id: "inrange",
      name: "InRange",
      categoryId: null,
      parentBlockId: null,
      hasDuration: true,
      start: "09:00",
      end: "09:30",
      recurrence: {
        kind: "custom-range" as const,
        start: "2026-05-01",
        end: "2026-05-31",
        weekdays: [1], // Mon only
      },
      kind: "tick" as const,
      done: false,
    },
    {
      id: "oob",
      name: "OOB",
      categoryId: null,
      parentBlockId: null,
      hasDuration: true,
      start: "10:00",
      end: "10:30",
      recurrence: {
        kind: "custom-range" as const,
        start: "2026-01-01",
        end: "2026-01-31",
        weekdays: [1], // Mon, but range is in January
      },
      kind: "tick" as const,
      done: false,
    },
  ];

  const state = makeState({
    currentDate: "2026-05-15", // Fri — source day doesn't matter for seeding
    looseBricks,
  });

  it("at 2026-05-18 (Mon): wd and inrange seeded; wknd-check and oob dropped", () => {
    const result = rollover(state, "2026-05-18");
    const ids = result.looseBricks.map((b) => b.name);
    expect(ids).toContain("Weekday"); // every-weekday, Mon ✓
    expect(ids).toContain("InRange"); // custom-range, in window, Mon ∈ [1] ✓
    expect(ids).not.toContain("WkndCheck"); // custom-range, Mon ∉ {Sun, Sat} ✗
    expect(ids).not.toContain("OOB"); // custom-range, outside Jan range ✗
  });

  it("at 2026-05-16 (Sat): wknd-check seeded; wd, inrange, oob dropped", () => {
    const result = rollover(state, "2026-05-16");
    const ids = result.looseBricks.map((b) => b.name);
    expect(ids).not.toContain("Weekday"); // every-weekday, Sat ✗
    expect(ids).toContain("WkndCheck"); // custom-range, Sat ∈ {Sun, Sat}, in range ✓
    expect(ids).not.toContain("InRange"); // custom-range, Sat ∉ {Mon} ✗
    expect(ids).not.toContain("OOB"); // out of range ✗
  });
});

// ─── U-m9b-018: done reset + definition preserved + fresh uuid ────────────────

describe("U-m9b-018: seeded bricks — done reset, definition preserved, fresh uuid", () => {
  it("tick brick: done reset to false; name/recurrence/start/end/categoryId preserved; fresh id", () => {
    const state = makeState({
      currentDate: "2026-05-17",
      looseBricks: [
        {
          id: "tk",
          name: "Meditate",
          categoryId: "cat-1",
          parentBlockId: null,
          hasDuration: true,
          start: "06:00",
          end: "06:20",
          recurrence: { kind: "every-day" },
          kind: "tick",
          done: true, // should be reset
        },
      ],
    });

    const result = rollover(state, "2026-05-18");
    expect(result.looseBricks).toHaveLength(1);
    const seeded = result.looseBricks[0];
    expect(seeded.kind).toBe("tick");
    if (seeded.kind === "tick") {
      expect(seeded.done).toBe(false); // reset (AC #12)
    }
    expect(seeded.id).not.toBe("tk"); // fresh uuid (SG-m9b-01)
    expect(seeded.name).toBe("Meditate"); // preserved
    expect(seeded.categoryId).toBe("cat-1"); // preserved
    expect(seeded.start).toBe("06:00"); // preserved
    expect(seeded.end).toBe("06:20"); // preserved
    expect(seeded.recurrence).toEqual({ kind: "every-day" }); // preserved verbatim
  });

  it("units brick: done reset to 0; target/unit/name/recurrence preserved; fresh id", () => {
    const state = makeState({
      currentDate: "2026-05-17",
      looseBricks: [
        {
          id: "un",
          name: "Read",
          categoryId: "cat-2",
          parentBlockId: null,
          hasDuration: true,
          start: "21:00",
          end: "21:40",
          recurrence: { kind: "every-day" },
          kind: "units",
          target: 30,
          unit: "pages",
          done: 12, // should be reset
        },
      ],
    });

    const result = rollover(state, "2026-05-18");
    expect(result.looseBricks).toHaveLength(1);
    const seeded = result.looseBricks[0];
    expect(seeded.kind).toBe("units");
    if (seeded.kind === "units") {
      expect(seeded.done).toBe(0); // reset (AC #12)
      expect(seeded.target).toBe(30); // preserved
      expect(seeded.unit).toBe("pages"); // preserved
    }
    expect(seeded.id).not.toBe("un"); // fresh uuid
    expect(seeded.name).toBe("Read"); // preserved
    expect(seeded.categoryId).toBe("cat-2"); // preserved
    expect(seeded.recurrence).toEqual({ kind: "every-day" }); // preserved verbatim
  });
});

// ─── U-m9b-019: block filtering — blocks carry iff ≥1 seeded brick ────────────

describe("U-m9b-019: block filtering — blocks carry iff ≥1 seeded brick; categories carry verbatim", () => {
  it("Bkeep carries; Bdrop and Bempty are dropped; categories carry unchanged", () => {
    const state = makeState({
      currentDate: "2026-05-17",
      blocks: [
        {
          // Bkeep: has one every-day brick → seeded → block carries
          id: "Bkeep",
          name: "KeepBlock",
          start: "08:00",
          recurrence: { kind: "every-day" },
          categoryId: null,
          bricks: [
            {
              id: "rk1",
              name: "Daily",
              categoryId: null,
              parentBlockId: "Bkeep",
              hasDuration: true,
              start: "08:00",
              end: "08:30",
              recurrence: { kind: "every-day" },
              kind: "tick",
              done: false,
            },
          ],
        },
        {
          // Bdrop: has only a just-today-2026-05-17 brick → not applicable on 2026-05-18
          id: "Bdrop",
          name: "DropBlock",
          start: "10:00",
          recurrence: { kind: "every-day" },
          categoryId: null,
          bricks: [
            {
              id: "rd1",
              name: "OnceOnly",
              categoryId: null,
              parentBlockId: "Bdrop",
              hasDuration: true,
              start: "10:00",
              end: "10:30",
              recurrence: { kind: "just-today", date: "2026-05-17" },
              kind: "tick",
              done: false,
            },
          ],
        },
        {
          // Bempty: has only a hasDuration:false brick → never seeded
          id: "Bempty",
          name: "EmptyBlock",
          start: "11:00",
          recurrence: { kind: "every-day" },
          categoryId: null,
          bricks: [
            {
              id: "re1",
              name: "NoTime",
              categoryId: null,
              parentBlockId: "Bempty",
              hasDuration: false,
              kind: "tick",
              done: false,
            },
          ],
        },
      ],
      categories: [
        { id: "cat-A", name: "Alpha", color: "#f00" },
        { id: "cat-B", name: "Beta", color: "#0f0" },
      ],
    });

    const result = rollover(state, "2026-05-18");

    // Only Bkeep carries
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].name).toBe("KeepBlock");
    expect(result.blocks[0].bricks).toHaveLength(1);

    // Categories carry verbatim (AC #13)
    expect(result.categories).toEqual([
      { id: "cat-A", name: "Alpha", color: "#f00" },
      { id: "cat-B", name: "Beta", color: "#0f0" },
    ]);
  });
});

// ─── U-m9b-020: parentBlockId consistency ────────────────────────────────────

describe("U-m9b-020: parentBlockId re-pointed to new block id; loose bricks stay null", () => {
  it("seeded bricks inside a block carry the new block id, not the stale 'B-old'", () => {
    const state = makeState({
      currentDate: "2026-05-17",
      blocks: [
        {
          id: "B-old",
          name: "OldBlock",
          start: "09:00",
          recurrence: { kind: "every-day" },
          categoryId: null,
          bricks: [
            {
              id: "b1",
              name: "BrickOne",
              categoryId: null,
              parentBlockId: "B-old",
              hasDuration: true,
              start: "09:00",
              end: "09:30",
              recurrence: { kind: "every-day" },
              kind: "tick",
              done: false,
            },
            {
              id: "b2",
              name: "BrickTwo",
              categoryId: null,
              parentBlockId: "B-old",
              hasDuration: true,
              start: "09:30",
              end: "10:00",
              recurrence: { kind: "every-day" },
              kind: "tick",
              done: true,
            },
          ],
        },
      ],
      looseBricks: [
        {
          id: "loose1",
          name: "Loose",
          categoryId: null,
          parentBlockId: null,
          hasDuration: true,
          start: "07:00",
          end: "07:30",
          recurrence: { kind: "every-day" },
          kind: "tick",
          done: false,
        },
      ],
    });

    const result = rollover(state, "2026-05-18");

    expect(result.blocks).toHaveLength(1);
    const freshBlock = result.blocks[0];
    expect(freshBlock.id).not.toBe("B-old"); // fresh uuid
    expect(freshBlock.bricks).toHaveLength(2);

    // All seeded bricks point to the NEW block id
    expect(
      freshBlock.bricks.every((b) => b.parentBlockId === freshBlock.id),
    ).toBe(true); // plan § parentBlockId consistency

    // None point to the stale id
    expect(freshBlock.bricks.every((b) => b.parentBlockId !== "B-old")).toBe(
      true,
    );

    // Loose brick keeps parentBlockId: null
    expect(result.looseBricks).toHaveLength(1);
    expect(result.looseBricks[0].parentBlockId).toBeNull();
  });
});

// ─── U-m9b-021: empty fresh day when no brick applies ────────────────────────

describe("U-m9b-021: empty fresh day when all bricks are every-weekday and today is weekend", () => {
  it("freshBlocks=[], looseBricks=[] for weekend; categories still carry; history holds the day", () => {
    const state = makeState({
      currentDate: "2026-05-16", // Sat — source day
      blocks: [
        {
          id: "wb",
          name: "WeekdayBlock",
          start: "09:00",
          recurrence: { kind: "every-weekday" },
          categoryId: null,
          bricks: [
            {
              id: "wr1",
              name: "WeekdayBrick",
              categoryId: null,
              parentBlockId: "wb",
              hasDuration: true,
              start: "09:00",
              end: "09:30",
              recurrence: { kind: "every-weekday" },
              kind: "tick",
              done: false,
            },
          ],
        },
      ],
      looseBricks: [
        {
          id: "wl1",
          name: "WeekdayLoose",
          categoryId: null,
          parentBlockId: null,
          hasDuration: true,
          start: "07:00",
          end: "07:30",
          recurrence: { kind: "every-weekday" },
          kind: "tick",
          done: false,
        },
      ],
      categories: [{ id: "cat-A", name: "Alpha", color: "#abc" }],
    });

    const result = rollover(state, "2026-05-17"); // Sun — still a weekend

    expect(result.blocks).toEqual([]); // no applicable brick → empty
    expect(result.looseBricks).toEqual([]); // no applicable brick → empty
    expect(result.categories).toEqual([
      { id: "cat-A", name: "Alpha", color: "#abc" },
    ]); // carry (AC #13)
    expect(result.history["2026-05-16"]).toBeDefined(); // Saturday day archived
    expect(result.currentDate).toBe("2026-05-17");
  });
});

// ─── M9c dayScore helper tests ────────────────────────────────────────────────
//
// Standing fixture state:
//   programStart: "2026-05-01"
//   currentDate:  "2026-05-18"
//   history:
//     "2026-05-17" → ArchivedDay scoring 100 (1 block, 1 tick brick done:true)
//     "2026-05-16" → ArchivedDay scoring 60  (1 block, 3 tick bricks 2 done:true)
//     "2026-05-15" → ArchivedDay scoring 0   (1 units brick done:0/target:10)
//   live day (blocks+looseBricks) scoring dayPct === 40  (5 tick bricks, 2 done)
//
// dayPct reads only state.blocks and state.looseBricks (dharma.ts:49).
// ArchivedDay has blocks + looseBricks sufficient to drive the exact pct.

/** Build an AppState that scores dayPct === 40% via 5 tick bricks (2 done). */
function makeLiveState(overrides: Partial<AppState> = {}): AppState {
  return {
    programStart: "2026-05-01",
    currentDate: "2026-05-18",
    history: {
      "2026-05-17": makeArchivedDay100(),
      "2026-05-16": makeArchivedDay60(),
      "2026-05-15": makeArchivedDay0(),
    },
    // Live day: 5 tick bricks (1 loose, rest in block) → 2 done → 40%
    // blockPct("b-live") = (done0 + done1) / 4 = 2/4 = 50%
    // brickPct(loose) = 0 (done:false)
    // dayPct = (50 + 0) / 2 = 25 ... adjust to hit exactly 40
    //
    // Simpler: 2 blocks of 2 bricks each — block1: 2/2=100, block2: 0/2=0
    //          dayPct = (100 + 0) / 2 = 50 — not 40
    //
    // Use 5 loose bricks (2 done:true, 3 done:false)
    //   dayPct = sum(brickPct) / total = (100+100+0+0+0) / 5 = 40% ✓
    blocks: [],
    categories: [],
    looseBricks: [
      {
        id: "lb1",
        name: "A",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: true,
      },
      {
        id: "lb2",
        name: "B",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: true,
      },
      {
        id: "lb3",
        name: "C",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: false,
      },
      {
        id: "lb4",
        name: "D",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: false,
      },
      {
        id: "lb5",
        name: "E",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: false,
      },
    ],
    ...overrides,
  };
}

/** ArchivedDay scoring 100%: 1 block with 1 tick brick done:true */
function makeArchivedDay100(): ArchivedDay {
  return {
    blocks: [
      {
        id: "b-arch100",
        name: "Morning",
        start: "06:00",
        recurrence: { kind: "every-day" },
        categoryId: null,
        bricks: [
          {
            id: "r-arch100",
            name: "Meditate",
            categoryId: null,
            parentBlockId: "b-arch100",
            hasDuration: false,
            kind: "tick",
            done: true,
          },
        ],
      },
    ],
    categories: [],
    looseBricks: [],
  };
}

/** ArchivedDay scoring 60%: 1 block with 3 bricks, 2 done → blockPct=66.7 */
// Use simpler: 5 loose tick bricks, 3 done → 60%
function makeArchivedDay60(): ArchivedDay {
  return {
    blocks: [],
    categories: [],
    looseBricks: [
      {
        id: "a1",
        name: "a",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: true,
      },
      {
        id: "a2",
        name: "b",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: true,
      },
      {
        id: "a3",
        name: "c",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: true,
      },
      {
        id: "a4",
        name: "d",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: false,
      },
      {
        id: "a5",
        name: "e",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: false,
      },
    ],
  };
}

/** ArchivedDay scoring 0%: 1 units brick done:0, target:10 */
function makeArchivedDay0(): ArchivedDay {
  return {
    blocks: [],
    categories: [],
    looseBricks: [
      {
        id: "u1",
        name: "Units",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "units",
        target: 10,
        unit: "reps",
        done: 0,
      },
    ],
  };
}

// ─── U-m9c-007: dayScore — archived branch ────────────────────────────────────

describe("U-m9c-007: dayScore — archived-day branch returns dayPct over ArchivedDay", () => {
  it("history['2026-05-17'] scores 100 — returns number 100", () => {
    const state = makeLiveState();
    expect(dayScore(state, "2026-05-17")).toBe(100);
  });

  it("history['2026-05-16'] scores 60 — returns number 60", () => {
    const state = makeLiveState();
    expect(dayScore(state, "2026-05-16")).toBe(60);
  });

  it("history['2026-05-15'] scores 0 — returns number 0 (not null)", () => {
    const state = makeLiveState();
    expect(dayScore(state, "2026-05-15")).toBe(0);
  });
});

// ─── U-m9c-008: dayScore — no-data sentinel (mutation-resistant) ──────────────

describe("U-m9c-008: dayScore — no-data sentinel: future/pre-start/missed all return null", () => {
  it("NO_DATA is exported and === null", () => {
    expect(NO_DATA).toBe(null);
  });

  it("future date '2026-05-25' (no history entry, not currentDate) → strict null", () => {
    const state = makeLiveState();
    expect(dayScore(state, "2026-05-25")).toBe(null);
  });

  it("pre-programStart date '2026-04-10' → strict null", () => {
    const state = makeLiveState();
    expect(dayScore(state, "2026-04-10")).toBe(null);
  });

  it("past in-range date '2026-05-13' (no history entry) → strict null", () => {
    const state = makeLiveState();
    expect(dayScore(state, "2026-05-13")).toBe(null);
  });

  it("empty history: no-data date → null (plain `in` check, no crash)", () => {
    const state = makeLiveState({ history: {}, currentDate: "2026-05-18" });
    expect(dayScore(state, "2026-05-17")).toBe(null);
  });
});

// ─── U-m9c-009: dayScore — currentDate branch + history precedence ────────────

describe("U-m9c-009: dayScore — currentDate branch + history-before-currentDate precedence", () => {
  it("currentDate '2026-05-18' (not in history) → live dayPct === 40", () => {
    const state = makeLiveState();
    expect(dayScore(state, "2026-05-18")).toBe(40);
  });

  it("date in BOTH history and currentDate: history wins (precedence)", () => {
    // Should-not-occur case: currentDate === '2026-05-17' and history['2026-05-17'] present.
    // history branch scores 100; live day scores 40. history must win.
    const state = makeLiveState({ currentDate: "2026-05-17" });
    // state.history['2026-05-17'] scores 100; live day (5 bricks 2 done) = 40
    expect(dayScore(state, "2026-05-17")).toBe(100);
  });
});

// ─── U-m9c-010: dayScore — purity, no mutation, no clock read ────────────────

describe("U-m9c-010: dayScore — pure function: frozen input, no mutation, no clock read", () => {
  it("does not throw when state is deeply frozen", () => {
    const state = makeLiveState();
    const frozenState = Object.freeze({
      ...state,
      history: Object.freeze({
        "2026-05-17": Object.freeze(makeArchivedDay100()),
        "2026-05-16": Object.freeze(makeArchivedDay60()),
        "2026-05-15": Object.freeze(makeArchivedDay0()),
      }),
      blocks: Object.freeze(state.blocks),
      categories: Object.freeze(state.categories),
      looseBricks: Object.freeze(state.looseBricks),
    }) as unknown as AppState;

    expect(() => dayScore(frozenState, "2026-05-17")).not.toThrow();
    expect(() => dayScore(frozenState, "2026-05-18")).not.toThrow();
  });

  it("calling twice with identical args returns identical results (pure)", () => {
    const state = makeLiveState();
    expect(dayScore(state, "2026-05-17")).toBe(dayScore(state, "2026-05-17"));
    expect(dayScore(state, "2026-05-18")).toBe(dayScore(state, "2026-05-18"));
  });
});

// ─── U-m9c-011: dayScore — 0-score archived vs missed day ────────────────────

describe("U-m9c-011: dayScore — 0-score archived (number 0) vs missed day (null) are distinct", () => {
  it("history['2026-05-15'] scores 0 → returns number 0, not null", () => {
    const state = makeLiveState();
    const result = dayScore(state, "2026-05-15");
    expect(result).toBe(0); // strict number, not null
    expect(result).not.toBe(null);
  });

  it("past in-range date with NO history entry ('2026-05-14') → returns null", () => {
    const state = makeLiveState();
    const result = dayScore(state, "2026-05-14");
    expect(result).toBe(null);
  });

  it("0 (number) and null are distinguishable: 0 === 0 && null !== 0", () => {
    const state = makeLiveState();
    const scored = dayScore(state, "2026-05-15");
    const missed = dayScore(state, "2026-05-14");
    expect(scored === 0).toBe(true);
    expect(missed === null).toBe(true);
    expect(scored === missed).toBe(false);
  });
});

// ─── U-m9c-012: dayScore — ArchivedDay → dayPct field contract ────────────────

describe("U-m9c-012: dayScore — result depends only on blocks+looseBricks of ArchivedDay", () => {
  it("changing categories in ArchivedDay does not change the score", () => {
    // dayPct reads only blocks + looseBricks — categories are irrelevant
    const base = makeLiveState();
    const score1 = dayScore(base, "2026-05-17"); // history['2026-05-17'] → 100

    // Mutate a copy of history with different categories — score must be unchanged
    const differentCats: ArchivedDay = {
      ...makeArchivedDay100(),
      categories: [{ id: "cat-X", name: "SomeCat", color: "#ff0000" }],
    };
    const modified = makeLiveState({
      history: { ...base.history, "2026-05-17": differentCats },
    });
    const score2 = dayScore(modified, "2026-05-17");
    expect(score1).toBe(score2); // categories do not affect result
  });

  it("score is a number in [0,100] and matches dayPct over the ArchivedDay's blocks+looseBricks", () => {
    const state = makeLiveState();
    const score = dayScore(state, "2026-05-17");
    expect(typeof score).toBe("number");
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBe(100); // makeArchivedDay100() has 1 done tick brick → 100%
  });
});

// ─── M9d weekScore helper tests ───────────────────────────────────────────────
//
// weekScore(state, anchorISO) — pure period aggregate (ADR-045 read-only).
// "Today" derived from state.currentDate, NEVER from new Date().
//
// Fixture dates (verified against the proleptic Gregorian calendar):
//   programStart: "2026-05-01" (Fri)
//   currentDate:  "2026-05-18" (Mon)
//   W-today:      "2026-05-17"…"2026-05-23" (Sun→Sat, contains today)
//   W-past:       "2026-05-10"…"2026-05-16" (fully past, fully in-range)
//   W-future:     "2026-05-24"…"2026-05-30" (fully future)
//   W-prestart:   "2026-04-26"…"2026-05-02" (straddles programStart)

/** ArchivedDay scoring dayPct = 80%: 4 tick bricks, 4 done (simplest: units done/target) */
function makeArchivedDay80(): ArchivedDay {
  return {
    blocks: [],
    categories: [],
    looseBricks: [
      {
        id: "w80a",
        name: "a",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: true,
      },
      {
        id: "w80b",
        name: "b",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: true,
      },
      {
        id: "w80c",
        name: "c",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: true,
      },
      {
        id: "w80d",
        name: "d",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: true,
      },
      {
        id: "w80e",
        name: "e",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: false,
      },
    ],
  };
}

/** ArchivedDay scoring 40%: 5 tick bricks, 2 done */
function makeArchivedDay40(): ArchivedDay {
  return {
    blocks: [],
    categories: [],
    looseBricks: [
      {
        id: "w40a",
        name: "a",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: true,
      },
      {
        id: "w40b",
        name: "b",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: true,
      },
      {
        id: "w40c",
        name: "c",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: false,
      },
      {
        id: "w40d",
        name: "d",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: false,
      },
      {
        id: "w40e",
        name: "e",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: false,
      },
    ],
  };
}

/** ArchivedDay scoring 90%: 10 tick bricks, 9 done */
function makeArchivedDay90(): ArchivedDay {
  const bricks = Array.from({ length: 10 }, (_, i) => ({
    id: `w90-${i}`,
    name: `b${i}`,
    categoryId: null as null,
    parentBlockId: null as null,
    hasDuration: false,
    kind: "tick" as const,
    done: i < 9,
  }));
  return { blocks: [], categories: [], looseBricks: bricks };
}

/** ArchivedDay scoring 30%: 10 tick bricks, 3 done */
function makeArchivedDay30(): ArchivedDay {
  const bricks = Array.from({ length: 10 }, (_, i) => ({
    id: `w30-${i}`,
    name: `b${i}`,
    categoryId: null as null,
    parentBlockId: null as null,
    hasDuration: false,
    kind: "tick" as const,
    done: i < 3,
  }));
  return { blocks: [], categories: [], looseBricks: bricks };
}

/** ArchivedDay scoring 70%: 10 tick bricks, 7 done */
function makeArchivedDay70(): ArchivedDay {
  const bricks = Array.from({ length: 10 }, (_, i) => ({
    id: `w70-${i}`,
    name: `b${i}`,
    categoryId: null as null,
    parentBlockId: null as null,
    hasDuration: false,
    kind: "tick" as const,
    done: i < 7,
  }));
  return { blocks: [], categories: [], looseBricks: bricks };
}

/** ArchivedDay scoring 50%: 2 tick bricks, 1 done */
function makeArchivedDay50(): ArchivedDay {
  return {
    blocks: [],
    categories: [],
    looseBricks: [
      {
        id: "w50a",
        name: "a",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: true,
      },
      {
        id: "w50b",
        name: "b",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: false,
      },
    ],
  };
}

// ─── U-m9d-004: weekScore — honest-week-average, missed = 0, mutation-resistant ─

describe("U-m9d-004: weekScore — THE honest-week-average contract, missed = 0, mutation-resistant", () => {
  it("returns 36 — the honest average including 2 missed-in-range days as 0", () => {
    // programStart "2026-05-12" so 05-10/05-11 are pre-start (excluded)
    // history: 05-12 (80), 05-13 (60), 05-14 (40); 05-15/05-16 missed (no entry)
    // included: 05-12(80), 05-13(60), 05-14(40), 05-15(0), 05-16(0) → 5 days
    // numerator: 80+60+40+0+0 = 180; denominator: 5; result: 36
    const state: AppState = {
      programStart: "2026-05-12",
      currentDate: "2026-05-18",
      history: {
        "2026-05-12": makeArchivedDay80(),
        "2026-05-13": makeArchivedDay60(),
        "2026-05-14": makeArchivedDay40(),
        // 05-15 and 05-16 have NO entry → missed → contribute 0
      },
      blocks: [],
      categories: [],
      looseBricks: [],
    };
    expect(weekScore(state, "2026-05-13")).toBe(36);
  });

  it("returns 36 NOT 60 — a mutant excluding missed days from denominator yields 60", () => {
    const state: AppState = {
      programStart: "2026-05-12",
      currentDate: "2026-05-18",
      history: {
        "2026-05-12": makeArchivedDay80(),
        "2026-05-13": makeArchivedDay60(),
        "2026-05-14": makeArchivedDay40(),
      },
      blocks: [],
      categories: [],
      looseBricks: [],
    };
    // 36, not 60 (the inflated average if missed days were excluded from denominator)
    expect(weekScore(state, "2026-05-13")).not.toBe(60);
    expect(weekScore(state, "2026-05-13")).toBe(36);
  });
});

// ─── U-m9d-005: weekScore — purity + clock-independence, mutation-resistant ────

describe("U-m9d-005: weekScore — purity, clock-independence, frozen-state safe", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-05-18T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not throw or mutate a deeply frozen state", () => {
    // W-today fixture: history["2026-05-17"] scores 100, live day scores 40
    const frozenState = Object.freeze({
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: Object.freeze({
        "2026-05-17": Object.freeze(makeArchivedDay100()) as ArchivedDay,
      }) as Record<string, ArchivedDay>,
      blocks: Object.freeze([]) as unknown as AppState["blocks"],
      categories: Object.freeze([]) as unknown as AppState["categories"],
      looseBricks: Object.freeze([
        Object.freeze({
          id: "lb1",
          name: "A",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick" as const,
          done: true,
        }),
        Object.freeze({
          id: "lb2",
          name: "B",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick" as const,
          done: true,
        }),
        Object.freeze({
          id: "lb3",
          name: "C",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick" as const,
          done: false,
        }),
        Object.freeze({
          id: "lb4",
          name: "D",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick" as const,
          done: false,
        }),
        Object.freeze({
          id: "lb5",
          name: "E",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick" as const,
          done: false,
        }),
      ]) as AppState["looseBricks"],
    }) as unknown as AppState;

    expect(() => weekScore(frozenState, "2026-05-20")).not.toThrow();

    // State is unchanged after the call
    expect(frozenState.currentDate).toBe("2026-05-18");
    expect(Object.keys(frozenState.history)).toHaveLength(1);
  });

  it("returns 70 twice with identical args even after the system clock is advanced — no clock read", () => {
    // W-today: 05-17 (100) + 05-18 today (40) = (100+40)/2 = 70; 05-19..05-23 future excluded
    const liveState: AppState = {
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: {
        "2026-05-17": makeArchivedDay100(),
      },
      blocks: [],
      categories: [],
      looseBricks: [
        {
          id: "lb1",
          name: "A",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: true,
        },
        {
          id: "lb2",
          name: "B",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: true,
        },
        {
          id: "lb3",
          name: "C",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: false,
        },
        {
          id: "lb4",
          name: "D",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: false,
        },
        {
          id: "lb5",
          name: "E",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: false,
        },
      ],
    };

    const result1 = weekScore(liveState, "2026-05-20");

    // Advance system clock by 2 days — weekScore must still derive "today" from state.currentDate
    vi.setSystemTime(new Date("2026-05-20T12:00:00"));

    const result2 = weekScore(liveState, "2026-05-20");

    expect(result1).toBe(70);
    expect(result2).toBe(70);
    expect(result1).toBe(result2);
  });
});

// ─── U-m9d-006: weekScore — no-data sentinel for fully-future / fully-pre-start weeks ─

describe("U-m9d-006: weekScore — no-data sentinel: fully-future / fully-pre-start → null", () => {
  it("W-future (2026-05-24…2026-05-30, all > currentDate) → strict null", () => {
    const state: AppState = {
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: {},
      blocks: [],
      categories: [],
      looseBricks: [],
    };
    expect(weekScore(state, "2026-05-27")).toBe(null);
  });

  it("fully-pre-programStart week (anchor 2026-04-15, week 04-12…04-18) → strict null", () => {
    const state: AppState = {
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: {},
      blocks: [],
      categories: [],
      looseBricks: [],
    };
    expect(weekScore(state, "2026-04-15")).toBe(null);
  });

  it("returns strict null, NOT 0 — 0 is reserved for 'the week happened and scored zero'", () => {
    const state: AppState = {
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: {},
      blocks: [],
      categories: [],
      looseBricks: [],
    };
    const result = weekScore(state, "2026-05-27");
    expect(result).toBe(null); // strict === null
    expect(result).not.toBe(0); // NOT the number 0
  });

  it("NO_DATA is exported and === null", () => {
    expect(NO_DATA).toBe(null);
  });
});

// ─── U-m9d-007: weekScore — today's live dayPct contributes to the aggregate ───

describe("U-m9d-007: weekScore — today's live dayPct contributes to the aggregate", () => {
  it("W-today: 05-17(100) + 05-18(today,40) → (100+40)/2 = 70; future days excluded", () => {
    // W-today: 2026-05-17…2026-05-23. today = 2026-05-18.
    // Included: 05-17 (archived 100) + 05-18 (today, live 40). Future 05-19..05-23 excluded.
    const state: AppState = {
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: {
        "2026-05-17": makeArchivedDay100(),
      },
      blocks: [],
      categories: [],
      looseBricks: [
        {
          id: "lb1",
          name: "A",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: true,
        },
        {
          id: "lb2",
          name: "B",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: true,
        },
        {
          id: "lb3",
          name: "C",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: false,
        },
        {
          id: "lb4",
          name: "D",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: false,
        },
        {
          id: "lb5",
          name: "E",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: false,
        },
      ],
    };
    expect(weekScore(state, "2026-05-18")).toBe(70);
  });

  it("when the live day's dayPct rises to 80, weekScore updates to (100+80)/2 = 90", () => {
    // Same fixture but 4/5 loose bricks done → dayPct = 80
    const state80: AppState = {
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: {
        "2026-05-17": makeArchivedDay100(),
      },
      blocks: [],
      categories: [],
      looseBricks: [
        {
          id: "lb1",
          name: "A",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: true,
        },
        {
          id: "lb2",
          name: "B",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: true,
        },
        {
          id: "lb3",
          name: "C",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: true,
        },
        {
          id: "lb4",
          name: "D",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: true,
        },
        {
          id: "lb5",
          name: "E",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: false,
        },
      ],
    };
    expect(weekScore(state80, "2026-05-18")).toBe(90);
  });
});

// ─── U-m9d-008: weekScore — empty history first run; straddling programStart ───

describe("U-m9d-008: weekScore — empty history first run + straddling programStart", () => {
  it("(a) first-run: 05-10..05-12 pre-start, 05-13/05-14 missed, 05-15 today(50), 05-16 future → (0+0+50)/3 ≈ 16.667", () => {
    // state: programStart=2026-05-13, currentDate=2026-05-15, history={}
    // week for anchor 2026-05-15: 2026-05-10…2026-05-16
    // 05-10/11/12 < programStart → excluded
    // 05-13/14 in-range past, no history → missed → 0
    // 05-15 = currentDate → live dayPct = 50 (1 done, 1 undone = 50%)
    // 05-16 > currentDate → future → excluded
    // numerator = 0+0+50 = 50; denominator = 3; result = 50/3 ≈ 16.667
    const state: AppState = {
      programStart: "2026-05-13",
      currentDate: "2026-05-15",
      history: {},
      blocks: [],
      categories: [],
      looseBricks: [
        {
          id: "x1",
          name: "a",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: true,
        },
        {
          id: "x2",
          name: "b",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: false,
        },
      ],
    };
    const result = weekScore(state, "2026-05-15");
    expect(result).not.toBeNull();
    expect(result).toBeCloseTo(16.667, 2);
  });

  it("does not crash on empty history map", () => {
    const state: AppState = {
      programStart: "2026-05-13",
      currentDate: "2026-05-15",
      history: {},
      blocks: [],
      categories: [],
      looseBricks: [
        {
          id: "x1",
          name: "a",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: true,
        },
        {
          id: "x2",
          name: "b",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: false,
        },
      ],
    };
    expect(() => weekScore(state, "2026-05-15")).not.toThrow();
  });

  it("(b) W-prestart (anchor 2026-04-29, week 04-26…05-02): 04-26..04-30 pre-start, 05-01 archived(90), 05-02 missed → (90+0)/2 = 45", () => {
    // programStart=2026-05-01, currentDate=2026-05-18
    // week 04-26…05-02: 04-26/27/28/29/30 < programStart → excluded
    // 05-01 archived (90) → included
    // 05-02 in-range past, no entry → missed → 0
    // numerator = 90+0 = 90; denominator = 2; result = 45
    const state: AppState = {
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: {
        "2026-05-01": makeArchivedDay90(),
      },
      blocks: [],
      categories: [],
      looseBricks: [],
    };
    expect(weekScore(state, "2026-04-29")).toBe(45);
  });
});

// ─── U-m9d-009: weekScore — fully-past week + missed vs 0-archived identical contribution ─

describe("U-m9d-009: weekScore — fully-past week; missed vs 0-archived both contribute 0", () => {
  it("W-past all 7 days in-range with various dayPcts: (70+0+50+100+30+90+60)/7 ≈ 57.143", () => {
    // programStart=2026-05-01, currentDate=2026-05-18, W-past: 05-10…05-16
    // All 7 days in-range (all <= currentDate, all >= programStart)
    // dayPcts: 05-10=70, 05-11=0(0-archived), 05-12=50, 05-13=100, 05-14=30, 05-15=90, 05-16=60
    // sum = 400; denominator = 7; result = 400/7 ≈ 57.143
    const state: AppState = {
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: {
        "2026-05-10": makeArchivedDay70(),
        "2026-05-11": makeArchivedDay0(), // 0-scored archived day
        "2026-05-12": makeArchivedDay50(),
        "2026-05-13": makeArchivedDay100(),
        "2026-05-14": makeArchivedDay30(),
        "2026-05-15": makeArchivedDay90(),
        "2026-05-16": makeArchivedDay60(),
      },
      blocks: [],
      categories: [],
      looseBricks: [],
    };
    const result = weekScore(state, "2026-05-13");
    expect(result).toBeCloseTo(57.143, 2);
  });

  it("missed-day and 0-archived-day contribute identical 0 to the average", () => {
    // sibling fixture: remove 05-11's ArchivedDay → becomes missed
    // sum still 400 (0 contribution unchanged), denominator still 7
    const stateMissed: AppState = {
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: {
        "2026-05-10": makeArchivedDay70(),
        // 05-11 omitted → missed → contributes 0
        "2026-05-12": makeArchivedDay50(),
        "2026-05-13": makeArchivedDay100(),
        "2026-05-14": makeArchivedDay30(),
        "2026-05-15": makeArchivedDay90(),
        "2026-05-16": makeArchivedDay60(),
      },
      blocks: [],
      categories: [],
      looseBricks: [],
    };
    const result = weekScore(stateMissed, "2026-05-13");
    // Same as before: 400/7 ≈ 57.143 — missed and 0-archived are indistinguishable to weekScore
    expect(result).toBeCloseTo(57.143, 2);
  });
});

// ─── M9e monthScore / yearScore helper tests ─────────────────────────────────
//
// monthScore(state, year, monthIndex) and yearScore(state, year) — pure period aggregates.
// "Today" derived from state.currentDate, NEVER from new Date().
//
// Named fixtures:
//   F-monthwin: programStart="2026-06-08", currentDate="2026-06-11"
//               history={06-08: dayPct90, 06-09: dayPct30}
//               06-10 and 06-11 have no history entry (in-range past/today, missed → 0)
//               Window: 4 in-range days (06-08..06-11), 2 scored, 2 missed
//               monthScore(2026, 5) = (90+30+0+0)/4 = 30
//
//   F-yearwin:  programStart="2026-02-20", currentDate="2026-03-15"
//               history={02-25: dayPct100, 03-05: dayPct0, 03-10: dayPct0}
//               All other in-range days are un-archived (missed → 0)
//               yearScore(2026): day-averaged = (100+0+0) / (total in-range days) — NOT mean of monthScores
//               Feb in-range: 02-20..02-28 = 9 days; 02-25 scored 100, others missed (0)
//               Mar in-range: 03-01..03-15 = 15 days; 03-05 scored 0, 03-10 scored 0, others missed (0)
//               Total in-range days: 9 + 15 = 24
//               Numerator: 100 + 0 + 0 = 100
//               yearScore = 100/24 ≈ 4.167 — but tests.md simplifies to just the 3 named days
//               The key property: yearScore ≠ mean(monthScore(Feb), monthScore(Mar)) = (100/1 + 0/1)/2 = 50
//               Wait — re-reading tests.md U-m9e-007: "with only 02-25 (100), 03-05 (0), 03-10 (0) in-range"
//               The fixture archives ALSO every other in-range day... let me re-read carefully.
//               tests.md says: "the fixture sets history to ALSO archive every other in-range day at dayPct 100
//               so the only 'low' days are the two 0-scoring March days AND narrows the comparison to the three
//               named days by an explicit assertion"
//               Actually the tests.md description is complex. The mutation-resistance note says:
//               "Feb monthScore = 100 (its one in-range day), Mar monthScore = 0 (its two in-range days both 0)"
//               This means: only 02-25, 03-05, 03-10 are in-range? No — programStart=02-20, currentDate=03-15.
//               The fixture makes all other in-range days have no history (missed→0 in the average).
//               yearScore = (100+0+0 + 0*(other missed days)) / 24 — this won't equal 33.333.
//               Actually re-reading tests.md more carefully:
//               "with only 02-25 (100), 03-05 (0), 03-10 (0) in-range and scored and ALL OTHER DATES
//               PRE-PROGRAMSTART OR FUTURE OR EXPLICITLY EXCLUDED, yearScore averages the three in-range
//               non-future scored days directly → (100+0+0)/3 = 33.33…"
//               So the fixture is: programStart=02-20? No — that would make many days in-range.
//               The fixture needs programStart and currentDate chosen so that ONLY those 3 dates are in-range.
//               The tests.md says: "with only 02-25 (100), 03-05 (0), 03-10 (0) in-range"
//               So I'll set programStart="2026-02-25" and currentDate="2026-03-10" so only those 3 dates
//               fall in the unique scored positions.
//               WAIT — but tests.md says "programStart: 2026-02-20, currentDate: 2026-03-15" for F-yearwin.
//               That means all days 02-20..03-15 are in-range (24 days).
//               BUT the mutation-resistance note says yearScore = 33.333 and NOT 50.
//               Let me re-read: "Feb monthScore = 100 (its one in-range day)"
//               This means ONLY ONE day of Feb is in-range → programStart must be 02-28 or 02-25..?
//               Actually: "Feb in-range: 02-25 only" — so programStart="2026-02-25" makes more sense
//               for Feb to have only 1 in-range day (02-25).
//               "Mar in-range: 03-05 and 03-10 only" — currentDate="2026-03-10"?
//               That gives: Feb in-range: 02-25..02-28 = 4 days; Mar in-range: 03-01..03-10 = 10 days = 14 total
//               "Feb monthScore = 100 (its ONE in-range day)" — this only works if programStart=02-25.
//               But the fixture table says programStart=02-20!
//               I think the tests.md mutation-resistance note is describing a simplified/idealized scenario.
//               The REAL fixture: programStart=02-20, currentDate=03-15.
//               In that case: Feb in-range = 02-20..02-28 = 9 days.
//               Feb history: 02-25 → 100, everything else missed (→ 0).
//               Feb monthScore = (0+0+0+0+0+100+0+0+0) / 9 = 100/9 ≈ 11.11 (NOT 100!)
//               That contradicts "Feb monthScore = 100 (its one in-range day)".
//               CONCLUSION: the "three named days" scenario in the test requires programStart/currentDate
//               that leave ONLY 3 in-range dates. The F-yearwin fixture table is approximate.
//               For U-m9e-007, I'll use: programStart="2026-02-25", currentDate="2026-03-10"
//               so that Feb in-range = 02-25..02-28 = 4 days, Mar in-range = 03-01..03-10 = 10 days = 14 total.
//               WAIT — that still gives Feb monthScore = 100/4 = 25, not 100.
//               The ONLY way "Feb monthScore = 100 (its one in-range day)" is:
//               programStart = "2026-02-25" AND currentDate either covers only 02-25 in Feb
//               OR we use history for ONLY that day and the description means "one scored day".
//               Actually re-reading: "monthScore(2026, 1) (Feb) = 100 (its one in-range day)"
//               I think "in-range day" here means the one day that's actually SCORED (has a history entry),
//               and the missed days contribute 0 so they drag the average down.
//               The sentence means month score based on one scored day = 100, but that's wrong too
//               because missed days also count with 0.
//               RE-READING VERY CAREFULLY:
//               "Feb monthScore = 100 (its one in-range day), Mar monthScore = 0 (its two in-range days both 0)"
//               "the other ten months = NO_DATA → averaging the two non-null month scores gives (100+0)/2=50"
//               For Feb monthScore = 100, we need ONLY one in-range day in Feb (02-25), which scores 100.
//               denominator=1, numerator=100, result=100. ✓
//               For programStart="2026-02-25" and Feb→ only 02-25..02-28 = 4 days in range (not 1!)
//               UNLESS programStart="2026-02-25" AND currentDate="2026-02-25" for Feb only.
//               This is getting complex. The simplest approach: use a fixture where:
//               - programStart = "2026-02-25" (starts at 02-25)
//               - currentDate = "2026-03-10"
//               - history = {02-25: 100%, 03-05: 0%, 03-10: 0%}
//               - All other in-range days (02-26..02-28, 03-01..03-04, 03-06..03-09) are missed (→0)
//               Feb in-range: 02-25..02-28 = 4 days, numerator=100, denominator=4 → monthScore=25
//               Mar in-range: 03-01..03-10 = 10 days, numerator=0, denominator=10 → monthScore=0
//               mean(25, 0) = 12.5 (not 50)
//               yearScore = (100+0+0) / 14 = 7.14 (not 33.333)
//               STILL doesn't match. The only way to get yearScore=33.333 is 3 in-range days total.
//               SO: programStart="2026-02-25", currentDate="2026-03-10", AND
//               all days 02-26..02-28 and 03-01..03-04 and 03-06..03-09 are EXCLUDED.
//               The only way to exclude them without being future or pre-start is... they can't be.
//               FINAL CONCLUSION: The fixture for U-m9e-007 must have EXACTLY 3 in-range days.
//               Use: programStart="2026-02-25", currentDate="2026-02-25" for Feb (only 1 day)
//               Then a separate fixture? No — it's one fixture.
//               OR: use 3 days programStart="2026-02-25", currentDate="2026-02-27" (3 days: 02-25, 02-26, 02-27)
//               with history = {02-25: 100%, 02-26: 0%, 02-27: 0%}?
//               That's 3 in-range days, yearScore = (100+0+0)/3 = 33.33 ✓
//               And monthScore(Feb) = 100/3 ≈ 33.33, mean of monthScores = 33.33 — no divergence!
//               The divergence requires DIFFERENT MONTHS. Let me use:
//               programStart="2026-02-25", currentDate="2026-03-02"
//               history={02-25:100%, 03-01:0%, 03-02:0%} — all other days missed
//               Feb in-range: 02-25, 02-26, 02-27, 02-28 = 4 days; 02-25=100, others missed=0
//               monthScore(Feb) = 100/4 = 25
//               Mar in-range: 03-01, 03-02 = 2 days; 03-01=0, 03-02=0 (archived)
//               monthScore(Mar) = 0/2 = 0
//               mean of non-null = (25+0)/2 = 12.5
//               yearScore = (100+0+0+0+0+0)/6 = 100/6 ≈ 16.67
//               Still not a clean divergence. Let me just use:
//               programStart="2026-02-25", currentDate="2026-03-02", all non-archived in-range = missed
//               yearScore = 100/6 ≈ 16.67, meanOfMonths = (25+0)/2 = 12.5 — divergence exists but messy.
//               SIMPLEST CLEAN FIXTURE for mutation resistance:
//               programStart="2026-02-25", currentDate="2026-02-25" — 1 in-range day in Feb only
//               history={} — live day dayPct=100
//               yearScore(2026) = 100/1 = 100
//               monthScore(2026, 1) = 100 — same! No divergence.
//               The cleanest way to show divergence: 2 months with different day counts.
//               programStart = "2026-01-31", currentDate = "2026-03-01"
//               history = {01-31: 100, 02-01: 0}
//               Feb: all 28 days are in-range, 02-01 scored 0, 02-02..02-28 missed (0) → monthScore = 0/28 = 0
//               Jan: 01-31 = 1 day in-range, scored 100 → monthScore = 100
//               Mar: 03-01 is currentDate, no history → live dayPct (we need 0 for clean math)
//               Let me use a state where live day = 0 (empty blocks)
//               yearScore = (100 + 0*28 + 0) / 30 = 100/30 = 3.33
//               mean of months: Jan=100, Feb=0, Mar=0 → (100+0+0)/3 = 33.33
//               3.33 ≠ 33.33 — divergence! And the test can assert yearScore ≈ 3.33 and NOT 33.33.
//               This matches the tests.md description "33.333" being the yearScore — wait, no, my calc gives 3.33.
//               Let me re-examine. With only 1 day in Jan and 28 days in Feb = 29 in-range days + 1 = 30.
//               yearScore = 100/30 = 3.33 ≠ 33.33.
//               THE TESTS.MD SAYS yearScore = 33.333. Let me work backward:
//               3 in-range days total, 1 scoring 100 → 100/3 = 33.33
//               So I need EXACTLY 3 in-range days, spread across ≥2 months.
//               programStart = "2026-01-31", currentDate = "2026-02-01" (2 days in-range: 01-31 and 02-01)
//               Only 2 — not 3. Add 02-02: currentDate="2026-02-02".
//               But then: Jan: 1 in-range day (01-31); Feb: 2 in-range days (02-01, 02-02)
//               history = {01-31: 100, 02-01: 0, 02-02: 0}
//               monthScore(Jan) = 100/1 = 100, monthScore(Feb) = 0/2 = 0
//               mean = (100+0)/2 = 50 ✓
//               yearScore = 100/3 = 33.33 ✓
//               PERFECT! This matches tests.md exactly!
//               So the F-yearwin fixture for U-m9e-007:
//               programStart = "2026-01-31"
//               currentDate = "2026-02-02"
//               history = {01-31: dayPct100, 02-01: dayPct0, 02-02: dayPct0}
//               (archived 0-score, not missed — both give 0 but archived is explicit)

/**
 * ArchivedDay scoring dayPct = 100%: 1 tick brick, done=true
 * Reuses the existing makeArchivedDay100 pattern (defined at the top of this file for M9c tests).
 * These helpers are defined here for M9e to avoid re-declaring already-defined symbols.
 */
function makeM9eDay100(): ArchivedDay {
  return {
    blocks: [],
    categories: [],
    looseBricks: [
      {
        id: "m9e100a",
        name: "a",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: true,
      },
    ],
  };
}

/** ArchivedDay scoring dayPct = 0%: 1 tick brick, done=false */
function makeM9eDay0(): ArchivedDay {
  return {
    blocks: [],
    categories: [],
    looseBricks: [
      {
        id: "m9e0a",
        name: "a",
        categoryId: null,
        parentBlockId: null,
        hasDuration: false,
        kind: "tick",
        done: false,
      },
    ],
  };
}

/** ArchivedDay scoring dayPct = 90%: 10 tick bricks, 9 done */
function makeM9eDay90(): ArchivedDay {
  const bricks = Array.from({ length: 10 }, (_, i) => ({
    id: `m9e90-${i}`,
    name: `b${i}`,
    categoryId: null as null,
    parentBlockId: null as null,
    hasDuration: false,
    kind: "tick" as const,
    done: i < 9,
  }));
  return { blocks: [], categories: [], looseBricks: bricks };
}

/** ArchivedDay scoring dayPct = 30%: 10 tick bricks, 3 done */
function makeM9eDay30(): ArchivedDay {
  const bricks = Array.from({ length: 10 }, (_, i) => ({
    id: `m9e30-${i}`,
    name: `b${i}`,
    categoryId: null as null,
    parentBlockId: null as null,
    hasDuration: false,
    kind: "tick" as const,
    done: i < 3,
  }));
  return { blocks: [], categories: [], looseBricks: bricks };
}

/** ArchivedDay scoring dayPct = 70%: 10 tick bricks, 7 done */
function makeM9eDay70(): ArchivedDay {
  const bricks = Array.from({ length: 10 }, (_, i) => ({
    id: `m9e70-${i}`,
    name: `b${i}`,
    categoryId: null as null,
    parentBlockId: null as null,
    hasDuration: false,
    kind: "tick" as const,
    done: i < 7,
  }));
  return { blocks: [], categories: [], looseBricks: bricks };
}

/** ArchivedDay scoring dayPct = 40%: 5 tick bricks, 2 done */
function makeM9eDay40(): ArchivedDay {
  return {
    blocks: [],
    categories: [],
    looseBricks: Array.from({ length: 5 }, (_, i) => ({
      id: `m9e40-${i}`,
      name: `b${i}`,
      categoryId: null as null,
      parentBlockId: null as null,
      hasDuration: false,
      kind: "tick" as const,
      done: i < 2,
    })),
  };
}

// ─── U-m9e-004: monthScore — THE honest-month-average contract, missed = 0, mutation-resistant ──

describe("U-m9e-004: monthScore — honest-month-average contract, missed = 0, mutation-resistant", () => {
  // F-monthwin: programStart="2026-06-08", currentDate="2026-06-11"
  // history={06-08: dayPct90, 06-09: dayPct30}
  // 06-10 and 06-11: in-range, no history entry → dayScore returns NO_DATA → contributes 0 AND counted
  // June dates: 06-01..06-07 pre-start (excluded); 06-08..06-11 in-range (4 days); 06-12..06-30 future (excluded)
  // numerator = 90+30+0+0 = 120; denominator = 4; result = 30
  it("F-monthwin: monthScore(state, 2026, 5) = 30 — exact, mutation-resistant (NOT 60)", () => {
    const state: AppState = {
      programStart: "2026-06-08",
      currentDate: "2026-06-11",
      history: {
        "2026-06-08": makeM9eDay90(),
        "2026-06-09": makeM9eDay30(),
      },
      blocks: [],
      categories: [],
      looseBricks: [],
    };
    // monthIndex 5 = June (0-indexed)
    expect(monthScore(state, 2026, 5)).toBe(30);
  });

  it("F-monthwin: value is 30, NOT 60 — a mutant dropping missed days would return 60", () => {
    const state: AppState = {
      programStart: "2026-06-08",
      currentDate: "2026-06-11",
      history: {
        "2026-06-08": makeM9eDay90(),
        "2026-06-09": makeM9eDay30(),
      },
      blocks: [],
      categories: [],
      looseBricks: [],
    };
    const result = monthScore(state, 2026, 5);
    expect(result).not.toBe(60); // 60 is (90+30)/2 — the mutant result
    expect(result).toBe(30); // honest average including 2 missed in-range days
  });

  it("F-monthwin: pre-start days (06-01..06-07) are excluded from both numerator and denominator", () => {
    // Verifies that programStart is honored — the 7 pre-start June days don't inflate the denominator
    const state: AppState = {
      programStart: "2026-06-08",
      currentDate: "2026-06-11",
      history: {
        "2026-06-08": makeM9eDay90(),
        "2026-06-09": makeM9eDay30(),
      },
      blocks: [],
      categories: [],
      looseBricks: [],
    };
    // If pre-start days were included in denominator, result would be (90+30+0+0) / (7+4) = 120/11 ≈ 10.9
    // If pre-start days were included in numerator too (all 0), same: 120/11 ≈ 10.9
    // Correct: 120/4 = 30
    expect(monthScore(state, 2026, 5)).toBe(30);
    expect(monthScore(state, 2026, 5)).not.toBeCloseTo(10.9, 0);
  });
});

// ─── U-m9e-005: monthScore — current month is partial; today's live dayPct counts ──

describe("U-m9e-005: monthScore — current month is partial; today's live dayPct counts", () => {
  // F-standing: programStart="2026-05-01", currentDate="2026-05-18"
  // history: 05-01..05-17 each dayPct70 (17 archived days)
  // live in-progress day: dayPct = 40 (2/5 done via makeM9eDay40 live blocks)
  // In-range non-future days of May 2026: 05-01..05-18 = 18 days
  // Future days 05-19..05-31 excluded
  // numerator = 70*17 + 40 = 1190 + 40 = 1230; denominator = 18
  // result = 1230/18 = 68.333...

  function makeStandingState(): AppState {
    const history: Record<string, ArchivedDay> = {};
    for (let d = 1; d <= 17; d++) {
      const dd = String(d).padStart(2, "0");
      history[`2026-05-${dd}`] = makeM9eDay70();
    }
    return {
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history,
      // Live in-progress day scoring 40% (2/5 done)
      blocks: [],
      categories: [],
      looseBricks: [
        {
          id: "live-a",
          name: "a",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: true,
        },
        {
          id: "live-b",
          name: "b",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: true,
        },
        {
          id: "live-c",
          name: "c",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: false,
        },
        {
          id: "live-d",
          name: "d",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: false,
        },
        {
          id: "live-e",
          name: "e",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: false,
        },
      ],
    };
  }

  it("F-standing: monthScore(state, 2026, 4) ≈ 68.333 — averages 18 in-range days incl. live day", () => {
    const state = makeStandingState();
    expect(monthScore(state, 2026, 4)).toBeCloseTo(68.333, 2);
  });

  it("F-standing: future month (June 2026) returns null — every day > currentDate", () => {
    const state = makeStandingState();
    // June 2026: all 30 days > currentDate "2026-05-18" → future → denominator = 0 → NO_DATA
    expect(monthScore(state, 2026, 5)).toBe(null);
  });
});

// ─── U-m9e-006: monthScore — no-data sentinel for fully-future / fully-pre-start months ──

describe("U-m9e-006: monthScore — no-data sentinel: fully-future / fully-pre-start → null", () => {
  // F-standing: programStart="2026-05-01", currentDate="2026-05-18"

  it("July 2026 (fully future) → exact null, NOT 0", () => {
    const state: AppState = {
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: {},
      blocks: [],
      categories: [],
      looseBricks: [],
    };
    // monthIndex 6 = July
    const result = monthScore(state, 2026, 6);
    expect(result).toBe(null);
    // Strict null check — must not be falsy-but-not-null
    expect(result === null).toBe(true);
    expect(result).not.toBe(0);
  });

  it("April 2026 (fully pre-start) → exact null, NOT 0", () => {
    const state: AppState = {
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: {},
      blocks: [],
      categories: [],
      looseBricks: [],
    };
    // monthIndex 3 = April — every day < programStart "2026-05-01"
    const result = monthScore(state, 2026, 3);
    expect(result).toBe(null);
    expect(result === null).toBe(true);
    expect(result).not.toBe(0);
  });

  it("NO_DATA sentinel is exported and equals null", () => {
    expect(NO_DATA).toBe(null);
    expect(NO_DATA === null).toBe(true);
  });
});

// ─── U-m9e-007: yearScore — averages DAYS directly, NOT the twelve monthScores ──

describe("U-m9e-007: yearScore — averages DAYS directly, NOT the twelve monthScores — SG-m9e-01 guard", () => {
  // Fixture for divergence proof:
  // programStart = "2026-01-31", currentDate = "2026-02-02"
  // history = {01-31: dayPct100, 02-01: dayPct0(archived), 02-02: dayPct0(archived)}
  // Jan in-range: 01-31 only (1 day); Feb in-range: 02-01, 02-02 (2 days)
  // monthScore(Jan=0) = 100/1 = 100
  // monthScore(Feb=1) = (0+0)/2 = 0
  // mean of non-null monthScores = (100+0)/2 = 50
  // yearScore(2026) = (100+0+0) / 3 = 33.333... (day-averaging)
  // 33.333 ≠ 50 — divergence confirms day-averaging vs month-averaging

  function makeDivergenceState(): AppState {
    return {
      programStart: "2026-01-31",
      currentDate: "2026-02-02",
      history: {
        "2026-01-31": makeM9eDay100(),
        "2026-02-01": makeM9eDay0(),
        "2026-02-02": makeM9eDay0(),
      },
      blocks: [],
      categories: [],
      looseBricks: [],
    };
  }

  it("yearScore(state, 2026) ≈ 33.333 (day-averaged over 3 in-range days)", () => {
    const state = makeDivergenceState();
    expect(yearScore(state, 2026)).toBeCloseTo(33.333, 2);
  });

  it("yearScore is NOT 50 — 50 is what month-averaging would yield; day-averaging gives 33.333", () => {
    const state = makeDivergenceState();
    const ys = yearScore(state, 2026);
    expect(ys).not.toBeCloseTo(50, 1);
    expect(ys).toBeCloseTo(33.333, 2);
  });

  it("monthScore(Jan) = 100 and monthScore(Feb) = 0 — divergence confirmed by month scores", () => {
    const state = makeDivergenceState();
    // monthIndex 0 = January: 1 in-range day (01-31), scored 100
    expect(monthScore(state, 2026, 0)).toBe(100);
    // monthIndex 1 = February: 2 in-range days (02-01, 02-02), both scored 0
    expect(monthScore(state, 2026, 1)).toBe(0);
    // Mean of the two non-null monthScores = 50 — different from yearScore
    const meanOfMonths = (100 + 0) / 2;
    expect(meanOfMonths).toBe(50);
    const ys = yearScore(state, 2026);
    expect(ys).not.toBeCloseTo(meanOfMonths, 1);
  });
});

// ─── U-m9e-008: yearScore — no-data sentinel + first-run single-day year ──────

describe("U-m9e-008: yearScore — no-data sentinel + first-run single-day year", () => {
  it("fully-future year (2027) against F-standing → exact null", () => {
    const state: AppState = {
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: {},
      blocks: [],
      categories: [],
      looseBricks: [],
    };
    const result = yearScore(state, 2027);
    expect(result).toBe(null);
    expect(result === null).toBe(true);
    expect(result).not.toBe(0);
  });

  it("fully-pre-start year (2025) against F-standing → exact null", () => {
    const state: AppState = {
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: {},
      blocks: [],
      categories: [],
      looseBricks: [],
    };
    const result = yearScore(state, 2025);
    expect(result).toBe(null);
    expect(result === null).toBe(true);
    expect(result).not.toBe(0);
  });

  it("F-firstrun: yearScore(2026) = 50 — only today (programStart=currentDate) is in-range", () => {
    // F-firstrun: programStart="2026-05-18", currentDate="2026-05-18", history={}
    // Live in-progress day scoring dayPct=50 (1/2 done)
    const state: AppState = {
      programStart: "2026-05-18",
      currentDate: "2026-05-18",
      history: {},
      blocks: [],
      categories: [],
      looseBricks: [
        {
          id: "fr-a",
          name: "a",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: true,
        },
        {
          id: "fr-b",
          name: "b",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: false,
        },
      ],
    };
    // 2026-05-18 is the only in-range day: dayScore = live dayPct = 50
    // All days before 05-18 are pre-start; all days after are future
    // yearScore = 50 / 1 = 50
    expect(yearScore(state, 2026)).toBe(50);
  });
});

// ─── U-m9e-009: monthScore / yearScore — purity, clock-independence, mutation-resistant ──

describe("U-m9e-009: monthScore/yearScore — purity, clock-independence, frozen-state safe", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function makeFrozenStandingState(): Readonly<AppState> {
    const history: Record<string, ArchivedDay> = {};
    for (let d = 1; d <= 17; d++) {
      const dd = String(d).padStart(2, "0");
      const day = makeM9eDay70();
      history[`2026-05-${dd}`] = Object.freeze(day) as ArchivedDay;
    }
    Object.freeze(history);

    const state: AppState = {
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history,
      blocks: Object.freeze([]) as unknown as AppState["blocks"],
      categories: Object.freeze([]) as unknown as AppState["categories"],
      looseBricks: Object.freeze([
        {
          id: "live-a",
          name: "a",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: true,
        },
        {
          id: "live-b",
          name: "b",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: false,
        },
      ]) as AppState["looseBricks"],
    };
    return Object.freeze(state) as Readonly<AppState>;
  }

  it("monthScore does not throw when state is deeply frozen", () => {
    const frozenState = makeFrozenStandingState();
    expect(() => monthScore(frozenState, 2026, 4)).not.toThrow();
  });

  it("yearScore does not throw when state is deeply frozen", () => {
    const frozenState = makeFrozenStandingState();
    expect(() => yearScore(frozenState, 2026)).not.toThrow();
  });

  it("monthScore returns identical results before and after advancing the system clock", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-05-18T12:00:00"));

    const frozenState = makeFrozenStandingState();
    const result1 = monthScore(frozenState, 2026, 4);

    // Advance clock by 2 years
    vi.setSystemTime(new Date("2028-05-18T12:00:00"));
    const result2 = monthScore(frozenState, 2026, 4);

    expect(result1).toEqual(result2);
    expect(typeof result1).toBe("number");
  });

  it("yearScore returns identical results before and after advancing the system clock", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-05-18T12:00:00"));

    const frozenState = makeFrozenStandingState();
    const result1 = yearScore(frozenState, 2026);

    // Advance clock to a later year
    vi.setSystemTime(new Date("2029-01-01T00:00:00"));
    const result2 = yearScore(frozenState, 2026);

    expect(result1).toEqual(result2);
    expect(typeof result1).toBe("number");
  });
});
