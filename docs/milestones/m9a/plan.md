## Milestone 9a — appliesOn recurrence resolver — Plan

### Context

M4e gave bricks an optional `recurrence` field (gated by `hasDuration`), but the app only ever renders _today_ — recurrence is stored and inert (ADR-042's "M4e renders today only; recurrence is stored but inert"). M9a adds the one missing piece: a pure resolver `appliesOn(recurrence, date)` that answers "does this recurrence apply on this calendar date?" It is the foundation every later M9 chunk consumes — M9b seeds a new day's recurring bricks at rollover, and M9c–M9e decide which bricks counted toward a past day's score. M9a is entirely back-end: no storage, no UI, no React, no clock reads.

### Feature grouping

This plan is **one feature group: `m9a`** (one BUILDER dispatch). Test IDs in `tests.md` group under the same `m9a` slug. The sub-sections below (function contract / weekday derivation / edge cases) are organizational, not separate features. There is exactly one new file with one exported function — the BUILDER ships it in a single dispatch.

### File structure

**New files**

| Path                    | Change                                                                                                                                                                                                                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/appliesOn.ts`      | NEW. Exports `appliesOn(recurrence: Recurrence, date: string): boolean` and nothing else public. Contains one private helper `parseLocalDate` (see Weekday derivation — SG-m9a-02). Pure module: no React, no `localStorage`, no clock, no imports beyond the `Recurrence` type. |
| `lib/appliesOn.test.ts` | NEW. Co-located Vitest unit suite per repo convention (`lib/<name>.test.ts`, matching `lib/timeOffset.test.ts`, `lib/dayOfYear.test.ts`). **Its contents are the TESTS-phase / BUILDER deliverable, not this plan's** — listed here only so the file structure is complete.      |

**Modified files: NONE.** M9a is strictly additive (AC #10). `lib/types.ts` (the `Recurrence` union) and `lib/dharma.ts` are byte-identical post-M9a — the resolver _imports_ the `Recurrence` type and consumes it, never edits it. No component, no `lib/data.ts`, no `app/` file is touched.

### The function contract

```ts
// lib/appliesOn.ts
import type { Recurrence } from "@/lib/types";

export function appliesOn(recurrence: Recurrence, date: string): boolean;
```

- **Signature:** `recurrence` is a `Recurrence` union value from `lib/types.ts`; `date` is an ISO `YYYY-MM-DD` string supplied by an internal caller (M9b rollover, M9c–M9e views) — assumed well-formed per the M8 boundary stance (no malformed-string validation; AC scope explicitly excludes it). Returns `boolean`.
- **Branch on `recurrence.kind`** via a `switch` with `assertNever(recurrence)` in the default arm (the project's exhaustiveness guard, `lib/types.ts:72`) so a future fifth `kind` fails `tsc` loudly:

  | `kind`          | Returns                                                                                                                                       |
  | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
  | `just-today`    | `recurrence.date === date` (exact ISO string equality) — `true` on the same date, `false` on any other (AC #2).                               |
  | `every-day`     | `true` unconditionally — applies to every valid date (AC #3).                                                                                 |
  | `every-weekday` | `true` iff the weekday of `date` is Mon–Fri; `false` for Sat/Sun (AC #4). With the `0=Sun…6=Sat` convention: `true` iff `wd >= 1 && wd <= 5`. |
  | `custom-range`  | `true` iff `date` is within `[start, end]` **inclusive** AND `date`'s weekday is in `recurrence.weekdays`; `false` otherwise (AC #5, #6, #7). |

- **`custom-range` evaluation order** (short-circuit, cheapest test first):
  1. **Empty-`weekdays` guard:** `recurrence.weekdays.length === 0` → return `false` immediately (AC #7 — no weekday selected ⇒ applies to nothing). String comparison and date parsing are skipped.
  2. **Inclusive range bound:** `date >= recurrence.start && date <= recurrence.end`. ISO `YYYY-MM-DD` strings are lexicographically ordered identically to chronological order, so plain string `<=`/`>=` is correct and timezone-free; **both ends inclusive** (AC #5, #6). A `date` strictly before `start` or strictly after `end` → `false` regardless of weekday (AC #6).
  3. **Weekday membership:** derive `date`'s weekday integer (see below) and return `recurrence.weekdays.includes(wd)` (AC #5). A `date` inside the range whose weekday is not in the set → `false`.

  All three must pass for `true`. The function never mutates `recurrence` or any input (AC #9).

### Weekday derivation (resolves SG-m9a-01 + SG-m9a-02)

**SG-m9a-01 — Weekday integer convention: RESOLVED → `0 = Sunday … 6 = Saturday` (JS-native `getDay()`).**

The producer is `components/RecurrenceChips.tsx` (M2 component, reused verbatim by M4e's `AddBrickSheet` per `AddBrickSheet.tsx:9` "SG-m4e-08: RecurrenceChips reused verbatim"). In `RecurrenceChips.tsx`:

- Line 21: `const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];`
- Lines 179–187: the 7-button picker `.map((day, i) => …)` calls `onClick={() => handleWeekdayToggle(i)}` — it persists the **array index `i`** directly.
- Lines 58–64: `handleWeekdayToggle(day)` pushes that exact integer into `customRange.weekdays`.

So index `0` ("Sun") … index `6` ("Sat") is what gets stored. This is the JS-native `Date.prototype.getDay()` convention and matches the `lib/types.ts:28` comment `// custom-range weekdays: 0=Sun..6=Sat`. **`appliesOn` adopts `0=Sun…6=Sat` verbatim** — derived weekdays compare directly against stored `weekdays` entries and against the `every-weekday` Mon–Fri test (`wd` in `[1,5]`). No remapping. No new ADR (the convention was already implied by ADR-019's union and the `types.ts` comment; M9a only confirms and consumes it).

**SG-m9a-02 — Local-date parsing helper: RESOLVED → add a private `parseLocalDate` inside `lib/appliesOn.ts`.**

Hard constraint (AC #8): the weekday derivation must NOT use `new Date("YYYY-MM-DD")`. That form is parsed by JS as **UTC midnight**; in a negative-offset timezone (e.g. `America/Los_Angeles`, UTC−7/8) the local wall-clock is still the _previous_ day, so `getDay()` returns the wrong weekday — an off-by-one drift.

Neither existing utility fits as a reuse target: `lib/timeOffset.ts` parses `"HH:MM"` (wrong shape), and `lib/dayOfYear.ts` takes a `Date` and returns a day-of-year number (not a weekday, and its callers construct the `Date` themselves). So M9a adds a **small private helper, not exported**:

```ts
// private to lib/appliesOn.ts — not exported
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d); // local-time constructor — no UTC drift
}
```

- The **multi-arg `new Date(year, monthIndex, day)`** constructor builds a date in the **runtime's local timezone** at local midnight — the same DST-safe pattern `lib/dayOfYear.ts` already uses (`new Date(d.getFullYear(), d.getMonth(), d.getDate())`). The weekday is then `parseLocalDate(date).getDay()`, which yields the identical `0–6` integer for a given ISO string in **any** runtime timezone (AC #8). `month - 1` because the JS constructor's month arg is 0-indexed.
- This is **not a clock read** — `new Date(y, m, d)` with explicit components is deterministic and pure; the prohibited form is the **zero-arg** `new Date()` / `Date.now()` (AC #9). VERIFIER: the purity AC bans the _clock_, not the `Date` constructor used with fixed arguments.
- `parseLocalDate` is the **only** place `appliesOn` constructs a `Date`. `just-today` (string equality) and the `custom-range` range bound (string `<=`/`>=`) need no `Date` at all — only the `every-weekday` branch and the `custom-range` weekday-membership step call it.

### Data model

**No new types.** M9a consumes the existing `Recurrence` discriminated union from `lib/types.ts:29-33` **unchanged**:

```ts
export type Recurrence =
  | { kind: "just-today"; date: string } // ISO YYYY-MM-DD
  | { kind: "every-weekday" } // Mon–Fri
  | { kind: "every-day" }
  | { kind: "custom-range"; start: string; end: string; weekdays: number[] };
```

The union is **schema-locked** (ADR-019: "Recurrence is an enum + optional payload, not iCal RRULE"). M9a does not add, remove, or re-shape any `kind` or field. No persistence change — the resolver reads nothing from and writes nothing to `localStorage`; the persisted schema stays at `v1` (a schema bump is an M9b concern, explicitly out of scope here).

### Components

**None.** M9a adds no UI, no React component, no hook. `lib/appliesOn.ts` is a plain TypeScript module exporting one pure function. State that explicitly to the BUILDER: do not create a component file, do not touch `app/` or `components/`.

### Design tokens

**None.** No UI surface ⇒ no colors, fonts, spacing, motion, or shadows. `app/globals.css` is untouched.

### Dependencies

**None.** No new `package.json` entry. The resolver uses only built-in `String.prototype.split`, `Array.prototype.map`/`includes`, the `Date` constructor (with explicit args), and `Date.prototype.getDay()`. Vitest (already installed) runs the unit suite.

### Edge cases

Each spec Edge case mapped to its planned code path:

| Spec edge case                                                      | Planned code path                                                                                                                                            |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `just-today` on the same date → `true`; other date → `false`        | `just-today` arm: `recurrence.date === date` string equality.                                                                                                |
| `every-day` → `true` for every valid date                           | `every-day` arm: `return true` unconditionally.                                                                                                              |
| `every-weekday` on Mon–Fri → `true`; Sat/Sun → `false`              | `every-weekday` arm: `wd = parseLocalDate(date).getDay(); return wd >= 1 && wd <= 5` (0=Sun, 6=Sat both excluded).                                           |
| `custom-range` in `[start,end]` with matching weekday → `true`      | `custom-range` arm: all three checks pass (non-empty weekdays, range bound, `weekdays.includes(wd)`).                                                        |
| `custom-range` date == `start` or == `end` → inclusive              | Range check uses `>=` / `<=` (both bounds inclusive), not `>` / `<`.                                                                                         |
| `custom-range` date strictly before `start` / after `end` → `false` | Range check fails → return `false` before the weekday step is reached, regardless of weekday.                                                                |
| `custom-range` date in range, weekday not in set → `false`          | `weekdays.includes(wd)` returns `false`.                                                                                                                     |
| `custom-range` with empty `weekdays` → `false` for every date       | First check in the `custom-range` arm: `weekdays.length === 0` → return `false` immediately.                                                                 |
| Timezone safety — same ISO date → same verdict in any timezone      | `parseLocalDate` uses the multi-arg local-time `Date` constructor (never `new Date(isoString)`); string-comparison branches are inherently timezone-free.    |
| Year / leap boundaries — Dec→Jan span, Feb 29 coverage              | Range bound is lexicographic ISO string comparison (correct across year boundaries); `parseLocalDate(y, m-1, d)` handles `m-1` rollover and Feb 29 natively. |

**Not handled (deliberately, per spec "What this is NOT"):** malformed/empty `date` strings (internal callers pass validated ISO dates — M8 boundary stance); a brick with no `recurrence` field at all (non-duration bricks carry none — how rollover treats them is an M9b concern, not the resolver's input); timezone changes mid-session.

### Commit strategy

m9a is one feature group, one BUILDER dispatch, one new function. The BUILDER follows the standard TDD inner loop (Red → Green → Refactor → Commit). Because the deliverable is a single small pure function with many small assertions, **per-test-group commit batching is sanctioned**: the BUILDER may group the red commit and the green commit per `kind`-branch test group (e.g. one red+green pair covering all `just-today` IDs, another for `custom-range`) rather than one commit pair per individual test ID. This is an explicit allowance — the orchestrator and EVALUATOR hold the BUILDER to per-group granularity, not strict per-ID. Red commits: `test(m9a): …`; green/refactor commits: `feat(m9a): …`. No phase exit until every `m9a` test ID in `tests.md` is green.

### Out of scope

- **Day rollover, archive, and the `history` map** — M9b. M9a never crosses midnight, never writes storage, never re-creates bricks.
- **The `schemaVersion: 2` bump** and the `history` + in-progress-date persisted fields — M9b.
- **Any calendar UI** — month (Kingdom / M9c), week (Castle / M9d), year (Empire / M9e) views, the day/week/month/year switcher.
- **Score aggregation** over a date range — a read-time M9c–M9e concern that _uses_ `appliesOn` but is not part of it.
- **Deciding what happens to a brick with no `recurrence`** — non-duration bricks carry no recurrence; that policy is M9b's, not the resolver's.
- **Malformed-date validation** — internal callers pass validated ISO strings (M8 boundary stance); `appliesOn` does not defend against `"not-a-date"`.
- **Editing the `Recurrence` union or any `lib/types.ts` / `lib/dharma.ts` line** — M9a is additive-only.
- **A new ADR** — see below.

### Open questions for VERIFIER

**None outstanding.** Both spec gaps are resolved in-plan:

- **SG-m9a-01 — RESOLVED.** Weekday convention is `0=Sun…6=Sat`, confirmed against the producer `components/RecurrenceChips.tsx` (line 21 `WEEKDAYS` array; lines 179–187 persist the array index `i`; lines 58–64 store it verbatim). Matches `lib/types.ts:28`. `appliesOn` adopts it directly with no remapping.
- **SG-m9a-02 — RESOLVED.** A private, non-exported `parseLocalDate(iso)` helper inside `lib/appliesOn.ts` using the multi-arg local-time `Date` constructor. No reuse of `lib/dayOfYear.ts` / `lib/timeOffset.ts` (neither fits the `YYYY-MM-DD → weekday` shape). No `new Date(isoString)` anywhere.

VERIFIER may still wish to confirm: (a) the `0=Sun…6=Sat` math in `appliesOn` matches the `RecurrenceChips` picker (the audit `tests.md` should make checkable); (b) the purity AC #9 reading — `new Date(y, m, d)` with fixed args is pure and permitted; only the zero-arg clock form is banned.

### ADR needed

None. The spec states M9a needs no new ADR — it is a pure additive function over the existing `Recurrence` union. ADR-019 (Accepted) locks the `Recurrence` union shape M9a consumes. The two SG-m9a gaps are resolved within this plan as confirmations of conventions ADR-019 + `lib/types.ts` already imply, not as new decisions. No choice in this plan exceeds an existing ADR.
