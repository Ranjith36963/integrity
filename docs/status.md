# Status

> Where Dharma is **right now**. The SHIPPER agent updates this file after every successful ship (mandatory per ADR-026); Main Claude updates the "Feature in flight" line at handoffs.
>
> Read this first when starting a fresh session.

## Snapshot

- **Branch:** `claude/build-dharma-pwa-8WVNB` at `ed526ba` · `main` at `c3ef9f1` (feature branch not yet merged)
- **Last commit:** `ed526ba` — `docs(harness): apply adr-026 (two gates) and adr-027 (commit prefixes) across the loop`
- **Last preview URL:** `https://integrity-git-claude-buil-f6ede9-rahulranjith369-5644s-projects.vercel.app/` (showing the previous `wipe-demo` + `live-clock` build; user tap-test required — sandbox cannot curl Vercel hosts)
- **Methodology:** The Loop (SDD-outside, TDD-inside) per ADR-025; two human gates per ADR-026; per-phase commit prefixes per ADR-027.

## Plan in force

- `phase1plan.md` (root, in `.prettierignore`) — **11-milestone build order M0..M10** with carried-forward decisions, locked AppState schema, and open spec gaps. This supersedes the previous 8-feature empty-toolkit pivot listed in older `plan.md` / `tests.md` sections.
- The 94 existing test IDs from the previous pivot remain in `docs/tests.md` and must be tagged `[survives] / [re-author] / [obsolete]` by the M0 PLANNER dispatch (per `phase1plan.md` § Test Migration Discipline).

## Milestones

| Milestone                                 | State                                                         | Notes                                                                                                                                         |
| ----------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **M0 — Design System**                    | **Not started — next up.** Awaiting `/feature m0` invocation. | Builds 10 primitives + tokens. M0 acceptance requires WCAG AA re-verification on the new `#07090f` bg + `--ink-dim`. Test ID prefix `*-m0-*`. |
| M1 — Empty Building Shell                 | Not started                                                   | Page renders with empty state, no hardcoded blocks.                                                                                           |
| M2 — Add Block Flow                       | Not started                                                   | First feature to lock the shared `Block` + `Recurrence` schema (ADR-019).                                                                     |
| M3 — Add Brick + Live Scoring             | Not started                                                   | Three brick types (tick / goal / time), visual fill, hero count-up.                                                                           |
| M4 — Block Expand + Brick Logging         | Not started                                                   | FLIP expand, real timer per ADR-017.                                                                                                          |
| M5 — Edit Mode + Delete                   | Not started                                                   | "Just today" delete writes to `deletions[date:blockId]` per locked schema.                                                                    |
| M6 — Drag Reorder                         | Not started                                                   | Framer Motion layout animations.                                                                                                              |
| M7 — Polish Layer                         | Not started                                                   | Cinematic. 60fps target. `prefers-reduced-motion` respected.                                                                                  |
| M8 — Persistence                          | Not started                                                   | localStorage `dharma:v1` with separate `logs` / `timers` / `deletions` keyed maps (ADR-018). DST fixtures required.                           |
| M9 — Calendar Nav (Castle/Kingdom/Empire) | Not started                                                   | Helpers: `appliesOn(rec, date)` and `currentDayBlocks(today, state)`.                                                                         |
| M10 — Voice Log                           | Not started                                                   | Claude API round-trip. Failure mode SG-bld-19 unresolved.                                                                                     |

## Already shipped (pre-pivot — superseded by phase1plan.md)

- `wipe-demo` and `live-clock` features from the 8-feature empty-toolkit pivot landed at `a33b80b`. Their test IDs and code stay on the feature branch but the M0 PLANNER dispatch will tag them `[survives]` / `[re-author]` / `[obsolete]` against the new milestone plan.

## Open loops

- **Vercel MCP authorized but not loaded in this session.** SHIPPER must say "user verification required" after each ship until a fresh chat picks up the MCP. Sandbox returns `403 host_not_allowed` on Vercel hosts.
- **Vercel project connected; main push pending user authorization.** Branch `claude/build-dharma-pwa-8WVNB` ahead of `main`. Preview URL auto-updates with each branch push.
- **Mobile-Safari (WebKit) Playwright project disabled** per ADR-010. Re-enable when running in an environment with WebKit binaries present.
- **Lighthouse scores not yet measured.** No prod URL reachable from sandbox. Measure after Vercel MCP loads or after `main` merge.
- **Hero `data-testid="building-counter"` missing (N3).** `C-bld-040` uses a brittle class-name container query; add the testid in a future polish chunk (likely M7).
- **DST off-by-one in `dayNumber()` (N4).** Fix lands in M8 with proper `programStart` math + DST fixtures.
- **`harness.md` MCP rows still ❌ MISSING for Vercel + Context7 + Playwright** — wired in user's Claude account, not loaded into this session.

## Spec gaps

- `SG-bld-01..11` — closed against the previous pivot; resolutions live in `docs/tests.md` § "Spec gaps — resolved".
- `SG-bld-13..19` — open, tracked in `phase1plan.md` § "Open Spec Gaps". To be resolved by the milestone they block (not all at once).

## Quality gates (last full Evaluator PASS on `a33b80b`)

| Gate                       | Result                                 |
| -------------------------- | -------------------------------------- |
| ESLint                     | clean                                  |
| `tsc --noEmit`             | clean                                  |
| Vitest                     | 68/68 passed                           |
| Playwright (mobile-chrome) | 9/9 passed                             |
| Playwright (mobile-safari) | not run — WebKit unavailable (ADR-010) |
| axe-core                   | 5/5 passed, 0 violations               |
| Lighthouse                 | not measured — no prod URL             |

## Next intended action

Invoke `/feature m0` to start The Loop on **M0 — Design System** (the first milestone of `phase1plan.md`). The slash command will:

1. Pre-flight validate the M0 SPEC entry has Intent / Inputs / Outputs / Edge cases / Acceptance criteria sections in `/docs/spec.md`. **If those aren't yet authored in `docs/spec.md` for M0, that step will halt — the user must add the SPEC entry first** (Phase 1 is user-owned per ADR-025).
2. Dispatch PLANNER `mode: PLAN` for `m0` (writes `docs/plan.md` entry + the 94-test migration table).
3. Auto-chain to PLANNER `mode: TESTS` for `m0` (writes `docs/tests.md` entry).
4. Surface both files for **Gate #1 (planning gate)**. Awaiting user approval before BUILDER dispatches.

Commit prefixes for the M0 cycle (per ADR-027): `docs(plan-m0):` → `docs(tests-m0):` → `test(m0):` / `feat(m0):` → `docs(eval-m0):` → `chore(ship-m0):` + `docs(ship-m0):`.
