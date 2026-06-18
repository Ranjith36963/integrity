## Milestone 7b — Live now-line glow + active-block pulsing glow + NOW tag

> **Pillars:** § 0.5 (interaction primitives — the present moment should be the visually loudest thing on screen); § 0.7 (motion tokens — pulsing glow uses a CSS keyframe consistent with the existing `pulse`-style M0 vocabulary); ADR-023 (`useNow()` ticks every 60 s; M7b consumes the existing tick, never introduces a second clock); M1's amber `--accent` now-line on the timeline; phase1plan § Polish Layer (M7 items: "Live now-line — amber, glowing, sweeps timeline all day" + "Current block: pulsing glow, NOW tag").

### Intent

The now-line today is a 1 px amber rule — correct but quiet. M7b makes the present moment unmissable: the now-line gains a soft amber glow (CSS `filter: drop-shadow` or `box-shadow`), and the **active block** (the unique block whose half-open interval `[start, end)` contains `useNow()`'s current time) gets a pulsing glow ring plus a `NOW` tag badge anchored at the block's top-right corner. As time advances and the active block changes (the prior block ends, the next begins), the glow + tag move with it — no manual recomputation; the active-block predicate is recomputed on every `useNow()` tick.

M7b is **render-layer only.** No new actions. No schema bump. No new persisted state. The predicate `isActiveBlock(block, now)` is a pure function — already trivially expressible from existing `start`/`end` and the existing overlap helpers in `lib/overlap.ts`.

**What this is NOT:** a `NowCard` component (deferred since M1; M7b's `NOW` tag is a small badge on the existing block card, not a separate region); making non-active blocks glow at all (only the one block whose interval contains `now`); changing the now-line's vertical position math (M1's geometry stands); a multi-active-block case (blocks are half-open per ADR-006 — at most one block contains `now` at any instant); animation during `prefers-reduced-motion` (collapses to a static amber outline + static `NOW` tag — no pulse keyframe).

### Inputs

- Existing `useNow()` hook from `lib/useNow.ts` (returns `"HH:MM"`; ticks every 60 s; ADR-023).
- Existing `intervalsOverlap` / half-open `[start, end)` semantics from `lib/overlap.ts` (M4e).
- Existing `--accent` amber token from M0.
- The visible-today blocks the Day view already computes (M5b's `currentDayBlocks(state)`).

### Outputs

- `lib/activeBlock.ts` exporting a pure `activeBlockId(blocks: Block[], now: string): string | null` returning the id of the unique block whose `[start, end)` contains `now`, or `null` if none. Tested unit-level.
- `components/Timeline.tsx` (or a small new `<NowGlow>` sub-component) renders the now-line with a CSS `filter: drop-shadow(0 0 8px var(--accent))`.
- The block card (already rendered by the Timeline) gains a conditional CSS class `is-active` when `block.id === activeBlockId(visibleBlocks, now)`. That class applies a pulsing CSS keyframe (`@keyframes nowPulse`) on the card's outline + a static `NOW` badge in the card's top-right.
- `@media (prefers-reduced-motion: reduce)` rule: `nowPulse` becomes a static amber outline; the badge still renders.

### Edge cases

- **Before the first block, between blocks, after the last block** → `activeBlockId` returns `null`; no block pulses; no `NOW` badge renders. The now-line itself still glows (it always exists).
- **Block whose `end` is `undefined`** (a block created without an end) → per ADR-006 it has no half-open interval and so is not considered active. PLANNER confirms (the M2 schema allows `end?` to be undefined).
- **Block exactly at the boundary** (`now` == `block.end`) → half-open semantics ⇒ NOT active. The next block (or no block) takes over.
- **A block deleted via `deletions` for today** → does not appear in `visibleBlocks` so cannot be the active block.
- **A block whose `appliesOn` returns false for today** (post-M5b) → does not appear in `visibleBlocks` so cannot be the active block.
- **Tick frequency** → `useNow()` ticks every 60 s; the `NOW` tag may linger up to 59 s past a block end before it migrates. Acceptable; documented; no new clock is introduced.
- **Multiple blocks claiming `now`** (only possible if the schema allowed it, which it doesn't — M4e's overlap engine forbids construction of overlapping blocks) → `activeBlockId` returns the first by source order; an assertion or invariant log fires (defensive — should never trip).
- **`prefers-reduced-motion`** → the now-line still glows (CSS box-shadow is not motion); the block outline becomes static amber; the `NOW` badge still renders.

### Acceptance criteria

**Active-block predicate**

1. `lib/activeBlock.ts` exports `activeBlockId(blocks: Block[], now: string): string | null` — pure (no clock reads, no `localStorage`, no mutation).
2. The predicate uses half-open `[start, end)` semantics: a block whose `start === now` is active; a block whose `end === now` is NOT.
3. Returns `null` when no block contains `now` or when every visible block has `end === undefined`.

**Now-line glow**

4. The Timeline's now-line renders with a soft amber drop-shadow / box-shadow visible on dark theme.
5. The glow position updates with `useNow()`'s tick; M7b does not introduce a second clock.

**Active-block pulse + NOW tag**

6. The block card whose id matches `activeBlockId(visibleBlocks, now)` renders with a pulsing CSS keyframe on its outline (or border) and a `NOW` text badge in its top-right corner.
7. Exactly one block at a time carries the `is-active` styling; when `now` crosses into the next block's interval (within the 60 s tick budget), the styling migrates.
8. With `prefers-reduced-motion: reduce`, the pulse collapses to a static amber outline; the `NOW` badge remains.

**Quality**

9. `tsc --noEmit` clean; ESLint 0 errors (≤13 warnings); full Vitest suite green; `test:tz` green. Vitest covers: `activeBlockId` truth table (before/after blocks, mid-block, on-boundary `start` and `end`, empty `end`, deletions-suppressed, appliesOn-suppressed); the Timeline applies `is-active` to exactly one block; reduced-motion path renders no keyframe animation.
10. E2E (Playwright, deferred-to-preview): Lighthouse Performance ≥ 90; the pulse animation runs at ≥ 55 fps over a 5 s trace; the `NOW` badge text is `aria-label`'d for screen readers.
11. No regression to M1–M9e / M5b / M7a behavior.

### Open spec gaps (resolve at VERIFY)

- **SG-m7b-01 — Pulse cadence.** The pulse keyframe duration and easing — 1.6 s `easeInOut`? 2 s linear breathing? Recommendation: 1.8 s `easeInOut` opacity 0.6 → 1.0 → 0.6 on the outline. PLANNER picks; VERIFIER checks the timing is documented as a CSS variable (`--motion-now-pulse-duration`).
- **SG-m7b-02 — NOW badge placement and contrast.** Top-right vs. inline-left; accent fill vs. accent outline. Recommendation: top-right corner, accent fill, ink-on-accent text, 8 px corner inset; passes WCAG AA against `--accent`. PLANNER confirms; VERIFIER runs axe.
- **SG-m7b-03 — Now-line glow vs. block glow visual weight.** Both glowing risks competing for attention. Recommendation: now-line shadow is small (`drop-shadow(0 0 6px)`); block pulse is larger and breathing (`opacity 0.6 → 1.0`). PLANNER picks; VERIFIER checks visual hierarchy by inspection.
