## Milestone 7d — Block-100% bloom + Day-100% fireworks (audio deferred) — Tests

This entry covers M7d — the fourth item in the Polish Layer: a sparing, transition-only celebration loop where a block card runs the M0 `bloom` spring exactly when `blockPct` crosses `<100 → ≥100` and the hero region runs the M4a fireworks particle overlay exactly when `dayPct` crosses `<100 → ≥100`. Audio is **explicitly deferred** — `celebrate(kind, { withAudio: false })` is the M7d call shape on every code path; `playChime` is mocked and asserted called zero times. Render-layer + module-extension only — no schema bump, no new persisted field, no new `Action` union member, no new clock, no new motion token, no new CSS custom property, no new asset, no new third-party dependency. M7d adds two new mount-scoped React hooks (`useBlockCelebrationOnce(blockId, pct)` backed by `useRef<Set<string>>` per SG-m7d-02; `useDayCelebrationOnce(pct)` backed by `useRef<boolean>`), a pure `celebrate(kind, opts)` shim routing haptics + (gated) audio, one NEW `<DayCompleteCard>` component (PRM-only "Day complete." text card with `role="status" aria-live="polite"`), one NEW `@keyframes blockBloomReduced` keyframe + `.bloom-reduced` class (PRM-only 600 ms opacity flash), and one NEW `.day-complete-card` style block. The existing M4a `useCrossUpEffect` is kept and exported unchanged for backwards compatibility (existing U-m3-012 assertion stays green byte-identical). It is derived from the `plan.md` M7d entry (`## Milestone 7d — Block-100% bloom + Day-100% fireworks (audio deferred) — Plan`, commit `4f44a50`). Feature slug: `m7d`. ID prefixes: `U-m7d-`, `C-m7d-`, `E-m7d-`, `A-m7d-`. M7d has a tight pure-logic surface (two hook truth tables + the `celebrate` shim's audio gate), a real component surface (`<TimelineBlock>` predicate swap + PRM bloom variant; `<BuildingClient>` predicate swap + PRM card mount + 2000 ms timer; `<DayCompleteCard>` standalone), and a deferred-to-preview perf + a11y surface (Lighthouse Perf ≥ 90; fireworks ≥ 55 fps over 2 s trace; no console errors; `<DayCompleteCard>` polite live-region announcement; axe-clean during + after the celebration), so it has the full four-layer test mix — unit (Vitest), component (Vitest + Testing Library), accessibility (axe via Playwright, deferred-to-preview), and E2E (Playwright, deferred-to-preview).

### Testing approach — what is bespoke vs gate-verified

M7d has a **genuine unit + component surface** — the two new hooks (`useBlockCelebrationOnce` and `useDayCelebrationOnce`) require deterministic truth-table tests using `renderHook` + `rerender` to drive multiple `pct` values across one mount, plus `unmount`/remount to verify ref-machine reset; the `celebrate(kind, opts)` shim requires `vi.mock("@/lib/audio", { playChime: vi.fn() })` + `vi.mock("@/lib/haptics", …)` to verify which side-effect channels fire under which `withAudio` value; and the three component surfaces require either an `act(() => rerender(...))` harness (TimelineBlock + BuildingClient) or a direct prop-table render (DayCompleteCard). Real GIVEN/WHEN/THEN `it()` / `test()` blocks are authored for all of it under Vitest. Two ACs are honestly part-gate-verified, consistent with the M5/M6/M8/M9a–M9e/M7a/M7b/M7c precedent:

- **AC #8 (`tsc --noEmit` clean; ESLint 0 errors (≤13 warnings); full Vitest suite green; `test:tz` green; Vitest covers all transition predicates above and the audio-off invariant)** → the lint / typecheck / full-suite-green / `test:tz` half is gate-verified by `npm run eval`; the four named Vitest scenarios in AC #8 (every transition predicate; the audio-off invariant) are anchored as bespoke IDs (`U-m7d-001..010` for the predicates; `U-m7d-011..014` + `C-m7d-005` + `C-m7d-010` for the audio-off invariant across hook + shim + both component layers).
- **AC #9 (E2E Playwright, deferred-to-preview: Lighthouse Performance ≥ 90; fireworks render at ≥ 55 fps over a 2 s trace; no console error on celebration paths)** → authored as real `test()` blocks under `e2e/` (`E-m7d-001..006`) but executed on the Vercel preview (the sandbox cannot run a real Lighthouse audit, a real Chromium frame-rate trace, or real `page.emulateMedia` PRM emulation against a production-build bundle; the M5b/M9a–M9e/M7a/M7b/M7c precedent for deferred-to-preview E2E + a11y carries forward).

All other 8 ACs map to at least one concrete bespoke `m7d` test ID below.

### Mutation-resistance notes (read before reviewing the IDs)

Per the established M5/M6/M8/M9a–M9e/M7a/M7b/M7c discipline, these tests are written to fail against a plausible buggy implementation, not merely an empty one:

- **`U-m7d-001` (`useBlockCelebrationOnce("A", 99)` on first render returns `false` AND does NOT lock the id) asserts** that a `renderHook(({ id, pct }) => useBlockCelebrationOnce(id, pct), { initialProps: { id: "A", pct: 99 } })` returns `false` on the first call AND a subsequent `rerender({ id: "A", pct: 100 })` returns `true` (the 99→100 transition fires — the id was NOT prematurely locked on the 99-first-render path). A mutant locking the id on EVERY first render (regardless of `pct < 100`) fails the second-call `true` assertion. AC #1 anchor — the canonical fire path.
- **`U-m7d-002` (`useBlockCelebrationOnce("A", 100)` on first render returns `false` AND DOES lock the id — hydration-into-100% suppression) asserts** that a `renderHook(({ id, pct }) => useBlockCelebrationOnce(id, pct), { initialProps: { id: "A", pct: 100 } })` returns `false` on the first call (the hydration-into-100% path — no transition); a `rerender({ id: "A", pct: 99 })` returns `false` (the cross-down is silent); a `rerender({ id: "A", pct: 100 })` ALSO returns `false` (the id was locked on the first hydration render — sparing semantics). A mutant returning `true` on the third call (treating the re-cross as a "fresh" transition after a drop) fails. AC #2 anchor — the hydration-suppression contract.
- **`U-m7d-003` (`useBlockCelebrationOnce("A", 99→100→99→100)` within one mount fires EXACTLY once — sparing semantics, SG-m7d-02) asserts** that with `initialProps: { id: "A", pct: 99 }` (returns `false`), then `rerender({ id: "A", pct: 100 })` (returns `true` — the first crossing fires), then `rerender({ id: "A", pct: 99 })` (returns `false` — cross-down is silent), then `rerender({ id: "A", pct: 100 })` (returns `false` — the id is locked from the first crossing; the second 100 crossing does NOT re-fire). A mutant treating each upward crossing as a fresh fire (resetting the `Set` on cross-down) fails the fourth-call `false` assertion. AC #3 anchor + SG-m7d-02 resolution anchor — the PRIMARY sparing-semantics contract VERIFIER's primary dispatch-prompt mandate.
- **`U-m7d-004` (`useBlockCelebrationOnce("A", …)` and `useBlockCelebrationOnce("B", …)` are gate-independent within the same mount) asserts** that with a `renderHook` harness rendering BOTH `useBlockCelebrationOnce("A", pctA)` AND `useBlockCelebrationOnce("B", pctB)` simultaneously (a tiny wrapper component calling both hooks), `initialProps: { pctA: 99, pctB: 99 }` returns `[false, false]`; `rerender({ pctA: 100, pctB: 100 })` returns `[true, true]` (both fire on their first crossing — the `Set<string>` gates each id independently); `rerender({ pctA: 100, pctB: 100 })` returns `[false, false]` (both locked). A mutant using a single `useRef<boolean>` instead of `useRef<Set<string>>` would gate both ids together (the first crossing of ANY id would lock ALL ids) — fails the `[true, true]` assertion. The PRIMARY set-vs-single-flag mutation-resistance anchor.
- **`U-m7d-005` (`useBlockCelebrationOnce("A", 99→100)` on a SECOND mount fires again — remount resets the Set) asserts** that the harness's `unmount()` followed by a fresh `renderHook(...)` with the SAME `id: "A"` and `pct: 99` then `pct: 100` returns `true` on the second-mount crossing — the `Set<string>` is component-instance-local, NOT module-level. A mutant promoting the `Set` to a module-level `const` (a closure leak) fails — the second mount would see the id already locked and return `false`. The remount-reset contract anchor — corroborates plan § `useBlockCelebrationOnce` "Component remount → ref discarded → set is empty".
- **`U-m7d-006` (`useBlockCelebrationOnce("A", 99→100→99 then user adds new brick dropping to 80→100)` within one mount fires EXACTLY once on the first 99→100 crossing) asserts** that with `initialProps: { id: "A", pct: 99 }` (returns `false`), `rerender({ pct: 100 })` (returns `true` — first crossing fires), `rerender({ pct: 99 })` (returns `false`), `rerender({ pct: 80 })` (returns `false`), `rerender({ pct: 100 })` (returns `false` — id was locked from the first crossing); the mutant that resets the Set on a drop-below-some-threshold fails. Resolves plan § Edge cases — "Block at 99% hydrates → user adds a new brick → block drops to (e.g.) 80%" — the bloom fires exactly once regardless of intermediate values.
- **`U-m7d-007` (`useDayCelebrationOnce(99→100)` on first hydrated transition returns `true`) asserts** that a `renderHook(({ pct }) => useDayCelebrationOnce(pct), { initialProps: { pct: 99 } })` returns `false` on the first call, AND a `rerender({ pct: 100 })` returns `true` (the day-level 99→100 crossing fires). AC #4 anchor — the canonical day fire path.
- **`U-m7d-008` (`useDayCelebrationOnce(100)` on first hydrated render returns `false` AND locks the mount-shot — hydration-into-100% suppression) asserts** that `renderHook(({ pct }) => useDayCelebrationOnce(pct), { initialProps: { pct: 100 } })` returns `false` on the first call (hydration-into-100% — no transition); a `rerender({ pct: 99 })` returns `false` (cross-down is silent); a `rerender({ pct: 100 })` ALSO returns `false` (the mount-shot was set on hydration — no replay). A mutant returning `true` on the third call fails. AC #5 anchor — the hydration-suppression contract for the day-level hook.
- **`U-m7d-009` (`useDayCelebrationOnce(99→100→99→100)` within one mount fires EXACTLY once) asserts** that `initialProps: { pct: 99 }` (returns `false`), `rerender({ pct: 100 })` (returns `true` — first crossing fires), `rerender({ pct: 99 })` (returns `false`), `rerender({ pct: 100 })` (returns `false` — the mount-shot was set on the first crossing; the second 100 crossing does NOT re-fire). A mutant treating each upward crossing as a fresh fire (resetting `fired.current` on cross-down) fails. AC #4 sparing-semantics anchor (matches the "once per mount" qualifier in AC #4: "the fireworks overlay fires once per mount").
- **`U-m7d-010` (`useDayCelebrationOnce(99→100)` on a SECOND mount fires again — remount resets the boolean) asserts** that the harness's `unmount()` followed by a fresh `renderHook(...)` with `pct: 99` then `pct: 100` returns `true` on the second-mount crossing — the boolean is component-instance-local, NOT module-level. A mutant promoting `fired` to a module-level `let` fails. Corroborates plan § `useDayCelebrationOnce` and § Edge cases — "Day → Week → Day view switch (remount)" path.
- **`U-m7d-011` (`celebrate("block", { withAudio: false })` fires `haptics.success()` and does NOT call `playChime`) asserts** with `vi.mock("@/lib/audio", () => ({ playChime: vi.fn() }))` AND `vi.mock("@/lib/haptics", () => ({ haptics: { success: vi.fn(), notification: vi.fn() } }))`, that `celebrate("block", { withAudio: false })` invokes `haptics.success` exactly once AND `playChime` exactly zero times AND `haptics.notification` exactly zero times. A mutant routing the block kind to `haptics.notification` (wrong haptic) fails; a mutant calling `playChime` regardless of `withAudio` fails. AC #7 anchor at the shim level + SG-m7d-01 resolution anchor.
- **`U-m7d-012` (`celebrate("day", { withAudio: false })` fires `haptics.notification()` and does NOT call `playChime`) asserts** the parallel: `haptics.notification` exactly once, `playChime` exactly zero, `haptics.success` exactly zero. AC #7 anchor at the shim level (day branch).
- **`U-m7d-013` (`celebrate(kind)` with NO opts argument defaults `withAudio` to `false`) asserts** that `celebrate("block")` (no second argument) invokes `haptics.success` exactly once AND `playChime` exactly zero times — the default-`false` invariant is the SOLE audio gate per plan § `celebrate(kind, opts)` shim § M7d invariants item 1. A mutant defaulting `withAudio` to `true` fails. The PRIMARY audio-deferral default-value anchor.
- **`U-m7d-014` (`celebrate("block", { withAudio: true })` DOES call `playChime` — forward-compat assertion for the M7f follow-up) asserts** that when the M7f follow-up flips `withAudio: true` at the call site, `playChime` IS called exactly once (proving the gate is functional, not load-bearing-only). The M7d code paths never set `withAudio: true`, but the shim's `if (withAudio) playChime()` branch is exercised by this test to guarantee the M7f follow-up is a one-line change at the call site. A mutant short-circuiting `playChime()` even when `withAudio === true` (e.g., a defensive `if (false)` left in place) fails. Plan § `celebrate(kind, opts)` shim § M7d invariants item 2 — the shim is the single audio gate.
- **`C-m7d-001` (`<TimelineBlock>` with `pct === 100` at hydration does NOT mount `data-testid="bloom-overlay"` on the first post-mount render) asserts** that a `render(<TimelineBlock block={blockAt100} … />)` with a fixture state forcing `blockPct === 100` on the first render does NOT contain `screen.queryByTestId("bloom-overlay")` (it returns `null`). After `vi.advanceTimersByTimeAsync(1000)` (the typical spring perceived duration), still `null`. A mutant calling `setBloomKey(1)` on hydration (e.g., a `useEffect` without the transition guard) would mount the overlay — fails. AC #2 anchor at the component layer + plan § Edge cases — "Hydration into a state where a block is already 100%".
- **`C-m7d-002` (`<TimelineBlock>` mounts `bloom-overlay` exactly once on a 99 → 100 prop transition) asserts** that a `render(<TimelineBlock block={blockAt99} … />)` followed by `rerender(<TimelineBlock block={blockAt100} … />)` (a prop change driving the 99→100 transition) mounts `screen.queryByTestId("bloom-overlay")` (it returns a real element); the element's `key` prop (or equivalent — verified via `data-bloom-key` or a snapshot of the `bloomKey` counter via spying on `setBloomKey`) increments from `0` to `1` (exactly one bump). A mutant firing the effect on every render (regardless of transition) would bump `bloomKey` multiple times — fails. AC #1 anchor at the component layer — the canonical 99→100 transition path.
- **`C-m7d-003` (`<TimelineBlock>` does NOT re-mount `bloom-overlay` on a 100→99→100 cycle within the same mount — sparing semantics) asserts** with `render(<TimelineBlock block={blockAt99} … />)`, `rerender(<TimelineBlock block={blockAt100} … />)` (first crossing — overlay mounts; `bloomKey` becomes `1`), `rerender(<TimelineBlock block={blockAt99} … />)` (cross-down — overlay may unmount via exit animation, no key bump), `rerender(<TimelineBlock block={blockAt100} … />)` (second crossing — overlay does NOT re-mount; `bloomKey` STAYS at `1`). A mutant that bumps `bloomKey` on the second 100-cross fails. Plan § Edge cases — "100→99→100 within one mount → no second bloom" anchor + SG-m7d-02 resolution at the component layer.
- **`C-m7d-004` (under `prefers-reduced-motion: reduce`, `<TimelineBlock>` does NOT mount `bloom-overlay` (the spring `motion.div`) but DOES mount `bloom-overlay-reduced` (the opacity-flash variant) on a 99 → 100 transition) asserts** with `useReducedMotion` mocked to return `true` (Framer Motion's `useReducedMotion` hook is the consumer per plan § Components), `render(<TimelineBlock block={blockAt99} … />)` then `rerender(<TimelineBlock block={blockAt100} … />)`: `screen.queryByTestId("bloom-overlay")` is `null` (the spring `motion.div` does NOT render under PRM — the existing M4a gate); `screen.queryByTestId("bloom-overlay-reduced")` is a real element with `className` containing `"bloom-reduced"`. The element's inline style includes `position: absolute`, `inset: 0`, `pointer-events: none` (per plan § Components — `<TimelineBlock>`). A mutant rendering the spring `motion.div` even under PRM fails the first sub-assertion; a mutant omitting the `bloom-reduced` sibling fails the second. AC #6 anchor at the block-bloom PRM path + plan § Reduced-motion semantics.
- **`C-m7d-005` (`<TimelineBlock>` on a 99 → 100 transition invokes `haptics.success()` exactly once AND does NOT invoke `playChime`) asserts** with `vi.mock("@/lib/audio", () => ({ playChime: vi.fn() }))` AND `vi.mock("@/lib/haptics", () => ({ haptics: { success: vi.fn(), notification: vi.fn() } }))`, the `rerender(...)` driving the 99→100 transition results in `haptics.success` invocation count `=== 1`, `playChime` invocation count `=== 0`, `haptics.notification` invocation count `=== 0`. The TimelineBlock source file (`components/TimelineBlock.tsx`) does NOT import `playChime` directly (verified via `fs.readFileSync` + regex `/import .* playChime .* from .*audio/` — zero matches; the import was removed per plan § File structure "Removed: the direct `playChime` import + call site"). A mutant restoring a direct `playChime()` call in TimelineBlock fails the count assertion AND the source-inspection assertion. AC #7 anchor at the TimelineBlock layer + SG-m7d-01 resolution at the component layer.
- **`C-m7d-006` (`<BuildingClient>` with `dayPct === 100` at hydration does NOT activate `data-testid="fireworks"` on the first post-mount render) asserts** that a `render(<BuildingClient initialState={stateWithDayAt100} />)` does NOT contain `screen.queryByTestId("fireworks")` as an active overlay (the `<Fireworks>` component receives `active={false}` on the first render — verified either via a `data-active` prop spy or by asserting the overlay's particle children are absent). After `vi.advanceTimersByTimeAsync(2000)`, still inactive. A mutant calling `setFireworksActive(true)` on hydration fails. AC #5 anchor at the BuildingClient layer + plan § Edge cases — "Hydration into a 100% day".
- **`C-m7d-007` (`<BuildingClient>` activates fireworks exactly once on a <100 → 100 transition; `setFireworksActive(false)` fires 1700 ms later under motion ON) asserts** with `render(<BuildingClient initialState={stateWithDayAt99} />)` followed by a state mutation (via a brick-log dispatch or a `rerender` with `stateWithDayAt100`) driving the day's 99→100 transition, `screen.queryByTestId("fireworks")` becomes an active overlay (the `<Fireworks>` receives `active={true}`); `vi.advanceTimersByTimeAsync(1700)` flips `active` back to `false`. A second `rerender` to `stateWithDayAt99` then back to `stateWithDayAt100` within the same mount does NOT re-activate fireworks (the mount-shot is set). A mutant re-firing on every upward crossing fails the second-cycle assertion. AC #4 anchor at the BuildingClient layer + the 1700 ms motion-ON window.
- **`C-m7d-008` (under PRM, `<BuildingClient>` on a <100 → 100 transition mounts `<DayCompleteCard active={true}>` and `<Fireworks>` returns `null`; the card unmounts after 2000 ms) asserts** with `useReducedMotion` mocked to return `true`, the same transition harness as `C-m7d-007`: `screen.queryByTestId("fireworks")` is `null` (the `<Fireworks>` returns `null` under PRM — M4a behavior preserved); `screen.queryByTestId("day-complete-card")` is a real element with text containing `"Day complete."`; the card has attributes `role="status"` and `aria-live="polite"`. `vi.advanceTimersByTimeAsync(2000)` unmounts the card (`screen.queryByTestId("day-complete-card")` returns to `null`). A `vi.advanceTimersByTimeAsync(1700)` BEFORE the full 2000 ms keeps the card mounted (the PRM-extended timer is 2000 ms, NOT 1700 ms — per plan § Reduced-motion semantics table). A mutant using the motion-ON 1700 ms window under PRM fails the "still mounted at 1700 ms" sub-assertion; a mutant routing the timer to 1700 ms unconditionally fails the "unmounts by 2000 ms" sub-assertion. AC #6 anchor at the day-fireworks PRM path + plan § Reduced-motion semantics (the 1700 → 2000 ms PRM-conditional timer extension).
- **`C-m7d-009` (under motion ON, `<BuildingClient>` does NOT mount `<DayCompleteCard active={true}>` on a <100 → 100 transition — card is PRM-only) asserts** with `useReducedMotion` mocked to return `false` (the motion-ON path), the same transition harness as `C-m7d-007`: `screen.queryByTestId("fireworks")` is a real overlay (the motion-ON fireworks path), AND `screen.queryByTestId("day-complete-card")` is `null` (the card's `active` prop is gated on `fireworksActive && prefersReducedMotion` — under motion ON, `prefersReducedMotion === false`, so the card never receives `active={true}` and renders `null` per its prop contract). A mutant rendering the card on every fireworks fire (regardless of PRM) fails. Plan § Components — `<DayCompleteCard>` "Card renders for 2000 ms under PRM (vs. zero render on the motion-ON path — the `<DayCompleteCard active={fireworksActive && prefersReducedMotion} />` predicate gates the motion ON path to `false`)" anchor — the PRIMARY card-PRM-only contract.
- **`C-m7d-010` (`<BuildingClient>` on a <100 → 100 transition invokes `haptics.notification()` exactly once AND does NOT invoke `playChime`) asserts** with the same audio + haptics mocks as `C-m7d-005`, the `rerender(...)` driving the day's 99→100 transition results in `haptics.notification` invocation count `=== 1`, `playChime` invocation count `=== 0`, `haptics.success` invocation count `=== 0`. The BuildingClient source file (`app/(building)/BuildingClient.tsx`) does NOT import `playChime` directly (verified via `fs.readFileSync` + regex `/import .* playChime .* from .*audio/` — zero matches). A mutant restoring a direct `playChime()` call in BuildingClient fails the count assertion AND the source-inspection assertion. AC #7 anchor at the BuildingClient layer + SG-m7d-01 resolution at the day-celebration layer.
- **`C-m7d-011` (`<DayCompleteCard active={true} />` renders the "Day complete." text with `role="status"` and `aria-live="polite"`) asserts** that `render(<DayCompleteCard active={true} />)` renders a real element with `data-testid="day-complete-card"`, text content containing `"Day complete."`, attributes `role="status"` and `aria-live="polite"`, AND a `font-family` style referencing `var(--font-display)` (the Instrument Serif headline per plan § Components — `<DayCompleteCard>`). The element has inline style `pointer-events: none` AND `z-index: 50` (matching the Fireworks z-layer). A mutant omitting `role="status"` or `aria-live="polite"` fails the AT-announcement contract; a mutant using `aria-live="assertive"` (which would interrupt other speech) fails the polite-announcement sub-assertion. Plan § Components — `<DayCompleteCard>` anchor + spec § Edge cases ("a static 'Day complete.' text card center-screen for 2 s, then fades").
- **`C-m7d-012` (`<DayCompleteCard active={false} />` renders `null`) asserts** that `render(<DayCompleteCard active={false} />)` results in `screen.queryByTestId("day-complete-card")` returning `null`; the rendered output has zero DOM nodes (verified via `container.firstChild === null` or `container.innerHTML === ""`). A mutant rendering the card with `visibility: hidden` (instead of returning `null`) leaves a DOM node — fails. Plan § Components — "Renders `null` when `active === false`" anchor.
- **`C-m7d-013` (no celebration replays on past-day reads via `<PastDayDetail>` / `<MonthView>` / `<WeekView>` / `<YearView>`) asserts** by source-file inspection (`fs.readFileSync` on `components/PastDayDetail.tsx`, `components/MonthView.tsx`, `components/WeekView.tsx`, `components/YearView.tsx`): NO file imports `useBlockCelebrationOnce`, `useDayCelebrationOnce`, OR `celebrate` from `lib/celebrations` (regex `/from .*celebrations/` on each file returns zero matches for the three new symbols; the existing `useCrossUpEffect` import — if any past-day file uses it — is also asserted absent). Plan § Edge cases — "Past-day reads (Castle / Kingdom / Empire / `<PastDayDetail>`)" anchor + spec § "What this is NOT" — "history-archived 100% days were celebrated when they happened". A mutant wiring the celebration hooks into PastDayDetail (a misplaced replay) fails the source-inspection assertion.
- **`C-m7d-014` (`useCrossUpEffect` is still exported unchanged from `lib/celebrations.ts` — backwards compatibility with U-m3-012) asserts** by inspecting the exported surface of `lib/celebrations.ts` via `import * as celebrations from "@/lib/celebrations"`: `typeof celebrations.useCrossUpEffect === "function"`; AND a direct re-run of the U-m3-012 truth-table assertion (the existing `useCrossUpEffect(value, threshold, fn)` one-shot upward-crossing contract — verified by `renderHook` driving the value from below threshold to above threshold once and asserting `fn` is invoked exactly once) passes byte-identical. A mutant deleting or renaming `useCrossUpEffect` fails the export assertion AND the U-m3-012 contract assertion. Plan § File structure — "`useCrossUpEffect` is **kept** and exported unchanged for backwards compatibility" + § Regression surface — "the existing U-m3-012 `useCrossUpEffect` assertion stays green byte-identical".
- **`C-m7d-015` (no new asset is added under `public/`; `components/Fireworks.tsx` is UNCHANGED by M7d — SG-m7d-03 resolution) asserts** by reading the production `components/Fireworks.tsx` via `fs.readFileSync` and comparing its `PARTICLE_COUNT`, `COLORS`, and the `1700` ms internal timer constant to the M4a-known values (the file appears in plan § File structure "Not modified — confirmed"; the test asserts the file body's SHA-256 or a hand-picked substring matches M4a's). Additionally, a `fs.readdirSync("public/sounds")` shows `chime.mp3` is present at its M4a size of 431 bytes (NOT replaced — M7d does not flip the audio gate) AND `fs.readdirSync("public")` shows no NEW SVG, image, or font asset attributable to M7d (the M7d diff under `public/` is empty). A mutant adding a Lottie file, a new SVG, or any new asset under `public/` fails the directory-inspection assertion; a mutant modifying `components/Fireworks.tsx` fails the substring assertion. SG-m7d-03 resolution anchor + plan § Dependencies — "Zero new image, font, SVG, audio, or third-party dependency".

### Test ID layout

| Layer                                 | IDs              | Count  |
| ------------------------------------- | ---------------- | ------ |
| Unit (Vitest)                         | `U-m7d-001..014` | 14     |
| Component (Vitest + Testing Library)  | `C-m7d-001..015` | 15     |
| Accessibility (axe via Playwright)    | `A-m7d-001..003` | 3      |
| E2E (Playwright, deferred-to-preview) | `E-m7d-001..006` | 6      |
| **Total**                             |                  | **38** |

ID series start values were supplied by the orchestrator as the running totals for the four `m7d` prefixes; m7d introduces four fresh prefixes (`U-m7d-`, `C-m7d-`, `E-m7d-`, `A-m7d-`), so each series begins at `001`. IDs are unique, stable, and gap-free so VERIFIER can map AC → test ID.

**Fixture vocabulary (used across the m7d IDs unless a test overrides it):**

- A standing `AppState` fixture: `programStart: "2026-05-01"`, `currentDate: "2026-05-20"`, `deletions: {}`, `history: {}`, `schemaVersion: 3`. The `blockPct` or `dayPct` value varies per test.
- **`stateWithDayAt99`** — an `AppState` fixture engineered so `dayScore(state) === 99` (e.g., one specific block at 99% with all other blocks at 100%, or equivalent equal-weight arithmetic per ADR-005). Drives `C-m7d-007`, `C-m7d-008`, `C-m7d-009`, `C-m7d-010` as the pre-transition state.
- **`stateWithDayAt100`** — the parallel fixture with `dayScore(state) === 100` (every visible block at 100%). Drives `C-m7d-006` as the hydration state AND the post-transition target for `C-m7d-007..010`.
- **`blockAt99`** — a `Block` fixture engineered so `blockScore(block) === 99` (e.g., a 4-brick block with 3 ticked → 75%; or a units block tuned to 99 — the exact arithmetic is per the fixture builder; the assertion is on `blockPct < 100`).
- **`blockAt100`** — the parallel fixture with `blockScore(block) === 100` (all bricks ticked / units target met).
- **`fakeTimerHarness`** — Vitest's `vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })` + `vi.useRealTimers()` afterEach. Drives `C-m7d-002..010` (the spring + the 1700 / 2000 ms timers).
- **`useReducedMotionMock`** — a Vitest module mock for `motion/react`'s `useReducedMotion` hook returning `true` (drives the PRM-path assertions in `C-m7d-004` and `C-m7d-008`) or `false` (drives the motion-ON-path assertions in `C-m7d-009`).
- **`audioMock`** — `vi.mock("@/lib/audio", () => ({ playChime: vi.fn() }))` — drives the `playChime` zero-call assertion across `U-m7d-011..013` and `C-m7d-005`, `C-m7d-010`.
- **`hapticsMock`** — `vi.mock("@/lib/haptics", () => ({ haptics: { success: vi.fn(), notification: vi.fn() } }))` — drives the haptics fan-out assertion across `U-m7d-011..013` and `C-m7d-005`, `C-m7d-010`.

### Unit (Vitest)

`U-m7d-001..006` exercise `useBlockCelebrationOnce` — the truth table for the canonical 99→100 fire, the hydration-into-100% suppression, the SG-m7d-02 sparing semantics (100→99→100 → no second fire), the two-id gate independence (`Set<string>` vs. single `useRef<boolean>`), the remount reset, and the "block drops to 80% intermediate then back to 100%" edge case. `U-m7d-007..010` exercise `useDayCelebrationOnce` — the parallel truth table at the day level (single-scoped boolean). `U-m7d-011..014` exercise the `celebrate(kind, opts)` shim — the haptics fan-out (`block → success`; `day → notification`), the audio gate (`withAudio: false` → zero `playChime`), the default-`false` invariant, and the M7f forward-compat (`withAudio: true` DOES call `playChime`).

#### U-m7d-001 — success (`useBlockCelebrationOnce("A", 99)` on first render returns `false` AND does NOT prematurely lock the id; the subsequent 99→100 rerender fires)

Target file: `lib/celebrations.test.ts` (EXISTS — m7d appends m7d-specific assertions; the existing U-m3-012 `useCrossUpEffect` assertion stays green byte-identical per plan § Regression surface)
Layer: Unit
**GIVEN** the `useBlockCelebrationOnce(blockId, pct)` hook exported from `lib/celebrations.ts`
**WHEN** the test renders the hook via `renderHook(({ id, pct }) => useBlockCelebrationOnce(id, pct), { initialProps: { id: "A", pct: 99 } })` and reads `result.current`, then `rerender({ id: "A", pct: 100 })` and reads `result.current` again
**THEN** the first call returns `false` (no transition yet — the block is below threshold at hydration; the id is NOT locked because `pct < 100` on hydration); the second call returns `true` (the 99→100 transition fires — first crossing of this mount).
**AND** a third `rerender({ id: "A", pct: 100 })` returns `false` (the id was locked on the firing render — sparing semantics).
Proves: plan.md § `useBlockCelebrationOnce` — "99→100 (first crossing this mount) → bloom once" + spec AC #1 ("When a brick log transitions a block from `<100` to exactly `100`, the block card runs the M0 `bloom` spring on its accent ring/outline exactly once") — covers SPEC AC #1.
Tag: success.

#### U-m7d-002 — edge (`useBlockCelebrationOnce("A", 100)` on first hydrated render returns `false` AND DOES lock the id — hydration-into-100% suppression; cross-down then re-cross does NOT bloom)

Target file: `lib/celebrations.test.ts`
Layer: Unit
**GIVEN** the `useBlockCelebrationOnce(blockId, pct)` hook with a `pct` value of exactly 100 on the first call
**WHEN** the test renders via `renderHook(({ id, pct }) => useBlockCelebrationOnce(id, pct), { initialProps: { id: "A", pct: 100 } })` (the hydration-into-100% path), then `rerender({ id: "A", pct: 99 })`, then `rerender({ id: "A", pct: 100 })`
**THEN** the first call returns `false` (hydration into 100% — no transition); the second call returns `false` (cross-down is silent — the bloom is one-way); the third call returns `false` (the id was locked on the first hydrated render — a 99→100 re-cross does NOT bloom because the user already saw the block at 100% on hydration; "celebrations are sparing" applies).
**AND** a mutant returning `true` on the third call (treating the re-cross as a "fresh" 99→100 transition) fails — verifies the hydration-suppression latches the id in the `bloomed` Set on the FIRST render, not on the FIRST cross-up.
Proves: plan.md § `useBlockCelebrationOnce` — "Hydration into 100% → no bloom, but block id locked" + § Edge cases — "Hydration into a state where a block is already 100%" + spec AC #2 ("A block that was at 100% at hydration does not bloom on mount") — covers SPEC AC #2 + the locked-on-hydration sub-contract.
Tag: edge.

#### U-m7d-003 — invariant (`useBlockCelebrationOnce("A", 99→100→99→100)` within one mount fires EXACTLY once — SG-m7d-02 sparing semantics)

Target file: `lib/celebrations.test.ts`
Layer: Unit
**GIVEN** the `useBlockCelebrationOnce(blockId, pct)` hook driven through a 99→100→99→100 sequence within one mount
**WHEN** the test renders via `renderHook(({ id, pct }) => useBlockCelebrationOnce(id, pct), { initialProps: { id: "A", pct: 99 } })`, then `rerender({ id: "A", pct: 100 })` (call 2), then `rerender({ id: "A", pct: 99 })` (call 3), then `rerender({ id: "A", pct: 100 })` (call 4)
**THEN** call 1 returns `false` (no transition); call 2 returns `true` (first crossing fires — `bloomed.has("A")` was `false`, now `true`); call 3 returns `false` (cross-down is silent); call 4 returns `false` (the id is locked from call 2 — `bloomed.has("A")` is `true`; the second 100 crossing does NOT re-fire).
**AND** a mutant that resets the `Set` on cross-down (incorrectly modeling sparing as "once per crossing" instead of "once per mount") fails — verifies the `Set<string>` is monotone-growing per mount.
Proves: plan.md § `useBlockCelebrationOnce` — "100→99→100 within one mount → no second bloom" + SG-m7d-02 resolution — "once per block per mount, full-stop" + spec AC #3 ("A block that drops from 100% does not re-bloom on the next 100% crossing within the same mount") — covers SPEC AC #3 + the PRIMARY SG-m7d-02 resolution. The PRIMARY sparing-semantics mutation-resistance anchor.
Tag: invariant.

#### U-m7d-004 — invariant (`useBlockCelebrationOnce("A", …)` and `useBlockCelebrationOnce("B", …)` gate independently within the same mount — `Set<string>` per-mount, not per-id)

Target file: `lib/celebrations.test.ts`
Layer: Unit
**GIVEN** two `useBlockCelebrationOnce` calls in the same component with distinct ids (`"A"` and `"B"`)
**WHEN** the test renders a wrapper component calling both hooks: `function W({ pctA, pctB }) { const a = useBlockCelebrationOnce("A", pctA); const b = useBlockCelebrationOnce("B", pctB); return [a, b]; }` via `renderHook((props) => W(props), { initialProps: { pctA: 99, pctB: 99 } })`, then `rerender({ pctA: 100, pctB: 100 })`, then `rerender({ pctA: 100, pctB: 100 })`
**THEN** call 1 returns `[false, false]` (no transitions yet); call 2 returns `[true, true]` (both ids fire on their first crossing simultaneously — the `Set<string>` gates each id independently); call 3 returns `[false, false]` (both ids locked).
**AND** the per-mount Set is shared across both hook calls inside the same component (the implementation uses a single `useRef<Set<string>>` per component; the SET is per-component-instance, not per-hook-call) OR each hook call has its own `Set<string>` instance — either way, the OBSERVABLE behavior is `[true, true]` on the simultaneous crossing. A mutant using `useRef<boolean>` instead of `useRef<Set<string>>` would gate both ids together — the first crossing of any id locks all ids — and calls 2 + 3 would return `[true, false]` or `[false, true]` depending on hook order. Fails.
Proves: plan.md § `useBlockCelebrationOnce` — "Two distinct block ids → each blooms on its own first crossing. The `Set<string>` is per-mount, not per-id; both ids gate independently" — covers the PRIMARY set-vs-single-flag invariant. Anchors plan § Edge cases — "A brick log pushes block A 99→100 AND block B 100→99 simultaneously" (the A-blooms-B-does-not branch is the cross-down half; this U-m7d-004 anchors the A-blooms-AND-B-also-blooms half when both ids cross up simultaneously).
Tag: invariant.

#### U-m7d-005 — edge (`useBlockCelebrationOnce("A", 99→100)` on a SECOND mount fires again — remount resets the `Set<string>`)

Target file: `lib/celebrations.test.ts`
Layer: Unit
**GIVEN** the `useBlockCelebrationOnce(blockId, pct)` hook driven through a 99→100 transition on a first mount, then unmounted and re-mounted with the same id
**WHEN** the test renders via `const { result, rerender, unmount } = renderHook(({ id, pct }) => useBlockCelebrationOnce(id, pct), { initialProps: { id: "A", pct: 99 } })`; calls `rerender({ id: "A", pct: 100 })` (asserts `result.current === true` — first mount, first crossing); calls `unmount()`; calls a FRESH `renderHook(({ id, pct }) => useBlockCelebrationOnce(id, pct), { initialProps: { id: "A", pct: 99 } })` (a NEW second mount); calls `rerender({ id: "A", pct: 100 })` on the second mount
**THEN** the second mount's first call returns `false` (pre-transition); the second mount's second call returns `true` (the 99→100 crossing fires AGAIN — the Set was discarded on unmount; the fresh mount has an empty Set).
**AND** a mutant promoting the Set to a module-level `const` (a closure leak) would see the id already locked across mounts — fails the second-mount `true` assertion.
Proves: plan.md § `useBlockCelebrationOnce` — "Component remount → ref discarded → set is empty → next 99→100 crossing fires" + § Edge cases — "Day → Week → Day view switch (remount)" — covers the remount-reset contract.
Tag: edge.

#### U-m7d-006 — edge (`useBlockCelebrationOnce("A", 99→100→99→80→100)` within one mount fires EXACTLY once on the FIRST 99→100; intermediate 80% does NOT reset the lock)

Target file: `lib/celebrations.test.ts`
Layer: Unit
**GIVEN** the `useBlockCelebrationOnce(blockId, pct)` hook driven through a sequence covering an intermediate drop to a low value (80) before re-crossing
**WHEN** the test renders via `renderHook(({ id, pct }) => useBlockCelebrationOnce(id, pct), { initialProps: { id: "A", pct: 99 } })`, then rerenders with `pct: 100` (call 2 — fires), `pct: 99` (call 3), `pct: 80` (call 4), `pct: 100` (call 5)
**THEN** call 1 returns `false`; call 2 returns `true` (first crossing fires); call 3 returns `false` (cross-down); call 4 returns `false` (deeper drop — still no fire); call 5 returns `false` (re-crossing — locked from call 2).
**AND** a mutant that resets the Set when `pct` drops below some intermediate threshold (e.g., "if `pct < 50`, allow re-fire") fails — the lock is permanent for the mount.
Proves: plan.md § Edge cases — "Block at 99% hydrates → user adds a new brick → block drops to (e.g.) 80%" — "Bloom fires once. Then if user untoggles + retoggles within the same mount: bloomed.has === true → no replay" — covers the deep-drop variant of SG-m7d-02 sparing.
Tag: edge.

#### U-m7d-007 — success (`useDayCelebrationOnce(99→100)` on a 99→100 prop transition returns `true` for exactly one render)

Target file: `lib/celebrations.test.ts`
Layer: Unit
**GIVEN** the `useDayCelebrationOnce(pct)` hook exported from `lib/celebrations.ts`
**WHEN** the test renders via `renderHook(({ pct }) => useDayCelebrationOnce(pct), { initialProps: { pct: 99 } })` and reads `result.current`, then `rerender({ pct: 100 })` and reads `result.current` again, then `rerender({ pct: 100 })` (stable above threshold) and reads once more
**THEN** call 1 returns `false` (no transition yet); call 2 returns `true` (the day-level 99→100 crossing fires); call 3 returns `false` (the mount-shot was set on call 2 — `fired.current === true`).
**AND** a mutant returning `true` on call 3 (treating a stable-above-threshold render as a fresh fire) fails.
Proves: plan.md § `useDayCelebrationOnce` — "Same hydration-suppression + once-per-mount discipline as the block hook" + spec AC #4 ("When `dayScore(state)` transitions from `<100` to exactly `100`, the fireworks overlay fires once per mount") — covers SPEC AC #4.
Tag: success.

#### U-m7d-008 — edge (`useDayCelebrationOnce(100)` on first hydrated render returns `false` AND locks the mount-shot — hydration-into-100%-day suppression)

Target file: `lib/celebrations.test.ts`
Layer: Unit
**GIVEN** the `useDayCelebrationOnce(pct)` hook with a `pct` value of exactly 100 on the first call (the M9b past-100%-day-rolling-over-into-today path; or the M7c "First paint with `dayScore === 100`" hand-off)
**WHEN** the test renders via `renderHook(({ pct }) => useDayCelebrationOnce(pct), { initialProps: { pct: 100 } })`, then `rerender({ pct: 99 })`, then `rerender({ pct: 100 })`
**THEN** call 1 returns `false` (hydration into 100% — no transition); call 2 returns `false` (cross-down is silent); call 3 returns `false` (the mount-shot was set on the first hydrated render — a 99→100 re-cross does NOT fire).
**AND** the hero count-up (M7c) lands at 100% smoothly without celebration (consistent with M7c spec § Edge cases "First paint with `dayScore === 100`" row — M7c animates 0 → 100; M7d's hook sees the hydration value of 100 on the first render and locks the mount-shot — no fireworks).
Proves: plan.md § `useDayCelebrationOnce` — "Hydration into a 100% day → no fireworks; the hero count-up (M7c) lands at 100% smoothly" + spec AC #5 ("A day that was at 100% at hydration does not fire fireworks on mount") — covers SPEC AC #5 + the M7c↔M7d hand-off contract.
Tag: edge.

#### U-m7d-009 — invariant (`useDayCelebrationOnce(99→100→99→100)` within one mount fires EXACTLY once — once-per-mount sparing semantics)

Target file: `lib/celebrations.test.ts`
Layer: Unit
**GIVEN** the `useDayCelebrationOnce(pct)` hook driven through a 99→100→99→100 sequence within one mount
**WHEN** the test renders via `renderHook(({ pct }) => useDayCelebrationOnce(pct), { initialProps: { pct: 99 } })`, then rerenders with `pct: 100` (call 2 — fires), `pct: 99` (call 3), `pct: 100` (call 4)
**THEN** call 1 returns `false`; call 2 returns `true` (first crossing fires); call 3 returns `false` (cross-down); call 4 returns `false` (mount-shot is set from call 2 — no replay).
**AND** a mutant treating each upward crossing as a fresh fire (resetting `fired.current` on cross-down) fails.
Proves: plan.md § `useDayCelebrationOnce` — "fires once per mount on first 99→100 transition, suppressed forever once it has fired during this mount (no replay even after a 100→99→100 cycle)" + spec AC #4 ("fires once per mount") — covers the day-hook sparing-semantics contract.
Tag: invariant.

#### U-m7d-010 — edge (`useDayCelebrationOnce(99→100)` on a SECOND mount fires again — remount resets the boolean)

Target file: `lib/celebrations.test.ts`
Layer: Unit
**GIVEN** the `useDayCelebrationOnce(pct)` hook driven through a 99→100 transition on a first mount, then unmounted and re-mounted
**WHEN** the test renders via `const { result, rerender, unmount } = renderHook(({ pct }) => useDayCelebrationOnce(pct), { initialProps: { pct: 99 } })`; calls `rerender({ pct: 100 })` (asserts `result.current === true`); calls `unmount()`; calls a fresh `renderHook(({ pct }) => useDayCelebrationOnce(pct), { initialProps: { pct: 99 } })`; calls `rerender({ pct: 100 })` on the second mount
**THEN** the second mount's second call returns `true` (the 99→100 crossing fires AGAIN — the mount-shot was discarded on unmount).
**AND** a mutant promoting `fired` to a module-level `let` (closure leak) fails.
Proves: plan.md § `useDayCelebrationOnce` + § Edge cases — "Day → Week → Day view switch (remount)" — "the bloom is meaningful again" — covers the remount-reset contract at the day level.
Tag: edge.

#### U-m7d-011 — invariant (`celebrate("block", { withAudio: false })` fires `haptics.success()` and does NOT call `playChime` — the audio gate is the SOLE audio path)

Target file: `lib/celebrations.test.ts`
Layer: Unit
**GIVEN** the `celebrate(kind, opts)` shim exported from `lib/celebrations.ts`, with `lib/audio` and `lib/haptics` mocked via `audioMock` and `hapticsMock`
**WHEN** the test invokes `celebrate("block", { withAudio: false })` exactly once
**THEN** `haptics.success` is invoked exactly once (the block-kind haptic per plan § `celebrate(kind, opts)` shim); `haptics.notification` is invoked exactly zero times; `playChime` is invoked exactly zero times (the audio gate gates the chime per AC #7).
**AND** a mutant routing the block kind to `haptics.notification` (wrong haptic) fails the success-call-count assertion; a mutant calling `playChime` regardless of `withAudio` fails the zero-call assertion.
Proves: plan.md § `celebrate(kind, opts)` shim — "if (kind === 'block') haptics.success(); … if (withAudio) playChime();" + § M7d invariants item 1 — "the `playChime` import is reachable in the module but unexecuted on every M7d code path" + spec AC #7 ("`celebrate(kind, { withAudio: false })` is the M7d default. No call to `lib/audio.ts`'s play API fires from M7d's celebration path") — covers SPEC AC #7 at the shim level. The PRIMARY audio-gate anchor.
Tag: invariant.

#### U-m7d-012 — invariant (`celebrate("day", { withAudio: false })` fires `haptics.notification()` and does NOT call `playChime`)

Target file: `lib/celebrations.test.ts`
Layer: Unit
**GIVEN** the `celebrate(kind, opts)` shim with the audio + haptics mocks
**WHEN** the test invokes `celebrate("day", { withAudio: false })` exactly once
**THEN** `haptics.notification` is invoked exactly once (the day-kind haptic per plan § `celebrate(kind, opts)` shim — "else haptics.notification()"); `haptics.success` is invoked exactly zero times; `playChime` is invoked exactly zero times.
**AND** a mutant routing the day kind to `haptics.success` (mirror of the block-haptic mistake) fails.
Proves: plan.md § `celebrate(kind, opts)` shim (day branch) + spec AC #7 — covers SPEC AC #7 at the day-haptic + audio-gate level.
Tag: invariant.

#### U-m7d-013 — invariant (`celebrate(kind)` with NO opts argument defaults `withAudio` to `false` — the SOLE audio gate per plan § M7d invariants item 1)

Target file: `lib/celebrations.test.ts`
Layer: Unit
**GIVEN** the `celebrate(kind, opts)` shim where `opts` is omitted
**WHEN** the test invokes `celebrate("block")` (no second argument) AND `celebrate("day")` (no second argument)
**THEN** `playChime` is invoked exactly zero times across both calls (the `{ withAudio = false } = opts ?? {}` destructuring defaults `withAudio` to `false`); `haptics.success` is invoked exactly once (from `celebrate("block")`); `haptics.notification` is invoked exactly once (from `celebrate("day")`).
**AND** a mutant defaulting `withAudio` to `true` (e.g., `const { withAudio = true } = opts`) fails the zero-call `playChime` assertion.
Proves: plan.md § M7d invariants item 1 — "Default `withAudio === false`" + spec AC #7 — covers the default-value invariant. The PRIMARY default-`false` audio-gate anchor.
Tag: invariant.

#### U-m7d-014 — forward-compat (`celebrate("block", { withAudio: true })` DOES call `playChime` — the M7f follow-up is a one-line change at the call site)

Target file: `lib/celebrations.test.ts`
Layer: Unit
**GIVEN** the `celebrate(kind, opts)` shim with the audio + haptics mocks
**WHEN** the test invokes `celebrate("block", { withAudio: true })` exactly once
**THEN** `playChime` is invoked exactly once (the gate's `true` branch is functional — the shim is the SINGLE audio gate per plan § M7d invariants item 2; flipping `withAudio` at the call site is sufficient to enable the chime); `haptics.success` is also invoked exactly once (the haptic fires alongside the chime in the `withAudio: true` configuration).
**AND** a mutant short-circuiting `playChime()` even when `withAudio === true` (e.g., a defensive `if (false)` left in place) fails — proves the M7f follow-up is genuinely a one-line change.
Proves: plan.md § M7d invariants item 2 — "The shim is the **single audio gate**. The M7f follow-up that lands a real chime asset is a one-line change" — covers the forward-compat invariant for the M7f follow-up. M7d-out-of-scope but anchors the M7f hand-off contract.
Tag: forward-compat.

### Component (Vitest + Testing Library)

`C-m7d-001..005` exercise `<TimelineBlock>` — the bloom overlay does NOT mount on a `pct === 100` hydration, mounts exactly once on a 99 → 100 prop transition, does NOT re-mount on a 100→99→100 cycle, the PRM `bloom-overlay-reduced` variant, and the haptics + audio-off invariant at the TimelineBlock layer. `C-m7d-006..010` exercise `<BuildingClient>` — fireworks does NOT activate on a `dayPct === 100` hydration, activates exactly once on a <100 → 100 transition under motion ON (with the 1700 ms timer), the PRM `<DayCompleteCard>` mount + 2000 ms timer, the motion-ON-card-never-renders invariant, and the haptics + audio-off invariant at the BuildingClient layer. `C-m7d-011..012` exercise `<DayCompleteCard>` standalone — the `active={true}` render + `role="status"` + `aria-live="polite"` + serif headline; the `active={false}` returns `null`. `C-m7d-013` exercises the past-day-reads no-celebration-replay invariant by source-file inspection. `C-m7d-014` exercises the `useCrossUpEffect` backwards-compat regression (U-m3-012 stays green). `C-m7d-015` exercises the SG-m7d-03 resolution (Fireworks.tsx unchanged; no new asset).

#### C-m7d-001 — edge (`<TimelineBlock block={blockAt100} />` does NOT mount `bloom-overlay` on the first post-mount render — hydration-into-100% suppression at the component layer)

Target file: `components/TimelineBlock.test.tsx` (EXISTS — m7d appends m7d-specific assertions; the existing M4a/M5/M6/M7b tests stay green per plan § Regression surface, with the sanctioned amendment that the existing `useCrossUpEffect` direct-`playChime` assertion is replaced by the `celebrate("block", { withAudio: false })` indirection assertion in `C-m7d-005`)
Layer: Component
**GIVEN** a `<TimelineBlock>` instance rendered with a `blockAt100` fixture (a Block whose `blockScore === 100` on the first hydrated render) under motion ON (`useReducedMotion()` returns `false`)
**WHEN** the test calls `render(<TimelineBlock block={blockAt100} categoryById={…} state={…} dispatch={…} />)` and immediately reads `screen.queryByTestId("bloom-overlay")` AND `screen.queryByTestId("bloom-overlay-reduced")` (both)
**THEN** both queries return `null` — neither the spring `motion.div` overlay (`bloom-overlay`) nor the PRM opacity-flash sibling (`bloom-overlay-reduced`) is mounted on the hydration-into-100% path. After `vi.advanceTimersByTimeAsync(1000)`, both still `null`.
**AND** a mutant calling `setBloomKey(k => k + 1)` on hydration (e.g., a `useEffect` without the transition guard, OR a misuse of `useBlockCelebrationOnce` that fires on the first hydrated render with `pct === 100`) fails the assertion.
Proves: plan.md § Components — `<TimelineBlock>` (PRM bloom variant gated by `bloomKey > 0`) + spec AC #2 — covers SPEC AC #2 at the component layer.
Tag: edge.

#### C-m7d-002 — success (`<TimelineBlock>` mounts `bloom-overlay` exactly once on a 99 → 100 prop transition; `bloomKey` bumps from `0` to `1`)

Target file: `components/TimelineBlock.test.tsx`
Layer: Component
**GIVEN** a `<TimelineBlock>` instance rendered with a `blockAt99` fixture, under motion ON
**WHEN** the test calls `render(<TimelineBlock block={blockAt99} … />)` and `expect(screen.queryByTestId("bloom-overlay")).toBeNull()`, then `rerender(<TimelineBlock block={blockAt100} … />)` and `await act(async () => { await vi.advanceTimersByTimeAsync(0); })` (flush effects)
**THEN** `screen.queryByTestId("bloom-overlay")` is a real element (the spring `motion.div` mounts on the transition); a `vi.spyOn` or `useState` capture of the `bloomKey` value shows it bumped from `0` to `1` (exactly one bump — one `setBloomKey(k => k + 1)` call).
**AND** a further `rerender(<TimelineBlock block={blockAt100} … />)` (stable above threshold — no transition) does NOT bump `bloomKey` again (the overlay element is the SAME element, not a re-keyed remount); `setBloomKey` invocation count post-stable-rerender is still `1` total.
**AND** a mutant firing the effect on every render (regardless of transition) bumps `bloomKey` multiple times — fails the "exactly `1`" sub-assertion.
Proves: plan.md § Components — `<TimelineBlock>` — "When `shouldBloom === true` for the current render: (a) trigger the bloom overlay (bump `setBloomKey`); (b) call `celebrate(...)`" + spec AC #1 — covers SPEC AC #1 at the component layer. The PRIMARY canonical-bloom-fires-once anchor.
Tag: success.

#### C-m7d-003 — invariant (`<TimelineBlock>` does NOT re-mount `bloom-overlay` on a 100→99→100 cycle within the same mount — SG-m7d-02 sparing at the component layer)

Target file: `components/TimelineBlock.test.tsx`
Layer: Component
**GIVEN** a `<TimelineBlock>` instance driven through a 99→100→99→100 prop sequence within one mount, under motion ON
**WHEN** the test calls `render(<TimelineBlock block={blockAt99} … />)`, then `rerender(<TimelineBlock block={blockAt100} … />)` (first crossing — overlay mounts; `bloomKey === 1`), then `rerender(<TimelineBlock block={blockAt99} … />)` (cross-down — overlay's exit animation runs OR unmounts), then `rerender(<TimelineBlock block={blockAt100} … />)` (second crossing)
**THEN** after the second crossing, the `bloomKey` value remains at `1` (NOT `2`) — the sparing gate in `useBlockCelebrationOnce` returns `false` on the second crossing because the id is locked; therefore the `useEffect([shouldBloom])` does NOT fire and `setBloomKey` is NOT invoked a second time. A `vi.spyOn`/state capture of `setBloomKey` shows it invoked exactly once across the four renders.
**AND** the visible bloom overlay element — if it has unmounted by exit-animation completion — does NOT re-mount; if it has not yet unmounted, no new keyed element appears in the DOM.
**AND** a mutant bumping `bloomKey` on the second 100-cross fails the "exactly `1`" assertion.
Proves: plan.md § Edge cases — "100→99→100 within one mount → no second bloom" + SG-m7d-02 resolution at the component layer + spec AC #3 — covers SPEC AC #3 at the component layer.
Tag: invariant.

#### C-m7d-004 — edge (under `prefers-reduced-motion: reduce`, `<TimelineBlock>` on a 99 → 100 transition does NOT mount the spring `bloom-overlay` BUT DOES mount the opacity-flash `bloom-overlay-reduced` sibling for ~600 ms)

Target file: `components/TimelineBlock.test.tsx`
Layer: Component
**GIVEN** a `<TimelineBlock>` instance with `useReducedMotion()` mocked to return `true` (PRM path)
**WHEN** the test calls `render(<TimelineBlock block={blockAt99} … />)`, then `rerender(<TimelineBlock block={blockAt100} … />)` and flushes effects
**THEN** `screen.queryByTestId("bloom-overlay")` is `null` (the spring `motion.div` is gated by `!prefersReducedMotion && bloomKey > 0` per the existing M4a gate); `screen.queryByTestId("bloom-overlay-reduced")` is a real element with `className` containing `"bloom-reduced"`. The element's `aria-hidden="true"` attribute is present; the inline style includes `position: absolute`, `inset: 0`, `pointer-events: none`, `border-radius: 6px`, `z-index: 3`, and a `background` value matching `${category.color}33` (the accent-tinted fill — per plan § Components — `<TimelineBlock>` PRM bloom variant).
**AND** the `key` attribute on the element follows the `bloom-reduced-${bloomKey}` pattern (verified by structural inspection — e.g., asserting two consecutive 99→100 cycles produce two distinct keys when the lock is NOT in place; for the SG-m7d-02-locked variant the second cycle does not produce a new element).
**AND** a mutant rendering the spring `motion.div` even under PRM fails the first sub-assertion; a mutant omitting the `.bloom-reduced` class on the PRM sibling fails the `className` sub-assertion.
Proves: plan.md § Components — `<TimelineBlock>` PRM bloom variant + § Reduced-motion semantics — "Block bloom: spring motion.div not rendered (M4a gate); a `<div className="bloom-reduced">` is rendered keyed by `bloomKey` for 600 ms opacity flash" + spec AC #6 (block bloom PRM half) — covers SPEC AC #6 at the block-bloom PRM path.
Tag: edge.

#### C-m7d-005 — invariant (`<TimelineBlock>` on a 99 → 100 transition invokes `haptics.success()` exactly once AND does NOT invoke `playChime` — AC #7 at the component layer)

Target file: `components/TimelineBlock.test.tsx`
Layer: Component
**GIVEN** a `<TimelineBlock>` instance with `audioMock` and `hapticsMock` active (the `playChime` and `haptics.{success,notification}` functions all stubbed via `vi.fn()`)
**WHEN** the test calls `render(<TimelineBlock block={blockAt99} … />)`, then `rerender(<TimelineBlock block={blockAt100} … />)` and flushes effects
**THEN** `haptics.success` is invoked exactly once (the block-kind haptic via the new `celebrate("block", { withAudio: false })` indirection); `playChime` is invoked exactly zero times (the audio gate); `haptics.notification` is invoked exactly zero times.
**AND** the `components/TimelineBlock.tsx` source file (read via `fs.readFileSync`) does NOT contain a direct `import { playChime } from "@/lib/audio"` (the regex `/import\s+\{[^}]*playChime[^}]*\}\s+from\s+["']@\/lib\/audio["']/` returns zero matches); the file MAY contain `import { celebrate } from "@/lib/celebrations"`. A mutant restoring a direct `playChime()` call in TimelineBlock fails BOTH the count assertion AND the source-inspection regex.
**AND** the `celebrate("block", { withAudio: false })` call site is auditable on inspection — the file contains the literal substring `celebrate("block", { withAudio: false })` or an equivalent shape that makes the `false` literal visible (per plan § SG-m7d-01 resolution — "Both M7d call sites … pass the literal `false` explicitly — making the audio gate auditable on inspection").
Proves: plan.md § Components — `<TimelineBlock>` — "call `celebrate('block', { withAudio: false })`" + § SG-m7d-01 resolution + spec AC #7 — covers SPEC AC #7 at the TimelineBlock layer. The PRIMARY no-`playChime`-call anchor at the block-celebration layer.
Tag: invariant.

#### C-m7d-006 — edge (`<BuildingClient>` with `dayPct === 100` at hydration does NOT activate `<Fireworks>` on the first post-mount render — hydration-into-100%-day suppression at the component layer)

Target file: `app/(building)/BuildingClient.test.tsx` (EXISTS — m7d appends m7d-specific assertions; the existing M4a tests stay green per plan § Regression surface, with the sanctioned amendment that the existing `useCrossUpEffect` direct-`playChime` assertion is replaced by the `celebrate("day", { withAudio: false })` indirection assertion in `C-m7d-010`)
Layer: Component
**GIVEN** a `<BuildingClient>` instance rendered with `stateWithDayAt100` (a fixture forcing `dayScore(state) === 100` on the first hydrated render) under motion ON
**WHEN** the test calls `render(<BuildingClient initialState={stateWithDayAt100} … />)` and reads `screen.queryByTestId("fireworks")` after flushing effects
**THEN** the `<Fireworks>` component either is absent from the DOM OR is mounted with `active={false}` (the implementation may either conditionally render `<Fireworks>` or always render it with the `active` prop gating its particle rendering — the test asserts the OBSERVABLE outcome: zero animated particles, the `data-testid="fireworks"` overlay if present has its `active` attribute / data-attribute / prop equal to `false`). After `vi.advanceTimersByTimeAsync(3000)`, still inactive.
**AND** `screen.queryByTestId("day-complete-card")` is `null` (the card is gated on `fireworksActive && prefersReducedMotion` — both false on the hydration-into-100%-day path under motion ON).
**AND** a mutant calling `setFireworksActive(true)` on hydration (e.g., a misuse of `useDayCelebrationOnce` that fires on a 100% mount) fails.
Proves: plan.md § Edge cases — "Hydration into a 100% day" + spec AC #5 — covers SPEC AC #5 at the BuildingClient layer.
Tag: edge.

#### C-m7d-007 — success (`<BuildingClient>` activates `<Fireworks>` exactly once on a <100 → 100 transition under motion ON; `setFireworksActive(false)` fires 1700 ms later)

Target file: `app/(building)/BuildingClient.test.tsx`
Layer: Component
**GIVEN** a `<BuildingClient>` instance rendered with `stateWithDayAt99` (a fixture forcing `dayScore(state) === 99` on the first hydrated render) under motion ON
**WHEN** the test calls `render(<BuildingClient initialState={stateWithDayAt99} … />)` (assert `<Fireworks active={false}>`), then drives a state mutation that flips `dayScore` to `100` (either by dispatching a brick log action through the reducer chain, OR by rerendering with a `stateWithDayAt100` initial state through a controlled wrapper — the exact mechanism follows the existing BuildingClient test harness pattern)
**THEN** post-transition: `<Fireworks>` is active (the `active` prop / attribute reads `true`); the particle children are present (verified by counting child elements OR by asserting `screen.queryByTestId("fireworks")` is a real element with particle children). After `vi.advanceTimersByTimeAsync(1700)`, `<Fireworks>` flips back to `active={false}` (the 1700 ms motion-ON window per plan § Reduced-motion semantics table — "Window: `fireworksActive` flips to `false` after … 1700 ms when motion is ON").
**AND** a second rerender driving the day BACK to `99` and then to `100` within the same mount does NOT re-activate `<Fireworks>` — the mount-shot in `useDayCelebrationOnce` is set; `setFireworksActive` invocation count for the active=true branch stays at exactly `1` across the entire test.
**AND** a mutant using a different (e.g., `2000`) ms timer under motion ON, OR re-firing on every upward crossing, OR firing on the cross-down, fails.
Proves: plan.md § Components — `<BuildingClient>` — "trigger the existing `<Fireworks active={fireworksActive} />` overlay" + § Reduced-motion semantics — "fireworksActive flips to false after … 1700 ms when motion is ON" + spec AC #4 — covers SPEC AC #4 at the BuildingClient layer. The PRIMARY canonical-fireworks-fires-once anchor.
Tag: success.

#### C-m7d-008 — edge (under PRM, `<BuildingClient>` on a <100 → 100 transition mounts `<DayCompleteCard active={true}>` and `<Fireworks>` returns `null`; the card unmounts after exactly 2000 ms, NOT 1700 ms)

Target file: `app/(building)/BuildingClient.test.tsx`
Layer: Component
**GIVEN** a `<BuildingClient>` instance with `useReducedMotion()` mocked to return `true` (PRM path)
**WHEN** the test calls `render(<BuildingClient initialState={stateWithDayAt99} … />)`, then drives the day-level 99→100 transition via the same harness as `C-m7d-007`
**THEN** `screen.queryByTestId("fireworks")` is either `null` OR present with `active={false}` AND zero particle children (the M4a `<Fireworks>` `if (prefersReducedMotion) return null;` early-return path is preserved per plan § File structure — `components/Fireworks.tsx` UNCHANGED); `screen.queryByTestId("day-complete-card")` is a real element with text content `"Day complete."`, `role="status"`, `aria-live="polite"`, and the headline `font-family` references `var(--font-display)` (per plan § Components — `<DayCompleteCard>`).
**AND** `vi.advanceTimersByTimeAsync(1700)` keeps the card mounted (the card lifetime is 2000 ms under PRM, NOT 1700 ms — per plan § Reduced-motion semantics table); `vi.advanceTimersByTimeAsync(300)` (an additional 300 ms — total 2000 ms elapsed) unmounts the card (`screen.queryByTestId("day-complete-card")` returns to `null`).
**AND** a mutant using the motion-ON 1700 ms window under PRM fails the "still mounted at 1700 ms" sub-assertion; a mutant routing the timer to 1700 ms unconditionally (no PRM-conditional extension) fails the "unmounts at exactly 2000 ms" sub-assertion. The PRIMARY 2000-ms-PRM-window anchor.
Proves: plan.md § Reduced-motion semantics — "Window: fireworksActive flips to false after 2000 ms under PRM (vs. 1700 ms when motion is ON)" + spec AC #6 (day-fireworks PRM half) — covers SPEC AC #6 at the day-fireworks PRM path. The PRIMARY plan ratification anchor for question #4 (1700→2000 timer extension on the same boolean).
Tag: edge.

#### C-m7d-009 — invariant (under motion ON, `<BuildingClient>` does NOT mount `<DayCompleteCard active={true}>` on a <100 → 100 transition — the card is PRM-only)

Target file: `app/(building)/BuildingClient.test.tsx`
Layer: Component
**GIVEN** a `<BuildingClient>` instance with `useReducedMotion()` mocked to return `false` (motion ON)
**WHEN** the test drives the day-level 99→100 transition via the same harness as `C-m7d-007`
**THEN** `screen.queryByTestId("fireworks")` is a real active overlay (the motion-ON fireworks path fires); `screen.queryByTestId("day-complete-card")` is `null` for the ENTIRE 2000 ms window post-transition (verified by sampling at 100, 500, 1000, 1500, and 1999 ms — all return `null`). The card's `active` prop is gated on `fireworksActive && prefersReducedMotion`; under motion ON, `prefersReducedMotion === false`, so the card receives `active={false}` and returns `null` per its prop contract.
**AND** a mutant rendering the card on every fireworks fire (regardless of PRM — e.g., a misuse where the card's gating predicate omits the `&& prefersReducedMotion` clause) fails the "never mounted under motion ON" assertion.
Proves: plan.md § Components — `<DayCompleteCard>` — "Card renders for 2000 ms under PRM (vs. zero render on the motion-ON path)" + § Components — `<BuildingClient>` — "render `<DayCompleteCard active={fireworksActive && prefersReducedMotion} />` as a sibling of `<Fireworks active={fireworksActive} />`" — covers the PRIMARY card-PRM-only contract.
Tag: invariant.

#### C-m7d-010 — invariant (`<BuildingClient>` on a <100 → 100 transition invokes `haptics.notification()` exactly once AND does NOT invoke `playChime` — AC #7 at the BuildingClient layer)

Target file: `app/(building)/BuildingClient.test.tsx`
Layer: Component
**GIVEN** a `<BuildingClient>` instance with `audioMock` and `hapticsMock` active
**WHEN** the test drives the day-level 99→100 transition via the same harness as `C-m7d-007`
**THEN** `haptics.notification` is invoked exactly once (the day-kind haptic via the new `celebrate("day", { withAudio: false })` indirection); `playChime` is invoked exactly zero times; `haptics.success` is invoked exactly zero times AT THE BuildingClient code path (TimelineBlock's `haptics.success` calls are gated by the test harness's fixture choice — typically the test renders BuildingClient with a fixture whose blocks are NOT transitioning, OR the test inspects only the per-call increment attributable to the day-level transition; if both layers fire on the same render, the assertion is for `haptics.notification` to increment by exactly 1 attributable to the day-level transition).
**AND** the `app/(building)/BuildingClient.tsx` source file (read via `fs.readFileSync`) does NOT contain a direct `import { playChime } from "@/lib/audio"` (regex `/import\s+\{[^}]*playChime[^}]*\}\s+from\s+["']@\/lib\/audio["']/` returns zero matches); the file contains `import { celebrate, useDayCelebrationOnce } from "@/lib/celebrations"` (or equivalent shape). A mutant restoring a direct `playChime()` call in BuildingClient fails BOTH the count assertion AND the source-inspection regex.
**AND** the `celebrate("day", { withAudio: false })` call site is auditable on inspection — the file contains the literal substring `celebrate("day", { withAudio: false })`.
Proves: plan.md § Components — `<BuildingClient>` — "call `celebrate('day', { withAudio: false })`" + § SG-m7d-01 resolution + spec AC #7 — covers SPEC AC #7 at the BuildingClient layer. The PRIMARY no-`playChime`-call anchor at the day-celebration layer.
Tag: invariant.

#### C-m7d-011 — success (`<DayCompleteCard active={true} />` renders the "Day complete." text with `role="status"` + `aria-live="polite"` + serif headline + `pointer-events: none` + `z-index: 50`)

Target file: `components/DayCompleteCard.test.tsx` (NEW — created by m7d per plan § File structure)
Layer: Component
**GIVEN** the new `<DayCompleteCard>` component
**WHEN** the test calls `render(<DayCompleteCard active={true} />)` and queries the DOM
**THEN** `screen.queryByTestId("day-complete-card")` is a real element with: text content containing `"Day complete."`; attribute `role="status"`; attribute `aria-live="polite"`; an inline style containing `pointer-events: none`; an inline style containing `z-index: 50` (matching the Fireworks z-layer per plan § Components — `<DayCompleteCard>`); a child element with a `font-family` style referencing `var(--font-display)` (the Instrument Serif headline) AND a `font-size` referencing `var(--fs-24)`.
**AND** the rendered card passes a structural-only axe assertion (the polite live-region + decorative non-interactive surface should have zero violations — gated by the deferred-to-preview `A-m7d-003`; the unit test here asserts the attributes are present, not that axe-the-tool runs successfully — the axe runner is preview-only).
**AND** a mutant omitting `role="status"` OR `aria-live="polite"` fails the AT-announcement-contract; a mutant using `aria-live="assertive"` (which interrupts other speech) fails the polite-announcement sub-assertion; a mutant omitting `pointer-events: none` fails the decorative-surface contract.
Proves: plan.md § Components — `<DayCompleteCard>` — "`role='status'` + `aria-live='polite'` so AT users get a single polite announcement" + spec § Edge cases — "a static 'Day complete.' text card center-screen for 2 s, then fades" + spec AC #6 (day-fireworks PRM half — the static text card) — covers SPEC AC #6 at the DayCompleteCard standalone layer.
Tag: success.

#### C-m7d-012 — invariant (`<DayCompleteCard active={false} />` renders `null` — no DOM nodes)

Target file: `components/DayCompleteCard.test.tsx`
Layer: Component
**GIVEN** the `<DayCompleteCard>` component with `active={false}` (the default-off state)
**WHEN** the test calls `const { container } = render(<DayCompleteCard active={false} />)`
**THEN** `screen.queryByTestId("day-complete-card")` returns `null`; `container.firstChild` is `null` (the component renders zero DOM nodes — it returns `null`, not a wrapper with `display: none`).
**AND** a mutant rendering the card with `visibility: hidden` or `display: none` (instead of returning `null`) leaves a DOM node — fails the `container.firstChild === null` assertion.
Proves: plan.md § Components — `<DayCompleteCard>` — "Renders: `null` when `active === false`; a fixed center-screen card when `active === true`" + § Components — "Lifetime: controlled entirely by the parent" — covers the gating contract.
Tag: invariant.

#### C-m7d-013 — invariant (no celebration replays on past-day reads via `<PastDayDetail>` / `<MonthView>` / `<WeekView>` / `<YearView>` — by source-file inspection)

Target file: `lib/celebrations.test.ts` (the same file as the unit tests; the source-inspection assertion lives at the celebrations module's test boundary for organizational clarity — alternative location `lib/m7d-source-regression.test.ts` if VERIFIER prefers a separate file)
Layer: Component (logically component-level; technically a `fs.readFileSync` source-inspection at the test-boundary layer)
**GIVEN** the production source files `components/PastDayDetail.tsx`, `components/MonthView.tsx`, `components/WeekView.tsx`, `components/YearView.tsx`
**WHEN** the test reads each file via `fs.readFileSync` and applies the regex `/from\s+["']@\/lib\/celebrations["']/`
**THEN** the union of import lines from `lib/celebrations` across all four files MUST NOT include `useBlockCelebrationOnce`, `useDayCelebrationOnce`, OR `celebrate` (the three NEW M7d symbols). The existing `useCrossUpEffect` import may or may not appear in these files (no current file imports it; M7d does not add such an import). The regex match list is asserted exactly: `expect(matches).toEqual([])` OR `expect(matches.every(line => !line.includes("useBlockCelebrationOnce") && !line.includes("useDayCelebrationOnce") && !line.includes("celebrate"))).toBe(true)`.
**AND** a mutant wiring `useDayCelebrationOnce` into `<PastDayDetail>` (a misplaced "past 100% day re-celebrates on view switch" implementation) fails this assertion. The PRIMARY past-day-no-replay contract.
Proves: plan.md § Edge cases — "Past-day reads (Castle / Kingdom / Empire / `<PastDayDetail>`)" — "These views do NOT mount `<BuildingClient>`; the bloom + fireworks celebrations are Day-view-only" + spec § "What this is NOT" — "history-archived 100% days were celebrated when they happened" — covers the past-day no-replay invariant.
Tag: invariant.

#### C-m7d-014 — regression (`useCrossUpEffect` is still exported unchanged from `lib/celebrations.ts` — U-m3-012 backwards compatibility)

Target file: `lib/celebrations.test.ts`
Layer: Component (logically a unit-level export-shape assertion; placed in the component-section because it gates the broader regression surface of the celebrations module)
**GIVEN** the `lib/celebrations.ts` module
**WHEN** the test imports `import * as celebrations from "@/lib/celebrations"` and inspects the exported surface
**THEN** `typeof celebrations.useCrossUpEffect === "function"` (the symbol is still exported); the existing U-m3-012 truth-table assertion (the one-shot upward-crossing contract — `renderHook` drives `value` from below threshold to above, asserts the callback fires exactly once; drives a second below-to-above cycle, asserts the callback fires AGAIN — this is the original M3 `useCrossUpEffect` "once per crossing" contract, distinct from M7d's tighter "once per mount" contract on the NEW hooks) passes byte-identical.
**AND** the M7d-new exports are also present: `typeof celebrations.useBlockCelebrationOnce === "function"`; `typeof celebrations.useDayCelebrationOnce === "function"`; `typeof celebrations.celebrate === "function"`. A mutant deleting or renaming `useCrossUpEffect` (e.g., replacing it with `useBlockCelebrationOnce`) fails the export assertion AND breaks any external test importer relying on the symbol.
Proves: plan.md § File structure — "`useCrossUpEffect` is **kept** and exported unchanged for backwards compatibility (existing M4a tests + every external test importer rely on the symbol)" + § Regression surface — "the existing U-m3-012 `useCrossUpEffect` assertion stays green byte-identical" — covers the backwards-compat invariant.
Tag: regression.

#### C-m7d-015 — invariant (no new asset is added under `public/`; `components/Fireworks.tsx` is UNCHANGED by M7d — SG-m7d-03 resolution)

Target file: `components/Fireworks.test.tsx` (EXISTS — m7d appends the file-unchanged assertion; alternative location `lib/m7d-source-regression.test.ts` if VERIFIER prefers)
Layer: Component (logically a source-inspection regression assertion at the Fireworks file boundary)
**GIVEN** the production `components/Fireworks.tsx` file AND the `public/` directory tree
**WHEN** the test reads `components/Fireworks.tsx` via `fs.readFileSync` and inspects three known M4a invariants — the `PARTICLE_COUNT` constant value (M4a-known integer), the `COLORS` array length (M4a-known), and the internal `1700` ms `setTimeout` constant — AND reads the `public/sounds/` and `public/` directory listings via `fs.readdirSync` (or equivalent)
**THEN** the three Fireworks-file invariants match the M4a-known values byte-identical (the test imports `PARTICLE_COUNT` and `COLORS` if exported, or inspects the file body for the known substring `setTimeout(setActive, 1700)` or equivalent); `public/sounds/chime.mp3` exists with a file size of 431 bytes (the M4a placeholder per SG-m4f-05 — UNCHANGED by M7d); `public/` does NOT contain any new SVG, image, font, or audio file attributable to M7d (the listing matches the M7c-known set plus zero net additions — verified by either snapshot or by an explicit allow-list of pre-M7d files).
**AND** a mutant adding a Lottie file, a new SVG, a new audio asset, or any other file under `public/` fails the directory-inspection assertion; a mutant modifying `components/Fireworks.tsx` (e.g., changing `PARTICLE_COUNT` or the 1700 ms timer) fails the file-invariant assertion.
Proves: plan.md § File structure — `components/Fireworks.tsx` UNCHANGED + § Dependencies — "Zero new image, font, SVG, audio, or third-party dependency (SG-m7d-03 explicitly forbids a Lottie file or a new SVG library — the particle burst overlay from M4a is reused as-is)" + § SG-m7d-03 resolution — "VERIFIER: confirm `components/Fireworks.tsx` is unchanged in the M7d diff … and that no new asset is added under `public/`" — covers SG-m7d-03 resolution.
Tag: invariant.

### E2E (Playwright, deferred-to-preview)

`E-m7d-001..006` exercise the live celebration on the Vercel preview — driving the last brick of a block from off to on AND completing the day, verifying the bloom + fireworks overlays appear and fade within their token windows, the static "Day complete." card under simulated PRM, Lighthouse Performance ≥ 90, no console errors on either celebration path, and the no-double-fire on hydrating directly into a 100% day. These run against the deployed-build production bundle on the preview URL (the sandbox cannot run `page.emulateMedia({ reducedMotion: "reduce" })` against a real Chromium frame-rate / fps-trace rig, a real Lighthouse audit, or a real production-build console-error monitor reliably).

#### E-m7d-001 — success (preview — toggling the last brick of a block to ON causes the `bloom-overlay` to appear in DOM and fade within ~1 s)

Target file: `e2e/m7d.spec.ts`
Layer: E2E (Playwright, deferred-to-preview)
**GIVEN** the preview URL loaded with a deterministic fixture state where a single block is at 75% (3 of 4 bricks ticked) and the day is at 60%
**WHEN** the test taps the fourth (final) brick of that block, taking the block from 75 → 100%
**THEN** within 100 ms of the tap, `page.locator('[data-testid="bloom-overlay"]').first()` is visible (the spring `motion.div` mounts); within ~1 s (the spring's exit window per `bloomVariants.exit` + `springConfigs.bloom`), the overlay is no longer present in the DOM (either unmounted or `opacity: 0`).
**AND** no other block on the page renders a `bloom-overlay` (the spy verifies exactly one bloom per tap).
**AND** zero console errors are logged in the browser during the bloom (`page.on("console", …)` collects error-level entries; final assertion is `expect(errors).toHaveLength(0)`).
Proves: spec AC #1 (block bloom on transition) + AC #9 (no console error on celebration paths) — covers SPEC AC #1 + AC #9 at the E2E layer.
Tag: success.

#### E-m7d-002 — success (preview — completing the day causes the `fireworks` overlay to appear and fade within ~2 s)

Target file: `e2e/m7d.spec.ts`
Layer: E2E (Playwright, deferred-to-preview)
**GIVEN** the preview URL loaded with a deterministic fixture state where the day is at 99% (one block at 99% with all other blocks at 100%, or an equivalent equal-weight arithmetic)
**WHEN** the test taps the final brick that brings the day to 100%
**THEN** within 100 ms of the tap, `page.locator('[data-testid="fireworks"]').first()` is visible AND has particle children (the M4a `<motion.div>` particle overlay); within ~2 s (the 1700 ms motion-ON timer + ~300 ms paint settle), the overlay is no longer animating (the `active` state has flipped to `false`; particles have exited).
**AND** a Chromium frame-rate trace over the 2 s window shows the fireworks particles render at ≥ 55 fps (AC #9 — verified via `page.evaluate(() => performance.now())`-based sampling or via Playwright's tracing API at the 16.7 ms cadence).
**AND** zero console errors are logged during the fireworks.
Proves: spec AC #4 (day-fireworks on transition) + AC #9 (fireworks ≥ 55 fps over 2 s trace; no console error) — covers SPEC AC #4 + AC #9 at the E2E layer.
Tag: success.

#### E-m7d-003 — edge (preview — under simulated PRM, the static "Day complete." card appears center-screen, holds for 2 s, then unmounts; `<Fireworks>` does NOT render)

Target file: `e2e/m7d.spec.ts`
Layer: E2E (Playwright, deferred-to-preview)
**GIVEN** the preview URL loaded with `page.emulateMedia({ reducedMotion: "reduce" })` AND a deterministic fixture state with the day at 99%
**WHEN** the test taps the final brick bringing the day to 100%
**THEN** within 100 ms of the tap, `page.locator('[data-testid="day-complete-card"]')` is visible with text `"Day complete."` AND `role="status"` AND `aria-live="polite"`; `page.locator('[data-testid="fireworks"]')` is NOT visible (the `<Fireworks>` returns `null` under PRM — M4a behavior preserved); the card is centered (its bounding box's `x + width/2` is within ±5 px of `viewport.width / 2`, and similarly for `y`).
**AND** at `t = 1700 ms` post-transition, the card is STILL visible (the PRM-extended timer is 2000 ms, NOT 1700 ms); at `t = 2000 ms` post-transition (+/- 100 ms tolerance for browser scheduling), the card is no longer in the DOM.
**AND** zero console errors are logged.
Proves: spec AC #6 (PRM day-fireworks collapse — "Day complete." text card) + plan § Reduced-motion semantics 2000 ms window — covers SPEC AC #6 at the E2E layer + the PRIMARY 2000-ms-PRM-window contract under real-browser conditions.
Tag: edge.

#### E-m7d-004 — success (preview — Lighthouse Performance ≥ 90 on the Day view with a celebration firing on the last-brick tap)

Target file: `e2e/m7d.spec.ts`
Layer: E2E (Playwright, deferred-to-preview)
**GIVEN** the preview URL loaded with a deterministic fixture state where the day is at 99% (one tap away from 100%)
**WHEN** the test runs a Lighthouse audit (via the Playwright Lighthouse plugin OR by triggering Lighthouse directly against the preview URL) covering the moment of the last-brick tap + the bloom + the fireworks
**THEN** the Lighthouse Performance score is ≥ 90 (AC #9). The Accessibility score remains 100 (the new `<DayCompleteCard>` polite live-region does not introduce any new a11y violations — corroborated by `A-m7d-001..003`).
**AND** the Largest Contentful Paint (LCP), Cumulative Layout Shift (CLS), and Total Blocking Time (TBT) all remain within the M7c-established budget (the celebration overlays do not regress the Day view's perf baseline).
Proves: spec AC #9 (Lighthouse Perf ≥ 90) — covers SPEC AC #9 at the Lighthouse layer.
Tag: success.

#### E-m7d-005 — edge (preview — hydrating directly into a 100% day fires NEITHER overlay)

Target file: `e2e/m7d.spec.ts`
Layer: E2E (Playwright, deferred-to-preview)
**GIVEN** the preview URL loaded with a deterministic fixture state ALREADY at `dayPct === 100` on the first hydrated render (e.g., a seed state via URL search params or localStorage prime)
**WHEN** the test loads the page and waits for hydration
**THEN** at NO point during the first 3 s post-hydration does `page.locator('[data-testid="fireworks"]').first()` become active; at NO point does `page.locator('[data-testid="bloom-overlay"]').first()` mount; at NO point does `page.locator('[data-testid="day-complete-card"]')` mount (under both motion ON and PRM emulation).
**AND** the hero numeral count-up (M7c) runs from 0 → 100 over 1.6 s smoothly (M7c-specified — M7d does NOT trigger M7c, and M7c's count-up does NOT trigger M7d's fireworks — anchors plan § Out of scope — "Coupling to M7c's count-up").
Proves: spec AC #2 (block hydration no-bloom) + AC #5 (day hydration no-fireworks) + plan § Edge cases — "Hydration into a 100% day" — covers SPEC AC #2 + AC #5 at the E2E layer (the real-browser PRIMARY hydration-no-replay anchor).
Tag: edge.

#### E-m7d-006 — invariant (preview — re-mounting the Day view via the ViewSwitcher with an already-100% day fires NEITHER overlay on the second mount; on a 99→100 transition AFTER the re-mount, the celebration fires normally)

Target file: `e2e/m7d.spec.ts`
Layer: E2E (Playwright, deferred-to-preview)
**GIVEN** the preview URL loaded with a deterministic fixture state where the day is at 100% AND the ViewSwitcher is available
**WHEN** the test (a) confirms zero celebrations fire on the initial hydration (per `E-m7d-005`); (b) taps the ViewSwitcher → Week → Day (a Day-view remount); (c) confirms zero celebrations fire on the second hydration (the remount with `dayPct === 100` is also a hydration-into-100% path — locked from the first ref-machine render); (d) (optional) dispatches a state mutation bringing the day from 100 down to 99 (via the e2e mutation harness — typically by un-ticking a brick), THEN BACK up to 100; the second 99→100 transition fires the celebration normally (a fresh mount means a fresh ref machine — the mount-shot is reset)
**THEN** parts (a), (b), (c) confirm no double-fire on remount + no replay on hydration-into-100%; part (d) confirms a real cross-up AFTER the remount fires the celebration normally (the ref machine is mount-scoped, not session-scoped).
**AND** part (d) is optional because the live preview's mutation harness may not support direct brick un-tick from the e2e layer — if so, this ID covers only (a)+(b)+(c) and the within-mount sparing is covered by `C-m7d-003` / `U-m7d-003`. VERIFIER picks.
Proves: plan § Edge cases — "Day → Week → Day view switch (remount)" + spec § "What this is NOT" — covers the remount-reset E2E contract.
Tag: invariant.

### Accessibility (axe via Playwright)

`A-m7d-001..003` exercise the accessibility of the celebration overlays under real-browser conditions on the Vercel preview — axe-clean during + after the bloom + fireworks under motion ON; axe-clean while the `<DayCompleteCard>` is mounted under PRM; the polite live-region announces "Day complete." exactly once per fire-cycle.

#### A-m7d-001 — success (preview — page with `bloom-overlay` visible is axe-clean; page with `fireworks` visible is axe-clean — under motion ON)

Target file: `e2e/m7d.spec.ts` (or `e2e/m7d.a11y.spec.ts` if VERIFIER prefers separation)
Layer: Accessibility (axe via Playwright, deferred-to-preview)
**GIVEN** the preview URL with a fixture state at day = 99% under motion ON, and `@axe-core/playwright` injected
**WHEN** the test taps the final brick bringing the day to 100%, captures the DOM at three sample points (during the bloom; during the fireworks; after both have completed), and runs `await axe.analyze()` at each sample
**THEN** the violations array is empty at each sample (zero a11y violations attributable to the new bloom + fireworks overlays — the `aria-hidden="true"` attribute on both overlays + the `pointer-events: none` style ensures they do not pollute the AT tree or focus order).
**AND** the existing Day-view axe-clean baseline (M0/M5/M6/M7a/M7b/M7c) is preserved (no NEW violations introduced by M7d).
Proves: spec AC #6 + plan § Accessibility — "axe: zero violations expected" — covers the axe-clean contract at the celebration layer.
Tag: success.

#### A-m7d-002 — success (preview — page with `<DayCompleteCard active={true}>` visible under PRM is axe-clean; the polite live-region announces "Day complete." exactly once per fire-cycle)

Target file: `e2e/m7d.spec.ts` (or `e2e/m7d.a11y.spec.ts`)
Layer: Accessibility (axe via Playwright, deferred-to-preview)
**GIVEN** the preview URL with PRM emulation (`page.emulateMedia({ reducedMotion: "reduce" })`) and a fixture state at day = 99%
**WHEN** the test taps the final brick bringing the day to 100%, captures the DOM while `<DayCompleteCard active={true}>` is mounted, and runs `await axe.analyze()`
**THEN** the violations array is empty (zero a11y violations on the polite live-region card); the card's `role="status"` + `aria-live="polite"` combination is correctly recognized by axe (axe does NOT flag the live-region as missing a `role` or as having an inaccessible name — the card's text content "Day complete." serves as the accessible name).
**AND** the polite live-region announces "Day complete." exactly once per fire-cycle (verified via a `page.evaluate` snapshot of the live-region's accessibility-tree-name at the moment of activation, OR via a manual inspection of the AT announcement count using Playwright's accessibility snapshot API).
**AND** the announcement does NOT repeat at `t = 500 ms`, `t = 1000 ms`, `t = 1500 ms`, `t = 1900 ms` (the live-region's content is set ONCE on mount, not re-set on every render — preventing AT double-announcement).
Proves: spec AC #6 (PRM card with polite announcement) + plan § Accessibility — "AT users hear 'Day complete.' announced once when `active` flips false → true. Polite live-region — does not interrupt other speech" — covers the PRIMARY polite-announcement-once-per-fire-cycle contract.
Tag: success.

#### A-m7d-003 — invariant (preview — `var(--ink)` on `var(--card)` contrast in `<DayCompleteCard>` meets WCAG AA; bloom overlays are non-text decorative and exceed the WCAG AA 3:1 non-text contrast)

Target file: `e2e/m7d.spec.ts` (or `e2e/m7d.a11y.spec.ts`)
Layer: Accessibility (axe via Playwright, deferred-to-preview)
**GIVEN** the preview URL with `<DayCompleteCard active={true}>` mounted under PRM, and `@axe-core/playwright` configured with the `color-contrast` rule enabled
**WHEN** the test runs `await axe.analyze({ rules: { "color-contrast": { enabled: true } } })` on the page with the card mounted
**THEN** the violations array is empty under the `color-contrast` rule — the `var(--ink)` text on `var(--card)` background is the M0 standard body-text pair (already WCAG AA per plan § Accessibility — "`--ink` on `--card` is the standard M0 body-text token pair — already WCAG AA. No new contrast work").
**AND** under motion ON, the bloom overlay's accent-tinted fill (`${category.color}33` — 0x33 = ~20 % alpha over the block card background) is non-text decorative and is asserted (manually if axe does not cover non-text 3:1; alternatively by a `getComputedStyle` + `tinycolor` parse) to exceed the WCAG AA 3:1 non-text contrast threshold — corroborates plan § Accessibility — "Bloom overlays are non-text, decorative; non-text contrast (AA 3:1) comfortably exceeded".
Proves: plan § Accessibility — "Contrast: `var(--ink)` on `var(--card)` in DayCompleteCard — already WCAG AA" — covers the contrast invariant.
Tag: invariant.

### Preview deferral note

Six E2E IDs and all three A11y IDs are explicitly **deferred to the Vercel preview run**: `E-m7d-001..006` require either a real Chromium frame-rate trace (`E-m7d-002`), real `page.emulateMedia` PRM emulation (`E-m7d-003`, `E-m7d-006`), a real Lighthouse audit (`E-m7d-004`), real production-build console-error monitoring (`E-m7d-001`, `E-m7d-002`, `E-m7d-003`), or all of the above against a deployed-build production bundle. `A-m7d-001..003` require axe scans against a deployed build (the sandbox's local dev server has the `devIndicators: false` setting per ADR-029, but axe runs more reliably against the production-build output served by Vercel). The 29 Vitest IDs (`U-m7d-001..014` + `C-m7d-001..015`) run in the sandbox under `npm test` and `npm run test:tz`. Authoring all nine preview-deferred IDs as real `test()` blocks is mandatory (M5b / M9c / M7a / M7b / M7c precedent — preview-deferred ≠ untested).

### Regression surface

The following EXISTING test files are amended additively by m7d — every amendment is sanctioned-for-amendment per plan § Regression surface and surfaces NO existing test rewrite:

- **`lib/celebrations.test.ts`** (~30 LOC today) — the existing U-m3-012 `useCrossUpEffect` assertion stays green byte-identical (M7d keeps `useCrossUpEffect` exported unchanged for backwards compatibility). NEW M7d tests are appended (`U-m7d-001..014` + `C-m7d-013`, `C-m7d-014`).
- **`components/TimelineBlock.test.tsx`** — existing M4a tests that asserted the `useCrossUpEffect` callback fires `playChime()` directly are amended (per plan § Regression surface — sanctioned-for-amendment) to assert the indirection through `celebrate("block", { withAudio: false })` → `haptics.success()` + no-`playChime`. The diff is small (a couple of test assertions); the rendered DOM (`bloom-overlay` testid + class) is byte-identical to M4a. M7d adds `C-m7d-001..005`. VERIFIER ratifies the amendment as M7d-sanctioned.
- **`app/(building)/BuildingClient.test.tsx`** — same shape: existing M4a tests asserted `useCrossUpEffect(heroPct, 100, fireDayComplete)` directly invoking `playChime()` and `setFireworksActive(true)`; amended to assert `useDayCelebrationOnce(heroPct)` → `celebrate("day", { withAudio: false })` → `haptics.notification()` + `setFireworksActive(true)` + no-`playChime`. The rendered DOM (`fireworks` testid + 1700 ms timer) is byte-identical to M4a (under motion ON); under PRM, the new `<DayCompleteCard>` is asserted to render (`C-m7d-008`). M7d adds `C-m7d-006..010`.
- **`components/DayCompleteCard.test.tsx`** — NEW file (created by m7d per plan § File structure). Hosts `C-m7d-011`, `C-m7d-012`.
- **`components/Fireworks.test.tsx`** (if it exists) — UNCHANGED. M7d adds `C-m7d-015` to assert the file is byte-identical to M4a (the SG-m7d-03 resolution — Fireworks is reused as-is). VERIFIER may relocate this assertion to `lib/m7d-source-regression.test.ts` if preferred.
- **`lib/audio.test.ts`** (if it exists) — UNCHANGED. `playChime` is still exported and the M7f follow-up will exercise the `withAudio: true` path that M7d's `U-m7d-014` already smoke-tests.
- **No M3 / M4 / M5 / M6 / M7a / M7b / M7c test** asserts the absence of the new hooks, the absence of `celebrate(…)`, the absence of `<DayCompleteCard>`, the absence of the `bloom-overlay-reduced` testid, or the absence of the `@keyframes blockBloomReduced` keyframe. Additive everywhere.

VERIFIER: please ratify the **two-hook split (`useBlockCelebrationOnce` + `useDayCelebrationOnce`) + `useEffect` consume pattern + sibling-div PRM bloom variant + 1700→2000 ms timer extension on the same `fireworksActive` boolean** as the four expected, sanctioned M7d mechanism choices — exactly as M7c's joint-state-`displayPct` + children-as-function + imperative-`animate` + cubic-bezier easing were ratified. The plan's § Open questions for VERIFIER surfaces all four as non-blocking ratification questions; the tests (`U-m7d-001..010` for hook split, `C-m7d-002..010` for effect consume, `C-m7d-004` for sibling-div PRM, `C-m7d-008` for 2000-ms-timer extension) are written against the plan baseline. If VERIFIER prefers an alternative on any of the four, the tests amend trivially per the alternative's contract; the AC assertions are identical either way. **No ADR-binding decision; VERIFIER picks freely.**

### AC ↔ test-ID mapping (every AC has at least one test ID; every test ID maps to at least one AC)

| AC  | Acceptance criterion                                                                                                                                                      | Test IDs                                                                                                                                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #1  | When a brick log transitions a block from `<100` to exactly `100`, the block card runs the M0 `bloom` spring on its accent ring/outline exactly once                      | `U-m7d-001` (hook fires once), `C-m7d-002` (overlay mounts once; bloomKey bumps from 0 to 1), `E-m7d-001` (preview — overlay visible + fades)                                                                                                           |
| #2  | A block that was at 100% at hydration does not bloom on mount                                                                                                             | `U-m7d-002` (hook locks id without firing), `C-m7d-001` (overlay does not mount on hydration-into-100%), `E-m7d-005` (preview — hydrating into 100% day fires no overlay)                                                                               |
| #3  | A block that drops from 100% does not re-bloom on the next 100% crossing within the same mount (once per block per mount — SG-m7d-02)                                     | `U-m7d-003` (PRIMARY sparing — 99→100→99→100 fires exactly once), `U-m7d-006` (deeper-drop variant — 99→100→99→80→100 fires exactly once), `C-m7d-003` (overlay does not re-mount on 100→99→100), `U-m7d-005` (remount resets the Set)                  |
| #4  | When `dayScore(state)` transitions from `<100` to exactly `100`, the fireworks overlay fires once per mount, consuming `motionTokens.fireworks` unchanged                 | `U-m7d-007` (hook fires once), `U-m7d-009` (sparing — 99→100→99→100 fires exactly once), `C-m7d-007` (fireworks activates once + 1700 ms timer + sparing), `E-m7d-002` (preview — fireworks visible + ≥ 55 fps), `C-m7d-015` (Fireworks.tsx unchanged)  |
| #5  | A day that was at 100% at hydration does not fire fireworks on mount                                                                                                      | `U-m7d-008` (hook locks mount-shot without firing), `C-m7d-006` (fireworks does not activate on hydration-into-100%-day), `E-m7d-005` (preview — hydrating into 100% day fires no overlay), `U-m7d-010` (remount resets the boolean)                    |
| #6  | With `prefers-reduced-motion: reduce`, the block bloom collapses to a 600 ms opacity flash; the day fireworks collapse to a "Day complete." text card                     | `C-m7d-004` (block bloom PRM — `bloom-overlay-reduced` mounts), `C-m7d-008` (day-fireworks PRM — `<DayCompleteCard>` mounts + 2000 ms timer), `C-m7d-009` (motion-ON does NOT mount card), `C-m7d-011` (card a11y attributes), `E-m7d-003` (preview)    |
| #7  | `celebrate(kind, { withAudio: false })` is the M7d default. No call to `lib/audio.ts`'s play API fires from M7d's celebration path                                        | `U-m7d-011` (block-haptic + no playChime), `U-m7d-012` (day-haptic + no playChime), `U-m7d-013` (default-false invariant), `U-m7d-014` (forward-compat — withAudio:true DOES call playChime), `C-m7d-005` (TimelineBlock), `C-m7d-010` (BuildingClient) |
| #8  | `tsc --noEmit` clean; ESLint 0 errors (≤13 warnings); full Vitest suite green; `test:tz` green. Vitest covers all transition predicates above and the audio-off invariant | `U-m7d-001..014` + `C-m7d-001..015` + **gate (`npm run eval`)**                                                                                                                                                                                         |
| #9  | E2E (Playwright, deferred-to-preview): Lighthouse Performance ≥ 90; fireworks render at ≥ 55 fps over a 2 s trace; no console error on celebration paths                  | `E-m7d-001..006`, `A-m7d-001..003`                                                                                                                                                                                                                      |
| #10 | No regression to M1–M9e / M5b / M7a / M7b / M7c behavior                                                                                                                  | `C-m7d-014` (`useCrossUpEffect` backwards-compat), `C-m7d-013` (no celebration replays on past-day reads), `C-m7d-015` (Fireworks unchanged) + § Regression surface amendments + **gate (`npm run eval`)**                                              |

**Gate-verified portion:** AC #8's quality-gate half (`tsc` / ESLint / full-Vitest / `test:tz`) — consistent with the M5/M6/M8/M9a–M9e/M7a/M7b/M7c precedent. AC #10's no-regression half is anchored by the sanctioned amendments in § Regression surface (all six surfaces are byte-identical at the existing-test level: `lib/celebrations.test.ts` retains U-m3-012; `components/TimelineBlock.test.tsx` and `app/(building)/BuildingClient.test.tsx` swap the direct-`playChime` assertion for the `celebrate(...)` indirection — sanctioned-for-amendment; `components/DayCompleteCard.test.tsx` is a new file; `components/Fireworks.test.tsx` and `lib/audio.test.ts` are unchanged) plus `C-m7d-013` / `C-m7d-014` / `C-m7d-015` (each asserts a byte-identical past-day or backwards-compat or asset-immutability branch). All other 8 ACs map to at least one bespoke `m7d` test ID; every `m7d` test ID maps back to at least one AC.

**Edge-case coverage (plan.md § Edge cases table + spec § Edge cases):** Hydration into a state where a block is already 100% → `U-m7d-002`, `C-m7d-001`, `E-m7d-005`; Hydration into a 100% day → `U-m7d-008`, `C-m7d-006`, `E-m7d-005`; Block A 99→100 AND Block B 100→99 simultaneously (forward half — A blooms, B does not) → `U-m7d-004` (two-id gate independence; the B-does-not-bloom half is structurally inherited from `useBlockCelebrationOnce("B", 99)` returning `false` on the cross-down — explicit in the plan's edge case table, no separate ID needed because it's the same hook-return-`false` path as `U-m7d-002`'s cross-down branch); Undo a tick dropping a block 100→99 → structurally inherited from `U-m7d-002`'s cross-down branch (the bloom is one-way); 100→99→100 within one mount → `U-m7d-003` (PRIMARY) + `C-m7d-003`; `appliesOn`-suppressed blocks → structurally inherited from `<Timeline>` rendering `visibleBlocks` (M5b precedent — the test fixture omits suppressed blocks from the `currentDayBlocks(state)` output, so the hook is never called for them); Past-day reads (no celebration replays) → `C-m7d-013` (PRIMARY no-replay source-inspection); PRM bloom 600 ms opacity flash via `bloom-overlay-reduced` → `C-m7d-004`; PRM fireworks `<DayCompleteCard>` with `role="status" aria-live="polite"` + 2000 ms timer → `C-m7d-008`, `C-m7d-011`, `E-m7d-003`, `A-m7d-002`; Day → Week → Day remount → `U-m7d-005` (block hook), `U-m7d-010` (day hook), `E-m7d-006` (preview); Block at 99% hydrates → drops to 80% intermediate → re-crosses to 100 → `U-m7d-006`; Lighthouse Performance → `E-m7d-004`; ≥ 55 fps over 2 s fireworks trace → `E-m7d-002`; Audio-off invariant (`playChime` zero calls across all M7d paths) → `U-m7d-011..013` (shim) + `C-m7d-005` (TimelineBlock) + `C-m7d-010` (BuildingClient); Forward-compat (`withAudio: true` does call `playChime`) → `U-m7d-014`; SG-m7d-03 resolution (no new asset, Fireworks unchanged) → `C-m7d-015`; backwards compat (`useCrossUpEffect` still exported) → `C-m7d-014`; M7c hand-off (count-up at 100% does NOT trigger M7d fireworks) → `U-m7d-008` + `E-m7d-005`. Edge cases not separately covered are documented as structurally inherited — VERIFIER may ask for additional IDs if any inherit case warrants its own GIVEN/WHEN/THEN.

### Spec gaps

None. All three Open Spec Gaps (SG-m7d-01 audio asset → resolved by audio-OFF + `withAudio: false` literal at every call site; SG-m7d-02 block re-bloom semantics → resolved by `Set<string>` mount-scoped once-per-block-per-mount via `useBlockCelebrationOnce`; SG-m7d-03 fireworks visual → resolved by reusing M4a's `<Fireworks>` particle overlay unchanged) are resolved in-plan exactly per the spec's recommendation and anchored by bespoke test IDs (`U-m7d-011..014` + `C-m7d-005` + `C-m7d-010` for SG-m7d-01; `U-m7d-003` + `U-m7d-004` + `U-m7d-006` + `C-m7d-003` for SG-m7d-02; `C-m7d-015` for SG-m7d-03). No further VERIFIER-resolvable ambiguity remains.

### Pass-through ratification questions for VERIFIER (non-blocking — plan § Open questions for VERIFIER)

Four plan-level mechanism choices are surfaced for VERIFIER ratification — all are plan-level mechanism decisions, not deviations from the spec; all are non-blocking; the tests are written against the plan baseline:

1. **Hook split — one hook per scope (`useBlockCelebrationOnce` + `useDayCelebrationOnce`) vs. one unified hook (`useCelebrationOnce`).** Plan baseline ships two distinct hooks; the data shape differs (block scope keyed by `blockId` Set; day scope single boolean). `U-m7d-001..010` are written against the plan baseline (two distinct `renderHook` invocations). Alternative (one unified hook with `scope: "block" | "day"` discriminant) amends trivially — the test signature changes, the assertions are identical. Pass-through per dispatch prompt.
2. **`useEffect` consume pattern vs. ref-tracked render-time fire.** Plan baseline reads `shouldBloom` / `shouldFireworks` during render and dispatches side effects in a `useEffect([shouldBloom])` / `useEffect([shouldFireworks])`. `C-m7d-002..010` are written against the plan baseline. Alternative (ref-tracked render-time fire — closer to M7a's `useFirstPaintAfterHydration` precedent) amends trivially — the assertion of "exactly one `setBloomKey` invocation per transition" holds under either approach; the test inspection just shifts from `useEffect` to a `useRef` tracker. Pass-through per dispatch prompt.
3. **PRM bloom variant — sibling `<div className="bloom-reduced">` vs. swap the `motion.div`'s `transition` + `animate` props.** Plan baseline renders a parallel sibling `<div>` under PRM (M4a spring path byte-identical; no risk of regressing M4a tests). `C-m7d-004` is written against the plan baseline (asserting `bloom-overlay-reduced` testid mounts). Alternative (swap-prop on the single `motion.div`) amends — the assertion changes from "two distinct test ids" to "one test id with PRM-conditional `animate` shape". Pass-through per dispatch prompt.
4. **DayCompleteCard timer — extend existing `fireworksActive` 1700→2000 ms PRM-conditionally vs. independent `dayCompleteCardActive` boolean with its own 2000 ms timer.** Plan baseline mutates the existing `setTimeout` window (1 state variable + 1 timer). `C-m7d-007` (1700 ms motion-ON) and `C-m7d-008` (2000 ms PRM) are written against the plan baseline. Alternative (independent state) amends — the assertions split across two state variables; both still meet AC #6 + AC #4. Pass-through per dispatch prompt.

No ADR is reversed: **ADR-013 / ADR-022** (one-feature-per-dispatch) — m7d is one feature group, one BUILDER dispatch (per plan § Feature grouping); **§ 0.5 / § 0.7** (celebrations are earned and sparing; motion tokens consumed unchanged) — `U-m7d-003` + `U-m7d-009` are the literal embodiment of "sparing" at both hook layers; `springConfigs.bloom` and `motionTokens.fireworks` are consumed verbatim (no new motion token — `C-m7d-015` corroborates); **ADR-018** (overrides keyed map; state immutability) — irrelevant for m7d (no AppState mutation; the two new refs are React-instance-local; documented as inapplicable in plan § Decisions honored); **ADR-023** (`useNow()` is the sole clock; two-pass hydration) — m7d introduces no clock; the hydration-suppression invariant for both hooks is the literal embodiment of M9b history reads being inert at hydration (`U-m7d-002` + `U-m7d-008`); **ADR-031** (≥ 44 px touch targets) — no new interactive element (DayCompleteCard is `pointer-events: none`; bloom + fireworks overlays are `pointer-events: none`); **ADR-041** (single-gate Loop; VERIFIER audits this plan + tests) — the dispatch prompt explicitly auto-chains PLAN → TESTS; VERIFIER will audit both before BUILDER starts; **ADR-043** (`assertNever` exhaustiveness) — no new `Action` union member; **ADR-044 / ADR-045** (`schemaVersion` discipline; `history` read-only) — m7d introduces NO `schemaVersion` bump (still `3`); **ADR-046** (period-aggregate helpers pure) — unaffected (m7d does no aggregation); **ADR-047** (M5 `currentDayBlocks` resolves `deletions` only) — consumed unchanged; m7d is forward-compatible with the M5b ship.
