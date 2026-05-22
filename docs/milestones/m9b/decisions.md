## ADR-038 — Forgiveness model: missed days = gray, no shame

**Status:** Accepted · 2026-05-05 · resolves design-pillar Q5

**Context.** Three forgiveness models considered for missed days: (a) Duolingo's streak-freeze (one free skip per week, use-or-lose), (b) Headspace's gentle gray (missed days observed, never punished), (c) Dharma-native compound forgiveness (break a streak → next 3 days at 50%+ rebuilds it; harder break = harder rebuild). The rest of Dharma's tone is calm-confident; punishment-via-red breaks that tone. Most competitors get this wrong (see § 0.1 wedge point 6).

**Decision.** Missed days render **gray, never red** across all calendar views (Castle / Kingdom / Empire). Streaks are visible to those who want them (flame icon, days-in-a-row over 50%) but they're a _feature_, not the spine of the UI. No auto-broken streaks, no compounding penalties. Identity stats highlight presence ("Days you ran: 142"), never absence.

**Consequences.**

- M9 calendar visualizations (Castle / Kingdom / Empire) use a gray→green color scale. Red is reserved for destructive UI affordances only (delete confirmations).
- A streak counter resets on a true 0% day, but past-day visualization stays gray (not red) — the day is observed, not shamed.
- Empire view's identity-stats overlay (§ 0.6) frames presence-positively.
- This is explicit positioning vs Streaks.app, Habitica, Duolingo — Dharma is the no-shame habit tracker.

---

## ADR-045 — M9b persisted schema v2: day history + rollover

**Status:** Accepted · 2026-05-18

**Context.** ADR-044 defined the `dharma:v1` persisted shape — a single in-progress day (`schemaVersion: 1`, `programStart`, `blocks`, `categories`, `looseBricks`). It persists exactly one day; when the calendar date changes there is no archive and no fresh day — the same `AppState` simply persists forever. ADR-044 anticipated this: "if a future phase needs a separate per-day history collection, that is a `schemaVersion` bump." M9b is that phase. (ADR-044 also speculated M5 would claim `schemaVersion: 2` for a `deletions` map; M5 never shipped, so M9b takes v2. A future Edit-Mode milestone, if built, would be v3.)

M9 turns Dharma into a longitudinal tracker: the calendar views (M9c–M9e) need every finished day on record. M9b is the storage + rollover chunk that produces that record.

**Decision.** M9b bumps the persisted schema to `schemaVersion: 2`. The on-disk JSON under `dharma:v1` (the storage _key_ is unchanged — only the `schemaVersion` field moves to `2`) is:

```ts
type ArchivedDay = {
  blocks: Block[];
  categories: Category[];
  looseBricks: Brick[];
};

type PersistedStateV2 = {
  schemaVersion: 2;
  programStart: string; // ISO YYYY-MM-DD — unchanged from v1
  currentDate: string; // ISO YYYY-MM-DD — the date of the in-progress day
  history: Record<string, ArchivedDay>; // keyed by ISO YYYY-MM-DD
  blocks: Block[]; // the in-progress (current) day
  categories: Category[];
  looseBricks: Brick[];
};
```

- **`currentDate`** is the calendar date the in-progress `blocks`/`categories`/`looseBricks` belong to. It is the rollover anchor: on load, if `currentDate` is earlier than today, the day has ended.
- **`history`** is a plain map, ISO-date key → `ArchivedDay`. An `ArchivedDay` stores only the three day collections — **no stored score**. Day, week, month, and year scores are always computed on read (via the existing `dayPct` / `lib/dharma.ts` helpers), never persisted. This honors the M9 storage strategy: raw days in, all aggregates derived.
- **No stored week/month/year records.** A "Castle"/"Kingdom"/"Empire" total is a function of the archived days in range, computed at render time.
- **Migration v1 → v2:** a `schemaVersion: 1` value loads as v2 by setting `currentDate` to today's ISO date (the v1 in-progress day becomes today's day), `history` to `{}`, and `schemaVersion` to `2`. No day data is lost. The v0→v1 migrator scaffold from ADR-044 gains a v1→v2 step.
- **Unknown / future `schemaVersion`** (≥ 3 or non-numeric) → empty-state default, no throw — unchanged from ADR-044's robustness stance.

**Consequences.**

- ADR-044's transport (single key, two-pass load, `lib/persist.ts`) and its v1 shape are **retained**; ADR-045 extends, not supersedes — a v1 payload still migrates cleanly.
- Rollover _behavior_ (how skipped days are recorded, how recurring bricks seed a fresh day, what happens to non-recurring bricks) is specified by the M9b spec entry, not this ADR. This ADR locks only the persisted _shape_ and the migration.
- `history` grows ~one small `ArchivedDay` per day — roughly a year of days is a few hundred KB of JSON, well within `localStorage` limits. Pruning is not needed in Phase 1.
- Reversible: a future schema need (Edit Mode `deletions`, cloud-sync metadata) is a `schemaVersion: 3` bump with a v2→v3 migrator, not a supersede.
