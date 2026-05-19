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

  it("SCHEMA_VERSION is the number 2", () => {
    expect(SCHEMA_VERSION).toBe(2);
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
    expect(state.schemaVersion).toBe(2);
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

  it("raw localStorage JSON has exactly the 7 v2 keys — schemaVersion, programStart, currentDate, history, blocks, categories, looseBricks — and schemaVersion === 2", () => {
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
        "history",
        "looseBricks",
        "programStart",
        "schemaVersion",
      ].sort(),
    );
    expect(parsed.schemaVersion).toBe(2);
  });
});

// ─── U-m8-003: saveState writes ADR-044 boundary shape ───────────────────────

describe("U-m8-003: saveState writes ADR-045 persisted shape — schemaVersion is boundary-only", () => {
  it("persisted JSON has schemaVersion: 2 and the exact 7 v2 keys — no leaked runtime fields", () => {
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

    // Exactly these 7 v2 keys — no extra fields
    expect(Object.keys(parsed).sort()).toEqual(
      [
        "blocks",
        "categories",
        "currentDate",
        "history",
        "looseBricks",
        "programStart",
        "schemaVersion",
      ].sort(),
    );
    expect(parsed.schemaVersion).toBe(2);
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
    expect(result.schemaVersion).toBe(2);
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
    expect(result.schemaVersion).toBe(2);
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
    expect(result.schemaVersion).toBe(2);
    expect(result.programStart).toBe("2026-05-01"); // preserved
    expect(result.currentDate).toBe("2026-05-18"); // preserved
  });

  it("returns defaultPersisted() when schemaVersion is 3 (future/unknown)", () => {
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
    expect(result.schemaVersion).toBe(2);
    expect(result.blocks).toEqual([]);
    expect(result.programStart).toBe(today());
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
    expect(result.schemaVersion).toBe(2);
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
    expect(result.schemaVersion).toBe(2);
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
    // v1 payload gets migrated to v2
    expect(result?.schemaVersion).toBe(2);
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
    expect(result.schemaVersion).toBe(2);
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

  it("SCHEMA_VERSION is the number 2", () => {
    expect(SCHEMA_VERSION).toBe(2);
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
    expect(state.schemaVersion).toBe(2);
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

  it("raw localStorage JSON has exactly the 7 v2 keys and schemaVersion === 2", () => {
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
        "history",
        "looseBricks",
        "programStart",
        "schemaVersion",
      ].sort(),
    );
    expect(parsed.schemaVersion).toBe(2);
  });
});

// ─── U-m9b-003: first run → v2 default ───────────────────────────────────────

describe("U-m9b-003: loadState returns v2 default on first run (no key)", () => {
  it("returns empty v2 default with currentDate=today and history={}", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-18T10:00:00"));

    expect(() => loadState()).not.toThrow();
    const result = loadState();
    expect(result.schemaVersion).toBe(2);
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
  it("returns schemaVersion:2, currentDate=today, history={}, all fresh", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-18T10:00:00"));

    const a = defaultPersisted();
    const b = defaultPersisted();

    expect(a.schemaVersion).toBe(2);
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
    expect(result.schemaVersion).toBe(2);
    expect(result.programStart).toBe("2026-03-10"); // preserved, NOT re-stamped
    expect(result.currentDate).toBe("2026-05-18"); // set to today
    expect(result.history).toEqual({});
    expect(result.blocks).toEqual([{ id: "b1" }]);
    expect(result.categories).toEqual([{ id: "c1" }]);
    expect(result.looseBricks).toEqual([{ id: "t1" }]);

    vi.useRealTimers();
  });
});

// ─── U-m9b-006: schemaVersion ≥ 3 or non-numeric → default ──────────────────

describe("U-m9b-006: loadState returns default for unknown/future schemaVersion (≥3 or non-numeric)", () => {
  it("returns defaultPersisted() for schemaVersion: 3 (future/unknown)", () => {
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
    expect(result.schemaVersion).toBe(2);
    expect(result.blocks).toEqual([]);
    expect(result.programStart).toBe("2026-05-18");

    vi.useRealTimers();
  });

  it("returns defaultPersisted() for schemaVersion: 4", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-18T10:00:00"));

    mockStorage._store[STORAGE_KEY] = JSON.stringify({ schemaVersion: 4 });
    const result = loadState();
    expect(result.schemaVersion).toBe(2);
    expect(result.blocks).toEqual([]);

    vi.useRealTimers();
  });

  it('returns defaultPersisted() for schemaVersion: "2" (non-numeric string)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-18T10:00:00"));

    mockStorage._store[STORAGE_KEY] = JSON.stringify({ schemaVersion: "2" });
    const result = loadState();
    expect(result.schemaVersion).toBe(2);
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
    expect(result.schemaVersion).toBe(2);

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
    expect(result.schemaVersion).toBe(2);
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
