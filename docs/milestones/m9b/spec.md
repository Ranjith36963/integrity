## Milestone 9b — Day rollover + history store

> **Pillars:** § 0.9 (data model); ADR-044 (M8 v1 persisted schema + transport — retained); **ADR-045 (NEW — v2 persisted schema: `history` map + `currentDate`, v1→v2 migration)**; M9a `appliesOn` resolver (consumed to seed a fresh day).

### Intent

After M8 the app persists exactly one day — the same `AppState` survives forever; the calendar never turns over. M9b makes days real. The persisted schema bumps to `v2` (ADR-045): it gains a `history` map (ISO-date → archived day) and a `currentDate` (the date the in-progress day belongs to). On boot, if `currentDate` is earlier than today, the day has ended: the in-progress day is archived into `history`, and a **fresh day is seeded** for today — recurring bricks are re-created (resolved via M9a's `appliesOn`), reset to incomplete; one-off bricks are dropped. This is the storage foundation the calendar views (M9c–M9e) read.

Like M8, M9b adds **no new screen**. Its observable effect: cross midnight, reopen the app, and yesterday is on record while today starts clean with your recurring habits ready and unchecked.

**What this is NOT:** any calendar UI — month (M9c), week (M9d), year (M9e), or the view switcher; score _aggregation_ over a range (a read-time M9c–M9e concern — M9b stores raw days, computes nothing); mid-session midnight crossing (rollover runs on load only — see SG-m9b-03); fabricating archived days for dates the user never opened (only the real `currentDate` day is archived; see Edge cases); editing or deleting archived days; a `deletions` map (a later Edit-Mode milestone, `schemaVersion: 3`); cloud sync.

### Inputs

- The persisted value under `localStorage["dharma:v1"]` — may be absent (first run), a `schemaVersion: 1` payload (an M8 session), a `schemaVersion: 2` payload (a prior M9b session), or corrupt.
- The system clock (`new Date()`) — read once on boot to obtain today's ISO date.
- M9a's `appliesOn(recurrence, date)` — to decide which recurring bricks seed the fresh day.
- The live `AppState` collections (`blocks`, `categories`, `looseBricks`) and the `Recurrence` union from `lib/types.ts`.

### Outputs

- `lib/persist.ts` updated to the ADR-045 v2 shape: `loadState` returns and `saveState` writes `{ schemaVersion: 2, programStart, currentDate, history, blocks, categories, looseBricks }`; a v1→v2 migration step.
- A pure rollover function (`rollover(state, todayISO)` — placement per SG-m9b-02) that, given a loaded state and today's date, returns the post-rollover state: the prior day archived, a fresh day seeded, `currentDate` advanced.
- The hydration path (`usePersistedState`) runs rollover once on mount, after load, before first render of the day.
- `history[date]` entries are `ArchivedDay` snapshots (`{ blocks, categories, looseBricks }`) — no stored score.

### Edge cases

- **First run, no key** → v2 default: `currentDate` = today, `history` = `{}`, empty collections, `programStart` = today.
- **`currentDate` === today** → no rollover; state loads unchanged; `history` untouched.
- **`currentDate` === yesterday** → the in-progress day is archived under `history[currentDate]`; a fresh day is seeded for today.
- **`currentDate` is N > 1 days before today** (the app was not opened for several days) → only the actual `currentDate` day is archived. Intervening dates get **no** `history` entry — the user built nothing on them; the calendar views treat an absent in-range date as an implicit zero-score day, rather than the app fabricating empty archived days.
- **`schemaVersion: 1` payload** → migrated to v2: `currentDate` = today, `history` = `{}`; the v1 `blocks`/`categories`/`looseBricks`/`programStart` are preserved. The true date of the v1 day is unrecoverable (v1 stored none), so the v1 day becomes today's in-progress day — an accepted one-time migration approximation.
- **`schemaVersion` 3+ or non-numeric** → empty v2 default, no throw (ADR-045 / ADR-044 robustness).
- **Corrupt JSON, or `history` present but not an object** → empty v2 default, or `history` coerced to `{}`; no throw.
- **A recurring brick whose recurrence does not apply today** (`every-weekday` on a Saturday; a `custom-range` outside its window) → not seeded onto the fresh day.
- **A day with no applicable recurring bricks** → the fresh day is empty of blocks/bricks; `categories` still carry forward.
- **Archived-day immutability** → an `ArchivedDay` is a deep snapshot; mutating the new in-progress day never alters any `history` entry.

### Acceptance criteria

**Schema v2 (ADR-045)**

1. `loadState` returns the v2 shape `{ schemaVersion: 2, programStart, currentDate, history, blocks, categories, looseBricks }`; `saveState` writes exactly that shape to `dharma:v1`.
2. First run (no key) → v2 default: `currentDate` = today's ISO date, `history` = `{}`, `blocks`/`categories`/`looseBricks` = `[]`, `programStart` = today.
3. A `schemaVersion: 1` payload migrates to v2: `currentDate` set to today, `history` set to `{}`, `schemaVersion` set to `2`; the v1 `blocks`, `categories`, `looseBricks`, and `programStart` are preserved unchanged.
4. A `schemaVersion` of 3 or greater, or non-numeric → `loadState` returns the empty v2 default; no exception escapes.
5. Malformed JSON, or a `history` field that is not an object → `loadState` returns the empty v2 default (or coerces `history` to `{}`); no exception escapes.

**Rollover**

6. On boot with `currentDate` === today → no rollover: `blocks`/`categories`/`looseBricks` and `history` load unchanged.
7. On boot with `currentDate` earlier than today → the in-progress `{ blocks, categories, looseBricks }` is written into `history` under the `currentDate` key as an `ArchivedDay`.
8. After archiving, a fresh day is seeded and `currentDate` is advanced to today's ISO date.
9. An `ArchivedDay` is a deep snapshot — subsequent mutations of the new in-progress day leave `history[oldDate]` byte-identical.
10. When more than one day was skipped, only the `currentDate` day is archived; no `history` entry is created for any intervening date.

**Fresh-day seeding**

11. The fresh day re-creates exactly those bricks whose `recurrence` satisfies `appliesOn(recurrence, today)`. `just-today` bricks, and any brick with no `recurrence` (a `hasDuration: false` brick), are NOT carried forward.
12. Each seeded brick is reset to incomplete — `tick` → `done: false`, `units` → `done: 0` — while its `target`, `unit`, `start`, `end`, and `recurrence` definition are preserved.
13. A block carries into the fresh day iff at least one of its bricks recurs and applies today; it hosts only those seeded bricks. A block with no applicable recurring brick is not carried. `categories` carry forward unchanged.

**No regression**

14. No new screen or component; the Building view simply renders whatever day rollover produced. Every M1–M8 and M9a Vitest/component test still passes; the M9a `test:tz` suite still passes.
15. Quality gates: `tsc --noEmit` clean; ESLint 0 errors (≤13 warnings); full Vitest suite green. E2E (Playwright, deferred-to-preview) covers first-run, same-day-no-rollover, and next-day-rollover-archives-and-seeds.

### Open spec gaps (resolve at VERIFY)

- **SG-m9b-01 — Seeded brick identity.** When a recurring brick is re-created on the fresh day, does it keep its `id` or get a new `uuid`? Recommendation: a fresh `uuid` per day-instance — each day's brick is a distinct instance, and M9's score views need no cross-day brick identity; a stable id would also collide conceptually across `history` entries. Trade-off: a stable id would let a future "habit streak" feature track one brick across days. Lean: fresh `uuid`; revisit if a streak feature is specced. PLANNER decides, VERIFIER checks.
- **SG-m9b-02 — Rollover function placement.** The `rollover(state, today)` logic could live in a new `lib/history.ts`, inside `lib/persist.ts`, or in the `usePersistedState` hook. Recommendation: a pure, exported `rollover` in a new `lib/history.ts` (it is the natural home for the upcoming M9c–M9e aggregation helpers too), called by `usePersistedState` on mount. Trade-off: fewer files if folded into `persist.ts`. Lean: `lib/history.ts`. PLANNER finalizes.
- **SG-m9b-03 — Mid-session midnight crossing.** If the app is left open across midnight, rollover does not fire until the next load. Recommendation: accept this for M9b — rollover on load only; a future polish milestone may add an interval/visibility-change check. VERIFIER confirms the deferral is documented, not silently dropped.
