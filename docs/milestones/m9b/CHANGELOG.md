# Changelog — M9b

## [unreleased]

### Added (M9b)

- **M9b — Day rollover + history store:** finished days are archived to a `history` map and a
  fresh day is seeded each morning with recurring habits reset (persisted schema v2). Pure
  `rollover(state, todayISO)` function in new `lib/history.ts` archives the previous day's
  blocks + bricks into `state.history[date]` as an `ArchivedDay` snapshot, then seeds a fresh
  day: recurring bricks are re-created (resolved via M9a's `appliesOn`) and reset to
  incomplete; one-off (`just-today`) bricks are dropped; a block carries forward only if it
  still has an applicable recurring brick; categories carry verbatim. `AppState` gains
  `currentDate: string` and `history: Record<ISO-date, ArchivedDay>`. `loadState` in
  `lib/persist.ts` migrates a v1 payload (no `currentDate`/`history`) to v2 with no data
  loss. `usePersistedState` runs `rollover` on mount so the app always presents today's state.
  ADR-045 locks the v2 persisted schema. Second of five M9 chunks. No new UI surface — the
  Building view renders whatever rollover produced. 806/806 Vitest tests across 60 files
  (+46 tests / +1 file vs M9a's 760/59). TZ-pinned suite: 11/11. 0 lint errors, 13 warnings
  (within budget). `tsc --noEmit` clean. Closes U-m9b-001..021, C-m9b-001..006,
  E-m9b-001..003 (E2E deferred-to-preview). **M9c is now unblocked.**
- `lib/history.ts` — new. Pure rollover engine: `rollover(state, todayISO): AppState` archives
  the finished day and seeds a fresh one. Private `seedFreshDay(state, today)` helper.
  Tests: U-m9b-001..021.
- `AppState.currentDate: string` — ISO-date string tracking the last day the app was opened.
  Set on first run; updated by rollover on each new day.
- `AppState.history: Record<string, ArchivedDay>` — map of ISO-date → archived day snapshot.
  Populated by rollover; read by upcoming M9c month/Kingdom view.
- `ArchivedDay` type (in `lib/types.ts`) — snapshot of a completed day:
  `{ date, blocks, categories, looseBricks }`.
- `docs/decisions.md` ADR-045 — v2 persisted schema: `{ schemaVersion: 2, programStart,
currentDate, history, blocks, categories, looseBricks }`.
- `tests/e2e/m9b.spec.ts` — 3 Playwright e2e specs (deferred to preview, vacuous-pass pattern
  per M4-era precedent). IDs: E-m9b-001..003.

### Changed (M9b)

- `lib/persist.ts` — `loadState` migrates v1 payloads (no `currentDate`/`history`) to v2:
  `currentDate` defaults to `programStart`; `history` defaults to `{}`. Additive migration
  with no data loss. `PersistedState` type updated to `schemaVersion: 2`.
- `usePersistedState` (in `lib/persist.ts`) — pass-2 hydration effect now runs `rollover()`
  after loading persisted state, ensuring the app always presents today's state on mount.
  Tests: C-m9b-001..006.
- `AppState` (`lib/types.ts`) — two new required fields: `currentDate: string`,
  `history: Record<string, ArchivedDay>`. All existing state fixtures in tests updated.
- Persisted schema bumped to `schemaVersion: 2`. v1 payloads are transparently migrated on
  `loadState`; no user action required.

### Fixed (M9b)

- **The app no longer shows one eternal day.** Crossing midnight archives yesterday's state
  into `state.history` and seeds today with recurring bricks reset to incomplete. One-off
  (`just-today`) bricks are dropped on the new day. The Building view now always represents
  today, not whatever day the user last had open.
