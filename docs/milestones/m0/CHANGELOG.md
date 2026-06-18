# Changelog — M0

## [unreleased]

### Changed (M0) — Post-ship Hardening Pass

A targeted code-review loop (Rounds 1–5) on the already-shipped M0 design
system surfaced and fixed 47 issues across the primitive components.
Render-layer only; no schema bump (SCHEMA_VERSION stays at 3); no public-API
breaking changes for in-tree callers; no new dependency.

**Why this exists (not in original M0):** the original M0 ship closed Gate
#2 on 2026-05-05 and was tap-tested. A subsequent re-verification dispatched
a deep multi-round code review against the existing M0 primitives. Each
round produced findings, those were fixed, and the next round audited the
fix surface. The loop terminated on Round 5 with zero findings.

**Convergence trend:**

- Round 1: 24 findings (original bugs in shipped M0)
- Round 2: 12 findings (5 were meta-bugs introduced by Round 1 fixes)
- Round 3: 5 findings (1 was a meta-bug from Round 2 — a tautological test)
- Round 4: 1 finding (NIT — symmetric case of an R3-5 fix)
- Round 5: 0 findings → loop terminated

**Components touched:**

- **Button** — `disabled || loading` coupling now honored; `aria-busy`
  fallback for loading state with non-string children; JSDoc clarifies that
  the loading-disables-click coupling is deliberate (no override hatch — by
  design, prevents double-submit).
- **Modal + Sheet** — `aria-labelledby` exposed; defensive `aria-label={title}`
  fallback retained even when `aria-labelledby` is supplied, so broken
  labelledby references (typo'd id, lazy-rendered heading) cannot leave the
  dialog nameless. `<UnitsEntrySheet>` wires the inner heading id.
- **Stepper** — five hardenings:
  - SC-1: long-press closure tracks latest value via `valueRef` (not the
    snapshot from press-start).
  - NEW-1: `isPressedRef` guard skips the post-render `valueRef` sync while
    a long-press is in flight, so unrelated parent re-renders cannot reset
    optimistic in-tick advances.
  - SC-3: `onPointerCancel` now stops the interval (iOS Safari fires this
    on system-gesture interruption).
  - R3-1: `commit()` detects boundary hits (`next === current`) and calls
    `stopLongPress()` itself — closes a Tailwind `disabled:pointer-events-none`
    leak that swallowed `pointerup` once the boundary was hit.
  - R3-3: re-entrant `pointerdown` guard prevents `intervalRef` overwrite
    (multi-touch, gesture-lib re-fire).
  - R3-4: `min`/`max`/`step` mirrored into refs synced via the same effect,
    so a parent that mutates bounds mid-press takes effect immediately.
- **BlockCard** — `<button>` overlay architecture (NEW-4): root is always
  `<div>` for stable DOM identity across `editMode` toggle; an absolute-
  positioned `<button>` overlay (sibling, not wrapper) captures clicks +
  keyboard activation when interactive. Eliminates mount churn on `editMode`
  toggle, button-in-button HTML invalidity for nested interactives, and
  the silenced-children accessibility-name bug.
- **Viewport / layout** — `userScalable` is left unset (allowed); explicit
  regression guard via parse-the-export-block test (TEST-3 strengthening).
- **Harness (`/design`)** — removed an orphan `data-testid` on `<BlockCard>`
  (R3-5) and a duplicate `data-testid="stepper"` (R4-NIT-1).

**Test surface:**

- 1582 Vitest tests across 97 files (+12 since pre-hardening: C-m0-024..035).
- 0 TS errors.
- 19 lint warnings (under the ≤ 20 ceiling).
- All new tests are mutation-resistant (R3-2 strengthening: the
  previously-tautological `C-m0-030` was rewritten with a frozen-parent that
  actually exercises the bug path).

**Closed test IDs (added by the hardening pass):**

- `C-m0-024` — Button `disabled || loading` coupling
- `C-m0-025` — Button aria-busy + aria-label fallback for loading
- `C-m0-026` — Sheet exposes accessible name in all three label combinations
- `C-m0-027` — Modal exposes accessible name in all three label combinations
- `C-m0-028` — BlockCard keyboard accessibility via overlay
- `C-m0-029` — Viewport does not disable user-scalable (parse-the-export-block)
- `C-m0-030` — Stepper `valueRef` survives unrelated re-renders mid-press
- `C-m0-031` — BlockCard root DOM identity stable across editMode toggle
- `C-m0-032` — Stepper long-press stops on `pointercancel`
- `C-m0-033` — BlockCard children remain in the accessibility tree
- `C-m0-034` — Stepper interval clears on boundary hit (no leak)
- `C-m0-035` — Stepper re-entrant pointerdown guard

**Ship commits (chronological):**

- `2b9177d` — Button disabled honors loading; aria-label fallback for busy state (BT-1, BT-2)
- `948df0f` — Modal+Sheet expose aria-labelledby; UnitsEntry wires it (MS-1, MS-2)
- `6e4fe1c` — BlockCard renders as button when interactive (BC-2)
- `18a1815` — Viewport allows user-scalable; pinch-zoom restored (GM-7)
- `8e9f032` — Stepper valueref guards during long-press (NEW-1, TEST-1)
- `6c9e637` — Modal+Sheet keep title as defensive aria-label fallback (NEW-2, TEST-2)
- `d2a0c96` — BlockCard overlay button stabilizes root DOM (NEW-4)
- `5d6791c` — Round-2 remainders (SC-3, TEST-3, NEW-3, NEW-5 doc)
- `82fded4` — Round-3 findings closed (R3-1..R3-5)
- `ef60581` — Duplicate stepper data-testid removed (R4-NIT-1)

**ADR notes:** No new ADRs required. The loop-until-clean pattern that
governed this hardening pass is consistent with ADR-024 (capped retry loops)
and ADR-041 (single human gate). A retrospective worth capturing for future
milestones: per-round meta-bug rate is a strong loop-termination signal —
when it hits zero, ship.
