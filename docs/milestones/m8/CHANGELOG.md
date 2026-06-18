# Changelog — M8

## [unreleased]

### Added (M8)

- **M8 — Persistence:** `AppState` now survives tab close and reopen via `localStorage` under
  key `dharma:v1`. `lib/persist.ts` exports `loadState()`/`saveState()`/`PersistedState` type
  and the `"dharma:v1"` storage key. New `usePersistedState()` hook wraps `useReducer` with
  two-pass hydration (SSR-safe: server renders default state; client rehydrates from storage
  on first paint). `AppState` gains `programStart: string` (ISO date, stamped on first run)
  and `schemaVersion: 1` (anchors future migrations). Per ADR-044 the persisted shape is
  `{ schemaVersion, programStart, blocks, categories, looseBricks }` — `logs`/`timers` maps
  excluded. Zero UI surface change. 722/722 Vitest tests across 58 files (+40 tests / +2 files
  vs M4g's 682/56). 0 lint errors, 12 warnings. `tsc --noEmit` clean.
- `lib/persist.ts` — new. Pure localStorage adapter: `loadState()` reads and JSON-parses
  `dharma:v1`; `saveState()` serialises and writes; both are SSR-guarded (`typeof window`).
  `PersistedState` type alias. Tests: U-m8-001..011.
- `usePersistedState()` hook (in `lib/persist.ts`) — wraps `useReducer` with two-pass
  hydration. Server and first-client render use `defaultState()`; `useEffect` immediately
  rehydrates from localStorage; all subsequent dispatches persist after every mutation.
  Tests: C-m8-001..006.
- `AppState.programStart: string` — ISO-date string stamped on first run; persisted under
  `dharma:v1`. Drives `programStart`-relative "Building N" day counter.
- `schemaVersion: 1` — version anchor in the persisted payload; enables future
  `migrate()` expansion without a full schema wipe.
- `docs/decisions.md` ADR-044 — Persistence shape: `{ schemaVersion, programStart, blocks,
categories, looseBricks }`; `logs`/`timers` excluded from Phase 1 persistence.
- `tests/e2e/m8.spec.ts` — 3 Playwright e2e specs (deferred to preview, vacuous-pass pattern
  per M4-era precedent). IDs: E-m8-001..003.
- `tests/e2e/m8.a11y.spec.ts` — 1 Playwright axe-core a11y spec (deferred to preview).
  ID: A-m8-001.

### Changed (M8)

- `app/(building)/BuildingClient.tsx` — rewired from `useReducer` to `usePersistedState()`;
  two-pass hydration means the server and first-client renders match (no hydration mismatch).
  `programStart` passed down to the top-bar day-number display.
- Top-bar "Building N" day counter — now `programStart`-relative (ISO-date arithmetic
  replacing calendar `dayOfYear()`). DST off-by-one (N4) resolved: ISO-date subtraction is
  DST-safe. `lib/dharma.ts:dayNumber()` updated accordingly. Tests: C-m8-007.

### Fixed (M8)

- **Page refresh no longer wipes the day.** Blocks, categories, loose bricks, and every
  brick's completion state (`done` / `brick.done`) now survive tab close + reopen.
  `programStart` ISO date is stamped on first run and persisted; subsequent sessions load the
  correct day number without calendar-day drift. Closes the standing "state is lost on
  refresh" limitation noted in M2, M3, M4a, and later milestone specs.

---
