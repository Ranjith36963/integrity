/**
 * lib/history.test.ts — M9b rollover unit tests.
 * Covers U-m9b-010..021.
 * Pure unit tests — no localStorage, no clock reads.
 * rollover(state, todayISO) is called directly with literal todayISO strings.
 */

import { describe, it, expect } from "vitest";
import { rollover } from "./history";
import type { PersistedState } from "./persist";
import type { ArchivedDay } from "./types";

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
