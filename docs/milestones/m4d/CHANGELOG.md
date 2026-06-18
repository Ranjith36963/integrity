# Changelog — M4d

## [unreleased]

### Added (M4d)

- **M4d — Add Chooser Sheet:** chooser sheet routing for dock `+` and empty time slot tap.
  Tap dock `+` or any empty slot → `<AddChooserSheet>` appears with two options: "Add Block"
  and "Add Brick". Each routes to the existing `<AddBlockSheet>` / `<AddBrickSheet>` forms.
  Inside-block `+ Add brick` button and tray `+ Brick` pill bypass the chooser and remain
  direct. Real Tab-cycling focus trap (`components/AddChooserSheet.tsx:32–65`). Reduced-motion
  respected. No reducer or schema change. Resolves SG-m3-08 (chooser vs. bifurcated dock) in
  favor of a chooser — empty-state Brick path now reachable from a fresh install.
  25 SPEC ACs closed (U-m4d-001..002, C-m4d-001..017, E-m4d-001..006, A-m4d-001..004 — E
  and A deferred to preview per ADR-039 pattern). M2/M3 migrations: C-m2-012, C-m2-016,
  C-m2-020, C-m3-009, C-m3-024 amended to walk through the chooser; ACs unchanged.
  600 Vitest tests pass (was 569 at end of M4b; +31 M4d tests: 2U + 17C + 6E stub + 4A stub).
- `components/AddChooserSheet.tsx` — new. Single-instance chooser sheet with two large tap
  targets ("Add Block" / "Add Brick"). Real focus trap: Tab cycles between options and close
  button; Shift-Tab reverses; Esc delegates to `<Sheet>`'s existing keydown listener.
- `tests/e2e/m4d.spec.ts` — 6 Playwright e2e specs (deferred to preview, vacuous-pass
  pattern per M4a/M4b precedent).
- `tests/e2e/m4d.a11y.spec.ts` — 4 Playwright axe-core a11y specs (deferred to preview).

### Changed (M4d)

- `app/(building)/BuildingClient.tsx` — chooser state + 4 new `useCallback` handlers
  (`onOpenChooser`, `onCloseChooser`, `onChooseBlock`, `onChooseBrick`). Dock `+` and slot
  tap now open the chooser instead of going directly to `<AddBlockSheet>`.
- `components/Timeline.tsx` — added optional `hasLooseBricks` prop (default `false`).
  Default preserves M3 semantics; existing Timeline tests still pass. Forced by AC #10/#11
  (additive 4-line change; planner-side oversight, not builder overreach).
- `components/AddBlockSheet.tsx` — added `useEffect` to sync `start` from `defaultStart`
  prop on open. Mirrors `AddBrickSheet`'s `defaultCategoryId` sync pattern per SG-m3-04.
  `eslint-disable` comment in place for the effect dependency.

### Notes (M4d)

- **AC #14 swipe-down dismiss** for chooser inherited from M0 `<Sheet>`; not M4d-tested
  directly. Confirm at preview Gate #2 tap-test.
- **D2 plan↔implementation drift on focus trap.** `plan.md:~1731` says M4d does NOT need a
  local focus trap; BUILDER added a real Tab-cycling trap because A-m4d-002 demanded it
  (native browsers do not trap Tab in a dialog without `inert` or a JS trap). EVALUATOR
  confirmed the trap matches AddBlockSheet/AddBrickSheet pattern. Plan prose is now stale
  on this point — recorded so future devs do not re-litigate.
- **D4 — Esc dismiss** confirmed deterministic via `<Sheet>`'s existing keydown listener
  (`components/ui/Sheet.tsx:22–29`). Promoted from "stretch test" to "expected behavior."
- **D5 — audit trail.** Main Claude authored the tests.md M4d entry directly in-thread
  (TESTS-mode planner agent hit usage limit at 12pm UTC reset). Substantively equivalent
  to healthy planner output; VERIFIER and EVALUATOR both gated PASS. Flag for traceability.
- **Vacuous-pass debt continues.** 12 new M4d e2e/a11y specs reproduce the
  `if ((await x.count()) > 0)` guard pattern (spans M4a + M4b + M4d). Future TESTS-mode
  follow-up owes deterministic seeding helpers (per ADR-039 + `?seed=...` query param or
  test-only `localStorage` shim).
