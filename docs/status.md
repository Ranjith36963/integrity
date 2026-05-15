# Status

> Where Dharma is **right now**. The SHIPPER agent updates this file after every successful ship (mandatory per ADR-041, formerly ADR-026); Main Claude updates the "Feature in flight" line at handoffs.
>
> Read this first when starting a fresh session.

## Snapshot

- **Branch:** `claude/verify-m0-deployment-s4XRy` at `<ship-commit-sha>` · `main` at `c3ef9f1` (feature branch not yet merged)
- **Last ship:** M4f — Collapse to two brick kinds; rip the timer — branch `claude/verify-m0-deployment-s4XRy`.
- **Last preview URL:** `https://integrity-git-claude-veri-e4542d-rahulranjith369-5644s-projects.vercel.app` (stable branch alias; auto-tracks latest deployment for this branch). Sandbox `curl -I` returns HTTP 403 `x-deny-reason: host_not_allowed` (Vercel Deployment Protection — same as M0–M4f; not a failure; signed-in browser sessions serve normally).
- **Methodology:** The Loop (SDD-outside, TDD-inside) per ADR-025; **single human gate** (preview tap-test only) per ADR-041 — the VERIFIER agent now replaces the planning gate; per-phase commit prefixes per ADR-027.

## Plan in force

- `phase1plan.md` (root, in `.prettierignore`) — **11-milestone build order M0..M10** with carried-forward decisions, locked AppState schema, and open spec gaps. Supersedes the previous 8-feature empty-toolkit pivot.
- The 94 existing test IDs from the previous pivot have been tagged `[survives]` / `[re-author]` / `[obsolete]` by the M0 PLANNER dispatch. Migration complete.

## Milestones

| Milestone                          | State                                              | Notes                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M0 — Design System**             | **Shipped + tap-tested**                           | 10 primitives + tokens. 48 IDs closed. Gate #2 closed 2026-05-05.                                                                                                                                                                                                                                                                                                                                        |
| **M1 — Empty Building Shell**      | **Shipped + tap-tested**                           | Spatial 24-hr timeline, amber now-line, hero, top bar, Blueprint Bar, locked empty-state, floating dock. 56 IDs closed. Gate #2 closed.                                                                                                                                                                                                                                                                  |
| **M2 — Add Block Flow**            | **Shipped + tap-tested**                           | First interactive verb. Floating `+` + 24 slot-tap targets. AddBlockSheet, CategoryPicker, inline category creation, validation, Blueprint Bar non-empty path. 50 IDs closed. Gate #2 closed.                                                                                                                                                                                                            |
| **M3 — Add Brick + Live Scoring**  | **Shipped + tap-tested**                           | Add Brick flow, HeroRing, LooseBricksTray, BrickChip, live scoring, cross-up hook. 57 IDs closed. Gate #2 closed.                                                                                                                                                                                                                                                                                        |
| **M4a — Tick Brick Logging**       | **Shipped to preview — awaiting Gate #2 tap-test** | First user-driven verb. Tap tick brick → done. Cascade: chip fill, glyph, scaffold, HeroRing, BlueprintBar. Triggers M3 celebrations (bloom/chime/fireworks). 41 IDs closed. Playwright+axe deferred to preview.                                                                                                                                                                                         |
| **M4b — Goal Brick Stepper**       | **Shipped to preview — awaiting Gate #2 tap-test** | Stepper verb for goal bricks. GoalStepperChip with −/+ buttons, 500ms long-press auto-repeat, light haptic per tick, medium haptic on clamp, scale-press feedback, reduced-motion respected. Reuses M4a celebrations for goal-driven path. 27 IDs closed. Playwright+axe deferred to preview.                                                                                                            |
| **M4d — Add Chooser Sheet**        | **Shipped to preview — awaiting Gate #2 tap-test** | Chooser sheet routing for dock `+` and slot tap. New `<AddChooserSheet>` with real focus trap, reduced-motion respected. Inside-block `+ Add brick` and tray `+ Brick` pill bypass chooser. M2/M3 migrations walk through chooser. 25 IDs closed. Playwright+axe deferred to preview.                                                                                                                    |
| **M4c — Time Brick Timer**         | **Retired by M4f (ADR-043)**                       | Timer verb for time bricks (M4c) was shipped to preview; the time kind and all timer infrastructure were removed in M4f per ADR-043. M4c test IDs (25) explicitly retired in tests.md.                                                                                                                                                                                                                   |
| **M4e — Brick Duration + Overlap** | **Shipped to preview — awaiting Gate #2 tap-test** | Universal `hasDuration` toggle on every brick kind. `lib/overlap.ts` half-open overlap engine. Overlap warning chip in AddBrickSheet + AddBlockSheet with Save-disable. `<TimedLooseBrickCard>`, `<BrickChip>` time-window badge. `selectTimelineItems` + `selectTrayBricks` selectors. ADR-042 locked. M2 block↔block enforcement closed retroactively. 731/731 vitest. 9 e2e/a11y deferred to preview. |
| **M4f — Brick Model Rework**       | **Shipped to preview — awaiting Gate #2 tap-test** | Collapsed bricks to two kinds (tick + units, free-text unit); removed M4c timer; manual-number entry via UnitsEntrySheet. `kind:"goal"`→`units`; `count`→`done`; `kind:"time"` removed; `runningTimerBrickId` removed; 4 timer actions + `LOG_GOAL_BRICK` removed; `SET_UNITS_DONE` added. 682/682 vitest across 56 files. 44 M4f IDs added; 25 M4c IDs retired. ADR-043.                                |
| M5 — Edit Mode + Delete            | Not started                                        | "Just today" delete writes to `deletions[date:blockId]` per locked schema.                                                                                                                                                                                                                                                                                                                               |
| M6 — Drag Reorder                  | Not started                                        | Framer Motion layout animations.                                                                                                                                                                                                                                                                                                                                                                         |
| M7 — Polish Layer                  | Not started                                        | Cinematic. 60fps target. `prefers-reduced-motion` respected.                                                                                                                                                                                                                                                                                                                                             |
| M8 — Persistence                   | Not started                                        | localStorage `dharma:v1` with separate `logs` / `timers` / `deletions` keyed maps (ADR-018). DST fixtures required.                                                                                                                                                                                                                                                                                      |
| M9 — Calendar Nav                  | Not started                                        | Helpers: `appliesOn(rec, date)` and `currentDayBlocks(today, state)`.                                                                                                                                                                                                                                                                                                                                    |
| M10 — Voice Log                    | Not started                                        | Claude API round-trip. Failure mode SG-bld-19 unresolved.                                                                                                                                                                                                                                                                                                                                                |

## Open loops

- **Vercel MCP scope mismatch.** The MCP is loaded but authenticated to a Vercel account that is **not** a member of the `rahulranjith369-5644s-projects` team that owns `integrity`. Deploy verification must come from the GitHub commit-status or Vercel-bot PR comment. Never template the preview URL from the branch name.
- **Sandbox `next` module corruption** blocks `next dev` locally — preview env unaffected. Playwright + axe + ESLint + Lighthouse must be verified on the Vercel preview.
- **Mobile-Safari (WebKit) Playwright project disabled** per ADR-010. Re-enable when running in an environment with WebKit binaries present.
- **Hero `data-testid="building-counter"` missing (N3).** `C-bld-040` uses brittle class-name query; add testid in M7 polish.
- **DST off-by-one in `dayNumber()` (N4).** Fix lands in M8 with proper `programStart` math + DST fixtures.
- **2 unsuppressed lint warnings:** `LooseBricksTray.tsx:43` and `TimelineBlock.tsx:62` render `aria-expanded` on `role="region"` / `role="article"` respectively. Spec-mandated by AC #44 + AC #45; intentional.
- **`harness.md` MCP rows still MISSING** for Vercel + Context7 + Playwright — wired in user's Claude account, not loaded into this session.
- **`lib/dharma.ts:duration()` returns 0 for no-end blocks** — intentional design; documented in CHANGELOG.
- **The Loop is now single-gate (ADR-041).** VERIFIER agent replaces Gate #1. Gate #2 (preview tap-test) is the only human gate.
- **`public/sounds/chime.mp3` is a 431-byte placeholder (SG-m4f-05).** Replace with a real royalty-free chime before any M4a/M4b/M4c/M4d/M4f preview is user-facing. M4f kept the chime but did not replace the placeholder — M7 concern.
- **Vacuous-pass debt: ~35 post-M4f.** 9 new deferred-to-preview items (E-m4f-001..005, A-m4f-001..004); 9 M4c deferred items retired with `tests/e2e/m4c.*.spec.ts` deletions → net flat. Deterministic-seed helper still owed (ADR-022 + ADR-039).
- **`BrickBase` type module-private to `lib/types.ts`.** AddBrickSheet uses `as const` literals. Log if a third surface needs the shape.
- **`Timeline.tsx` prop rename `blocks → items: TimelineItem[]`.** All internal call sites migrated (`BuildingClient.tsx`, both Timeline test files).
- **C-m4e-030 shares green commit with C-m4e-027..029.** Defensible per M4c precedent; minor ADR-027 one-green-per-ID deviation.
- **`@deprecated` dead props on `<TimelineBlock>` and peer components** (`<Timeline>`, `<LooseBricksTray>`, `<BrickChip>`, `<TimedLooseBrickCard>`) — `runningTimerBrickId`, `onTimerToggle`, `onTimerOpenSheet`, `onUnitsLog`, `onGoalLog` — kept as inert prop-shape cruft. Flag for M5 decision: drop them once no caller passes them.
- **JC1 (non-blocking):** `lib/blockValidation.test.ts:199` `describe` is labelled `U-m4f-016` but tests `isValidBrickUnitsTarget`; tests.md's `U-m4f-016` classic-overlap G/W/T is covered under `U-m2-004`. Cosmetic label hygiene — fix in M5 cleanup.
- **JC2 (non-blocking):** `C-m4f-013`/`C-m4f-014` are inline `it()` blocks inside the `C-m3-014` describe rather than standalone — acceptable, IDs traceable by test-name annotation.
- **Cosmetic:** `lib/data.ts:45` has a doc comment referencing the deleted `lib/timer.ts` (`findTimeBrickById`) — harmless, clean up opportunistically.
- **3 lint warnings in `lib/longPress.ts`** (lines 104, 111, 118) — `_e` underscore-prefixed unused params. Fix via `argsIgnorePattern: "^_"`. Deferred M5/M7.

**Resolved by M4f (closed loops):**

- `useTimer` exhaustive-deps lint warning — file deleted.
- `<TimerSheet>` auto-focus UX inconsistency — file deleted.
- `lib/blockValidation.ts:overlapsExistingBlock` dead production code — deleted in M4f.
- M4f architectural rework open loop — shipped.

## Quality gates (last full Evaluator PASS on `d4e83c8` — M4f, retry 1)

| Gate                       | Result                                                                                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint                     | 0 errors, 13 warnings (down from 16 at M4c baseline; 3 resolved with M4f deletions; all non-blocking; deferred M5/M7)                                                      |
| `tsc --noEmit`             | clean — 0 errors                                                                                                                                                           |
| Vitest                     | 682/682 passed across 56 files (was 731/731 at end of M4e; net: 44 M4f IDs added, 25 M4c IDs retired, dead test files deleted)                                             |
| Playwright (mobile-chrome) | deferred to Vercel preview — sandbox `next dev` socket bind failure (M0–M4f pattern); test files at `tests/e2e/m4f.spec.ts` (5 IDs) + `tests/e2e/m4f.a11y.spec.ts` (4 IDs) |
| Playwright (mobile-safari) | not run — WebKit unavailable (ADR-010)                                                                                                                                     |
| axe-core                   | deferred to Vercel preview                                                                                                                                                 |
| Lighthouse                 | not measured — no prod URL reachable from sandbox                                                                                                                          |

## Next intended action

**Gate #2 (M4f):** user must open the Vercel preview and tap-test M4f. Verify: kind selector shows exactly "Tick" and "Units" chips (no "Time"); tapping a units brick chip opens `<UnitsEntrySheet>` with the brick name, "Today's \<unit\>" sub-heading, and a pre-filled numeric input; saving dispatches and closes the sheet; tapping a tick chip toggles done directly without opening a sheet; no live timer anywhere; block/day chimes still play on completion.

**After Gate #2 on M4f:** author M5 spec entry in `docs/spec.md` (edit mode + delete: "just today" delete, `deletions[date:blockId]` per locked schema), then `/feature m5`.
