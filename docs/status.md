# Status

> Where Dharma is **right now**. The SHIPPER agent updates this file after every successful ship (mandatory per ADR-026); Main Claude updates the "Feature in flight" line at handoffs.
>
> Read this first when starting a fresh session.

## Snapshot

- **Branch:** `claude/build-dharma-pwa-8WVNB` at `2ce4562` · `main` at `c3ef9f1` (feature branch not yet merged)
- **Last commit:** `2ce4562` — `docs(ship-m0): finalize snapshot — branch tip cfaa048, sha loop closed`
- **Last preview URL:** `https://integrity-git-claude-buil-f6ede9-rahulranjith369-5644s-projects.vercel.app` — **verified Ready** via the Vercel App's GitHub commit-status on `2ce4562` (state=`success`, "Deployment has completed", inspector `https://vercel.com/rahulranjith369-5644s-projects/integrity/E1G1YuXsSPLtPNqdjKUt73VyHFG3`). User tap-tested on iPad Safari 2026-05-05 — Gate #2 ✓.
- **Methodology:** The Loop (SDD-outside, TDD-inside) per ADR-025; two human gates per ADR-026; per-phase commit prefixes per ADR-027.

## Plan in force

- `phase1plan.md` (root, in `.prettierignore`) — **11-milestone build order M0..M10** with carried-forward decisions, locked AppState schema, and open spec gaps. This supersedes the previous 8-feature empty-toolkit pivot listed in older `plan.md` / `tests.md` sections.
- The 94 existing test IDs from the previous pivot have been tagged `[survives]` / `[re-author]` / `[obsolete]` by the M0 PLANNER dispatch (per `phase1plan.md` § Test Migration Discipline). Migration is complete.

## Milestones

| Milestone                                 | State                                                     | Notes                                                                                                                                                                                                                            |
| ----------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M0 — Design System**                    | **Shipped + tap-tested ✓**                                | 10 primitives + tokens. 48 IDs closed (`U-m0-001..012`, `C-m0-001..023`, `E-m0-001..008`, `A-m0-001..005`). New ADRs: 028 (`aria-checked`), 029 (`devIndicators: false`), 030 (`/design` route), 031 (`Button sm min-h-[44px]`). Gate #2 closed 2026-05-05 — preview verified live via GitHub commit-status + user tap-test. |
| M1 — Empty Building Shell                 | Not started — next up                                     | Page renders with empty state, no hardcoded blocks. PLANNER must inherit ADRs 028–031.                                                                                                                                           |
| M2 — Add Block Flow                       | Not started                                               | First feature to lock the shared `Block` + `Recurrence` schema (ADR-019).                                                                                                                                                        |
| M3 — Add Brick + Live Scoring             | Not started                                               | Three brick types (tick / goal / time), visual fill, hero count-up.                                                                                                                                                              |
| M4 — Block Expand + Brick Logging         | Not started                                               | FLIP expand, real timer per ADR-017.                                                                                                                                                                                             |
| M5 — Edit Mode + Delete                   | Not started                                               | "Just today" delete writes to `deletions[date:blockId]` per locked schema.                                                                                                                                                       |
| M6 — Drag Reorder                         | Not started                                               | Framer Motion layout animations.                                                                                                                                                                                                 |
| M7 — Polish Layer                         | Not started                                               | Cinematic. 60fps target. `prefers-reduced-motion` respected.                                                                                                                                                                     |
| M8 — Persistence                          | Not started                                               | localStorage `dharma:v1` with separate `logs` / `timers` / `deletions` keyed maps (ADR-018). DST fixtures required.                                                                                                              |
| M9 — Calendar Nav (Castle/Kingdom/Empire) | Not started                                               | Helpers: `appliesOn(rec, date)` and `currentDayBlocks(today, state)`.                                                                                                                                                            |
| M10 — Voice Log                           | Not started                                               | Claude API round-trip. Failure mode SG-bld-19 unresolved.                                                                                                                                                                        |

## Already shipped (pre-pivot — superseded by phase1plan.md)

- `wipe-demo` and `live-clock` features from the 8-feature empty-toolkit pivot landed at `a33b80b`. Their test IDs and code stay on the feature branch; migration tagging is now complete (done by M0 PLANNER dispatch).

## Open loops

- **Vercel MCP scope mismatch.** The MCP is loaded but authenticated to a Vercel account that is **not** a member of the `rahulranjith369-5644s-projects` team that owns the `integrity` project (`list_teams → []`, `list_projects` under the user's slug returns `{projects: []}`, `get_deployment → 404` for any hostname under that team). Until SHIPPER's MCP is re-authed under the right account, deploy verification must come from the **GitHub commit-status** posted by the Vercel App (`pull_request_read --method get_status`) or from the **Vercel-bot PR comment**. **Never template the preview URL from the branch name** — Vercel truncates+hashes long branches (e.g., `claude/build-dharma-pwa-8WVNB` collapses to `claude-buil-f6ede9`), so the templated URL silently 404s.
- **Vercel project connected; main push pending user authorization.** Branch `claude/build-dharma-pwa-8WVNB` ahead of `main`. Preview URL auto-updates with each branch push.
- **Mobile-Safari (WebKit) Playwright project disabled** per ADR-010. Re-enable when running in an environment with WebKit binaries present.
- **Lighthouse scores not yet measured.** No prod URL reachable from sandbox. Measure after Vercel MCP loads or after `main` merge.
- **Hero `data-testid="building-counter"` missing (N3).** `C-bld-040` uses a brittle class-name container query; add the testid in a future polish chunk (likely M7).
- **DST off-by-one in `dayNumber()` (N4).** Fix lands in M8 with proper `programStart` math + DST fixtures.
- **`harness.md` MCP rows still MISSING for Vercel + Context7 + Playwright** — wired in user's Claude account, not loaded into this session.
- **M1+ PLANNER must inherit ADR-028..039** (M0 quartet 028–031 plus the design-pillar lock 032–039: user-defined N categories, single-% ring + bar chart, blocks-always-timed, bricks-inside-or-standalone, plain forms in M2, voice in M10, gray missed days, **and ADR-039: Dharma ships empty — no factory habits, templates, or category defaults**). Also: `components/ui/README.md:23` claims `h-9` but implementation uses `min-h-[44px]` — stale size-table, defer to M1 or a focused chore commit.
- **Loose Bricks tray location (TBD).** Three options on the table (pinned above dock / bottom of timeline / top of timeline). Per `spec.md § 0.11`, must lock before M2 PLANNER dispatch. Does NOT block M1 SPEC drafting.

## Spec gaps

- `SG-bld-01..11` — closed against the previous pivot; resolutions live in `docs/tests.md` § "Spec gaps — resolved".
- `SG-bld-13..19` — open, tracked in `phase1plan.md` § "Open Spec Gaps". To be resolved by the milestone they block (not all at once).

## Quality gates (last full Evaluator PASS on `cfc09ad`)

| Gate                       | Result                                            |
| -------------------------- | ------------------------------------------------- |
| ESLint                     | clean                                             |
| `tsc --noEmit`             | clean                                             |
| Vitest                     | 210/210 passed (28 files)                         |
| Playwright (mobile-chrome) | 37/37 passed                                      |
| Playwright (mobile-safari) | not run — WebKit unavailable (ADR-010)            |
| axe-core                   | 5/5 passed, 0 violations                          |
| Lighthouse                 | not measured — no prod URL reachable from sandbox |

## Next intended action

**Design pillars are now authored in `spec.md § 0`** (2026-05-05) — competitive wedge, inspiration matrix, visual identity, motion vocabulary, interaction primitives, calendar hierarchy, forgiveness model, data-model rules, haptics. Seven new ADRs (032–038) lock the foundational decisions. PLANNER reads § 0 first on every M1+ dispatch.

**Next:** answer the open Loose Bricks tray location (A pinned-above-dock / B bottom-of-timeline / C top-of-timeline; § 0.11), then **author the M1 SPEC entry** in `/docs/spec.md` (Intent / Inputs / Outputs / Edge cases / Acceptance criteria) citing the relevant pillars, then invoke `/feature m1`. M1 is **Empty Building Shell** — spatial timeline rendered with empty state, faded time labels, the amber now-line, and a placeholder hero ring. No interactive `+` yet (M2 wires Add Block).
