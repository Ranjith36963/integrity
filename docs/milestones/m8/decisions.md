## ADR-018 — Phase-1 persistence is `localStorage` under `dharma:v1`

> **Superseded by ADR-044.**

**Status:** Accepted · 2026-04-29

**Context.** No backend yet. The product needs to remember the user's blocks, bricks, completion logs, program-start date, and timer state across page loads.

**Decision.** A single localStorage key `dharma:v1` holds the entire `AppState` JSON. The state is loaded after first paint (two-pass render) so SSR HTML matches the empty-state default. A new module `lib/persist.ts` exposes `loadState()`, `saveState(state)`, and `usePersistedState()`.

**Schema (versioned, evolvable):**

```ts
type AppState = {
  schemaVersion: 1;
  programStart: string; // ISO date, set on first run
  blocks: Block[]; // template blocks (with recurrence)
  logs: Record<string, BrickLog>; // keyed by `${yyyy-mm-dd}:${blockId}:${brickId}`
  timers: Record<string, TimerState>; // keyed by `${blockId}:${brickId}`
  deletions: Record<string, true>; // per-day "just today" overrides, key `${yyyy-mm-dd}:${blockId}`
};
```

**Consequences.**

- All mutations route through `saveState()` after `setState`. We accept the small write overhead in exchange for guaranteed durability.
- Future migration is a `schemaVersion` bump + a small migrator function in `persist.ts`.
- Tests can pre-seed `localStorage` directly to set up scenarios; e2e tests should clear `localStorage` between cases.

---

## ADR-044 — M8 persisted schema (supersedes ADR-018's schema block)

**Status:** Accepted · 2026-05-15

**Context.** ADR-018 (2026-04-29) decided Phase-1 persistence is a single `localStorage` key `dharma:v1` holding the full `AppState`, loaded two-pass after first paint, via a `lib/persist.ts` module. That transport decision is sound and stands. Its **schema block**, however, predates the brick pivot and the M4f timer rip, and no longer matches the live model:

- ADR-018 specified a `logs: Record<string, BrickLog>` map. There is no such collection — completion state lives directly on the brick (`done: boolean` for `tick`, `done: number` for `units`).
- ADR-018 specified a `timers: Record<string, TimerState>` map. Timer infrastructure was fully removed by ADR-043 (M4f). There are no timers.
- ADR-018 predated `categories` and `looseBricks`, both of which the live `AppState` (`lib/types.ts`, post-M4f) now carries.

The live `AppState` is `{ blocks, categories, looseBricks }`. M8 cannot implement ADR-018's schema literally.

**Decision.** M8 persists the **live post-M4f `AppState`**, plus two persistence fields. The on-disk JSON under `dharma:v1` is:

```ts
type PersistedState = {
  schemaVersion: 1; // migration anchor
  programStart: string; // ISO YYYY-MM-DD, stamped once on first run
  blocks: Block[];
  categories: Category[];
  looseBricks: Brick[];
};
```

- **No `logs` map** — completion lives on bricks.
- **No `timers` map** — timers removed (ADR-043).
- **No `deletions` map in v1** — M5 (Edit Mode + delete) adds `deletions` via a `schemaVersion: 2` bump + a migrator. Adding it now would be a speculative empty field.
- Whether `programStart` / `schemaVersion` live on the in-memory `AppState` or in a persist-boundary wrapper is a PLANNER decision (see SG-m8-04).

**Consequences.**

- ADR-018's schema block is **superseded**; its transport + two-pass-load + `lib/persist.ts` decision is **retained**.
- `schemaVersion` is the migration anchor. v1 has no on-disk predecessor (no prior release persisted anything), so M8 ships the version field + a migrator scaffold but writes no actual v0→v1 migration.
- M5 will bump to `schemaVersion: 2` when it introduces `deletions`.
- `programStart` enables `programStart`-relative day numbering — M1's `dayOfYear()` placeholder is retired.
- A corrupt, unreadable, or unknown-version `dharma:v1` value falls back to the empty-state default; the app never crashes on bad persisted data.
- Reversible: if a future phase needs a separate `logs` collection (e.g. per-day history beyond what bricks carry), that is a `schemaVersion` bump, not a supersede of this ADR.
