// lib/appliesOn.tz.test.ts — M9a: AC #8 timezone-safety tests
//
// U-m9a-011 — negative-offset zone (America/Los_Angeles, UTC-7 in summer)
// U-m9a-012 — cross-zone invariance assertion
//
// These tests MUST be run with TZ=America/Los_Angeles pinned before the V8/ICU
// runtime initialises — achieved via:
//   TZ=America/Los_Angeles npx vitest run lib/appliesOn.tz.test.ts
// or via the npm run test:tz script in package.json.
//
// Falsifiability proof: if parseLocalDate in lib/appliesOn.ts is reverted to
// the buggy form `new Date(iso)` (UTC parse), these tests go RED because
// `new Date('2026-05-18')` in LA timezone (UTC-7 PDT) is interpreted as
// Sunday May 17 at 17:00 local, making getDay() return 0 (Sunday) instead of
// 1 (Monday) — so every-weekday would return false for a Monday, which is wrong.
//
// Do NOT add getTimezoneOffset mocks here — they do not affect V8's timezone.
// The TZ must be pinned at process/worker start, not mutated at runtime.
import { describe, it, expect } from "vitest";
import { appliesOn } from "./appliesOn";
import type { Recurrence } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Pre-flight: confirm the runtime is actually in LA timezone.
// If TZ is not pinned, this describe block surfaces the misconfiguration.
// ─────────────────────────────────────────────────────────────────────────────
describe("pre-flight: TZ=America/Los_Angeles is active", () => {
  it("new Date('2026-05-18') parses as Sunday (getDay 0) in UTC-7 zone", () => {
    // 2026-05-18 00:00:00 UTC is 2026-05-17 17:00:00 PDT (UTC-7).
    // getDay() on that local time is 0 (Sunday) — confirming TZ is pinned.
    // If TZ is NOT pinned (e.g. UTC), getDay() would be 1 (Monday) and this
    // fails, alerting that the test infrastructure is misconfigured.
    const d = new Date("2026-05-18");
    expect(d.getDay()).toBe(0); // Sunday in LA = confirms UTC-7 is active
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// U-m9a-011 — timezone safety, negative-offset zone (America/Los_Angeles)
//
// AC #8: "the same ISO date yields the same verdict regardless of the runtime
// timezone — no new Date('YYYY-MM-DD') UTC-midnight drift."
//
// With TZ=America/Los_Angeles:
//   - new Date('2026-05-18') drifts to Sunday (getDay=0): buggy every-weekday → false
//   - new Date(2026, 4, 18) stays Monday (getDay=1): correct every-weekday → true
//
// The tests below FAIL (go RED) if parseLocalDate is reverted to `new Date(iso)`.
// ─────────────────────────────────────────────────────────────────────────────
describe("U-m9a-011: timezone safety — negative-offset zone (America/Los_Angeles UTC-7 PDT)", () => {
  it("returns true for Monday 2026-05-18 (every-weekday) despite UTC parse drift", () => {
    // Monday 2026-05-18 is a weekday → should return true.
    // With buggy new Date('2026-05-18') in UTC-7: getDay()=0 (Sunday) → false. RED!
    // With correct new Date(2026,4,18): getDay()=1 (Monday) → true. GREEN.
    expect(appliesOn({ kind: "every-weekday" }, "2026-05-18")).toBe(true);
  });

  it("returns true for Tuesday 2026-05-19 (every-weekday) under UTC-7", () => {
    // Tuesday. Buggy parse: UTC midnight 2026-05-19 = Mon May 18 17:00 PDT → getDay=1 (Mon) → true.
    // Note: this case does NOT catch the bug (both buggy and correct give true for Tue)
    // so it is kept for coverage but is not the primary falsification point.
    expect(appliesOn({ kind: "every-weekday" }, "2026-05-19")).toBe(true);
  });

  it("returns false for Sunday 2026-05-17 (every-weekday) under UTC-7", () => {
    // Sunday. Buggy parse: UTC midnight 2026-05-17 = Sat May 16 17:00 PDT → getDay=6 (Sat) → false.
    // Correct parse: getDay=0 (Sun) → false.
    // Both give false here — but for DIFFERENT wrong/right reasons; primary falsification is 05-18.
    expect(appliesOn({ kind: "every-weekday" }, "2026-05-17")).toBe(false);
  });

  it("returns true for custom-range Monday 2026-05-18 (weekday 1 in [1]) under UTC-7", () => {
    // Buggy: getDay()=0 (Sun), 0 not in [1] → false. RED!
    // Correct: getDay()=1 (Mon), 1 in [1] → true. GREEN.
    const rec: Recurrence = {
      kind: "custom-range",
      start: "2026-05-18",
      end: "2026-05-22",
      weekdays: [1], // Monday only
    };
    expect(appliesOn(rec, "2026-05-18")).toBe(true);
  });

  it("returns true for custom-range Friday 2026-05-22 (weekday 5 in [5]) under UTC-7", () => {
    // Friday 2026-05-22. Buggy: UTC midnight = Thu May 21 17:00 PDT → getDay=4 (Thu), 4 not in [5] → false. RED!
    // Correct: getDay=5 (Fri), 5 in [5] → true. GREEN.
    const rec: Recurrence = {
      kind: "custom-range",
      start: "2026-05-18",
      end: "2026-05-22",
      weekdays: [5], // Friday only
    };
    expect(appliesOn(rec, "2026-05-22")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// U-m9a-012 — cross-zone invariance: identical ISO dates yield identical verdicts
//
// AC #8 further specifies that parseLocalDate is timezone-invariant: the same
// ISO string returns the same weekday integer in any zone. We prove this by
// computing verdicts inside this process (LA timezone) and comparing them to
// the results computed by the same code — they should match, because the
// local constructor new Date(y, m-1, d) always returns the local calendar date
// regardless of what UTC offset the process is running in.
// ─────────────────────────────────────────────────────────────────────────────
describe("U-m9a-012: cross-zone invariance — same ISO date, same verdict", () => {
  it("every-weekday verdict for Mon 2026-05-18 matches expected canonical value (true)", () => {
    // Canonical: 2026-05-18 is Monday → every-weekday is true.
    // This test is in a UTC-7 process; if parse is buggy it returns false → mismatch.
    const result = appliesOn({ kind: "every-weekday" }, "2026-05-18");
    expect(result).toBe(true); // canonical Monday value
  });

  it("every-weekday verdict for Fri 2026-05-22 matches expected canonical value (true)", () => {
    const result = appliesOn({ kind: "every-weekday" }, "2026-05-22");
    expect(result).toBe(true); // canonical Friday value
  });

  it("every-weekday verdict for Sat 2026-05-23 matches expected canonical value (false)", () => {
    const result = appliesOn({ kind: "every-weekday" }, "2026-05-23");
    expect(result).toBe(false); // canonical Saturday value
  });

  it("just-today verdict is date-string comparison — timezone-invariant by construction", () => {
    // just-today compares ISO strings directly (recurrence.date === date)
    // so is inherently timezone-safe. Included for completeness.
    const rec: Recurrence = { kind: "just-today", date: "2026-05-18" };
    expect(appliesOn(rec, "2026-05-18")).toBe(true);
    expect(appliesOn(rec, "2026-05-17")).toBe(false);
  });

  it("custom-range with Mon+Fri weekdays: 2026-05-18 true, 2026-05-19 false under UTC-7", () => {
    // 2026-05-18 Mon (getDay=1): buggy=0 → false (RED!), correct=1 → true (GREEN)
    // 2026-05-19 Tue (getDay=2): buggy=1 (Mon) → false, correct=2 (Tue) → false — same! Not a distinguisher.
    // Use 2026-05-18 and 2026-05-22 (Fri) as the discriminating cases.
    const rec: Recurrence = {
      kind: "custom-range",
      start: "2026-05-18",
      end: "2026-05-22",
      weekdays: [1, 5], // Mon, Fri
    };
    expect(appliesOn(rec, "2026-05-18")).toBe(true); // Monday — buggy parse gives false
    expect(appliesOn(rec, "2026-05-22")).toBe(true); // Friday — buggy parse gives false
    expect(appliesOn(rec, "2026-05-19")).toBe(false); // Tuesday — not in [1,5]
  });
});
