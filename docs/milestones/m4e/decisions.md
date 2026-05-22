## ADR-042 — Duration is a universal axis; bricks optionally timed via toggle

**Status:** Accepted · 2026-05-14 · Softens ADR-034 (brick clause) · Enables M4e · See ADR-006 (half-open intervals), ADR-019 (`Recurrence` union), ADR-034, ADR-035

**Context.** ADR-034 (2026-05-05) hard-locked "blocks always timed, bricks never timed." That clean split worked through M2/M3/M4a/M4b/M4c/M4d. After M4c shipped and Gate #2 on the M4 trilogy completed, the user's mental model shifted: **duration is not a property of "what kind of task" but a universal time-window axis that applies to any task.** A block always has duration (its window on the timeline); a brick _might_ have duration (a window of its own) and might not. Whether a brick has duration is independent of its score type (tick / units). Tick / units are _performance_ axes — how the user measures progress inside the window. Duration is _scheduling_ — when the activity occupies the day.

The user's exact framing (2026-05-14): "Imagine I'm gonna run from 6 to 6:40. That is my running duration. In that duration, I can run for 10 minutes, 20 minutes, 30 minutes... but the whole duration for running that is allocated for the day is 40 minutes. That is duration. But the time brick is something that, okay, today I ran for 10 minutes... The time, tick, and goal score types are based on the performance checkers or performance matrices for calculation or improvements. But the duration is the time allocated for that specific goal or task."

**Decision.** Add an optional duration axis to every brick, controlled by a per-brick boolean toggle (`hasDuration: boolean`, default `false`). When OFF, the brick is time-agnostic (matches ADR-034's original brick clause). When ON, the brick gains the same time-window contract blocks have: `start: string` (HH:MM, required), `end: string` (HH:MM, required, half-open `[start, end)` per ADR-006), `recurrence: Recurrence` (per ADR-019, required, default `{ kind: "just-today", date: <today> }`).

The toggle is orthogonal to score type — tick and units bricks both expose the same toggle with the same semantics. The two score types (tick / units) are orthogonal to the duration axis; `hasDuration` can be ON or OFF for either kind.

_(Prose harmonized at M4f per ADR-043: "goal" kind → "units", "time" kind removed. Score-type cardinality drops from 3 to 2. The duration-axis decision itself is unchanged.)_

Loose bricks (no parent block) with `hasDuration === true` render on the timeline at their `start` row, visually distinct from blocks via a dashed outline. Nested bricks (with a parent block) with `hasDuration === true` render their HH:MM–HH:MM badge inside the brick chip but otherwise stay inside the parent block card on the timeline — they do NOT promote to a separate timeline row.

Overlap detection becomes a first-class concern. The overlap engine (new module `lib/overlap.ts`) operates on the union of (a) all blocks and (b) all bricks with `hasDuration === true`. Detection runs live in AddBlockSheet and AddBrickSheet on every field-change tick; collisions surface as a warning chip and disable the Save button until resolved. Block↔block overlap detection is retroactively added (M2 ships without it).

**Consequences.**

- **ADR-034 is softened, not killed.** Block clause is unchanged. Brick clause is now "optionally timed via toggle." See ADR-034's revised text.
- **Brick schema gains four fields.** `hasDuration: boolean` (always present), `start?`, `end?`, `recurrence?` (present iff `hasDuration === true`). The reducer enforces the presence invariant on `ADD_BRICK`.
- **`durationMin` retains its M4e meaning.** It is NOT re-derived from `end - start`. A units brick with `hasDuration: true` has two distinct numbers: allocated window (`end - start`) and performance target (`durationMin`). _(Note: `durationMin` was originally tied to the M4c timer; the timer was removed in M4f per ADR-043, but `durationMin` remains a valid performance-target field on units bricks.)_
- **Timeline rendering becomes a union.** `<Timeline>` renders `[...blocks, ...looseBricks.filter(b => b.hasDuration)]` sorted by `start`. M2's "blocks only" assumption is retired.
- **Loose Bricks tray becomes filtered.** `<LooseBricksTray>` renders only `looseBricks.filter(b => !b.hasDuration)`. M3's tray-visibility contract still triggers (hidden when this filtered list is empty AND no blocks exist).
- **Overlap engine is new pure-function infrastructure.** `lib/overlap.ts` exports `intervalsOverlap` and `findOverlaps`. Reused by both Add sheets. No reducer involvement.
- **Save-blocking on overlap.** AddBlockSheet AND AddBrickSheet disable Save while the overlap list is non-empty. Tapping the disabled Save fires a `medium` haptic and surfaces a hint; the sheet stays open.
- **No data migration shipped to disk** (persistence is M8). All existing in-memory `Brick` literals (M3/M4a/b/c test fixtures) gain `hasDuration: false` either via explicit construction or via a `withDurationDefaults` helper at PLANNER's discretion.
- **`<Toggle>` becomes an M0 primitive.** First consumer is M4e's AddBrickSheet; future consumers (M5 edit mode, M6 settings) reuse the same component.
- **Recurrence resolution stays out of scope.** Bricks now carry recurrence per ADR-019, but `appliesOn(rec, date)` is still M9. M4e renders today only; recurrence is stored but inert.
- **Score-type logic is untouched.** M4a tick / M4b units (formerly goal) reducer arms unchanged at M4e. Cascade, scoring, hero ring, BlueprintBar — all untouched. _(M4c time reducer arm was removed in M4f per ADR-043; ADR-042's duration-axis logic is preserved.)_

**Out of scope (for ADR-042, addressable in future ADRs):**

- Editing an existing brick's `hasDuration` flag or any of its time fields — **M5 Edit Mode**.
- Recurrence resolution against past or future dates — **M9** (`appliesOn(rec, date)` resolver).
- Conflict-resolution UI beyond Save-disable (auto-shift, merge prompts, suggested alternative times) — **never**. The user resolves; the app surfaces.
- Drag-to-reschedule on the timeline — **M5/M7**.
- Cross-day windows (start before midnight, end after) — **never** (matches M2 single-day block contract).
- Auto-deriving `durationMin` from `end - start` on time bricks — **never** (user direction 2026-05-14: the two are intentionally separate axes).
- Promoting nested timed bricks to their own timeline row — **never** (nested bricks stay inside parent block card regardless of toggle state).
- Hard-constraining a nested brick's window to fit inside its parent block — **never** (user direction: "depends on the user"). Overlap engine still warns if the spill creates collisions with other items.

---
