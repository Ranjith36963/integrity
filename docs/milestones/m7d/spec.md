## Milestone 7d — Block 100% bloom + Day 100% fireworks (visual only; audio deferred)

> **Pillars:** § 0.5 (celebrations are earned and sparing); § 0.7 (motion tokens — `bloom: { stiffness: 220, damping: 22 }` from M0; `fireworks: { durationMs: 1600, easing: "easeOut" }` from M4a — both consumed unchanged); phase1plan § Polish Layer (M7 items: "Block 100% → bloom + chime" + "Day 100% → fireworks"); **SG-m4f-05** (chime asset still placeholder; audio explicitly deferred from M7d per user authorization on 2026-05-20).

### Intent

When a block transitions from <100% to exactly 100% — a brick log that finishes the last brick in the block — the block card runs the M0 `bloom` spring (a scale-up flourish on the block's accent ring/outline). When the day transitions from <100% to 100% (every visible block is 100%), a fireworks overlay sweeps across the hero region using M4a's `fireworks` token. Both fire on **transition only**, never on a state that was already 100% at mount (rules out replays at hydration). Both honor `prefers-reduced-motion`.

**Audio is deferred.** `public/sounds/chime.mp3` is a 431-byte placeholder; M7d ships visuals only and leaves a documented hook (`celebrate(kind: 'block' | 'day')`) that a follow-up can fill once a real audio asset lands.

**What this is NOT:** an audio implementation (deferred — see SG-m7d-01); the Empire square unlock animation (deferred to M9 follow-up per phase1plan); a celebration on `appliesOn`-suppressed blocks (suppressed blocks aren't visible, so they can't transition to 100% via UI); a celebration on history-archived 100% days (only the live in-progress day fires; past 100% days were celebrated when they happened); a celebration on `prefers-reduced-motion` (collapses to a static "completed" pulse).

### Inputs

- `motionTokens.bloom` (M0) and `motionTokens.fireworks` (M4a) — both unchanged.
- `blockScore(block)` and `dayScore(state)` from `lib/dharma.ts` — both pure.
- The existing `lib/celebrations.ts` module (M4a — already houses the day-100% celebration plumbing).

### Outputs

- `lib/celebrations.ts` extended with a `celebrateBlock(blockId: string)` API and a transition-detection predicate so a brick-log reducer effect can call `celebrate(...)` exactly when the block crosses to 100%.
- `components/BlockCard.tsx` (or equivalent) consumes the celebration signal and runs a Framer Motion `<motion.div animate={...}>` bloom on the accent ring.
- The fireworks overlay (already partially implemented in M4a) is wired to fire on the day's first transition to 100% per mount; suppressed on `prefers-reduced-motion` (replaced by a static "Day complete." text card).
- A `celebrate(kind, opts)` shim that takes a `withAudio?: boolean` param defaulting to `false`. M7d wires `withAudio: false`; a follow-up replaces the placeholder chime and flips the default.
- `tests/celebrations.test.ts` covers: block transition 99→100 fires bloom; 100→100 does not re-fire; day transition n<100→100 fires fireworks; hydration into a 100% day does not fire fireworks; reduced-motion path renders the static text card.

### Edge cases

- **Hydration into a state where a block is already 100%** → no bloom (no transition).
- **Hydration into a 100% day** → no fireworks (no transition); the hero count-up (M7c) lands at 100% smoothly without celebration.
- **A brick is logged that pushes block A from 99→100 but block B from 100→99** (re-toggling) → A fires bloom; B does not; if no block was at 100 before the action, no day-100 fires.
- **A user undoes a tick that drops a block from 100→99** → no celebration replays in reverse; the bloom is a one-way animation.
- **`appliesOn`-suppressed blocks** → not in `visibleBlocks`; cannot affect `dayScore` or fire a bloom.
- **`prefers-reduced-motion`** → block bloom collapses to a 600 ms opacity flash on the accent ring (no spring); day fireworks collapse to a static "Day complete." text card center-screen for 2 s, then fades.
- **Audio gate** → `withAudio` is `false` in M7d; no audio plays. Documented; the audio hook is in place for a follow-up.

### Acceptance criteria

**Block bloom**

1. When a brick log transitions a block from `<100` to exactly `100`, the block card runs the M0 `bloom` spring on its accent ring/outline exactly once.
2. A block that was at 100% at hydration does not bloom on mount.
3. A block that drops from 100% does not re-bloom on the next 100% crossing within the same mount (per M0 — celebrations are sparing). PLANNER may relax this to "once per mount per block"; VERIFIER ratifies.

**Day fireworks**

4. When `dayScore(state)` transitions from `<100` to exactly `100`, the fireworks overlay fires once per mount, consuming `motionTokens.fireworks` unchanged.
5. A day that was at 100% at hydration does not fire fireworks on mount.

**Reduced motion**

6. With `prefers-reduced-motion: reduce`, the block bloom collapses to a 600 ms opacity flash; the day fireworks collapse to a "Day complete." text card.

**Audio deferral**

7. `celebrate(kind, { withAudio: false })` is the M7d default. No call to `lib/audio.ts`'s play API fires from M7d's celebration path. The audio hook is documented in `lib/celebrations.ts`'s docstring as "wire when a real `chime.mp3` lands (>30 KB, ≤30 KB target per SG-m4a-04)".

**Quality**

8. `tsc --noEmit` clean; ESLint 0 errors (≤13 warnings); full Vitest suite green; `test:tz` green. Vitest covers all transition predicates above and the audio-off invariant.
9. E2E (Playwright, deferred-to-preview): Lighthouse Performance ≥ 90; the fireworks render at ≥ 55 fps over a 2 s trace; no console error on celebration paths.
10. No regression to M1–M9e / M5b / M7a / M7b / M7c behavior.

### Open spec gaps (resolve at VERIFY)

- **SG-m7d-01 — Audio asset.** `public/sounds/chime.mp3` is a 431-byte placeholder. M7d ships visuals only; the audio hook is in place but disabled. Recommendation (logged 2026-05-20): a follow-up spec entry (`m7f`?) ships the real asset and flips `withAudio: true`. PLANNER confirms the audio path remains a one-line change.
- **SG-m7d-02 — Block re-bloom semantics.** A block that goes 99→100→99→100 within one mount: should the second 100 crossing bloom? Recommendation: **no** — celebrations are sparing per § 0.5; once per block per mount. PLANNER confirms; VERIFIER checks the `Set<string>` of bloomed-this-mount block ids exists.
- **SG-m7d-03 — Fireworks visual.** M4a's `fireworks` token specifies duration (1600 ms easeOut); the visual is not specified. Recommendation: a particle burst SVG overlaid on the hero, accent-tinted, fading out over the token duration. PLANNER picks the exact rendering (CSS particles vs. SVG vs. Lottie); VERIFIER checks no new third-party dependency is introduced.
