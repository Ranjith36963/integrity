## Milestone 4g — Timer-era dead-code sweep — Plan

> **Pillars:** § 0.9 (data model — no schema change). ADR-043 (the M4f collapse — M4g finishes the cleanup ADR-043 began). No new ADR.

### Context

M4f collapsed bricks to two kinds and ripped the timer, but parked a layer of inert `@deprecated` props on five components as "backwards-compat prop shape" placeholders. No caller passes them, no component reads them — they are dead weight. M5 (block/brick edit + delete) rewires these exact components, so the dead props are removed now, before M5, so they cannot entangle that work. M4g is **pure subtraction with zero behavior change**: it deletes the dead props plus two cosmetic nits the M4f EVALUATOR logged. It adds nothing and changes no rendering, scoring, or user-visible behavior.

### File structure

All edits are deletions/renames inside existing files. **No file is created or removed.** No `app/` page, no `lib/types.ts`, no reducer touched.

```
EDIT  components/BrickChip.tsx           (delete 5 @deprecated props from Props)
EDIT  components/TimelineBlock.tsx       (delete 5 @deprecated props from Props)
EDIT  components/Timeline.tsx            (delete 2 @deprecated props from Props)
EDIT  components/LooseBricksTray.tsx     (delete 2 @deprecated props from Props)
EDIT  components/TimedLooseBrickCard.tsx (delete 2 @deprecated props from Props)
EDIT  lib/blockValidation.test.ts        (rename one mislabelled describe ID)
EDIT  lib/data.ts                        (fix one stale comment line)
```

### Data model

**None.** No schema change. The `Brick` / `AppState` / `Action` unions in `lib/types.ts` are untouched — M4f locked them (§ Locked schema, post-M4f). M4g touches only `Props` interfaces inside component files, plus one test ID string and one comment. No design tokens are added or changed; this milestone has no token surface.

### File-by-file change list

The pre-edit grep is decisive and must be quoted in the BUILDER's commit message as the basis for the bulk deviation: **`grep -rn` for `onUnitsLog`, `onGoalLog`, `runningTimerBrickId`, `onTimerToggle`, `onTimerOpenSheet` across `app/` `components/` `lib/` (excluding doc/comment strings) returns ZERO call-site hits.** Every hit is either the `Props` declaration being deleted, a one-line history/migration comment, or a test-file narrative comment. No parent component, no `BuildingClient.tsx`, no `HarnessClient.tsx`, and no test render passes any of the five props. The call graph is therefore clean: nothing is threaded live, nothing downstream needs an argument removed.

**1. `components/BrickChip.tsx`** — delete these five `Props` lines (current lines 25–34, the JSDoc tag + its signature for each):

- `onUnitsLog?: (brickId: string, delta: 1 | -1) => void;`
- `onGoalLog?: (brickId: string, delta: 1 | -1) => void;`
- `runningTimerBrickId` — **note:** BrickChip's timer-state prop is declared as `running?: boolean;` (line 30), NOT `runningTimerBrickId`. The spec's Inputs list names `runningTimerBrickId` for BrickChip; the actual inert prop on this file is `running`. **Resolution: delete `running?: boolean;` — it is the same dead M4c timer-state prop the spec intends; the spec's prop name is imprecise for this one file.** Flag noted under § Risks. AC #1 ("declares none of: ... `runningTimerBrickId` ...") is satisfied trivially because BrickChip never declared `runningTimerBrickId`; the substantive deletion is `running`.
- `onTimerToggle?: (brickId: string) => void;`
- `onTimerOpenSheet?: (brickId: string) => void;`
- Net: BrickChip `Props` keeps `brick`, `categories`, `size`, `onTickToggle`, `onUnitsOpenSheet`. The destructure at lines 113–119 already omits all five — no destructure edit needed. The one-line history comment at the top (lines 2–9) **stays** (SG-m4g-02).
- Call sites: `TimelineBlock`, `LooseBricksTray`, `TimedLooseBrickCard`, and `HarnessClient.tsx` (lines 256/270/283) all render `<BrickChip>` passing only `brick`/`categories`/`size`/`onTickToggle`/`onUnitsOpenSheet`. **No call-site edit.**

**2. `components/TimelineBlock.tsx`** — delete these five `Props` lines (current lines 28–37):

- `onUnitsLog`, `onGoalLog`, `runningTimerBrickId?: string | null;`, `onTimerToggle`, `onTimerOpenSheet`.
- Net: `Props` keeps `block`, `categories`, `onAddBrick`, `onTickToggle`, `onUnitsOpenSheet`. Destructure (lines 40–46) already omits all five — no destructure edit.
- Call site: `Timeline.tsx` lines 124–131 renders `<TimelineBlock>` passing only `block`/`categories`/`onAddBrick`/`onTickToggle`/`onUnitsOpenSheet`. **No call-site edit.**

**3. `components/Timeline.tsx`** — delete two `Props` lines (current lines 40–43): `onUnitsLog`, `onGoalLog`.

- Net: `Props` keeps `items`, `categories`, `now`, `onSlotTap`, `onAddBrick`, `onTickToggle`, `onUnitsOpenSheet`, `hasLooseBricks`. Destructure (lines 50–59) already omits both — no destructure edit.
- Call site: `BuildingClient.tsx` lines 284–293 renders `<Timeline>` passing `items`/`categories`/`now`/`onSlotTap`/`onAddBrick`/`onTickToggle`/`onUnitsOpenSheet`/`hasLooseBricks` only. **No call-site edit.** The `// - M4f: onGoalLog → onUnitsLog; timer props removed (ADR-043).` history comment at line 11 **stays** (SG-m4g-02).

**4. `components/LooseBricksTray.tsx`** — delete two `Props` lines (current lines 22–25): `onUnitsLog`, `onGoalLog`.

- Net: `Props` keeps `looseBricks`, `categories`, `onAddBrick`, `onTickToggle`, `onUnitsOpenSheet`, `blocksExist`. Destructure (lines 34–41) already omits both — no destructure edit.
- Call site: `BuildingClient.tsx` lines 296–303 renders `<LooseBricksTray>` passing only the live props. **No call-site edit.**

**5. `components/TimedLooseBrickCard.tsx`** — delete two `Props` lines (current lines 24–27): `onUnitsLog`, `onGoalLog`.

- Net: `Props` keeps `brick`, `categories`, `onTickToggle`, `onUnitsOpenSheet`. Destructure (lines 36–41) already omits both — no destructure edit.
- Call site: `Timeline.tsx` lines 133–139 renders `<TimedLooseBrickCard>` passing only the live props. **No call-site edit.** The `// M4f: onGoalLog → onUnitsLog; timer props removed (ADR-043).` history comment at line 11 **stays** (SG-m4g-02). The line-7 comment fragment "`onTickToggle/onUnitsLog pass-through`" inside the header block narrates an inaccurate symbol — BUILDER may correct `onUnitsLog` → `onUnitsOpenSheet` in that comment for accuracy, but this is optional polish, not required by any AC.

**Call-graph summary.** Threading paths: `BuildingClient → Timeline → TimelineBlock → BrickChip` and `BuildingClient → Timeline → TimedLooseBrickCard → BrickChip` and `BuildingClient → LooseBricksTray → BrickChip`. At every hop, only `onTickToggle` and `onUnitsOpenSheet` are threaded. **None of the ten removed prop declarations is threaded by any parent.** They were inert from the moment M4f parked them.

### SG-m4g-01 resolution — renamed test ID

**Decision: rename the mislabelled `describe` at `lib/blockValidation.test.ts:199` to `U-m3-013`.**

Rationale, and why this beats `U-m4f-016b`:

- The `describe` at line 199 tests `isValidBrickUnitsTarget` (integer ≥ 1). That function is the M4f rename of `isValidBrickGoal`. Its **canonical, already-existing test ID in `docs/tests.md` is `U-m3-013`** (tests.md line 2307: `U-m3-013` — "`lib/blockValidation.ts:isValidBrickGoal` (integer ≥ 1)"). The assertion at line 199 is literally the M4f-renamed body of `U-m3-013`. The current label collides with `U-m4f-016`, which `docs/tests.md` (line 5271) reserves for the `intervalsOverlap` re-point.
- The file's own line-197 banner comment already gestures at the dual identity: `// ─── U-m4f-016 / U-m3-013: isValidBrickUnitsTarget (renamed from isValidBrickGoal) ───`. The mislabel is purely the `describe` string; the comment already knows the truth.
- `U-m3-013` is therefore not a "brand-new detached ID" (the trade-off the spec warned against) — it is the test's **true ancestral ID**, already documented in tests.md for this exact function. A fabricated `U-m4f-016b` suffix would invent an ID that exists nowhere; `U-m3-013` re-attaches the assertion to its real M3 origin and removes the collision in one move. The spec's lean ("keep it in the M4f ID space") was a fallback when no clean prior ID exists — but one does.
- The renamed `describe` string becomes exactly:
  `describe("U-m3-013: isValidBrickUnitsTarget validates target is integer ≥ 1", () => {`
  Only the leading `U-m4f-016` token changes to `U-m3-013`. **The two `it()` blocks and every `expect` assertion inside are preserved verbatim** (AC #5: assertion unchanged, stays green). No collision: `U-m3-013` appears in tests.md as a Unit ID for this function and nowhere else in `lib/blockValidation.test.ts`; `U-m4f-016` / `U-m4f-017` (lines 66, 177 of the same file — the `intervalsOverlap` re-points) are left untouched.
- The line-197 banner comment may be tidied to `// ─── U-m3-013: isValidBrickUnitsTarget (renamed from isValidBrickGoal at M4f) ───` to drop the now-misleading `U-m4f-016` cross-reference; optional, not AC-required.

### SG-m4g-02 resolution — migration-comment policy

**Decision: keep the one-line history/migration comments; delete only the `@deprecated` JSDoc tags and their prop signatures.**

The narrative header comments at the top of `BrickChip.tsx` (lines 2–9), `Timeline.tsx` (line 11), and `TimedLooseBrickCard.tsx` (line 11) — e.g. `// M4f: onGoalLog → onUnitsLog; timer props removed (ADR-043).` — **stay**. They document milestone history, are not `@deprecated` tags, and aid future archaeology (esp. M5, which rewires these files). They are explicitly exempted by AC #4 ("migration comments that intentionally narrate the removal"). The only things deleted from each component file are the `@deprecated` JSDoc lines and the prop signatures they annotate. Grep for a removed prop name will still hit these history comments — that is expected and AC-sanctioned.

### `lib/data.ts` comment fix (AC #6)

The `findUnitsBrickById` doc comment (current lines 44–48) opens:

```
 * findUnitsBrickById — M4f helper (mirrors deleted findTimeBrickById from lib/timer.ts).
```

`lib/timer.ts` and `findTimeBrickById` were both deleted in M4f; the reference is stale. **Replace that line with:**

```
 * findUnitsBrickById — M4f helper. Searches state for a units-kind brick by id.
```

The remaining two lines of the comment ("Searches looseBricks first, then block.bricks. Returns the units-kind brick with / the given id, or null if not found or if the brick is a tick kind.") stay verbatim. Separately, the file-header comment at `lib/data.ts` line 9 (`M4f: ... Adds findUnitsBrickById.`) is a history line — it does not name `lib/timer.ts`/`findTimeBrickById`, so it needs no edit and stays. After the fix, AC #6 holds: `grep -n "timer\.ts\|findTimeBrickById" lib/data.ts` returns zero.

### Components

No component is added, removed, or changes its props _contract_ in any observable way — the deleted props were already absent from every destructure, so the rendered output and behavior are byte-identical to the M4f ship. There is nothing new to specify here.

### Dependencies

**None.** No new package. `package.json` is untouched.

### Edge cases

- **A removed prop turns out to be threaded live.** The pre-edit grep says no call site passes any of the ten props, but the BUILDER must not rely solely on the grep — `npx tsc --noEmit` and the full Vitest suite are the binding proof. If deleting a prop produces a `tsc` error or a red test, that reveals a secretly-live prop and must be **investigated, not silently worked around** (do not re-add the prop to "fix" the build without understanding why; report it). Per the spec's third edge case, no test should fail from these removals — any failure is a finding.
- **`running` vs `runningTimerBrickId` name mismatch on BrickChip.** Resolved above: delete `running?: boolean;`. The spec's Inputs list is imprecise for this single file; AC #1's literal text is still satisfied (BrickChip never declared `runningTimerBrickId`).
- **Grep false positives in docs/comments.** AC #4 excludes `CHANGELOG.md`, `docs/`, and migration comments. The post-edit verification grep must be scoped to non-comment source: a hit inside a kept history comment is expected and not a failure.
- **No-op renders.** Some component tests render these components; none passes a removed prop (confirmed by grep — test-file hits are all comments, e.g. `LooseBricksTray.test.tsx:292`, `TimelineBlock.test.tsx:550/602`). So no test render call needs an argument dropped. If a stray render is later found passing one, that argument is removed in the same change (AC #7/#8 — "at most a dead prop dropped from a render call inside a still-passing test").
- **Test-count regression.** AC #7 forbids net test-count drop. The `U-m3-013` rename changes a `describe` string only — same two `it()` blocks, same count. No test is added or removed in M4g.

### Ordering / commit strategy (BUILDER guidance)

This milestone is ~12 prop-line deletions plus two one-line nits, all verified by `tsc` + the existing suite — there is no new behavior to drive red→green. Strict per-test TDD does not apply because **M4g writes no new test**; it only renames one existing test's ID. A per-component red/green pair would mean writing throwaway "prop is absent" type-probe tests with no lasting value.

**Sanctioned deviation (written basis for the EVALUATOR's commit-boundary gate):** M4g is authorized to ship as **two commits**, not strict per-test:

1. `feat(m4g): remove inert @deprecated timer-era props from five components` — all ten prop-line deletions across the five component files in one commit. The commit body must quote the zero-hit pre-edit grep as the safety basis, and state that `npx tsc --noEmit` + full Vitest pass post-deletion is the regression proof (AC #7, #8). This is a refactor with no behavior change; bundling the five files mirrors the M4f Phase-A precedent (a single coupled-edit commit when splitting yields no behavioral isolation and only churn).
2. `fix(m4g): correct mislabelled U-m4f-016 test ID and stale lib/data.ts comment` — the `U-m3-013` rename in `lib/blockValidation.test.ts` plus the `findUnitsBrickById` comment fix in `lib/data.ts`. Two cosmetic nits, no behavior change.

Optionally the BUILDER may split commit 1 into one-commit-per-component (five commits) if it prefers tighter boundaries — both are acceptable; the bundled form is the plan-locked preference. The `U-m3-013` rename and the `lib/data.ts` comment fix may also be folded into commit 1 if the BUILDER prefers a single commit — but keeping the test-ID rename legible as its own `fix(m4g):` commit is the plan-locked preference so the EVALUATOR's test-integrity review can see it cleanly. **What is NOT acceptable:** a commit that touches `lib/types.ts` or the reducer (out of scope), or one that re-adds any deleted prop.

Commit prefixes per ADR-027: deletions are a refactor with no bug → `feat(m4g):` (`refactor` is not in the ADR-027 table; ADR-027 maps green/non-test work to `feat`/`fix`). The test-ID rename + comment fix is corrective → `fix(m4g):`.

### Decisions to honor

- **ADR-043** — the controlling decision. M4g finishes the cleanup ADR-043's M4f implementation deferred. No superseding, no new ADR.
- **M4f locked schema** (plan.md § "Locked schema, post-M4f") — `Brick` / `AppState` / `Action` are **untouched**. M4g must not modify `lib/types.ts` or `lib/data.ts`'s reducer logic (only the one `findUnitsBrickById` comment line).
- **ADR-027** — commit prefixes: `docs(plan-m4g):` for this plan, `docs(tests-m4g):` for the tests dispatch, `feat(m4g):` / `fix(m4g):` for BUILDER commits.
- **ADR-041** — no Gate #1; VERIFIER audits this plan + the m4g tests before BUILDER. One human gate (preview) only.

### Risks

- **R1 — A prop that looks dead is secretly threaded live.** Mitigation: the pre-edit grep returns zero call-site hits, but the **binding** proof is `npx tsc --noEmit` (zero errors) plus the **full** Vitest suite green. The BUILDER must run both and treat any new error/failure as a finding to investigate — never re-add a prop to silence the build, never `// @ts-expect-error` around it. The spec's edge case is explicit: any failure "reveals a prop that was secretly live and must be investigated, not silently deleted."
- **R2 — `running` vs `runningTimerBrickId` mismatch.** Already resolved (delete `running` on BrickChip). Called out so the VERIFIER does not flag a spec↔plan inconsistency: it is a deliberate, documented reconciliation of an imprecise spec Inputs line, not scope creep.
- **R3 — Grep verification false positives.** AC #4's grep will hit kept history comments. Mitigation: the verification grep must be read as "zero hits in non-comment source," with the history comments (SG-m4g-02) and `docs/` / `CHANGELOG.md` explicitly excluded — as AC #4 itself states.
- **R4 — Lint warning budget.** AC #7 caps lint at ≤13 warnings. Removing unused prop declarations can only reduce or hold the warning count. No risk of exceeding the budget; the BUILDER confirms via `npm run lint`.

### Out of scope

- Any schema change (`Brick` / `AppState` / `Action` unions — M4f-locked, untouched).
- Any new component, new prop, or new behavior.
- Any edit-mode or delete behavior — that is **M5**, which M4g deliberately precedes so the dead props do not entangle M5's rewiring.
- Refactoring component internals beyond deleting the unused prop declarations (no destructure changes are even needed — they already omit the dead props).
- Deleting the one-line history/migration comments (SG-m4g-02: they stay).
- Replacing the `chime.mp3` placeholder, vacuous-pass cleanup, or any other open `docs/status.md` loop — none is in M4g's scope.
- A new ADR — none is needed; ADR-043 governs.

### ADR needed

None. ADR-043 (Accepted 2026-05-14) controls. M4g is pure subtraction with no decision surface beyond SG-m4g-01 and SG-m4g-02, both resolved above.

---
