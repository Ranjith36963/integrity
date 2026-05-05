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

---

## ADR-025 — "The Loop": named SDD-outside / TDD-inside contract

**Status:** Accepted · 2026-05-01 · refines ADR-013 + ADR-022 · **gate count refined by ADR-026 (see banner below)**

> ⚠️ **Refined by ADR-026.** This ADR originally codified **three** human gates (after PLAN, after TESTS, after SHIP). ADR-026 collapses Gate #1 + Gate #2 into a single planning gate that fires after BOTH PLANNER dispatches return. The two-dispatch architecture (PLAN dispatch then TESTS dispatch) is **preserved**. Read the table below as the historical decision; the current contract is two gates per ADR-026.

**Context.** The orchestration flow in `CLAUDE.md` and the pipeline in `.claude/commands/feature.md` already encode SDD-outside / TDD-inside, but the contract was implicit. Two specific weaknesses surfaced:

1. The pattern had no name, so prompts had to re-state it every time ("plan first, then test, then build, then eval, then ship…").
2. PLANNER produced `plan.md` and `tests.md` in a single dispatch with **one** user approval gate after both. This bundled two distinct review questions ("does the design match my intent?" and "do the tests prove the design?") into one decision and made spec-vs-test drift expensive to catch — once the user said "approve," the BUILDER would close 90+ test IDs against a possibly-misaligned tests.md.

**Decision.**

- Name the pattern **The Loop**. Any prompt, ADR, or commit may reference "run The Loop on X" and the contract below applies.
- The Loop has **six phases** and **three human gates**, mapped to this project's existing knowledge files and agent ownership:

  | #   | Phase | Owner     | Output                                        | Gate after?                                    |
  | --- | ----- | --------- | --------------------------------------------- | ---------------------------------------------- |
  | 1   | SPEC  | user      | `/docs/spec.md` entry                         | n/a (precondition)                             |
  | 2   | PLAN  | PLANNER   | `/docs/plan.md` entry                         | **Gate #1** — user approves design             |
  | 3   | TESTS | PLANNER   | `/docs/tests.md` entry                        | **Gate #2** — user approves test→spec coverage |
  | 4   | IMPL  | BUILDER   | code + commits (TDD)                          | none (auto-chain)                              |
  | 5   | EVAL  | EVALUATOR | PASS/FAIL report                              | none (auto-chain; FAIL → BUILDER per ADR-024)  |
  | 6   | SHIP  | SHIPPER   | preview URL + README/CHANGELOG/status updates | **Gate #3** — user taps preview                |

- **Phase 2 and Phase 3 are two separate PLANNER dispatches**, not one. This refines ADR-022's "one feature per dispatch" further: within a feature, plan and tests are also separate dispatches. Smaller scope per dispatch reduces timeouts (root cause of ADR-021/022) and gives the user a chance to course-correct before tests crystallise the design.
- This project's "SPEC" phase is **user-owned** (per ADR-014's knowledge-file ownership table), which diverges from the generic 4-step SDD-TDD pattern where the planner owns spec. Honored here so we don't break the existing CLAUDE.md contract.

**Consequences.**

- `CLAUDE.md` § Methodology replaced with the named "The Loop" contract.
- `.claude/commands/feature.md` Step 1 split into Step 1 (PLAN + Gate #1) and Step 2 (TESTS + Gate #2). Subsequent steps renumbered.
- ADR-013 step 2 ("user approves the plan and resolves spec gaps") now means "user approves Gate #1 AND Gate #2" — both gates must pass before BUILDER dispatches.
- Existing `phase1plan.md` milestones already use this rhythm informally (the M0 → M10 build order assumes a plan-then-tests pause); ADR-025 just makes it enforceable.
- No backwards-compat shim needed: the next `/feature m0` invocation runs The Loop with both gates from the start.
- Spec drift is now caught at Gate #1 (cheap to fix); test→spec drift caught at Gate #2 (still cheap); code drift would surface at EVAL (expensive to fix), which is why both upstream gates exist.

> **Refined by ADR-026.** Gate #1 and Gate #2 are collapsed into a single planning gate after both PLANNER dispatches return. The two-dispatch architecture is preserved.

---

## ADR-026 — Two user gates, not three (refines ADR-025)

**Status:** Accepted · 2026-05-01 · refines ADR-025

**Context.** ADR-025 codified The Loop with three human gates — after PLAN, after TESTS, after SHIP. In practice, the user prefers two gate points: one when the planner phase is fully done, one when the preview is live. The two-PLANNER-dispatch architecture (PLAN dispatch then TESTS dispatch) was correct for timeout resilience per ADR-022, but bracketing each dispatch with its own user-approval check added friction without commensurate benefit. The user reads `plan.md` and `tests.md` together as one design artifact; splitting the review across two interruptions doesn't catch more drift than reviewing both at once.

**Decision.**

- The Loop has **two human gates**, not three:
  - **Gate #1 — Planning gate.** Fires after the PLANNER's `mode: TESTS` dispatch returns (i.e., once both `plan.md` AND `tests.md` exist for the feature). User reviews both files together and approves, amends, or rejects.
  - **Gate #2 — Preview gate.** Fires after SHIPPER deploys and surfaces a preview URL. User taps the preview and reacts.
- The PLAN dispatch and TESTS dispatch from ADR-025 are **preserved** (two separate dispatches for timeout resilience per ADR-022). Main Claude **auto-chains** PLAN → TESTS without pausing. Only after TESTS returns does the user check fire.
- Phase numbering in The Loop is unchanged: Phase 1 SPEC → Phase 2 PLAN → Phase 3 TESTS → Phase 4 IMPL → Phase 5 EVAL → Phase 6 SHIP. The phase boundaries remain; only the gating between Phase 2 and Phase 3 collapses.

**Consequences.**

- `CLAUDE.md` § Methodology updated to describe two gates with revised "why two" rationale.
- `.claude/commands/feature.md`: PLAN step auto-chains to TESTS step without user pause. Single planning gate fires after TESTS returns.
- `.claude/agents/planner.md` handoff section updated: after `mode: PLAN`, orchestrator does NOT pause; after `mode: TESTS`, orchestrator surfaces BOTH files for the single planning gate.
- Trade-off acknowledged: if the plan is misaligned, the tests get written against the misaligned plan and the user catches drift only at Gate #1. Acceptable cost — minimal interruptions matter more, and a redo of plan + tests is still cheaper than catching code drift at EVAL.
- ADR-025 stays Accepted; this ADR refines its gate count without superseding the dispatch architecture.

---

## ADR-027 — Commit-prefix convention per Loop phase

**Status:** Accepted · 2026-05-01

**Context.** Each Loop phase produces commits, but there has been no convention to identify which phase a commit came from. After months of work, `git log` becomes opaque — you cannot filter "show me every PLAN commit on M3" or "how long did the IMPL phase take on M0." A consistent prefix per phase makes the log navigable and audit-friendly.

**Decision.**

Commit prefixes per Loop phase, layered on top of Conventional Commits (commitlint config unchanged — scopes are free-form):

| Phase             | Prefix template                                             | Example                                                       |
| ----------------- | ----------------------------------------------------------- | ------------------------------------------------------------- |
| 2. PLAN           | `docs(plan-<feature>): …`                                   | `docs(plan-m0): design system tokens`                         |
| 3. TESTS          | `docs(tests-<feature>): …`                                  | `docs(tests-m0): u/c/e/a ids 001..030`                        |
| 4. IMPL — TDD red | `test(<feature>): …`                                        | `test(m0): button primitive red`                              |
| 4. IMPL — green   | `feat(<feature>): …` or `fix(<feature>): …`                 | `feat(m0): button primitive green`                            |
| 5. EVAL follow-up | `docs(eval-<feature>): …` or `chore(eval-<feature>): …`     | `docs(eval-m0): m0 pass report notes`                         |
| 6. SHIP           | `chore(ship-<feature>): …` and/or `docs(ship-<feature>): …` | `chore(ship-m0): release notes`, `docs(ship-m0): status snap` |

- `<feature>` is the feature slug, matching the heading in `plan.md` / `tests.md` (e.g., `m0`, `m3`, `add-block`).
- Out-of-Loop harness commits (ADRs, slash commands, agent definitions, harness audits) continue to use `docs(harness): …` or other existing scopes.
- Subjects remain lowercase per existing commitlint config.
- Existing types (feat / fix / docs / chore / test / refactor / perf / build / ci / revert) are sufficient — no new types are added.

**Consequences.**

- `git log --grep='^docs(plan-m0)'` reconstructs the PLAN-phase history of M0; analogous greps for any phase.
- `git log --grep='^chore(ship-' --oneline` lists every SHIP across the project.
- `CLAUDE.md` § Methodology gains a commit-prefix table the agents read at session start.
- PLANNER agent definition references `docs(plan-…)` and `docs(tests-…)`; SHIPPER references `chore(ship-…)` and `docs(ship-…)`.
- BUILDER continues `feat(<feature>):` / `fix(<feature>):` / `test(<feature>):` per existing TDD discipline; ADR-027 just formalizes that the scope == feature slug.
- No commitlint config change required.

---

## ADR-028 — `<Toggle>` uses `role="switch"` + `aria-checked` (not `aria-pressed`)

**Status:** Accepted · 2026-05-02 · resolves M0 EVALUATOR proposal

**Context.** `docs/tests.md` C-m0-014 was loose ("`role="switch"` (or `<button aria-pressed>`)"). The two patterns are not equivalent: ARIA APG specifies `aria-checked` as the state attribute for `role="switch"`, while `aria-pressed` is for `role="button"` toggle pattern. Mixing them is invalid.

**Decision.** `<Toggle>` uses `role="switch"` + `aria-checked={boolean}`. `aria-pressed` is reserved for future toggle-buttons that are NOT switches (none in M0). C-m0-014 was updated during the M0 build to assert `aria-checked`.

**Consequences.**

- Future PLANNER must specify `aria-checked` for switch components and `aria-pressed` for button-style toggles. Never both, never the wrong one.
- The "or" branch in C-m0-014's spec text is retired; future test IDs must commit to one ARIA pattern.
- No code change going forward — the pattern is set.

---

## ADR-029 — `next.config.ts` sets `devIndicators: false` to keep dev toolbar out of touch-target tests

**Status:** Accepted · 2026-05-02 · resolves M0 EVALUATOR proposal

**Context.** Next.js 16 dev mode injects a small floating "dev toolbar" UI into the rendered DOM. Several elements in that toolbar fall below the 44 px touch-target threshold mandated by spec.md M0 § Edge cases. The Playwright test E-m0-003 (touch-target sizing) measured every visible interactive element on `/design` and would fail in dev because of the framework's injected UI, even though no Dharma component was at fault.

**Decision.** `next.config.ts` sets `devIndicators: false`. This is a **dev-only** setting — production builds are unaffected (the toolbar never ships).

**Consequences.**

- E-m0-003 only sees Dharma's primitives, not framework UI.
- Future test authors don't need to filter dev-toolbar selectors out of touch-target queries.
- If a future Next.js version moves the toolbar into a different mechanism, this ADR may need a follow-up.

---

## ADR-030 — Design-system harness lives at `/design` (no underscore)

**Status:** Accepted · 2026-05-02 · resolves M0 EVALUATOR proposal

**Context.** `phase1plan.md` and `docs/plan.md` § M0 specified the harness route as `/app/_design/page.tsx`, on the assumption that an underscore-prefixed directory is private/non-routable in Next.js. That convention is for the **Pages Router**. The **App Router** (which this project uses per ADR-001) treats `_`-prefixed directories as private folders that produce **no route at all** — so `/_design` would 404.

**Decision.** The harness route is `/app/design/page.tsx`, exposed at `/design`. Privacy from production nav is enforced by **absence of any link to it** (the route exists but no UI references it), not by directory name.

**Consequences.**

- Future PLANNER dispatches must NOT prefix harness/private-route directories with `_` in App Router projects.
- If a future need arises to truly hide the route from build output, use a `route.ts` with conditional 404 in production, OR a separate `dev`-only entrypoint, OR move it under `(dev)/` route group with a guard. Don't rely on directory naming.
- Dev-only fences should be enforced at the route handler level, not via folder naming.

---

## ADR-031 — Button `size="sm"` keeps `min-h-[44px]` for touch-target compliance

**Status:** Accepted · 2026-05-02 · resolves M0 EVALUATOR proposal

**Context.** `docs/plan.md:311` cva snapshot specified `sm: "h-9 px-3 ..."` (36 px high), but `docs/spec.md` M0 § Edge cases mandates touch targets ≥ 44 px on mobile. BUILDER honored the spec by setting `min-h-[44px]` on `sm` (and tightened C-m0-002's size→height table accordingly).

**Decision.** `<Button size="sm">` uses smaller padding/font (per cva visual spec) but enforces `min-h-[44px]` so the rendered control still meets the touch-target floor. The visual `sm` is "compact" in horizontal density only.

**Consequences.**

- Plan vs. spec drift was resolved spec-wins. Future plan.md cva snapshots that contradict spec acceptance criteria default to spec.
- `components/ui/Button.tsx` and the C-m0-002 test reflect the floor; the `components/ui/README.md` size table (currently shows `h-9` etc.) must be updated by SHIPPER or in an early M1 follow-up.
- If a future spec relaxes the 44 px floor (e.g., for a dense desktop view), it must be a deliberate spec amendment, not a silent plan change.

---

## ADR-032 — Categories: user-defined, unlimited count

**Status:** Accepted · 2026-05-05 · supersedes `spec.md` "UX Spec — Phase 1 Toolkit § Categories"

**Context.** The original Phase 1 toolkit spec fixed four categories (Health / Mind / Career / Passive) with hardcoded colors. The 2026-05-05 design-pillar synthesis (`spec.md § 0`) changes this: users define their own categories at any count. No closed enum, no master list shipped with the app.

**Decision.** Block schema and standalone-brick schema both carry `category: string` (free text, user-managed). Categories are stored in user state, not enumerated in code. User adds / edits / deletes categories from settings; each category has a user-picked color. Pre-pivot blocks (none currently in the live data model) would default to a "general" category at migration time.

**Consequences.**

- The closed-set color list in the older spec section is **OBSOLETE**.
- This forces ADR-033 (single-% ring instead of Apple Fitness three-ring) — N rings cannot be drawn for arbitrary N.
- Per-category visualization is a horizontal bar chart below the hero ring, one segment per category (segment width ∝ brick count, fill ∝ category completion %). Layout uses CSS grid auto-flow; wraps gracefully for N > ~7.
- M2's Add Block sheet has a category picker that doubles as "create new category" affordance.
- M5's Settings sheet must include category management (rename, recolor, delete with reassignment prompt).

---

## ADR-033 — Hero is single-% ring + per-category bar chart (not three rings)

**Status:** Accepted · 2026-05-05 · paired with ADR-032

**Context.** Apple Fitness's three-ring identity is iconic but requires a closed-set enum (Move / Exercise / Stand). ADR-032 chose user-defined N categories instead. With N rings impossible to draw for arbitrary N, the hero shape changes.

**Decision.** Hero = a single % ring on top showing overall day completion. Below the ring: a horizontal bar chart with one segment per user-defined category (width ∝ category brick count, fill ∝ category completion %). Per-category insight survives without the closed-set Apple Fitness aesthetic.

**Consequences.**

- M3 ("Add Brick + Live Scoring") plans a single-% count-up animation, not three concentric arcs.
- The bar chart is a separate component from the ring and ships in M3.
- Empty-day hero shows the ring at `0%` with no bar chart (zero categories engaged).
- The "three rings" aesthetic is sacrificed; Dharma's visual identity will lean harder on the spatial timeline + Empire view as iconic signatures.

---

## ADR-034 — Blocks always timed; bricks never timed

**Status:** Accepted · 2026-05-05 · clarifies M2 data model · supersedes `spec.md` "UX Spec — Phase 1 Toolkit § Add a Block" implicit "anytime block" affordance

**Context.** Earlier discussion explored "anytime blocks" (a block that has no scheduled time and lives in a separate tray). The 2026-05-05 design-pillar synthesis collapses this: every block has a time. Bricks never have a time of their own — a "Time"-type brick has a target *duration*, not a *schedule*.

**Decision.** Block schema requires `start: string` ("HH:MM"), `end: string | null` ("HH:MM" or null). Brick schema has no time fields at all. The "Time"-type brick's `durationMin: number` is a target, not a clock-position; the brick's parent block (or the Loose Bricks tray) determines when.

**Consequences.**

- The Add Block sheet always asks for a start time. Default = current time slot, rounded.
- The daily page renders as a vertical spatial timeline (time labels left, blocks at their `start` position, height ∝ duration).
- The "Anytime tray" concept (for blocks) is killed — that earlier suggestion is now obsolete.
- Bricks living outside a block live in a separate "Loose Bricks" tray — see ADR-035 + § 0.11 for tray-location TBD.

---

## ADR-035 — Bricks can be inside a block OR standalone

**Status:** Accepted · 2026-05-05

**Context.** The 2026-05-05 design-pillar synthesis distinguishes two flavors of brick: bricks inside a block (sub-units of a ritual: "30 push-ups" inside Morning Workout) and standalone bricks (minor tasks with no parent: "Drink 2L water", "Take vitamin", "Stretch once"). Both are bricks; the only difference is whether they have a parent block.

**Decision.** Brick schema has `parentBlockId: string | null`. When `null`, the brick is standalone and renders in the **"Loose Bricks" tray** (location TBD; see `spec.md § 0.11`). When set, brick renders inside its parent block on the timeline. Same schema either way — no separate `BlockBrick` / `TaskBrick` types.

**Consequences.**

- Day score is the average across all top-level units (blocks + standalone bricks). Standalone bricks count equally with blocks for scoring purposes.
- M1 must allocate a render zone for the tray. Three options shortlisted (pinned above dock / bottom of timeline / top of timeline). PLANNER must lock before authoring M2 plan.
- M5 Edit Mode supports moving a brick between block-parent and standalone (drag from tray into block, or out of block into tray).
- An empty block (zero bricks) is still a valid scoring unit — see § 0.9 ("empty block → 0 or 1 boolean tick").

---

## ADR-036 — Add Block sheet uses plain forms in M2; inline parsing arrives in M7

**Status:** Accepted · 2026-05-05 · resolves design-pillar Q3

**Context.** Three input methods for adding a block: tap timeline slot, floating `+`, voice (M10). The Fantastical-style inline natural-language parsing ("Run 6-7am daily" → form auto-fills as you type) is desirable but adds ~1 week of scope to M2 (regex grammar over time tokens, real-time parsing UX). M2's existing scope (sheet UI + recurrence picker + brick adder + category picker + 3 brick types) is already large.

**Decision.** M2 ships explicit form fields only — Title, Start, End (optional), Recurrence picker, Brick adder, Category. Inline natural-language parsing is layered on in **M7 Polish** (regex grammar over time/recurrence tokens; no LLM). LLM-based parsing remains exclusive to M10 voice; not used for typed input ever.

**Consequences.**

- M2 stays a ~1-week milestone instead of swelling to ~3 weeks.
- M7 polish gains a meaningful UX upgrade (the magic-typing experience).
- Voice (M10) keeps the LLM round-trip; typed input never depends on a network call.
- If users in the M2-M6 window beg for the magic-typing flow, it stays a feature ship in M7, not a re-prioritization.

---

## ADR-037 — Voice mic ships in M10 (late, not early)

**Status:** Accepted · 2026-05-05 · resolves design-pillar Q4

**Context.** Voice was considered for an early slot (M5/M6, right after Add Block + Add Brick + Live Scoring) on the argument that "the killer feature should ship as soon as there's something to log into." Counter-argument: every other foundation (calendar nav, persistence, polish) is fragile until shipped, and AI cost + latency in beta is a real risk if voice lands before the rest is solid.

**Decision.** Voice mic stays at **M10**, the final phase-1 milestone. M2–M9 ship without voice. The mic is a placeholder visual through that period.

**Consequences.**

- Phase-1 milestone order in `phase1plan.md` is unchanged.
- Demos through M9 use the typed Add Block flow only — accepted compromise.
- M10 builds on a fully polished foundation, so its API integration risk is isolated.
- SG-bld-19 (voice failure-mode handling) is still required at M10; defer its resolution to M10 SPEC.

---

## ADR-038 — Forgiveness model: missed days = gray, no shame

**Status:** Accepted · 2026-05-05 · resolves design-pillar Q5

**Context.** Three forgiveness models considered for missed days: (a) Duolingo's streak-freeze (one free skip per week, use-or-lose), (b) Headspace's gentle gray (missed days observed, never punished), (c) Dharma-native compound forgiveness (break a streak → next 3 days at 50%+ rebuilds it; harder break = harder rebuild). The rest of Dharma's tone is calm-confident; punishment-via-red breaks that tone. Most competitors get this wrong (see § 0.1 wedge point 6).

**Decision.** Missed days render **gray, never red** across all calendar views (Castle / Kingdom / Empire). Streaks are visible to those who want them (flame icon, days-in-a-row over 50%) but they're a *feature*, not the spine of the UI. No auto-broken streaks, no compounding penalties. Identity stats highlight presence ("Days you ran: 142"), never absence.

**Consequences.**

- M9 calendar visualizations (Castle / Kingdom / Empire) use a gray→green color scale. Red is reserved for destructive UI affordances only (delete confirmations).
- A streak counter resets on a true 0% day, but past-day visualization stays gray (not red) — the day is observed, not shamed.
- Empire view's identity-stats overlay (§ 0.6) frames presence-positively.
- This is explicit positioning vs Streaks.app, Habitica, Duolingo — Dharma is the no-shame habit tracker.
