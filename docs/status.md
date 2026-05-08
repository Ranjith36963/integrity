# Status

> Where Dharma is **right now**. The SHIPPER agent updates this file after every successful ship (mandatory per ADR-026); Main Claude updates the "Feature in flight" line at handoffs.
>
> Read this first when starting a fresh session.

## Snapshot

- **Branch:** `claude/verify-m0-deployment-s4XRy` at `4f5175d` · `main` at `c3ef9f1` (feature branch not yet merged)
- **Last commit:** `4f5175d` — `docs(ship-m3): record ship commit SHA in status.md` (ship pair: `073a137` + `4f5175d` stacked on `5eac7ca`)
- **Last preview URL:** `https://integrity-git-claude-veri-e4542d-rahulranjith369-5644s-projects.vercel.app` (stable branch alias; auto-tracks latest deployment for this branch). Sandbox `curl -I` returns HTTP 403 `x-deny-reason: host_not_allowed` (Vercel Deployment Protection — same as M0/M1/M2; not a failure; signed-in browser sessions serve normally).
- **Methodology:** The Loop (SDD-outside, TDD-inside) per ADR-025; two human gates per ADR-026; per-phase commit prefixes per ADR-027.

## Plan in force

- `phase1plan.md` (root, in `.prettierignore`) — **11-milestone build order M0..M10** with carried-forward decisions, locked AppState schema, and open spec gaps. Supersedes the previous 8-feature empty-toolkit pivot.
- The 94 existing test IDs from the previous pivot have been tagged `[survives]` / `[re-author]` / `[obsolete]` by the M0 PLANNER dispatch. Migration complete.

## Milestones

| Milestone                                 | State                                              | Notes                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M0 — Design System**                    | **Shipped + tap-tested ✓**                         | 10 primitives + tokens. 48 IDs closed. Gate #2 closed 2026-05-05.                                                                                                                                                                                                                                          |
| **M1 — Empty Building Shell**             | **Shipped + tap-tested ✓**                         | Spatial 24-hr timeline, amber now-line, hero, top bar, Blueprint Bar, locked empty-state, floating dock. 56 IDs closed. Gate #2 closed.                                                                                                                                                                    |
| **M2 — Add Block Flow**                   | **Shipped + tap-tested ✓**                         | First interactive verb. Floating `+` + 24 slot-tap targets. AddBlockSheet, CategoryPicker, inline category creation, validation, Blueprint Bar non-empty path. 50 IDs closed. Gate #2 closed.                                                                                                              |
| **M3 — Add Brick + Live Scoring**         | **Shipped to preview — awaiting Gate #2 tap-test** | Add Brick flow (tick/goal/time), HeroRing visual fill, LooseBricksTray, BrickChip, live scoring engine (`dayPct(state)`, `categoryDayPct`), cross-up celebration hook. 57 IDs closed (`U-m3-001..014`, `C-m3-001..024`, `E-m3-001..013`, `A-m3-001..006`). Ship HEAD `5eac7ca`. Playwright + axe deferred. |
| M4 — Block Expand + Brick Logging         | Not started — next up                              | FLIP expand, real timer per ADR-017. Brick logging UX (tick toggle, goal stepper, time timer) will finally trigger cross-up celebrations wired in M3. `fireworks` overlay + chime asset land here.                                                                                                         |
| M5 — Edit Mode + Delete                   | Not started                                        | "Just today" delete writes to `deletions[date:blockId]` per locked schema.                                                                                                                                                                                                                                 |
| M6 — Drag Reorder                         | Not started                                        | Framer Motion layout animations.                                                                                                                                                                                                                                                                           |
| M7 — Polish Layer                         | Not started                                        | Cinematic. 60fps target. `prefers-reduced-motion` respected.                                                                                                                                                                                                                                               |
| M8 — Persistence                          | Not started                                        | localStorage `dharma:v1` with separate `logs` / `timers` / `deletions` keyed maps (ADR-018). DST fixtures required.                                                                                                                                                                                        |
| M9 — Calendar Nav (Castle/Kingdom/Empire) | Not started                                        | Helpers: `appliesOn(rec, date)` and `currentDayBlocks(today, state)`.                                                                                                                                                                                                                                      |
| M10 — Voice Log                           | Not started                                        | Claude API round-trip. Failure mode SG-bld-19 unresolved.                                                                                                                                                                                                                                                  |

## Open loops

- **Vercel MCP scope mismatch.** The MCP is loaded but authenticated to a Vercel account that is **not** a member of the `rahulranjith369-5644s-projects` team that owns `integrity` (`list_teams → []`, `get_deployment → 404`). Deploy verification must come from the GitHub commit-status or Vercel-bot PR comment. Never template the preview URL from the branch name.
- **Sandbox `next` module corruption** blocks `next dev` locally — preview env unaffected. Playwright + axe + ESLint + Lighthouse must be verified on the Vercel preview.
- **Mobile-Safari (WebKit) Playwright project disabled** per ADR-010. Re-enable when running in an environment with WebKit binaries present.
- **Hero `data-testid="building-counter"` missing (N3).** `C-bld-040` uses brittle class-name query; add testid in M7 polish.
- **DST off-by-one in `dayNumber()` (N4).** Fix lands in M8 with proper `programStart` math + DST fixtures.
- **`fireworks` motion token + `public/sounds/chime.mp3` deferred to M4.** M3 ships the cross-up hook (`useCrossUpEffect`) standalone. Fireworks overlay + chime asset land when M4's logging UI drives real crossings (SG-m3-05 / SG-m3-12).
- **`components/NowCard.tsx` legacy file.** Contains hardcoded factory category names ("Health", "Mind", "Career", "Passive") at lines 13-16. Pre-existing pre-M3; not rendered; only its own test imports it. Delete in M5 cleanup or earlier.
- **2 unsuppressed lint warnings:** `LooseBricksTray.tsx:43` and `TimelineBlock.tsx:62` render `aria-expanded` on `role="region"` / `role="article"` respectively. Both are spec-mandated by AC #44 + AC #45; ESLint reports as warnings, not errors. Intentional.
- **`harness.md` MCP rows still MISSING** for Vercel + Context7 + Playwright — wired in user's Claude account, not loaded into this session.
- **`lib/dharma.ts:duration()` returns 0 for no-end blocks** — intentional design; documented in CHANGELOG (pre-M2 `U-bld-014` tests still pass).

## Quality gates (last full Evaluator PASS on `5eac7ca` — M3)

| Gate                       | Result                                                                                                                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint                     | 0 errors, 8 warnings (2 spec-mandated `aria-expanded` on region/article per AC #44/#45; remainder pre-existing unused-imports in test files; no new suppressions introduced) |
| `tsc --noEmit`             | clean — 0 new errors                                                                                                                                                         |
| Vitest                     | 501/501 passed (48 files) — up from 397/397 at end of M2                                                                                                                     |
| Playwright (mobile-chrome) | deferred to Vercel preview — sandbox `next dev` socket bind failure (M1/M2 pattern); test files at `tests/e2e/m3.spec.ts` (13 IDs) + `tests/e2e/m3.a11y.spec.ts` (6 IDs)     |
| Playwright (mobile-safari) | not run — WebKit unavailable (ADR-010)                                                                                                                                       |
| axe-core                   | deferred to Vercel preview                                                                                                                                                   |
| Lighthouse                 | not measured — no prod URL reachable from sandbox                                                                                                                            |

## Next intended action

**Gate #2:** user must open the M3 Vercel preview and tap-test the Add Brick Flow. Verify: tap a block → expand → "+ Add brick" opens AddBrickSheet with tick/goal/time kind picker; standalone "+ Brick" pill in the Loose Bricks tray also opens it; HeroRing SVG arc fills with day completion %; brick chips render with type-specific foreground fill; block left-bar height tracks blockPct%; BlueprintBar segment opacity varies with blockPct%.

**After Gate #2:** author M4 SPEC entry in `/docs/spec.md` (Block Expand + Brick Logging — tick toggle, goal stepper, time timer), then invoke `/feature m4`. M4 will land the logging UX that finally triggers the cross-up celebrations wired in M3.
