## Milestone 7c — Hero % count-up on first load

> **Pillars:** § 0.5 (interaction primitives — the daily score should arrive deliberately, not abruptly); § 0.7 (motion tokens — count-up uses a new `countUp` motion variant with 1.6 s easeOut to match the M0 vocabulary); ADR-023 (two-pass hydration — the count-up fires once, after hydration); M3's HeroRing renders the real % from `dayScore`; phase1plan § Polish Layer (M7 item: "Hero % counts up over 1.6s on first load").

### Intent

The hero's `0%` → real-% jump happens silently at hydration today. M7c animates it: a 1.6 s ease-out count-up from `0` to `dayScore(state)`'s integer percent, fired exactly once on first paint after hydration. Subsequent updates (a brick logged, a block deleted) animate through the existing per-update transition. The ring stroke-dashoffset and the numeral both ride the same count-up so they stay in sync.

M7c is **first-paint only.** Render-layer. No new actions, no schema bump, no new persisted field.

**What this is NOT:** animating the count-up on every score change (only first paint); a count-down (only forward); a count-up in past-day reads (only the live in-progress day; M9c/d/e history reads paint the final score immediately); a count-up under `prefers-reduced-motion` (collapses to the final number, instant); a re-architecture of `<HeroRing>` (it gains a `firstPaintCountUp` boolean prop; nothing else).

### Inputs

- `dayScore(state)` from `lib/dharma.ts` — integer 0–100 of today's percent.
- Existing `<HeroRing>` component.
- Existing two-pass hydration flag.

### Outputs

- `lib/motion.ts` gains a `countUp` variant: `{ durationMs: 1600, easing: "easeOut" }`. Documented in `motion.test.ts`.
- `<HeroRing>` accepts a new prop `firstPaintCountUp?: boolean`. When true, the component's `useEffect` animates a tween from `0` to the incoming `pct` over 1.6 s on mount. Subsequent prop changes skip the tween and re-render normally.
- `BuildingClient.tsx` passes `firstPaintCountUp` true on the first hydrated render, false thereafter (mirrors M7a's `hasStaggeredOnce` ref pattern).
- `prefers-reduced-motion: reduce` → tween collapses to instant; the numeral and stroke render at final value immediately.

### Edge cases

- **First paint with `dayScore === 0`** → no animation (the tween's start and end are both 0); the numeral renders `0%` directly. Documented.
- **First paint with `dayScore === 100`** → animates 0 → 100 over 1.6 s; on completion the bloom + chime animation (M7d) MAY fire if the day is genuinely 100% at hydration. M7d is its own spec; M7c does not couple to it. (If M7d ships before M7c, the bloom won't double-fire because M7d's predicate checks for "transition to 100%", and "rendered as 100% on hydration" is not a transition.)
- **Brick logged during the count-up** → the tween cancels (Framer Motion `animate` last-write-wins) and the new `pct` lands directly via the per-update transition. Documented as not-a-bug.
- **Second mount** (Day view re-mounted via view switcher) → if the ref persists, no re-count-up; if the component re-mounts fresh, it counts up again. PLANNER picks; VERIFIER checks the chosen behavior matches the M7a stagger decision.
- **`prefers-reduced-motion`** → numeral and ring render at final value on mount; no tween.

### Acceptance criteria

**Tween**

1. On the first hydrated paint of `<HeroRing>` in `BuildingClient.tsx`, the numeral and the SVG stroke-dashoffset animate jointly from `0` to `dayScore(state)` over `motionTokens.countUp.durationMs` (1600 ms) with `easeOut`.
2. The numeral updates every animation frame in integer steps (no half-percent display).
3. The tween fires **once per mount.** Subsequent `pct` prop changes re-render via the existing per-update transition, not a count-up.

**Token addition**

4. `lib/motion.ts` exports `motionTokens.countUp = { durationMs: 1600, easing: "easeOut" }`. Covered by `lib/motion.test.ts`.

**Reduced motion**

5. With `prefers-reduced-motion: reduce`, the numeral and stroke render at final value on mount; no per-frame animation runs.

**Quality**

6. `tsc --noEmit` clean; ESLint 0 errors (≤13 warnings); full Vitest suite green; `test:tz` green. Vitest covers: count-up fires once per mount; reduced-motion path renders no tween; integer numeral throughout; subsequent prop changes do not re-count-up.
7. E2E (Playwright, deferred-to-preview): Lighthouse Performance ≥ 90; the count-up completes inside 1.7 s of mount; no layout shift; the stroke and numeral stay in sync to within one frame at every sample.
8. No regression to M1–M9e / M5b / M7a / M7b behavior.

### Open spec gaps (resolve at VERIFY)

- **SG-m7c-01 — Integer rounding strategy.** During the tween, the numeral could display `Math.round(currentPct)` or `Math.floor(currentPct)`. Recommendation: `Math.round` — feels smoother on perception; never overshoots the target by more than half a percent. PLANNER confirms; VERIFIER checks the chosen function is consistent across re-renders.
- **SG-m7c-02 — Easing curve.** `easeOut` per the token, but the exact easing function (`cubic-bezier(...)`) needs to read "decisive but not sluggish". Recommendation: standard Framer Motion `easeOut` (`cubic-bezier(0, 0, 0.2, 1)`). PLANNER picks; VERIFIER checks the easing produces a perceptibly decelerating count.
- **SG-m7c-03 — Coupling with M7a stagger.** The hero is not part of M7a's three-surface stagger (it's its own region). The count-up and the stagger run concurrently, not serialized. Recommendation: leave them concurrent — they target different elements; perceived as "everything coming alive at once". PLANNER confirms; VERIFIER checks no `setTimeout` chaining is introduced to serialize them.
