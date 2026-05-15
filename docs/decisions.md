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
- Commits landing authored files under this ADR:
  - `2026-04-29` — initial empty-toolkit pivot re-plan (`plan.md` + `tests.md`).
  - `df6024c` (2026-05-08) — M3 `tests.md` entry. PLANNER TESTS hit two idle timeouts on the same M3 dispatch (14 tool uses / 7.5 min, then 8 tool uses / 32 min). Root cause: decision-density failure — 50 spec ACs × per-item GIVEN/WHEN/THEN design exceeds the streaming-budget per dispatch. Mitigation codified in ADR-040.

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

## ADR-034 — Blocks always timed; bricks never timed (SOFTENED by ADR-042)

**Status:** Partially superseded by ADR-042 (2026-05-14) · still authoritative for blocks · bricks-clause softened to "optionally timed via duration toggle"

**Context.** Earlier discussion explored "anytime blocks" (a block that has no scheduled time and lives in a separate tray). The 2026-05-05 design-pillar synthesis collapses this: every block has a time. Bricks never have a time of their own — a "Time"-type brick has a target _duration_, not a _schedule_.

**Decision (original 2026-05-05).** Block schema requires `start: string` ("HH:MM"), `end: string | null` ("HH:MM" or null). Brick schema has no time fields at all. The "Time"-type brick's `durationMin: number` is a target, not a clock-position; the brick's parent block (or the Loose Bricks tray) determines when.

**Decision (revised 2026-05-14, per ADR-042 + M4e).** Block clause unchanged. Brick clause softened: bricks gain an OPTIONAL `start`/`end`/`recurrence` triple gated by a user-controlled `hasDuration: boolean` toggle (default `false`). When OFF, bricks retain their original time-agnostic semantics. When ON, bricks carry the same time-window contract as blocks. The "Time"-type brick's `durationMin` retains its original meaning (performance target, not schedule) — orthogonal to the new `start`/`end` (allocated window).

**Consequences.**

- The Add Block sheet always asks for a start time. Default = current time slot, rounded.
- The daily page renders as a vertical spatial timeline (time labels left, blocks at their `start` position, height ∝ duration). **Per ADR-042: timed loose bricks also occupy timeline rows alongside blocks.**
- The "Anytime tray" concept (for blocks) is killed — that earlier suggestion is now obsolete.
- Bricks living outside a block live in a separate "Loose Bricks" tray — see ADR-035 + § 0.11 for tray-location TBD. **Per ADR-042: only loose bricks with `hasDuration === false` render in the tray; loose bricks with `hasDuration === true` render on the timeline.**

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

**Context.** Three input methods for adding a block: tap timeline slot, floating `+`, voice (M10). The Fantastical-style inline natural-language parsing ("Run 6-7am daily" → form auto-fills as you type) is desirable but adds substantial scope to M2 (regex grammar over time tokens, real-time parsing UX). M2's existing scope (sheet UI + recurrence picker + brick adder + category picker + 3 brick types) is already large.

**Decision.** M2 ships explicit form fields only — Title, Start, End (optional), Recurrence picker, Brick adder, Category. Inline natural-language parsing is layered on in **M7 Polish** (regex grammar over time/recurrence tokens; no LLM). LLM-based parsing remains exclusive to M10 voice; not used for typed input ever.

**Consequences.**

- M2 stays focused instead of swelling.
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

**Decision.** Missed days render **gray, never red** across all calendar views (Castle / Kingdom / Empire). Streaks are visible to those who want them (flame icon, days-in-a-row over 50%) but they're a _feature_, not the spine of the UI. No auto-broken streaks, no compounding penalties. Identity stats highlight presence ("Days you ran: 142"), never absence.

**Consequences.**

- M9 calendar visualizations (Castle / Kingdom / Empire) use a gray→green color scale. Red is reserved for destructive UI affordances only (delete confirmations).
- A streak counter resets on a true 0% day, but past-day visualization stays gray (not red) — the day is observed, not shamed.
- Empire view's identity-stats overlay (§ 0.6) frames presence-positively.
- This is explicit positioning vs Streaks.app, Habitica, Duolingo — Dharma is the no-shame habit tracker.

---

## ADR-039 — Dharma ships empty: no factory habits, templates, or categories

**Status:** Accepted · 2026-05-05 · supersedes "Templates ('Monk Mode', 'Builder Mode', 'Athlete Mode')" mention in earlier `spec.md § 0.8` draft

**Context.** During design-pillar drafting (2026-05-05), `spec.md § 0.8` listed pre-baked templates ("Monk Mode" / "Builder Mode" / "Athlete Mode") as a delight feature, alongside "save current day as a template" as a custom user move. The user clarified: **Dharma is a setup-it-yourself SaaS tool — like Notion, Linear, or Airtable — not a curated content app like Headspace, Apple Health, Habitica, or Streaks.app.** No factory habits, no pre-baked routines, no default category palette ship with the application. The user opens Dharma on day 1 and builds from zero.

**Decision.** Dharma ships empty. Specifically:

1. **No factory habits or pre-baked routines.** The first run of the app shows a blank timeline. No "Wake ritual", "Morning workout", "Work block", "Sleep" demo content.
2. **No factory templates.** "Monk Mode" / "Builder Mode" / "Athlete Mode" and any other named pre-bakes are forbidden. User-saved templates ("save current day, re-apply later") remain on the table as a M5+ feature, but only as user-content — never factory-shipped.
3. **No factory category palette.** Already locked by ADR-032 (categories are user-defined). This ADR reinforces: the app does not seed any starter categories, including no "Passive" / "General" / "Other" catch-all.
4. **No seed data in production builds.** Test fixtures live only in `*.test.ts`, Playwright fixtures, and Storybook-style harness pages (e.g., `/design`). They must NOT leak into the production bundle.
5. **Every example in `spec.md` is illustrative only.** "Morning workout", "drink water", "face wash", "Building AI", any block name, brick name, or category name in the spec is a _reader-aid_, not a code default. PLANNER and BUILDER must not transcribe spec examples into demo content.

**Consequences.**

- M1's empty state is **literally empty** — blank timeline + faded time labels + a single prompt: "Tap any slot to lay your first block." No demo blocks, no demo bricks.
- M2's Add Block sheet starts with no defaults beyond a current-time start (no pre-filled title, no pre-selected category). Categories are user-created on the fly when the user adds their first one.
- M3's Add Brick sheet has no defaults.
- M5's Settings → Templates tab (if it ships) starts empty: "You haven't saved any templates yet."
- This is explicit positioning vs Habitica (factory habits), Streaks.app (10 default tracks), Finch (preset journeys). Dharma = blank canvas. The marketing one-liner: "Dharma doesn't tell you how to live. You build your day, brick by brick."
- Antipattern 4 in `spec.md § 0.14` codifies this for PLANNER discipline.

---

## ADR-040 — PLANNER TESTS auto-splits when decision density exceeds the streaming-budget ceiling

**Status:** Accepted · 2026-05-08

**Context.** During M3 PLANNER (`mode: TESTS`), two consecutive dispatches hit timeouts on the same task: attempt 1 — 14 tool uses, 7.5 min, idle timeout, partial response; attempt 2 — 8 tool uses, **32 min**, request timeout. Telemetry signal: tokens-per-minute fell to ~50 in attempt 2 (healthy generation rates are 4–10k/min). The agent was reasoning, not crashing — but never committed output the orchestration framework could see, so stream-idle fired server-side.

Diagnosis (root cause): **decision-density failure**, not a content-size problem. The TESTS deliverable for M3 is ~50 GIVEN/WHEN/THEN entries derived from 50 spec ACs. Each entry is an independent design micro-decision (ID number, layer, target file, GIVEN/WHEN/THEN composition). At 50 micro-decisions × per-item deliberation cost, the per-call compute budget is exhausted before the model can stream output. PLAN succeeded in retry because its deliverable is structural (~10 high-level sections), not item-dense.

Comparison: M2 PLANNER TESTS worked (36 ACs, 8 open spec gaps). M3 broke (50 ACs, 18 open spec gaps, full Brick schema rewrite, scoring engine extension). The implicit ceiling lay between them.

**Decision.** PLANNER (`mode: TESTS`) auto-splits when **either** trigger fires:

1. Spec AC count for the milestone is `> 35`, OR
2. The milestone introduces a new locked schema (discriminated-union rewrite, top-level `AppState` extension, or equivalent type-level breaking change).

When triggered, the orchestrator dispatches PLANNER (`mode: TESTS`) **twice**, each producing a sub-section of the milestone's `tests.md` entry:

- Dispatch A: **Unit + Component** — the design-heavy, fixture-dense layers. Roughly half the IDs.
- Dispatch B: **E2E + A11y** — the user-flow + accessibility layers. The other half.

Both dispatches share the same milestone scope (one feature, per ADR-022). Each sub-dispatch handles ~25 IDs — well within the empirical ceiling.

Each sub-dispatch is committed independently with prefix `docs(tests-<feature>-uc): …` and `docs(tests-<feature>-ea): …`. Squash before merge if a single commit per phase is preferred.

**Consequences.**

- M3 itself was unblocked under ADR-021 (Main Claude authored `tests.md` directly). ADR-040 prevents recurrence on M4..M10 without requiring ADR-021 invocation.
- Slight overhead: one extra PLANNER dispatch per affected milestone. Acceptable trade-off for deterministic completion.
- **Compatibility:** Milestones below the trigger thresholds run a single PLANNER TESTS dispatch (the M0–M2 path, unchanged).
- The orchestrator (Main Claude or `/feature` slash command) is responsible for evaluating the triggers at dispatch time and choosing single-vs-split. The choice is recorded in the tests-commit message body.
- This ADR is silently revisitable if the underlying model's effective throughput improves enough that 50+-decision dispatches become reliable. Until then, splitting is the conservative default.

**Out of scope (for ADR-040, addressable in future ADRs):**

- A telemetry watchdog that auto-bails PLANNER when tokens-per-minute drops below a healthy floor for a sustained window (would convert long-tail timeouts into fast bails). Worth doing; defer until evidence of recurrence.
- Pre-writing test skeletons in PLAN dispatch (just IDs + targets) so TESTS only fills GIVEN/WHEN/THEN. Would decouple structure from layer; non-trivial to retrofit. Defer.

---

## ADR-041 — Single-gate Loop: VERIFIER replaces Gate #1

**Status:** Accepted · 2026-05-08 · Supersedes ADR-026's two-gate model.

**Context.** ADR-026 specified two human gates per feature: Gate #1 (after PLANNER's TESTS dispatch — user reads `plan.md` + `tests.md` together) and Gate #2 (after SHIPPER — user taps the preview). Through M0..M3, Gate #1 fired every feature and was treated seriously, but in practice it surfaced almost no design drift the existing PLANNER prompts hadn't already prevented. The user's reaction at Gate #1 was almost always "approve" with minor copy edits. Meanwhile each Gate #1 cost a human context-switch and required reading dense GIVEN/WHEN/THEN tables — exactly the work an LLM is good at and a human is slow at.

User feedback at end of M3: "I want to get rid of Gate #1. I'll trust the system. Only the preview matters." The request is well-grounded: live behavior is the only thing a human meaningfully evaluates faster than an automated check. Plan-vs-spec coverage is structured comparison work an agent can do reliably.

**Decision.** Collapse Gate #1 into a new automated agent — **VERIFIER** — that runs after PLANNER's TESTS dispatch and before BUILDER starts. Gate #2 (preview tap-test) remains as the only human gate.

The new Loop: **PLAN → TESTS → VERIFY (auto) → BUILD → EVAL (auto) → SHIP → Gate #2**.

VERIFIER specification (codified in `.claude/agents/verifier.md`):

- **Inputs:** `/docs/spec.md` (named feature only), the just-written `plan.md` entry, the just-written `tests.md` entry, `/docs/decisions.md`, `/docs/status.md`.
- **Five checks, all required:** spec coverage (every AC has ≥1 test ID), test grounding (every test ID maps to an AC), plan↔spec consistency (no contradictions, no scope creep), test ID hygiene (stable prefixes, GIVEN/WHEN/THEN, no duplicates), schema lock + ADR honor.
- **Output:** PASS (with AC → test-ID mapping) or FAIL (with numbered gap list G1..Gn). If verification cannot reach a verdict, FAIL with a partial gap list rather than stalling.
- **Tools:** `Read, Glob, Grep, Bash`. Read-only (no `Write`, no `Edit`).
- **Model:** opus. Structured comparison plus deep judgment on plan↔spec drift and schema-lock honor; opus matches PLANNER and EVALUATOR so the design audit is as rigorous as the original design and the eventual code review.
- **Forbidden:** writing code/plans/tests; editing `plan.md` or `tests.md`; running `npm run eval` (that's EVALUATOR's job, after BUILDER green); deploying.
- **Auto-chain on PASS:** orchestrator dispatches BUILDER. Verifier-driven follow-ups (rare) commit as `docs(verify-<feature>): …`.
- **Bounce on FAIL:** orchestrator re-dispatches PLANNER in the appropriate mode (PLAN or TESTS) with the gap list as the only thing to address. Re-dispatches VERIFIER. **Cap: 2 retries.** After 2 consecutive FAILs, escalate to user with the standing gap list verbatim. (3 retries was the EVALUATOR cap; VERIFIER gets 2 because its work is documents-only and gaps tend to be more deterministic.)

The orchestrator (Main Claude or the `/feature` slash command) treats VERIFIER's PASS as binding. There is **no human gate between TESTS and BUILDER any more** — the user does not see `plan.md` or `tests.md` for review unless VERIFIER escalates after 2 retries.

**Consequences.**

- **One human check-in per feature instead of two.** The Gate #1 reading cost goes away entirely. The user's attention is reserved for the preview, which is the only place a human can add value an agent can't.
- **Trust shifts from human review to VERIFIER design.** The audit job is identical to what the human did at Gate #1; the risk surface is whether VERIFIER's five checks are exhaustive enough. Mitigation: VERIFIER outputs a complete AC → test-ID mapping in every PASS, so any drift it missed becomes visible in the next dispatch's status.md or the eventual EVALUATOR run.
- **Two retry caps now exist.** EVALUATOR ↔ BUILDER stays at 3 (per ADR-024 — code rework is iterative). VERIFIER ↔ PLANNER caps at 2 (per this ADR — design audits should converge fast or escalate).
- **Commit-prefix table extended.** Verifier-driven follow-ups commit as `docs(verify-<feature>): …`. Most features won't see one — VERIFIER is read-only.
- **CLAUDE.md, `.claude/commands/feature.md`, and `.claude/agents/` updated in the same harness commit.** Phase numbering shifts (VERIFY becomes Phase 4; IMPL becomes Phase 5; EVAL Phase 6; SHIP Phase 7).
- **Backwards-compatible.** Already-shipped milestones (M0..M3) used the two-gate model; their commit history is unchanged. M4 onward uses the single-gate Loop.
- **Reversible.** If VERIFIER misses real drift across multiple features, this ADR can be marked superseded and Gate #1 reinstated. The migration cost would be small — the agent file stays as a quality check, the gate just adds back a `STOP, wait for user approval` step.

**Out of scope (for ADR-041, addressable in future ADRs):**

- Explicit AC numbering inside `spec.md` (currently many ACs are unnumbered prose). VERIFIER works around this by parsing acceptance-criteria blocks heuristically, but a stable numbering scheme would make verification deterministic. Defer until evidence of mis-mappings.
- A "VERIFY-driven plan-amend" mode where VERIFIER directly edits `plan.md`/`tests.md` rather than bouncing to PLANNER. Faster but breaks the "VERIFIER is read-only" invariant. Defer.
- Auto-detection of milestone-vs-task scope (when VERIFIER notices a milestone is too large to ship in one cycle, suggest splitting). Useful but separable concern. Defer.

---

## ADR-042 — Duration is a universal axis; bricks optionally timed via toggle

**Status:** Accepted · 2026-05-14 · Softens ADR-034 (brick clause) · Enables M4e · See ADR-006 (half-open intervals), ADR-019 (`Recurrence` union), ADR-034, ADR-035

**Context.** ADR-034 (2026-05-05) hard-locked "blocks always timed, bricks never timed." That clean split worked through M2/M3/M4a/M4b/M4c/M4d. After M4c shipped and Gate #2 on the M4 trilogy completed, the user's mental model shifted: **duration is not a property of "what kind of task" but a universal time-window axis that applies to any task.** A block always has duration (its window on the timeline); a brick _might_ have duration (a window of its own) and might not. Whether a brick has duration is independent of its score type (tick / units). Tick / units are _performance_ axes — how the user measures progress inside the window. Duration is _scheduling_ — when the activity occupies the day.

The user's exact framing (2026-05-14): "Imagine I'm gonna run from 6 to 6:40. That is my running duration. In that duration, I can run for 10 minutes, 20 minutes, 30 minutes... but the whole duration for running that is allocated for the day is 40 minutes. That is duration. But the time brick is something that, okay, today I ran for 10 minutes... The time, tick, and goal score types are based on the performance checkers or performance matrices for calculation or improvements. But the duration is the time allocated for that specific goal or task."

**Decision.** Add an optional duration axis to every brick, controlled by a per-brick boolean toggle (`hasDuration: boolean`, default `false`). When OFF, the brick is time-agnostic (matches ADR-034's original brick clause). When ON, the brick gains the same time-window contract blocks have: `start: string` (HH:MM, required), `end: string` (HH:MM, required, half-open `[start, end)` per ADR-006), `recurrence: Recurrence` (per ADR-019, required, default `{ kind: "just-today", date: <today> }`).

The toggle is orthogonal to score type — tick and units bricks both expose the same toggle with the same semantics. The two score types (tick / units) are orthogonal to the duration axis; `hasDuration` can be ON or OFF for either kind.

_(Prose harmonized at M4f per ADR-043: "goal" kind → "units", "time" kind removed. Score-type cardinality drops from 3 to 2. The duration-axis decision itself is unchanged.)_

Loose bricks (no parent block) with `hasDuration === true` render on the timeline at their `start` row, visually distinct from blocks via a dashed outline. Nested bricks (with a parent block) with `hasDuration === true` render their HH:MM–HH:MM badge inside the brick chip but otherwise stay inside the parent block card on the timeline — they do NOT promote to a separate timeline row.

Overlap detection becomes a first-class concern. The overlap engine (new module `lib/overlap.ts`) operates on the union of (a) all blocks and (b) all bricks with `hasDuration === true`. Detection runs live in AddBlockSheet and AddBrickSheet on every field-change tick; collisions surface as a warning chip and disable the Save button until resolved. Block↔block overlap detection is retroactively added (M2 ships without it).

**Consequences.**

- **ADR-034 is softened, not killed.** Block clause is unchanged. Brick clause is now "optionally timed via toggle." See ADR-034's revised text.
- **Brick schema gains four fields.** `hasDuration: boolean` (always present), `start?`, `end?`, `recurrence?` (present iff `hasDuration === true`). The reducer enforces the presence invariant on `ADD_BRICK`.
- **`durationMin` retains its M4e meaning.** It is NOT re-derived from `end - start`. A units brick with `hasDuration: true` has two distinct numbers: allocated window (`end - start`) and performance target (`durationMin`). _(Note: `durationMin` was originally tied to the M4c timer; the timer was removed in M4f per ADR-043, but `durationMin` remains a valid performance-target field on units bricks.)_
- **Timeline rendering becomes a union.** `<Timeline>` renders `[...blocks, ...looseBricks.filter(b => b.hasDuration)]` sorted by `start`. M2's "blocks only" assumption is retired.
- **Loose Bricks tray becomes filtered.** `<LooseBricksTray>` renders only `looseBricks.filter(b => !b.hasDuration)`. M3's tray-visibility contract still triggers (hidden when this filtered list is empty AND no blocks exist).
- **Overlap engine is new pure-function infrastructure.** `lib/overlap.ts` exports `intervalsOverlap` and `findOverlaps`. Reused by both Add sheets. No reducer involvement.
- **Save-blocking on overlap.** AddBlockSheet AND AddBrickSheet disable Save while the overlap list is non-empty. Tapping the disabled Save fires a `medium` haptic and surfaces a hint; the sheet stays open.
- **No data migration shipped to disk** (persistence is M8). All existing in-memory `Brick` literals (M3/M4a/b/c test fixtures) gain `hasDuration: false` either via explicit construction or via a `withDurationDefaults` helper at PLANNER's discretion.
- **`<Toggle>` becomes an M0 primitive.** First consumer is M4e's AddBrickSheet; future consumers (M5 edit mode, M6 settings) reuse the same component.
- **Recurrence resolution stays out of scope.** Bricks now carry recurrence per ADR-019, but `appliesOn(rec, date)` is still M9. M4e renders today only; recurrence is stored but inert.
- **Score-type logic is untouched.** M4a tick / M4b units (formerly goal) reducer arms unchanged at M4e. Cascade, scoring, hero ring, BlueprintBar — all untouched. _(M4c time reducer arm was removed in M4f per ADR-043; ADR-042's duration-axis logic is preserved.)_

**Out of scope (for ADR-042, addressable in future ADRs):**

- Editing an existing brick's `hasDuration` flag or any of its time fields — **M5 Edit Mode**.
- Recurrence resolution against past or future dates — **M9** (`appliesOn(rec, date)` resolver).
- Conflict-resolution UI beyond Save-disable (auto-shift, merge prompts, suggested alternative times) — **never**. The user resolves; the app surfaces.
- Drag-to-reschedule on the timeline — **M5/M7**.
- Cross-day windows (start before midnight, end after) — **never** (matches M2 single-day block contract).
- Auto-deriving `durationMin` from `end - start` on time bricks — **never** (user direction 2026-05-14: the two are intentionally separate axes).
- Promoting nested timed bricks to their own timeline row — **never** (nested bricks stay inside parent block card regardless of toggle state).
- Hard-constraining a nested brick's window to fit inside its parent block — **never** (user direction: "depends on the user"). Overlap engine still warns if the spill creates collisions with other items.

---

## ADR-043 — Two brick kinds (tick + units); time-brick timer infrastructure removed

**Status:** Accepted · 2026-05-14 · Supersedes the score-type cardinality and the M4c timer infrastructure · See ADR-035 (three score types, original), ADR-042 (universal duration axis — prose harmonized in this ADR), ADR-034 (already softened by ADR-042) · Enables M4f

**Context.** After M4c shipped a live timer (`lib/timer.ts`, `<TimerSheet>` long-press manual entry, `runningTimerBrickId` AppState field, 4 timer actions, `visibilitychange` recovery, `chime.mp3` placeholder) and M4e shipped the universal-duration axis (ADR-042), the user clarified their model on 2026-05-14:

> "When I say time, you don't need to set the timer in the brick. You just need to, user is gonna type how many minutes he ran, how many minutes he read the book, how many minutes he meditated. He's just gonna enter, same like the goal. […] There's two types of bricks. One is tick. Yes or no, on or off. […] And there's one more called as goal-based. Goal-based brick is two types. One is time-based. Like, you will set, okay, 30 minutes running. So how much did you do, did you do today? 20 minutes, something like that, right? Same thing. There's one more type in goal-based, that is rep, number of reps. How many push-ups? […] Tick based or units based bricks this is final in this case unit can user choice ok"

Two locked decisions emerge:

1. **There are only two brick kinds, not three.** A brick is either a **tick** (boolean — did you do it) or a **units** brick (target + free-text unit + done count). The M4c-era "time" kind is conceptually a units brick where the user happens to have typed `"minutes"` as the unit. Rep-based goals are units bricks with `"reps"`. Page counts, glasses of water, deep breaths — all units bricks with whatever the user types.
2. **The app does not count for the user.** No live timer. No auto-incrementing minutes. No chime on completion. The user types the number themselves, like they would type any other progress value. Performance entry is symmetric across all units bricks — a single manual-number input.

ADR-042 (universal duration axis) is preserved as-is in spirit: a units brick can still have `hasDuration: true` with `start: "06:00"` / `end: "06:40"`. The two axes (units = how much / what; duration = when in the day) remain orthogonal. The "30 minutes running 6:00–6:40" example that motivated ADR-042 is now: a units brick with `unit: "minutes"`, `target: 30`, `done: <typed>`, `hasDuration: true`, `start: "06:00"`, `end: "06:40"`. The wording in ADR-042 that referenced three score types (`tick / goal / time`) is harmonized in-place to `tick / units` — the decision itself is unchanged.

**Decision.**

- The `Brick` discriminated union has exactly **two** variants:
  - `kind: "tick"` with `done: boolean`.
  - `kind: "units"` with `target: number`, `unit: string` (free-text, user-typed), `done: number`.
- The M4b discriminator `kind: "goal"` is renamed to `kind: "units"`. The field `count` is renamed to `done` for consistency with the tick variant.
- The M4c discriminator `kind: "time"` is **removed**. All fixtures, components, reducers, and selectors that referenced it migrate to `kind: "units"` with `unit: "minutes"`, `target: <previous durationMin>`, `done: <previous minutesDone>`.
- `AppState.runningTimerBrickId` is **removed**.
- The Action union loses `START_TIMER`, `STOP_TIMER`, `TICK_TIMER`, `SET_TIMER_MINUTES`, and `LOG_GOAL_BRICK`. It gains exactly one new variant: `{ type: "SET_UNITS_DONE"; brickId: string; done: number }`. The reducer clamps `done` to `Math.max(0, Math.floor(done))`.
- `lib/timer.ts`, `lib/timer.test.ts`, `components/TimerSheet.tsx`, `components/TimerSheet.test.tsx`, `public/chime.mp3`, and any `useTimer` hook file are **deleted**.
- A new `<UnitsEntrySheet>` component handles all "log progress" interactions for units bricks. It opens on tap of a units `<BrickChip>`, presents the brick's name, a sub-heading `"Today's <unit>"`, and a single numeric input pre-filled with the brick's current `done` value. Save dispatches `SET_UNITS_DONE`.
- The `<BrickChip>` time-variant rendering branch is deleted. The units variant renders `"<done> / <target> <unit>"` (e.g., `"20 / 30 minutes"`, `"50 / 100 reps"`, `"3 / 8 glasses of water"`).
- The `<AddBrickSheet>` kind selector renders exactly two chips: "Tick" and "Units". The "Time" chip is gone.
- The M4b stepper (±1 buttons on the chip surface) is removed; the chip is a single-tap surface that opens the entry sheet.

**Consequences.**

- **M4e is preserved.** The `hasDuration` toggle, overlap engine, and timeline-promotion contract work identically against the collapsed brick union. M4e tests that exercised the time-kind variant re-point to the units-kind variant with `unit: "minutes"` and remain green.
- **Score-type cardinality drops from 3 to 2.** Any prose, ADR, or doc that says "tick / goal / time" is updated to "tick / units" (the user's locked vocabulary). ADR-035's original three-kind decision is superseded.
- **Timer infrastructure is fully removed.** Roughly 84 grep hits across 31 files migrate or delete. Open loops from `docs/status.md` related to M4c (`useTimer` exhaustive-deps warning, `<TimerSheet>` auto-focus, `chime.mp3` placeholder) all resolve.
- **No persistence migration needed.** M8 owns persistence; no on-disk data exists today. The collapse is a pure-code refactor; the only "migration" is for in-memory test fixtures.
- **Action union shrinks by 4 (5 removed, 1 added).** Reducer becomes simpler. The single new arm (`SET_UNITS_DONE`) is absolute-value (not delta) — typing replaces stepping.
- **Free-text unit unlocks future use cases without schema churn.** "Pages", "km", "glasses of water", "deep breaths" — all valid units. Auto-suggestion or a unit dropdown is M7 polish; not blocking M4f.
- **The `<UnitsEntrySheet>` is reusable.** Future milestones that need a "log a number against a target" interaction (M5 edit mode, M9 history) can compose the same sheet.
- **Reversible (with cost).** If usage signal argues for the timer back, ADR-043 can be superseded; the cost is rebuilding `lib/timer.ts`, restoring the `START/STOP/TICK/SET` actions, restoring `runningTimerBrickId`, restoring the time discriminator. The shipped commit history of M4c can be cherry-referenced. Estimated 1–2 milestone-days of work.

**Out of scope (for ADR-043, addressable in future ADRs):**

- Decimal numbers in `target` or `done` — M7 polish.
- A unit dropdown / autocomplete with common values — M7 polish.
- A "celebrate when done >= target" sound or animation — M7 polish.
- Editing an existing units brick's `target` or `unit` — M5 Edit Mode.
- A quick-log gesture (long-press to increment by 1, swipe to clear) — M7 if usage warrants.
- A history view of past `done` values for the same brick — M9 (depends on M8 persistence with day-stamps).
- Re-introducing any live-timer behavior — **never** per user direction 2026-05-14.

---

## ADR-044 — M8 persisted schema (supersedes ADR-018's schema block)

**Status:** Accepted · 2026-05-15

**Context.** ADR-018 (2026-04-29) decided Phase-1 persistence is a single `localStorage` key `dharma:v1` holding the full `AppState`, loaded two-pass after first paint, via a `lib/persist.ts` module. That transport decision is sound and stands. Its **schema block**, however, predates the brick pivot and the M4f timer rip, and no longer matches the live model:

- ADR-018 specified a `logs: Record<string, BrickLog>` map. There is no such collection — completion state lives directly on the brick (`done: boolean` for `tick`, `done: number` for `units`).
- ADR-018 specified a `timers: Record<string, TimerState>` map. Timer infrastructure was fully removed by ADR-043 (M4f). There are no timers.
- ADR-018 predated `categories` and `looseBricks`, both of which the live `AppState` (`lib/types.ts`, post-M4f) now carries.

The live `AppState` is `{ blocks, categories, looseBricks }`. M8 cannot implement ADR-018's schema literally.

**Decision.** M8 persists the **live post-M4f `AppState`**, plus two persistence fields. The on-disk JSON under `dharma:v1` is:

```ts
type PersistedState = {
  schemaVersion: 1; // migration anchor
  programStart: string; // ISO YYYY-MM-DD, stamped once on first run
  blocks: Block[];
  categories: Category[];
  looseBricks: Brick[];
};
```

- **No `logs` map** — completion lives on bricks.
- **No `timers` map** — timers removed (ADR-043).
- **No `deletions` map in v1** — M5 (Edit Mode + delete) adds `deletions` via a `schemaVersion: 2` bump + a migrator. Adding it now would be a speculative empty field.
- Whether `programStart` / `schemaVersion` live on the in-memory `AppState` or in a persist-boundary wrapper is a PLANNER decision (see SG-m8-04).

**Consequences.**

- ADR-018's schema block is **superseded**; its transport + two-pass-load + `lib/persist.ts` decision is **retained**.
- `schemaVersion` is the migration anchor. v1 has no on-disk predecessor (no prior release persisted anything), so M8 ships the version field + a migrator scaffold but writes no actual v0→v1 migration.
- M5 will bump to `schemaVersion: 2` when it introduces `deletions`.
- `programStart` enables `programStart`-relative day numbering — M1's `dayOfYear()` placeholder is retired.
- A corrupt, unreadable, or unknown-version `dharma:v1` value falls back to the empty-state default; the app never crashes on bad persisted data.
- Reversible: if a future phase needs a separate `logs` collection (e.g. per-day history beyond what bricks carry), that is a `schemaVersion` bump, not a supersede of this ADR.
