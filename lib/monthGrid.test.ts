/**
 * lib/monthGrid.test.ts — M9c: unit tests for the pure monthGrid date-math module.
 * Covers: U-m9c-001..006.
 * Pure unit tests — no localStorage, no React, no clock reads.
 * monthGridCells(year, month) is called with literal integer args.
 */

import { describe, it, expect } from "vitest";
import { monthGridCells, addMonth, subMonth, type GridCell } from "./monthGrid";

// ─── U-m9c-001: May 2026 grid — 5 leading blanks, 31 dates, 42 cells total ──

describe("U-m9c-001: monthGridCells — May 2026 cell layout (5 leading blanks, 31 days, 42 cells)", () => {
  it("returns 42 cells: 5 blank + 31 date + 6 trailing blank cells", () => {
    // May 1, 2026 is a Friday → weekday index 5 → 5 leading blanks
    const cells = monthGridCells(2026, 4); // month 4 = May (0-indexed)
    expect(cells).toHaveLength(42); // 5 + 31 + 6 = 42 = 6 rows × 7
  });

  it("first 5 cells are blank (Sun..Thu alignment), cells 5..35 are date cells 1..31", () => {
    const cells = monthGridCells(2026, 4);
    // First 5 are blanks
    for (let i = 0; i < 5; i++) {
      expect(cells[i]!.kind).toBe("blank");
    }
    // Cells 5..35 are date cells 1..31
    for (let i = 5; i < 36; i++) {
      const cell = cells[i]!;
      expect(cell.kind).toBe("date");
      if (cell.kind === "date") {
        expect(cell.dayOfMonth).toBe(i - 4); // dayOfMonth 1..31
        expect(cell.iso).toBe(`2026-05-${String(i - 4).padStart(2, "0")}`);
      }
    }
  });

  it("trailing cells (36..41) are blank to pad to 6 full rows", () => {
    const cells = monthGridCells(2026, 4);
    for (let i = 36; i < 42; i++) {
      expect(cells[i]!.kind).toBe("blank");
    }
  });
});

// ─── U-m9c-002: January 2026 grid — 4 leading blanks (Thursday 1st) ──────────

describe("U-m9c-002: monthGridCells — January 2026 (1st is Thursday → 4 leading blanks, 31 days)", () => {
  it("returns 35 cells: 4 blank + 31 date cells (no trailing blanks needed)", () => {
    // Jan 1, 2026 is a Thursday → weekday 4 → 4 leading blanks
    const cells = monthGridCells(2026, 0); // month 0 = January
    expect(cells).toHaveLength(35); // 4 + 31 = 35 = exactly 5 rows × 7
  });

  it("first 4 are blank, then date cells 1..31 with correct iso strings", () => {
    const cells = monthGridCells(2026, 0);
    for (let i = 0; i < 4; i++) {
      expect(cells[i]!.kind).toBe("blank");
    }
    for (let i = 4; i < 35; i++) {
      const cell = cells[i]!;
      expect(cell.kind).toBe("date");
      if (cell.kind === "date") {
        expect(cell.dayOfMonth).toBe(i - 3);
        expect(cell.iso).toBe(`2026-01-${String(i - 3).padStart(2, "0")}`);
      }
    }
  });
});

// ─── U-m9c-003: December 2026 grid — year boundary, 31 days ─────────────────

describe("U-m9c-003: monthGridCells — December 2026 (1st is Tuesday → 2 leading blanks, 31 days)", () => {
  it("returns 35 cells: 2 blank + 31 date + 2 trailing blank cells", () => {
    // Dec 1, 2026 is a Tuesday → weekday 2 → 2 leading blanks
    const cells = monthGridCells(2026, 11); // month 11 = December
    expect(cells).toHaveLength(35); // 2 + 31 + 2 = 35 = 5 rows × 7
  });

  it("iso strings use '2026-12-DD' format — year boundary intact", () => {
    const cells = monthGridCells(2026, 11);
    const dateCells = cells.filter(
      (c): c is GridCell & { kind: "date" } => c.kind === "date",
    );
    expect(dateCells).toHaveLength(31);
    expect(dateCells[0]!.iso).toBe("2026-12-01");
    expect(dateCells[30]!.iso).toBe("2026-12-31");
  });
});

// ─── U-m9c-004: February 2026 — 0 leading blanks, 28 days, exactly 4 rows ───

describe("U-m9c-004: monthGridCells — February 2026 (1st is Sunday → 0 leading blanks, 28 days)", () => {
  it("returns exactly 28 cells — no leading or trailing blanks (4 rows × 7)", () => {
    // Feb 1, 2026 is a Sunday → weekday 0 → 0 leading blanks; 28 days exactly = 4 rows
    const cells = monthGridCells(2026, 1); // month 1 = February
    expect(cells).toHaveLength(28);
  });

  it("all 28 cells are date cells with iso '2026-02-01'..'2026-02-28'", () => {
    const cells = monthGridCells(2026, 1);
    cells.forEach((cell, i) => {
      expect(cell.kind).toBe("date");
      if (cell.kind === "date") {
        expect(cell.dayOfMonth).toBe(i + 1);
        expect(cell.iso).toBe(`2026-02-${String(i + 1).padStart(2, "0")}`);
      }
    });
  });
});

// ─── U-m9c-005: UTC-drift-free — May 2026 under negative UTC offset ──────────
// This is the mutation-resistant guard — a mutant using `new Date(isoString)` would
// parse as UTC midnight and drift a day in TZ = "America/Los_Angeles" (UTC−8).
// The multi-arg constructor `new Date(year, month, day)` is local-time safe and
// produces byte-identical output regardless of process.env.TZ.

describe("U-m9c-005: UTC-drift-free — monthGridCells produces identical output regardless of TZ", () => {
  it("May 2026 grid is identical under default TZ and TZ='America/Los_Angeles'", () => {
    // Compute once under current TZ
    const cellsDefault = monthGridCells(2026, 4);

    // Temporarily override TZ (process.env.TZ is read by Date internals in Node)
    const originalTZ = process.env.TZ;
    try {
      process.env.TZ = "America/Los_Angeles";
      const cellsNeg = monthGridCells(2026, 4);

      // The output must be byte-identical: same length, same cell kinds, same iso strings
      expect(cellsNeg).toHaveLength(cellsDefault.length);
      cellsNeg.forEach((cell, i) => {
        const expected = cellsDefault[i]!;
        expect(cell.kind).toBe(expected.kind);
        if (cell.kind === "date" && expected.kind === "date") {
          expect(cell.iso).toBe(expected.iso);
          expect(cell.dayOfMonth).toBe(expected.dayOfMonth);
        }
      });
    } finally {
      if (originalTZ === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalTZ;
      }
    }
  });

  it("May 2026 has 5 leading blanks — a mutant using new Date(isoString) drifts a day in UTC-8", () => {
    // The 1st of May 2026 is Friday (weekday 5) → 5 leading blanks.
    // This assertion fails if the implementation uses new Date(isoString) with UTC drift.
    const cells = monthGridCells(2026, 4);
    const leadingBlanks = cells.filter(
      (c, i) => c.kind === "blank" && i < 7, // only check first row
    );
    expect(leadingBlanks).toHaveLength(5);
  });
});

// ─── U-m9c-006: addMonth / subMonth — year boundary arithmetic ───────────────

describe("U-m9c-006: addMonth/subMonth — pure integer arithmetic across year boundaries", () => {
  it("addMonth({year:2026, month:11}) → {year:2027, month:0} (Dec→Jan year advance)", () => {
    const result = addMonth({ year: 2026, month: 11 });
    expect(result).toEqual({ year: 2027, month: 0 });
  });

  it("subMonth({year:2027, month:0}) → {year:2026, month:11} (Jan→Dec year retreat)", () => {
    const result = subMonth({ year: 2027, month: 0 });
    expect(result).toEqual({ year: 2026, month: 11 });
  });

  it("addMonth({year:2026, month:4}) → {year:2026, month:5} (May→June, no year change)", () => {
    const result = addMonth({ year: 2026, month: 4 });
    expect(result).toEqual({ year: 2026, month: 5 });
  });

  it("subMonth({year:2026, month:4}) → {year:2026, month:3} (May→April, no year change)", () => {
    const result = subMonth({ year: 2026, month: 4 });
    expect(result).toEqual({ year: 2026, month: 3 });
  });

  it("addMonth then subMonth round-trips to the original value", () => {
    const start = { year: 2026, month: 6 };
    expect(subMonth(addMonth(start))).toEqual(start);
  });
});
