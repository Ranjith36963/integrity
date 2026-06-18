## Milestone 7a — Stagger fade-in + skeleton shimmer

> **Pillars:** § 0.5 (interaction primitives — first paint should feel deliberate, not abrupt); § 0.7 (motion tokens — `stagger: 30ms` and the existing `prefers-reduced-motion` collapse); ADR-023 (two-pass hydration: server paints, client rehydrates without mismatch); phase1plan § Polish Layer (M7 item: "Stagger fade-in on page load 30ms between cards" + "Loading states: skeleton blocks with shimmer"). No new motion tokens; M7a consumes `motionTokens.stagger` from `lib/motion.ts` unchanged.

### Intent

The current first-paint paints everything simultaneously — blocks, BlueprintBar, Timeline, LooseBricksTray. It's correct but lifeless. M7a wraps the Day-view's three repeating-card surfaces (the timeline's visible blocks, the BlueprintBar segments, the LooseBricksTray chips) in a Framer Motion stagger so each card enters with a 30 ms delay against its sibling, producing a single deliberate cascade on initial paint. During the two-pass hydration window (ADR-023) — the brief moment between server paint and client-state ready — the same three surfaces render skeleton placeholders with a subtle shimmer so the screen reads as "loading", not "broken". The skeleton fades out and the real cards fade in (with the stagger) the moment client state lands.

M7a is **first-paint only.** Subsequent re-renders (a brick logged, a block added, the now-line ticking) do not re-stagger; they animate per their existing motion. Stagger and skeleton are render-layer; no data model changes, no schema bump, no new actions, no new persisted field.

**What this is NOT:** a re-architecture of `BuildingClient.tsx` or any of its data flow; a new global "is loading" Redux/Zustand store (the existing two-pass hydration flag is consulted, not replaced); a stagger on every state update (only the first paint after hydration completes); animating items that did not exist on first paint (an added block enters via its existing add-flow motion, not a stagger); a Lighthouse perf regression (skeleton + stagger must not push Performance below the 90 floor).

### Inputs

- Existing `motionTokens.stagger` (30 ms per-sibling delay) from `lib/motion.ts`.
- The two-pass hydration flag already in `BuildingClient.tsx` / persistence layer (per ADR-023; M8 hydration). M7a does not introduce a new flag.
- The same three Day-view surfaces M5b touched: BlueprintBar (segments), Timeline (visible blocks), LooseBricksTray (chips).

### Outputs

- `components/SkeletonBlock.tsx` + `components/SkeletonChip.tsx` + `components/SkeletonSegment.tsx` (or one shared `<Skeleton>` primitive — PLANNER decides), each rendering an outlined card/chip/segment with a CSS shimmer keyframe.
- `components/Timeline.tsx`, `components/BlueprintBar.tsx`, `components/LooseBricksTray.tsx` each wrap their iterated items in a Framer Motion `<motion.div>` with `initial / animate / transition` honoring `staggerChildren: 0.03`, **gated on first-paint-after-hydration only**.
- A small `lib/firstPaint.ts` (or a reused React `useEffect` ref) that flips `hasStaggeredOnce.current = true` after the first hydrated render so subsequent updates skip the stagger.
- `prefers-reduced-motion` branch: stagger collapses to instant; shimmer collapses to a static neutral fill (no animated keyframe). Verified at the CSS level via `@media (prefers-reduced-motion: reduce)`.
- No new actions, no new persisted state, no schema bump.

### Edge cases

- **Empty Day (no blocks, no loose bricks)** → no stagger fires (nothing to stagger); the EmptyBlocks card paints with its existing motion. No skeleton either (hydration completed, state is genuinely empty).
- **Single block** → renders with no perceptible stagger (one child × 30 ms = 30 ms total). Correct; not a bug.
- **Many blocks (10+)** → total stagger time = `N × 30 ms`. At N=10 that's 300 ms total — well under any perceived lag. PLANNER may cap with a `staggerChildren` ceiling if N grows pathological; M7a documents the cap rather than discovering it later.
- **`prefers-reduced-motion`** → stagger collapses to `duration: 0`; shimmer is a flat solid swatch (no animated gradient).
- **State update during stagger** → if a user logs a brick at the same instant the stagger is animating in, the brick-fill animation overrides (Framer Motion handles last-write-wins on `animate` props). M7a documents that the brick-fill animation always wins.
- **Server paint** → renders skeleton placeholders directly (the persistence layer's two-pass pattern hands the server an empty state). Client hydrates, fades skeleton out, fades real cards in with stagger.
- **Second navigation to the Day view (e.g., from Week → Day)** → first-paint stagger fires again **only if** the component re-mounts. PLANNER decides if Day view re-mounts on view-switcher tap; if it persists across views, the stagger does not re-fire (the `useRef` survives).
- **Reduced-motion + many blocks** → skeleton stays static; real cards swap in instantly with no per-sibling delay.
- **Lighthouse / 60fps** → the stagger + shimmer must not regress Performance below 90 or drop frames during the cascade. Verified via Playwright trace.

### Acceptance criteria

**Stagger**

1. On the first hydrated paint of `BuildingClient.tsx`, the BlueprintBar's category segments, the Timeline's visible blocks, and the LooseBricksTray's chips each enter with a per-sibling delay of `motionTokens.stagger.durationMs` (30 ms), in source order.
2. The stagger fires **once per mount** of `BuildingClient.tsx`. A brick-log update, an add-block action, or a now-line tick does not re-trigger the stagger.
3. The stagger consumes the existing `motionTokens.stagger` token; M7a does not modify `lib/motion.ts`.

**Skeleton**

4. Before client hydration completes, the three surfaces render their `<Skeleton…>` variants — outlined cards with a CSS shimmer keyframe.
5. The skeleton fades out at the same instant the real cards begin staggering in; there is no overlap of skeleton + real card in the same row.
6. The skeleton DOM matches the real card's bounding box (same height, same padding) so no layout shift occurs at swap.

**Reduced motion**

7. With `prefers-reduced-motion: reduce`, the stagger collapses to instant (`duration: 0`) and the shimmer collapses to a flat solid swatch — no animation.

**Quality**

8. `tsc --noEmit` clean; ESLint 0 errors (≤13 warnings); full Vitest suite green; `test:tz` green. Vitest covers: stagger fires once per mount; reduced-motion path renders zero animation; skeleton-to-real swap has identical bounding boxes; first-paint ref guards subsequent renders from re-staggering.
9. E2E (Playwright, deferred-to-preview): Lighthouse Performance ≥ 90 on the post-M7a Day view; no Cumulative Layout Shift at hydration; the stagger cascade completes inside `N × 30 ms + 100 ms` overhead.
10. No regression to M1–M9e / M5b behavior; the Day view, calendar views, and all add/edit/delete flows continue to behave identically.

### Open spec gaps (resolve at VERIFY)

- **SG-m7a-01 — Stagger ceiling.** If a user has 30 blocks, raw 30 × 30 ms = 900 ms total stagger — perceptibly slow. Recommendation: cap at `staggerChildren: 0.02` once N > 15 (so total stagger ≤ 600 ms even at N=30). PLANNER decides the exact piecewise function; VERIFIER checks it is documented in `lib/motion.ts` if a new motion variant is added.
- **SG-m7a-02 — Skeleton count.** During the hydration window, how many skeleton blocks render? Recommendation: 3 skeleton blocks + 1 skeleton chip — enough to communicate "loading", small enough to render in under one frame. PLANNER confirms; VERIFIER checks no skeleton renders after hydration.
- **SG-m7a-03 — Shimmer asset cost.** CSS keyframe vs. an `<img>` shimmer vs. SVG. Recommendation: pure CSS keyframe (`linear-gradient` + `background-position` animation) — zero asset weight, GPU-accelerated. PLANNER picks; VERIFIER checks the chosen path adds no new image/font asset.
