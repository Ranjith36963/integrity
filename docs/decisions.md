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

**Status:** Superseded by ADR-017 · 2026-04-29 · resolves SG-bld-02

**Context.** Spec says "start/stop timer OR manual input" for time bricks.

**Decision (original).** Phase 1 uses a `+/-` stepper. No real timer. Same component handles Goal and Time bricks.

**Consequences.** A real start/stop timer is a future feature, separate ADR when introduced.

**Why superseded.** The empty-toolkit pivot (2026-04-29) elevates time-brick logging UX. Users want a real start/stop timer for sessions of meditation, focus work, etc. ADR-017 captures the new decision.

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

---

## ADR-017 — Time bricks use a real timer (BrickTimer)

**Status:** Accepted · 2026-04-29 · supersedes ADR-007

**Context.** The empty-toolkit pivot puts user-created routines at the center. Time bricks (e.g. "meditate 10 min", "deep work 90 min") need a real start/stop experience, not a `+/-` stepper. The spec § Logging Bricks (View Mode) explicitly says "Time → start/stop timer OR manual input".

**Decision.** Phase 1 implements a real timer:

- New component `components/BrickTimer.tsx`, sibling to `BrickStepper`. Goal bricks continue to use `BrickStepper`; tick bricks continue to toggle.
- Timer state is **timestamp-based** (`{ runningSince: epochMs | null, accumulatedSec: number }`), persisted to localStorage so a refresh or sleep doesn't lose the session.
- Display: `mm:ss` live counter. Controls: play / pause / reset, plus a manual override input that commits a value directly without running the timer (covers the spec's "OR manual input" branch).
- Only one timer can be running at a time across the app; starting a new timer pauses any other.

**Consequences.**

- Test IDs related to time-brick logging change shape: instead of asserting stepper increments, tests assert the timer commits accumulated seconds when paused. PLANNER will rewrite the relevant IDs.
- localStorage schema must include a `timers` map keyed by `${blockId}:${brickId}`.
- ADR-007's `+/-` stepper is retained for goal bricks only.

---

## ADR-018 — Phase-1 persistence is `localStorage` under `dharma:v1`

**Status:** Accepted · 2026-04-29

**Context.** No backend yet. The product needs to remember the user's blocks, bricks, completion logs, program-start date, and timer state across page loads.

**Decision.** A single localStorage key `dharma:v1` holds the entire `AppState` JSON. The state is loaded after first paint (two-pass render) so SSR HTML matches the empty-state default. A new module `lib/persist.ts` exposes `loadState()`, `saveState(state)`, and `usePersistedState()`.

**Schema (versioned, evolvable):**

```ts
type AppState = {
  schemaVersion: 1;
  programStart: string; // ISO date, set on first run
  blocks: Block[]; // template blocks (with recurrence)
  logs: Record<string, BrickLog>; // keyed by `${yyyy-mm-dd}:${blockId}:${brickId}`
  timers: Record<string, TimerState>; // keyed by `${blockId}:${brickId}`
  deletions: Record<string, true>; // per-day "just today" overrides, key `${yyyy-mm-dd}:${blockId}`
};
```

**Consequences.**

- All mutations route through `saveState()` after `setState`. We accept the small write overhead in exchange for guaranteed durability.
- Future migration is a `schemaVersion` bump + a small migrator function in `persist.ts`.
- Tests can pre-seed `localStorage` directly to set up scenarios; e2e tests should clear `localStorage` between cases.

---

## ADR-019 — Recurrence is an enum + optional payload, not iCal RRULE

**Status:** Accepted · 2026-04-29

**Context.** The spec lists four recurrence options: just-today, every-weekday, every-day, custom range. iCal-grade RRULE is overkill for Phase 1.

**Decision.**

```ts
type Recurrence =
  | { kind: "just-today"; date: string } // ISO date
  | { kind: "every-weekday" } // Mon–Fri
  | { kind: "every-day" } // every day
  | {
      kind: "custom-range";
      from: string;
      to: string; // ISO dates inclusive
      weekdays?: number[];
    }; // 0=Sun..6=Sat; omitted = all
```

`appliesOn(recurrence, date)` is a pure function in `lib/recurrence.ts`. `currentDayBlocks(today, state)` filters templates by this rule and applies `deletions` overrides.

**Consequences.**

- "This event only / following / all" recurrence-edit semantics from the spec are deferred — Phase 1 only supports the simpler "just today / all recurrences" delete prompt.
- If we ever need RRULE (alarms, calendar export), introduce it as ADR-NNN superseding this. Today, simpler is better.

---

## ADR-020 — `now`, `today`, and `dayNumber` are derived live, not constants

**Status:** Accepted · 2026-04-29

**Context.** The hardcoded demo used `NOW = "11:47"`, `DAY_NUMBER = 119`, `TOTAL_DAYS = 365`, `TODAY_LABEL = "Wed, Apr 29"`. None of those should be constants in a real product.

**Decision.**

- `useNow()` (new in `lib/useNow.ts`) returns an `HH:MM` string from `new Date()`, ticking every 60s. Client-only.
- `today()` returns the local-date ISO string (`YYYY-MM-DD`). Used as a key into `logs` and `deletions` and as an input to `appliesOn`.
- `programStart` is persisted in `AppState` and seeded on first run (the day the user installs).
- `dayNumber = floor((today - programStart) / 1d) + 1` (1-based). Hero shows `Building N of 365` once `programStart` exists; otherwise the Hero hides the day-counter line.
- `dateLabel = formatLocale(today, "Wed, Apr 29")` style, derived live.

**Consequences.**

- `lib/data.ts` is reduced to a `defaultState()` factory; no hardcoded constants remain.
- Tests must inject a controlled clock (a `now` parameter on the relevant helpers, or `vi.setSystemTime`). The `useNow` hook should be mockable in component tests.
- E2E tests can override `Date.now` via Playwright's `page.addInitScript` or rely on the `useNow` injection seam.

---

## ADR-021 — Main Claude may author plan.md / tests.md when PLANNER repeatedly times out

**Status:** Accepted · 2026-04-29

**Context.** During the empty-toolkit pivot re-plan, the PLANNER subagent timed out twice in a row on the same task (idle-timeout, partial output, 245 s and 125 s). Two retries with progressively tighter scope did not converge. The user (orchestrator gate #1) explicitly authorized Main Claude to author `/docs/plan.md` and `/docs/tests.md` directly to unblock the harness ("go option 2").

**Decision.** This is an **explicit, user-authorized override** of the agent boundaries documented in `CLAUDE.md` and ADR-013. Main Claude may author `/docs/plan.md` and `/docs/tests.md` for a single re-plan when:

1. The PLANNER subagent has failed (idle-timeout, partial output, or explicit error) at least **twice** consecutively on the same dispatch.
2. The user has been informed of the failure and has explicitly authorized the override (a one-word "go option 2" or equivalent counts; silent override does not).
3. The override is recorded in this ADR with the SHA of the commit that lands the authored files.

**Consequences.**

- The EVALUATOR remains independent. It still reads `decisions.md`, `spec.md`, and `tests.md`, runs the gates, and judges. It does **not** receive any "Main Claude wrote this" hint, preserving the audit pattern.
- Future re-plans default to the PLANNER subagent. This ADR is a fallback, not a new norm.
- If the underlying PLANNER timeout pattern recurs, that's a harness-level bug worth fixing (e.g., dispatch the PLANNER with even smaller per-dispatch scope) rather than normalizing the override.
- Commit landing the authored files: filled in below once committed.

---

## ADR-022 — PLANNER authors one feature per dispatch

**Status:** Accepted · 2026-04-29

**Context.** Four consecutive timeouts on the empty-toolkit pivot re-plan (three PLANNER subagent runs + one Main Claude direct Write). Root cause: any single tool call generating more than ~200 tokens of output is unsafe when upstream LLM latency is degraded — both subagents and Main Claude are subject to the same stream-idle threshold. ADR-013 already mandates one-feature-per-dispatch for BUILDER; this extends the rule to PLANNER and (where applicable) Main Claude.

**Decision.**

- A single PLANNER dispatch authors exactly ONE named feature group. The orchestrator names the feature in the prompt; the agent appends ~50–80 lines to `/docs/plan.md` and ~50–80 lines to `/docs/tests.md` for that feature only.
- A multi-feature prompt is a planner gap — the agent rejects it and asks the orchestrator to name a single feature.
- Same constraint applies to Main Claude when authoring plan/tests directly (per ADR-021): one feature subsection per Edit/Write call, commit after each.
- Plan and tests files grow **incrementally**. They are never re-authored monolithically.

**Consequences.**

- User approves at Gate #1 per feature, not per page. Page 1 is now ~8 plan-cycle iterations instead of one.
- Each feature follows the full per-feature loop (PLANNER → user approves → BUILDER → EVALUATOR → SHIPPER → preview → user reacts) before the next is planned. ADR-013 step 9 ("next feature → repeat from step 3") becomes "next feature → repeat from step 1" when the plan itself is incremental.
- `.claude/agents/planner.md` is updated to enforce the constraint at the agent level.
- Total wall-clock time for a multi-feature page is longer but resilient. Recovery from a timeout is at most one feature's worth of work, never a full page rewrite.

---

## ADR-023 — `useNow()` paints the server clock on first render

**Status:** Accepted · 2026-05-01 · proposed by EVALUATOR on live-clock PASS

**Context.** The `useNow()` hook (`lib/useNow.ts`) initializes via `useState(() => formatHHMM(new Date()))`. On SSR, `new Date()` is the server's clock; on client first paint, it may differ slightly from the user's clock (network-roundtrip-bounded skew, typically < 2 s). Two options were available: (a) return `""` on SSR and update post-mount, eliminating the skew at the cost of a one-frame layout flash; (b) format the server-side clock and accept the small skew, avoiding the flash.

**Decision.** Use option (b). Server-side `Date()` formats to a placeholder `HH:MM`; the next `setInterval` tick (within 60 s) reconciles to the client clock. Acceptable for a single-user PWA where skew is bounded by network latency and the value is informational only (it doesn't drive math).

**Consequences.**

- No CLS flash on first paint.
- For up to one minute after first paint, the displayed time can be off by a few seconds vs. the user's wall clock. Imperceptible in practice.
- If the BlueprintBar's NOW pin ever drives time-critical UX (e.g. snapping animations to the minute boundary), revisit this — the wired component already accepts `now` as a string, so the seam is clean.
- Future ADR could move to option (a) under a strict-CLS design system; this ADR is the active default.

`lib/useNow.ts` carries a one-line comment referencing this ADR so future readers find the decision quickly.

---

## ADR-024 — Auto-FAIL → BUILDER loop policy

**Status:** Accepted · 2026-05-01

**Context.** EVALUATOR FAIL today triggers a manual re-dispatch by Main Claude. The harness goal is to close the loop without user intervention until quality gates pass. But unbounded auto-retries risk burning compute and masking real issues (e.g. a BUILDER consistently failing to address a gap because it doesn't understand it).

**Decision.**

- On EVALUATOR FAIL, the orchestrator **automatically re-dispatches BUILDER** with the gap list (G1..Gn) as the only IDs to address. No user gate between FAIL and re-spawn.
- After **3 consecutive FAILs on the same feature**, the loop **stops** and the orchestrator escalates to the user with the EVALUATOR's last gap list verbatim. The user decides: relax a gate, narrow scope, or fix manually.
- BUILDER's "FAIL retry" mode: the agent receives the gap list, addresses ONLY those gaps, and does not introduce new functionality or new test IDs.
- EVALUATOR runs are independent — each FAIL produces its own report; the orchestrator does not aggregate gap lists across iterations.

**Consequences.**

- Loop closes itself in the common case (one FAIL, one fix, PASS).
- Pathological cases bounded by the 3-retry cap.
- `.claude/commands/feature.md` step 4 implements this policy.
- If a user wants a higher cap for a specific feature, they invoke `/feature <name> --max-fails=5` (slash command interprets the override; this ADR is the default).
