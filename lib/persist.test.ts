/**
 * lib/persist.test.ts — Milestone 8 persistence unit tests.
 * Covers U-m8-001..011.
 * All tests mock localStorage with a fresh in-memory stub per test.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  STORAGE_KEY,
  SCHEMA_VERSION,
  loadState,
  saveState,
  defaultPersisted,
  migrate,
} from "./persist";
import type { PersistedState } from "./persist";
import { today } from "./dharma";

// ─── localStorage mock helpers ───────────────────────────────────────────────

type MockStorage = {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
  _store: Record<string, string>;
};

function makeMockStorage(): MockStorage {
  const store: Record<string, string> = {};
  return {
    _store: store,
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      for (const k in store) delete store[k];
    }),
  };
}

let mockStorage: MockStorage;

beforeEach(() => {
  mockStorage = makeMockStorage();
  Object.defineProperty(globalThis, "localStorage", {
    value: mockStorage,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── U-m8-001: module surface ─────────────────────────────────────────────────

describe("U-m8-001: lib/persist.ts module surface", () => {
  it("STORAGE_KEY is exactly 'dharma:v1'", () => {
    expect(STORAGE_KEY).toBe("dharma:v1");
  });

  it("SCHEMA_VERSION is the number 3", () => {
    expect(SCHEMA_VERSION).toBe(3);
  });

  it("loadState, saveState, defaultPersisted, migrate are all functions", () => {
    expect(typeof loadState).toBe("function");
    expect(typeof saveState).toBe("function");
    expect(typeof defaultPersisted).toBe("function");
    expect(typeof migrate).toBe("function");
  });

  it("PersistedState type-checks at compile time (tsc gate)", () => {
    // If this compiles, the v2 type is exported correctly.
    const state: PersistedState = {
      schemaVersion: 3,
      programStart: "2026-05-15",
      currentDate: "2026-05-15",
      history: {},
      blocks: [],
      categories: [],
      looseBricks: [],
      deletions: {}, // M5
    };
    expect(state.schemaVersion).toBe(3);
  });
});

// ─── U-m8-002: saveState + loadState round-trip ───────────────────────────────

describe("U-m8-002: saveState/loadState round-trip — exact done value fidelity", () => {
  it("round-trips a full PersistedState with exact block/brick/category/loose-brick values", () => {
    const state: PersistedState = {
      schemaVersion: 3,
      programStart: "2026-05-01",
      currentDate: "2026-05-01",
      history: {},
      blocks: [
        {
          id: "b1",
          name: "Morning",
          start: "06:00",
          recurrence: { kind: "just-today", date: "2026-05-01" },
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
              done: 25,
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
      deletions: {}, // M5
    };

    saveState(state);
    const loaded = loadState();

    expect(loaded.blocks[0].id).toBe("b1");
    const nestedBrick = loaded.blocks[0].bricks[0];
    expect(nestedBrick.kind).toBe("units");
    if (nestedBrick.kind === "units") {
      expect(nestedBrick.done).toBe(25); // exact integer
    }
    expect(loaded.categories[0].id).toBe("c1");
    expect(loaded.looseBricks[0].done).toBe(true); // exact boolean
    expect(loaded.programStart).toBe("2026-05-01");
  });

  it("raw localStorage JSON has exactly the 9 v3 keys — schemaVersion, programStart, currentDate, history, blocks, categories, looseBricks, deletions, firstBrickShown — and schemaVersion === 3", () => {
    // Sanctioned M5 amendment: schema v2→v3 adds deletions; key count 7→8.
    // Sanctioned M7e amendment: additive firstBrickShown field; key count 8→9.
    const state: PersistedState = {
      schemaVersion: 3,
      programStart: "2026-05-01",
      currentDate: "2026-05-01",
      history: {},
      blocks: [],
      categories: [],
      looseBricks: [],
      deletions: {}, // M5
    };

    saveState(state);
    const raw = mockStorage._store[STORAGE_KEY];
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw);
    const keys = Object.keys(parsed).sort();
    expect(keys).toEqual(
      [
        "blocks",
        "categories",
        "currentDate",
        "deletions",
        "firstBrickShown",
        "history",
        "looseBricks",
        "programStart",
        "schemaVersion",
      ].sort(),
    );
    expect(parsed.schemaVersion).toBe(3);
  });
});

// ─── U-m8-003: saveState writes ADR-044 boundary shape ───────────────────────

describe("U-m8-003: saveState writes ADR-045 persisted shape — schemaVersion is boundary-only", () => {
  it("persisted JSON has schemaVersion: 3 and the exact 9 v3 keys — no leaked runtime fields", () => {
    const input: PersistedState = {
      schemaVersion: 3,
      programStart: "2026-05-01",
      currentDate: "2026-05-01",
      history: {},
      blocks: [
        {
          id: "b1",
          name: "Work",
          start: "09:00",
          recurrence: { kind: "every-day" },
          categoryId: null,
          bricks: [],
        },
      ],
      categories: [{ id: "c1", name: "Work", color: "#f00" }],
      looseBricks: [
        {
          id: "t1",
          name: "Read",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: false,
        },
      ],
      deletions: {}, // M5
    };

    saveState(input);
    const raw = mockStorage._store[STORAGE_KEY];
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    // Exactly these 9 v3 keys — no extra fields
    // (M5 sanctioned amendment: deletions; M7e sanctioned amendment: firstBrickShown)
    expect(Object.keys(parsed).sort()).toEqual(
      [
        "blocks",
        "categories",
        "currentDate",
        "deletions",
        "firstBrickShown",
        "history",
        "looseBricks",
        "programStart",
        "schemaVersion",
      ].sort(),
    );
    expect(parsed.schemaVersion).toBe(3);
    expect(parsed.programStart).toBe("2026-05-01");
  });
});

// ─── U-m8-004: loadState no-key path ─────────────────────────────────────────

describe("U-m8-004: loadState returns defaultPersisted() on first run (no key)", () => {
  it("returns empty-array collections and programStart = today when no dharma:v1 exists", () => {
    // No setItem called — getItem returns null
    expect(() => loadState()).not.toThrow();
    const result = loadState();
    expect(result.blocks).toEqual([]);
    expect(result.categories).toEqual([]);
    expect(result.looseBricks).toEqual([]);
    expect(result.schemaVersion).toBe(3); // M5 sanctioned amendment
    expect(result.programStart).toBe(today());
  });
});

// ─── U-m8-005: loadState malformed JSON ───────────────────────────────────────

describe("U-m8-005: loadState handles malformed JSON gracefully", () => {
  it("does not throw and returns defaultPersisted() on un-parseable JSON", () => {
    mockStorage._store[STORAGE_KEY] = "{not valid json";
    expect(() => loadState()).not.toThrow();
    const result = loadState();
    expect(result.blocks).toEqual([]);
    expect(result.categories).toEqual([]);
    expect(result.looseBricks).toEqual([]);
    expect(result.schemaVersion).toBe(3); // M5 sanctioned amendment
    expect(result.programStart).toBe(today());
  });

  it("does NOT call localStorage.removeItem — corrupt key left in place (SG-m8-05 passive)", () => {
    mockStorage._store[STORAGE_KEY] = "{not valid json";
    loadState();
    expect(mockStorage.removeItem).not.toHaveBeenCalled();
  });
});

// ─── U-m8-006: unknown/future schemaVersion → defaultPersisted() ──────────────

describe("U-m8-006: loadState returns default for unknown/future schemaVersion", () => {
  it("loads schemaVersion: 2 (current version — NOT unknown)", () => {
    // schemaVersion: 2 is the current version; it must load, not fall back to default.
    mockStorage._store[STORAGE_KEY] = JSON.stringify({
      schemaVersion: 3,
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: {},
      blocks: [],
      categories: [],
      looseBricks: [],
      deletions: {}, // M5
    });
    expect(() => loadState()).not.toThrow();
    const result = loadState();
    expect(result.schemaVersion).toBe(3); // M5 sanctioned amendment
    expect(result.programStart).toBe("2026-05-01"); // preserved
    expect(result.currentDate).toBe("2026-05-18"); // preserved
  });

  it("loads v3 payload with defensive coercion when schemaVersion is 3 (M5 terminus, M5 sanctioned amendment)", () => {
    // schemaVersion 3 is the live terminus in M5 — the case 3 arm loads it correctly.
    mockStorage._store[STORAGE_KEY] = JSON.stringify({
      schemaVersion: 3,
      programStart: "2026-05-01",
      blocks: [],
      categories: [],
      looseBricks: [],
      deletions: {}, // M5
    });
    expect(() => loadState()).not.toThrow();
    const result = loadState();
    expect(result.schemaVersion).toBe(3);
    expect(result.blocks).toEqual([]);
    // v3 case preserves programStart from stored value (not a default fallback)
    expect(result.programStart).toBe("2026-05-01");
  });

  it("returns defaultPersisted() when schemaVersion is 0", () => {
    mockStorage._store[STORAGE_KEY] = JSON.stringify({
      schemaVersion: 0,
      programStart: "2026-05-01",
      blocks: [],
      categories: [],
      looseBricks: [],
      deletions: {}, // M5
    });
    expect(() => loadState()).not.toThrow();
    const result = loadState();
    expect(result.schemaVersion).toBe(3); // M5 sanctioned amendment
    expect(result.programStart).toBe(today());
  });

  it("returns defaultPersisted() when schemaVersion key is absent", () => {
    mockStorage._store[STORAGE_KEY] = JSON.stringify({
      programStart: "2026-05-01",
      blocks: [],
      categories: [],
      looseBricks: [],
      deletions: {}, // M5
    });
    expect(() => loadState()).not.toThrow();
    const result = loadState();
    expect(result.schemaVersion).toBe(3); // M5 sanctioned amendment
    expect(result.programStart).toBe(today());
  });
});

// ─── U-m8-007: partial object → missing collections filled with [] ─────────────

describe("U-m8-007: loadState fills missing/non-array collections with []", () => {
  it("preserves present blocks, fills absent categories and looseBricks with []", () => {
    const block = {
      id: "b1",
      name: "Work",
      start: "09:00",
      recurrence: { kind: "every-day" },
      categoryId: null,
      bricks: [],
    };
    mockStorage._store[STORAGE_KEY] = JSON.stringify({
      schemaVersion: 1,
      programStart: "2026-05-01",
      blocks: [block],
      // categories and looseBricks absent
    });
    const result = loadState();
    expect(result.blocks).toEqual([block]);
    expect(result.categories).toEqual([]);
    expect(result.looseBricks).toEqual([]);
    expect(result.programStart).toBe("2026-05-01");
  });

  it("coerces non-array blocks (e.g. 'oops') to []", () => {
    mockStorage._store[STORAGE_KEY] = JSON.stringify({
      schemaVersion: 1,
      programStart: "2026-05-01",
      blocks: "oops",
      categories: [],
      looseBricks: [],
      deletions: {}, // M5
    });
    const result = loadState();
    expect(result.blocks).toEqual([]);
  });
});

// ─── U-m8-008: throwing localStorage ──────────────────────────────────────────

describe("U-m8-008: getItem/setItem throwing → no crash", () => {
  it("loadState returns defaultPersisted() when getItem throws (Safari private mode)", () => {
    mockStorage.getItem.mockImplementation(() => {
      throw new DOMException("denied");
    });
    expect(() => loadState()).not.toThrow();
    const result = loadState();
    expect(result.blocks).toEqual([]);
    expect(result.programStart).toBe(today());
  });

  it("saveState swallows setItem throws (quota exceeded) — no rethrow", () => {
    mockStorage.setItem.mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    const valid: PersistedState = {
      schemaVersion: 3,
      programStart: "2026-05-01",
      currentDate: "2026-05-01",
      history: {},
      blocks: [],
      categories: [],
      looseBricks: [],
      deletions: {}, // M5
    };
    expect(() => saveState(valid)).not.toThrow();
  });
});

// ─── U-m8-009: migrate scaffold ───────────────────────────────────────────────

describe("U-m8-009: migrate — scaffold version-gate; non-object inputs → null", () => {
  it("returns null for null", () => {
    expect(migrate(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(migrate(undefined)).toBeNull();
  });

  it("returns null for a number", () => {
    expect(migrate(42)).toBeNull();
  });

  it("returns null for a string", () => {
    expect(migrate("hello")).toBeNull();
  });

  it("returns null for an array", () => {
    expect(migrate([])).toBeNull();
  });

  it("returns a PersistedState (migrated to v2) for a well-versioned schemaVersion:1 object", () => {
    const raw = {
      schemaVersion: 1,
      programStart: "2026-05-01",
      blocks: [],
      categories: [],
      looseBricks: [],
      deletions: {}, // M5
    };
    const result = migrate(raw);
    expect(result).not.toBeNull();
    // v1 payload gets migrated to v3 (M5 sanctioned amendment)
    expect(result?.schemaVersion).toBe(3);
  });
});

// ─── U-m8-010: programStart preservation ─────────────────────────────────────

describe("U-m8-010: programStart preserved verbatim from prior session; non-string coerced to today()", () => {
  it("preserves an old programStart date verbatim", () => {
    mockStorage._store[STORAGE_KEY] = JSON.stringify({
      schemaVersion: 1,
      programStart: "2026-03-10",
      blocks: [],
      categories: [],
      looseBricks: [],
      deletions: {}, // M5
    });
    const result = loadState();
    expect(result.programStart).toBe("2026-03-10"); // NOT re-stamped to today
  });

  it("coerces non-string programStart (e.g. 123) to today()", () => {
    mockStorage._store[STORAGE_KEY] = JSON.stringify({
      schemaVersion: 1,
      programStart: 123,
      blocks: [],
      categories: [],
      looseBricks: [],
      deletions: {}, // M5
    });
    const result = loadState();
    expect(result.programStart).toBe(today());
  });
});

// ─── U-m8-011: defaultPersisted() factory ─────────────────────────────────────

describe("U-m8-011: defaultPersisted() is a fresh-object factory", () => {
  it("returns schemaVersion: 3, empty collections, programStart = today", () => {
    const result = defaultPersisted();
    expect(result.schemaVersion).toBe(3); // M5 sanctioned amendment
    expect(result.blocks).toEqual([]);
    expect(result.categories).toEqual([]);
    expect(result.looseBricks).toEqual([]);
    expect(result.programStart).toBe(today());
  });

  it("two calls return distinct array references (no shared mutable default)", () => {
    const a = defaultPersisted();
    const b = defaultPersisted();
    expect(a.blocks).not.toBe(b.blocks);
    expect(a.categories).not.toBe(b.categories);
    expect(a.looseBricks).not.toBe(b.looseBricks);
  });
});

// ─── U-m9b-001: v2 module surface ────────────────────────────────────────────

describe("U-m9b-001: lib/persist.ts v2 module surface", () => {
  it("STORAGE_KEY is still exactly 'dharma:v1'", () => {
    expect(STORAGE_KEY).toBe("dharma:v1");
  });

  it("SCHEMA_VERSION is the number 3", () => {
    expect(SCHEMA_VERSION).toBe(3);
  });

  it("loadState, saveState, defaultPersisted, migrate are all functions", () => {
    expect(typeof loadState).toBe("function");
    expect(typeof saveState).toBe("function");
    expect(typeof defaultPersisted).toBe("function");
    expect(typeof migrate).toBe("function");
  });

  it("PersistedState v2 type-checks at compile time (tsc gate)", () => {
    // If this compiles, the v2 type is exported correctly.
    const state: PersistedState = {
      schemaVersion: 3,
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: {},
      blocks: [],
      categories: [],
      looseBricks: [],
      deletions: {}, // M5
    };
    expect(state.schemaVersion).toBe(3); // M5 sanctioned amendment
    expect(state.currentDate).toBe("2026-05-18");
    expect(state.history).toEqual({});
  });
});

// ─── U-m9b-002: saveState + loadState v2 round-trip ──────────────────────────

describe("U-m9b-002: saveState/loadState v2 round-trip", () => {
  it("round-trips a full v2 PersistedState including currentDate and history", () => {
    const state: PersistedState = {
      schemaVersion: 3,
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: {
        "2026-05-17": {
          blocks: [
            {
              id: "ab1",
              name: "Old",
              start: "09:00",
              recurrence: { kind: "every-day" },
              categoryId: null,
              bricks: [],
            },
          ],
          categories: [],
          looseBricks: [],
        },
      },
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
              done: 25,
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
      deletions: {}, // M5
    };

    saveState(state);
    const loaded = loadState();

    expect(loaded.currentDate).toBe("2026-05-18");
    expect(loaded.history["2026-05-17"].blocks[0].id).toBe("ab1");
    expect(loaded.blocks[0].id).toBe("b1");
    const nestedBrick = loaded.blocks[0].bricks[0];
    expect(nestedBrick.kind).toBe("units");
    if (nestedBrick.kind === "units") {
      expect(nestedBrick.done).toBe(25); // exact integer
    }
    expect(loaded.looseBricks[0].done).toBe(true); // exact boolean
    expect(loaded.programStart).toBe("2026-05-01");
  });

  it("raw localStorage JSON has exactly the 9 v3 keys and schemaVersion === 3", () => {
    // Sanctioned M5 amendment: schema v2→v3 adds deletions; key count 7→8.
    // Sanctioned M7e amendment: additive firstBrickShown field; key count 8→9.
    const state: PersistedState = {
      schemaVersion: 3,
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: {},
      blocks: [],
      categories: [],
      looseBricks: [],
      deletions: {}, // M5
    };

    saveState(state);
    const raw = mockStorage._store[STORAGE_KEY];
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw);
    const keys = Object.keys(parsed).sort();
    expect(keys).toEqual(
      [
        "blocks",
        "categories",
        "currentDate",
        "deletions",
        "firstBrickShown",
        "history",
        "looseBricks",
        "programStart",
        "schemaVersion",
      ].sort(),
    );
    expect(parsed.schemaVersion).toBe(3);
  });
});

// ─── U-m9b-003: first run → v2 default ───────────────────────────────────────

describe("U-m9b-003: loadState returns v2 default on first run (no key)", () => {
  it("returns empty v2 default with currentDate=today and history={}", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-18T10:00:00"));

    expect(() => loadState()).not.toThrow();
    const result = loadState();
    expect(result.schemaVersion).toBe(3); // M5 sanctioned amendment
    expect(result.currentDate).toBe("2026-05-18");
    expect(result.programStart).toBe("2026-05-18");
    expect(result.history).toEqual({});
    expect(result.blocks).toEqual([]);
    expect(result.categories).toEqual([]);
    expect(result.looseBricks).toEqual([]);

    vi.useRealTimers();
  });
});

// ─── U-m9b-004: defaultPersisted() v2 factory ────────────────────────────────

describe("U-m9b-004: defaultPersisted() returns v2 shape with distinct references", () => {
  it("returns schemaVersion:3, currentDate=today, history={}, all fresh", () => {
    // Sanctioned M5 amendment: schemaVersion 2→3.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-18T10:00:00"));

    const a = defaultPersisted();
    const b = defaultPersisted();

    expect(a.schemaVersion).toBe(3);
    expect(a.currentDate).toBe("2026-05-18");
    expect(a.programStart).toBe("2026-05-18");
    expect(a.history).toEqual({});
    expect(a.blocks).toEqual([]);

    // Distinct references — no shared mutable defaults
    expect(a.blocks).not.toBe(b.blocks);
    expect(a.history).not.toBe(b.history);

    vi.useRealTimers();
  });
});

// ─── U-m9b-005: v1 → v2 migration ────────────────────────────────────────────

describe("U-m9b-005: loadState migrates schemaVersion:1 payload to v2", () => {
  it("v1 collections + programStart preserved; currentDate=today; history={}; schemaVersion=2", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-18T10:00:00"));

    mockStorage._store[STORAGE_KEY] = JSON.stringify({
      schemaVersion: 1,
      programStart: "2026-03-10",
      blocks: [{ id: "b1" }],
      categories: [{ id: "c1" }],
      looseBricks: [{ id: "t1" }],
      deletions: {}, // M5
    });

    const result = loadState();
    expect(result.schemaVersion).toBe(3); // M5 sanctioned amendment
    expect(result.programStart).toBe("2026-03-10"); // preserved, NOT re-stamped
    expect(result.currentDate).toBe("2026-05-18"); // set to today
    expect(result.history).toEqual({});
    expect(result.blocks).toEqual([{ id: "b1" }]);
    expect(result.categories).toEqual([{ id: "c1" }]);
    expect(result.looseBricks).toEqual([{ id: "t1" }]);

    vi.useRealTimers();
  });
});

// ─── U-m9b-006: schemaVersion ≥ 4 or non-numeric → default ──────────────────
// M5 sanctioned amendment: schemaVersion 3 is now the live terminus (case 3 in migrate);
// the "≥3 is unknown" test is amended to show schemaVersion 3 loads correctly,
// and the "future/unknown" threshold shifts to ≥4.

describe("U-m9b-006: loadState returns default for unknown/future schemaVersion (≥4 or non-numeric)", () => {
  it("loads v3 payload correctly — schemaVersion 3 is now the current terminus (M5 sanctioned amendment)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-18T10:00:00"));

    mockStorage._store[STORAGE_KEY] = JSON.stringify({
      schemaVersion: 3,
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: {},
      blocks: [],
      categories: [],
      looseBricks: [],
      deletions: {}, // M5
    });
    expect(() => loadState()).not.toThrow();
    const result = loadState();
    expect(result.schemaVersion).toBe(3);
    expect(result.blocks).toEqual([]);
    // v3 payload preserves programStart from stored value
    expect(result.programStart).toBe("2026-05-01");

    vi.useRealTimers();
  });

  it("returns defaultPersisted() for schemaVersion: 4", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-18T10:00:00"));

    mockStorage._store[STORAGE_KEY] = JSON.stringify({ schemaVersion: 4 });
    const result = loadState();
    expect(result.schemaVersion).toBe(3); // M5 sanctioned amendment
    expect(result.blocks).toEqual([]);

    vi.useRealTimers();
  });

  it('returns defaultPersisted() for schemaVersion: "2" (non-numeric string)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-18T10:00:00"));

    mockStorage._store[STORAGE_KEY] = JSON.stringify({ schemaVersion: "2" });
    const result = loadState();
    expect(result.schemaVersion).toBe(3); // M5 sanctioned amendment
    expect(result.blocks).toEqual([]);

    vi.useRealTimers();
  });

  it("returns defaultPersisted() when schemaVersion key is absent", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-18T10:00:00"));

    mockStorage._store[STORAGE_KEY] = JSON.stringify({
      programStart: "2026-05-01",
      blocks: [],
    });
    const result = loadState();
    expect(result.schemaVersion).toBe(3); // M5 sanctioned amendment

    vi.useRealTimers();
  });
});

// ─── U-m9b-007: malformed JSON → default ─────────────────────────────────────

describe("U-m9b-007: loadState handles malformed JSON gracefully", () => {
  it("does not throw and returns defaultPersisted() on un-parseable JSON", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-18T10:00:00"));

    mockStorage._store[STORAGE_KEY] = "{not valid json";
    expect(() => loadState()).not.toThrow();
    const result = loadState();
    expect(result.schemaVersion).toBe(3); // M5 sanctioned amendment
    expect(result.blocks).toEqual([]);
    expect(result.history).toEqual({});

    vi.useRealTimers();
  });
});

// ─── U-m9b-008: non-object history → coerced to {} ───────────────────────────

describe("U-m9b-008: v2 payload with non-object history → history coerced to {}", () => {
  it("history: 'oops' → coerced to {}", () => {
    mockStorage._store[STORAGE_KEY] = JSON.stringify({
      schemaVersion: 3,
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: "oops",
      blocks: [],
      categories: [],
      looseBricks: [],
      deletions: {}, // M5
    });
    expect(() => loadState()).not.toThrow();
    const result = loadState();
    expect(result.history).toEqual({});
    expect(result.currentDate).toBe("2026-05-18");
  });

  it("history: null → coerced to {}", () => {
    mockStorage._store[STORAGE_KEY] = JSON.stringify({
      schemaVersion: 3,
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: null,
      blocks: [],
      categories: [],
      looseBricks: [],
      deletions: {}, // M5
    });
    const result = loadState();
    expect(result.history).toEqual({});
  });

  it("history: 42 → coerced to {}", () => {
    mockStorage._store[STORAGE_KEY] = JSON.stringify({
      schemaVersion: 3,
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: 42,
      blocks: [],
      categories: [],
      looseBricks: [],
      deletions: {}, // M5
    });
    const result = loadState();
    expect(result.history).toEqual({});
  });

  it("history: [] (array) → coerced to {}", () => {
    mockStorage._store[STORAGE_KEY] = JSON.stringify({
      schemaVersion: 3,
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: [],
      blocks: [],
      categories: [],
      looseBricks: [],
      deletions: {}, // M5
    });
    const result = loadState();
    expect(result.history).toEqual({});
  });
});

// ─── U-m9b-009: partial v2 object → defensive coercion ───────────────────────

describe("U-m9b-009: partial v2 payload → defensive coercion of missing/non-string fields", () => {
  it("absent programStart/currentDate/categories/looseBricks coerced to today()/[]", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-18T10:00:00"));

    mockStorage._store[STORAGE_KEY] = JSON.stringify({
      schemaVersion: 3,
      history: {},
      blocks: [{ id: "b1" }],
    });

    const result = loadState();
    expect(result.blocks).toEqual([{ id: "b1" }]);
    expect(result.categories).toEqual([]);
    expect(result.looseBricks).toEqual([]);
    expect(result.programStart).toBe("2026-05-18");
    expect(result.currentDate).toBe("2026-05-18");

    vi.useRealTimers();
  });

  it("non-array blocks (e.g. 'x') coerced to []", () => {
    mockStorage._store[STORAGE_KEY] = JSON.stringify({
      schemaVersion: 3,
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: {},
      blocks: "x",
      categories: [],
      looseBricks: [],
      deletions: {}, // M5
    });
    const result = loadState();
    expect(result.blocks).toEqual([]);
  });

  it("non-string currentDate (e.g. 5) coerced to today()", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-18T10:00:00"));

    mockStorage._store[STORAGE_KEY] = JSON.stringify({
      schemaVersion: 3,
      programStart: "2026-05-01",
      currentDate: 5,
      history: {},
      blocks: [],
      categories: [],
      looseBricks: [],
      deletions: {}, // M5
    });
    const result = loadState();
    expect(result.currentDate).toBe("2026-05-18");

    vi.useRealTimers();
  });
});

// ─── U-m5-009: v2→v3 migrator — additive, lossless; SCHEMA_VERSION === 3 ─────

describe("U-m5-009: v2→v3 migrator — additive, lossless; SCHEMA_VERSION === 3, mutation-resistant", () => {
  it("SCHEMA_VERSION is strictly 3", () => {
    expect(SCHEMA_VERSION).toBe(3);
  });

  it("migrates a v2 payload: adds deletions:{} and schemaVersion:3, preserves all v2 day-data fields byte-identical", () => {
    const v2Payload = {
      schemaVersion: 2,
      programStart: "2026-04-01",
      currentDate: "2026-05-18",
      history: {
        "2026-05-17": {
          blocks: [],
          categories: [],
          looseBricks: [],
        },
      },
      blocks: [
        {
          id: "blk-morning",
          name: "Morning",
          start: "07:00",
          recurrence: { kind: "every-day" },
          categoryId: null,
          bricks: [],
        },
      ],
      categories: [{ id: "cat-health", name: "Health", color: "#0f0" }],
      looseBricks: [
        {
          id: "lb-walk",
          name: "Walk",
          categoryId: null,
          parentBlockId: null,
          hasDuration: false,
          kind: "tick",
          done: false,
        },
      ],
    };

    const result = migrate(v2Payload);
    expect(result).not.toBeNull();
    expect(result!.schemaVersion).toBe(3);
    // deletions is additive and lossless — it was absent in v2, coerced to {}
    expect(result!.deletions).toEqual({});
    // Every v2 day-data field is byte-identical (zero data loss)
    expect(result!.programStart).toBe("2026-04-01");
    expect(result!.currentDate).toBe("2026-05-18");
    expect(result!.history).toEqual({
      "2026-05-17": { blocks: [], categories: [], looseBricks: [] },
    });
    expect(result!.blocks).toEqual(v2Payload.blocks);
    expect(result!.categories).toEqual(v2Payload.categories);
    expect(result!.looseBricks).toEqual(v2Payload.looseBricks);
  });

  it("migrates a v1 payload: lands at schemaVersion:3 with deletions:{} and v1 day data preserved", () => {
    const v1Payload = {
      schemaVersion: 1,
      programStart: "2026-03-15",
      blocks: [
        {
          id: "blk-v1",
          name: "V1 Block",
          start: "08:00",
          recurrence: { kind: "every-day" },
          categoryId: null,
          bricks: [],
        },
      ],
      categories: [],
      looseBricks: [],
    };

    const result = migrate(v1Payload);
    expect(result).not.toBeNull();
    // v1→v3 ladder is unbroken (ADR-044/ADR-045 carry-forward)
    expect(result!.schemaVersion).toBe(3);
    expect(result!.deletions).toEqual({});
    expect(result!.programStart).toBe("2026-03-15");
    expect(result!.blocks).toEqual(v1Payload.blocks);
    expect(result!.history).toEqual({});
  });

  it("an unknown/future schemaVersion (e.g. 99) → migrate returns null → loadState falls back to defaultPersisted()", () => {
    const result = migrate({ schemaVersion: 99 });
    expect(result).toBeNull();
  });

  it("absent schemaVersion → migrate returns null → loadState falls back to defaultPersisted()", () => {
    const result = migrate({ programStart: "2026-05-01", blocks: [] });
    expect(result).toBeNull();
  });

  it("v2 payload is not mutated by migrate (mutation-resistant)", () => {
    const v2Payload = Object.freeze({
      schemaVersion: 2 as const,
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: Object.freeze({}),
      blocks: Object.freeze([]) as unknown as unknown[],
      categories: Object.freeze([]) as unknown as unknown[],
      looseBricks: Object.freeze([]) as unknown as unknown[],
    });
    // Should not throw even with frozen input
    expect(() => migrate(v2Payload)).not.toThrow();
    const result = migrate(v2Payload);
    expect(result!.schemaVersion).toBe(3);
  });
});

// ─── U-m5-010: v3 payload round-trips; deletions coerced defensively ──────────

describe("U-m5-010: v3 payload round-trips; deletions coerced defensively", () => {
  it("well-formed v3 payload round-trips intact — deletions preserved key-for-key", () => {
    const v3Payload = {
      schemaVersion: 3,
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: {},
      blocks: [],
      categories: [],
      looseBricks: [],
      deletions: { "2026-05-18:blk-recur": true },
    };

    const result = migrate(v3Payload);
    expect(result).not.toBeNull();
    expect(result!.schemaVersion).toBe(3);
    expect(result!.deletions).toEqual({ "2026-05-18:blk-recur": true });
    expect(result!.programStart).toBe("2026-05-01");
    expect(result!.currentDate).toBe("2026-05-18");
  });

  it("v3 payload with deletions: null → coerced to {}", () => {
    const malformed = {
      schemaVersion: 3,
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: {},
      blocks: [],
      categories: [],
      looseBricks: [],
      deletions: null,
    };
    const result = migrate(malformed);
    expect(result).not.toBeNull();
    expect(result!.deletions).toEqual({});
    expect(result!.schemaVersion).toBe(3);
  });

  it("v3 payload with deletions: [] (array) → coerced to {}", () => {
    const malformed = {
      schemaVersion: 3,
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: {},
      blocks: [],
      categories: [],
      looseBricks: [],
      deletions: [],
    };
    const result = migrate(malformed);
    expect(result).not.toBeNull();
    expect(result!.deletions).toEqual({});
    expect(result!.schemaVersion).toBe(3);
  });

  it("v3 payload with deletions: string → coerced to {}", () => {
    const malformed = {
      schemaVersion: 3,
      programStart: "2026-05-01",
      currentDate: "2026-05-18",
      history: {},
      blocks: [],
      categories: [],
      looseBricks: [],
      deletions: "bad",
    };
    const result = migrate(malformed);
    expect(result).not.toBeNull();
    expect(result!.deletions).toEqual({});
    expect(result!.schemaVersion).toBe(3);
    // Other day-data fields survive coercion
    expect(result!.programStart).toBe("2026-05-01");
  });
});

// ─── U-m5-011: defaultPersisted() carries deletions:{}; schemaVersion:3 ───────

describe("U-m5-011: defaultPersisted() carries deletions:{} + schemaVersion:3; no editMode field", () => {
  it("defaultPersisted().deletions is an empty object (no overrides on fresh start)", () => {
    const p = defaultPersisted();
    expect(p.deletions).toEqual({});
  });

  it("defaultPersisted() carries schemaVersion:3 (SG-m8-04 separation: schemaVersion is PersistedState-only)", () => {
    const p = defaultPersisted();
    expect(p.schemaVersion).toBe(3);
  });

  it("defaultPersisted() carries no editMode/edit-mode field (SG-m5-04 — Edit Mode is never persisted)", () => {
    const p = defaultPersisted() as Record<string, unknown>;
    expect("editMode" in p).toBe(false);
    expect("edit_mode" in p).toBe(false);
    expect("edit-mode" in p).toBe(false);
  });
});

// ─── M7e: hasAnyBrick + migrate back-fill + schema-lock anchors ───────────────

import { hasAnyBrick } from "./persist";
import type { Block, Brick } from "./types";

const validBrick: Brick = {
  id: "m7e-v1",
  name: "Morning stretch",
  categoryId: null,
  parentBlockId: null,
  hasDuration: false,
  kind: "tick",
  done: false,
};

function makeBlock(id: string, bricks: Brick[] = []): Block {
  return {
    id,
    name: `Block ${id}`,
    start: "09:00",
    recurrence: { kind: "just-today", date: "2026-05-20" },
    categoryId: null,
    bricks,
  };
}

// U-m7e-005: hasAnyBrick truth table
describe("U-m7e-005: hasAnyBrick(blocks, looseBricks) truth table", () => {
  it("([], []) → false", () => {
    expect(hasAnyBrick([], [])).toBe(false);
  });

  it("([{ id: 'B1', bricks: [] }], []) → false", () => {
    expect(hasAnyBrick([makeBlock("B1")], [])).toBe(false);
  });

  it("([], [validBrick]) → true", () => {
    expect(hasAnyBrick([], [validBrick])).toBe(true);
  });

  it("([{ id: 'B1', bricks: [validBrick] }], []) → true", () => {
    expect(hasAnyBrick([makeBlock("B1", [validBrick])], [])).toBe(true);
  });

  it("([{ bricks: [] }, { bricks: [validBrick] }], []) → true", () => {
    expect(
      hasAnyBrick([makeBlock("B1"), makeBlock("B2", [validBrick])], []),
    ).toBe(true);
  });
});

// Base fixture for v3 payloads — required fields
const v3Base = {
  schemaVersion: 3 as const,
  programStart: "2026-05-01",
  currentDate: "2026-05-20",
  history: {},
  categories: [],
  deletions: {},
};

// U-m7e-006: migrate v3 — missing firstBrickShown + has bricks → back-fills to true
describe("U-m7e-006: migrate v3 back-fill — absent firstBrickShown + bricks → true", () => {
  it("returns firstBrickShown === true when payload has bricks and no firstBrickShown field", () => {
    const raw = {
      ...v3Base,
      blocks: [makeBlock("B1", [{ ...validBrick, parentBlockId: "B1" }])],
      looseBricks: [],
    };
    const result = migrate(raw);
    expect(result).not.toBeNull();
    expect(result!.firstBrickShown).toBe(true);
  });
});

// U-m7e-007: migrate v3 — missing firstBrickShown + NO bricks → back-fills to false
describe("U-m7e-007: migrate v3 back-fill — absent firstBrickShown + no bricks → false", () => {
  it("returns firstBrickShown === false when payload has no bricks and no firstBrickShown field", () => {
    const raw = {
      ...v3Base,
      blocks: [makeBlock("B1")], // block with empty bricks[]
      looseBricks: [],
    };
    const result = migrate(raw);
    expect(result).not.toBeNull();
    expect(result!.firstBrickShown).toBe(false);
  });
});

// U-m7e-008: migrate v3 round-trip — firstBrickShown present is preserved
describe("U-m7e-008: migrate v3 round-trip — present firstBrickShown preserved verbatim", () => {
  it("preserves firstBrickShown === true even when no bricks present", () => {
    const raw = {
      ...v3Base,
      blocks: [],
      looseBricks: [],
      firstBrickShown: true,
    };
    const result = migrate(raw);
    expect(result).not.toBeNull();
    expect(result!.firstBrickShown).toBe(true);
  });

  it("preserves firstBrickShown === false even when bricks are present", () => {
    const raw = {
      ...v3Base,
      blocks: [makeBlock("B1", [{ ...validBrick, parentBlockId: "B1" }])],
      looseBricks: [],
      firstBrickShown: false,
    };
    const result = migrate(raw);
    expect(result).not.toBeNull();
    expect(result!.firstBrickShown).toBe(false);
  });
});

// U-m7e-009: migrate v2 → v3 cascade applies hasAnyBrick back-fill
describe("U-m7e-009: migrate v2→v3 cascade applies hasAnyBrick back-fill", () => {
  it("returns firstBrickShown === true for v2 payload with bricks", () => {
    const raw = {
      schemaVersion: 2 as const,
      programStart: "2026-05-01",
      currentDate: "2026-05-20",
      history: {},
      categories: [],
      deletions: {},
      blocks: [makeBlock("B1", [{ ...validBrick, parentBlockId: "B1" }])],
      looseBricks: [],
    };
    const result = migrate(raw);
    expect(result).not.toBeNull();
    expect(result!.firstBrickShown).toBe(true);
  });
});

// U-m7e-010: migrate v1 → v3 cascade lands at firstBrickShown: false
describe("U-m7e-010: migrate v1→v3 cascade lands at firstBrickShown: false", () => {
  it("returns firstBrickShown === false for v1 payload (no bricks in v1)", () => {
    const raw = {
      schemaVersion: 1 as const,
      programStart: "2026-05-01",
      categories: [],
      blocks: [makeBlock("B1")], // v1 blocks have empty bricks[]
      looseBricks: [],
    };
    const result = migrate(raw);
    expect(result).not.toBeNull();
    expect(result!.firstBrickShown).toBe(false);
  });
});

// U-m7e-011: SCHEMA_VERSION === 3 (not bumped per ADR-044)
describe("U-m7e-011: SCHEMA_VERSION stays at 3 — ADR-044 additive optional field", () => {
  it("SCHEMA_VERSION is exactly 3", () => {
    expect(SCHEMA_VERSION).toBe(3);
  });
});

// U-m7e-012: defaultPersisted().firstBrickShown === false
describe("U-m7e-012: defaultPersisted().firstBrickShown === false", () => {
  it("returns firstBrickShown === false on fresh first-run state", () => {
    const p = defaultPersisted();
    expect(p.firstBrickShown).toBe(false);
  });
});

// U-m7e-013: saveState writes firstBrickShown to JSON (including ?? false fallback)
describe("U-m7e-013: saveState writes firstBrickShown to JSON with ?? false fallback", () => {
  it("writes firstBrickShown: true when state.firstBrickShown === true", () => {
    const state: PersistedState = {
      ...defaultPersisted(),
      firstBrickShown: true,
    };
    saveState(state);
    const raw = mockStorage._store[STORAGE_KEY];
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed.firstBrickShown).toBe(true);
  });

  it("writes firstBrickShown: false when state.firstBrickShown === false", () => {
    const state: PersistedState = {
      ...defaultPersisted(),
      firstBrickShown: false,
    };
    saveState(state);
    const raw = mockStorage._store[STORAGE_KEY];
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed.firstBrickShown).toBe(false);
  });

  it("writes firstBrickShown: false when state.firstBrickShown === undefined (?? false fallback)", () => {
    const state: PersistedState = {
      ...defaultPersisted(),
      firstBrickShown: undefined,
    };
    saveState(state);
    const raw = mockStorage._store[STORAGE_KEY];
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed.firstBrickShown).toBe(false);
  });
});

// U-m7e-014: defensive — corrupted firstBrickShown falls through to hasAnyBrick back-fill
describe("U-m7e-014: defensive — corrupted firstBrickShown (string or number) → hasAnyBrick back-fill", () => {
  it("returns firstBrickShown === false for firstBrickShown: 'yes' with no bricks", () => {
    const raw = {
      ...v3Base,
      blocks: [],
      looseBricks: [],
      firstBrickShown: "yes", // string corruption
    };
    expect(() => migrate(raw)).not.toThrow();
    const result = migrate(raw);
    expect(result).not.toBeNull();
    expect(result!.firstBrickShown).toBe(false);
  });

  it("returns firstBrickShown === false for firstBrickShown: 1 with no bricks", () => {
    const raw = {
      ...v3Base,
      blocks: [],
      looseBricks: [],
      firstBrickShown: 1, // number corruption
    };
    expect(() => migrate(raw)).not.toThrow();
    const result = migrate(raw);
    expect(result).not.toBeNull();
    expect(result!.firstBrickShown).toBe(false);
  });
});
