## ADR-043 — Two brick kinds (tick + units); time-brick timer infrastructure removed

**Status:** Accepted · 2026-05-14 · Supersedes the score-type cardinality and the M4c timer infrastructure · See ADR-035 (three score types, original), ADR-042 (universal duration axis — prose harmonized in this ADR), ADR-034 (already softened by ADR-042) · Enables M4f

**Context.** After M4c shipped a live timer (`lib/timer.ts`, `<TimerSheet>` long-press manual entry, `runningTimerBrickId` AppState field, 4 timer actions, `visibilitychange` recovery, `chime.mp3` placeholder) and M4e shipped the universal-duration axis (ADR-042), the user clarified their model on 2026-05-14:

> "When I say time, you don't need to set the timer in the brick. You just need to, user is gonna type how many minutes he ran, how many minutes he read the book, how many minutes he meditated. He's just gonna enter, same like the goal. […] There's two types of bricks. One is tick. Yes or no, on or off. […] And there's one more called as goal-based. Goal-based brick is two types. One is time-based. Like, you will set, okay, 30 minutes running. So how much did you do, did you do today? 20 minutes, something like that, right? Same thing. There's one more type in goal-based, that is rep, number of reps. How many push-ups? […] Tick based or units based bricks this is final in this case unit can user choice ok"

Two locked decisions emerge:

1. **There are only two brick kinds, not three.** A brick is either a **tick** (boolean — did you do it) or a **units** brick (target + free-text unit + done count). The M4c-era "time" kind is conceptually a units brick where the user happens to have typed `"minutes"` as the unit. Rep-based goals are units bricks with `"reps"`. Page counts, glasses of water, deep breaths — all units bricks with whatever the user types.
2. **The app does not count for the user.** No live timer. No auto-incrementing minutes. No chime on completion. The user types the number themselves, like they would type any other progress value. Performance entry is symmetric across all units bricks — a single manual-number input.

ADR-042 (universal duration axis) is preserved as-is in spirit: a units brick can still have `hasDuration: true` with `start: "06:00"` / `end: "06:40"`. The two axes (units = how much / what; duration = when in the day) remain orthogonal. The "30 minutes running 6:00–6:40" example that motivated ADR-042 is now: a units brick with `unit: "minutes"`, `target: 30`, `done: <typed>`, `hasDuration: true`, `start: "06:00"`, `end: "06:40"`. The wording in ADR-042 that referenced three score types (`tick / goal / time`) is harmonized in-place to `tick / units` — the decision itself is unchanged.

**Decision.**

- The `Brick` discriminated union has exactly **two** variants:
  - `kind: "tick"` with `done: boolean`.
  - `kind: "units"` with `target: number`, `unit: string` (free-text, user-typed), `done: number`.
- The M4b discriminator `kind: "goal"` is renamed to `kind: "units"`. The field `count` is renamed to `done` for consistency with the tick variant.
- The M4c discriminator `kind: "time"` is **removed**. All fixtures, components, reducers, and selectors that referenced it migrate to `kind: "units"` with `unit: "minutes"`, `target: <previous durationMin>`, `done: <previous minutesDone>`.
- `AppState.runningTimerBrickId` is **removed**.
- The Action union loses `START_TIMER`, `STOP_TIMER`, `TICK_TIMER`, `SET_TIMER_MINUTES`, and `LOG_GOAL_BRICK`. It gains exactly one new variant: `{ type: "SET_UNITS_DONE"; brickId: string; done: number }`. The reducer clamps `done` to `Math.max(0, Math.floor(done))`.
- `lib/timer.ts`, `lib/timer.test.ts`, `components/TimerSheet.tsx`, `components/TimerSheet.test.tsx`, `public/chime.mp3`, and any `useTimer` hook file are **deleted**.
- A new `<UnitsEntrySheet>` component handles all "log progress" interactions for units bricks. It opens on tap of a units `<BrickChip>`, presents the brick's name, a sub-heading `"Today's <unit>"`, and a single numeric input pre-filled with the brick's current `done` value. Save dispatches `SET_UNITS_DONE`.
- The `<BrickChip>` time-variant rendering branch is deleted. The units variant renders `"<done> / <target> <unit>"` (e.g., `"20 / 30 minutes"`, `"50 / 100 reps"`, `"3 / 8 glasses of water"`).
- The `<AddBrickSheet>` kind selector renders exactly two chips: "Tick" and "Units". The "Time" chip is gone.
- The M4b stepper (±1 buttons on the chip surface) is removed; the chip is a single-tap surface that opens the entry sheet.

**Consequences.**

- **M4e is preserved.** The `hasDuration` toggle, overlap engine, and timeline-promotion contract work identically against the collapsed brick union. M4e tests that exercised the time-kind variant re-point to the units-kind variant with `unit: "minutes"` and remain green.
- **Score-type cardinality drops from 3 to 2.** Any prose, ADR, or doc that says "tick / goal / time" is updated to "tick / units" (the user's locked vocabulary). ADR-035's original three-kind decision is superseded.
- **Timer infrastructure is fully removed.** Roughly 84 grep hits across 31 files migrate or delete. Open loops from `docs/status.md` related to M4c (`useTimer` exhaustive-deps warning, `<TimerSheet>` auto-focus, `chime.mp3` placeholder) all resolve.
- **No persistence migration needed.** M8 owns persistence; no on-disk data exists today. The collapse is a pure-code refactor; the only "migration" is for in-memory test fixtures.
- **Action union shrinks by 4 (5 removed, 1 added).** Reducer becomes simpler. The single new arm (`SET_UNITS_DONE`) is absolute-value (not delta) — typing replaces stepping.
- **Free-text unit unlocks future use cases without schema churn.** "Pages", "km", "glasses of water", "deep breaths" — all valid units. Auto-suggestion or a unit dropdown is M7 polish; not blocking M4f.
- **The `<UnitsEntrySheet>` is reusable.** Future milestones that need a "log a number against a target" interaction (M5 edit mode, M9 history) can compose the same sheet.
- **Reversible (with cost).** If usage signal argues for the timer back, ADR-043 can be superseded; the cost is rebuilding `lib/timer.ts`, restoring the `START/STOP/TICK/SET` actions, restoring `runningTimerBrickId`, restoring the time discriminator. The shipped commit history of M4c can be cherry-referenced. Estimated 1–2 milestone-days of work.

**Out of scope (for ADR-043, addressable in future ADRs):**

- Decimal numbers in `target` or `done` — M7 polish.
- A unit dropdown / autocomplete with common values — M7 polish.
- A "celebrate when done >= target" sound or animation — M7 polish.
- Editing an existing units brick's `target` or `unit` — M5 Edit Mode.
- A quick-log gesture (long-press to increment by 1, swipe to clear) — M7 if usage warrants.
- A history view of past `done` values for the same brick — M9 (depends on M8 persistence with day-stamps).
- Re-introducing any live-timer behavior — **never** per user direction 2026-05-14.

---
