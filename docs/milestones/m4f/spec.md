## Milestone 4f — Collapse to two brick kinds; rip the timer

> **Pillars:** § 0.5 (interaction primitives — score types collapse from three to two: tick + units), § 0.9 (data model — `Brick` union shrinks; `AppState` loses `runningTimerBrickId`; Action union loses four timer variants and `LOG_GOAL_BRICK`), § 0.14 (no factory anything — manual entry replaces auto-counting), **ADR-043 (NEW, supersedes the score-type cardinality in ADR-035; supersedes the timer infrastructure in M4c)**, ADR-042 (universal-duration axis — unchanged in spirit; references to "tick/goal/time" updated to "tick/units"), ADR-034 (already softened).

### Intent

After M4e shipped, the user clarified the brick model: **there are only two brick kinds, not three.** A brick is either a **tick** (boolean — "did you do it, yes / no") or a **units** brick (target + unit + done — "you set a target of N <unit>, you type how much you did today"). The "time" kind shipped in M4c — with its live timer, START/STOP actions, single-running invariant, and visibilitychange recovery — is **wrong**. (The block/day completion chimes from M4a are a separate, retained feature — see Inputs/Outputs below.) The user does not want the app counting minutes for them. They want to type "20" into a brick that has a target of "30 minutes running." A time-of-day window (when in the day this runs) is already covered by M4e's `hasDuration` axis. A performance target in minutes is just a units brick where the user's unit happens to be the word `"minutes"`. Rep-based goals, page counts, glasses of water, deep breaths — all the same shape, distinguished only by the unit string the user types.

M4f collapses the schema to match this mental model:

- `Brick` discriminated union shrinks from three variants to two: `kind: "tick"` and `kind: "units"`. The `kind: "time"` variant is **removed**.
- `kind: "goal"` (M4b's name) is **renamed** to `kind: "units"` (user's vocabulary, locked 2026-05-14). The data shape stays the same modulo one rename: `count` → `done` (consistency with tick).
- `AppState.runningTimerBrickId` is **removed**.
- Action union loses four timer variants (`START_TIMER`, `STOP_TIMER`, `TICK_TIMER`, `SET_TIMER_MINUTES`) and `LOG_GOAL_BRICK` (delta-stepper, M4b). One new action takes their place: `SET_UNITS_DONE { brickId, done }` — absolute-value entry, clamped `done >= 0`.
- `lib/timer.ts`, `<TimerSheet>`, and the `useTimer` hook are **deleted**. `lib/audio.ts` and `public/sounds/chime.mp3` are **retained** — the block-complete and day-complete chimes (M4a) stay; only the M4c timer's own chime invocation is removed (it dies with the timer). **User decision 2026-05-14: keep the block/day completion chimes.**
- `<AddBrickSheet>` kind selector shrinks from three chips (Tick / Goal / Time) to two (Tick / Units). The Units chip reveals the same Target + Unit inputs M4b already shipped for goals — just with the chip label and the discriminator value updated.
- `<BrickChip>` loses the time variant. The units variant now handles what was previously "goal" (target/unit/done) AND what was previously "time" (a minutes target). Tap on a units brick chip opens a new `<UnitsEntrySheet>` — a manual-number-entry sheet — pre-filled with the brick's current `done` value. The user types or edits the number, taps Save, and the reducer commits `SET_UNITS_DONE`.

M4e's universal-duration axis is preserved. A units brick with `unit: "minutes"`, `target: 30`, and `hasDuration: true` with `start: "06:00"` / `end: "06:40"` is the new way to express what M4c's time brick tried to express. The duration axis (M4e) says _when_ in the day. The units axis (M4f) says _how much_ of _what_ (free-text unit).

**What this is NOT:** changing the M4e duration toggle, overlap engine, or timeline-promotion contract (M4e ACs all still hold for the two remaining kinds); adding edit-mode for an existing brick (M5); persisting state (M8); resolving recurrence against arbitrary dates (M9); reintroducing a stepper ±1 UX (manual-number entry replaces it entirely — typing a number is the only path); adding decimal numbers to target or done (integers only in M4f; decimals can be M7 polish); changing the cascade / scoring math beyond renaming the fields it reads (`count` → `done`, `minutesDone` migrates to `done` on the unit-side once-only).

### Inputs

- The full M4e surface — `<BuildingClient>`, `<BottomBar>`, `<Timeline>` with `<SlotTapTargets>`, `<AddBlockSheet>`, `<AddBrickSheet>`, `<AddChooserSheet>`, `<LooseBricksTray>`, `<TimelineBlock>`, `<TimedLooseBrickCard>`, `<BrickChip>` (currently three variants — about to become two).
- M0 primitives unchanged — `<Sheet>`, `<Input>` (text + number), `<Chip>`, `<Button>`, `<Toggle>`.
- M0 motion + haptics unchanged.
- The locked `Recurrence` union (ADR-019), half-open intervals (ADR-006), and M4e's `hasDuration` axis (ADR-042).
- The M4c timer surface — `lib/timer.ts`, `<TimerSheet>`, `useTimer`, 4 timer actions, `runningTimerBrickId` — all **inputs to be deleted** by this milestone. `lib/audio.ts` + `public/sounds/chime.mp3` are NOT in the deletion set — they are retained for the M4a block/day completion chimes.

### Outputs (regions and behaviors)

| Region                                                                   | Role in M4f                                                                                                                                                                                                                                                                                                                                                                                                                                      | Sync with prior milestones                                                                                                    |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `lib/types.ts` (CHANGED — collapse)                                      | `Brick` union shrinks to two variants. `kind: "time"` removed. `kind: "goal"` renamed to `kind: "units"`. Field `count` renamed to `done`. `AppState.runningTimerBrickId` removed. Action union loses `START_TIMER`, `STOP_TIMER`, `TICK_TIMER`, `SET_TIMER_MINUTES`, `LOG_GOAL_BRICK`. Adds `SET_UNITS_DONE { brickId: string; done: number }`. M4e fields (`hasDuration`, `start?`, `end?`, `recurrence?`) on `BrickBase` are **unchanged**.   | M4e schema otherwise preserved.                                                                                               |
| `lib/data.ts` (CHANGED)                                                  | Reducer loses 5 action arms (4 timer + LOG_GOAL_BRICK). Gains 1 arm: `SET_UNITS_DONE` clamps `done >= 0` and writes to the targeted brick (loose or nested). `ADD_BRICK` invariant updated — accepts only the two new variants; rejects any input with `kind: "time"` or `kind: "goal"` (defensive; typecheck should already prevent construction).                                                                                              | M4e's `ADD_BRICK` duration invariant preserved.                                                                               |
| `lib/timer.ts` + `lib/timer.test.ts` (DELETED)                           | M4c's timer module removed entirely. No replacement.                                                                                                                                                                                                                                                                                                                                                                                             | All `useTimer` call sites become dead — removed in BuildingClient and BrickChip migrations.                                   |
| `components/TimerSheet.tsx` + `TimerSheet.test.tsx` (DELETED)            | M4c's long-press manual-entry sheet removed. Replaced functionally by `<UnitsEntrySheet>` on tap (not long-press).                                                                                                                                                                                                                                                                                                                               | No callers remain after migration.                                                                                            |
| `lib/audio.ts` + `public/sounds/chime.mp3` (RETAINED)                    | NOT deleted. The block-complete and day-complete chimes (M4a) keep playing. Only the M4c timer's own chime invocation is removed — it dies with the timer. The `chime.mp3` placeholder-needs-a-real-asset open loop in `docs/status.md` stays open (an M7 concern).                                                                                                                                                                              | M4a celebration audio unchanged.                                                                                              |
| `components/UnitsEntrySheet.tsx` (NEW)                                   | Sheet primitive composition: heading shows brick name; subhead shows `"Today's <unit>"` (e.g., "Today's minutes" or "Today's reps"); single `<Input type="number" inputMode="numeric">` pre-filled with current `brick.done`; Save and Cancel buttons. Save dispatches `SET_UNITS_DONE { brickId, done }`. Cancel discards. Sheet opens on tap of any `<BrickChip>` rendering a `kind: "units"` brick.                                           | Replaces M4c's `<TimerSheet>` and M4b's stepper-on-chip UX. Reuses M0 `<Sheet>` + `<Input>`.                                  |
| `components/AddBrickSheet.tsx` (CHANGED)                                 | Kind selector renders 2 chips: "Tick" and "Units". The "Time" chip is gone. Selecting "Units" reveals the same Target (`<Input type="number">`, integer ≥ 1, required) + Unit (`<Input type="text">`, free-text, required, placeholder `"minutes / reps / pages"`) inputs that M4b already shipped. Save constructs `{ kind: "units", target, unit, done: 0, ...durationFields }`. M4e duration toggle row sits below kind selection, untouched. | M4e overlap engine and duration toggle preserved.                                                                             |
| `components/BrickChip.tsx` (CHANGED)                                     | Two variants only: tick + units. Time variant deleted. Units variant renders `"<done> / <target> <unit>"` (e.g., "20 / 30 minutes"). Tap target: full chip → opens `<UnitsEntrySheet>`. No ±1 stepper buttons remain.                                                                                                                                                                                                                            | M4e time-window badge (when `hasDuration === true`) renders identically for both variants.                                    |
| `components/BrickStepper.tsx` (DELETED OR INERT)                         | M4b's ±1 stepper component is no longer reachable from the chip. Planner decides: delete the file outright, or keep it inert for a future "quick increment" reintroduction. Recommendation: delete; manual entry is the locked UX (user direction 2026-05-14).                                                                                                                                                                                   | Open loop. Trade-off documented in PLAN.                                                                                      |
| `app/(building)/BuildingClient.tsx` (CHANGED)                            | Drop the `useTimer` wiring and all `runningTimerBrickId`-derived UI. Wire the new `<UnitsEntrySheet>` open/close state. Pass the active-units-brick id to the sheet on chip-tap.                                                                                                                                                                                                                                                                 | M4e selectors (`selectTrayBricks`, `selectTimelineItems`) untouched — they read `looseBricks` only and don't care about kind. |
| `lib/dharma.ts` + `lib/scoring.ts` (CHANGED)                             | Scoring functions that previously read `brick.count` (goal) OR `brick.minutesDone / brick.durationMin` (time) now read `brick.done / brick.target` on the unified units variant. The completion ratio math is the same; only the field names differ. Tick scoring is unchanged.                                                                                                                                                                  | Cascade behavior is identical post-rename.                                                                                    |
| `components/Brick.tsx` (CHANGED)                                         | Removes the `time` rendering branch. The function now switches on `tick                                                                                                                                                                                                                                                                                                                                                                          | units` only.                                                                                                                  | M3 brick-in-block rendering preserved for the two kinds. |
| All `*.test.{ts,tsx}` files referencing `kind: "time"` or `kind: "goal"` | Bulk migration. `kind: "goal"` literals → `kind: "units"`; `count: N` → `done: N`. `kind: "time"` literals → `kind: "units"` with `unit: "minutes"`, `target: <durationMin>`, `done: <minutesDone>`. M4c timer test files (`lib/timer.test.ts`, `TimerSheet.test.tsx`) deleted outright. M4e tests that exercised the duration toggle against the time-kind variant are re-pointed to the units-kind with `unit: "minutes"`.                     | Migration is mechanical; helper rename keeps the assertions intact where possible.                                            |
| `lib/migrations.ts` or equivalent (CONSIDER — planner choice)            | A one-time `withUnitsCollapse(brick)` migration could simplify the test sweep — accepts a pre-M4f literal (`kind: "goal"` or `kind: "time"`) and returns the post-M4f shape. Lean toward writing the helper for test fixtures and skipping it for production code (production data has zero existing bricks; persistence is M8).                                                                                                                 | Optional. PLAN decides.                                                                                                       |

### Locked schema (post-M4f)

```ts
type BrickBase = {
  id: string;
  parentBlockId: string | null;
  name: string;
  categoryId: string | null;
  hasDuration: boolean; // M4e
  start?: string; // M4e
  end?: string; // M4e
  recurrence?: Recurrence; // M4e
};

export type Brick =
  | (BrickBase & { kind: "tick"; done: boolean })
  | (BrickBase & { kind: "units"; target: number; unit: string; done: number });

export type AppState = {
  blocks: Block[];
  categories: Category[];
  looseBricks: Brick[];
  // runningTimerBrickId: REMOVED
};

export type Action =
  | { type: "ADD_BLOCK"; block: Block }
  | { type: "ADD_CATEGORY"; category: Category }
  | { type: "ADD_BRICK"; brick: Brick }
  | { type: "LOG_TICK_BRICK"; brickId: string }
  | { type: "SET_UNITS_DONE"; brickId: string; done: number };
// START_TIMER, STOP_TIMER, TICK_TIMER, SET_TIMER_MINUTES, LOG_GOAL_BRICK: REMOVED
```

`Recurrence`, `Category`, `Block` are unchanged.

### Out of scope (M4f)

- Decimals in `target` or `done` — M7 polish (integers only in M4f).
- Editing a units brick's `target` or `unit` after creation — M5 Edit Mode.
- Re-introducing a ±1 stepper UX on the brick chip — locked out per user direction; manual-number entry is the only path.
- A "quick log" gesture on the chip (e.g., long-press to increment, swipe) — M7 if signal warrants.
- Persisting `done` across page reloads — M8.
- Auto-suggesting common units (a dropdown of "minutes / reps / pages / km / glasses") — M7 polish.
- A history view of past `done` values for the same brick — M9 (depends on persisted day-stamps).
- Resurrecting any timer behavior — **never** per user direction 2026-05-14.

### Edge cases

- **Units brick chip tap while UnitsEntrySheet for a different brick is open** → close the previous sheet, open the new one (single-sheet contract, matches M4d's AddChooserSheet pattern).
- **User clears the number input, taps Save** → invalid; inline error "Enter a number" + Save disabled. Sheet stays open.
- **User types a negative number (e.g., "-5")** → reject at input parse (numeric input + `min="0"` HTML attribute). Sheet's Save remains disabled until a non-negative integer is present.
- **User types a value greater than `target`** → valid (overachievement is fine). Reducer accepts. Chip renders `"120 / 100 reps"` with no special overflow styling in M4f.
- **User types a decimal (e.g., "20.5")** → input is `step="1"` and rejects decimals at the browser layer; if a decimal somehow survives (e.g., paste), reducer floors to `Math.floor(done)` defensively.
- **User taps a units chip while reading-only flow** (M5+) → out of scope; M4f assumes editable.
- **Existing M4c fixture data with `kind: "time"`** → typecheck-time error. Bulk migration handled in the same PR.
- **Existing M4b fixture data with `kind: "goal"` and `count: N`** → typecheck-time error. Bulk migration handled in the same PR.
- **M4e duration toggle ON for a units brick** → unchanged from M4e; duration axis remains orthogonal to kind. Overlap engine reads the same fields.
- **A units brick saved with `unit: ""`** → invalid construction; AddBrickSheet's Unit input is required. Reducer rejects defensively if it ever sees an empty unit string.
- **A units brick saved with `target: 0`** → invalid construction; AddBrickSheet's Target input is `min="1"`. Reducer rejects defensively if it ever sees `target <= 0`.
- **`lib/timer` import remains in any source file** → typecheck/lint error; the deleted file produces a build failure that surfaces the stale import.

### Acceptance criteria

**Schema collapse**

1. `lib/types.ts` `Brick` union has exactly two variants: `kind: "tick"` and `kind: "units"`. No `kind: "goal"` or `kind: "time"` remains.
2. The units variant shape is `{ kind: "units"; target: number; unit: string; done: number }`. Field `count` (M4b) is renamed to `done` everywhere.
3. `AppState.runningTimerBrickId` is removed from the type.
4. `Action` union no longer contains `START_TIMER`, `STOP_TIMER`, `TICK_TIMER`, `SET_TIMER_MINUTES`, or `LOG_GOAL_BRICK`.
5. `Action` union contains `{ type: "SET_UNITS_DONE"; brickId: string; done: number }`.
6. M4e's `BrickBase` fields (`hasDuration`, `start?`, `end?`, `recurrence?`) and presence invariant are unchanged.

**Reducer**

7. `SET_UNITS_DONE` finds the brick by `brickId` (searches `looseBricks` first, then every `block.bricks`) and sets `brick.done = Math.max(0, Math.floor(action.done))`.
8. `SET_UNITS_DONE` against a non-existent `brickId` returns state unchanged (defensive; no throw).
9. `SET_UNITS_DONE` against a `kind: "tick"` brick is rejected (returns state unchanged); the action is meant for units bricks only.
10. `ADD_BRICK` rejects any payload whose `kind` is not `"tick"` or `"units"` (returns state unchanged). Same M4e duration-invariant rules apply.
11. `LOG_TICK_BRICK` is unchanged from M4a.

**File deletions**

12. `lib/timer.ts` and `lib/timer.test.ts` are deleted.
13. `components/TimerSheet.tsx` and `components/TimerSheet.test.tsx` are deleted.
14. `lib/audio.ts`, `public/sounds/chime.mp3`, and the block-complete + day-complete chime calls (M4a, in `<TimelineBlock>` and `<BuildingClient>`) are **retained** — they are NOT part of the deletion set. Only the M4c timer's own chime invocation is removed, and it is removed by virtue of the timer code being deleted. (Spec correction 2026-05-14: an earlier draft of this AC said `public/chime.mp3` is deleted; the user decided to keep the block/day completion chimes. The file path `public/chime.mp3` never existed — the real asset is `public/sounds/chime.mp3`.)
15. Any `useTimer` hook file (`hooks/useTimer.ts` or equivalent) is deleted.
16. No source file in `lib/`, `components/`, or `app/` imports from any deleted timer path. `grep -rn "lib/timer\|TimerSheet\|useTimer" lib components app` returns zero hits post-migration. (`lib/audio` and `chime.mp3` references are expected to survive — they belong to the retained M4a celebration audio.)
17. `lib/blockValidation.ts:overlapsExistingBlock` (dead-code from M4e) — planner choice: delete in M4f or carry to M5. Recommendation: delete here while we're already pruning.

**AddBrickSheet**

18. Kind selector renders exactly two chips with labels "Tick" and "Units". The "Time" chip is gone.
19. Selecting "Units" reveals: Target input (`<Input type="number" min="1" step="1">`, required), Unit input (`<Input type="text">`, required, placeholder `"minutes / reps / pages"`).
20. Save with "Units" selected constructs a brick with `{ kind: "units", target, unit, done: 0 }` plus M4e duration fields if the duration toggle is ON.
21. Save is disabled when Target is empty / non-integer / < 1, OR Unit is empty, OR overlap exists (M4e contract preserved).
22. AddBrickSheet's overlap chip, `aria-describedby`, sr-only hint, and Save-disable behavior from M4e are all unchanged.

**BrickChip**

23. `<BrickChip>` renders only two variants. The time-variant rendering branch is deleted.
24. Units chip primary line: `"<done> / <target> <unit>"` (e.g., `"20 / 30 minutes"`). M4e's time-window badge (`HH:MM–HH:MM`) renders identically when `brick.hasDuration === true`.
25. Tapping a units chip opens `<UnitsEntrySheet>` for that brick. Tapping a tick chip continues to flip `done` per M4a (no sheet open).
26. No ±1 stepper buttons appear anywhere on the chip surface.

**UnitsEntrySheet (NEW)**

27. Sheet heading shows the brick's `name`. Sub-heading reads `"Today's <unit>"` (e.g., `"Today's minutes"`, `"Today's reps"`).
28. A single `<Input type="number" inputMode="numeric" min="0" step="1">` is pre-filled with the brick's current `done` value.
29. Tapping Save with a valid non-negative integer dispatches `SET_UNITS_DONE { brickId, done }` and closes the sheet.
30. Tapping Save with an empty value disables Save (greyed out); tapping the disabled button fires `medium` haptic and surfaces a hint `"Enter a number to save."` (mirroring M4e's `aria-describedby` + sr-only hint pattern).
31. Tapping Cancel closes the sheet without dispatching.
32. The sheet uses M0's `<Sheet>` primitive for layout and animation.
33. On mobile, the number input opens the numeric keypad (`inputMode="numeric"`).

**Migration**

34. All test fixtures and helpers that constructed `kind: "goal"` bricks are migrated to `kind: "units"` with `count` → `done`. No test asserts goal-kind behavior post-migration.
35. All test fixtures that constructed `kind: "time"` bricks are migrated to `kind: "units"` with `unit: "minutes"`, `target: <previous durationMin>`, `done: <previous minutesDone>`. No test asserts time-kind behavior post-migration.
36. `lib/timer.test.ts` and `TimerSheet.test.tsx` are deleted. Any vitest IDs they owned (M4c U-/C-/A-/E- IDs) are explicitly retired in tests.md with a one-line note pointing at M4f.
37. M4e tests that asserted the duration toggle against the time-kind variant are re-pointed to the units-kind. M4e IDs remain green post-migration.
38. `lib/dharma.ts` / `lib/scoring.ts` scoring math uses `brick.done / brick.target` for units bricks. Existing M4b scoring assertions hold post-rename. Existing M4c scoring assertions for time bricks are migrated to assert the same ratio against the new field names.

**Quality**

39. `tsc --noEmit`: zero errors. Any stale references to `kind: "time"`, `kind: "goal"`, `runningTimerBrickId`, or the 5 deleted actions are caught at compile time.
40. ESLint: zero errors. Stale imports surface as `no-unused-imports` errors; resolve by removing the import.
41. Vitest: full suite passes. Headcount drops by ~10–25 (M4c timer + stepper tests retired) and grows back via UnitsEntrySheet + reducer tests for `SET_UNITS_DONE`. Net change documented in tests.md.
42. Playwright (deferred-to-preview, M4a/b/c/d/e pattern):
    - E-m4f-01 — Add a units brick with `unit: "minutes"`, `target: 30`. Tap the chip → UnitsEntrySheet opens. Type "20", Save → chip renders "20 / 30 minutes".
    - E-m4f-02 — Tap a tick chip → no sheet opens; `done` flips (M4a regression).
    - E-m4f-03 — AddBrickSheet shows exactly two kind chips (Tick / Units). No "Time" chip visible.
    - E-m4f-04 — A units brick with `unit: "reps"`, `target: 100` accepts a typed value of 50 the same way `unit: "minutes"` does (free-text unit parity).
    - E-m4f-05 — No live timer is observable anywhere in the app — no auto-incrementing minutesDone, no `<TimerSheet>` long-press behavior. (The block-complete and day-complete chimes are unaffected and still play — they are not timer behavior.)
43. A11y:
    - A-m4f-01 — `<UnitsEntrySheet>` has `role="dialog"` with `aria-labelledby` pointing at the heading.
    - A-m4f-02 — Number input has an accessible name (label or `aria-label`) of the form `"Enter <unit> done today"`.
    - A-m4f-03 — Save button has `aria-describedby` + sr-only hint when disabled (matches M4e pattern).
    - A-m4f-04 — axe-core zero violations on UnitsEntrySheet open with a valid value, an empty value, and a value greater than target.

### Open spec gaps (resolve at VERIFY)

- **SG-m4f-01 — Field rename `count` → `done` for units variant.** Recommendation: rename in the same PR. Trade-off: keeping `count` saves a mechanical sweep but leaves the tick (`done: boolean`) and units (`count: number`) field names inconsistent for the same concept. Lean rename.
- **SG-m4f-02 — Delete `<BrickStepper>` or leave it dormant?** Recommendation: delete. Trade-off: keeping it costs ~30 LOC and could speed M7 polish if a quick-increment gesture lands. Lean delete because the user explicitly rejected the stepper UX; reintroducing later is cheap.
- **SG-m4f-03 — Delete `lib/blockValidation.ts:overlapsExistingBlock` (M4e dead code) in M4f or M5?** Recommendation: delete in M4f while we're already pruning. Trade-off: U-m2-004/005 lose their regression coverage; their assertions could be re-pointed at `lib/overlap.ts:intervalsOverlap` (same behavior, half-open math). Lean delete + re-point tests.
- **SG-m4f-04 — UnitsEntrySheet trigger: tap vs long-press?** Recommendation: tap. Trade-off: tap conflicts with no other gesture (the M4b stepper is gone, the M4c long-press is gone), so the chip becomes a single-tap surface. Long-press would create a hidden affordance. Lean tap.
- **SG-m4f-05 — Replace M4c's `chime.mp3` (sound on timer complete) with anything for units bricks?** Recommendation: no. Trade-off: a celebratory sound when `done >= target` could land in M7. Lean no in M4f; M7 polish.
- **SG-m4f-06 — Decimal numbers in `target` or `done`?** Recommendation: integer only. Trade-off: "1.5 km" or "2.5 cups" is a real use case but adds parse/clamp complexity. Lean integer; revisit in M7 with usage signal.
- **SG-m4f-07 — How to migrate M4c's auto-running-timer state if it somehow survives session refresh?** Recommendation: nothing — there's no persistence yet (M8 owns that), so no in-flight timer state exists at session boundary. The grep confirms zero call sites; the rip is clean. Lean: no migration code required.
- **SG-m4f-08 — Keep ADR-042's "tick / goal / time" phrasing or rewrite to "tick / units"?** Recommendation: rewrite the references inline (small in-place edit, no superseding ADR needed; ADR-042's decision is unchanged — only the score-type cardinality referenced in its prose changes). Trade-off: superseding is "more correct" historically. Lean inline rewrite + note in ADR-043 that ADR-042's wording was harmonized.
