# Changelog — M7a

## [unreleased]

### Added (M7a) — Stagger Fade-in + Skeleton Shimmer

- **M7a — Stagger fade-in + skeleton shimmer:** render-layer polish for the Day view.
  On first hydrated paint, the three Day-view surfaces (BlueprintBar, Timeline,
  LooseBricksTray) cascade in with a per-surface stagger — each child `motion.div`
  inherits `staggerChildren` + `delayChildren` from its parent's `variants` so the
  cascade runs automatically via Framer Motion. During the two-pass-hydration window
  (SSR → client first paint) `<BuildingClient>` renders `<Skeleton>` placeholder cards
  instead of the real subtree, eliminating the content-shift flash. `prefers-reduced-motion`
  respected: no stagger animation fires; skeletons still mount and unmount correctly.
  Render-layer only — no schema bump, no new reducer actions, no `localStorage` changes.
  New APIs: `lib/firstPaint.ts` (no-op placeholder, reserved for future paint timing),
  `lib/motion.ts` with `motionTokens` and `staggerForCount(n)` helper, updated
  `usePersistedState` to return a 3-tuple `[state, dispatch, hydrated]`, new
  `components/Skeleton.tsx` (4 variants: `block`/`brick`/`bar`/`ring`; shimmer CSS
  keyframe; `aria-hidden` + `data-testid` affordances), `stagger?: boolean` props on
  BlueprintBar / Timeline / LooseBricksTray, `hydrated?: boolean` prop on `BuildingClient`.
  Resolves spec gaps SG-m7a-01 (stagger not wired), SG-m7a-02 (skeleton not implemented),
  SG-m7a-03 (PRM forwarding not tested). 1302/1302 Vitest across 83 files (+53 tests /
  +4 files vs M6's 1249/79); `test:tz` 11/11. 0 lint errors; `tsc --noEmit` clean.
  Closes U-m7a-001..003, C-m7a-001..012, A-m7a-001..003, E-m7a-001..006
  (a11y + E2E deferred-to-preview). First of five M7 chunks.
- `lib/motion.ts` — new. `motionTokens` object (duration, ease, stagger constants) and
  `staggerForCount(n): number` helper — returns the per-child stagger delay in seconds
  for a parent container of `n` items; clamps to `[0.03, 0.12]` range. Tests: U-m7a-002.
- `usePersistedState` — upgraded to 3-tuple return `[state, dispatch, hydrated]`.
  Third slot `hydrated: boolean` is `false` on the server and first SSR render; flips
  `true` after the `useEffect` rehydration pass. Tests: U-m7a-003.
- `components/Skeleton.tsx` — new. Renders shimmer placeholder cards during the
  pre-hydration window. Four variants: `block` (full-width card), `brick` (inline chip),
  `bar` (full-width thin strip), `ring` (circle). CSS keyframe `skeleton-shimmer` defined
  in `app/globals.css`. `aria-hidden="true"` on all variants; `data-testid="skeleton-{variant}"`.
  Tests: C-m7a-001..004, C-m7a-012.
- `stagger?: boolean` prop on `BlueprintBar`, `Timeline`, `LooseBricksTray` — when `true`,
  wraps children in a Framer Motion `motion.div` stagger container so child `motion.div`s
  inherit cascade timing. `false` (default) renders the component byte-identically to
  pre-M7a. Tests: C-m7a-005..008.
- `hydrated?: boolean` prop on `BuildingClient` — when `false` (during SSR/first paint),
  renders `<Skeleton>` cards in place of BlueprintBar / Timeline / LooseBricksTray.
  When `true`, renders the real subtree with `stagger={true}` on all three surfaces.
  Tests: C-m7a-009..011.
- `tests/e2e/m7a-first-paint.spec.ts` — 6 Playwright e2e specs (deferred to preview).
  IDs: E-m7a-001..006.
- `tests/e2e/m7a.a11y.spec.ts` — 3 Playwright axe-core a11y specs (deferred to preview).
  IDs: A-m7a-001..003.
