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

## ADR-010 — Mobile-Safari Playwright project disabled in this sandbox

**Status:** Accepted · 2026-04-29 (sandbox-scoped)

**Context.** WebKit binaries are not available at the version Playwright requires (`/opt/pw-browsers` ships chromium only). Spec does not mandate WebKit-specific testing.

**Decision.** Comment out the `mobile-safari` (iPhone 14) project in `playwright.config.ts`. Mobile-Chrome (Pixel 7) remains.

**Consequences.** Re-enable when WebKit is available. Don't promise Safari-specific compatibility until then.

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

## ADR-052 — Persisted state uses valibot SHAPE validation with per-field recovery

**Status:** Accepted · 2026-05-23 · proposed by R7 root-cause hardening

**Context.** Pre-R7 `lib/persist.ts` validated only the TYPE of each top-level field (`typeof === "string"`, `Array.isArray`, etc.) and direct-cast the contents (`obj.blocks as Block[]`). Corrupted `localStorage` could carry malformed inner values (e.g., a block missing `recurrence`, a brick with `target: NaN`) through the boundary into downstream helpers. Three example failure modes seen in review:

- `new Date("not-a-date")` → `Invalid Date` → `getFullYear()` returns NaN → `daysInYear` silently returns 365 (the year-overshoot class R2-P0-1 came from).
- A `Brick` of kind `units` with `target: NaN` → live-scoring helpers compute `done / target = NaN` → Hero shows 0% or blank.
- A `recurrence` with missing `kind` discriminator → `appliesOn` falls into an exhaustiveness-check default branch.

The R5-P2-1 JSDoc was the last symptom: it claimed "validation happens at the system boundary (persist.ts)" — false. The boundary only type-checked.

**Decision.** Replace the type-coercion code path with valibot-based SHAPE validation. Schemas live in `lib/persistSchemas.ts`. The migrate flow now parses each top-level field independently. On any field parse failure, that field resets to its `defaultPersisted()` value and the field name is appended to `LoadReport.resetFields`. Other fields are preserved as-is. The UI hook (`usePersistedState`) surfaces the report via toast:

- `kind: "clean" | "fresh" | "migrated"` → silent (normal user paths).
- `kind: "recovered"` → info toast listing reset fields.
- `kind: "discarded"` → error toast ("Saved data was unreadable. Starting fresh.").

`saveState` writes are validated against the v3 schema in dev only (`process.env.NODE_ENV !== "production"`) and log to console on failure — corruption-on-write is a real bug we want to know about in dev, but we never block the write or white-screen the user.

The public surface is backward-compatible: `migrate(raw): PersistedState | null` and `loadState(): PersistedState` keep their pre-R7 signatures (returning just the state). New callers use `loadStateWithReport()` to access the `LoadReport`.

**Consequences.**

- New runtime dependency: `valibot` (~3 KB gzipped). Picked over zod (~12 KB) for the smaller bundle on a mobile-first PWA. valibot's tree-shaking is functional-first, so unused schema kinds drop cleanly.
- Schemas in `persistSchemas.ts` MIRROR `lib/types.ts`. If the types ever drift, the vitest run picks it up.
- ISO-date regex only validates digit positions (`^\d{4}-\d{2}-\d{2}$`), not month/day range. So "2026-13-99" passes the schema. Documented in `lib/persist.r7.test.ts`. Tightening range would require a custom `v.check` transform — deferred until it bites in production.
- A future schema version bump (`SCHEMA_VERSION 3 → 4`) adds a new case to `migrate()` AND a new top-level schema in `persistSchemas.ts`. The per-field recovery flow is reusable.
- ADRs 044 + 045 (additive field discipline) remain in force; this ADR doesn't change them.
- R5-P2-1 closed by side effect.

---

## ADR-053 — CI pipeline blocks merge on e2e + a11y + multi-TZ failures

**Status:** Accepted · 2026-05-23 · proposed by R7 root-cause hardening

**Context.** Through M0..M7e the per-milestone CHANGELOGs read "E-mN-XXX + A-mN-XXX deferred-to-preview" — Playwright and axe ran only when someone remembered to run `npm run eval` locally. Vercel deployed regardless of e2e/a11y state. The original R1 of M1 missed a real schedule-region misalignment (P0-1) precisely because the e2e Playwright suite uses `overflow-x-hidden` and the visual test never ran in CI. Same lineage: A-m1-006 was tautological (R1-SG-3, R1-SG-4, R1-SG-5) because no continuous automation forced anyone to fix it.

The R7 ratchet on lint warnings (ADR-NEXT) has no teeth either if CI doesn't run lint on every PR.

**Decision.** A GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every PR + push to `main` and on manual dispatch. Jobs:

1. **lint (ratchet)** — runs `npm run lint`, fails if warning count exceeds the locked ceiling (initial = 19). Errors fail unconditionally.
2. **typecheck** — `npm run typecheck`.
3. **unit-tests** — `npm test` (Vitest default).
4. **tz-tests** (matrix × 4) — runs `npm run test:tz:pt`, `:tokyo`, `:utc`, `:nepal` in parallel.
5. **e2e** — `npm run test:e2e` (Playwright). Uploads report on failure.
6. **a11y** — `npm run test:a11y` (Playwright + axe). Uploads report on failure.
7. **ci-gate** — aggregate, `needs: [all]`. The branch-protection required check.

`concurrency` cancels in-progress runs on the same branch (cost control). Each PR cancels its own previous run.

Vercel deploy continues to deploy preview URLs for every PR — but the user (and main branch) only get a merge-able state once `ci-gate` passes. Production main is the only `main` deploy target.

**Consequences.**

- Adds GitHub-billable CI minutes. Estimate: ~12 min per PR (lint 1, typecheck 1, unit 2, tz×4 in parallel = 2, e2e 4, a11y 2). Within free tier for personal accounts.
- Playwright installation is cached via `actions/setup-node`'s `cache: npm` — first PR takes longer, subsequent are fast.
- e2e and a11y tests that have been "deferred to preview" in CHANGELOGs (M4a..M9e + M1 hardening rounds) now actually run. Any latent failure becomes visible at PR time.
- The aggregate `ci-gate` exists so branch protection rules can require a single check name. Adding/removing jobs upstream does not change the required check.
- Future jobs (mutation testing R7-ROOT-2, doc-ref checksum R7-ROOT-9, pre-commit TZ guard R7-ROOT-10) plug into the same `needs:` list.

---

## ADR-054 — Mutation testing via Stryker (initial scope: pure date libs)

**Status:** Accepted · 2026-05-23 · proposed by R7 root-cause hardening

**Context.** The two M0 + M1 hardening loops surfaced a recurring "tests pass for the wrong reason" failure mode. The most expensive instance was M1's R2-P0-1 P0 — a Jan-1 negative-UTC bug — where the R1 "regression guard" (`lib/dayOfYear.tz.test.ts`) used a parallel inline implementation of the ISO-date-parse trick. The production code path was never exercised; the test would have stayed green after a revert. The R3 fix forced the test to import the production helper.

That's one bug fixed by inspection. The broader question is: how many other tests in the suite have the same flaw? Mutation testing is the structural answer — Stryker rewrites operators / branches / values in the production code and reports which mutations the test suite catches (mutation score). Low scores flag tests that can't tell the production code from a mutation.

**Decision.** Add Stryker via `@stryker-mutator/core` + `@stryker-mutator/vitest-runner`. Initial mutation scope: three small pure libs that absorbed the most root-cause hardening:

- `lib/dharma.ts` (today, isoToLocalDate, dayNumber, dateLabel, dayPct)
- `lib/dayOfYear.ts` (dayOfYear, daysInYear)
- `lib/timeOffset.ts` (timeToOffsetPx, clampOffsetPx, HOUR_HEIGHT_PX)

Run modes:

- `npm run test:mutation` — local invocation.
- `.github/workflows/mutation.yml` — runs on (a) Sunday 06:00 UTC schedule, (b) manual workflow_dispatch, (c) PRs touching `lib/**` or the Stryker config. Currently `continue-on-error: true` — advisory, not blocking. Promote to required after one stable green week by removing the flag and adding `mutation` to `ci-gate`'s `needs:`.

Thresholds (in `stryker.config.json`):

- `high: 90` (gold standard)
- `low: 75` (yellow flag)
- `break: 60` (red — fail Stryker; flagged for inspection)

Incremental mode is enabled (`incrementalFile: .stryker-tmp/incremental.json`) so re-runs after small code changes are fast. The `.stryker-tmp` and `reports/` dirs are gitignored.

**Consequences.**

- New dev-only deps: `@stryker-mutator/core` (~6 MB unpacked, dev only) + `@stryker-mutator/vitest-runner`. Zero impact on the production bundle.
- Initial run takes ~5-15 minutes. Subsequent incremental runs much faster.
- The HTML report uploaded as a GitHub Actions artifact is the audit surface — open the URL after a run to see which mutations survived.
- Expanding scope to `lib/history.ts`, `lib/appliesOn.ts`, `lib/overlap.ts`, etc. is a follow-up: add file path to the `mutate` array in `stryker.config.json` once initial scope holds.
- The mutation score is a NEW metric tracked over time. Initial baseline TBD on the first run; document the actual score in this ADR via amendment once measured.

---
