# Architecture Decision Records

> Each non-obvious choice we make gets one entry here. Format: number, status, context, decision, consequences. Append-only — never delete; mark superseded when revisited.
>
> **Read order for agents:** PLANNER reads this before writing `plan.md`; BUILDER reads this before writing code; EVALUATOR reads this before judging. If your work would reverse an _Accepted_ ADR, **stop and report** — do not silently re-litigate.

---

## ADR-001 — Next.js 16 (not 15)

**Status:** Accepted · 2026-04-29

**Context.** `CLAUDE.md` § Stack says "Next.js 15", but `npx create-next-app@latest` in this sandbox installs Next.js 16.2.4 with Turbopack and React 19.

**Decision.** Use whatever `create-next-app` ships. Treat "Next.js 15+" in the spec as the floor.

**Consequences.** App Router only. Some packages (e.g. `next-pwa`) lag Next 16 — see ADR-003. Read `node_modules/next/dist/docs/` before assuming any Next API behavior.

---

## ADR-002 — Use `motion` (Framer Motion successor)

**Status:** Accepted · 2026-04-29

**Context.** Spec lists "Framer Motion". The library was renamed to `motion` and `framer-motion` is the legacy alias.

**Decision.** Install `motion`. Refer to it as "Framer Motion" in user-facing copy.

**Consequences.** Imports are `from "motion/react"` (or `motion`). Any animation utilities live under that namespace.

---

## ADR-003 — `@serwist/next` instead of `next-pwa`

**Status:** Accepted · 2026-04-29

**Context.** Spec lists `next-pwa`, but it is unmaintained for Next.js 15+. Serwist is the de-facto successor and supports Next 16.

**Decision.** Use `@serwist/next` + `serwist` + `workbox-window` for the PWA layer.

**Consequences.** Service worker setup uses Serwist's API, not next-pwa's. Documentation pointers in any README or CHANGELOG must reflect this.

---

## ADR-004 — shadcn/ui scaffolded manually

**Status:** Accepted · 2026-04-29

**Context.** `npx shadcn init` requires fetching `ui.shadcn.com/init?…`, which is blocked in this sandbox.

**Decision.** Created `components.json` and `lib/utils.ts` (with `cn()`) manually. Installed `clsx`, `tailwind-merge`, `class-variance-authority`, `tailwindcss-animate` directly.

**Consequences.** `npx shadcn add <component>` should work for adding individual components when the sandbox allows. Until then, components are hand-rolled.

---

## ADR-005 — `dayPct` is equal-weighted

**Status:** Accepted · 2026-04-29 · resolves SG-bld-08

**Context.** Spec § Scoring: _"All equal weight."_ Initial implementation was duration-weighted (Hero showed ~26%); equal-weighted gives ~57%.

**Decision.** `dayPct = mean(blockPct(b) for b in blocks)`. No duration weighting at any aggregation level (Block, Building, Castle, Kingdom, Empire).

**Consequences.** Hero number changes when this ships — not a regression. Any future "weighted" view must be a separate function, not a replacement.

---

## ADR-006 — Half-open `[start, end)` block intervals

**Status:** Accepted · 2026-04-29 · resolves SG-bld-03

**Context.** What block does `currentBlockIndex` return when NOW exactly equals a block boundary?

**Decision.** Half-open `[start, end)`. The start time belongs to the new block; the end time belongs to the next block. Matches the existing implementation.

**Consequences.** At 04:00 (the day anchor), we are in _Wake ritual_, not still in _Sleep_.

---

## ADR-007 — Time-brick logging is a stepper, not a timer

**Status:** Accepted · 2026-04-29 · resolves SG-bld-02

**Context.** Spec says "start/stop timer OR manual input" for time bricks.

**Decision.** Phase 1 uses a `+/-` stepper. No real timer. Same component handles Goal and Time bricks.

**Consequences.** A real start/stop timer is a future feature, separate ADR when introduced.

---

## ADR-008 — Edit-mode `×` is always visible

**Status:** Accepted · 2026-04-29 · resolves SG-bld-01

**Context.** Spec mentions both "swipe left" and "× icon" for delete affordance.

**Decision.** `×` is always visible while in edit mode. No swipe gesture in Page 1 scope.

**Consequences.** Swipe-to-delete is deferred to a future feature if ever implemented. Touch surface for `×` must hit ≥44px.

---

## ADR-009 — Hero `%` is integer-only

**Status:** Accepted · 2026-04-29 · resolves SG-bld-07

**Context.** Spec doesn't specify decimals.

**Decision.** `Math.round` to integer everywhere we display a percentage. No decimal display.

**Consequences.** Tests assert exact integers, not approximate floats.

---

## ADR-010 — Mobile-Safari Playwright project disabled in this sandbox

**Status:** Accepted · 2026-04-29 (sandbox-scoped)

**Context.** WebKit binaries are not available at the version Playwright requires (`/opt/pw-browsers` ships chromium only). Spec does not mandate WebKit-specific testing.

**Decision.** Comment out the `mobile-safari` (iPhone 14) project in `playwright.config.ts`. Mobile-Chrome (Pixel 7) remains.

**Consequences.** Re-enable when WebKit is available. Don't promise Safari-specific compatibility until then.

---

## ADR-011 — `--ink-faint` text shifted to `--ink-dim` for WCAG AA

**Status:** Accepted · 2026-04-29 · resolves A-bld-003

**Context.** `--ink-faint` (#64748b) on the card background fails WCAG 2.1 AA (4.5:1) for small text.

**Decision.** Small text that previously used `--ink-faint` now uses `--ink-dim` (#94a3b8). The `--ink-faint` token still exists for non-text uses (dashed borders, etc.).

**Consequences.** The `plan.md` token-assignment table is slightly out of sync; future plans should cite this ADR. Any new small text must use `--ink-dim` or brighter, never `--ink-faint`.

---

## ADR-012 — `CLAUDE.md` is in `.prettierignore`

**Status:** Accepted · 2026-04-29

**Context.** Prettier reformats markdown (adds blank lines after `###`, indents bullet sub-lists). The user supplied `CLAUDE.md` verbatim and wants the exact text preserved.

**Decision.** `CLAUDE.md` is excluded from prettier (and lint-staged consequently). Other markdown is still formatted.

**Consequences.** Any future edit to `CLAUDE.md` must preserve the user's exact text style. Other docs (`spec.md`, `plan.md`, `tests.md`, `decisions.md`, `status.md`, `CHANGELOG.md`) follow prettier formatting.

---

## ADR-013 — Permanent orchestration flow: user does steps 1, 2, 8; Main Claude drives 3–7

**Status:** Accepted · 2026-04-29

**Context.** First builder run dispatched all 61 test IDs as one task because the orchestrator (Main Claude) wasn't told to stop per feature. The user wants per-feature shipping with their reactions in the loop.

**Decision.** Codified in `CLAUDE.md` § Orchestration Flow (permanent):

- Step 1 — PLANNER runs (dispatched by Main Claude).
- Step 2 — **User approves.** ← Gate #1.
- Steps 3–7 — BUILDER → EVALUATOR → (FAIL loops back) → SHIPPER, **all automatic**, **one feature at a time**.
- Step 8 — **User opens preview URL, taps, reacts.** ← Gate #2.
- Step 9 — Next feature → repeat from step 3.

**Consequences.** PLANNER must group test IDs by named feature. BUILDER must stop after one feature. SHIPPER must produce a preview URL per feature, not per page.

---

## ADR-014 — Knowledge files: spec, plan, tests, status, CHANGELOG, decisions

**Status:** Accepted · 2026-04-29

**Context.** Without durable context files, every fresh session loses the "what shipped, what's in flight, why we made the calls we made" thread.

**Decision.** Maintain six canonical knowledge files:

| File                | Owner                   | Read-by                         | When updated                      |
| ------------------- | ----------------------- | ------------------------------- | --------------------------------- |
| `docs/spec.md`      | user                    | PLANNER                         | when scope changes                |
| `docs/plan.md`      | PLANNER                 | BUILDER, EVALUATOR              | once per feature                  |
| `docs/tests.md`     | PLANNER                 | BUILDER, EVALUATOR              | once per feature                  |
| `docs/status.md`    | SHIPPER + Main Claude   | everyone (esp. session restart) | every ship + every handoff        |
| `CHANGELOG.md`      | SHIPPER                 | humans + future-me              | every ship                        |
| `docs/decisions.md` | Main Claude + EVALUATOR | PLANNER, BUILDER, EVALUATOR     | when a non-obvious choice is made |

`feedback.md` and `glossary.md` are deferred — added if the workflow demands them.

**Consequences.** PLANNER and BUILDER agent definitions both list `docs/decisions.md` as a required input. SHIPPER agent definition writes `CHANGELOG.md` and `docs/status.md` on every ship.

---

## ADR-015 — `NowCard` does not subscribe to edit mode

**Status:** Accepted · 2026-04-29 · proposed by EVALUATOR on Page 1 PASS

**Context.** Plan.md scoped delete affordances to `TimelineBlock` only. The builder hardcoded `editMode={false}` for bricks rendered inside `NowCard` (`components/NowCard.tsx:96`). Without an ADR, this looks like a coverage gap.

**Decision.** Bricks rendered inside `NowCard` are always view-mode, even when global edit mode is on. The current block can still be edited from the Timeline below.

**Consequences.** Surfacing delete on the active block in NowCard would be a confusing UX — the user is looking at the _now_ surface, not a structural surface. If a future feature wants in-context deletion, it gets a separate spec entry and ADR.

---

## ADR-016 — Tick brick `aria-label` includes the brick name

**Status:** Accepted · 2026-04-29 · proposed by EVALUATOR on Page 1 PASS

**Context.** A naive implementation would set `aria-label` to the raw status string (`"done"` or `"—"`). Goal/time bricks already include the brick name in their visible label.

**Decision.** Tick bricks construct `aria-label` as `"<name> done"` or `"<name> —"` (`components/Brick.tsx:41-42`). The visible text remains just the name — only the accessible name is enriched.

**Consequences.** Screen-reader users hear _which_ brick they're toggling. `U-bld-019` still tests the canonical `brickLabel()` strings (`"done"` / `"—"`); the aria-label augmentation lives in the component layer, not the utility.
