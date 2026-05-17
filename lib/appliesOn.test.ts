// lib/appliesOn.test.ts — M9a: appliesOn recurrence resolver
// U-m9a-001..016
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { appliesOn } from "./appliesOn";
import type { Recurrence } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Fixture dates with verified weekdays (JS getDay(), 0=Sun…6=Sat):
//   2026-05-17 Sun (0), 2026-05-18 Mon (1), 2026-05-19 Tue (2),
//   2026-05-20 Wed (3), 2026-05-21 Thu (4), 2026-05-22 Fri (5),
//   2026-05-23 Sat (6)
//   2025-12-31 Wed (3), 2026-01-01 Thu (4)
//   2024-02-28 Wed (3), 2024-02-29 Thu (4), 2024-03-01 Fri (5)
//   2030-01-15 Tue (2)
//   2026-05-15 Fri (5), 2026-05-25 Mon (1)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// U-m9a-001 — success (signature / contract)
// ─────────────────────────────────────────────────────────────────────────────
describe("U-m9a-001: appliesOn is the only public export and returns boolean", () => {
  it("appliesOn is a function", () => {
    expect(typeof appliesOn).toBe("function");
  });

  it("returns a boolean when called with every-day", () => {
    const result = appliesOn({ kind: "every-day" }, "2026-05-17");
    expect(typeof result).toBe("boolean");
  });

  it("compiles with a Recurrence value and ISO string (type-level check via runtime)", () => {
    const rec: Recurrence = { kind: "every-day" };
    const result: boolean = appliesOn(rec, "2026-05-17");
    expect(result).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// U-m9a-002 — success (just-today, same date)
// ─────────────────────────────────────────────────────────────────────────────
describe("U-m9a-002: just-today returns true when date matches recurrence.date", () => {
  it("returns true when date === recurrence.date", () => {
    const rec: Recurrence = { kind: "just-today", date: "2026-05-17" };
    expect(appliesOn(rec, "2026-05-17")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// U-m9a-003 — failure (just-today, different date)
// ─────────────────────────────────────────────────────────────────────────────
describe("U-m9a-003: just-today returns false when date does not match", () => {
  const rec: Recurrence = { kind: "just-today", date: "2026-05-17" };

  it("returns false for adjacent later date", () => {
    expect(appliesOn(rec, "2026-05-18")).toBe(false);
  });

  it("returns false for adjacent earlier date", () => {
    expect(appliesOn(rec, "2026-05-16")).toBe(false);
  });

  it("returns false for a far-off distant date (2030-01-15)", () => {
    expect(appliesOn(rec, "2030-01-15")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// U-m9a-004 — success (every-day, multiple dates incl. weekend)
// ─────────────────────────────────────────────────────────────────────────────
describe("U-m9a-004: every-day returns true for every date including weekends", () => {
  const rec: Recurrence = { kind: "every-day" };

  it("returns true for Monday 2026-05-18", () => {
    expect(appliesOn(rec, "2026-05-18")).toBe(true);
  });

  it("returns true for Saturday 2026-05-23", () => {
    expect(appliesOn(rec, "2026-05-23")).toBe(true);
  });

  it("returns true for Sunday 2026-05-17", () => {
    expect(appliesOn(rec, "2026-05-17")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// U-m9a-005 — success (every-weekday, Mon–Fri all true)
// ─────────────────────────────────────────────────────────────────────────────
describe("U-m9a-005: every-weekday returns true for Mon–Fri", () => {
  const rec: Recurrence = { kind: "every-weekday" };

  it("returns true for Monday 2026-05-18 (getDay 1)", () => {
    expect(appliesOn(rec, "2026-05-18")).toBe(true);
  });

  it("returns true for Tuesday 2026-05-19 (getDay 2)", () => {
    expect(appliesOn(rec, "2026-05-19")).toBe(true);
  });

  it("returns true for Wednesday 2026-05-20 (getDay 3)", () => {
    expect(appliesOn(rec, "2026-05-20")).toBe(true);
  });

  it("returns true for Thursday 2026-05-21 (getDay 4)", () => {
    expect(appliesOn(rec, "2026-05-21")).toBe(true);
  });

  it("returns true for Friday 2026-05-22 (getDay 5)", () => {
    expect(appliesOn(rec, "2026-05-22")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// U-m9a-006 — failure (every-weekday, Sat AND Sun both false)
// ─────────────────────────────────────────────────────────────────────────────
describe("U-m9a-006: every-weekday returns false for Saturday and Sunday", () => {
  const rec: Recurrence = { kind: "every-weekday" };

  it("returns false for Saturday 2026-05-23 (getDay 6)", () => {
    expect(appliesOn(rec, "2026-05-23")).toBe(false);
  });

  it("returns false for Sunday 2026-05-17 (getDay 0)", () => {
    expect(appliesOn(rec, "2026-05-17")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// U-m9a-007 — success (custom-range, in range with matching weekday)
// Includes folded edge case: in-range date whose weekday is NOT in weekdays → false
// ─────────────────────────────────────────────────────────────────────────────
describe("U-m9a-007: custom-range returns true for in-range date with matching weekday", () => {
  const rec: Recurrence = {
    kind: "custom-range",
    start: "2026-05-18",
    end: "2026-05-22",
    weekdays: [1, 3, 5], // Mon, Wed, Fri
  };

  it("returns true for Wed 2026-05-20 (getDay 3, in range, weekday in set)", () => {
    expect(appliesOn(rec, "2026-05-20")).toBe(true);
  });

  it("returns false for Tue 2026-05-19 (getDay 2, in range, weekday NOT in set [1,3,5])", () => {
    // 2026-05-19 is Tuesday (weekday 2); 2 ∉ [1,3,5] → false
    expect(appliesOn(rec, "2026-05-19")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// U-m9a-008 — success / edge (custom-range, inclusive bounds at start and end)
// ─────────────────────────────────────────────────────────────────────────────
describe("U-m9a-008: custom-range bounds are inclusive (>= start AND <= end)", () => {
  const rec: Recurrence = {
    kind: "custom-range",
    start: "2026-05-18",
    end: "2026-05-22",
    weekdays: [1, 2, 3, 4, 5], // Mon–Fri; start=Mon(1), end=Fri(5), both in set
  };

  it("returns true when date === start (2026-05-18, Mon, weekday 1 in set)", () => {
    expect(appliesOn(rec, "2026-05-18")).toBe(true);
  });

  it("returns true when date === end (2026-05-22, Fri, weekday 5 in set)", () => {
    expect(appliesOn(rec, "2026-05-22")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// U-m9a-009 — failure (custom-range, strictly outside range, weekday IN set)
// ─────────────────────────────────────────────────────────────────────────────
describe("U-m9a-009: custom-range returns false for dates strictly outside range", () => {
  const rec: Recurrence = {
    kind: "custom-range",
    start: "2026-05-18",
    end: "2026-05-22",
    weekdays: [1, 2, 3, 4, 5], // Mon–Fri; weekday of probe dates IS in set
  };

  it("returns false for 2026-05-15 (Fri, weekday 5 in set, strictly before start)", () => {
    // 2026-05-15 is a Friday (weekday 5) — in the weekdays set but before start
    expect(appliesOn(rec, "2026-05-15")).toBe(false);
  });

  it("returns false for 2026-05-25 (Mon, weekday 1 in set, strictly after end)", () => {
    // 2026-05-25 is a Monday (weekday 1) — in the weekdays set but after end
    expect(appliesOn(rec, "2026-05-25")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// U-m9a-010 — failure (custom-range, empty weekdays → false for every date)
// ─────────────────────────────────────────────────────────────────────────────
describe("U-m9a-010: custom-range with empty weekdays returns false for every in-range date", () => {
  const rec: Recurrence = {
    kind: "custom-range",
    start: "2026-05-18",
    end: "2026-05-22",
    weekdays: [], // empty
  };

  it("returns false for 2026-05-18 (Mon, in range, weekdays empty)", () => {
    expect(appliesOn(rec, "2026-05-18")).toBe(false);
  });

  it("returns false for 2026-05-20 (Wed, in range, weekdays empty)", () => {
    expect(appliesOn(rec, "2026-05-20")).toBe(false);
  });

  it("returns false for 2026-05-22 (Fri, in range, weekdays empty)", () => {
    expect(appliesOn(rec, "2026-05-22")).toBe(false);
  });

  it("returns false for 2026-05-19 (Tue, in range, weekdays empty)", () => {
    expect(appliesOn(rec, "2026-05-19")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// U-m9a-011 — timezone safety, negative-offset zone (America/Los_Angeles)
// U-m9a-012 — timezone safety, positive-offset zone (Asia/Tokyo)
//
// parseLocalDate uses new Date(y, m-1, d) — the multi-arg local-time constructor.
// This is timezone-invariant: for any ISO YYYY-MM-DD, getDay() returns the same
// weekday integer regardless of the runtime timezone. We demonstrate this by
// mocking Date.prototype.getTimezoneOffset to simulate negative and positive
// offset zones and confirm identical verdicts.
// ─────────────────────────────────────────────────────────────────────────────
describe("U-m9a-011: timezone safety — negative-offset zone (America/Los_Angeles UTC-7/8)", () => {
  let originalGetTimezoneOffset: () => number;

  beforeEach(() => {
    originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
    // Simulate UTC-8 (Los Angeles, PST): getTimezoneOffset returns +480
    Date.prototype.getTimezoneOffset = function () {
      return 480;
    };
  });

  afterEach(() => {
    Date.prototype.getTimezoneOffset = originalGetTimezoneOffset;
  });

  it("returns false for Sunday 2026-05-17 (getDay 0) under negative-offset zone", () => {
    // The naive new Date("2026-05-17") would be UTC midnight, which in UTC-8
    // would appear as Sat 2026-05-16. parseLocalDate avoids this.
    expect(appliesOn({ kind: "every-weekday" }, "2026-05-17")).toBe(false);
  });

  it("returns true for Monday 2026-05-18 (getDay 1) under negative-offset zone", () => {
    expect(appliesOn({ kind: "every-weekday" }, "2026-05-18")).toBe(true);
  });

  it("returns true for custom-range Sunday 2026-05-17 (weekday 0 in [0]) under negative-offset zone", () => {
    const rec: Recurrence = {
      kind: "custom-range",
      start: "2026-05-17",
      end: "2026-05-23",
      weekdays: [0], // Sunday
    };
    expect(appliesOn(rec, "2026-05-17")).toBe(true);
  });
});

describe("U-m9a-012: timezone safety — positive-offset zone (Asia/Tokyo UTC+9) — identical verdict", () => {
  let originalGetTimezoneOffset: () => number;

  beforeEach(() => {
    originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
    // Simulate UTC+9 (Tokyo, JST): getTimezoneOffset returns -540
    Date.prototype.getTimezoneOffset = function () {
      return -540;
    };
  });

  afterEach(() => {
    Date.prototype.getTimezoneOffset = originalGetTimezoneOffset;
  });

  it("returns false for Sunday 2026-05-17 (getDay 0) under positive-offset zone", () => {
    expect(appliesOn({ kind: "every-weekday" }, "2026-05-17")).toBe(false);
  });

  it("returns true for Monday 2026-05-18 (getDay 1) under positive-offset zone", () => {
    expect(appliesOn({ kind: "every-weekday" }, "2026-05-18")).toBe(true);
  });

  it("returns true for custom-range Sunday 2026-05-17 (weekday 0 in [0]) under positive-offset zone", () => {
    const rec: Recurrence = {
      kind: "custom-range",
      start: "2026-05-17",
      end: "2026-05-23",
      weekdays: [0], // Sunday
    };
    expect(appliesOn(rec, "2026-05-17")).toBe(true);
  });

  it("verdicts are identical to the negative-offset zone run (cross-zone equality)", () => {
    // Collect verdicts under positive offset (already active via beforeEach)
    const positiveResults = [
      appliesOn({ kind: "every-weekday" }, "2026-05-17"),
      appliesOn({ kind: "every-weekday" }, "2026-05-18"),
      appliesOn(
        {
          kind: "custom-range",
          start: "2026-05-17",
          end: "2026-05-23",
          weekdays: [0],
        },
        "2026-05-17",
      ),
    ];

    // Simulate negative offset in this closure
    Date.prototype.getTimezoneOffset = function () {
      return 480; // UTC-8
    };
    const negativeResults = [
      appliesOn({ kind: "every-weekday" }, "2026-05-17"),
      appliesOn({ kind: "every-weekday" }, "2026-05-18"),
      appliesOn(
        {
          kind: "custom-range",
          start: "2026-05-17",
          end: "2026-05-23",
          weekdays: [0],
        },
        "2026-05-17",
      ),
    ];

    expect(positiveResults).toEqual(negativeResults);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// U-m9a-013 — purity (no mutation, no clock, deterministic)
// ─────────────────────────────────────────────────────────────────────────────
describe("U-m9a-013: appliesOn is pure — no mutation, no clock dependency, deterministic", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns identical boolean on repeated calls with identical inputs", () => {
    const rec = Object.freeze({
      kind: "custom-range" as const,
      start: "2026-05-18",
      end: "2026-05-22",
      weekdays: Object.freeze([1, 3, 5]) as number[],
    });

    const r1 = appliesOn(rec, "2026-05-20");
    const r2 = appliesOn(rec, "2026-05-20");
    const r3 = appliesOn(rec, "2026-05-20");

    expect(r1).toBe(true);
    expect(r2).toBe(true);
    expect(r3).toBe(true);
  });

  it("returns same result after advancing the system clock", () => {
    const rec = Object.freeze({
      kind: "custom-range" as const,
      start: "2026-05-18",
      end: "2026-05-22",
      weekdays: Object.freeze([1, 3, 5]) as number[],
    });

    vi.useFakeTimers();
    const before = appliesOn(rec, "2026-05-20");

    // Advance the fake clock by 30 days
    vi.setSystemTime(new Date(2026, 5, 19)); // June 19, 2026
    const after = appliesOn(rec, "2026-05-20");

    expect(before).toBe(true);
    expect(after).toBe(true);
    // Result is identical — not dependent on "now"
    expect(before).toBe(after);
  });

  it("does not throw when called with a frozen object (no mutation of input)", () => {
    const rec = Object.freeze({
      kind: "custom-range" as const,
      start: "2026-05-18",
      end: "2026-05-22",
      weekdays: Object.freeze([1, 3, 5]) as number[],
    });
    const recBefore = JSON.stringify(rec);

    // Should not throw (writing to frozen object throws in strict mode)
    expect(() => appliesOn(rec, "2026-05-20")).not.toThrow();

    // recurrence is unchanged after the call
    expect(JSON.stringify(rec)).toBe(recBefore);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// U-m9a-014 — additive-only (import-surface guard)
// ─────────────────────────────────────────────────────────────────────────────
describe("U-m9a-014: lib/appliesOn.ts import-surface guard — type-only Recurrence import", () => {
  it("appliesOn.ts contains only a type-only import from @/lib/types", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "lib/appliesOn.ts"),
      "utf8",
    );

    // Must have a type-only import for Recurrence from @/lib/types
    expect(src).toMatch(
      /import type \{ Recurrence \} from ["']@\/lib\/types["']/,
    );

    // Must NOT import from @/lib/dharma or ./dharma
    expect(src).not.toMatch(/from ["']@\/lib\/dharma["']/);
    expect(src).not.toMatch(/from ["']\.\/dharma["']/);

    // Must NOT have a value import (non-type import) from @/lib/types
    // (import type is OK; bare `import { Recurrence }` is NOT)
    // The only allowed import pattern is `import type { ... }`
    const valueImports = src.match(
      /^import \{[^}]+\} from ["']@\/lib\/types["']/m,
    );
    expect(valueImports).toBeNull();

    // Must NOT import React
    expect(src).not.toMatch(/from ["']react["']/);

    // Must NOT reference localStorage
    expect(src).not.toMatch(/localStorage/);
  });

  it("appliesOn.ts does not re-export or re-declare Recurrence union members", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "lib/appliesOn.ts"),
      "utf8",
    );

    // Must NOT export Recurrence or any union member kind
    expect(src).not.toMatch(/export type Recurrence/);
    expect(src).not.toMatch(/export.*just-today/);
    expect(src).not.toMatch(/export.*every-weekday/);
    expect(src).not.toMatch(/export.*every-day/);
    expect(src).not.toMatch(/export.*custom-range/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// U-m9a-015 — custom-range crossing a year boundary (Dec→Jan)
// ─────────────────────────────────────────────────────────────────────────────
describe("U-m9a-015: custom-range handles year-boundary (Dec 2025 → Jan 2026)", () => {
  const rec: Recurrence = {
    kind: "custom-range",
    start: "2025-12-29",
    end: "2026-01-02",
    weekdays: [3, 4], // Wed, Thu
  };

  it("returns true for 2025-12-31 (Wed, weekday 3, in range)", () => {
    expect(appliesOn(rec, "2025-12-31")).toBe(true);
  });

  it("returns true for 2026-01-01 (Thu, weekday 4, in range)", () => {
    expect(appliesOn(rec, "2026-01-01")).toBe(true);
  });

  it("returns false for 2026-01-03 (Sat, past end)", () => {
    expect(appliesOn(rec, "2026-01-03")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// U-m9a-016 — custom-range covering Feb 29 in a leap year
// ─────────────────────────────────────────────────────────────────────────────
describe("U-m9a-016: custom-range handles leap day Feb 29, 2024", () => {
  const rec: Recurrence = {
    kind: "custom-range",
    start: "2024-02-28",
    end: "2024-03-01",
    weekdays: [3, 4, 5], // Wed, Thu, Fri
  };

  it("returns true for 2024-02-29 (Thu, weekday 4, leap day, in range)", () => {
    expect(appliesOn(rec, "2024-02-29")).toBe(true);
  });

  it("returns true for 2024-02-28 (Wed, weekday 3, in range)", () => {
    expect(appliesOn(rec, "2024-02-28")).toBe(true);
  });

  it("returns true for 2024-03-01 (Fri, weekday 5, in range)", () => {
    expect(appliesOn(rec, "2024-03-01")).toBe(true);
  });
});
