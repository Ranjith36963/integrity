# M11 — Durable History: routine persists, every day recorded, nothing lost

## Intent

The user builds a recurring routine and logs measurements against it every day. **No data may ever
be lost** — not the plan (habits they created) and not the record (what they did/measured). Over
years, months, days, the app must let them scroll back and see every previous day, week, and month
truthfully. This is the product's differentiation: **the correct answer, not a flattering one.**

Two data streams, both preserved forever, for every day:

1. **Plan (create-side):** the habits/tasks — blocks and the bricks inside them. Persistent
   recurring templates.
2. **Record (log-side):** the measurements — tick done/not-done, units reps, timer minutes — as
   they stood at the end of each day. An immutable snapshot per day.

## Background — why this milestone exists (defects found)

Driving the user's real routine through the app surfaced two data-loss defects in the daily
rollover (`lib/history.ts` `seedFreshDay`/`seedBrick`):

- **D1 — normal bricks are dropped nightly.** `seedBrick` returns `null` for any brick with
  `hasDuration === false`, so a plain habit brick ("Meditation ✓", "Pushups 20 reps") never
  carries to the next day. Only timed + recurring bricks survive.
- **D2 — empty blocks are dropped nightly.** A block carries only if ≥1 brick survives D1, so a
  routine built from empty time-blocks (the user's actual routine) vanishes at the first rollover.

Net effect: the recurring routine does not actually persist in the common case. Empirically
confirmed — a 32-block routine dated yesterday came back with 0 blocks after one rollover.

A third gap blocks "see all previous days":

- **D3 — skipped days are never recorded.** Rollover archives only the single last-open day and
  jumps to today (no intervening backfill), so days the user doesn't open the app leave holes in
  history rather than counting as missed.

## The model (target)

- `state.blocks` and their bricks are **persistent recurring templates.** They carry forward every
  day, unchanged in definition, until the user edits or deletes them.
- Bricks belong to their block and carry **with** the block; a normal (non-timed) brick recurs on
  the block's schedule. Bricks do not need their own separate recurrence to survive.
- At rollover: **archive** the ending day's snapshot (plan + logged measurements) into history
  forever, then **carry the full routine forward with completion reset** (tick → not done, units →
  0, timer → 0) so today is a fresh copy to fill in.
- Only genuinely **expired one-offs** drop: a `just-today` block/brick whose date is now past, and a
  `custom-range` whose end date is past.
- Missed days are **backfilled** so history has no holes.

## Decisions (user-owned, locked)

- **DEC-1 — Missed day scores 0%, displayed as "No entry / Nil".** A day with a scheduled routine
  but nothing logged (whether the user never opened the app, or opened it and did nothing) counts
  as **0%** in all week/month/year aggregates — no hiding a bad stretch. The UI labels such a day
  **"No entry"** (distinct visual treatment) so a zero-by-omission reads clearly, but it is
  mathematically 0, not excluded. Days **before** the user's `programStart` are blank/excluded
  (not punished).
- **DEC-2 — "Editing past days" is a Settings option with three choices.** Default is honesty.
  1. **Read-only truth** (default) — past days are locked; history is incorruptible.
  2. **Yesterday only** — the previous 1 day may be back-logged, then locks.
  3. **Up to 3 days** — a rolling window (max 3 days) may be back-logged.
     The window is never more than 3 days.

## Build order (each independently shippable)

- **Step 1 — Rollover preserves the routine (fixes D1 + D2).** Carry every still-live block and all
  its bricks forward with completion reset; keep empty blocks; drop only expired one-offs. Archive
  the ending day unchanged. _Prerequisite for everything else._
- **Step 2 — Backfill + complete daily records (fixes D3 + DEC-1).** On open after a gap, record
  every skipped day as a missed day (0%, "No entry"); every archived day stores plan + measurements.
- **Step 3 — Browsing + back-log setting (DEC-2).** Point the existing Week/Month/Year + tap-a-date
  drill-down at the now-complete history; add the Settings "Editing past days" control.
- **Step 4 (separate) — Off-device durability (Supabase).** localStorage alone cannot promise
  "forever across devices"; cloud sync/backup is the true never-lose layer. Tracked separately.

## Inputs

- `state.blocks` (with bricks), `state.looseBricks`, `state.history`, `state.currentDate`,
  `state.programStart`, per-block/brick `recurrence`, the "Editing past days" setting.
- `todayISO` supplied by the caller (never a direct clock read — ADR-020/046).

## Outputs

- A rolled `PersistedState` whose `blocks`/`looseBricks` retain the full live routine (completion
  reset), whose `history` gains an immutable snapshot for the ending day and every backfilled
  skipped day, and whose `currentDate === todayISO`.
- Week/Month/Year aggregates and the day drill-down read a hole-free, truthful history.

## Edge cases

- Multi-day gap (e.g. last open Jun 2, reopened Jul 2) → every day Jun 2..Jul 1 archived as missed
  (0%), Jul 2 seeded fresh.
- Weekday routine on a weekend day → block still carries in `state.blocks`; the Day view hides it
  (existing `currentDayView` filter); that day's score counts only what applies (existing behavior).
- `just-today` block whose date has passed → dropped. `custom-range` past its end → dropped.
- Timezone: all weekday/date math via local-date construction (ADR: no UTC drift), TZ-pinned tests.
- Empty routine (no blocks) → rollover is a safe no-op beyond advancing the date; no divide-by-zero.
- Archived-day immutability: later edits to the live routine must never mutate a stored snapshot
  (structuredClone, as today).

## Acceptance criteria

- **AC-1:** A block with zero bricks and a recurring recurrence (every-day/weekday/weekend) survives
  a rollover (present in the rolled `state.blocks`).
- **AC-2:** A normal brick (`hasDuration: false`) inside a recurring block survives a rollover with
  its completion reset (tick→false, units done→0, timer elapsed→0).
- **AC-3:** A `just-today` block/brick whose date is before `todayISO` does NOT survive a rollover.
- **AC-4:** A `custom-range` block whose `end` is before `todayISO` does NOT survive; one whose end
  is on/after `todayISO` does survive.
- **AC-5:** The ending day is archived into `history[oldCurrentDate]` as an immutable snapshot
  containing the blocks and their logged measurements; mutating the live routine afterward does not
  change the snapshot.
- **AC-6:** Reopening after an N-day gap backfills every skipped in-range day into `history`, each
  scoring 0% ("No entry"), with no day skipped and none beyond `todayISO`.
- **AC-7:** Days before `programStart` are excluded from aggregates (not scored 0%).
- **AC-8:** Week/Month/Year aggregates over a backfilled range compute the correct averages
  (missed days counted as 0 per DEC-1).
- **AC-9:** Settings "Editing past days" persists one of {read-only, yesterday, up-to-3-days};
  editing a past day is permitted only within the selected window and blocked otherwise.
- **AC-10:** All rollover math is timezone-invariant (TZ-pinned across PT/Tokyo/UTC/Nepal).
