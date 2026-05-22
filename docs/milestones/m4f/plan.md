## Milestone 4f — Collapse to two brick kinds; rip the timer — Plan

One-line summary (per ADR-043, supersedes ADR-035 + M4c timer infrastructure): collapse `Brick` to `kind: "tick" | "units"`, rename `count → done`, drop `runningTimerBrickId` and four timer actions plus `LOG_GOAL_BRICK` from the `Action` union, add `SET_UNITS_DONE`, delete `lib/timer.ts` / `<TimerSheet>` / `useTimer` / `<BrickStepper>` / dead-code `overlapsExistingBlock` (audio is RETAINED — block/day completion chimes stay), and add one new component `<UnitsEntrySheet>` that opens on a single tap of any units `<BrickChip>`. No persistence migration needed; M4e schema additions (`hasDuration`, `start`, `end`, `recurrence`) on `BrickBase` are preserved untouched.

### Pillars consumed

Spec § 0.5 (interaction primitives — collapse to tick + units), § 0.9 (data model — `Brick` union shrinks; AppState loses `runningTimerBrickId`; Action loses 5 variants, gains 1), § 0.14 (no factory anything — manual entry replaces auto-counting), **ADR-043** (primary frame; supersedes the score-type cardinality of ADR-035 and the timer infrastructure of M4c), ADR-042 (universal duration axis — kept; only the "tick / goal / time" prose is harmonized to "tick / units" via an in-place rewrite), ADR-035 (three score types — explicitly superseded by ADR-043), ADR-034 (already softened by ADR-042; brick clause now reads "two kinds, optionally timed via toggle"), ADR-006 (half-open intervals — referenced by surviving M4e overlap math), ADR-019 (`Recurrence` union — unchanged), ADR-031 (44 px tap target — applied to the new sheet's Save / Cancel / number input), ADR-024 (3-retry eval cap — unchanged), ADR-027 (commit prefix convention — `docs(plan-m4f)` for this entry; `test(m4f)` + `feat(m4f)` for BUILDER), ADR-041 (single human gate; VERIFIER replaces Gate #1), ADR-039 (no factory data — units bricks start at `done: 0`).

### Intent

After M4c shipped a live timer and M4e shipped the universal-duration axis, the user clarified the mental model on 2026-05-14: **two brick kinds only**. A tick brick is a boolean ("did you?"). A units brick has a `target`, a free-text `unit`, and a `done` number the user **types** ("how much, of what?"). The app does not count for the user. Anything previously expressed as a "time" brick — "30 minutes meditation, did 20" — is now a units brick with `unit: "minutes"`, `target: 30`, `done: 20`. Time-of-day windows remain orthogonal via M4e's `hasDuration` toggle. The pillar shift: **schedule and performance are independent axes; the user types the number, never the timer**. ADR-043 locks this; M4f is the implementation milestone.

### File structure

```
DELETE  lib/timer.ts
DELETE  lib/timer.test.ts
DELETE  components/TimerSheet.tsx
DELETE  components/TimerSheet.test.tsx
DELETE  components/BrickStepper.tsx                     (SG-m4f-02: delete; ±1 stepper UX retired)
DELETE  components/Brick.tsx                            (already [obsolete]; references soon-deleted shape — would break tsc)
DELETE  components/ui/BrickChip.tsx                     (legacy M0 BrickChip; uses pre-M3 Category strings + kind: "time"|"goal" — dead, would break tsc)
DELETE  components/ui/BrickChip.test.tsx                (same)
DELETE  components/BrickStepper.test.tsx                (if present — verify; deletion paired with BrickStepper.tsx)
KEEP    lib/audio.ts                                    (RETAINED — block/day completion chimes stay; user decision 2026-05-14)
KEEP    lib/audio.test.ts                               (RETAINED — paired with lib/audio.ts)
KEEP    public/sounds/chime.mp3                         (RETAINED — placeholder asset; real-asset swap remains an M7 open loop)
DELETE  lib/scoring.ts                                  (NOT — keep; re-export shim still valid; just confirms it compiles)  ← stays
EDIT    lib/types.ts                                    (Brick union collapse; AppState drop runningTimerBrickId; Action union shrink+add)
EDIT    lib/data.ts                                     (drop 5 arms, add SET_UNITS_DONE, defaultState loses runningTimerBrickId, ADD_BRICK invariant + defensive kind reject)
EDIT    lib/dharma.ts                                   (brickPct + brickLabel: drop time arm; rename goal arm to units; field reads count→done)
EDIT    lib/blockValidation.ts                          (delete overlapsExistingBlock + isWithin1Min helpers; keep isValidStart/isValidEnd/isEndAfterStart — verify the safe surface)
EDIT    lib/overlap.ts                                  (remove comment reference to "matches blockValidation.overlapsExistingBlock"; behavior unchanged)
EDIT    components/AddBrickSheet.tsx                    (kind selector 3 chips → 2; rip "time" branch; rename "goal" branch to "units"; keep M4e duration toggle)
EDIT    components/BrickChip.tsx                        (delete TimerChip; delete GoalStepperChip; units variant renders "<done> / <target> <unit>"; chip-tap fires onUnitsOpenSheet for units)
EDIT    components/TimelineBlock.tsx                    (drop runningTimerBrickId prop + threading; drop onTimerToggle/onTimerOpenSheet props; keep onUnitsOpenSheet pass-through)
EDIT    components/LooseBricksTray.tsx                  (drop runningTimerBrickId prop + threading; drop onTimerToggle/onTimerOpenSheet props; keep onUnitsOpenSheet pass-through)
EDIT    components/Timeline.tsx                         (drop runningTimerBrickId pass-through)
EDIT    components/TimedLooseBrickCard.tsx              (drop running/onTimerToggle/onTimerOpenSheet props if present; verify; thread onUnitsOpenSheet through)
EDIT    components/AddBlockSheet.tsx                    (drop runningTimerBrickId import/usage if any; remove unused imports surfaced by lint)
EDIT    app/(building)/BuildingClient.tsx               (drop useTimer wiring, drop timer-sheet state, drop START/STOP/SET_TIMER_MINUTES dispatches, drop LOG_GOAL_BRICK dispatch, drop TimerSheet mount; add UnitsEntrySheet mount with activeUnitsBrickId state)
CREATE  components/UnitsEntrySheet.tsx                  (new; sheet primitive composition; § Component design)
CREATE  components/UnitsEntrySheet.test.tsx             (BUILDER writes per TDD; declared here for inventory completeness)
MIGRATE lib/data.test.ts                                (heaviest; 13 goal literals + multiple time literals + 5 timer-action arm tests retire/migrate)
MIGRATE lib/dharma.test.ts                              (3 goal literals + time literals; pct math assertions re-pointed at done/target)
MIGRATE lib/overlap.test.ts                             (2 goal literals + time literals; mixed-kind fixtures rewrite to units)
MIGRATE lib/scoring.test.ts                             (1 goal literal; re-export shim test)
MIGRATE lib/blockValidation.test.ts                     (re-point U-m2-004/005 to lib/overlap.ts:intervalsOverlap per SG-m4f-03)
MIGRATE components/AddBrickSheet.test.tsx               (kind-selector chip count 3→2; rip "Time" chip tests; rename "Goal" tests to "Units"; durationMin input tests retire)
MIGRATE components/AddBlockSheet.test.tsx               (1 goal literal in fixture; mechanical)
MIGRATE components/BrickChip.test.tsx                   (4 goal literals + time literals; rip TimerChip-specific tests; rip stepper button tests; add chip-tap-opens-sheet tests at M4f IDs)
MIGRATE components/LooseBricksTray.test.tsx            (1 goal literal + time literal in fixtures; drop runningTimerBrickId prop expectations)
MIGRATE components/TimelineBlock.test.tsx              (1 goal literal + time literal in fixtures; drop runningTimerBrickId prop expectations)
MIGRATE components/TimedLooseBrickCard.test.tsx        (1 goal literal in fixtures)
MIGRATE app/(building)/BuildingClient.m4b.test.tsx     (LOG_GOAL_BRICK assertions — full retire; M4b regression scope absorbs into M4f units tests)
RETIRE  app/(building)/BuildingClient.m4c.test.tsx     (full file deletion; M4c timer behavior no longer exists)
EDIT    app/(building)/BuildingClient.imports.test.ts  (drop "does not import BrickStepper" assertion or invert to "BrickStepper file no longer exists"; planner choice — see § Test fixture migration)
EDIT    docs/decisions.md                              (in-place harmonize ADR-042 prose: "tick / goal / time" → "tick / units"; SG-m4f-08)
EDIT    docs/status.md                                 (M4f Shipped row + open-loop resolutions; SHIPPER writes per ADR-041)
```

### Pre-flight inventory (grep-confirmed)

`grep -rn "kind: \"time\"\|kind: 'time'\|kind: \"goal\"\|kind: 'goal'\|runningTimerBrickId\|START_TIMER\|STOP_TIMER\|TICK_TIMER\|SET_TIMER_MINUTES\|LOG_GOAL_BRICK\|useTimer\|TimerSheet\|durationMin\|minutesDone\|BrickStepper\|overlapsExistingBlock" lib components app hooks` returns **504 hits across 35 unique files**. Per-token breakdown:

| Token                                                             | Files | Action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kind: "time"` / `'time'`                                         | 15    | DELETE the literal entirely (production) or MIGRATE to `kind: "units"` with `unit: "minutes"` (fixtures). 34 literal occurrences.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `kind: "goal"` / `'goal'`                                         | 16    | RENAME to `kind: "units"`. 36 literal occurrences. `count` → `done`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `runningTimerBrickId`                                             | 18    | DELETE (production fields + test prop expectations).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `START_TIMER` / `STOP_TIMER` / `TICK_TIMER` / `SET_TIMER_MINUTES` | 7     | DELETE (reducer arms + dispatch sites + test assertions).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `LOG_GOAL_BRICK`                                                  | 5     | DELETE (reducer arm + 2 dispatch sites + tests).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `useTimer`                                                        | 4     | DELETE (the hook and its 2 call sites + 1 test).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `TimerSheet`                                                      | 5     | DELETE (component, test, import in `BuildingClient`, import in `BrickChip`, references in `BuildingClient.m4c.test`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `durationMin` / `minutesDone`                                     | 22    | DELETE (production reads in dharma/data/timer/components) or MIGRATE (fixtures convert to `target` / `done`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `BrickStepper`                                                    | 3     | DELETE the component + its sole consumer (`components/Brick.tsx`, already obsolete) + the imports-test assertion.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `overlapsExistingBlock`                                           | 3     | DELETE the function in `lib/blockValidation.ts`; re-point its 2 test IDs (U-m2-004, U-m2-005) to `lib/overlap.ts:intervalsOverlap` per SG-m4f-03.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `chime` (broader sweep)                                           | 8     | RETAIN all audio. `lib/audio.ts`, `lib/audio.test.ts`, `public/sounds/chime.mp3`, and every `playChime()` call site (M4a block-complete in `TimelineBlock.tsx`, M4a day-complete in `BuildingClient.tsx`, any call in `Fireworks.tsx` / `lib/celebrations.ts`) all STAY. The only audio that goes is the M4c timer's own `playChime()` invocation, which is removed for free by virtue of `lib/timer.ts` being deleted — there is no separate audio-cleanup work. See § Audio cleanup below. (Factual note: the spec's original `public/chime.mp3` path never existed — the real asset is `public/sounds/chime.mp3`.) |

Inventory annotation key by file (DELETE = remove the file outright; STRIP = file stays but token references are removed; MIGRATE = test-fixture rewrite; RETIRE = test file deleted because its subject is gone):

- `lib/types.ts` — STRIP. The single source of truth for the schema collapse.
- `lib/data.ts` — STRIP. Loses 5 reducer arms; gains `SET_UNITS_DONE`.
- `lib/timer.ts` — DELETE.
- `lib/timer.test.ts` — DELETE.
- `components/TimerSheet.tsx` — DELETE.
- `components/TimerSheet.test.tsx` — DELETE.
- `components/BrickStepper.tsx` — DELETE (per SG-m4f-02).
- `components/Brick.tsx` — DELETE (already `[obsolete]` per its own header; references `BrickStepper` and `kind: "time" | "goal"` shapes; would break tsc otherwise; not imported anywhere in the live render path — confirmed via grep).
- `components/ui/BrickChip.tsx` — DELETE (M0-era legacy; uses pre-M3 `Category` string literals and `kind: "time"|"goal"` discriminators; not imported anywhere; would break tsc).
- `components/ui/BrickChip.test.tsx` — DELETE (paired with the above).
- `lib/audio.ts` + `lib/audio.test.ts` + `public/sounds/chime.mp3` — RETAINED. NOT in the deletion set. The M4a block-complete and day-complete chimes keep playing (user decision 2026-05-14). M4f touches audio only insofar as the deleted `lib/timer.ts` no longer calls `playChime()`. See § Audio cleanup.
- `lib/blockValidation.ts` — STRIP. Deletes `overlapsExistingBlock`; keeps `isValidStart` / `isValidEnd` / `isEndAfterStart` / `isValidBrickGoal` / `isValidBrickTime` — though the last two (`isValidBrickGoal` / `isValidBrickTime`) need renaming: `isValidBrickGoal` → `isValidBrickUnitsTarget` (validates the target ≥ 1 integer rule); `isValidBrickTime` → DELETE (time bricks are gone; the function validated `durationMin ≥ 1`, which is now the same constraint as `isValidBrickUnitsTarget`). AddBrickSheet's `timeValid` derivation goes away with it.
- `lib/blockValidation.test.ts` — MIGRATE. U-m2-004 + U-m2-005 re-point to `lib/overlap.ts:intervalsOverlap` (same half-open math per ADR-006) — the assertion bodies stay nearly identical, only the imported symbol changes.
- `lib/overlap.ts` — STRIP. Single line: remove the comment "matches blockValidation.overlapsExistingBlock" (line 69). Behavior unchanged.
- `lib/overlap.test.ts` — MIGRATE. Fixture migrations only; behavior assertions hold.
- `lib/dharma.ts` — STRIP. `brickPct`: collapse to 2 arms (`tick` returns 0/100; `units` returns `Math.min(b.done / b.target, 1) * 100` with zero-target guard). `brickLabel` at line 131: collapse to 2 arms; drop the time arm; the units arm renders `${b.done}/${b.target}${b.unit ? " " + b.unit : ""}` (no special "min" suffix — unit is in the data).
- `lib/dharma.test.ts` — MIGRATE. 3 goal literals + multiple time literals; assertions on `brickPct` for time-kind become assertions on units-kind with `unit: "minutes"`.
- `lib/scoring.ts` — KEEP (7-line re-export shim is collapse-safe; just compiles).
- `lib/scoring.test.ts` — MIGRATE. 1 goal literal in fixture; mechanical.
- `components/AddBrickSheet.tsx` — STRIP. § Component edits — AddBrickSheet below.
- `components/AddBrickSheet.test.tsx` — MIGRATE. Kind-selector chip tests reduce 3→2; the "Time" branch and `durationMin` input tests retire; the "Goal" tests rename to "Units" and keep their assertions on target/unit inputs.
- `components/BrickChip.tsx` — STRIP. § Component edits — BrickChip below.
- `components/BrickChip.test.tsx` — MIGRATE. Drop `TimerChip` / `GoalStepperChip` test groups; add a tests group for "units chip tap fires onUnitsOpenSheet".
- `components/Brick.test.tsx` — DELETE (file's subject is being deleted).
- `components/TimedLooseBrickCard.tsx` + `.test.tsx` — STRIP / MIGRATE. Drop the `running` / `onTimerToggle` / `onTimerOpenSheet` props the M4e component currently forwards. Add `onUnitsOpenSheet` pass-through.
- `components/LooseBricksTray.tsx` + `.test.tsx` — STRIP / MIGRATE. Same prop trims as above.
- `components/TimelineBlock.tsx` + `.test.tsx` — STRIP / MIGRATE. Same prop trims as above.
- `components/Timeline.tsx` — STRIP. Drop the `runningTimerBrickId` pass-through line (currently threaded but not actually used in the render itself — verify with grep).
- `components/AddBlockSheet.tsx` + `.test.tsx` — STRIP / MIGRATE. Goal/time literals in fixtures only; the AddBlockSheet itself is kind-agnostic post-M4e (overlap engine reads `hasDuration`, not `kind`).
- `app/(building)/BuildingClient.tsx` — STRIP. § Component edits — BuildingClient below.
- `app/(building)/BuildingClient.m4b.test.tsx` — MIGRATE. M4b LOG_GOAL_BRICK assertions become SET_UNITS_DONE assertions; the M4b stepper-DOM assertions retire (chip is no longer a stepper).
- `app/(building)/BuildingClient.m4c.test.tsx` — DELETE (file's entire subject — M4c timer integration — is gone).
- `app/(building)/BuildingClient.m4e.test.tsx` — MIGRATE. Tests that exercised `hasDuration: true` against `kind: "time"` re-point to `kind: "units"` with `unit: "minutes"`; M4e IDs remain green per AC #37.
- `app/(building)/BuildingClient.imports.test.ts` — EDIT. The "does not import BrickStepper" assertion (line 33) still holds (file is being deleted — neither importable nor needed); rather than invert it, keep the assertion as a regression check that the dead-file deletion holds. The "does not import Brick component" assertion (line 29) likewise stays valid.

Total surface: **18 production files edited, 5 files outright deleted, 13 test files migrated, 2 test files deleted outright, 1 new component file, 1 new test file** (the latter written by BUILDER in TDD). Audio files (`lib/audio.ts`, `lib/audio.test.ts`, `public/sounds/chime.mp3`) are NOT in the deletion set — they are retained (user decision 2026-05-14). Plus `docs/decisions.md` (ADR-042 prose harmonization) and `docs/status.md` (SHIPPER updates).

### Locked schema (post-M4f, reproduced verbatim from spec lines 1622–1651)

```ts
type BrickBase = {
  id: string;
  parentBlockId: string | null;
  name: string;
  categoryId: string | null;
  hasDuration: boolean; // M4e — unchanged
  start?: string; // M4e — unchanged
  end?: string; // M4e — unchanged
  recurrence?: Recurrence; // M4e — unchanged
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

`Recurrence`, `Category`, `Block` are unchanged. `BrickBase.hasDuration` and the presence invariant for `start`/`end`/`recurrence` (M4e) are unchanged. `assertNever` from `lib/types.ts:72` continues to enforce reducer exhaustiveness — the collapse leaves the union with 5 action variants and 2 brick kinds.

### Component design — `<UnitsEntrySheet>` (NEW)

**Path.** `components/UnitsEntrySheet.tsx` (+ `.test.tsx` written by BUILDER per AC #41 net-add accounting).

**Composition.** Composes M0's `<Sheet>` (modal layout + animation + focus trap), M0's `<Input type="number">` (single field), and M0's `<Button>` (Save + Cancel). No new primitives.

**Props.**

```ts
interface Props {
  brick: Extract<Brick, { kind: "units" }> | null; // null = closed
  open: boolean;
  onClose: () => void;
  onSave: (brickId: string, done: number) => void; // parent dispatches SET_UNITS_DONE
}
```

`brick` is passed as the full object (not just id) so the sheet can render the name and `unit` for its heading/subhead without re-reading state. `open` is derived in the parent from `activeUnitsBrickId !== null`; the sheet calls `onClose` for both Cancel and successful Save (parent resets the id, sheet unmounts).

**Local state.** Single piece of local state: `const [draft, setDraft] = useState<string>("")`. Pre-fill on open via `useEffect(() => { if (open && brick) setDraft(String(brick.done)); }, [open, brick?.id])` — keyed on `brick?.id` so reopening for a different units brick re-seeds the input. The `string` type matters: lets the user clear the field without coercion to `0`, and matches HTML `<input>` native semantics.

**Validation rules.**

1. **Empty** → Save disabled.
2. **Not a non-negative integer** (regex `^\d+$` or `Number.isFinite(parseInt) && parseInt >= 0 && Number.isInteger(parseFloat)`) → Save disabled. Plan-locked: prefer the regex `^\d+$` test against `draft.trim()` because it's both faster and unambiguous about decimals/negatives/whitespace.
3. **Otherwise** → Save enabled. On click, parse via `parseInt(draft, 10)` and call `onSave(brick.id, parsed)`. Reducer defensively re-applies `Math.max(0, Math.floor(...))` per AC #7.

The HTML attributes `inputMode="numeric"`, `min="0"`, `step="1"`, `pattern="\d*"` carry the validation hint to the browser (numeric keypad on mobile per AC #33; rejects decimal-point key on browsers that honor `step="1"`). The JS validation is the truth — HTML attrs are UX hints.

**Accessibility wiring.**

- Sheet root: `role="dialog"`, `aria-labelledby="units-entry-heading"`, `aria-modal="true"` (inherited from M0 `<Sheet>`).
- Heading: `<h2 id="units-entry-heading">{brick.name}</h2>` — satisfies A-m4f-01.
- Subhead: `<p>Today's {brick.unit}</p>` (e.g., "Today's minutes", "Today's reps") — satisfies AC #27.
- Number input: `aria-label={`Enter ${brick.unit} done today`}` — satisfies A-m4f-02.
- Save button: `aria-disabled={!isValid}` + `aria-describedby="units-save-hint"` + an `<span id="units-save-hint" className="sr-only">Enter a number to save.</span>` rendered only when invalid — mirrors M4e AddBrickSheet's overlap-warning pattern; satisfies A-m4f-03 + AC #30.
- Cancel button: standard text label "Cancel", no `aria-describedby`.
- Tap targets all min 44 × 44 px per ADR-031 (Save + Cancel buttons; number input).

**Tailwind / token wiring.** Number input class stack mirrors `<AddBrickSheet>`'s target input — `font-mono text-[--fs-14] text-[--ink] bg-[--surface-1] border border-[--ink-dim]/30 rounded-md px-3 py-2 min-h-[44px]`. Heading uses `font-serif text-[--fs-20] text-[--ink]`; subhead uses `font-ui text-[--fs-12] text-[--ink-dim]`. Save uses `<Button variant="primary">`; Cancel uses `<Button variant="ghost">`.

**Motion.** Inherits M0's `<Sheet>` slide-up motion (200 ms, ease-out). Under `prefers-reduced-motion`, M0 `<Sheet>` already swaps to a no-motion mount (verified in M0 plan § Motion).

**Haptics.**

- Save tap with a valid value → `haptics.light()` immediately before `onSave` call (matches M4e AddBrickSheet Save haptic).
- Save tap while `aria-disabled` → `haptics.medium()` + render the hint via `aria-describedby` (matches M4e disabled-Save pattern; AC #30).
- Cancel tap → no haptic (matches M0 dismiss convention).
- Input change → no haptic (typing into a field is silent across the codebase).

**Auto-focus.** On open, the number input receives focus + selects its current value (the pre-filled `done`) so the user can overwrite by typing. Implementation: `useEffect(() => { if (open) inputRef.current?.focus(); inputRef.current?.select(); }, [open])`. This explicitly closes the `<TimerSheet>` open loop noted in `docs/status.md` ("does NOT auto-focus the minutes input on open") — the replacement DOES auto-focus.

**Closing behavior.** Cancel → call `onClose` only (no save). Save (valid) → call `onSave` then `onClose`. Save (invalid) → no-op except the haptic + sr-only hint. The single-sheet contract from M4d (only one sheet at a time): the parent (BuildingClient) tracks `activeUnitsBrickId: string | null`; tapping a different units chip while open swaps the brick via the id change (the `useEffect` keyed on `brick?.id` re-seeds the draft).

### Component edits — `<BrickChip>` (collapse)

**Delete.**

- The entire `TimerChip` sub-component (lines 149–264 of current file) — gone.
- The entire `GoalStepperChip` sub-component (lines 266–472 of current file) — gone.
- The `if (brick.kind === "time")` branch in the main `BrickChip` function — gone.
- The `if (brick.kind === "goal")` branch — gone (its tap-handler is replaced by the units variant below).
- All goal/time-specific props: `onGoalLog`, `running`, `onTimerToggle`, `onTimerOpenSheet` — gone.

**Add / edit.**

- New prop `onUnitsOpenSheet?: (brickId: string) => void`.
- New sub-component `UnitsChip` (or inline branch) that renders the chip-tap-opens-sheet surface. It is a single `<button>` (not a button group like the M4b stepper) covering the entire chip surface; `min-height: 44px`; `onClick` fires `haptics.light()` then `onUnitsOpenSheet?.(brick.id)`.
- The chip's primary line renders `<TypeBadge>` (units form): `{brick.done} / {brick.target} {brick.unit}` (e.g., `"20 / 30 minutes"`, `"50 / 100 reps"`). The trailing `m` suffix that the time variant used disappears — the unit is now in the data and renders directly.
- `TimeWindowBadge` (M4e) renders identically when `brick.hasDuration === true` — for both tick and units variants. No changes there.
- `buildAriaLabel`:
  - tick arm: unchanged from M4a.
  - units arm: `${brick.name}, units, ${pct}% complete, ${brick.done} of ${brick.target} ${brick.unit}, tap to log progress`. The "tap to log progress" suffix replaces M4b's silence (the chip is now actionable, not a label).
  - M4e duration suffix `", scheduled HH:MM to HH:MM"` appends to either arm when `hasDuration === true` (preserved from M4e).
- `aria-pressed` is **removed** from the units chip (it isn't a toggle anymore; it's a sheet trigger). Retained on tick chips (still a toggle). This is a regression-safe change because M4b's goal chips did not have `aria-pressed`.
- All scale-press, long-press, and clamp-haptic logic from M4b/M4c retire with the deleted sub-components.

**Tick variant unchanged.** Lines 540–613 of current file (the tick branch of the main `BrickChip` function) are byte-identical post-M4f. AC #25 (tap a tick chip → flip `done` via M4a) is a regression test.

### Component edits — `<AddBrickSheet>` (collapse kind selector)

**Kind selector (3 → 2 chips).**

- Current (M4c): array literal `const KIND_CHIPS = ["tick", "goal", "time"] as const` at line ~360 of `AddBrickSheet.tsx`.
- Post-M4f: `const KIND_CHIPS = ["tick", "units"] as const`. Labels: "Tick", "Units". A11y: `role="radiogroup"` + `aria-checked` semantics preserved.
- The `BrickKind` type alias either becomes a literal union of the two strings or just `(typeof KIND_CHIPS)[number]` — planner pref: keep the inline type alias for readability.

**Reveal-on-units (renamed from reveal-on-goal).**

- The conditional `{kind === "goal" && ( … target + unit inputs … )}` at line ~392 renames to `{kind === "units" && ( … )}`. The target input keeps `<Input type="number" min="1" step="1" required>`. The unit input keeps `<Input type="text" required placeholder="minutes / reps / pages">`. The validation helper `isValidBrickGoal` renames to `isValidBrickUnitsTarget` (or `isValidUnitsTarget`) and asserts `target >= 1 && Number.isInteger(target)`. Same logic; symmetric name.

**Delete the time branch.**

- The conditional `{kind === "time" && ( … durationMin input … )}` at line ~475 — gone, entirely.
- The `durationMin` parse on line 217 — gone.
- The `timeValid` derivation on line 219 — gone.
- The `isValidBrickTime` import (and the function in `lib/blockValidation.ts`) — gone.

**Save construction.**

- The `else if (kind === "goal") { … kind: "goal", count: 0 … }` branch at line 252 becomes `else if (kind === "units") { … kind: "units", target, unit, done: 0 … }`. M4e duration fields continue to spread in conditionally.
- The `else { kind: "time", durationMin, minutesDone: 0 … }` branch at line 268 — gone.

**Overlap chip + Save-disable.** Unchanged from M4e (AC #22). The duration toggle row is below the kind selector and is untouched. AC #21 holds.

### Component edits — `<BuildingClient>`

**Delete.**

- Lines 23 + 34: `import { useTimer, findTimeBrickById } from "@/lib/timer";` and `import { TimerSheet } from "@/components/TimerSheet";` — gone.
- Lines 67–69 + 100: the `TimerSheetState` interface + `timerSheetState` useState — gone.
- Line 129: `useTimer(state, dispatch);` — gone.
- Lines 131–141 (`handleTimerToggle`): gone.
- Lines 144–148 (`handleTimerOpenSheet`): gone.
- Lines 149–168 (`handleTimerSheetSave` / `handleTimerSheetCancel`): gone.
- Lines 178–183 (`handleGoalLog` dispatching `LOG_GOAL_BRICK`): gone (replaced by units-sheet open below).
- Lines 308–325: timer-related JSX props (`onTimerToggle`, `onTimerOpenSheet`, `runningTimerBrickId={state.runningTimerBrickId}`) threaded to `<Timeline>` and `<LooseBricksTray>` — gone.
- Lines 357–366: the `<TimerSheet open={…}>` mount — gone.

**Add.**

- New state: `const [activeUnitsBrickId, setActiveUnitsBrickId] = useState<string | null>(null);`.
- New derivation: `const activeUnitsBrick = useMemo(() => activeUnitsBrickId === null ? null : findUnitsBrickById(state, activeUnitsBrickId), [state, activeUnitsBrickId]);` where `findUnitsBrickById` is a new helper in `lib/data.ts` (mirrors M4c's `findTimeBrickById` — verified-by-typecheck single-Extract pattern).
- New handler: `const handleUnitsOpenSheet = useCallback((brickId: string) => setActiveUnitsBrickId(brickId), []);`.
- New handler: `const handleUnitsSheetSave = useCallback((brickId: string, done: number) => { dispatch({ type: "SET_UNITS_DONE", brickId, done }); setActiveUnitsBrickId(null); }, [dispatch]);`.
- New handler: `const handleUnitsSheetClose = useCallback(() => setActiveUnitsBrickId(null), []);`.
- Thread `onUnitsOpenSheet={handleUnitsOpenSheet}` through `<Timeline>` (then `<TimelineBlock>` → `<BrickChip>`) and `<LooseBricksTray>` (then `<BrickChip>` / `<TimedLooseBrickCard>` → `<BrickChip>`).
- Mount the new sheet at the bottom (replaces the deleted `<TimerSheet>` mount):
  ```tsx
  <UnitsEntrySheet
    brick={activeUnitsBrick}
    open={activeUnitsBrickId !== null}
    onClose={handleUnitsSheetClose}
    onSave={handleUnitsSheetSave}
  />
  ```

**Day-100% cross-up.** The `useCrossUpEffect` for day-100% (line 118 fires haptic + chime + fireworks) is **unchanged** — it KEEPS its `playChime()` call (user decision 2026-05-14: block/day completion chimes stay). Haptic + chime + fireworks all remain. The cross-up math is unchanged.

### Reducer edits — `lib/data.ts`

**Delete arms.** `LOG_GOAL_BRICK` (lines 100–134), `START_TIMER` (135–141), `STOP_TIMER` (142–146), `TICK_TIMER` (147–179), `SET_TIMER_MINUTES` (180–213). Total 114 lines removed.

**Add arm.** `SET_UNITS_DONE`:

```ts
case "SET_UNITS_DONE": {
  const clamped = Math.max(0, Math.floor(action.done));
  const apply = (b: Brick): Brick => {
    if (b.id !== action.brickId) return b;
    if (b.kind !== "units") return b;   // AC #9: no-op on tick brick
    if (b.done === clamped) return b;    // identity short-circuit
    return { ...b, done: clamped };
  };
  // Same array-identity preservation pattern as the old LOG_GOAL_BRICK arm.
  let blocksChanged = false;
  const newBlocks = state.blocks.map((bl) => {
    let blockChanged = false;
    const bricks = bl.bricks.map((br) => {
      const out = apply(br);
      if (out !== br) blockChanged = true;
      return out;
    });
    if (!blockChanged) return bl;
    blocksChanged = true;
    return { ...bl, bricks };
  });
  let looseChanged = false;
  const newLoose = state.looseBricks.map((br) => {
    const out = apply(br);
    if (out !== br) looseChanged = true;
    return out;
  });
  if (!blocksChanged && !looseChanged) return state;   // AC #8: missing id ⇒ unchanged
  return {
    ...state,
    blocks: blocksChanged ? newBlocks : state.blocks,
    looseBricks: looseChanged ? newLoose : state.looseBricks,
  };
}
```

This is structurally identical to the deleted `LOG_GOAL_BRICK` arm — same loose-then-nested search, same identity short-circuit, same array-identity preservation. The behavioral difference is absolute-value semantics (`done = clamped`) instead of delta (`count + delta`).

**Defensive `ADD_BRICK` invariant.** Currently (line 54) the arm switches on `action.brick`'s shape only. Post-M4f: TypeScript prevents constructing `kind: "time"` or `kind: "goal"` at compile time, but per AC #10 we add a runtime guard so that test fixtures or migration leftovers do not silently land in state:

```ts
const k = b.kind as string;
if (k !== "tick" && k !== "units") return state;
```

Casts to `string` to suppress the exhaustive-check warning (the runtime check is defense-in-depth against bad fixtures, not against legitimate TS code paths). M4e duration invariant rules (lines 56–69) stay verbatim.

**`defaultState`.** Drop the `runningTimerBrickId: null` field (line 39). Remaining: `blocks: [], categories: [], looseBricks: []`.

**`assertNever` exhaustiveness.** After the 5 deletions and 1 addition, the switch covers exactly: `ADD_BLOCK`, `ADD_CATEGORY`, `ADD_BRICK`, `LOG_TICK_BRICK`, `SET_UNITS_DONE`. `assertNever(action)` in the default branch confirms exhaustiveness against `Action` union.

**New helper.** `findUnitsBrickById(state: AppState, id: string): Extract<Brick, { kind: "units" }> | null` — mirrors the deleted `findTimeBrickById` from `lib/timer.ts:25`. Same shape, different kind discriminator. Lives in `lib/data.ts` (the closest module to `AppState`) and is exported. Used by `<BuildingClient>` to resolve the active brick for the sheet.

### Scoring migration — `lib/dharma.ts` (and `lib/scoring.ts` re-export shim)

**`brickPct` (line 32).** Current 3-arm switch becomes 2-arm:

```ts
export function brickPct(b: Brick): number {
  if (b.kind === "tick") return b.done ? 100 : 0;
  // units (kind === "units" by exhaustiveness)
  if (b.target <= 0) return 0;
  return Math.min(b.done / b.target, 1) * 100;
}
```

The completion-ratio math is byte-identical to the deleted goal branch with `count → done`, and byte-identical to the deleted time branch with `(minutesDone, durationMin) → (done, target)`. The zero-target guard handles AC #38's "existing M4b assertions hold" — `target <= 0` returns 0 the same way the deleted `durationMin <= 0` guard did.

**`brickLabel` (line 131).** Current 3-arm becomes 2-arm:

```ts
if (b.kind === "tick") return b.done ? "done" : "todo";
return `${b.done}/${b.target}${b.unit ? " " + b.unit : ""}`;
```

The time-arm's "min" suffix at line 131 is gone — the unit string is now in the data ("20/30 minutes" instead of "20/30 min"). M4b's assertions on the goal arm continue to hold post-rename. The single tick-arm assertion at the head is unchanged behaviorally (text may differ — TESTS dispatch handles).

**`blockPct`, `dayPct`, `categoryDayPct`.** No changes — they call `brickPct(b)` indirectly and don't read brick fields.

**Re-export shim.** `lib/scoring.ts` re-exports `brickPct, blockPct, dayPct, buildingPct` — no edits needed; the 4 functions retain the same signatures, so import sites in tests continue to resolve.

### Test fixture migration plan

Migration is mechanical. Plan-locked: **no `migrateToUnits()` helper**. Reasons: (1) the test files where the rewrite happens are the contract surface — silencing the change through a helper hides the schema collapse from readers; (2) the rename of `count → done` and `kind: "goal" → kind: "units"` is a 2-token sed; (3) the time-to-units conversion is a 4-token sed (`kind: "time"` → `kind: "units"`, `durationMin: N` → `target: N`, `minutesDone: N` → `done: N`, add `unit: "minutes"`). Per SG-m4f rec, keep it inline.

**Per-file migration scope (with literal counts from grep):**

| File                                         | `goal` literals | `time` literals       | Plan                                                                                                                                                                                                                                                                |
| -------------------------------------------- | --------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/data.test.ts`                           | 13              | (heavy)               | Goal arms rewrite to units; time arms retire entirely (the corresponding reducer arms are deleted). M4b `LOG_GOAL_BRICK` test groups rewrite as `SET_UNITS_DONE` groups (with absolute-value, not delta, assertions). M4c timer-action test groups delete outright. |
| `lib/dharma.test.ts`                         | 3               | (some)                | Mechanical rename. Time-kind brickPct cases re-point to `kind: "units"` with `unit: "minutes"`.                                                                                                                                                                     |
| `lib/overlap.test.ts`                        | 2               | (some)                | Mechanical rename. Overlap math is kind-agnostic — fixtures just need shape correctness.                                                                                                                                                                            |
| `lib/scoring.test.ts`                        | 1               | 0                     | Single literal rename.                                                                                                                                                                                                                                              |
| `lib/blockValidation.test.ts`                | 0               | 0                     | U-m2-004 + U-m2-005 re-point to `lib/overlap.ts:intervalsOverlap` per SG-m4f-03. Two-line import + symbol swap; assertion bodies unchanged.                                                                                                                         |
| `components/AddBrickSheet.test.tsx`          | 0               | (kind-selector tests) | Kind-selector test group reduces 3→2; the "Time" chip group + `durationMin` input group RETIRE; the "Goal" group renames to "Units" and its assertions on target/unit inputs stay.                                                                                  |
| `components/AddBlockSheet.test.tsx`          | 1               | 0                     | Single fixture literal.                                                                                                                                                                                                                                             |
| `components/BrickChip.test.tsx`              | 4               | (time tests)          | Goal-stepper group RETIRES (stepper deleted). Time-chip group RETIRES (timer deleted). New tests for units chip tap → fires `onUnitsOpenSheet`. Tick group unchanged.                                                                                               |
| `components/Brick.test.tsx`                  | 2               | (some)                | File DELETE (subject deleted). All IDs retire.                                                                                                                                                                                                                      |
| `components/TimedLooseBrickCard.test.tsx`    | 1               | 0                     | Fixture rename + drop `running` / `onTimerToggle` prop expectations.                                                                                                                                                                                                |
| `components/LooseBricksTray.test.tsx`        | 1               | (some)                | Fixture rename + drop timer prop expectations.                                                                                                                                                                                                                      |
| `components/TimelineBlock.test.tsx`          | 1               | (some)                | Fixture rename + drop timer prop expectations.                                                                                                                                                                                                                      |
| `app/(building)/BuildingClient.m4b.test.tsx` | 1               | 0                     | LOG_GOAL_BRICK assertions rewrite to SET_UNITS_DONE; the M4b stepper-DOM tests retire (chip is no longer a stepper); the tray-rendering tests stay.                                                                                                                 |
| `app/(building)/BuildingClient.m4c.test.tsx` | 0               | (entire)              | File DELETE. M4c IDs retired in tests.md with a one-line ADR-043 pointer per AC #36.                                                                                                                                                                                |
| `app/(building)/BuildingClient.m4e.test.tsx` | 0               | (some)                | Tests asserting M4e duration toggle against `kind: "time"` re-point to `kind: "units"` with `unit: "minutes"`. M4e IDs remain green per AC #37.                                                                                                                     |

**Retired test IDs (M4c).** The TESTS dispatch will record the M4c IDs being retired with a one-line "RETIRED by M4f per ADR-043" note next to each. The same note pattern applies to M4b stepper-on-chip IDs that retire because the stepper is gone.

**New test IDs (M4f, BUILDER target).** TESTS dispatch derives these. Broad shape: ~6 U-m4f IDs (reducer arm: 4 happy/edge + 2 defensive); ~6 C-m4f IDs (UnitsEntrySheet: validation + a11y + haptics); ~3 C-m4f IDs (BrickChip units variant + AddBrickSheet kind selector); ~4 E-m4f IDs (per AC #42); ~4 A-m4f IDs (per AC #43). Net headcount: TESTS dispatch will reconcile retired vs added; AC #41 says "drops by ~10–25" and "grows back".

### File deletions — exact paths

```
lib/timer.ts
lib/timer.test.ts
components/TimerSheet.tsx
components/TimerSheet.test.tsx
components/BrickStepper.tsx
components/BrickStepper.test.tsx                (delete iff present — verify; SG-m4f-02)
components/Brick.tsx                            (dead; would break tsc; not in render graph)
components/Brick.test.tsx                       (paired)
components/ui/BrickChip.tsx                     (dead; pre-M3 legacy; would break tsc)
components/ui/BrickChip.test.tsx                (paired)
app/(building)/BuildingClient.m4c.test.tsx     (subject deleted)
```

`lib/audio.ts`, `lib/audio.test.ts`, and `public/sounds/chime.mp3` are **NOT in this deletion set** — they are retained (user decision 2026-05-14; the M4a block/day completion chimes stay). The deletions commit (Phase E) touches no audio files. The M4c timer's own `playChime()` invocation is removed for free by `lib/timer.ts` being deleted — no separate audio-cleanup commit exists.

`lib/blockValidation.ts:overlapsExistingBlock` is a **function deletion**, not a file deletion — the file stays for `isValidStart`/`isValidEnd`/`isEndAfterStart`/`isValidBrickUnitsTarget`. `isValidBrickTime` deletes (gone with the time kind).

### Audio cleanup (scope clarification)

**Audio is RETAINED in M4f.** User decision 2026-05-14 (spec corrected in commit `55c00b6`): keep the M4a block-complete and day-complete chimes. `lib/audio.ts`, `lib/audio.test.ts`, and `public/sounds/chime.mp3` all STAY. M4f does **no separate audio-cleanup work**.

Factual note worth keeping: the spec's earlier draft said "delete `public/chime.mp3`" — but a file at that exact path never existed (`ls /home/user/integrity/public/` returns `icon.svg` and `sounds/`). The real placeholder asset lives at **`public/sounds/chime.mp3`** (431 bytes, per `docs/status.md:52`). The corrected AC #14 reflects this and locks the asset as retained.

`public/sounds/chime.mp3` is consumed by **`lib/audio.ts:playChime()`**, invoked from these sites — all RETAINED:

1. `app/(building)/BuildingClient.tsx:118` — M4a day-100% cross-up effect. **KEEP its `playChime()` call.**
2. `components/TimelineBlock.tsx:64` — M4a block-100% cross-up effect. **KEEP its `playChime()` call.**
3. Any `playChime()` reference in `lib/celebrations.ts` / `Fireworks.tsx` (block/day celebration registry). **KEEP.**

The ONLY audio that goes in M4f is the M4c timer's own `playChime()` invocation, _if one exists_ — and it is removed **for free** by virtue of `lib/timer.ts` being deleted. There is no `playChime()` strip work in `BuildingClient.tsx`, `TimelineBlock.tsx`, or `lib/celebrations.ts`. The deletions commit (Phase E) touches no audio files.

The `chime.mp3`-is-a-431-byte-placeholder open loop in `docs/status.md:52` (replace with a real royalty-free asset) **stays open** — replacing it remains an M7 concern. M4f does NOT resolve it.

### Migration ordering (BUILDER guidance)

Strict TDD (red → green → refactor per test) is the default per The Loop, but the schema collapse has irreducible cross-test coupling: any single failing test that constructs `kind: "goal"` will fail to compile once `types.ts` collapses. Pre-collapse, the test passes against `kind: "goal"`; post-collapse, the test must construct `kind: "units"`. There is no half-collapsed state where one test passes alone.

**Recommended phasing (BUILDER follows; deviation from strict per-test red/green is justified):**

1. **Phase A — types-first collapse (one tightening commit).** Write the failing M4f-001..006 tests for the new schema shape FIRST (red phase). Commit `test(m4f): schema collapse contract`. Then in a single follow-up commit, rewrite `lib/types.ts` to the locked schema AND bulk-migrate every fixture literal in the test suite (`kind: "goal"` → `kind: "units"`; `count` → `done`; `kind: "time"` → `kind: "units"` with `unit: "minutes"`/`target`/`done`). Commit `feat(m4f): collapse Brick union; migrate fixtures`. The migration must include scoring (`lib/dharma.ts`) and components in the same commit because each surface reads the same fields; splitting them leaves tsc red across the suite.

2. **Phase B — reducer rewrite + dispatch sites (red→green per arm).** Add `SET_UNITS_DONE` arm + the `findUnitsBrickById` helper with red→green. Delete the 5 obsolete arms + their dispatch sites with red phase: tests assert the arms no longer exist (e.g., `expect((reducer as any)(state, { type: "LOG_GOAL_BRICK", brickId: "x", delta: 1 })).toBe(state)` — type-cast escape hatch; the action type is gone from the union).

3. **Phase C — component edits per-test.** `<BrickChip>` units variant tap → sheet (M4f IDs), `<AddBrickSheet>` kind-selector reduction (M4f IDs), `<BuildingClient>` wiring (M4f IDs). Each per strict TDD.

4. **Phase D — `<UnitsEntrySheet>` test-by-test build.** Compose M0 primitives; each AC #27..33 + A-m4f-01..04 in its own red→green cycle.

5. **Phase E — file deletions.** Once nothing references the deleted files, delete them in a single commit (`feat(m4f): rip M4c timer infrastructure`). No audio files are deleted — `lib/audio.ts`, `lib/audio.test.ts`, and `public/sounds/chime.mp3` are retained. Run `npx tsc --noEmit` after this commit; expected: zero errors.

6. **Phase F — `docs/decisions.md` ADR-042 prose harmonization.** Search/replace "tick / goal / time" → "tick / units" in the ADR-042 body. Single `docs(harness)` commit (per § ADR-042 prose harmonization below).

7. **Phase G — `lib/blockValidation.ts:overlapsExistingBlock` deletion + U-m2-004/005 re-point.** Per SG-m4f-03; one paired red→green.

Justification for deviating from strict per-test in Phase A: the cost of a half-collapsed schema (every other test failing for a transient reason unrelated to the test under test) outweighs the TDD purity benefit. BUILDER pre-writes the schema-contract tests in red phase first, then bulk-migrates in a single green-restoring commit. This pattern is precedented by M3's locked-schema-introduction commit. The TESTS dispatch will record schema-contract IDs that explicitly authorize this phasing.

### ADR-042 prose harmonization (companion edit, SG-m4f-08)

`docs/decisions.md` ADR-042 (lines ~800–841) references "tick / goal / time" across its Context and Decision sections. Per ADR-043's resolution and SG-m4f-08, harmonize in place: search/replace "tick / goal / time" → "tick / units" and any single-instance variants (e.g., "tick, goal, and time bricks all expose the same toggle" → "tick and units bricks all expose the same toggle"; "time bricks specifically, `durationMin`" → strip that paragraph entirely since `durationMin` no longer exists). The ADR-042 decision itself (universal duration axis) is unchanged.

**Commit prefix for the harmonization edit:** `docs(harness)`, NOT `docs(plan-m4f)` — this is out-of-Loop per ADR-027 (the harmonization is to the ADR repository, not to plan/test artifacts for this feature). The BUILDER attaches it to whichever Phase commit aligns naturally.

### Status.md open-loop resolutions (SHIPPER updates)

The following open loops in `docs/status.md` close out at M4f ship:

| Open loop (status.md line)                                               | Resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/sounds/chime.mp3` placeholder (line 52)                          | NOT resolved — placeholder retained; `lib/audio.ts` and the M4a block/day `playChime()` call sites all stay (user decision 2026-05-14). Real-asset replacement remains an M7 open loop; this row stays open in `docs/status.md`.                                                                                                                                                                                                                                                                                                                                                                                  |
| `useTimer` exhaustive-deps lint warning (line 61)                        | RESOLVED — `lib/timer.ts` deleted; warning evaporates.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `useTimer` wide dep-array trade-off (line 59)                            | RESOLVED — same.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `<TimerSheet>` does NOT auto-focus minutes input (line 60)               | RESOLVED — `<TimerSheet>` deleted; the replacement `<UnitsEntrySheet>` DOES auto-focus the number input on open.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `lib/blockValidation.ts:overlapsExistingBlock` dead code (line 57)       | RESOLVED — function deleted; U-m2-004/005 re-pointed to `lib/overlap.ts:intervalsOverlap`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 8 unused-`card` lint warnings in `BuildingClient.m4c.test.tsx` (line 63) | RESOLVED — file deleted.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ADR-042 text harmonization (line 58)                                     | RESOLVED — SG-m4f-08 in-place edit.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **16 pre-existing lint warnings** (Eval gate row, status.md line 70)     | **Partially resolved** — the M4c-derived warnings (8 unused-`card`, 1 useTimer-exhaustive-deps, plus 2 unused-import warnings that should surface from the M4c file deletes) zero out. The 3 `lib/longPress.ts` underscore-param warnings (line 62) PERSIST — `useLongPress` is still used by other components (verify; `longPress.ts` may itself become unused once `BrickChip` drops its goal/time handlers — if so, ALSO RESOLVED). The 2 `aria-expanded` warnings (status.md line 48) are spec-mandated by M2 ACs and continue to carry. Net expected post-M4f: roughly **3–5 lint warnings** (down from 16). |
| Vacuous-pass debt (~35 post-M4e, line 53)                                | UNCHANGED — M4f's deferred-to-preview e2e/a11y items are net-additive with the same vacuous-pass-guard pattern; the M4c-derived vacuous items retire with the file deletes. SHIPPER reports the net delta.                                                                                                                                                                                                                                                                                                                                                                                                        |

`docs/status.md` updates are SHIPPER's job per ADR-041; this plan just enumerates the resolutions BUILDER should expect to land.

### SG-m4f resolutions (all 8)

- **SG-m4f-01 — `count → done` rename.** RESOLVED: rename in the same PR. The cost is a 36-literal sed across 16 files; the benefit is one consistent field name (`done`) for "progress" across both kinds. Plan-locked per spec recommendation.
- **SG-m4f-02 — Delete `<BrickStepper>` or leave dormant?** RESOLVED: delete (file + component + the obsolete `Brick.tsx` consumer). Reasoning: the user explicitly rejected the stepper UX 2026-05-14; reintroducing it later costs ~80 LOC (the current file size). Cheaper to re-derive than to maintain dead code.
- **SG-m4f-03 — Delete `lib/blockValidation.ts:overlapsExistingBlock`?** RESOLVED: delete the function (keep the file for the surviving validators); re-point U-m2-004 and U-m2-005 to `lib/overlap.ts:intervalsOverlap` per the spec recommendation. Behavior is identical (both use half-open math per ADR-006); only the imported symbol changes. The "M2 regression coverage" the function previously provided is preserved.
- **SG-m4f-04 — UnitsEntrySheet trigger: tap vs long-press?** RESOLVED: tap. The chip becomes a single-tap surface (M4b stepper gone, M4c long-press gone), so there is no contested gesture. Long-press would create a hidden affordance and conflict with future M5 edit-mode patterns. Tap is the locked UX.
- **SG-m4f-05 — Replace chime for units bricks?** RESOLVED: no celebratory sound for _units bricks_ in M4f (typing a number into a units brick triggers no chime). This does **not** touch the M4a block-complete / day-complete chimes — those are RETAINED (user decision 2026-05-14; see § Audio cleanup). `lib/audio.ts` + `public/sounds/chime.mp3` survive. A future M7 polish milestone may add a units-completion sound and swap the placeholder asset.
- **SG-m4f-06 — Decimals in `target` or `done`?** RESOLVED: integers only. `Math.floor()` in the reducer + `step="1"` on the input + the regex `^\d+$` validation in the sheet enforce this in three layers. Decimals revisit in M7 if usage signals warrant ("1.5 km", "2.5 cups").
- **SG-m4f-07 — Migrate auto-running-timer state across session refresh?** RESOLVED: no migration code. There is no persistence (M8 owns that), so no in-flight state survives a refresh. The rip is clean by construction.
- **SG-m4f-08 — Supersede ADR-042 or rewrite in place?** RESOLVED: in-place rewrite of the "tick / goal / time" phrasing in ADR-042's body. ADR-042's decision is unchanged; only the score-type cardinality phrasing it references in its own prose is updated. ADR-043 notes the harmonization. Commit prefix is `docs(harness)`, NOT `docs(plan-m4f)`, per ADR-027.

### Edge cases (re-stated from spec for BUILDER)

- Units chip tapped while UnitsEntrySheet for a different brick is open → close prev, open new (single-sheet contract per M4d).
- User clears input, taps Save → Save aria-disabled; medium haptic + sr-only hint surfaces.
- Negative number → input layer rejects (`min="0"` HTML attr + regex `^\d+$`); Save stays disabled.
- Value > target → valid (overachievement); chip renders e.g. "120 / 100 reps" with no special styling.
- Decimal pasted in → reducer floors via `Math.floor(action.done)` defensively (input layer also rejects, but reducer is the truth).
- Existing `kind: "time"` fixtures → tsc compile error post-collapse; the Phase A bulk migration converts in the same commit.
- Existing `kind: "goal"` fixtures → tsc compile error post-collapse; same.
- M4e duration toggle ON for units brick → unchanged from M4e; the duration axis is kind-agnostic.
- `unit: ""` saved → AddBrickSheet's Unit input is `required`; defensive reducer rejection on `unit === ""` is plan-locked (mirrors `target <= 0` rejection per spec edge case).
- `target: 0` saved → AddBrickSheet's Target input is `min="1"`; defensive reducer rejection on `target <= 0` per same edge case.
- `lib/timer` import remains in any source file → typecheck/lint failure on `lib/timer.ts` deletion surfaces any forgotten import. (`lib/audio` imports are expected to survive — audio is retained.)

### Risks

- **R1 — incomplete sweep.** A missed `kind: "time"` reference or stale `runningTimerBrickId` access causes `tsc --noEmit` errors. **Mitigation:** the grep inventory above lists all 504 hits across 35 files; BUILDER runs `npx tsc --noEmit` after each Phase (A through G) and treats any error as a blocker. Eval Gate (Phase 6) gates on zero tsc errors per AC #39.
- **R2 — M4e regression on units bricks with `hasDuration: true`.** M4e tests exercised time-kind + duration; rewriting them to units-kind must preserve every M4e AC. **Mitigation:** the TESTS dispatch will include explicit "M4e duration-axis parity on units bricks" checks (re-pointed M4e IDs per AC #37). The plan locks: any failure of a re-pointed M4e ID is a build-blocker, not a "minor migration" — the M4e contract is sacred.
- **R3 — scoring math drift.** Field renames in `lib/dharma.ts` could subtly change completion ratios if a `??` or `||` default isn't migrated. **Mitigation:** the `brickPct` rewrite above shows the algorithm is byte-identical modulo field names (`count` → `done`, `(minutesDone, durationMin)` → `(done, target)`). A snapshot-style assertion on a representative day's `dayPct` (e.g., a day with 1 tick + 1 units brick at 50% completion) lives in `lib/dharma.test.ts`'s migration set as a regression anchor.
- **R4 — UnitsEntrySheet keyboard handling on mobile.** Number inputs have known quirks across iOS Safari / Android Chrome (decimal-point key, virtual keyboard "submit" key, paste of locale-formatted numbers). **Mitigation:** `inputMode="numeric"` + `step="1"` + `min="0"` + `pattern="\d*"` covers the mobile keypad; the regex `^\d+$` is the JS truth; `Math.floor()` in the reducer is the final defense. E-m4f-01 + E-m4f-04 verify on mobile-chrome viewport.
- **R5 — Audio cleanup scope (RESOLVED by user decision 2026-05-14).** An earlier draft of this plan proposed deleting all audio. The user has since decided to **retain** the M4a block-complete and day-complete chimes; the spec was corrected accordingly (commit `55c00b6`). `lib/audio.ts`, `lib/audio.test.ts`, `public/sounds/chime.mp3`, and every `playChime()` call site all stay. M4f does no audio-cleanup work — the M4c timer's own chime invocation (if any) is removed for free when `lib/timer.ts` is deleted. No risk remains here.

### Out of scope (re-stated from spec for BUILDER)

- Decimals in `target` or `done` — M7 polish.
- Editing an existing units brick's `target` or `unit` — M5 Edit Mode.
- Re-introducing a ±1 stepper UX on the chip — locked out per user direction.
- Quick-log gesture on chip (long-press to increment, swipe) — M7 if signal.
- Persisting `done` across reloads — M8.
- Auto-suggest unit dropdown — M7 polish.
- History view of past `done` — M9 (depends on M8).
- Resurrecting any timer behavior — never.
- Any conflict-resolution UI beyond Save-disable — never (user resolves; app surfaces).
- Celebratory audio on `done >= target` — M7 polish (locked out of M4f per SG-m4f-05).

### Test strategy (TESTS dispatch reserves)

The TESTS-mode dispatch (separate, per ADR-025) will produce the actual GIVEN/WHEN/THEN IDs. This plan reserves the following layers and broad coverage targets:

- **Unit (Vitest)** — `lib/data.test.ts`: `SET_UNITS_DONE` happy path (loose + nested + missing id + tick-brick no-op + identity short-circuit + Math.floor defense + clamp at 0); `ADD_BRICK` defensive `kind` reject; `findUnitsBrickById` returns the brick or null; `defaultState` shape. `lib/dharma.test.ts`: `brickPct` for tick / units (zero target / overachievement / typical). `lib/overlap.test.ts`: re-pointed U-m2-004/005 against `intervalsOverlap`; fixture migrations.
- **Component (Vitest + Testing Library)** — `components/UnitsEntrySheet.test.tsx` (NEW): renders brick name + "Today's {unit}" + pre-filled input; Save disabled when empty / non-integer / negative; Save calls `onSave(brickId, parsed)` when valid; Cancel calls only `onClose`; disabled-Save tap fires medium haptic + reveals sr-only hint; sheet auto-focuses + selects input on open. `components/BrickChip.test.tsx`: units chip tap fires `onUnitsOpenSheet(brick.id)` + light haptic; chip primary line renders "{done} / {target} {unit}"; aria-label includes "tap to log progress"; tick variant unchanged (regression). `components/AddBrickSheet.test.tsx`: kind selector renders exactly 2 chips; "Time" chip absent; selecting "Units" reveals target + unit inputs; Save constructs `kind: "units"` with `done: 0` plus M4e duration fields if toggle on.
- **E2E (Playwright, mobile-chrome 430 px)** — `tests/e2e/m4f.spec.ts`: 5 IDs per AC #42 (add units brick → open sheet → type 20 → Save → chip renders "20 / 30 minutes"; tap tick chip → flip done no sheet; AddBrickSheet shows 2 kind chips; free-text unit parity with "reps"; no live timer observable anywhere). Vacuous-pass-guarded per M4a–M4e pattern.
- **A11y (axe via Playwright)** — `tests/e2e/m4f.a11y.spec.ts`: 4 IDs per AC #43 (dialog role + labelledby; input accessible name; disabled-Save describedby + sr-only; axe zero violations on three sheet states). Vacuous-pass-guarded.

### Migration / obsolete IDs

- All M4c test IDs (U-m4c-_, C-m4c-_, A-m4c-_, E-m4c-_) RETIRE with a one-line "RETIRED by M4f per ADR-043" pointer in tests.md. The corresponding files (`lib/timer.test.ts`, `components/TimerSheet.test.tsx`, `app/(building)/BuildingClient.m4c.test.tsx`) are deleted outright.
- All M4b stepper-on-chip test IDs (those that specifically assert ±1 buttons, scale-press, long-press auto-repeat, clamp haptic) RETIRE with the same pointer. M4b's reducer-level test IDs that asserted `LOG_GOAL_BRICK` semantics RE-POINT to assert `SET_UNITS_DONE` semantics (absolute-value, not delta) and renumber as M4f IDs.
- M2 IDs U-m2-004 and U-m2-005 RE-POINT to `lib/overlap.ts:intervalsOverlap` per SG-m4f-03; IDs stay stable; only the imported symbol in the test changes.
- M4e test IDs that exercised the duration toggle on `kind: "time"` RE-POINT to `kind: "units"` with `unit: "minutes"`. IDs stay stable per AC #37.
- The `[obsolete]` test files (`components/Brick.test.tsx`, `components/ui/BrickChip.test.tsx`) RETIRE outright — their subjects (already-dead components) are deleted.

### Open questions for VERIFIER

Only one item the spec does not lock verbatim:

1. ~~**Audio cleanup scope.**~~ **RESOLVED** (user decision 2026-05-14; spec corrected in commit `55c00b6`). Audio is retained: `lib/audio.ts`, `lib/audio.test.ts`, `public/sounds/chime.mp3`, and every `playChime()` call site (M4a block-complete + day-complete chimes) all stay. M4f does no audio-cleanup work — the M4c timer's own chime invocation is removed for free when `lib/timer.ts` is deleted. AC #14 (corrected) locks this. No open question remains.

2. **Phase A migration ordering.** § Migration ordering recommends a single bulk-migration commit for the schema collapse (test pre-write red, then bulk-migrate green) rather than strict per-test red/green. The deviation is justified by the schema's irreducible coupling — no single test passes in isolation under a half-collapsed type. VERIFIER may PASS this phasing or insist on strict per-test discipline; if the latter, BUILDER's Phase A becomes ~30 small commits instead of 2, with no behavioral difference. Plan-locked preference: bulk migrate per the M3 precedent.

Everything else (schema collapse, reducer shape, sheet design, kind-selector reduction, deletions, ordering of Phases B–G, test-fixture migration tactic) resolves under ADR-043, ADR-042, ADR-006, ADR-019, ADR-027, ADR-031, ADR-035, ADR-039, ADR-041, the spec's locked schema, or one of the SG-m4f-0N resolutions above.

### ADR needed

None new. ADR-043 (Accepted 2026-05-14) is the controlling decision for the entire milestone. ADR-042's prose is harmonized in-place per SG-m4f-08 (a docs edit, not a new ADR). No conditional caveats.
