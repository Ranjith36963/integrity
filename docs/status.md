# Status

> Where Dharma is **right now**. The SHIPPER agent updates this file after every successful ship (mandatory per ADR-041, formerly ADR-026); Main Claude updates the "Feature in flight" line at handoffs.
>
> Read this first when starting a fresh session.

## Snapshot

- **Branch:** `claude/verify-m0-deployment-s4XRy` at `d6ede95` · `main` at `c3ef9f1` (feature branch not yet merged)
- **Last commit:** `d6ede95` — M4a ship (docs: CHANGELOG + README + status.md). Implementation HEAD: `23662cf`.
- **Last preview URL:** `https://integrity-git-claude-veri-e4542d-rahulranjith369-5644s-projects.vercel.app` (stable branch alias; auto-tracks latest deployment for this branch). Sandbox `curl -I` returns HTTP 403 `x-deny-reason: host_not_allowed` (Vercel Deployment Protection — same as M0/M1/M2/M3; not a failure; signed-in browser sessions serve normally).
- **Methodology:** The Loop (SDD-outside, TDD-inside) per ADR-025; **single human gate** (preview tap-test only) per ADR-041 — the VERIFIER agent now replaces the planning gate; per-phase commit prefixes per ADR-027.

## Plan in force

- `phase1plan.md` (root, in `.prettierignore`) — **11-milestone build order M0..M10** with carried-forward decisions, locked AppState schema, and open spec gaps. Supersedes the previous 8-feature empty-toolkit pivot.
- The 94 existing test IDs from the previous pivot have been tagged `[survives]` / `[re-author]` / `[obsolete]` by the M0 PLANNER dispatch. Migration complete.

## Milestones

| Milestone                         | State                                              | Notes                                                                                                                                                                                                            |
| --------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M0 — Design System**            | **Shipped + tap-tested ✓**                         | 10 primitives + tokens. 48 IDs closed. Gate #2 closed 2026-05-05.                                                                                                                                                |
| **M1 — Empty Building Shell**     | **Shipped + tap-tested ✓**                         | Spatial 24-hr timeline, amber now-line, hero, top bar, Blueprint Bar, locked empty-state, floating dock. 56 IDs closed. Gate #2 closed.                                                                          |
| **M2 — Add Block Flow**           | **Shipped + tap-tested ✓**                         | First interactive verb. Floating `+` + 24 slot-tap targets. AddBlockSheet, CategoryPicker, inline category creation, validation, Blueprint Bar non-empty path. 50 IDs closed. Gate #2 closed.                    |
| **M3 — Add Brick + Live Scoring** | **Shipped + tap-tested ✓**                         | Add Brick flow, HeroRing, LooseBricksTray, BrickChip, live scoring, cross-up hook. 57 IDs closed. Gate #2 closed.                                                                                                |
| **M4a — Tick Brick Logging**      | **Shipped to preview — awaiting Gate #2 tap-test** | First user-driven verb. Tap tick brick → done. Cascade: chip fill, glyph, scaffold, HeroRing, BlueprintBar. Triggers M3 celebrations (bloom/chime/fireworks). 41 IDs closed. Playwright+axe deferred to preview. |
| M4b — Goal Stepper                | Not started — next up                              | Stepper verb for goal bricks. Target: increment/decrement `count` toward `target`; cross-up celebrations.                                                                                                        |
| M4c — Time Timer                  | Not started                                        | Timer verb for time bricks. Real countdown timer per ADR-017.                                                                                                                                                    |
| M5 — Edit Mode + Delete           | Not started                                        | "Just today" delete writes to `deletions[date:blockId]` per locked schema.                                                                                                                                       |
| M6 — Drag Reorder                 | Not started                                        | Framer Motion layout animations.                                                                                                                                                                                 |
| M7 — Polish Layer                 | Not started                                        | Cinematic. 60fps target. `prefers-reduced-motion` respected.                                                                                                                                                     |
| M8 — Persistence                  | Not started                                        | localStorage `dharma:v1` with separate `logs` / `timers` / `deletions` keyed maps (ADR-018). DST fixtures required.                                                                                              |
| M9 — Calendar Nav                 | Not started                                        | Helpers: `appliesOn(rec, date)` and `currentDayBlocks(today, state)`.                                                                                                                                            |
| M10 — Voice Log                   | Not started                                        | Claude API round-trip. Failure mode SG-bld-19 unresolved.                                                                                                                                                        |

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
- **NEW (M4a): 4 tests.md cleanup items deferred from M4a EVALUATOR:** U-m4a-009 prose-vs-impl drift on async swallow; C-m4a-002 snapshot-claim drift; C-m4a-003 schema-mismatch in prose (`elapsedMs`/`durationMs`); A-m4a-\* + E-m4a-005 vacuous-pass guards via `if (count > 0)` patterns. Address in next planner cycle (M4b TESTS dispatch may roll them in).
- **NEW (M4a): Gate D (typecheck) added to BUILDER contract** (`23662cf`). Effective M4b onward; closed the M4a-first-attempt gap where Vitest passed but `tsc` reported 6 net-new errors.

## Quality gates (last full Evaluator PASS on `23662cf` — M4a)

| Gate                       | Result                                                                                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint                     | 0 errors, 7 warnings (all pre-existing M0–M3 carry-forward; zero new warnings from M4a)                                                                                    |
| `tsc --noEmit`             | clean — 0 errors (G1 resolved via `asTick` helper in `lib/data.test.ts`)                                                                                                   |
| Vitest                     | 531/531 passed (50 files) — up from 501/501 at end of M3                                                                                                                   |
| Playwright (mobile-chrome) | deferred to Vercel preview — sandbox `next dev` socket bind failure (M0–M3 pattern); test files at `tests/e2e/m4a.spec.ts` (10 IDs) + `tests/e2e/m4a.a11y.spec.ts` (6 IDs) |
| Playwright (mobile-safari) | not run — WebKit unavailable (ADR-010)                                                                                                                                     |
| axe-core                   | deferred to Vercel preview                                                                                                                                                 |
| Lighthouse                 | not measured — no prod URL reachable from sandbox                                                                                                                          |

## Next intended action

**Gate #2:** user must open the M4a Vercel preview and tap-test Tick Brick Logging. Verify: tap a tick brick → chip fill animates 0 → 100%, glyph swaps ☐ → ✓, block scaffold bar grows, HeroRing arc updates, BlueprintBar opacity updates; block at 100% triggers bloom + chime + haptic; day at 100% triggers fireworks overlay + chime + haptic; reduced-motion collapses animations to instant; chime NOTE: audio is a placeholder (431-byte silence) until replaced.

**After Gate #2:** author M4b SPEC entry (goal stepper) in `/docs/spec.md`, then invoke `/feature m4b`.
