## Milestone 8 — Persistence

> **Pillars:** § 0.9 (data model — `AppState` is the unit of persistence), ADR-018 (single `dharma:v1` localStorage key, two-pass load, `lib/persist.ts` — **transport retained**), **ADR-044 (NEW — supersedes ADR-018's schema block; defines the persisted shape `{ schemaVersion, programStart, blocks, categories, looseBricks }`)**.

### Intent

Until now every page refresh wipes the user's day — blocks, categories, loose bricks, and every brick's completion state, all gone. M8 makes the day durable. It introduces `lib/persist.ts`: the app's `AppState` is serialized to a single `localStorage` key `dharma:v1` after every mutation, and rehydrated on boot. A `schemaVersion` field anchors future migrations. A `programStart` ISO date is stamped once on first run and drives `programStart`-relative day numbering, retiring M1's `dayOfYear()` placeholder.

M8 changes **no UI surface and no user-facing behavior within a session.** Its entire observable effect is: close the tab, reopen it, and the day is exactly as you left it. Per ADR-044, the persisted shape is the live post-M4f `AppState` (`blocks`, `categories`, `looseBricks`) wrapped with `schemaVersion` + `programStart` — there is no `logs` map (completion lives on bricks) and no `timers` map (timers were ripped in M4f).

**What this is NOT:** a backend or cloud sync (Phase 2+); multi-device merge or conflict resolution beyond last-writer-wins within one browser; the `deletions` map (M5 adds it via a `schemaVersion: 2` bump); recurrence resolution against past dates (M9); a settings screen to export/clear data (M6+); IndexedDB or any store other than `localStorage`; debounced/batched writes (M7 polish if profiling demands it).

### Inputs

- The live `AppState` from `lib/types.ts`: `{ blocks, categories, looseBricks }`.
- `localStorage` key `dharma:v1` — may be absent (first run), well-formed (prior session), or corrupt/unreadable.
- The reducer dispatch path that holds `AppState` (currently in `BuildingClient`) — every mutating `Action`.
- The system clock (`new Date()`), used once to stamp `programStart` on first run.

### Outputs

- `lib/persist.ts` exposing `loadState()`, `saveState(state)`, the `PersistedState` type, and the `"dharma:v1"` storage-key constant.
- After any mutating dispatch, `localStorage["dharma:v1"]` holds the current state as JSON in the ADR-044 shape.
- On boot, the app rehydrates from `dharma:v1` two-pass: SSR / first client paint render the empty-state default; after mount, the persisted state is loaded and rendered.
- A `programStart`-relative day number available wherever M1's `dayOfYear()` was surfaced.

### Edge cases

- **First run, no `dharma:v1` key** → empty-state default; `programStart` stamped to today's ISO date; `schemaVersion: 1`.
- **`dharma:v1` present but malformed JSON** → `loadState` returns the empty default in memory; no throw; the next `saveState` overwrites the bad value.
- **`dharma:v1` present with an unknown/future `schemaVersion`** → empty default; no throw (forward-incompatible data is not guessed at).
- **`dharma:v1` present with missing fields** (partial state) → the loader fills defaults defensively (`blocks: []`, `categories: []`, `looseBricks: []`).
- **`localStorage` unavailable** (Safari private mode, quota exceeded, storage disabled) → `loadState` returns the default, `saveState` swallows the error; the app runs in-memory for the session and never crashes.
- **SSR/CSR**: the server render and the client's first paint must both be the empty default — no hydration mismatch warning. Hydration is pass two (the `mounted`-flag pattern from M1 auto-scroll / M3 `<HeroRing>`).
- **`programStart` already set** from a prior session → preserved verbatim, never re-stamped.
- **Two tabs open** → last writer wins (ADR-018; no cross-tab sync in M8).

### Acceptance criteria

**`lib/persist.ts` module**

1. `lib/persist.ts` exports `loadState(): PersistedState`, `saveState(state: AppState): void`, the `PersistedState` type, and a storage-key constant equal to `"dharma:v1"`.
2. `saveState` writes `localStorage["dharma:v1"]` as JSON in the ADR-044 shape: `{ schemaVersion: 1, programStart, blocks, categories, looseBricks }`.
3. `loadState` reads and parses `dharma:v1` and returns the persisted state. On a missing key it returns the empty-state default with `blocks/categories/looseBricks` empty, `schemaVersion: 1`, and `programStart` stamped to today's ISO date.

**Hydration (two-pass)**

4. The server render and the client's first paint both render the empty-state default — no React hydration-mismatch warning in the console.
5. After mount, the app rehydrates from `dharma:v1`; persisted blocks, categories, and loose bricks render on the timeline / tray.
6. Every mutating `Action` (`ADD_BLOCK`, `ADD_CATEGORY`, `ADD_BRICK`, `LOG_TICK_BRICK`, `SET_UNITS_DONE`) leaves `dharma:v1` updated to the post-dispatch state.
7. After a reload, the exact pre-reload `AppState` is restored — every block, category, loose brick, and every brick's `done` value (boolean for `tick`, number for `units`).

**Robustness**

8. Malformed JSON in `dharma:v1` → `loadState` returns the empty default; no exception escapes.
9. A `schemaVersion` value other than `1` → `loadState` returns the empty default; no exception escapes.
10. A partial persisted object (one or more of `blocks`/`categories`/`looseBricks` absent) → `loadState` fills each missing collection with `[]`.
11. `localStorage` getItem/setItem throwing → `loadState` returns the default and `saveState` swallows the error; the app does not crash and remains usable in-memory.

**`programStart` / day number**

12. On first run `programStart` is set to today's ISO date; on every subsequent load it is preserved unchanged.
13. The day number surfaced in the top bar is computed `programStart`-relative (the `programStart` day is day 1), replacing M1's `dayOfYear()`. If no day-number surface currently consumes `dayOfYear()`, this AC reduces to "`programStart` is persisted and exposed" — VERIFIER resolves via SG-m8-03.

**No regression**

14. No UI surface, component, or interaction changes. Every M1–M4g Vitest and component test passes unmodified.
15. Quality gates: `tsc --noEmit` clean; ESLint 0 errors (≤13 warnings); full Vitest suite green. E2E (Playwright, deferred-to-preview) clears `localStorage` between cases per ADR-018; covers first-run-empty, mutate-then-reload-persists, and corrupt-key-recovers.

### Open spec gaps (resolve at VERIFY)

- **SG-m8-01 — Save cadence: every dispatch vs debounced.** Recommendation: `saveState` synchronously on every mutating dispatch. `AppState` is small (a day's blocks/bricks); `JSON.stringify` + one `setItem` is sub-millisecond. Trade-off: debouncing reduces writes but adds a flush-on-unload edge case and a lost-write window. Lean: save every dispatch; revisit only if M7 profiling shows jank.
- **SG-m8-02 — Hydration wiring: `usePersistedState()` hook vs explicit effect in `BuildingClient`.** Recommendation: a `usePersistedState()` hook in `lib/persist.ts` (or a sibling) that owns the two-pass load + the save-on-change effect, so `BuildingClient` stays thin and the behavior is unit-testable in isolation. Trade-off: an inline effect is fewer files. Lean: hook. PLANNER finalizes.
- **SG-m8-03 — `programStart`-relative day number surface.** Recommendation: PLANNER greps for the current `dayOfYear()` consumer (M1 top bar). If it exists, M8 swaps it to `programStart`-relative and AC #13 stands in full. If the surface was never wired, M8 only persists + exposes `programStart` and the swap defers to whichever milestone renders the day number. VERIFIER confirms which.
- **SG-m8-04 — `programStart` / `schemaVersion` placement: on `AppState` vs persist-boundary wrapper.** Recommendation: `programStart` joins the in-memory `AppState` (the running app needs it for the day number); `schemaVersion` is pure persistence metadata and is added by `saveState` / stripped by `loadState` at the boundary. Trade-off: putting both on `AppState` is uniform but leaks a storage concern into runtime state. Lean: split as described. PLANNER decides and VERIFIER checks the schema lock.
- **SG-m8-05 — Corrupt-key disposition: overwrite vs preserve.** Recommendation: on a corrupt/unreadable `dharma:v1`, fall back to the default in memory and let the next `saveState` overwrite it naturally — do not proactively `removeItem`. Trade-off: preserving the bad value briefly aids debugging but risks a confusing reload. Lean: passive overwrite-on-next-save.
