## Milestone 9a — appliesOn recurrence resolver — Tests

This entry covers M9a — the single pure resolver `appliesOn(recurrence: Recurrence, date: string): boolean` in the new file `lib/appliesOn.ts`. It is derived from the `plan.md` M9a entry (`## Milestone 9a — appliesOn recurrence resolver — Plan`). Feature slug: `m9a`. ID prefix: `U-m9a-` only.

**No `C-`/`E-`/`A-` IDs.** M9a adds no UI, no React component, no hook (plan.md § Components: "None"; SPEC AC #11: "M9a adds no UI, so no e2e/a11y specs"). Every M9a test is a Vitest unit test against the pure function. The series is `U-m9a-001 … U-m9a-016`.

### Testing approach — what is bespoke vs gate-verified

M9a is a single small pure function with a large, behavior-rich assertion surface (four `kind` branches, inclusive range bounds, empty-weekday guard, timezone safety, purity), so this entry authors real GIVEN/WHEN/THEN `it()` blocks for every branch and edge case. Two ACs are honestly gate-verified rather than bespoke unit-tested, consistent with how M8 mapped its purely-structural / quality-gate ACs to `npm run eval`:

- **AC #10 (additive-only — `lib/types.ts` and `lib/dharma.ts` byte-identical post-M9a)** → bespoke import-surface guard `U-m9a-014` PLUS the `npm run eval` gate. The repo has an established import-surface guard pattern (`*.imports.test.ts`, e.g. `app/(building)/BuildingClient.imports.test.ts` referenced by `C-m1-022`). `U-m9a-014` realizes AC #10 as a checkable assertion in that pattern: `lib/appliesOn.ts` imports `Recurrence` as a **type-only** import from `@/lib/types` and imports nothing else from `lib/` (no `lib/dharma.ts` import; no value import). The byte-identity of `lib/types.ts` / `lib/dharma.ts` themselves is enforced by the EVALUATOR gate (git diff scoped to the two files must be empty) — stated below as a gate check, not a unit assertion, since a test file cannot prove a sibling file is unedited.
- **AC #11 (quality gates — `tsc --noEmit` clean, ESLint 0 errors / ≤13 warnings, full Vitest suite green)** → gate-verified by `npm run eval` (lint + typecheck + vitest). No bespoke unit test; M9a adds no UI so there is no e2e/a11y leg.

All other 9 ACs (#1–#9) map to at least one concrete bespoke `U-m9a-*` ID below.

### Mutation-resistance notes (read before reviewing the IDs)

These tests are written to fail against a plausible buggy implementation, not merely an empty one:

- **`every-weekday` is tested at every boundary** — `U-m9a-004`/`U-m9a-005` assert `true` for Mon (1), Wed (3), Fri (5) AND `false` for **both** Sat (6) and Sun (0). A mutant using `wd >= 1 && wd < 5` (drops Fri) fails `U-m9a-004`; a mutant using `wd >= 0` or `wd <= 6` (admits a weekend day) fails `U-m9a-005`.
- **`custom-range` bounds are tested as strictly-inclusive** — `U-m9a-008` asserts `true` at `date === start` and at `date === end`; `U-m9a-009` asserts `false` one day before `start` and one day after `end` while holding the weekday IN the set, so only the range check can be the cause of the `false`. A mutant using `>` / `<` (exclusive) fails `U-m9a-008`; a mutant that ignores the bound fails `U-m9a-009`.
- **The empty-weekdays guard is tested across multiple dates** — `U-m9a-010` asserts `false` for several in-range dates of differing weekdays when `weekdays: []`. A mutant that treats `[]` as "all weekdays" (e.g. `weekdays.length === 0 || weekdays.includes(wd)`) fails it.
- **Timezone safety is tested by forcing the runtime TZ** — `U-m9a-011`/`U-m9a-012` run the SAME ISO date through `appliesOn` under a negative-offset zone and a positive-offset zone and assert identical verdicts. A mutant that derives the weekday via `new Date("YYYY-MM-DD")` (UTC-parsed) returns a drifted weekday in the negative-offset zone and fails `U-m9a-011`.
- **Purity is tested by mutation- and clock-probing** — `U-m9a-013` deep-freezes the input `recurrence`, calls `appliesOn` repeatedly, and asserts the object is unchanged and every call returns the identical value; it also advances a faked clock between calls and asserts the result does not move. A mutant that reads `Date.now()` / `new Date()` (no args) or mutates an input fails it.

### Test ID layout

| Layer         | IDs              | Count  |
| ------------- | ---------------- | ------ |
| Unit (Vitest) | `U-m9a-001..016` | 16     |
| **Total**     |                  | **16** |

No Component, E2E, or Accessibility IDs — M9a has no UI surface (plan.md § Components / § Design tokens: "None"; SPEC AC #11).

### Unit (Vitest)

All `U-m9a-*` IDs target the new co-located suite **`lib/appliesOn.test.ts`** (repo convention `lib/<name>.test.ts`, matching `lib/timeOffset.test.ts` / `lib/dayOfYear.test.ts`). No `localStorage`, no DOM, no React render. Fixture dates with verified weekdays (JS `getDay()`, `0=Sun … 6=Sat`): `2026-05-17` Sun (0), `2026-05-18` Mon (1), `2026-05-19` Tue (2), `2026-05-20` Wed (3), `2026-05-21` Thu (4), `2026-05-22` Fri (5), `2026-05-23` Sat (6); `2025-12-31` Wed (3), `2026-01-01` Thu (4); `2026-12-25` Fri (5), `2026-12-28` Mon (1); `2024-02-28` Wed (3), `2024-02-29` Thu (4), `2024-03-01` Fri (5); `2030-01-15` Tue (2).

#### U-m9a-001 — success (signature / contract)

Target file: `lib/appliesOn.test.ts` (NEW)
**GIVEN** the `lib/appliesOn.ts` module
**WHEN** its exports are inspected and `appliesOn` is invoked
**THEN** `appliesOn` is `typeof === "function"` and is the module's only public export; calling `appliesOn({ kind: "every-day" }, "2026-05-17")` returns a value whose `typeof === "boolean"`; the function accepts a `Recurrence` value as the first argument and an ISO `YYYY-MM-DD` string as the second (compile-time `tsc` gate — a call with a `Recurrence`-typed literal and a `string` type-checks; a call returning `boolean` assigns to a `boolean` without a cast).
**AND** the input `date` is consumed as an ISO `YYYY-MM-DD` string — no `Date` object is accepted in its place (type signature is `(recurrence: Recurrence, date: string) => boolean`).
Proves: plan.md § The function contract (signature; `Recurrence` in, ISO string in, `boolean` out; single public export) — covers SPEC AC #1.

#### U-m9a-002 — success (`just-today`, same date)

Target file: `lib/appliesOn.test.ts`
**GIVEN** the recurrence `{ kind: "just-today", date: "2026-05-17" }`
**WHEN** `appliesOn(recurrence, "2026-05-17")` is called (target date equals `recurrence.date`)
**THEN** the return value is exactly `true`.
Proves: plan.md § The function contract `just-today` arm (`recurrence.date === date` → `true`) — covers SPEC AC #2.

#### U-m9a-003 — failure (`just-today`, different date)

Target file: `lib/appliesOn.test.ts`
**GIVEN** the recurrence `{ kind: "just-today", date: "2026-05-17" }`
**WHEN** `appliesOn(recurrence, "2026-05-18")` is called (a different, adjacent date) and again with `appliesOn(recurrence, "2026-05-16")`
**THEN** the return value is exactly `false` for both — any date not string-equal to `recurrence.date` yields `false`.
Proves: plan.md § The function contract `just-today` arm (different date → `false`) — covers SPEC AC #2.

#### U-m9a-004 — success (`every-day`, multiple dates incl. weekend)

Target file: `lib/appliesOn.test.ts`
**GIVEN** the recurrence `{ kind: "every-day" }`
**WHEN** `appliesOn` is called with `"2026-05-18"` (Monday), `"2026-05-23"` (Saturday), and `"2026-05-17"` (Sunday)
**THEN** every call returns exactly `true` — `every-day` applies unconditionally, including on weekend dates.
Proves: plan.md § The function contract `every-day` arm (`return true` unconditionally) — covers SPEC AC #3.

#### U-m9a-005 — success (`every-weekday`, Mon–Fri all `true`)

Target file: `lib/appliesOn.test.ts`
**GIVEN** the recurrence `{ kind: "every-weekday" }`
**WHEN** `appliesOn` is called with each of `"2026-05-18"` (Mon), `"2026-05-19"` (Tue), `"2026-05-20"` (Wed), `"2026-05-21"` (Thu), `"2026-05-22"` (Fri)
**THEN** every one of the five calls returns exactly `true` — each weekday Mon–Fri (`getDay()` 1–5) applies.
Proves: plan.md § The function contract `every-weekday` arm + § Edge cases (`wd >= 1 && wd <= 5`) — covers SPEC AC #4.

#### U-m9a-006 — failure (`every-weekday`, Sat AND Sun both `false`)

Target file: `lib/appliesOn.test.ts`
**GIVEN** the recurrence `{ kind: "every-weekday" }`
**WHEN** `appliesOn(recurrence, "2026-05-23")` (Saturday, `getDay()` 6) is called AND `appliesOn(recurrence, "2026-05-17")` (Sunday, `getDay()` 0) is called
**THEN** both return exactly `false` — Saturday (6) and Sunday (0) are both excluded.
Proves: plan.md § The function contract `every-weekday` arm + § Edge cases (Sat/Sun → `false`; both weekend ends excluded) — covers SPEC AC #4.

#### U-m9a-007 — success (`custom-range`, in range with matching weekday)

Target file: `lib/appliesOn.test.ts`
**GIVEN** the recurrence `{ kind: "custom-range", start: "2026-05-18", end: "2026-05-22", weekdays: [1, 3, 5] }` (Mon/Wed/Fri selected)
**WHEN** `appliesOn(recurrence, "2026-05-20")` is called — `2026-05-20` is Wednesday (`getDay()` 3), strictly inside `[start, end]`, and `3 ∈ weekdays`
**THEN** the return value is exactly `true` — all three checks (non-empty weekdays, range bound, weekday membership) pass.
Proves: plan.md § The function contract `custom-range` arm + § Edge cases (in `[start,end]` with matching weekday → `true`) — covers SPEC AC #5.

#### U-m9a-008 — success / edge (`custom-range`, inclusive bounds at `start` and `end`)

Target file: `lib/appliesOn.test.ts`
**GIVEN** the recurrence `{ kind: "custom-range", start: "2026-05-18", end: "2026-05-22", weekdays: [1, 2, 3, 4, 5] }` (Mon–Fri selected — `start` is Mon, `end` is Fri, both weekdays are in the set so only the bound is under test)
**WHEN** `appliesOn(recurrence, "2026-05-18")` (date == `start`) is called AND `appliesOn(recurrence, "2026-05-22")` (date == `end`) is called
**THEN** both return exactly `true` — the range bound is **inclusive on both ends** (`>=` / `<=`, not `>` / `<`).
Proves: plan.md § The function contract `custom-range` evaluation order step 2 + § Edge cases (date == `start` or `end` → inclusive) — covers SPEC AC #5, AC #6.

#### U-m9a-009 — failure (`custom-range`, strictly outside range, weekday IN set)

Target file: `lib/appliesOn.test.ts`
**GIVEN** the recurrence `{ kind: "custom-range", start: "2026-05-18", end: "2026-05-22", weekdays: [1, 2, 3, 4, 5] }` (Mon–Fri — chosen so the weekday of each probe date IS in the set, isolating the range check as the sole cause of any `false`)
**WHEN** `appliesOn(recurrence, "2026-05-15")` (Friday — one weekday before `start`, weekday 5 ∈ set) is called AND `appliesOn(recurrence, "2026-05-25")` (Monday — one weekday after `end`, weekday 1 ∈ set) is called
**THEN** both return exactly `false` — a date strictly before `start` or strictly after `end` yields `false` regardless of weekday membership.
Proves: plan.md § The function contract `custom-range` evaluation order step 2 + § Edge cases (date strictly before `start` / after `end` → `false`, regardless of weekday) — covers SPEC AC #6.

#### U-m9a-010 — failure (`custom-range`, empty `weekdays` → `false` for every date)

Target file: `lib/appliesOn.test.ts`
**GIVEN** the recurrence `{ kind: "custom-range", start: "2026-05-18", end: "2026-05-22", weekdays: [] }` (empty weekday array)
**WHEN** `appliesOn` is called with `"2026-05-18"` (Mon, in range), `"2026-05-20"` (Wed, in range), `"2026-05-22"` (Fri, in range), and `"2026-05-19"` (Tue, in range) — four in-range dates of differing weekdays
**THEN** every call returns exactly `false` — an empty `weekdays` array means no weekday is selected, so the recurrence applies to nothing; the empty-weekdays guard short-circuits before the range/weekday checks.
Proves: plan.md § The function contract `custom-range` evaluation order step 1 (empty-`weekdays` guard) + § Edge cases — covers SPEC AC #7.

#### U-m9a-011 — success / edge (timezone safety, negative-offset zone)

Target file: `lib/appliesOn.test.ts`
**GIVEN** the runtime timezone is forced to a **negative-UTC-offset** zone — `America/Los_Angeles` (UTC−7/−8) — by running the suite (or this block) under `TZ=America/Los_Angeles` (Vitest reads `process.env.TZ` at process start; the suite documents this via a dedicated `TZ`-pinned Vitest project / test script, or equivalently the test uses a fake-timezone shim such as a `vi`-mocked `Date.prototype.getTimezoneOffset` + locale — the BUILDER picks whichever the repo's Vitest config supports, but the assertion below is invariant to the technique)
**WHEN** `appliesOn({ kind: "every-weekday" }, "2026-05-17")` is called (`2026-05-17` is a Sunday) AND `appliesOn({ kind: "every-weekday" }, "2026-05-18")` is called (`2026-05-18` is a Monday) under the negative-offset zone
**THEN** the Sunday call returns exactly `false` and the Monday call returns exactly `true` — the **same** verdicts the resolver gives in UTC. The naive `new Date("2026-05-17")` (UTC-midnight parse) would land on Saturday `2026-05-16` local in a negative-offset zone and mis-return; the resolver must use the local-calendar `parseLocalDate` so the weekday is correct.
**AND** `appliesOn` is called for a `custom-range` weekday-membership case under the same zone — `{ kind: "custom-range", start: "2026-05-17", end: "2026-05-23", weekdays: [0] }` with date `"2026-05-17"` returns `true` (Sunday, weekday 0, in range) — confirming the weekday-membership step is also drift-free.
Proves: plan.md § Weekday derivation SG-m9a-02 (`parseLocalDate` multi-arg local-time constructor; never `new Date(isoString)`) + § Edge cases (timezone safety) — covers SPEC AC #8.

#### U-m9a-012 — success / edge (timezone safety, positive-offset zone — identical verdict)

Target file: `lib/appliesOn.test.ts`
**GIVEN** the runtime timezone is forced to a **positive-UTC-offset** zone — `Asia/Tokyo` (UTC+9) — by the same `TZ`-pinning / fake-timezone technique used in `U-m9a-011`
**WHEN** the **identical** calls from `U-m9a-011` are repeated under `Asia/Tokyo` — `appliesOn({ kind: "every-weekday" }, "2026-05-17")`, `appliesOn({ kind: "every-weekday" }, "2026-05-18")`, and the `custom-range` weekday-membership case with date `"2026-05-17"`
**THEN** the verdicts are **identical to the negative-offset run** — Sunday `2026-05-17` → `false`, Monday `2026-05-18` → `true`, the `custom-range` Sunday case → `true`. The same fixed ISO date yields the same boolean in a positive-offset zone, a negative-offset zone, and UTC: `appliesOn` is timezone-invariant.
**AND** the test asserts the cross-zone equality explicitly — the negative-offset result array and the positive-offset result array are deep-equal.
Proves: plan.md § Weekday derivation SG-m9a-02 + § Edge cases (timezone safety — same ISO date → same verdict in any timezone) — covers SPEC AC #8.

#### U-m9a-013 — success (purity — no mutation, no clock, deterministic)

Target file: `lib/appliesOn.test.ts`
**GIVEN** a deep-frozen recurrence `Object.freeze({ kind: "custom-range", start: "2026-05-18", end: "2026-05-22", weekdays: Object.freeze([1, 3, 5]) })` and a fixed target date `"2026-05-20"`
**WHEN** `appliesOn(recurrence, "2026-05-20")` is called three times in a row, then the system clock is advanced via `vi.useFakeTimers()` / `vi.setSystemTime(...)` to a different instant and `appliesOn(recurrence, "2026-05-20")` is called again
**THEN** all four calls return the **identical** boolean (`true`), proving identical inputs → identical output and that the result does not depend on "now"; AND no call throws (a write to a frozen object would throw in strict mode — TS modules are strict — so a passing run proves `recurrence` and `recurrence.weekdays` were not mutated); AND `recurrence` deep-equals its pre-call value after all four calls.
**AND** the test asserts (by inspection / a source-grep guard, or by the no-throw-on-frozen-input evidence) that `appliesOn` reads no clock — no zero-arg `new Date()` and no `Date.now()`; the multi-arg `new Date(y, m-1, d)` inside `parseLocalDate` is permitted (fixed-argument constructor, deterministic, not a clock read — plan.md SG-m9a-02 explicitly sanctions it).
Proves: plan.md § The function contract (never mutates inputs) + § Weekday derivation SG-m9a-02 (multi-arg `Date` is pure; zero-arg clock form is banned) — covers SPEC AC #9.

#### U-m9a-014 — success (additive-only — import-surface guard)

Target file: `lib/appliesOn.test.ts` (or a co-located `lib/appliesOn.imports.test.ts`, matching the `*.imports.test.ts` pattern used by `C-m1-022` / `app/(building)/BuildingClient.imports.test.ts`)
**GIVEN** the source text / import surface of `lib/appliesOn.ts`
**WHEN** its imports are inspected (string-grep regression test or the TypeScript program API)
**THEN** `lib/appliesOn.ts` imports **only** the `Recurrence` symbol from `@/lib/types`, and that import is **type-only** (`import type { Recurrence } from "@/lib/types"`); there is **no** import from `@/lib/dharma` (or `./dharma`), **no** value import from `lib/`, no `localStorage` reference, and no React import — consistent with the plan's "Pure module: no imports beyond the `Recurrence` type."
**AND** `lib/appliesOn.ts` neither re-exports nor re-declares any member of the `Recurrence` union — it consumes the type, never reshapes it.
Proves: plan.md § File structure ("Modified files: NONE", strictly additive) + § The function contract (only import is the `Recurrence` type) — covers SPEC AC #10 (the testable import-surface portion; whole-file byte-identity of `lib/types.ts` / `lib/dharma.ts` is the EVALUATOR gate check below).

#### U-m9a-015 — success / edge (`custom-range` crossing a year boundary, Dec→Jan)

Target file: `lib/appliesOn.test.ts`
**GIVEN** the recurrence `{ kind: "custom-range", start: "2025-12-29", end: "2026-01-02", weekdays: [3, 4] }` (a range spanning the 2025→2026 year boundary; Wed/Thu selected)
**WHEN** `appliesOn(recurrence, "2025-12-31")` (Wednesday, weekday 3, in range) is called AND `appliesOn(recurrence, "2026-01-01")` (Thursday, weekday 4, in range) is called AND `appliesOn(recurrence, "2026-01-03")` (Saturday, just after `end`) is called
**THEN** `2025-12-31` → `true`, `2026-01-01` → `true` (the range bound resolves correctly across the year boundary because ISO `YYYY-MM-DD` strings order lexicographically == chronologically), and `2026-01-03` → `false` (past `end`).
Proves: plan.md § The function contract `custom-range` step 2 (lexicographic ISO comparison) + § Edge cases (year boundary Dec→Jan) — covers SPEC AC #5, AC #6 (year-boundary edge).

#### U-m9a-016 — success / edge (`custom-range` covering Feb 29 in a leap year)

Target file: `lib/appliesOn.test.ts`
**GIVEN** the recurrence `{ kind: "custom-range", start: "2024-02-28", end: "2024-03-01", weekdays: [3, 4, 5] }` (a range covering the leap-day `2024-02-29`; Wed/Thu/Fri selected)
**WHEN** `appliesOn(recurrence, "2024-02-29")` is called — `2024-02-29` is a Thursday (`getDay()` 4), inside the range, and `4 ∈ weekdays`
**THEN** the return value is exactly `true` — `parseLocalDate("2024-02-29")` builds the leap day natively (`new Date(2024, 1, 29)` is a valid local date) and derives weekday 4 correctly.
**AND** `appliesOn(recurrence, "2024-02-28")` (Wed, weekday 3, in range) → `true` and `appliesOn(recurrence, "2024-03-01")` (Fri, weekday 5, in range) → `true`, confirming the leap day does not disturb the adjacent dates.
Proves: plan.md § Weekday derivation SG-m9a-02 (`parseLocalDate` handles Feb 29 natively) + § Edge cases (leap-day coverage) — covers SPEC AC #5 (leap-boundary edge).

> **Note on the "just-today on a far-off date" edge case.** The plan's Edge-case table lists `just-today` returning `false` on a non-matching date. `U-m9a-003` already exercises non-matching dates adjacent to `recurrence.date`; the "far-off date" variant is the same code path (`recurrence.date === date` string equality has no distance sensitivity). To make the far-off case explicit and audit-visible, `U-m9a-003`'s assertion set should additionally cover one distant date — `appliesOn({ kind: "just-today", date: "2026-05-17" }, "2030-01-15")` → `false`. This is folded into `U-m9a-003` rather than given a separate ID because it adds no new branch; VERIFIER may request a standalone ID if it prefers strict one-edge-one-ID granularity (see § Spec gaps).

### Gate-verified ACs

- **AC #10 — additive-only (whole-file byte-identity).** `U-m9a-014` proves the testable import-surface portion (only a type-only `Recurrence` import; no `lib/dharma` import). The remaining guarantee — that `lib/types.ts` and `lib/dharma.ts` are **byte-identical** before and after M9a — is an **EVALUATOR gate check**, expressed as a checkable GIVEN/WHEN/THEN for the BUILDER/EVALUATOR to confirm:
  **GIVEN** the M9a BUILDER diff
  **WHEN** `git diff` is scoped to `lib/types.ts` and `lib/dharma.ts` (`git diff <m9a-base>..HEAD -- lib/types.ts lib/dharma.ts`)
  **THEN** the diff is **empty** — M9a adds the new file `lib/appliesOn.ts` (+ its test) and edits no other source file. A non-empty diff on either file is an AC #10 violation and an EVALUATOR FAIL.
- **AC #11 — quality gates.** Gate-verified by `npm run eval`: `tsc --noEmit` clean (0 errors), ESLint 0 errors (≤13 warnings), full Vitest suite green (including all 16 `U-m9a-*` IDs). M9a adds no UI surface, so there is no e2e/a11y leg — consistent with SPEC AC #11 ("M9a adds no UI, so no e2e/a11y specs").

### Retired test IDs

**None.** M9a is purely additive: one new file (`lib/appliesOn.ts`) plus its new test suite (`lib/appliesOn.test.ts`). No existing test file is edited; no prior `U-/C-/E-/A-` ID is retired or amended. Every existing ID across all milestones stays live and green. M9a adds 16 new `U-m9a-` IDs and retires none.

### AC → test-ID coverage map (all 11 ACs accounted for)

| AC# | Acceptance criterion (paraphrased)                                                                 | Test ID(s)                                                             |
| --- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| #1  | `lib/appliesOn.ts` exports `appliesOn(recurrence, date)`; ISO `YYYY-MM-DD` in, `boolean` out       | `U-m9a-001`                                                            |
| #2  | `just-today` → `true` iff `recurrence.date === date`, else `false`                                 | `U-m9a-002`, `U-m9a-003`                                               |
| #3  | `every-day` → `true` for every valid date (incl. weekend)                                          | `U-m9a-004`                                                            |
| #4  | `every-weekday` → `true` Mon–Fri, `false` Sat AND Sun                                              | `U-m9a-005`, `U-m9a-006`                                               |
| #5  | `custom-range` → `true` iff in `[start,end]` inclusive AND weekday ∈ `weekdays`                    | `U-m9a-007`, `U-m9a-008`, `U-m9a-015`, `U-m9a-016`                     |
| #6  | `custom-range` strictly before `start` / after `end` → `false`, regardless of weekday              | `U-m9a-008`, `U-m9a-009`, `U-m9a-015`                                  |
| #7  | `custom-range` with empty `weekdays` → `false` for every date                                      | `U-m9a-010`                                                            |
| #8  | Timezone safety — same ISO date → identical verdict in any runtime timezone (no UTC drift)         | `U-m9a-011`, `U-m9a-012`                                               |
| #9  | Purity — no clock, no `localStorage`, no input mutation; identical inputs → identical output       | `U-m9a-013`                                                            |
| #10 | Additive — `lib/types.ts` / `lib/dharma.ts` unchanged; resolver consumes the union, never edits it | `U-m9a-014` (import-surface) + **gate** (git-diff byte-identity check) |
| #11 | Quality gates — `tsc --noEmit` clean; ESLint 0 err / ≤13 warn; full Vitest green; no e2e/a11y      | **gate (`npm run eval`)**                                              |

**Edge-case coverage (plan.md § Edge-case table):** in-range matching weekday → `U-m9a-007`; inclusive bounds → `U-m9a-008`; strictly-outside range → `U-m9a-009`; in-range weekday-excluded → see § Spec gaps item 1 (currently folded into `U-m9a-009`'s isolation logic — flagged); empty `weekdays` → `U-m9a-010`; timezone safety → `U-m9a-011` + `U-m9a-012`; year boundary Dec→Jan → `U-m9a-015`; Feb 29 in range → `U-m9a-016`; `just-today` far-off date → folded into `U-m9a-003` (see note above § Gate-verified ACs).

**Gate-verified ACs:** #10 (partly — import-surface bespoke via `U-m9a-014`, whole-file byte-identity via the git-diff gate) and #11 (fully — `npm run eval`). All other 9 ACs (#1–#9) map to at least one bespoke `U-m9a-*` ID. Every `U-m9a-*` ID maps back to at least one AC. No AC is unmapped.

### Spec gaps surfaced for VERIFIER

The plan resolves both of its named spec gaps (SG-m9a-01 weekday convention `0=Sun…6=Sat`; SG-m9a-02 private `parseLocalDate` helper) in-plan, and the plan's § Open questions for VERIFIER says "None outstanding." Two non-blocking items the TESTS phase surfaces for VERIFIER to confirm with a one-line answer (not a re-plan):

1. **The plan's "in-range, weekday-excluded" edge case has no dedicated bespoke ID.** The plan's Edge-case table lists "`custom-range` date in range, weekday not in set → `false`" as a distinct row. This entry does NOT give it a standalone `U-m9a-*` ID — it is the logical complement of `U-m9a-007` (same recurrence, a date whose weekday is NOT in `[1,3,5]`, e.g. `2026-05-19` Tue / weekday 2 → `false`). It is also implicitly exercised by `U-m9a-009`'s isolation reasoning. **VERIFIER's call:** confirm whether folding it into `U-m9a-007`'s assertion set (adding one `false`-on-excluded-weekday assertion to that block) is acceptable, or whether it warrants a standalone `U-m9a-017`. The TESTS-phase recommendation is to add the assertion to `U-m9a-007` (no new branch is exercised); flagged here so the decision is explicit rather than silent.
2. **"`just-today` on a far-off date" is folded into `U-m9a-003`, not a standalone ID** (see the note after `U-m9a-016`). Same rationale — `recurrence.date === date` string equality is distance-insensitive, so a far-off date exercises no new branch. VERIFIER may request a standalone `U-m9a-017`/`-018` if it enforces strict one-edge-one-ID granularity; the recommendation is to keep it folded.

Neither item is a plan defect or an unresolved ambiguity — both are ID-granularity judgment calls within VERIFIER's "test ID hygiene" remit. No ADR is reversed: ADR-019 (the `Recurrence` union is an enum + optional payload, schema-locked) is honored — M9a consumes the union unchanged. M9a adds 16 `U-m9a-` test IDs (all Unit; no C/E/A) and retires none.
