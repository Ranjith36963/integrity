## Milestone 7d — Block-100% bloom + Day-100% fireworks (audio deferred) — Plan

### Context

M4a already wires the celebration plumbing end-to-end: `lib/celebrations.ts` exports `useCrossUpEffect(value, threshold, fn)` (one-shot upward-crossing hook); `<TimelineBlock>` calls `useCrossUpEffect(blockPct, 100, fireBlockComplete)` and renders a Framer Motion `bloom` spring overlay keyed by a `bloomKey` counter; `<BuildingClient>` calls `useCrossUpEffect(heroPct, 100, fireDayComplete)` and renders a `<Fireworks active={…}>` particle overlay. **The wiring is live today** — what's missing is the strict "transition-only" guarantee the spec promises: today's hook treats "rendered as ≥100 on mount" as a no-op (the `crossedRef.current` initializer is `value >= threshold`, so a 100% mount does NOT fire) — that part already works — BUT the hook is also today susceptible to a 99→100→99→100 within-mount replay (each downward cross resets the gate, each subsequent upward cross fires again). The spec's SG-m7d-02 says **once per block per mount**, full-stop, so M7d tightens the predicate from "once per crossing" to "once per (block id, mount)". For the day-fireworks layer the existing behavior (once per crossing) is sufficient and matches spec AC #4 ("once per mount") so long as the hook fires only on the first 99→100 transition per mount — M7d makes that explicit. M7d also adds the documented `celebrate(kind, { withAudio: false })` shim called out by spec AC #7, deferring the real chime asset to a follow-up. **Audio is explicitly off in M7d** (`withAudio: false` default + no call into `playChime()` from M7d's new entry points); the M4a `playChime()` callers in `TimelineBlock` + `BuildingClient` are routed through the new shim so the audio gate becomes a one-line flip. Render-layer + module-extension only — no schema bump, no new action, no new persisted field, no new clock, no new asset.

### Feature grouping

m7d is **one feature group** (slug `m7d`), one BUILDER dispatch (ADR-013, ADR-022). `tests.md` IDs use the `m7d` slug (`U-m7d-*`, `C-m7d-*`, `E-m7d-*`, `A-m7d-*`). See § Test-ID prefix scheme.

### File structure

| File                                     | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/celebrations.ts`                    | MODIFY — additive only. (1) NEW `useBlockCelebrationOnce(blockId: string, pct: number): boolean` — returns `true` for exactly the render on which this block's `pct` crosses from `<100` to `>=100` for the FIRST time during the current mount; `false` on every other render including subsequent 100→99→100 oscillations within the same mount. Backed by `useRef<Set<string>>` of bloomed-this-mount block ids (resolves SG-m7d-02). (2) NEW `useDayCelebrationOnce(pct: number): boolean` — analogous "fires once per mount on first 99→100 transition", suppressed forever once it has fired during this mount (no replay even after a 100→99→100 cycle). Backed by `useRef<boolean>` mount-shot. (3) NEW `celebrate(kind: "block" \| "day", opts?: { withAudio?: boolean }): void` — shim that fires the visual + haptic + (optionally) audio for a celebration. `withAudio` defaults to `false`; M7d wires it `false` everywhere. When `withAudio === true`, the shim calls `playChime()` from `lib/audio.ts`; when `false`, no audio call is made. (4) `useCrossUpEffect` is **kept** and exported unchanged for backwards compatibility (existing M4a tests + every external test importer rely on the symbol). M7d's new hooks are layered on top of `useCrossUpEffect` semantics, NOT a replacement. Module docstring extended with the spec AC #7 quote: "wire when a real `chime.mp3` lands (>30 KB target per SG-m4a-04)". |
| `components/TimelineBlock.tsx`           | MODIFY — replace the existing `useCrossUpEffect(pct, 100, fireBlockComplete)` call with `useBlockCelebrationOnce(block.id, pct)` returning a `shouldBloom: boolean`. When `shouldBloom === true` for the current render: (a) trigger the bloom overlay (bump `setBloomKey`); (b) call `celebrate("block", { withAudio: false })` which fires `haptics.success()` and skips audio in M7d. The existing `bloomKey`-keyed `<motion.div>` overlay + `springConfigs.bloom` + `prefersReducedMotion` gate ALL remain — M7d only changes the predicate that triggers them. The direct `playChime()` import + call site is removed (routed through `celebrate(…)` now). The existing `bloom-overlay` testid + `category.color`33 fill + spring config are byte-identical to M4a. Under `prefers-reduced-motion: reduce`, the existing branch that skips the spring `motion.div` is replaced by a 600 ms opacity-only flash overlay (resolves spec § Edge cases — "block bloom collapses to a 600 ms opacity flash on the accent ring").                                                                                                                                                                                                                                                                                                                                                                                                           |
| `app/(building)/BuildingClient.tsx`      | MODIFY — replace the existing `useCrossUpEffect(heroPct, 100, fireDayComplete)` call with `useDayCelebrationOnce(heroPct)` returning a `shouldFireworks: boolean`. When `shouldFireworks === true` for the current render: (a) set `fireworksActive` (triggering the existing `<Fireworks active={fireworksActive} />` overlay); (b) call `celebrate("day", { withAudio: false })` which fires `haptics.notification()` and skips audio. The existing `setFireworksActive(false)` 1700 ms timer + `<Fireworks>` props ARE byte-identical to M4a. The direct `playChime()` import + call site is removed (routed through `celebrate(…)` now). Under `prefers-reduced-motion: reduce`, the existing `<Fireworks>` returns `null`; M7d ALSO renders a new `<DayCompleteCard>` (see next bullet) when `fireworksActive === true && prefersReducedMotion === true`. The static text card auto-clears after 2 s via the same `fireworksActive` window (the existing 1700 ms timer is bumped to 2000 ms ONLY when PRM is active — see § Reduced-motion semantics for the wiring).                                                                                                                                                                                                                                                                                                                                                                |
| `components/DayCompleteCard.tsx`         | NEW — `"use client"`. Tiny center-screen text card shown ONLY under `prefers-reduced-motion: reduce` when the day transitions to 100%. Props: `{ active: boolean }`. Renders a fixed-position centered card with text "Day complete." for ~2 s when `active === true`; renders `null` otherwise. Uses M0 tokens — `var(--card)`, `var(--card-edge)`, `var(--ink)`, `var(--font-display)` (Instrument Serif for the headline) — and ADR-031 sizing. Pure presentational — no internal timer (the parent `BuildingClient` controls the 2 s lifetime via `active`). `role="status"` + `aria-live="polite"` so AT users get a single polite announcement. `pointer-events: none` (decorative, dismiss-on-timeout). z-index above Timeline / BlueprintBar / LooseBricksTray, below open `<Sheet>` instances (same z layer the Fireworks overlay uses today — `z-index: 50`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `components/Fireworks.tsx`               | UNCHANGED — M4a's PARTICLE_COUNT, COLORS, render path, `prefersReducedMotion` early-return, `aria-hidden="true"` overlay all survive byte-identical. M7d's new behavior is on the **caller** side (when to set `active=true`) and on the parallel **DayCompleteCard** that renders the PRM fallback. The Fireworks file itself is read-only in M7d.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `app/globals.css`                        | MODIFY — append (1) one new keyframe `@keyframes blockBloomReduced` (a single opacity 0 → 1 → 0 fade over 600 ms — for the PRM block-bloom path) plus the class `.bloom-reduced { animation: blockBloomReduced 600ms ease-in-out 1 both; }` (one-shot via `1 both`); (2) inside the existing `@media (prefers-reduced-motion: reduce) { … }` block, `.bloom-reduced` is left ON (PRM users DO get this flash — the bloom collapses **to** this 600 ms opacity flash, it is the PRM-only render path per spec § Edge cases) — meaning the class is OPT-IN at the JSX level under PRM and the keyframe runs once. (3) NEW `.day-complete-card` styling — fixed center; `var(--card)` background; `var(--card-edge)` border; `var(--ink)` text; serif headline; ~120 px wide × 64 px tall; ~16 px corner radius; shadow `0 8px 24px rgba(0,0,0,0.4)`; centered via `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);`. (4) PRM block-bloom keyframe runs at the SAME 600 ms cadence under PRM (intentional — the spec literally says "600 ms opacity flash"); no further suppression needed. **No new CSS custom property** required (durations are inline in the keyframe).                                                                                                                                                                                                                                          |
| `lib/celebrations.test.ts`               | (test file — EXISTS, ~30 lines today for U-m3-012) gains: `useBlockCelebrationOnce` truth table (99→100 fires; 100→100 no-op; 100→99→100 within-mount no-op; two distinct block ids both fire on their own first crossing; remount resets the set); `useDayCelebrationOnce` truth table (99→100 fires; 100→100 no-op; 100→99→100 within-mount no-op; remount resets); `celebrate("block", { withAudio: false })` fires `haptics.success()` and does NOT call `playChime`; `celebrate("day", { withAudio: false })` fires `haptics.notification()` and does NOT call `playChime`; `celebrate(kind)` (no opts) defaults `withAudio` to `false`; existing `useCrossUpEffect` U-m3-012 assertions stay green byte-identical. Mock `lib/audio` via `vi.mock("@/lib/audio", () => ({ playChime: vi.fn() }))` to assert no-call. Mock `lib/haptics` similarly to assert the right haptic fires.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `components/TimelineBlock.test.tsx`      | (test file — EXISTS) gains: bloom overlay does NOT mount on a TimelineBlock whose `pct === 100` at hydration (no prior < 100 render); bloom overlay mounts exactly once when the block transitions 99 → 100 via prop change (rerender from `<TimelineBlock>` with the brick toggled); a 100→99→100 cycle within the same mount does NOT re-mount the overlay; under PRM, the `motion.div` spring overlay does NOT render but a `<div className="bloom-reduced">` (opacity flash) DOES render for ~600 ms; haptics.success() fires on the transition; playChime() is NOT called (mocked). Existing M4a/M5/M6/M7b tests preserved.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `app/(building)/BuildingClient.test.tsx` | (test file — EXISTS) gains: fireworks overlay does NOT activate on a BuildingClient whose `dayPct === 100` at hydration (no prior < 100 render); fireworks activate exactly once when the day transitions to 100; a 100→99→100 cycle within the same mount does NOT re-activate; under PRM, `<Fireworks>` returns null AND `<DayCompleteCard active={true} />` renders for ~2 s; haptics.notification() fires on the transition; playChime() is NOT called (mocked).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `components/DayCompleteCard.test.tsx`    | NEW (test file) — `<DayCompleteCard active={true} />` renders the "Day complete." text; `<DayCompleteCard active={false} />` renders `null`; `role="status"` + `aria-live="polite"` present; passes axe.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `e2e/` (Playwright, deferred-to-preview) | (test file) covers AC #9: Lighthouse Perf ≥ 90 on a 100% day; fireworks particles render at ≥ 55 fps over a 2 s trace; no console error; the bloom overlay's spring lifecycle is < 1 s; under simulated PRM, the static "Day complete." card appears + auto-dismisses; no double-fire on hydrating into a 100% day.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

**Not modified — confirmed:** `lib/types.ts` (no schema bump; render-layer only); `lib/persist.ts` (`SCHEMA_VERSION` stays at `3`); `lib/data.ts` (no new reducer arm); `lib/dharma.ts` (`blockPct`/`dayPct` consumed unchanged); `lib/audio.ts` (`playChime` is still exported and untouched — M7d only changes WHICH path calls it; under `withAudio: false` it is unreferenced from M7d's new entry points but the symbol is preserved for the M7f follow-up that flips the default); `lib/haptics.ts` (consumed unchanged via `celebrate(…)` shim); `lib/motion.ts` (no new `Duration` token — bloom + fireworks tokens already exist in `springConfigs.bloom` and `motionTokens.fireworks` from M0/M4a; no new export); `lib/firstPaint.ts` / `lib/activeBlock.ts` / `components/NowTag.tsx` / `components/NowLine.tsx` / `components/HeroRing.tsx` / `components/Hero.tsx` / `components/BlueprintBar.tsx` / `components/Timeline.tsx` / `components/LooseBricksTray.tsx` / `components/BrickChip.tsx` / `components/MonthView.tsx` / `components/WeekView.tsx` / `components/YearView.tsx` / `components/PastDayDetail.tsx` (M7a/M7b/M7c surfaces — untouched; M7d's predicate change is internal to `useCrossUpEffect`'s consumers); `app/(building)/AppShell.tsx` (no prop change — M7d's state lives entirely inside BuildingClient and TimelineBlock); `public/sounds/chime.mp3` (the 431-byte placeholder is unread by M7d — `withAudio: false` means no `playChime` call; the asset stays in tree for the M7f follow-up).

### Data model

**No `AppState` change. No new persisted field. No `schemaVersion` bump. No new action. No new motion token. No new CSS custom property.** M7d's only new state is two in-memory React refs inside the new hooks (`useBlockCelebrationOnce`'s `Set<string>` of bloomed-this-mount block ids per SG-m7d-02; `useDayCelebrationOnce`'s mount-shot boolean). Neither is persisted; neither survives a remount.

`celebrate(kind, opts)` is a pure synchronous function with no React state — it dispatches to `haptics.{success|notification}` and (when `withAudio === true`, which M7d never sets) to `playChime`. It returns `void`. No persistence, no clock read, no `useEffect`.

The fireworks visual mechanism (SG-m7d-03) is the **existing M4a `<Fireworks>` particle SVG overlay** consumed unchanged — see § SG-m7d-03 resolution. No new third-party dependency, no Lottie file, no new SVG asset.

### `celebrate(kind, opts)` shim (resolves spec AC #7 + § Audio deferral)

```ts
// lib/celebrations.ts — additive
import { haptics } from "./haptics";
import { playChime } from "./audio";

export type CelebrationKind = "block" | "day";

export interface CelebrateOpts {
  /** When true, fires the chime audio. M7d default: false (audio deferred per SG-m7d-01).
   * Wire to true when a real chime.mp3 lands (>30 KB target per SG-m4a-04). */
  withAudio?: boolean;
}

export function celebrate(
  kind: CelebrationKind,
  opts: CelebrateOpts = {},
): void {
  const { withAudio = false } = opts;
  if (kind === "block") haptics.success();
  else haptics.notification();
  if (withAudio) playChime();
}
```

**M7d invariants on this shim:**

1. Default `withAudio === false`. No M7d call site passes `withAudio: true`. The `playChime` import is reachable in the module but unexecuted on every M7d code path. VERIFIER: confirm a Vitest run with `vi.mock("@/lib/audio", { playChime: vi.fn() })` shows `playChime` is called **zero times** when M7d's TimelineBlock / BuildingClient code drives the celebration paths.
2. The shim is the **single audio gate**. The M7f follow-up that lands a real chime asset is a one-line change (`celebrate("block", { withAudio: true })` × 2 call sites — and/or flip the default). VERIFIER confirms M7d does not introduce a parallel audio path.
3. The shim does not own visual state. Bloom overlay state stays inside `<TimelineBlock>` (`bloomKey` counter); fireworks state stays inside `<BuildingClient>` (`fireworksActive` boolean). The shim only fires side-effect channels (haptics + audio).

### `useBlockCelebrationOnce(blockId, pct)` (resolves SG-m7d-02)

```ts
// lib/celebrations.ts — additive
import { useRef } from "react";

/**
 * Returns true exactly once per (mount × blockId) when pct transitions <100 → ≥100.
 * After firing, the block id is added to a Set<string> kept in a useRef and the
 * hook returns false for every subsequent render of this component, including
 * after the block drops back below 100 and re-crosses. Resolves SG-m7d-02:
 * celebrations are sparing per § 0.5 — once per block per mount, full stop.
 *
 * Hydration semantics: when pct is already ≥100 on the very first render of this
 * hook (no prior <100 render has occurred), the block id is added to the bloomed
 * set immediately and the hook returns false — so a 100% block at hydration does
 * NOT bloom (spec AC #2; resolves spec edge case "Hydration into a state where a
 * block is already 100%").
 */
export function useBlockCelebrationOnce(blockId: string, pct: number): boolean {
  const bloomed = useRef<Set<string>>(new Set());
  // Track whether we've seen ANY value (including the first) so we can detect
  // the "already-100% at mount" path correctly.
  const seen = useRef<Set<string>>(new Set());
  const nowAbove = pct >= 100;

  if (!seen.current.has(blockId)) {
    seen.current.add(blockId);
    if (nowAbove) {
      // Hydration into a 100% block — record but do NOT bloom.
      bloomed.current.add(blockId);
    }
    return false;
  }

  if (nowAbove && !bloomed.current.has(blockId)) {
    // First upward crossing during this mount → fire bloom, then lock.
    bloomed.current.add(blockId);
    return true;
  }

  // Either: dropped below (no celebration on cross-down — spec edge case
  // "A user undoes a tick that drops a block from 100→99 → no celebration"),
  // OR: already bloomed this mount (sparing semantics).
  return false;
}
```

**Key invariants the unit table proves (see § Test-ID prefix scheme U-m7d-NNN):**

- **Hydration into 100% → no bloom, but block id locked.** A 99→100 transition AFTER hydration with a 100% start (e.g., the brick was 100% at mount, user untoggles to 99, retoggles to 100) does NOT re-bloom because the id is already in `bloomed.current` from the hydration pass.
- **99→100 (first crossing this mount) → bloom once.** Standard fire path.
- **100→99→100 within one mount → no second bloom.** Sparing semantics; `bloomed.current.has(blockId)` is true after the first crossing.
- **Two distinct block ids → each blooms on its own first crossing.** The `Set<string>` is per-mount, not per-id; both ids gate independently.
- **Component remount → ref discarded → set is empty → next 99→100 crossing fires.** This is the desired behavior: a fresh BuildingClient mount (e.g., Week → Day re-mount) is a "new day visit" and the bloom is meaningful again.
- **Pure: no `useEffect`, no `setState`, no DOM/storage access.** Mirrors `useFirstPaintAfterHydration`'s "derived ref" pattern (M7a `lib/firstPaint.ts`) — ref mutation during render is intentional and safe.

### `useDayCelebrationOnce(pct)` (mirrors block hook for the hero level)

```ts
// lib/celebrations.ts — additive
export function useDayCelebrationOnce(pct: number): boolean {
  const seen = useRef<boolean>(false);
  const fired = useRef<boolean>(false);
  const nowAbove = pct >= 100;

  if (!seen.current) {
    seen.current = true;
    if (nowAbove) {
      // Hydration into a 100% day — record but do NOT fire (spec AC #5).
      fired.current = true;
    }
    return false;
  }

  if (nowAbove && !fired.current) {
    fired.current = true;
    return true;
  }
  return false;
}
```

Same hydration-suppression + once-per-mount discipline as the block hook, single-scoped (no Set; there's exactly one day).

### Reduced-motion semantics (resolves spec AC #6 + § Edge cases)

| Path              | Default (motion ON)                                                                                                                                                                  | `prefers-reduced-motion: reduce`                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Block bloom**   | Existing M4a `<motion.div>` spring overlay (`springConfigs.bloom = { stiffness: 220, damping: 22 }`) keyed by `bloomKey`. ~250–400 ms perceived. Fades by `bloomVariants.exit`.      | The spring `motion.div` does NOT render (`!prefersReducedMotion && bloomKey > 0` already gates it in M4a). M7d adds a parallel `<div className="bloom-reduced">` (opacity-only flash via `@keyframes blockBloomReduced`) for 600 ms — keyed by `bloomKey` so a future bloom remounts and replays. The accent-ring tint is the same (`category.color`33 fill). After 600 ms the element unmounts (or fades to opacity 0 via `1 both` fill-mode). Spec § Edge cases verbatim. |
| **Day fireworks** | Existing M4a `<Fireworks>` particle overlay. ~1.6 s easeOut. `prefersReducedMotion === true` already returns `null` in M4a so motion users see the SVG burst, PRM users see nothing. | `<Fireworks>` returns `null` (M4a behavior preserved). M7d ADDS a `<DayCompleteCard active={fireworksActive} />` next to it. Card is visible center-screen for the duration `fireworksActive` is true. **Window:** `fireworksActive` flips to `false` after 2000 ms under PRM (vs. 1700 ms when motion is ON — the 1700 ms covers the SVG burst settle; the 2000 ms covers PRM read-time of "Day complete." headline). Both windows feed the same setState pair.            |
| **Haptics**       | `haptics.success()` (block) / `haptics.notification()` (day) — fire on both motion ON and PRM. § 0.10 + spec AC #6 ("haptics still fire under PRM").                                 | Same. Haptics are not motion.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Audio (chime)** | Off (`withAudio: false`, M7d default). No `playChime` call.                                                                                                                          | Off. Same.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

The PRM timer extension (`1700` → `2000`) is implemented inline in `BuildingClient`:

```tsx
// app/(building)/BuildingClient.tsx (sketch)
const prefersReducedMotion = useReducedMotion();
const shouldFireworks = useDayCelebrationOnce(heroPct);

useEffect(() => {
  if (!shouldFireworks) return;
  setFireworksActive(true);
  celebrate("day", { withAudio: false });
  const t = window.setTimeout(
    () => setFireworksActive(false),
    prefersReducedMotion ? 2000 : 1700,
  );
  return () => window.clearTimeout(t);
}, [shouldFireworks, prefersReducedMotion]);
```

Implementation detail: `shouldFireworks` is `true` for exactly one render (the transition render) and `false` thereafter; the `useEffect` runs once with the truthy value. PLANNER notes this `useEffect` pattern as the simplest way to thread the one-shot hook return into the existing setState + timer pair without re-architecting BuildingClient. VERIFIER may pick a `useRef`-tracked alternative; same observable behavior.

### Components

**`<DayCompleteCard>` (NEW — `components/DayCompleteCard.tsx`)**

- **Props:** `{ active: boolean }`. No state, no effect. Pure presentational.
- **Renders:** `null` when `active === false`; a fixed center-screen card when `active === true`.
- **DOM:**
  ```tsx
  <div
    role="status"
    aria-live="polite"
    data-testid="day-complete-card"
    className="day-complete-card"
    style={{ pointerEvents: "none", zIndex: 50 /* matches Fireworks */ }}
  >
    <span
      style={{ fontFamily: "var(--font-display)", fontSize: "var(--fs-24)" }}
    >
      Day complete.
    </span>
  </div>
  ```
- **Style** (in `globals.css` `.day-complete-card`): fixed; centered via `top:50%; left:50%; transform: translate(-50%, -50%)`; `padding: 20px 32px`; `background: var(--card)`; `border: 1px solid var(--card-edge)`; `border-radius: 16px`; `box-shadow: 0 8px 24px rgba(0,0,0,0.4)`; `color: var(--ink)`.
- **A11y:** `role="status"` + `aria-live="polite"` — AT users get a single polite announcement of "Day complete." once per mount (mirrors M6 polite live-region pattern in BuildingClient). The card itself is non-interactive (`pointer-events: none`); no focus target.
- **Contrast:** `--ink` on `--card` is the standard M0 body-text token pair — already WCAG AA. No new contrast work.
- **Lifetime:** controlled entirely by the parent (BuildingClient's `fireworksActive` boolean). Card renders for 2000 ms under PRM (vs. zero render on the motion-ON path — the `<DayCompleteCard active={fireworksActive && prefersReducedMotion} />` predicate gates the motion ON path to `false`). VERIFIER: confirm card never renders when motion is ON.

**`<TimelineBlock>` (MODIFY — predicate swap; PRM bloom variant)**

- New internal: replace `useCrossUpEffect(pct, 100, fireBlockComplete)` (line 94) with `const shouldBloom = useBlockCelebrationOnce(block.id, pct);`. Hoist the existing `fireBlockComplete` body into a `useEffect`:
  ```tsx
  useEffect(() => {
    if (!shouldBloom) return;
    celebrate("block", { withAudio: false });
    setBloomKey((k) => k + 1);
  }, [shouldBloom]);
  ```
- The existing `bloom-overlay` testid + `category.color`33 fill + `springConfigs.bloom` + `bloomVariants` are byte-identical to M4a. The `prefersReducedMotion` gate on the spring overlay (line 198) stays.
- **PRM bloom variant (NEW):** add a sibling `<div>` that renders ONLY when `prefersReducedMotion === true && bloomKey > 0`:
  ```tsx
  {
    prefersReducedMotion && bloomKey > 0 && (
      <div
        key={`bloom-reduced-${bloomKey}`}
        data-testid="bloom-overlay-reduced"
        aria-hidden="true"
        className="bloom-reduced"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "6px",
          background: category?.color
            ? `${category.color}33`
            : "var(--accent)33",
          pointerEvents: "none",
          zIndex: 3,
        }}
      />
    );
  }
  ```
  The `.bloom-reduced` class runs `@keyframes blockBloomReduced` (opacity `0 → 1 → 0` over 600 ms, fill-mode `both`). After 600 ms the element stays at opacity 0 (`both` fill-mode); the next `bloomKey` increment triggers a fresh keyed remount → fresh keyframe. The `useEffect` setting `bloomKey` is the same one that drives the motion-ON path, so the two PRM/motion paths share a single state trigger.
- **Removed:** the direct `playChime` import + call (now routed through `celebrate`). The `useCrossUpEffect` import is replaced by `useBlockCelebrationOnce`.
- The `useCallback`/`fireBlockComplete` wrapper is no longer needed (the body lives inside the `useEffect` now). Removed.

**`<BuildingClient>` (MODIFY — predicate swap; PRM card mount)**

- New internal: replace `useCrossUpEffect(heroPct, 100, fireDayComplete)` (line 231) with `const shouldFireworks = useDayCelebrationOnce(heroPct);`. Hoist `fireDayComplete` body into a `useEffect` (sketch in § Reduced-motion semantics).
- New JSX: render `<DayCompleteCard active={fireworksActive && prefersReducedMotion} />` as a sibling of `<Fireworks active={fireworksActive} />` inside the existing root div. Both consume the same `fireworksActive` state; under PRM the Fireworks returns `null` and the DayCompleteCard renders; under motion ON the Fireworks renders and the DayCompleteCard's prop is `false` so it returns `null`.
- New import: `useReducedMotion` from `motion/react` (already used by TimelineBlock; pattern proven).
- **Removed:** the direct `playChime` import + call (routed through `celebrate`). The `useCrossUpEffect` import is replaced by `useDayCelebrationOnce`.
- The `useCallback`/`fireDayComplete` wrapper is no longer needed. Removed.

**`<Fireworks>` (UNCHANGED)**

- All M4a behavior preserved: particle count, color list, `prefersReducedMotion === true → return null`, 1700 ms internal timer, `data-testid="fireworks"`, `aria-hidden="true"`. M7d does NOT touch this file.

### Dependencies

**None.** No new `package.json` entry. `motion/react`, `lucide-react`, Vitest, Testing Library, Playwright, `@axe-core/playwright` — all already installed and consumed in M4a/M7a/M7b/M7c. Zero new image, font, SVG, audio, or third-party dependency (SG-m7d-03 explicitly forbids a Lottie file or a new SVG library — the particle burst overlay from M4a is reused as-is).

### Design tokens

All M0/M4a tokens, all already defined. M7d adds **no new motion token**, **no new CSS custom property**, and **no new asset**. The two existing tokens are consumed unchanged:

| Token                               | Source                                                            | Consumer in M7d                                                                                                                                                                                                  |
| ----------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `springConfigs.bloom`               | `lib/motion.ts` (M0) — `{ stiffness: 220, damping: 22 }`          | TimelineBlock's `<motion.div data-testid="bloom-overlay">` spring transition. Unchanged from M4a. **Motion ON path only.**                                                                                       |
| `motionTokens.fireworks`            | `lib/motion.ts` (M4a) — `{ durationMs: 1600, easing: "easeOut" }` | Already consumed inside `<Fireworks>` as `transition: { duration: 1.6, ease: "easeOut" }` (per Fireworks.tsx line 91). Unchanged. **Motion ON path only.**                                                       |
| `@keyframes blockBloomReduced`      | `app/globals.css` (NEW)                                           | TimelineBlock's `<div className="bloom-reduced">` PRM-only sibling. 600 ms opacity 0 → 1 → 0 + `fill-mode: both`. **PRM path only.** No new CSS custom property — the 600 ms duration is inline in the keyframe. |
| `--font-display` (Instrument Serif) | `app/globals.css` (M0)                                            | `<DayCompleteCard>` headline "Day complete.". **PRM path only.**                                                                                                                                                 |
| `--ink` / `--card` / `--card-edge`  | `app/globals.css` (M0)                                            | `.day-complete-card` text + background + border. **PRM path only.**                                                                                                                                              |
| `--fs-24` (24 px)                   | `app/globals.css` (M0)                                            | DayCompleteCard headline size. Pre-existing token.                                                                                                                                                               |

**No `var(--surface-2)`:** per status.md latent bug carry-over. M7d's new CSS does not reference `--surface-2`. VERIFIER inspects the globals.css diff.

### Resolutions to the 3 Open Spec Gaps

- **SG-m7d-01 — RESOLVED → audio explicitly OFF in M7d.** `celebrate(kind, opts?: { withAudio?: boolean })` defaults `withAudio` to `false`. Both M7d call sites (`celebrate("block", { withAudio: false })` in TimelineBlock; `celebrate("day", { withAudio: false })` in BuildingClient) pass the literal `false` explicitly — making the audio gate auditable on inspection. `playChime` is no longer imported by TimelineBlock or BuildingClient (only by `lib/celebrations.ts` under the `if (withAudio)` branch). The placeholder `public/sounds/chime.mp3` (431-byte stub per SG-m4f-05) stays on disk for the M7f follow-up. **The M7f follow-up that lands a real chime asset is a one-line change** (e.g., flip the default to `true`, OR flip the two call sites to `withAudio: true`). PLANNER confirms the audio path remains a one-line change. VERIFIER: confirm `playChime` is called **zero times** under M7d's code paths via a `vi.mock` assertion in `lib/celebrations.test.ts` + `components/TimelineBlock.test.tsx` + `app/(building)/BuildingClient.test.tsx`.

- **SG-m7d-02 — RESOLVED → once per block per mount via `Set<string>` ref machine.** Implemented as `useBlockCelebrationOnce(blockId, pct)`'s `bloomed = useRef<Set<string>>(new Set())`. After the first 99→100 crossing for a given `blockId`, the id is added to the set; every subsequent render of that block during the same mount returns `false` regardless of how many times `pct` oscillates. The set is reset on remount (a Day → Week → Day view switch re-mounts BuildingClient → re-mounts TimelineBlock → fresh hook → fresh empty Set). Hydration into a state where the block is ALREADY 100% adds the id to the set on the very first render WITHOUT firing — so a subsequent untoggle + retoggle does not bloom either (the user already saw the block at 100% on hydration; the spec's "celebrations are sparing" applies). PLANNER confirms; VERIFIER checks the Set exists and is mount-scoped via Vitest with two-rerender + remount harness (see U-m7d-NNN truth table).

- **SG-m7d-03 — RESOLVED → reuse the existing M4a `<Fireworks>` particle SVG burst overlay, unchanged.** The fireworks visual mechanism is the existing `components/Fireworks.tsx` from M4a — 12 absolutely-positioned `<motion.div>` particles with random `(x, y, color, size)` values, animated via Framer's `animate` prop with `transition: { duration: 1.6, ease: "easeOut" }`, layered at `z-index: 50`. **Zero new third-party dependency.** No CSS particles, no SVG file, no Lottie. The "particle burst SVG overlaid on the hero, accent-tinted, fading out over the token duration" recommendation in the spec is exactly what M4a shipped (the `<motion.div>`s ARE the "SVG-tier" overlay — they're divs but render as bounded particles; one of the COLORS entries is `var(--accent)`, providing the accent tint). VERIFIER: confirm `components/Fireworks.tsx` is unchanged in the M7d diff (the file appears in "Not modified — confirmed" above) and that no new asset is added under `public/`.

### Edge cases

| Spec edge case                                                                | Planned code path                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hydration into a state where a block is already 100%**                      | `useBlockCelebrationOnce(block.id, 100)` on the first render: `seen.current.has(blockId) === false` → adds to `seen`, sees `nowAbove === true`, adds to `bloomed`, returns `false`. **No bloom.** The block id is now "locked" — subsequent un-toggle (100→99) and re-toggle (99→100) within the same mount do NOT bloom (bloomed.current.has). AC #2.                                                                                                                                                                                                                      |
| **Hydration into a 100% day**                                                 | `useDayCelebrationOnce(100)` on the first render: `seen.current === false` → sets to `true`, sees `nowAbove === true`, sets `fired.current` to `true`, returns `false`. **No fireworks.** AC #5. The day is now locked — subsequent un-tick + re-tick across blocks that bring `dayPct` back to 100 do NOT re-fire. The hero count-up (M7c) lands at 100% smoothly with no celebration (consistent with M7c spec's "First paint with `dayScore === 100`" row).                                                                                                              |
| **A brick log pushes block A 99→100 and block B 100→99 simultaneously**       | Both TimelineBlocks re-render. `useBlockCelebrationOnce("A", 100)`: `bloomed.has("A") === false` → adds to bloomed, returns `true` → A blooms. `useBlockCelebrationOnce("B", 99)`: `nowAbove === false` → returns `false` → B does not bloom (no reverse celebration). If no block was at 100 before this action (i.e., `heroPct` was already < 100 and now A's flip puts it ≥ 100), `useDayCelebrationOnce` fires once on the day-level upward crossing. If A was already at 100 and B dropping → `heroPct` may stay < 100 → no day fireworks. Spec § Edge cases verbatim. |
| **A user undoes a tick that drops a block 100→99**                            | `useBlockCelebrationOnce(blockId, 99)`: `nowAbove === false`, returns `false`. No bloom replay. The bloom is one-way; cross-down is silent. AC #4 (implicit — "celebrations are sparing" + "transition only").                                                                                                                                                                                                                                                                                                                                                              |
| **`appliesOn`-suppressed blocks** (post-M5b future ship)                      | Not in `currentDayBlocks(state)` → not in `visibleBlocks` → not in `items` → not rendered by `<Timeline>` → `useBlockCelebrationOnce` never called → no bloom. M7d is forward-compatible with M5b's `appliesOn` wiring (today, only `deletions` filter is live per ADR-047). Documented; VERIFIER ratifies.                                                                                                                                                                                                                                                                 |
| **`prefers-reduced-motion: reduce`**                                          | Block bloom: spring `motion.div` not rendered (M4a gate); a `<div className="bloom-reduced">` is rendered keyed by `bloomKey` for 600 ms opacity flash. Day fireworks: `<Fireworks>` returns `null` (M4a gate); `<DayCompleteCard active={true} />` renders for 2000 ms. Haptics + audio paths unchanged (audio OFF in M7d either way). AC #6.                                                                                                                                                                                                                              |
| **Audio gate**                                                                | `withAudio: false` on every M7d call site. `playChime` is reachable inside `celebrate(…)`'s `if (withAudio)` branch but unexecuted. Mocked in tests to assert `playChime` is called zero times under M7d. AC #7. SG-m7d-01 resolution.                                                                                                                                                                                                                                                                                                                                      |
| **Past-day reads (Castle / Kingdom / Empire / `<PastDayDetail>`)**            | These views do NOT mount `<BuildingClient>` (the AppShell branches by view). The bloom + fireworks celebrations are Day-view-only; past-day reads render final scores immediately with no transition predicate firing. Spec § "What this is NOT" → "history-archived 100% days were celebrated when they happened". M7d adds no celebration wiring to MonthView / WeekView / YearView / PastDayDetail. VERIFIER confirms.                                                                                                                                                   |
| **Day → Week → Day view switch (remount)**                                    | `AppShell` unmounts `<BuildingClient>` on view switch; on Day re-mount, fresh hooks are mounted with fresh refs (empty `Set`, `false` mount-shot). If the user's currently-100% day re-mounts via view switch, the hydration suppression applies (no fireworks on the re-mounted-into-100% state). Same contract as M7a's "second mount" treatment. VERIFIER ratifies via a test that mounts → unmounts → re-mounts BuildingClient with a 100% state and asserts zero fireworks fires.                                                                                      |
| **Block at 99% hydrates → user adds a new brick → block drops to (e.g.) 80%** | `useBlockCelebrationOnce` on hydration: `seen.has === false` → adds to seen, `nowAbove === false (99 < 100)` → returns `false`. On the re-render with `pct === 80`: `seen.has === true`, `nowAbove === false` → returns `false`. No bloom (correct — block never crossed 100). After the user ticks bricks to bring it to 100: `seen.has === true`, `nowAbove === true`, `bloomed.has === false` → adds to bloomed, returns `true`. **Bloom fires once.** Then if user untoggles + retoggles within the same mount: bloomed.has === true → no replay.                       |
| **Lighthouse Performance**                                                    | Particle overlay is 12 absolutely-positioned `motion.div`s, animated for 1.6 s — compositor-friendly transforms (opacity, scale, translate). Bloom is a single `motion.div` spring. PRM `<div className="bloom-reduced">` is a CSS opacity keyframe. PRM `<DayCompleteCard>` is a static centered card (no animation). All paths are sub-1 % main-thread. Target ≥ 90 (status quo M7c baseline + a negligible delta from the 2-second card window). AC #9.                                                                                                                  |
| **First paint pre-hydration (M7a skeleton)**                                  | While `hydrated === false`, `<Timeline>` and `<BuildingClient>`'s real subtree are not yet mounted with the persisted state (the skeleton subtree renders). Once `hydrated === true`, the real `<TimelineBlock>` and `<BuildingClient>` mount with the persisted `pct` values → `useBlockCelebrationOnce` / `useDayCelebrationOnce` register the first-render hydration values → no celebrations fire on hydration into 100% (AC #2 + AC #5).                                                                                                                               |
| **State import / persistence corruption** (defensive)                         | If `pct` is `NaN` or `> 100`, `nowAbove === pct >= 100` may be undefined / true. The hook treats any `pct >= 100` as "above"; on hydration the id is locked silently. No crash, no log. Defensive — same shape as M7b's `activeBlockId` defensive ordering.                                                                                                                                                                                                                                                                                                                 |

### Accessibility

- **Block bloom (motion ON):** `aria-hidden="true"` on the `bloom-overlay` `motion.div` (M4a). No new AT surface. The block card's existing `role="article"` + `aria-expanded` chain is unchanged.
- **Block bloom (PRM):** `aria-hidden="true"` on the `bloom-overlay-reduced` `<div>`. Same.
- **Day fireworks (motion ON):** `aria-hidden="true"` on the `<Fireworks>` root (M4a). No new AT surface.
- **Day fireworks (PRM):** `role="status"` + `aria-live="polite"` on `<DayCompleteCard>`. AT users hear "Day complete." announced once when `active` flips false → true. Polite live-region — does not interrupt other speech. `pointer-events: none` — no focus target, no tab order change.
- **Contrast:** `var(--ink)` on `var(--card)` in DayCompleteCard — already WCAG AA (M0 token pair). Bloom overlays are non-text, decorative; non-text contrast (AA 3:1) comfortably exceeded by accent-tinted fill on card background.
- **430 px viewport:** DayCompleteCard's `~120px × 64px` size fits comfortably centered; no horizontal overflow. The card never overlaps with TopBar or BottomBar (`top: 50%`, transform-centered).
- **PRM users:** see the static centered card + still feel `haptics.notification()`. The celebration is perceptually present without animation. AC #6.
- **No new focus target.** Neither overlay enters the tab order.
- **axe:** zero violations expected. VERIFIER runs axe on the preview at first paint and at PRM-celebration-fire.

### Performance

- **Per-render cost of `useBlockCelebrationOnce`:** O(1) Set membership check + at most one Set insertion. ≤ 1 µs at typical scale (N ≤ ~30 blocks). Negligible.
- **Per-render cost of `useDayCelebrationOnce`:** O(1) boolean check. Negligible.
- **Bloom overlay cost (motion ON):** unchanged from M4a — one Framer spring on a single `motion.div`, ~250–400 ms perceived. No reflow.
- **Bloom overlay cost (PRM):** one CSS keyframe (opacity 0 → 1 → 0 over 600 ms) on a single `<div>`. Compositor-only paint. No reflow.
- **Fireworks cost (motion ON):** unchanged from M4a — 12 `motion.div`s animated for 1.6 s on the compositor. AC #9 target ≥ 55 fps over 2 s trace (sandbox-deferred; verified on preview).
- **DayCompleteCard cost (PRM):** static centered card; zero animation; mount → 2 s → unmount. Zero perf delta.
- **Bundle delta:** new files = `lib/celebrations.ts` extension (~80 LOC) + `components/DayCompleteCard.tsx` (~30 LOC). Net build size delta: < 2 KB minified. Lighthouse Perf budget delta: negligible.
- **No new asset.** SG-m7d-03 explicitly forbids new SVG / Lottie / image / audio. M4a's existing `<Fireworks>` is reused unchanged.

### Decisions honored (ADRs)

- **ADR-013 / ADR-022** (one-feature-per-dispatch; ~80-line per-dispatch budget): m7d is one feature group, one BUILDER dispatch. This plan entry stays within the per-feature budget by placing detail in tables and lists rather than prose. **PRIMARY decision honored.**
- **§ 0.5 / § 0.7** (celebrations are earned and sparing; motion tokens consumed unchanged): SG-m7d-02's "once per block per mount" semantics are the literal embodiment of "sparing"; `springConfigs.bloom` and `motionTokens.fireworks` are consumed verbatim from M0 / M4a. **PRIMARY decision honored.**
- **ADR-018** (overrides are a keyed map; state immutability): M7d does NO `AppState` mutation. The two new refs are React-instance-local; they are not persisted, not derived from `state`, and never mutate `state`. `state.deletions` is unread by M7d. **PRIMARY decision honored.**
- **M5b's `currentDayBlocks`** (transition predicate uses `visibleBlocks`, not raw `state.blocks`): M7d's `useBlockCelebrationOnce` is called from inside `<TimelineBlock>`, which is rendered from `<Timeline>` which is fed by `selectTimelineItems(stateForTimeline)` where `stateForTimeline = { ...state, blocks: visibleBlocks }` (per M7b plan precedent) — meaning a block deleted "just today" via `deletions` is never rendered and never gets a `useBlockCelebrationOnce` call. M7d inherits this filter for free; no direct `state.blocks` read by M7d. **PRIMARY decision honored.**
- **M9b history** (past-100% days don't re-celebrate at hydration): `<BuildingClient>` only mounts for the **live** Day view (today); past days render through `<PastDayDetail>` which has no `useDayCelebrationOnce` wiring. The history archive (`state.history`) is read-only and unread by M7d. AC #5 + spec § "What this is NOT" → "history-archived 100% days were celebrated when they happened". **PRIMARY decision honored.**
- **ADR-006** (half-open `[start, end)` intervals): irrelevant for M7d — no interval math. Documented as inapplicable.
- **ADR-009** (Hero `%` is integer-only): irrelevant — M7d does not render a percentage. The transition predicate compares numbers (`pct >= 100`); whether `pct` is integer or float, the gate is the same. Documented as inapplicable.
- **ADR-023** (`useNow()` is the sole clock; two-pass hydration): M7d introduces no clock and no new tick. The hydration-suppression invariant for both hooks is the literal embodiment of "M9b history reads must be inert at hydration" (the dispatch prompt's "Critical edge cases" item 1). **PRIMARY decision honored.**
- **ADR-031** (≥ 44 px touch targets): no new interactive element. DayCompleteCard is `pointer-events: none`; bloom + fireworks overlays are `pointer-events: none` (M4a). Documented as inapplicable.
- **ADR-041** (single-gate Loop; VERIFIER audits this plan + tests): the dispatch prompt explicitly auto-chains PLAN → TESTS; VERIFIER will audit both before BUILDER starts. Documented.
- **ADR-043** (`assertNever` exhaustiveness): no new `Action` union member; the reducer's default arm is untouched. M7d is render + module-layer only.
- **ADR-044 / ADR-045** (`schemaVersion` discipline; `history` read-only): M7d introduces no `schemaVersion` bump (still `3`); `state.history` is unread.
- **ADR-046** (period-aggregate helpers are pure; "today" comes from `state.currentDate`): unaffected; M7d does no aggregation.
- **ADR-047** (M5 `currentDayBlocks` resolves `deletions` only): consumed unchanged. M7d is forward-compatible with the M5b ship that will close ADR-047 (`appliesOn` filter automatically excludes blocks from the celebration path because they never render).

### Commit strategy

m7d is **one feature group, one BUILDER dispatch.** The BUILDER follows the standard TDD inner loop (Red → Green → Refactor → Commit). **Per-test-group commit batching is sanctioned** (matches M5 / M6 / M7a / M7b / M7c / M9d / M9e precedent): the BUILDER may group red + green commits per logical area — one pair for `lib/celebrations.ts` (the two new hooks + the `celebrate` shim + the celebrations.test.ts assertions); one for `components/TimelineBlock.tsx` (the predicate swap + PRM bloom variant + tests); one for `components/DayCompleteCard.tsx` (NEW + test); one for `app/(building)/BuildingClient.tsx` (the predicate swap + PRM card mount + tests); one for `app/globals.css` (the new keyframe + class + DayCompleteCard styling); one for the deferred-to-preview E2E + a11y spec. Red commits: `test(m7d): …`; green/refactor commits: `feat(m7d): …` or `fix(m7d): …`.

Each batch commit message names exactly the area(s) its diff touches (commit-label-accuracy carry-over from M7a/M7b/M7c). No phase exit until every `m7d` test ID in `tests.md` is green AND the additive test amendments listed in § Regression surface are green.

### Out of scope

- **An audio implementation.** `withAudio: false` is the M7d invariant on every call site; `playChime` is not called from M7d code paths. The M7f follow-up will replace the 431-byte placeholder + flip the gate (SG-m7d-01 resolution).
- **The Empire square unlock animation.** Deferred per phase1plan M9 follow-up; out of M7d's render layer.
- **A celebration on `appliesOn`-suppressed blocks.** Suppressed blocks aren't visible; they cannot transition to 100% via the UI; the hook is never called.
- **A celebration on history-archived 100% days.** `<PastDayDetail>` does not mount `useBlockCelebrationOnce` / `useDayCelebrationOnce`. The live Day view fires; past days were celebrated when they happened.
- **A celebration on `prefers-reduced-motion`** (the spring + the particle burst). Collapses to a 600 ms opacity flash + a 2-second "Day complete." text card respectively.
- **A reverse celebration on cross-down** (100→99). The hooks return `false` on `nowAbove === false`; the bloom is one-way.
- **A second bloom on 100→99→100 within one mount.** Sparing per § 0.5 + SG-m7d-02 resolution.
- **A new motion token in `lib/motion.ts`.** `springConfigs.bloom` and `motionTokens.fireworks` are consumed unchanged. The 600 ms PRM keyframe duration is inline in CSS (matches the M7c precedent of "JS-driven tween duration in JS; CSS keyframe duration in CSS").
- **A new CSS custom property.** The 600 ms / 2000 ms windows are inline literals in CSS and in `setTimeout`; no `--motion-bloom-reduced` token. Differs from M7b's `--motion-now-pulse-duration` because M7d's two PRM durations are tied to a one-shot keyframe + a one-shot setTimeout, not a continuously-cycling animation that needs a tweakable cadence.
- **A new image / SVG / font / audio asset.** Pure DOM + existing M4a particle overlay + new CSS keyframe. Zero new asset weight.
- **A new third-party dependency** (Lottie, particle library, etc.). SG-m7d-03 explicitly forbids this.
- **A new clock / `setInterval`.** The 1700 / 2000 ms PRM-conditional windows use existing one-shot `setTimeout` (the M4a pattern). No new tick.
- **Coupling to M7c's count-up.** M7c's first-paint count-up lands at the hydrated `dayPct` value; if `dayPct === 100` at hydration, M7c animates 0 → 100 over 1.6 s; M7d's `useDayCelebrationOnce` sees the hydration value of `100` on its first render → locks `fired.current` → no fireworks. M7c does NOT trigger M7d. Documented in M7c plan's "First paint with `dayPct === 100`" row; M7d ratifies the contract.
- **A new ADR.** All three Open Spec Gaps are resolved exactly per the spec's recommendation; the shim API + the Set-based ref machine + the PRM card are plan-level mechanism choices, not project-level non-obvious decisions.
- **`var(--surface-2)` cleanup** — tracked separately in status.md Open loops; M7d must not introduce or propagate any new reference to it.
- **A re-architecture of `useCrossUpEffect`.** The hook is preserved unchanged for backwards compatibility (existing `lib/celebrations.test.ts` U-m3-012 assertions stay green; any external test importer relying on the symbol continues to work). M7d's new hooks are layered on top, not a replacement.

### Test-ID prefix scheme

m7d uses **four stable prefixes**, grouped by the single feature slug `m7d`, for the `mode: TESTS` dispatch and VERIFIER:

- **`U-m7d-NNN`** — Unit (Vitest): `useBlockCelebrationOnce` truth table (hydration into 100% → false + locked; 99→100 within mount → true once then false; 100→99→100 within mount → false on second up; two distinct ids fire independently; remount resets the Set); `useDayCelebrationOnce` truth table (same shapes, single-scoped); `celebrate("block", { withAudio: false })` fires `haptics.success()` + does NOT call `playChime`; `celebrate("day", { withAudio: false })` fires `haptics.notification()` + does NOT call `playChime`; `celebrate(kind)` with no opts defaults `withAudio` to `false`; `celebrate("block", { withAudio: true })` DOES call `playChime` (forward-compat assertion for the M7f follow-up); existing `useCrossUpEffect` U-m3-012 assertion stays green byte-identical.
- **`C-m7d-NNN`** — Component (Vitest + Testing Library): `<TimelineBlock>` does NOT mount `bloom-overlay` on a `pct === 100` hydration; `<TimelineBlock>` mounts `bloom-overlay` exactly once on a 99 → 100 prop transition; `<TimelineBlock>` does NOT re-mount `bloom-overlay` on a 100→99→100 cycle within the same mount; under PRM, `bloom-overlay` does NOT mount but `bloom-overlay-reduced` (the opacity-flash variant) DOES mount and unmounts after ~600 ms; `<BuildingClient>` does NOT activate fireworks on a `dayPct === 100` hydration; `<BuildingClient>` activates fireworks exactly once on a < 100 → 100 transition; under PRM, `<Fireworks>` returns null but `<DayCompleteCard active={true}>` renders for ~2000 ms with the polite live-region announcement; `<DayCompleteCard active={false}>` returns null; `playChime` is mocked and asserted called zero times across all four component tests.
- **`E-m7d-NNN`** — E2E (Playwright, deferred-to-preview): on a fixture where the user toggles the last brick of a block from off to on, the `bloom-overlay` appears in DOM and fades within ~1 s; on a fixture where the toggle completes the day, the `fireworks` overlay appears and fades within ~2 s; on the same fixture under simulated PRM (`page.emulateMedia({ reducedMotion: "reduce" })`), the static "Day complete." card appears center-screen, holds for 2 s, then unmounts; Lighthouse Perf ≥ 90 on a 100% day; no console errors on either celebration path; hydrating directly into a 100% day fires neither overlay.
- **`A-m7d-NNN`** — Accessibility (axe via Playwright): page with `bloom-overlay` visible is axe-clean (zero violations on the decorative overlay); page with `fireworks` visible is axe-clean; page with `<DayCompleteCard active={true}>` is axe-clean (the polite live-region + WCAG-AA contrast on the headline); under PRM, the static card + static bloom flash are axe-clean; the polite live-region announces "Day complete." exactly once per fire-cycle (no double announcement).

ID numbering continues from the running totals the orchestrator supplies in the `mode: TESTS` dispatch prompt. IDs are unique and stable so VERIFIER can map AC → test ID.

### Regression surface

M7d is **additive at every seam** — no existing prop / type / state shape is changed; existing tests stay green with these specific touchpoints (flagged here for VERIFIER as sanctioned-for-amendment):

- **`lib/celebrations.test.ts`** (~30 LOC today) — the existing U-m3-012 `useCrossUpEffect` assertion stays green byte-identical (M7d keeps `useCrossUpEffect` exported unchanged for backwards compatibility). NEW M7d tests are appended.
- **`components/TimelineBlock.test.tsx`** — existing M4a tests that asserted the `useCrossUpEffect` callback fires `playChime()` directly need amendment to assert the indirection through `celebrate("block", { withAudio: false })` → `haptics.success()` + no-`playChime`. The diff is small (a couple of test assertions); the rendered DOM (`bloom-overlay` testid + class) is byte-identical to M4a. VERIFIER ratifies the amendment as M7d-sanctioned.
- **`app/(building)/BuildingClient.test.tsx`** — same shape: existing M4a tests that asserted `useCrossUpEffect(heroPct, 100, fireDayComplete)` need amendment to assert `useDayCelebrationOnce(heroPct)` → `celebrate("day", { withAudio: false })` → `haptics.notification()` + `setFireworksActive(true)` + no-`playChime`. The rendered DOM (`fireworks` testid + 1700 ms timer) is byte-identical to M4a (under motion ON); under PRM, the new `<DayCompleteCard>` is asserted to render.
- **`lib/audio.test.ts`** (if it exists) — unchanged. `playChime` is still exported and the M7f follow-up will exercise it.
- **No M5 / M6 / M7a / M7b / M7c test** asserts the absence of the new hooks, the absence of `celebrate(…)`, the absence of `<DayCompleteCard>`, or the absence of the `bloom-overlay-reduced` testid. Additive everywhere.

VERIFIER: please ratify the **`useEffect` pattern** (consume the one-shot hook return inside a `useEffect` that fires the side effects — setBloomKey / setFireworksActive / celebrate + setTimeout) as the simplest way to thread "shouldBloom / shouldFireworks" into the existing setState-driven visual machinery. Alternative: read the boolean during render and dispatch effects in a ref-tracked way (avoids `useEffect`); same observable behavior. The `useEffect` variant is well-trodden in React; VERIFIER picks.

### Open questions for VERIFIER

All three SG items are **resolved in-plan exactly per the spec's recommendation** (per the dispatch prompt). The following implementation choices are surfaced for VERIFIER ratification — all are plan-level mechanism decisions, not deviations from the spec:

- **Hook split — one hook per scope (`useBlockCelebrationOnce` + `useDayCelebrationOnce`) vs. one unified hook (`useCelebrationOnce`).** Plan baseline ships two distinct hooks because (a) the block scope is keyed by `blockId` (Set) and the day scope is single (boolean) — the data shape differs; (b) the call sites read clearer with named functions ("celebrate the block once" vs. "celebrate the day once"); (c) test isolation is cleaner. Alternative: one hook with a `scope: "block" | "day"` discriminant and an optional `id` param. Plan baseline is simpler; alternative deduplicates ~10 LOC. VERIFIER picks; both pass the same unit table with trivial assertion adjustment.

- **`useEffect` consume pattern vs. ref-tracked render-time fire.** Plan baseline reads `shouldBloom` / `shouldFireworks` during render and dispatches `celebrate(…)` + `setState` inside a `useEffect([shouldBloom])` / `useEffect([shouldFireworks])`. Alternative: track the previous value of `shouldBloom` in a ref during render and fire side effects directly in render — closer to the M7a `useFirstPaintAfterHydration` precedent. Plan baseline is more "React-idiomatic" (effects in effects); alternative is one fewer render cycle. VERIFIER picks; identical observable behavior.

- **PRM bloom variant: separate sibling `<div>` vs. swap the `motion.div`'s prop.** Plan baseline renders a parallel `<div className="bloom-reduced">` ONLY under PRM, keyed by `bloomKey`. Alternative: keep the single `motion.div` but swap `transition={prefersReducedMotion ? { duration: 0.6 } : springConfigs.bloom}` and force `animate={{ opacity: [0, 1, 0] }}` under PRM. Plan baseline keeps the M4a spring path byte-identical (no risk of regressing existing M4a tests); alternative is fewer DOM nodes. VERIFIER picks; both produce a 600 ms opacity flash under PRM.

- **DayCompleteCard timer extension (1700 → 2000 ms under PRM) vs. independent state.** Plan baseline mutates the existing `setTimeout` window (1700 ms motion ON; 2000 ms PRM) on the same `fireworksActive` boolean. Alternative: a separate `dayCompleteCardActive` boolean with its own 2000 ms timer, leaving `fireworksActive` always at 1700 ms. Plan baseline is one state variable + one timer; alternative is two. VERIFIER picks; both meet AC #6.

### ADR needed

**None.** All three Open Spec Gaps are resolved exactly per the spec's recommendation (per the dispatch prompt). The four surfaced mechanism choices (hook split; effect consume pattern; PRM bloom variant; card timer window) are plan-level mechanism decisions, not non-obvious project-level rules. M7d introduces no schema change, no new persisted field, no new ADR-binding rule, no new motion token, no new CSS custom property, no new asset, no new clock, and no new third-party dependency. The existing ADR set (ADR-006 / ADR-013 / ADR-018 / ADR-022 / ADR-023 / ADR-031 / ADR-041 / ADR-043 / ADR-044 / ADR-045 / ADR-046 / ADR-047) fully governs M7d's design surface.
