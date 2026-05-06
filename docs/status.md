# Status

> Where Dharma is **right now**. The SHIPPER agent updates this file after every successful ship (mandatory per ADR-026); Main Claude updates the "Feature in flight" line at handoffs.
>
> Read this first when starting a fresh session.

## Snapshot

- **Branch:** `claude/verify-m0-deployment-s4XRy` at `26e6fbd` · `main` at `c3ef9f1` (feature branch not yet merged)
- **Last commit:** `26e6fbd` — `docs(ship-m1): update README, CHANGELOG, and status.md for M1 ship`
- **Last preview URL:** pending — branch pushed at `26e6fbd`; Vercel build underway. Source actual URL from GitHub commit-status (Vercel App context, `state: success`) or Vercel-bot comment on the PR. Do NOT template from branch name. M0 preview was `https://integrity-git-claude-buil-f6ede9-rahulranjith369-5644s-projects.vercel.app` (different branch).
- **Methodology:** The Loop (SDD-outside, TDD-inside) per ADR-025; two human gates per ADR-026; per-phase commit prefixes per ADR-027.

## Plan in force

- `phase1plan.md` (root, in `.prettierignore`) — **11-milestone build order M0..M10** with carried-forward decisions, locked AppState schema, and open spec gaps. This supersedes the previous 8-feature empty-toolkit pivot listed in older `plan.md` / `tests.md` sections.
- The 94 existing test IDs from the previous pivot have been tagged `[survives]` / `[re-author]` / `[obsolete]` by the M0 PLANNER dispatch (per `phase1plan.md` § Test Migration Discipline). Migration is complete.

## Milestones

| Milestone                                 | State                                                     | Notes                                                                                                                                                                                                                            |
| ----------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M0 — Design System**                    | **Shipped + tap-tested ✓**                                | 10 primitives + tokens. 48 IDs closed. Gate #2 closed 2026-05-05.                                                                                                                                                                |
| **M1 — Empty Building Shell**             | **Shipped to preview — awaiting Gate #2 tap-test**        | Spatial 24-hr timeline, amber now-line, hero, top bar, Blueprint Bar, locked empty-state, floating dock. 56 IDs closed (`U-m1-001..011`, `C-m1-001..022`, `E-m1-001..016`, `A-m1-001..007`). 25 SPEC ACs. Ship HEAD `26e6fbd`. Playwright + axe deferred to Vercel preview (sandbox `next` corruption). |
| M2 — Add Block Flow                       | Not started — next up                                     | First feature to lock the shared `Block` + `Recurrence` schema (ADR-019). Loose Bricks tray location must be locked first (§ 0.11).                                                                                             |
| M3 — Add Brick + Live Scoring             | Not started                                               | Three brick types (tick / goal / time), visual fill, hero count-up.                                                                                                                                                              |
| M4 — Block Expand + Brick Logging         | Not started                                               | FLIP expand, real timer per ADR-017.                                                                                                                                                                                             |
| M5 — Edit Mode + Delete                   | Not started                                               | "Just today" delete writes to `deletions[date:blockId]` per locked schema.                                                                                                                                                       |
| M6 — Drag Reorder                         | Not started                                               | Framer Motion layout animations.                                                                                                                                                                                                 |
| M7 — Polish Layer                         | Not started                                               | Cinematic. 60fps target. `prefers-reduced-motion` respected.                                                                                                                                                                     |
| M8 — Persistence                          | Not started                                               | localStorage `dharma:v1` with separate `logs` / `timers` / `deletions` keyed maps (ADR-018). DST fixtures required.                                                                                                              |
| M9 — Calendar Nav (Castle/Kingdom/Empire) | Not started                                               | Helpers: `appliesOn(rec, date)` and `currentDayBlocks(today, state)`.                                                                                                                                                            |
| M10 — Voice Log                           | Not started                                               | Claude API round-trip. Failure mode SG-bld-19 unresolved.                                                                                                                                                                        |

## Open loops

- **Vercel MCP scope mismatch.** The MCP is loaded but authenticated to a Vercel account that is **not** a member of the `rahulranjith369-5644s-projects` team that owns the `integrity` project (`list_teams → []`, `get_deployment → 404`). Deploy verification must come from the **GitHub commit-status** posted by the Vercel App (`pull_request_read --method get_status`) or the **Vercel-bot PR comment**. Never template the preview URL from the branch name.
- **Sandbox `next` module corruption** blocks `next dev` and `npm run lint` locally — preview env unaffected. Playwright + axe + ESLint + Lighthouse must be verified on the Vercel preview.
- **Mobile-Safari (WebKit) Playwright project disabled** per ADR-010. Re-enable when running in an environment with WebKit binaries present.
- **Loose Bricks tray location (TBD — blocks M2 PLANNER).** Three options: pinned above dock / bottom of timeline / top of timeline. Must lock before M2 PLANNER dispatch (§ 0.11).
- **Hero `data-testid="building-counter"` missing (N3).** `C-bld-040` uses a brittle class-name container query; add testid in M7 polish.
- **DST off-by-one in `dayNumber()` (N4).** Fix lands in M8 with proper `programStart` math + DST fixtures.
- **`harness.md` MCP rows still MISSING** for Vercel + Context7 + Playwright — wired in user's Claude account, not loaded into this session.
- **M2+ PLANNER must inherit ADR-028..039** plus the Loose Bricks location once locked.

## Quality gates (last full Evaluator PASS on `5f7719f` — M1)

| Gate                       | Result                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------- |
| ESLint                     | deferred to Vercel preview (sandbox `next` corruption blocks `npm run lint`)        |
| `tsc --noEmit`             | 0 new errors in M1 files; 5 pre-existing sandbox errors in layout/manifest/config  |
| Vitest                     | 288/288 passed (35 files)                                                           |
| Playwright (mobile-chrome) | deferred to Vercel preview — test files exist at `tests/e2e/m1.spec.ts` (16 IDs) + `tests/e2e/m1.a11y.spec.ts` (7 IDs) |
| Playwright (mobile-safari) | not run — WebKit unavailable (ADR-010)                                              |
| axe-core                   | deferred to Vercel preview                                                          |
| Lighthouse                 | not measured — no prod URL reachable from sandbox                                   |

## Next intended action

**Gate #2:** user must open the M1 Vercel preview and tap-test the empty Building Shell. Verify: timeline renders, amber now-line visible, hero shows today's date + "Building N of N + 0%", dock renders with Voice disabled, `+` is no-op, empty-state copy "Tap any slot to lay your first block." visible.

**Before M2 PLANNER dispatch:** lock the Loose Bricks tray location (option A: pinned above dock / B: bottom of timeline / C: top of timeline — § 0.11). This decision must appear in M2's SPEC entry.

**After Gate #2 and tray decision:** author M2 SPEC entry in `/docs/spec.md`, then invoke `/feature m2`.
