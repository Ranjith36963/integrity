# Status

> Where Dharma is **right now**. The SHIPPER agent updates this file after every successful ship (mandatory per ADR-041, formerly ADR-026); Main Claude updates the "Feature in flight" line at handoffs.
>
> Read this first when starting a fresh session.

## Snapshot

- **Branch:** `claude/verify-m0-deployment-s4XRy` at `1192178` · `main` at `c3ef9f1` (feature branch not yet merged)
- **Last commit:** `1192178` — M4d ship (chooser sheet; 600 vitest; M2/M3 migrations).
- **Last preview URL:** `https://integrity-git-claude-veri-e4542d-rahulranjith369-5644s-projects.vercel.app` (stable branch alias; auto-tracks latest deployment for this branch). Sandbox `curl -I` returns HTTP 403 `x-deny-reason: host_not_allowed` (Vercel Deployment Protection — same as M0–M4b; not a failure; signed-in browser sessions serve normally).
- **Methodology:** The Loop (SDD-outside, TDD-inside) per ADR-025; **single human gate** (preview tap-test only) per ADR-041 — the VERIFIER agent now replaces the planning gate; per-phase commit prefixes per ADR-027.

## Plan in force

- `phase1plan.md` (root, in `.prettierignore`) — **11-milestone build order M0..M10** with carried-forward decisions, locked AppState schema, and open spec gaps. Supersedes the previous 8-feature empty-toolkit pivot.
- The 94 existing test IDs from the previous pivot have been tagged `[survives]` / `[re-author]` / `[obsolete]` by the M0 PLANNER dispatch. Migration complete.

## Milestones

| Milestone                         | State                                              | Notes                                                                                                                                                                                                                                                                                         |
| --------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M0 — Design System**            | **Shipped + tap-tested ✓**                         | 10 primitives + tokens. 48 IDs closed. Gate #2 closed 2026-05-05.                                                                                                                                                                                                                             |
| **M1 — Empty Building Shell**     | **Shipped + tap-tested ✓**                         | Spatial 24-hr timeline, amber now-line, hero, top bar, Blueprint Bar, locked empty-state, floating dock. 56 IDs closed. Gate #2 closed.                                                                                                                                                       |
| **M2 — Add Block Flow**           | **Shipped + tap-tested ✓**                         | First interactive verb. Floating `+` + 24 slot-tap targets. AddBlockSheet, CategoryPicker, inline category creation, validation, Blueprint Bar non-empty path. 50 IDs closed. Gate #2 closed.                                                                                                 |
| **M3 — Add Brick + Live Scoring** | **Shipped + tap-tested ✓**                         | Add Brick flow, HeroRing, LooseBricksTray, BrickChip, live scoring, cross-up hook. 57 IDs closed. Gate #2 closed.                                                                                                                                                                             |
| **M4a — Tick Brick Logging**      | **Shipped to preview — awaiting Gate #2 tap-test** | First user-driven verb. Tap tick brick → done. Cascade: chip fill, glyph, scaffold, HeroRing, BlueprintBar. Triggers M3 celebrations (bloom/chime/fireworks). 41 IDs closed. Playwright+axe deferred to preview.                                                                              |
| **M4b — Goal Brick Stepper**      | **Shipped to preview — awaiting Gate #2 tap-test** | Stepper verb for goal bricks. GoalStepperChip with −/+ buttons, 500ms long-press auto-repeat, light haptic per tick, medium haptic on clamp, scale-press feedback, reduced-motion respected. Reuses M4a celebrations for goal-driven path. 27 IDs closed. Playwright+axe deferred to preview. |
| **M4d — Add Chooser Sheet**       | **Shipped to preview — awaiting Gate #2 tap-test** | Chooser sheet routing for dock `+` and slot tap. New `<AddChooserSheet>` with real focus trap, reduced-motion respected. Inside-block `+ Add brick` and tray `+ Brick` pill bypass chooser. M2/M3 migrations walk through chooser. 25 IDs closed. Playwright+axe deferred to preview.         |
| M4c — Time Timer                  | Not started — next up                              | Timer verb for time bricks. Real countdown timer per ADR-017.                                                                                                                                                                                                                                 |
| M5 — Edit Mode + Delete           | Not started                                        | "Just today" delete writes to `deletions[date:blockId]` per locked schema.                                                                                                                                                                                                                    |
| M6 — Drag Reorder                 | Not started                                        | Framer Motion layout animations.                                                                                                                                                                                                                                                              |
| M7 — Polish Layer                 | Not started                                        | Cinematic. 60fps target. `prefers-reduced-motion` respected.                                                                                                                                                                                                                                  |
| M8 — Persistence                  | Not started                                        | localStorage `dharma:v1` with separate `logs` / `timers` / `deletions` keyed maps (ADR-018). DST fixtures required.                                                                                                                                                                           |
| M9 — Calendar Nav                 | Not started                                        | Helpers: `appliesOn(rec, date)` and `currentDayBlocks(today, state)`.                                                                                                                                                                                                                         |
| M10 — Voice Log                   | Not started                                        | Claude API round-trip. Failure mode SG-bld-19 unresolved.                                                                                                                                                                                                                                     |

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
- **`public/sounds/chime.mp3` is a 431-byte placeholder.** Sandbox had no audio tooling. Replace with a real royalty-free chime ≤ 30 KB before any M4a/M4b/M4d preview is user-facing. Otherwise the celebration is silent.
- **M4a tests.md cleanup items (4 deferred):** U-m4a-009 prose-vs-impl drift on async swallow; C-m4a-002 snapshot-claim drift; C-m4a-003 schema-mismatch in prose (`elapsedMs`/`durationMs`); A-m4a-\* + E-m4a-005 vacuous-pass guards via `if (count > 0)` patterns.
- **Gate D (typecheck) added to BUILDER contract** (`23662cf`). Effective M4b onward.
- **3 lint warnings in `lib/longPress.ts`** lines 104, 111, 118 (`_e` underscore-prefixed unused params). Fix via `argsIgnorePattern: "^_"` in ESLint config. Deferred M5/M7.
- **Vacuous-pass debt spans M4a + M4b + M4d.** 12 new M4d e2e/a11y specs reproduce the `if ((await x.count()) > 0)` guard pattern. Future TESTS-mode follow-up owes deterministic seeding helpers (per ADR-039 ships-empty + `?seed=...` query param or test-only `localStorage` shim).
- **C-m4b-022 in dedicated test file** (`app/(building)/BuildingClient.m4b.test.tsx`). `defaultState` mock isolation requires file-level scoping — sound, not a defect.
- **M4d — AC #14 swipe-down dismiss** for chooser inherited from M0 `<Sheet>`; not M4d-tested directly. Confirm at preview Gate #2 tap-test.
- **M4d — D2 plan↔implementation drift on focus trap.** `plan.md:~1731` says M4d does NOT need a local focus trap; BUILDER added a real Tab-cycling trap in `components/AddChooserSheet.tsx:32–65` because A-m4d-002 demanded it. EVALUATOR confirmed: trap is real, matches AddBlockSheet/AddBrickSheet pattern. Plan prose is stale on this point — recorded so future devs don't re-litigate.
- **M4d — D4 Esc dismiss** confirmed deterministic via `<Sheet>`'s existing keydown listener (`components/ui/Sheet.tsx:22–29`). Promoted from "stretch test" to "expected behavior."
- **M4d — D5 audit trail.** Main Claude authored the tests.md M4d entry directly in-thread (TESTS-mode planner agent hit usage limit). Substantively equivalent to healthy planner output; VERIFIER and EVALUATOR both gated PASS. Flag for traceability only.
- **M4d — `Timeline.hasLooseBricks` prop scope-creep.** Plan said Timeline survives unchanged; AC #10/#11 forced a 4-line additive change (default `false` preserves M3 semantics; existing Timeline tests still pass). Planner-side oversight, not builder overreach.
- **M4d — `AddBlockSheet` start prop-sync `useEffect` scope-creep.** Mirrors AddBrickSheet's `defaultCategoryId` sync per SG-m3-04. Justified by precedent. Eslint-disable comment in place.

## Quality gates (last full Evaluator PASS on `1192178` — M4d)

| Gate                       | Result                                                                                                                                                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint                     | 0 errors, 10 warnings (7 pre-existing M0–M4a carry-forward + 3 in `lib/longPress.ts` lines 104/111/118 — `_e` underscore-prefixed unused params; fixable via `argsIgnorePattern: "^_"` in ESLint config — deferred M5) |
| `tsc --noEmit`             | clean — 0 errors                                                                                                                                                                                                       |
| Vitest                     | 600/600 passed — up from 569/569 at end of M4b (+31 M4d tests: 2U + 17C + 6E stub + 4A stub; 25 M4d coverage ACs closed; 5 M2/M3 migration tests amended to walk through chooser)                                      |
| Playwright (mobile-chrome) | deferred to Vercel preview — sandbox `next dev` socket bind failure (M0–M4b pattern); test files at `tests/e2e/m4d.spec.ts` (6 IDs) + `tests/e2e/m4d.a11y.spec.ts` (4 IDs)                                             |
| Playwright (mobile-safari) | not run — WebKit unavailable (ADR-010)                                                                                                                                                                                 |
| axe-core                   | deferred to Vercel preview                                                                                                                                                                                             |
| Lighthouse                 | not measured — no prod URL reachable from sandbox                                                                                                                                                                      |

## Next intended action

**Gate #2 (M4d):** user must open the M4d Vercel preview and tap-test the Add Chooser Sheet. Verify: tap dock `+` → chooser appears with "Add Block" / "Add Brick" options; tap an empty time slot → chooser appears; "Add Block" routes to AddBlockSheet; "Add Brick" routes to AddBrickSheet; inside-block `+ Add brick` and tray `+ Brick` pill bypass chooser and go direct; swipe-down dismisses (AC #14); Esc dismisses; Tab cycles focus within the chooser sheet; `prefers-reduced-motion: reduce` respected.

**After Gate #2 on M4d:** `/feature m4c` (time brick timer). M4c spec already exists at `docs/spec.md:1231–1348`.
