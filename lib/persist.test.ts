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

  it("SCHEMA_VERSION is the number 1", () => {
    expect(SCHEMA_VERSION).toBe(1);
  });

  it("loadState, saveState, defaultPersisted, migrate are all functions", () => {
    expect(typeof loadState).toBe("function");
    expect(typeof saveState).toBe("function");
    expect(typeof defaultPersisted).toBe("function");
    expect(typeof migrate).toBe("function");
  });

  it("PersistedState type-checks at compile time (tsc gate)", () => {
    // If this compiles, the type is exported correctly.
    const state: PersistedState = {
      schemaVersion: 1,
      programStart: "2026-05-15",
      blocks: [],
      categories: [],
      looseBricks: [],
    };
    expect(state.schemaVersion).toBe(1);
  });
});

// ─── U-m8-002: saveState + loadState round-trip ───────────────────────────────

describe("U-m8-002: saveState/loadState round-trip — exact done value fidelity", () => {
  it("round-trips a full PersistedState with exact block/brick/category/loose-brick values", () => {
    const state: PersistedState = {
      schemaVersion: 1,
      programStart: "2026-05-01",
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

  it("raw localStorage JSON has exactly schemaVersion, programStart, blocks, categories, looseBricks — and schemaVersion === 1", () => {
    const state: PersistedState = {
      schemaVersion: 1,
      programStart: "2026-05-01",
      blocks: [],
      categories: [],
      looseBricks: [],
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
        "looseBricks",
        "programStart",
        "schemaVersion",
      ].sort(),
    );
    expect(parsed.schemaVersion).toBe(1);
  });
});

// ─── U-m8-003: saveState writes ADR-044 boundary shape ───────────────────────

describe("U-m8-003: saveState writes ADR-044 persisted shape — schemaVersion is boundary-only", () => {
  it("persisted JSON has schemaVersion: 1 and the exact 5 keys — no leaked runtime fields", () => {
    const input: PersistedState = {
      schemaVersion: 1,
      programStart: "2026-05-01",
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
    };

    saveState(input);
    const raw = mockStorage._store[STORAGE_KEY];
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    // Exactly these 5 keys — no extra fields
    expect(Object.keys(parsed).sort()).toEqual(
      [
        "blocks",
        "categories",
        "looseBricks",
        "programStart",
        "schemaVersion",
      ].sort(),
    );
    expect(parsed.schemaVersion).toBe(1);
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
    expect(result.schemaVersion).toBe(1);
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
    expect(result.schemaVersion).toBe(1);
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
  it("returns defaultPersisted() when schemaVersion is 2 (future)", () => {
    mockStorage._store[STORAGE_KEY] = JSON.stringify({
      schemaVersion: 2,
      programStart: "2026-05-01",
      blocks: [],
      categories: [],
      looseBricks: [],
    });
    expect(() => loadState()).not.toThrow();
    const result = loadState();
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
    });
    expect(() => loadState()).not.toThrow();
    const result = loadState();
    expect(result.programStart).toBe(today());
  });

  it("returns defaultPersisted() when schemaVersion key is absent", () => {
    mockStorage._store[STORAGE_KEY] = JSON.stringify({
      programStart: "2026-05-01",
      blocks: [],
      categories: [],
      looseBricks: [],
    });
    expect(() => loadState()).not.toThrow();
    const result = loadState();
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
      schemaVersion: 1,
      programStart: "2026-05-01",
      blocks: [],
      categories: [],
      looseBricks: [],
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

  it("returns a PersistedState for a well-versioned schemaVersion:1 object", () => {
    const raw = {
      schemaVersion: 1,
      programStart: "2026-05-01",
      blocks: [],
      categories: [],
      looseBricks: [],
    };
    const result = migrate(raw);
    expect(result).not.toBeNull();
    expect(result?.schemaVersion).toBe(1);
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
    });
    const result = loadState();
    expect(result.programStart).toBe(today());
  });
});

// ─── U-m8-011: defaultPersisted() factory ─────────────────────────────────────

describe("U-m8-011: defaultPersisted() is a fresh-object factory", () => {
  it("returns schemaVersion: 1, empty collections, programStart = today", () => {
    const result = defaultPersisted();
    expect(result.schemaVersion).toBe(1);
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
