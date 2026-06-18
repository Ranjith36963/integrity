# Changelog — M4a

## [unreleased]

### Added (M4a)

- **M4a — Tick Brick Logging:** the first user-driven verb. Tap a tick brick to mark it done;
  chip foreground gradient animates 0 → 100%, glyph swaps ☐ → ✓, block scaffold bar grows,
  HeroRing arc updates, BlueprintBar segment opacity updates — all on the same render tick.
  First real-user trigger of M3's wired bloom + chime + fireworks celebrations: block 100%
  → bloom + chime + `success` haptic; day 100% → fireworks overlay (~1.6 s, ≤ 16 particles)
  - chime + `notification` haptic. Both one-shot per crossing (cross-down retriggers).
    Goal + time bricks remain inert (their verbs land in M4b + M4c).
    41 test IDs closed (U-m4a-001..010, C-m4a-001..015, E-m4a-001..010, A-m4a-001..006);
    3 deferred-by-design (AC #22 chime asset gate, AC #31 tsc gate, AC #32 ESLint gate).
- `lib/audio.ts` — new. `playChime()` lazy-builds a single module-scoped HTMLAudioElement
  for `/sounds/chime.mp3`; SSR guard (skips on server); try/catch around `.play()` (silent
  on iOS pre-gesture / offline).
- `components/Fireworks.tsx` — new. Day-100% celebration overlay; ≤ 16 particles; ~1.6 s;
  suppressed under `prefers-reduced-motion`.
- `lib/motion.ts` — `fireworks` Duration token (1600 ms easeOut). Was reserved in M3 plan;
  landed in M4a.

### Changed (M4a)

- `lib/types.ts` — Action union extends with `LOG_TICK_BRICK`. `assertNever` arm preserved.
- `lib/data.ts` — reducer routes `LOG_TICK_BRICK` by `brickId` AND `kind === 'tick'` across
  `state.blocks[*].bricks[]` and `state.looseBricks[]`. Immutable updates throughout.
- `components/BrickChip.tsx` — branches `onClick` by `brick.kind`. Tick chips fire
  `haptics.light()` + dispatch; goal/time chips no-op (M4b + M4c). Native `<button>` with
  `aria-pressed={done}` and enriched aria-label. 44 px touch target honored (ADR-031).
- `components/TimelineBlock.tsx` — threads `onTickToggle` to nested `<BrickChip>`s; wires
  block-100% cross-up via `useCrossUpEffect` to fire bloom + chime + `success` haptic.
- `components/LooseBricksTray.tsx` — threads `onTickToggle` for loose-brick chips.
- `app/(building)/BuildingClient.tsx` — owns `LOG_TICK_BRICK` dispatch; threads callback
  down; wires day-100% cross-up to fire `<Fireworks>` overlay + chime + `notification`
  haptic.

### Notes (M4a)

- `public/sounds/chime.mp3` ships in M4a as a **431-byte placeholder** — sandbox had no
  audio tooling. Replace with a real royalty-free chime ≤ 30 KB before user-facing release.
- E2E + a11y test bodies (E-m4a-001..010, A-m4a-001..006) authored but execution deferred
  to Vercel preview — same M0–M3 sandbox `next dev` socket bind failure pattern.
- **Reduced motion:** `prefers-reduced-motion: reduce` collapses chip-fill / scaffold /
  HeroRing animations to instant; bloom and fireworks visuals suppressed; haptics + chime
  still fire (haptics ≠ motion; audio ≠ motion).

### Harness (M4a)

- `docs(harness)` commit `23662cf` adds Gate D (`npx tsc --noEmit`) to BUILDER contract.
  Closes gap exposed by M4a first attempt: Vitest passed but `tsc` reported 6 net-new
  TypeScript errors (resolved via `asTick` discriminated-union narrowing helper). Effective
  M4b onward.
- ADR-041 collapse of Gate #1 into VERIFIER agent now fully in force from M4a onward.
