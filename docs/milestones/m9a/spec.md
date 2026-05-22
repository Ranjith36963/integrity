## Epic overview

> M9 turns Dharma from a single-day tracker into a longitudinal one: every finished day is archived, and the user reviews their record through Apple/Google-Calendar-style **day · week · month · year** views, each surfacing that period's score. Per the project vocabulary: Building = day, Castle = week, Kingdom = month, Empire = year.

M9 ships in five chunks, one Loop each:

- **M9a — `appliesOn` recurrence resolver.** A pure function answering "does a brick's `recurrence` apply on a given date?" No storage, no UI. Foundation for rollover and every calendar view.
- **M9b — Day rollover + history store.** Crossing midnight archives the finished day (with its final score) and seeds a fresh day, re-creating recurring bricks via `appliesOn`. Persisted schema bumps to `v2` (adds a `history` map + the in-progress day's date).
- **M9c — Month view (Kingdom).** A calendar-month grid; each day cell shows its score; tapping a day opens it read-only. Introduces the day/week/month/year view switcher.
- **M9d — Week view (Castle).** A seven-day layout with per-day scores and the week aggregate.
- **M9e — Year view (Empire).** A twelve-month overview with per-month scores.

**Storage strategy:** only raw days are stored. Week, month, and year scores are **computed on read** by aggregating the archived days in range — never stored as separate totals, so there is no stale or duplicated period data.

## Milestone 9a — appliesOn recurrence resolver

> **Pillars:** § 0.9 (data model — `Recurrence` union, defined by M4e); spec line ~1454 (M9 named as the `appliesOn` resolver — "M4e only stores recurrence and only renders today"). No new ADR: M9a is a pure additive function over the existing `Recurrence` union.

### Intent

M4e gave bricks a `recurrence` field but the app only ever renders _today_ — recurrence is stored, never resolved. M9a adds the missing resolver: a single pure function `appliesOn(recurrence, date)` that answers "does a brick with this recurrence apply on this calendar date?" It is the foundation every later M9 chunk depends on — M9b uses it to seed a new day's recurring bricks at rollover; M9c/M9d/M9e use it to decide which bricks counted toward a past day's score.

M9a adds **no storage and no UI.** Its entire deliverable is `lib/appliesOn.ts` and its unit tests. It consumes the `Recurrence` union from `lib/types.ts` unchanged.

**What this is NOT:** the rollover or archive logic (M9b); any calendar screen (M9c–M9e); deciding what happens to a brick that has no `recurrence` at all — non-duration bricks carry no recurrence field, and how rollover treats them is an M9b concern, not the resolver's; resolving recurrence for bricks across timezone changes mid-session; validating malformed date strings (internal callers pass validated ISO dates, per the M8 boundary stance).

### Inputs

- A `Recurrence` value from `lib/types.ts` — one of the four kinds: `{ kind: "just-today"; date }`, `{ kind: "every-weekday" }`, `{ kind: "every-day" }`, `{ kind: "custom-range"; start; end; weekdays }`.
- A target date as an ISO `YYYY-MM-DD` string, supplied by callers (M9b rollover; M9c–M9e views).

### Outputs

- `lib/appliesOn.ts` exporting `appliesOn(recurrence: Recurrence, date: string): boolean`.

### Edge cases

- **`just-today` on the same date** → `true`; **on any other date** → `false`.
- **`every-day`** → `true` for every valid date.
- **`every-weekday` on Mon–Fri** → `true`; **on Sat or Sun** → `false`.
- **`custom-range`, date inside `[start, end]` with a matching weekday** → `true`.
- **`custom-range`, date == `start` or date == `end`** → range bound is inclusive on both ends.
- **`custom-range`, date strictly before `start` or strictly after `end`** → `false`, even when the weekday matches.
- **`custom-range`, date in range but weekday not in `weekdays`** → `false`.
- **`custom-range` with an empty `weekdays` array** → `false` for every date (no weekday selected ⇒ applies to nothing).
- **Timezone safety:** the same ISO date yields the same verdict regardless of the runtime timezone — the weekday must be derived by parsing the `YYYY-MM-DD` as a local calendar date, not via `new Date("YYYY-MM-DD")` (which parses as UTC midnight and drifts a day in negative-offset zones).
- **Year/leap boundaries:** a `custom-range` spanning a year boundary (e.g. Dec→Jan) or covering Feb 29 resolves correctly — ISO `YYYY-MM-DD` strings order lexicographically, and the weekday derivation stays correct.

### Acceptance criteria

**Resolver**

1. `lib/appliesOn.ts` exports `appliesOn(recurrence: Recurrence, date: string): boolean`, where `date` is an ISO `YYYY-MM-DD` string.
2. `kind: "just-today"` → returns `true` iff `recurrence.date === date`, otherwise `false`.
3. `kind: "every-day"` → returns `true` for every valid date.
4. `kind: "every-weekday"` → returns `true` iff `date` is Mon–Fri, `false` for Sat and Sun.
5. `kind: "custom-range"` → returns `true` iff `date` is within `[start, end]` inclusive **and** `date`'s weekday is contained in `recurrence.weekdays`; `false` otherwise.
6. `custom-range` with `date` strictly before `start` or strictly after `end` → `false`, regardless of weekday.
7. `custom-range` with an empty `weekdays` array → `false` for every date.
8. The weekday is derived without UTC drift: for any fixed ISO date, `appliesOn` returns the identical result whether the runtime timezone is ahead of or behind UTC.

**Purity & integrity**

9. `appliesOn` is pure: it reads no clock (`Date.now()` / `new Date()` with no args), no `localStorage`, and mutates none of its inputs; identical inputs always produce identical output.
10. M9a is additive — `lib/types.ts` (the `Recurrence` union) and `lib/dharma.ts` are unchanged; the resolver consumes the union, never modifies it.
11. Quality gates: `tsc --noEmit` clean; ESLint 0 errors (≤13 warnings); full Vitest suite green. M9a adds no UI, so no e2e/a11y specs.

### Open spec gaps (resolve at VERIFY)

- **SG-m9a-01 — Weekday integer convention.** `Recurrence.custom-range.weekdays` is `number[]`, and `every-weekday` is documented Mon–Fri. PLANNER must confirm the integer convention M4e's `AddBrickSheet` actually writes (JS-native `getDay()` is `0`=Sun … `6`=Sat). Recommendation: adopt whatever M4e persists so stored bricks resolve correctly; `appliesOn` must match the producer. VERIFIER checks `appliesOn`'s weekday math against the M4e weekday picker.
- **SG-m9a-02 — Local-date parsing helper.** A `YYYY-MM-DD` → weekday derivation that is UTC-drift-free is needed (AC #8). PLANNER decides whether to add a small private helper in `appliesOn.ts` or reuse an existing date utility (`lib/dayOfYear.ts`, `lib/timeOffset.ts`) — but must not introduce a UTC-parsed `new Date(isoString)`. Lean: a private `parseLocalDate` helper inside `appliesOn.ts`.
