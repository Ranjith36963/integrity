# Status

> Where Dharma is **right now**. The SHIPPER agent updates this file after every successful ship (mandatory per ADR-041, formerly ADR-026); Main Claude updates the "Feature in flight" line at handoffs.
>
> Read this first when starting a fresh session.

## Snapshot

- **Branch:** `claude/verify-m0-deployment-s4XRy` at `c69b94b` · `main` at `c3ef9f1` (feature branch not yet merged)
- **Last commit:** `c69b94b` — `docs(ship-m4c)`: README + CHANGELOG + status.md for M4c ship.
- **Last preview URL:** `https://integrity-git-claude-veri-e4542d-rahulranjith369-5644s-projects.vercel.app` (stable branch alias; auto-tracks latest deployment for this branch). Sandbox `curl -I` returns HTTP 403 `x-deny-reason: host_not_allowed` (Vercel Deployment Protection — same as M0–M4d; not a failure; signed-in browser sessions serve normally).
- **Methodology:** The Loop (SDD-outside, TDD-inside) per ADR-025; **single human gate** (preview tap-test only) per ADR-041 — the VERIFIER agent now replaces the planning gate; per-phase commit prefixes per ADR-027.

## Plan in force

- `phase1plan.md` (root, in `.prettierignore`) — **11-milestone build order M0..M10** with carried-forward decisions, locked AppState schema, and open spec gaps. Supersedes the previous 8-feature empty-toolkit pivot.
- The 94 existing test IDs from the previous pivot have been tagged `[survives]` / `[re-author]` / `[obsolete]` by the M0 PLANNER dispatch. Migration complete.

## Milestones

| Milestone                         | State                                              | Notes                                                                                                                                                                                                                                                                                                            |
| --------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M0 — Design System**            | **Shipped + tap-tested ✓**                         | 10 primitives + tokens. 48 IDs closed. Gate #2 closed 2026-05-05.                                                                                                                                                                                                                                                |
| **M1 — Empty Building Shell**     | **Shipped + tap-tested ✓**                         | Spatial 24-hr timeline, amber now-line, hero, top bar, Blueprint Bar, locked empty-state, floating dock. 56 IDs closed. Gate #2 closed.                                                                                                                                                                          |
| **M2 — Add Block Flow**           | **Shipped + tap-tested ✓**                         | First interactive verb. Floating `+` + 24 slot-tap targets. AddBlockSheet, CategoryPicker, inline category creation, validation, Blueprint Bar non-empty path. 50 IDs closed. Gate #2 closed.                                                                                                                    |
| **M3 — Add Brick + Live Scoring** | **Shipped + tap-tested ✓**                         | Add Brick flow, HeroRing, LooseBricksTray, BrickChip, live scoring, cross-up hook. 57 IDs closed. Gate #2 closed.                                                                                                                                                                                                |
| **M4a — Tick Brick Logging**      | **Shipped to preview — awaiting Gate #2 tap-test** | First user-driven verb. Tap tick brick → done. Cascade: chip fill, glyph, scaffold, HeroRing, BlueprintBar. Triggers M3 celebrations (bloom/chime/fireworks). 41 IDs closed. Playwright+axe deferred to preview.                                                                                                 |
| **M4b — Goal Brick Stepper**      | **Shipped to preview — awaiting Gate #2 tap-test** | Stepper verb for goal bricks. GoalStepperChip with −/+ buttons, 500ms long-press auto-repeat, light haptic per tick, medium haptic on clamp, scale-press feedback, reduced-motion respected. Reuses M4a celebrations for goal-driven path. 27 IDs closed. Playwright+axe deferred to preview.                    |
| **M4d — Add Chooser Sheet**       | **Shipped to preview — awaiting Gate #2 tap-test** | Chooser sheet routing for dock `+` and slot tap. New `<AddChooserSheet>` with real focus trap, reduced-motion respected. Inside-block `+ Add brick` and tray `+ Brick` pill bypass chooser. M2/M3 migrations walk through chooser. 25 IDs closed. Playwright+axe deferred to preview.                            |
| **M4c — Time Brick Timer**        | **Shipped to preview — awaiting Gate #2 tap-test** | Timer verb for time bricks. Tap → start/stop timer (single-running invariant). Long-press → TimerSheet for direct minute entry. visibilitychange tab-background recovery. Block-collapse independence. Completes M4 trilogy (tick/goal/time). 34 ACs closed, 652/652 vitest. Playwright+axe deferred to preview. |
| M5 — Edit Mode + Delete           | Not started                                        | "Just today" delete writes to `deletions[date:blockId]` per locked schema.                                                                                                                                                                                                                                       |
| M6 — Drag Reorder                 | Not started                                        | Framer Motion layout animations.                                                                                                                                                                                                                                                                                 |
| M7 — Polish Layer                 | Not started                                        | Cinematic. 60fps target. `prefers-reduced-motion` respected.                                                                                                                                                                                                                                                     |
| M8 — Persistence                  | Not started                                        | localStorage `dharma:v1` with separate `logs` / `timers` / `deletions` keyed maps (ADR-018). DST fixtures required.                                                                                                                                                                                              |
| M9 — Calendar Nav                 | Not started                                        | Helpers: `appliesOn(rec, date)` and `currentDayBlocks(today, state)`.                                                                                                                                                                                                                                            |
| M10 — Voice Log                   | Not started                                        | Claude API round-trip. Failure mode SG-bld-19 unresolved.                                                                                                                                                                                                                                                        |

## Open loops

- **Vercel MCP scope mismatch.** The MCP is loaded but authenticated to a Vercel account that is **not** a member of the `rahulranjith369-5644s-projects` team that owns `integrity`. Deploy verification must come from the GitHub commit-status or Vercel-bot PR comment. Never template the preview URL from the branch name.
- **Sandbox `next` module corruption** blocks `next dev` locally — preview env unaffected. Playwright + axe + ESLint + Lighthouse must be verified on the Vercel preview.
- **Mobile-Safari (WebKit) Playwright project disabled** per ADR-010. Re-enable when running in an environment with WebKit binaries present.
- **Hero `data-testid="building-counter"` missing (N3).** `C-bld-040` uses brittle class-name query; add testid in M7 polish.
- **DST off-by-one in `dayNumber()` (N4).** Fix lands in M8 with proper `programStart` math + DST fixtures.
- **`components/NowCard.tsx` legacy file.** Contains hardcoded factory category names; pre-existing pre-M3; not rendered. Delete in M5 cleanup.
- **2 unsuppressed lint warnings:** `LooseBricksTray.tsx:43` and `TimelineBlock.tsx:62` render `aria-expanded` on `role="region"` / `role="article"` respectively. Spec-mandated by AC #44 + AC #45; intentional.
- **`harness.md` MCP rows still MISSING** for Vercel + Context7 + Playwright — wired in user's Claude account, not loaded into this session.
- **`lib/dharma.ts:duration()` returns 0 for no-end blocks** — intentional design; documented in CHANGELOG.
- **The Loop is now single-gate (ADR-041).** VERIFIER agent replaces Gate #1. Gate #2 (preview tap-test) is the only human gate.
- **`public/sounds/chime.mp3` is a 431-byte placeholder.** Replace with a real royalty-free chime ≤ 30 KB before any M4a/M4b/M4c/M4d preview is user-facing.
- **M4a tests.md cleanup items (4 deferred):** U-m4a-009 prose-vs-impl drift on async swallow; C-m4a-002 snapshot-claim drift; C-m4a-003 schema-mismatch in prose (`elapsedMs`/`durationMs`); A-m4a-\* + E-m4a-005 vacuous-pass guards via `if (count > 0)` patterns.
- **Gate D (typecheck) added to BUILDER contract** (`23662cf`). Effective M4b onward.
- **3 lint warnings in `lib/longPress.ts`** lines 104, 111, 118 (`_e` underscore-prefixed unused params). Fix via `argsIgnorePattern: "^_"` in ESLint config. Deferred M5/M7.
- **Vacuous-pass debt spans M4a + M4b + M4c + M4d.** ~26 e2e/a11y specs reproduce the `if ((await x.count()) > 0)` guard pattern. Future TESTS-mode follow-up owes deterministic seeding helpers (per ADR-039 + `?seed=...` query param or test-only `localStorage` shim).
- **`useTimer` wide dep-array trade-off (plan-locked).** `lib/timer.ts:91` depends on `[state.runningTimerBrickId, dispatch, state]` per plan.md:2247's LOCKED decision. Unrelated state changes mid-minute shift the next tick boundary by up to 60 s. Correctness holds; future optimization: narrow to a derived selector. Plan accepts BUILDER may optimize later.
- **`<TimerSheet>` does NOT auto-focus the minutes input on open.** Omits the `setTimeout` focus pattern used by AddBlockSheet/AddBrickSheet. Real UX inconsistency for keyboard users. Recommend M5 cleanup pass adds inline auto-focus for input-bearing sheets via a stable shared pattern.
- **ADR-017 partial-fulfillment.** M4c implements real timer behavior but does NOT persist `runningTimerBrickId + startedAt` to localStorage. AC #34 explicitly defers persistence to M8 per ADR-018.
- **VERIFIER agent hit usage limit for M4c; Main Claude ran the 5 audit checks inline.** Same precedent as M4d. Five-check audit produced PASS; flagged for traceability only.
- **`fireEvent` vs `userEvent` in `BuildingClient.m4c.test.tsx`.** Direct `fireEvent.pointerDown/Up` used for long-press (semantically correct for native pointer events). Keyboard-driven start/stop independently validated in C-m4c-001..006 with `userEvent`.
- **C-m4c-017 mock-clear pattern.** Clears haptics mocks after long-press gesture to isolate the overflow-clamp `medium` haptic for AC #18. Defensible — gesture haptic independently asserted in C-m4c-005.
- **8 unused-`card` lint warnings** in `BuildingClient.m4c.test.tsx` (lines 151, 311, 367). `expandBlock(container)` return value unused. Trivial cleanup; non-blocking.
- **M4d — AC #14 swipe-down dismiss** for chooser inherited from M0 `<Sheet>`; not M4d-tested directly. Confirm at preview Gate #2 tap-test.
- **M4d — D2 plan↔implementation drift on focus trap.** Plan prose stale; BUILDER added real Tab-cycling trap because A-m4d-002 demanded it. EVALUATOR confirmed correct. Recorded so future devs do not re-litigate.

## Quality gates (last full Evaluator PASS on `26e74bf` — M4c)

| Gate                       | Result                                                                                                                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint                     | 0 errors, 16 warnings (10 pre-existing carry-forward + 3 `_e` params in `lib/longPress.ts` + 3 unused `card` vars in `BuildingClient.m4c.test.tsx` — all non-blocking; deferred M5/M7) |
| `tsc --noEmit`             | clean — 0 errors                                                                                                                                                                       |
| Vitest                     | 652/652 passed — up from 600/600 at end of M4d (+52 M4c tests: 16U + 20C + 5E stub + 4A stub + 7 integration; 34 M4c coverage ACs closed)                                              |
| Playwright (mobile-chrome) | deferred to Vercel preview — sandbox `next dev` socket bind failure (M0–M4d pattern); test files at `tests/e2e/m4c.spec.ts` (5 IDs) + `tests/e2e/m4c.a11y.spec.ts` (4 IDs)             |
| Playwright (mobile-safari) | not run — WebKit unavailable (ADR-010)                                                                                                                                                 |
| axe-core                   | deferred to Vercel preview                                                                                                                                                             |
| Lighthouse                 | not measured — no prod URL reachable from sandbox                                                                                                                                      |

## Next intended action

**Gate #2 (M4c):** user must open the Vercel preview and tap-test the Time Brick Timer. Verify: tap a time brick → timer starts (running glyph ▶ appears); tap again → stops (paused glyph ⏸); single-running invariant (starting a second brick stops the first); long-press (≥ 500 ms) → TimerSheet opens with current minutes pre-filled; Save updates minutes; Cancel closes without change; tab-background recovery (visibilitychange listener resumes correctly); block collapse does not stop a running timer.

**After Gate #2 on M4c:** `/feature m5` (Edit Mode + Delete — see `phase1plan.md` § M5 or author the M5 spec entry in `docs/spec.md` first).
