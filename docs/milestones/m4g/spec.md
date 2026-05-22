## Milestone 4g — Timer-era dead-code sweep

> **Pillars:** § 0.9 (data model — no schema change; only removal of inert prop surface), ADR-043 (the M4f collapse — this milestone finishes the cleanup ADR-043 began). No new ADR required.

### Intent

M4f collapsed bricks to two kinds and ripped the timer, but it parked a layer of inert `@deprecated` props on five components rather than deleting them — kept as "backwards-compat prop shape" placeholders. No caller passes them; no component reads them; they are dead weight. The M4f EVALUATOR explicitly deferred their removal to "an M5 decision." M4g is that decision, taken before M5 begins, because M5 (block/brick edit + delete) rewires these exact components and the dead props would only entangle that work.

M4g is **pure subtraction with zero behavior change.** It removes the dead props and clears two cosmetic nits the M4f EVALUATOR logged. It adds nothing, changes no rendering, no scoring, no user-visible behavior.

**What this is NOT:** any schema change (the `Brick` / `AppState` / `Action` unions are untouched — M4f locked them); any new component or prop; any edit-mode or delete behavior (M5); a refactor of component internals beyond deleting unused prop declarations and their now-dead references.

### Inputs

- Five components carrying `@deprecated` props in their `Props` interface:
  - `components/BrickChip.tsx` — `onUnitsLog`, `onGoalLog`, `runningTimerBrickId`, `onTimerToggle`, `onTimerOpenSheet`
  - `components/TimelineBlock.tsx` — `onUnitsLog`, `onGoalLog`, `runningTimerBrickId`, `onTimerToggle`, `onTimerOpenSheet`
  - `components/Timeline.tsx` — `onUnitsLog`, `onGoalLog`
  - `components/LooseBricksTray.tsx` — `onUnitsLog`, `onGoalLog`
  - `components/TimedLooseBrickCard.tsx` — `onUnitsLog`, `onGoalLog`
- `lib/blockValidation.test.ts` — a `describe` block mislabelled `U-m4f-016` that actually exercises `isValidBrickUnitsTarget`.
- `lib/data.ts` — the `findUnitsBrickById` doc comment that references the deleted `lib/timer.ts` / `findTimeBrickById`.

### Outputs

- The five `Props` interfaces have zero `@deprecated` props.
- No caller, test fixture, or `app/design/HarnessClient.tsx` usage references a removed prop.
- The mislabelled test carries an accurate, non-colliding test ID; its assertion is unchanged.
- `lib/data.ts`'s comment no longer references `lib/timer.ts` / `findTimeBrickById`.
- App behavior, rendering, and scoring are byte-for-byte identical to the M4f ship.

### Edge cases

- A removed prop is still passed at a call site or in a test render → that argument is removed in the same change; `tsc --noEmit` must stay clean.
- The `U-m4f-016` label collision: tests.md's real `U-m4f-016` G/W/T (classic `intervalsOverlap` overlap) is already covered by `U-m2-004`. The mislabelled `describe` is a genuine `isValidBrickUnitsTarget` test — it is **renamed** to an accurate, non-colliding ID, never deleted; the assertion body is preserved verbatim.
- No `@deprecated` prop is currently exercised by a test (they were always inert) → no test should fail from removal; any test that does fail reveals a prop that was secretly live and must be investigated, not silently deleted.

### Acceptance criteria

1. `components/BrickChip.tsx` `Props` declares none of: `onUnitsLog`, `onGoalLog`, `runningTimerBrickId`, `onTimerToggle`, `onTimerOpenSheet`.
2. `components/TimelineBlock.tsx` `Props` declares none of: `onUnitsLog`, `onGoalLog`, `runningTimerBrickId`, `onTimerToggle`, `onTimerOpenSheet`.
3. `components/Timeline.tsx`, `components/LooseBricksTray.tsx`, and `components/TimedLooseBrickCard.tsx` `Props` declare neither `onUnitsLog` nor `onGoalLog`.
4. `grep` for each removed prop name (`onUnitsLog`, `onGoalLog`, `runningTimerBrickId`, `onTimerToggle`, `onTimerOpenSheet`) across `app/`, `components/`, `lib/` returns zero hits — excepting documentation strings in `CHANGELOG.md`, `docs/`, and migration comments that intentionally narrate the removal.
5. The `describe` block currently labelled `U-m4f-016` in `lib/blockValidation.test.ts` is renamed to an accurate, non-colliding test ID; its assertion is unchanged and green.
6. The `findUnitsBrickById` comment in `lib/data.ts` no longer mentions `lib/timer.ts` or `findTimeBrickById`.
7. `npx tsc --noEmit`: zero errors. `npm run lint`: zero errors, no more than 13 warnings. Full Vitest suite green with no net test-count regression (no test is removed — at most a dead prop is dropped from a render call inside a still-passing test).
8. No behavior change: every existing component test passes, modulo the mechanical removal of a dead prop from a render call where one was passed. No snapshot, no rendered DOM, no scoring output differs from the M4f ship.

### Open spec gaps (resolve at VERIFY)

- **SG-m4g-01 — New ID for the renamed `U-m4f-016` test.** Recommendation: relabel it `U-m4f-016b` or fold it under the existing `isValidBrickUnitsTarget` describe with that suite's ID; PLANNER picks the scheme in tests.md and VERIFIER confirms no collision. Trade-off: a brand-new `U-m4g-` ID is cleaner but detaches the assertion from its M4f origin. Lean: keep it in the M4f ID space with a non-colliding suffix.
- **SG-m4g-02 — Migration comments that name the removed props.** Recommendation: the narrative comments at the top of `Timeline.tsx` / `TimedLooseBrickCard.tsx` / `BrickChip.tsx` ("M4f: onGoalLog → onUnitsLog; timer props removed") may stay — they document history and are not `@deprecated` tags. Trade-off: deleting them is tidier; keeping them aids archaeology. Lean: keep the one-line history comments, delete only the `@deprecated` JSDoc tags and their props.
