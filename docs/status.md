# Status

> Where Dharma is **right now**. The SHIPPER agent updates this file after every successful ship (mandatory per ADR-041, formerly ADR-026); Main Claude updates the "Feature in flight" line at handoffs.
>
> Read this first when starting a fresh session.

## Snapshot

- **Branch:** `claude/verify-m0-deployment-s4XRy` at `HEAD` (M4b ship commit) · `main` at `c3ef9f1` (feature branch not yet merged)
- **Last commit:** M4b ship — `docs(ship-m4b): update status.md, CHANGELOG, README for M4b Goal Brick Stepper`. Implementation HEAD: `8a01cd2`.
- **Last preview URL:** `https://integrity-git-claude-veri-e4542d-rahulranjith369-5644s-projects.vercel.app` (stable branch alias; auto-tracks latest deployment for this branch). Sandbox `curl -I` returns HTTP 403 `x-deny-reason: host_not_allowed` (Vercel Deployment Protection — same as M0/M1/M2/M3/M4a; not a failure; signed-in browser sessions serve normally).
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
- **NEW (M4a): `public/sounds/chime.mp3` is a 431-byte placeholder.** Sandbox had no audio tooling. Replace with a real royalty-free chime ≤ 30 KB before the M4a preview is user-facing. Otherwise the celebration is silent.
- **NEW (M4a): 4 tests.md cleanup items deferred from M4a EVALUATOR:** U-m4a-009 prose-vs-impl drift on async swallow; C-m4a-002 snapshot-claim drift; C-m4a-003 schema-mismatch in prose (`elapsedMs`/`durationMs`); A-m4a-\* + E-m4a-005 vacuous-pass guards via `if (count > 0)` patterns. Address in next planner cycle.
- **NEW (M4a): Gate D (typecheck) added to BUILDER contract** (`23662cf`). Effective M4b onward; closed the M4a-first-attempt gap where Vitest passed but `tsc` reported 6 net-new errors.
- **NEW (M4b): 3 new lint warnings** in `lib/longPress.ts` lines 104, 111, 118 (`_e` underscore-prefixed unused params). Fixable by adding `"argsIgnorePattern": "^_"` to `@typescript-eslint/no-unused-vars` rule in ESLint config. Deferred to M5/M7 polish.
- **NEW (M4b): Vacuous-pass guards — acknowledged spanning debt.** M4b e2e specs reproduce the M4a `if ((await x.count()) > 0)` pattern despite the M4b tests.md preamble (line 3232) explicitly promising not to. Spans M4a + M4b. Future TESTS-mode follow-up should land `addInitScript` seeding helpers (per ADR-039 ships-empty + `?seed=...` query param or test-only `localStorage` shim).
- **NEW (M4b): C-m4b-022 in dedicated test file** (`app/(building)/BuildingClient.m4b.test.tsx`). `defaultState` mock isolation requires file-level scoping — sound, not a defect.

## Quality gates (last full Evaluator PASS on `8a01cd2` — M4b)

| Gate                       | Result                                                                                                                                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint                     | 0 errors, 10 warnings (7 pre-existing M0–M4a carry-forward + 3 new in `lib/longPress.ts` lines 104/111/118 — `_e` underscore-prefixed unused params; fixable via `argsIgnorePattern: "^_"` in ESLint config — deferred M5) |
| `tsc --noEmit`             | clean — 0 errors                                                                                                                                                                                                           |
| Vitest                     | 569/569 passed — up from 553/553 at end of M4a (+16 M4b component tests + 14 M4b unit tests — but EVALUATOR reported 553→569; 27 coverage ACs closed)                                                                      |
| Playwright (mobile-chrome) | deferred to Vercel preview — sandbox `next dev` socket bind failure (M0–M4a pattern); test files at `tests/e2e/m4b.spec.ts` (10 IDs) + `tests/e2e/m4b.a11y.spec.ts` (6 IDs)                                                |
| Playwright (mobile-safari) | not run — WebKit unavailable (ADR-010)                                                                                                                                                                                     |
| axe-core                   | deferred to Vercel preview                                                                                                                                                                                                 |
| Lighthouse                 | not measured — no prod URL reachable from sandbox                                                                                                                                                                          |

## Next intended action

**Gate #2 (M4b):** user must open the M4b Vercel preview and tap-test Goal Brick Stepper. Verify: tap `+` on a goal brick → count increments, chip fill updates proportionally; long-press `+` (hold 500ms) → auto-repeats at 50ms ticks; reaching `target` clamps at target (medium haptic); `−` decrements; block at 100% triggers bloom + chime + haptic; day at 100% triggers fireworks overlay + chime + haptic; reduced-motion collapses scale animation to instant (haptics still fire).

**After Gate #2:** author M4c SPEC entry (time timer) in `/docs/spec.md`, then invoke `/feature m4c`.
