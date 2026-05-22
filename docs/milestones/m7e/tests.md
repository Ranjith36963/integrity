## Milestone 7e — First-brick text card + brand-mark long-press easter egg + toasts — Tests

This entry covers M7e — the final M7 chunk and the closer of the M7 motion-polish epic. M7e bundles three tiny narrative surfaces — each independent, each ships together because none earns its own milestone: (1) a one-time "Your Empire begins." text card that fires on the user's very first brick add (across all program history, persisted via a single boolean `firstBrickShown` so it never re-fires); (2) a 600 ms long-press on the top-bar brand mark (the "DHARMA" wordmark in `<TopBar>`) that reveals a year-heatmap preview overlay (re-uses M9e's `<MonthCell>` primitive directly at scaled-down preview size); release closes it; (3) a global `<Toaster>` that fires subtle 2 s bottom-anchored toasts on `ADD_BLOCK` / `DELETE_BLOCK_*` / `ADD_BRICK` / `DELETE_BRICK`; single-toast-at-a-time, last-write-wins. M7e is **render-layer + a single persisted boolean** — one optional `firstBrickShown?: boolean` is added to `AppState` and `PersistedState` as an **additive lossless v3-payload extension** (per ADR-044 "optional fields with defaults are an additive change"), so `SCHEMA_VERSION` stays at `3` — no migrator step, no new ADR. Derived from the `plan.md` M7e entry (`## Milestone 7e — First-brick text card + brand-mark long-press easter egg + toasts — Plan`, commit `c1063fe`). Feature slug: `m7e`. ID prefixes: `U-m7e-`, `C-m7e-`, `E-m7e-`, `A-m7e-`. M7e has a tight pure-logic surface (additive migrator back-fill truth table + reducer flag-flip idempotence + `hasAnyBrick` helper purity), a real component surface (`<FirstBrickCard>` visible/hidden truth table; `<BrandMarkLongPress>` long-press + drift-cancel; `<YearHeatmapPreview>` 12-MonthCell grid; `<Toaster>` last-write-wins + kind-discriminated role/aria-live; `<TopBar>` brand-mark wrapping; `<BuildingClient>` card-mount-on-0→1-brick transition + four toast-emit dispatch sites; `<AppShell>` Toaster mounts as ViewSwitcher sibling), and a deferred-to-preview perf + a11y surface (Lighthouse Perf ≥ 90; real touch long-press; axe-clean during overlay + during each toast kind variant), so it has the full four-layer test mix — unit (Vitest), component (Vitest + Testing Library), accessibility (axe via Playwright, deferred-to-preview), and E2E (Playwright, deferred-to-preview).

### Testing approach — what is bespoke vs gate-verified

M7e has a **genuine unit + component surface** — the `migrate(raw)` v3 back-fill rule (`hasAnyBrick(blocks, looseBricks)` projection) requires a deterministic truth table over **four payload shapes × three version cases** (12 IDs by the orthogonal cross, collapsed in practice to ~7 ID rows that cover the unique transitions per plan); the reducer's `ADD_BRICK` arm flag-flip requires `vi.fn()`-tracked dispatch sequences (first valid dispatch → flag flips; second valid dispatch → flag stays `true`; rejected dispatch → flag unchanged); the four new component surfaces each require either an `act(() => rerender(...))` harness (`<BuildingClient>`) or direct prop-table renders (`<FirstBrickCard>`, `<YearHeatmapPreview>`); the `<BrandMarkLongPress>` 600 ms threshold requires `vi.useFakeTimers` + `fireEvent.pointer*` gesture sequencing; the `<Toaster>` module-level emitter requires direct invocation of the exported `toast(...)` function + subscription-pattern assertions. Real GIVEN/WHEN/THEN `it()` / `test()` blocks are authored for all of it under Vitest. Two ACs are honestly part-gate-verified, consistent with the M5/M6/M8/M9a–M9e/M7a/M7b/M7c/M7d precedent:

- **AC #13 (`tsc --noEmit` clean; ESLint 0 errors (≤13 warnings per spec, ≤20 per status.md re-anchor); full Vitest suite green; `test:tz` green; Vitest covers first-brick card fires once and never again; migrator covers all three "existing saved state" cases; long-press drift-cancel; toast last-write-wins; reduced-motion collapses)** → the lint / typecheck / full-suite-green / `test:tz` half is gate-verified by `npm run eval`; the five named Vitest scenarios in AC #13 (card-fires-once-and-never-again; migrator-three-cases; long-press-drift-cancel; toast-last-write-wins; reduced-motion-collapse) are each anchored as bespoke IDs below.
- **AC #14 (E2E Playwright, deferred-to-preview: Lighthouse Performance ≥ 90; brand-mark long-press opens overlay on a real touch event; toast renders and dismisses on a real brick-add)** → authored as real `test()` blocks under `tests/e2e/m7e.spec.ts` (`E-m7e-001..007`) but executed on the Vercel preview (the sandbox cannot run a real Lighthouse audit, a real touch-pointer long-press timing trace, or real `page.emulateMedia` PRM emulation against a production-build bundle; the M5b / M9a–M9e / M7a / M7b / M7c / M7d precedent for deferred-to-preview E2E + a11y carries forward).

All other 13 ACs (12 in body + AC #15 no-regression) map to at least one concrete bespoke `m7e` test ID below.

### Mutation-resistance notes (read before reviewing the IDs)

Per the established M5/M6/M8/M9a–M9e/M7a/M7b/M7c/M7d discipline, these tests are written to fail against a plausible buggy implementation, not merely an empty one:

- **`U-m7e-001` (the reducer's `ADD_BRICK` arm flips `state.firstBrickShown` from `undefined` to `true` on the first valid dispatch) asserts** that with `initialState.firstBrickShown === undefined`, the result of `reducer(initialState, { type: "ADD_BRICK", brick: validBrickFixture })` returns a state with `firstBrickShown === true`. A mutant omitting the flip (e.g., a `return { ...state, blocks: ..., looseBricks: ... }` without the flag) fails. AC #1 anchor at the reducer level + plan § Data model "the reducer's `ADD_BRICK` arm gains an idempotent flip".
- **`U-m7e-002` (the reducer's `ADD_BRICK` arm is idempotent on `firstBrickShown` — second dispatch leaves the flag `true`) asserts** that after `U-m7e-001`'s first dispatch (`firstBrickShown === true`), a second `reducer(state1, { type: "ADD_BRICK", brick: anotherBrick })` returns a state with `firstBrickShown === true` (still `true`; the flag never goes back to `false` or `undefined`). A mutant that flips the flag on every dispatch (toggling) fails — the second dispatch would set it to `false`. Plan § Edge cases "Idempotent flag flip in reducer" anchor.
- **`U-m7e-003` (a rejected `ADD_BRICK` dispatch — e.g., violating the hasDuration invariant — does NOT flip the flag) asserts** that with `initialState.firstBrickShown === false` AND a brick fixture that violates the brick-validity guard (e.g., a `time-brick` shape per the M4f rip, or a units-brick missing `duration`), `reducer(initialState, { type: "ADD_BRICK", brick: invalidBrickFixture })` returns the state unchanged (`firstBrickShown === false`). A mutant flipping the flag BEFORE the validity guard fails. AC #1 strict-read anchor (only successful dispatches flip the flag) + plan § File structure `lib/data.ts` row: "rejected dispatch (returning `state` unchanged) does NOT flip the flag".
- **`U-m7e-004` (the reducer's `ADD_BLOCK` / `DELETE_BLOCK_TODAY` / `DELETE_BLOCK_ALL` / `LOG_TICK_BRICK` / `SET_UNITS_DONE` / `DELETE_BRICK` arms do NOT flip `firstBrickShown`) asserts** that for each of these six action types, starting from a state with `firstBrickShown === false`, the result still has `firstBrickShown === false` (the flag is scoped to `ADD_BRICK` only — no other arm touches it). A mutant promoting the flip to a global pre-dispatch step (e.g., a reducer wrapper) fails the assertion across all six other arms. Plan § File structure `lib/data.test.ts` row: "`LOG_TICK_BRICK` / `SET_UNITS_DONE` / `DELETE_BRICK` do NOT flip the flag; `DELETE_BLOCK_TODAY` / `DELETE_BLOCK_ALL` do NOT flip the flag".
- **`U-m7e-005` (`hasAnyBrick(blocks, looseBricks)` returns `true` if any block has at least one brick OR `looseBricks.length > 0`; returns `false` otherwise) asserts** the truth table for the inline helper used by `migrate(raw)`'s v3 case + `<BuildingClient>`'s 0→1 brick transition detector: `hasAnyBrick([], []) === false`; `hasAnyBrick([{ id: "B1", bricks: [] }], []) === false`; `hasAnyBrick([], [validBrick]) === true`; `hasAnyBrick([{ id: "B1", bricks: [validBrick] }], []) === true`; `hasAnyBrick([{ id: "B1", bricks: [] }, { id: "B2", bricks: [validBrick] }], []) === true`. A mutant treating the empty-`bricks`-array as `true` (e.g., `blocks.length > 0`) fails the second sub-assertion. Plan § Data model "back-fill via `hasAnyBrick(blocks, looseBricks)`" + plan § Components — `<BuildingClient>` "`const brickCount = state.blocks.reduce(...) + state.looseBricks.length`".
- **`U-m7e-006` (the `migrate(raw)` v3 case back-fills `firstBrickShown` to `true` when the persisted payload omits the field AND has bricks) asserts** that with a v3 raw object missing `firstBrickShown` AND containing at least one brick (e.g., `{ schemaVersion: 3, blocks: [{ id: "B1", bricks: [validBrick], ... }], looseBricks: [], ... }`), `migrate(raw)` returns a state with `firstBrickShown === true`. A mutant defaulting to `false` (ignoring the `hasAnyBrick` projection) fails. AC #5 anchor — the PRIMARY "existing user with bricks never sees the card retroactively" contract + plan § Data model migrator sketch.
- **`U-m7e-007` (the `migrate(raw)` v3 case back-fills `firstBrickShown` to `false` when the persisted payload omits the field AND has NO bricks) asserts** that with a v3 raw object missing `firstBrickShown` AND `blocks: [{ id: "B1", bricks: [] }]` AND `looseBricks: []`, `migrate(raw)` returns a state with `firstBrickShown === false`. A mutant defaulting to `true` (e.g., `obj.firstBrickShown ?? true`) fails — the next `ADD_BRICK` would not fire the card. Plan § Edge cases "Existing saved state with no bricks (v3 payload pre-M7e)" anchor.
- **`U-m7e-008` (the `migrate(raw)` v3 case PRESERVES `firstBrickShown` when present — round-trip for both `true` and `false`) asserts** that `migrate({ schemaVersion: 3, firstBrickShown: true, ... })` returns a state with `firstBrickShown === true` (regardless of `hasAnyBrick` result — i.e., even if the persisted payload has `firstBrickShown: true` AND no bricks, the projection respects the explicit value); AND `migrate({ schemaVersion: 3, firstBrickShown: false, ... })` returns a state with `firstBrickShown === false` (even if `hasAnyBrick` would return `true`). A mutant that ALWAYS recomputes from `hasAnyBrick` fails the first sub-assertion (because the user's explicit dismissal is overwritten). Plan § Data model migrator sketch — "`typeof obj.firstBrickShown === "boolean" ? obj.firstBrickShown : hasAnyBrick`" — the type-guard branch.
- **`U-m7e-009` (the `migrate(raw)` v2 → v3 path applies the same `hasAnyBrick` back-fill — v2 payloads have no `firstBrickShown` field by definition) asserts** that with a v2 raw object (`schemaVersion: 2`, no `firstBrickShown`, but with `blocks: [{ id: "B1", bricks: [validBrick] }]`), `migrate(raw)` returns a v3-projected state with `firstBrickShown === true`. The v2 → v3 migration cascade must NOT short-circuit the back-fill. A mutant that hard-codes `firstBrickShown: false` in the v2 → v3 step fails. Plan § File structure `lib/persist.test.ts` row: "v2 → v3 migrator output's `firstBrickShown` is back-filled by the same blocks/looseBricks scan as v3".
- **`U-m7e-010` (the `migrate(raw)` v1 → v3 path lands at `firstBrickShown: false`) asserts** that with a v1 raw object (`schemaVersion: 1`, no `firstBrickShown`, no `looseBricks` — v1 predates them — and `blocks` populated only via M2's `ADD_BLOCK` which doesn't populate `bricks`), `migrate(raw)` returns a v3-projected state with `firstBrickShown === false`. A mutant that defaults to `true` on v1 fails. Plan § Data model "Case 1 (v1 → v3) has no `looseBricks` (v1 predates them) and no inside-block bricks ... projection lands at `false`".
- **`U-m7e-011` (`SCHEMA_VERSION === 3` — M7e does NOT bump the schema version per ADR-044 additive-optional-field rule) asserts** by importing the `SCHEMA_VERSION` constant from `lib/persist.ts` and asserting `expect(SCHEMA_VERSION).toBe(3)`. A mutant bumping to `4` fails. SG-m7e-01 resolution anchor + plan § Data model "**No `SCHEMA_VERSION` bump (stays at `3`)**" + plan § Decisions honored ADR-044 row.
- **`U-m7e-012` (`defaultPersisted()` returns `firstBrickShown: false` — first-run users have NOT yet earned the card) asserts** that `defaultPersisted()` returns an object with `firstBrickShown === false` (not `undefined`, not `true`). A mutant defaulting to `undefined` (which would survive type-narrowing but break the explicit "first-run users see the card on their genuine first `ADD_BRICK`" contract) fails — the migrator's projection would still back-fill to `false`, but the explicit `false` in `defaultPersisted()` is the plan baseline. AC #1 first-run anchor + plan § File structure `lib/persist.ts` row item (4).
- **`U-m7e-013` (`saveState(state)` writes `firstBrickShown` to the JSON payload, defaulting to `false` when `state.firstBrickShown === undefined`) asserts** by spying on `localStorage.setItem` (or by reading back the stored JSON), that `saveState({ ...state, firstBrickShown: true })` produces a JSON payload with `"firstBrickShown": true`; `saveState({ ...state, firstBrickShown: false })` produces `"firstBrickShown": false`; `saveState({ ...state, firstBrickShown: undefined })` produces `"firstBrickShown": false` (the `?? false` fallback per plan). A mutant omitting the field from the write path fails the first two sub-assertions; a mutant defaulting to `true` fails the third. Plan § File structure `lib/persist.ts` row item (3).
- **`U-m7e-014` (forward-compat — a payload with `firstBrickShown: "yes"` (string corruption) or `firstBrickShown: 1` (number) falls through to the `hasAnyBrick` back-fill, no crash) asserts** that with raw objects `{ schemaVersion: 3, firstBrickShown: "yes", blocks: [], looseBricks: [] }` and `{ schemaVersion: 3, firstBrickShown: 1, blocks: [], looseBricks: [] }`, `migrate(raw)` returns a state with `firstBrickShown === false` (the back-fill projects from `hasAnyBrick`, NOT from the corrupted value); neither call throws. A mutant trusting `obj.firstBrickShown` as a boolean without the `typeof === "boolean"` guard would land a truthy string at `firstBrickShown: "yes"` — fails. Plan § Edge cases "`firstBrickShown` corruption (defensive)" anchor + plan § Data model migrator sketch type-guard.
- **`U-m7e-015` (`lib/usePersistedState.ts`'s `projectToAppState(p)` carries `firstBrickShown` through from persisted to AppState) asserts** that `projectToAppState({ schemaVersion: 3, firstBrickShown: true, blocks: [], categories: [], looseBricks: [], deletions: {}, history: {}, programStart: "2026-05-01", currentDate: "2026-05-20" })` returns an `AppState` with `firstBrickShown === true`; and the parallel for `firstBrickShown: false`. A mutant dropping the field on projection fails. Plan § File structure `lib/usePersistedState.ts` row item (1).
- **`U-m7e-016` (`lib/usePersistedState.ts`'s `toPersisted(s)` carries `firstBrickShown` back from AppState to persisted) asserts** the parallel direction: `toPersisted({ ...appState, firstBrickShown: true })` returns a `PersistedState` with `firstBrickShown === true`. A mutant dropping the field on save fails. Plan § File structure `lib/usePersistedState.ts` row item (2).
- **`C-m7e-001` (`<FirstBrickCard visible={false} />` renders `null`) asserts** that `render(<FirstBrickCard visible={false} onDismiss={vi.fn()} />)` results in `screen.queryByTestId("first-brick-card")` returning `null`; the rendered output has zero DOM nodes (`container.firstChild === null` OR `container.innerHTML === ""`). A mutant that renders the card with `visibility: hidden` (instead of returning `null`) leaves a DOM node — fails. Plan § Components — `<FirstBrickCard>` "Renders `null` when `visible === false`" anchor.
- **`C-m7e-002` (`<FirstBrickCard visible={true} />` renders the "Your Empire begins." headline with `role="status"` + `aria-live="polite"`) asserts** that `render(<FirstBrickCard visible={true} onDismiss={vi.fn()} />)` mounts an element with `data-testid="first-brick-card"`, text content containing `"Your Empire begins."`, attributes `role="status"` AND `aria-live="polite"`, AND a `font-family` style referencing `var(--font-display)` (Instrument Serif). A mutant omitting `role="status"` OR `aria-live="polite"` fails the AT-announcement contract; a mutant using `aria-live="assertive"` fails the polite-announcement sub-assertion. AC #2 anchor (the headline text + display type scale) + plan § Components — `<FirstBrickCard>`.
- **`C-m7e-003` (`<FirstBrickCard visible={true}>` auto-dismisses after exactly 3000 ms — calls `onDismiss` once via the internal setTimeout) asserts** with `vi.useFakeTimers()`, `render(<FirstBrickCard visible={true} onDismiss={onDismiss} />)`, then `vi.advanceTimersByTimeAsync(2999)` → `onDismiss` invocation count `=== 0`; then `vi.advanceTimersByTimeAsync(1)` → `onDismiss` invocation count `=== 1`; then `vi.advanceTimersByTimeAsync(5000)` (long after dismissal) → `onDismiss` invocation count STILL `=== 1` (timer fires exactly once). A mutant using 2000 ms (the toast duration) fails the 2999 ms sub-assertion. A mutant firing on every render fails the count assertion. AC #3 auto-dismiss anchor + plan § Components — `<FirstBrickCard>` "Auto-dismisses after 3000 ms".
- **`C-m7e-004` (`<FirstBrickCard visible={true}>` tap-on-card-body fires `onDismiss` synchronously and cancels the auto-dismiss timer) asserts** with `vi.useFakeTimers()`, `render(<FirstBrickCard visible={true} onDismiss={onDismiss} />)`, then `fireEvent.click(screen.getByTestId("first-brick-card"))` → `onDismiss` invocation count `=== 1`; then `vi.advanceTimersByTimeAsync(5000)` (past the original 3000 ms timeout) → `onDismiss` invocation count STILL `=== 1` (the cleared timeout does NOT fire a second time). A mutant that does NOT clear the timeout on unmount fails the second sub-assertion. AC #3 tap-dismiss anchor + plan § Components — `<FirstBrickCard>` "Tap anywhere on the card fires `onDismiss`".
- **`C-m7e-005` (under `prefers-reduced-motion: reduce`, `<FirstBrickCard visible={true}>` opacity-fades with no transform — PRM cadence) asserts** with the `useReducedMotion` Framer hook mocked to return `true` (or via `prefersReducedMotion: true` prop per plan signature), `render(<FirstBrickCard visible={true} prefersReducedMotion={true} onDismiss={vi.fn()} />)`: the rendered `motion.div` element has NO `transform: translateY(...)` style applied (or the Framer `animate` prop is `{ opacity: 1 }` with NO `y` axis) AND the transition is a linear 200 ms timed transition (verified via the `transition` prop's `duration: 0.2, ease: "linear"` OR via the inline style having `transition: opacity 200ms linear`). A mutant rendering the spring under PRM fails. AC #12 first-brick-card-PRM anchor + plan § Components — `<FirstBrickCard>` "PRM: opacity `0 → 1` over 200 ms linear; no transform".
- **`C-m7e-006` (`<BrandMarkLongPress state={state}>` opens `<YearHeatmapPreview>` after exactly 600 ms of pointer-hold) asserts** with `vi.useFakeTimers()`, `render(<BrandMarkLongPress state={fixtureState}>BRAND</BrandMarkLongPress>)`, `fireEvent.pointerDown(screen.getByText("BRAND"))`; then `vi.advanceTimersByTimeAsync(599)` → `screen.queryByTestId("year-heatmap-preview")` is `null`; then `vi.advanceTimersByTimeAsync(1)` → `screen.queryByTestId("year-heatmap-preview")` is a real element. A mutant using 500 ms (the M4c `HOLD_MS` constant — see § Spec gaps surfaced for VERIFIER below) fires the overlay at 500 ms, failing the 599 ms `null` sub-assertion. A mutant using 1000 ms fails the 600 ms `real-element` sub-assertion. AC #6 anchor + plan § Components — `<BrandMarkLongPress>` `holdMs: 600`.
- **`C-m7e-007` (`<BrandMarkLongPress>` release (pointerUp) BEFORE 600 ms → no overlay; tap is a no-op per plan) asserts** with `vi.useFakeTimers()`, `fireEvent.pointerDown(...)` then `vi.advanceTimersByTimeAsync(400)` then `fireEvent.pointerUp(...)` then `vi.advanceTimersByTimeAsync(1000)`: `screen.queryByTestId("year-heatmap-preview")` is `null` throughout. A mutant firing the long-press on `pointerUp` (instead of after `holdMs` elapses without `pointerUp`) fails. AC #6 short-tap-no-op + AC #7 anchor + plan § Components — `<BrandMarkLongPress>` "`onTap`: no-op (the brand mark is decorative; tap does nothing)".
- **`C-m7e-008` (`<BrandMarkLongPress>` drift-cancel — `pointerLeave` OR `pointerCancel` BEFORE 600 ms → no overlay) asserts** the two cancellation paths: `fireEvent.pointerDown(...)` then `vi.advanceTimersByTimeAsync(400)` then `fireEvent.pointerLeave(...)` then `vi.advanceTimersByTimeAsync(1000)` → no overlay; AND separately: `fireEvent.pointerDown(...)` then `vi.advanceTimersByTimeAsync(400)` then `fireEvent.pointerCancel(...)` then `vi.advanceTimersByTimeAsync(1000)` → no overlay. A mutant that ignores `pointerLeave` (only resetting on `pointerUp`) fails the first sub-assertion. AC #7 drift-cancel anchor + plan § Edge cases "Long-press starts on brand mark but drifts off before 600 ms".
- **`C-m7e-009` (`<BrandMarkLongPress>` after-overlay-open: `pointerUp` closes the overlay) asserts** with the overlay open after `C-m7e-006`-style 600 ms hold, `fireEvent.pointerUp(...)` results in `screen.queryByTestId("year-heatmap-preview")` returning `null`. A mutant that does NOT subscribe to `pointerUp` to close the overlay (e.g., requires a separate close button) fails. AC #6 release-closes-it anchor + plan § Components — `<BrandMarkLongPress>` "`closeOverlay` (called from `onPointerUp` / `onPointerCancel` / `onPointerLeave`) fires `setOverlayVisible(false)`".
- **`C-m7e-010` (under PRM, `<BrandMarkLongPress>` opens the overlay with opacity-fade only — no scale-in animation) asserts** with `useReducedMotion` mocked to return `true`, the 600 ms hold sequence; the rendered `<YearHeatmapPreview>` overlay has NO `transform: scale(...)` style applied (verified via the `motion.div`'s `animate` prop being `{ opacity: 1 }` with NO `scale` axis OR via the inline style having `transition: opacity 200ms linear`). A mutant that renders the scale spring under PRM fails. AC #12 overlay-PRM anchor + plan § Components — `<BrandMarkLongPress>` "PRM → opacity-fade only".
- **`C-m7e-011` (`<BrandMarkLongPress>` invokes `haptics.light()` exactly once on the 600 ms threshold elapse) asserts** with `vi.mock("@/lib/haptics", () => ({ haptics: { light: vi.fn(), ... } }))`, the 600 ms hold sequence: `haptics.light` invocation count `=== 1`. A mutant firing the haptic on `pointerDown` (instead of after `holdMs` elapses) fails the count assertion (the haptic would fire even on a short tap). Plan § Components — `<BrandMarkLongPress>` "`onLongPress`: fires `haptics.light()`".
- **`C-m7e-012` (`<YearHeatmapPreview state={state}>` renders 12 `<MonthCell>` instances in a 3×4 grid — re-uses M9e's primitive directly per SG-m7e-02) asserts** that `render(<YearHeatmapPreview state={fixtureState} />)` mounts an element with `data-testid="year-heatmap-preview"` containing 12 `<MonthCell>` instances (verified by `screen.queryAllByTestId("month-cell")` having length `=== 12` — assuming `<MonthCell>` carries a stable test id; alternative: count `[data-month-index]` attributes). Each MonthCell receives `onOpen={() => {}}` (a no-op — preview is peek-only; verified via prop spy if Vitest can introspect the rendered children, OR via a click-into-cell test asserting no navigation occurs). A mutant rendering only 11 or 13 MonthCells fails the count assertion; a mutant wiring `<YearView>` directly (the SG-m7e-02 alternative path the plan rejected) would render the M9e file's full year-view shell — fails the "MonthCell composed directly, NOT YearView" inspection. SG-m7e-02 resolution anchor + plan § Components — `<YearHeatmapPreview>` "Re-uses `<MonthCell>` directly (not a new component)".
- **`C-m7e-013` (`<YearHeatmapPreview>` reads from `state` without consulting any clock — ADR-046 purity) asserts** by spying on `Date.now` / `new Date()` / any clock helper imported by the file (`fs.readFileSync` on `components/YearHeatmapPreview.tsx` returns zero matches for `Date.now` / `useNow` / `new Date()`); AND `render(<YearHeatmapPreview state={fixtureState} />)` produces deterministic output regardless of the wall-clock setting (mock `Date.now()` to a 2030 value; the render output's MonthCell scores are unchanged from a 2026 wall-clock run because they derive from `state.currentDate` per ADR-046). A mutant reading `new Date().getFullYear()` to determine the year fails the source-inspection assertion. ADR-046 purity anchor + plan § Components — `<YearHeatmapPreview>` "No clock read (ADR-046)".
- **`C-m7e-014` (`<YearHeatmapPreview>` overlay has `role="dialog"` + `aria-modal="true"` + `aria-label="Year heatmap preview"`; the grid is `aria-hidden="true"`) asserts** that the overlay root element (the `data-testid="year-heatmap-preview"` container) carries `role="dialog"`, `aria-modal="true"`, `aria-label="Year heatmap preview"`; AND the inner grid container (the MonthCell wrapper) has `aria-hidden="true"`. A mutant omitting `aria-modal="true"` fails axe's modal-dialog rule; a mutant making the grid focusable fails the "peek-only" contract. AC #8 a11y anchor + plan § Components — `<YearHeatmapPreview>` a11y bullet + SG-m7e-03-adjacent (dialog role on the overlay).
- **`C-m7e-015` (`<Toaster />` mounts with no toast visible when no `toast(...)` call has fired) asserts** that `render(<Toaster />)` produces an element with `data-testid="toaster"` but NO child element with `data-testid="toast"` (`screen.queryByTestId("toast")` returns `null`). A mutant rendering a placeholder toast on mount fails. Plan § Components — `<Toaster>` "Renders an empty container (`data-testid="toaster"`) with no visible child" + plan § Edge cases "`<Toaster>` mounted but no toast fired".
- **`C-m7e-016` (`<Toaster />` + `toast("hello", "success")` mounts a `data-testid="toast"` with `role="status"` + `aria-live="polite"` AND the text "hello") asserts** that with `render(<Toaster />)` then a direct invocation of the exported `toast("hello", "success")` (the module-level emitter), `screen.queryByTestId("toast")` returns a real element with text containing `"hello"`, attribute `role="status"`, AND attribute `aria-live="polite"`. A mutant routing success to `role="alert"` fails. SG-m7e-03 resolution anchor (success → polite) + plan § Components — `<Toaster>` "`role="status"` + `aria-live="polite"` for success/info".
- **`C-m7e-017` (`<Toaster />` + `toast("oops", "error")` mounts a `data-testid="toast"` with `role="alert"` + `aria-live="assertive"` AND the text "oops") asserts** the parallel for the error kind: a real element with `role="alert"` AND `aria-live="assertive"` AND text `"oops"`. A mutant routing error to `role="status"` + `aria-live="polite"` fails. SG-m7e-03 resolution anchor (error → assertive) + the PRIMARY kind-discriminated-a11y contract per dispatch prompt.
- **`C-m7e-018` (`<Toaster />` + `toast("info-msg", "info")` mounts a `data-testid="toast"` with `role="status"` + `aria-live="polite"`) asserts** the info kind variant — same a11y attributes as success per plan (info shares the polite live-region with success; the discriminant is the border color, not the role). `role="status"`, `aria-live="polite"`, text `"info-msg"`. A mutant promoting info to `aria-live="assertive"` fails. SG-m7e-03 resolution anchor (info → polite, matches success).
- **`C-m7e-019` (`<Toaster />` auto-dismisses each toast after exactly 2000 ms) asserts** with `vi.useFakeTimers()`, `render(<Toaster />)` then `toast("hello", "success")`: `screen.queryByTestId("toast")` is a real element; `vi.advanceTimersByTimeAsync(1999)` → toast STILL visible; `vi.advanceTimersByTimeAsync(1)` → toast unmounted (`screen.queryByTestId("toast")` returns `null`). A mutant using 3000 ms (the FirstBrickCard duration) fails the 1999 ms sub-assertion. AC #9 anchor + plan § Components — `<Toaster>` "Auto-dismiss timer `2000 ms` per toast".
- **`C-m7e-020` (`<Toaster />` last-write-wins — two rapid `toast(...)` calls show only the latest, and the timer resets on the second call) asserts** with `vi.useFakeTimers()`, `render(<Toaster />)` then `toast("first", "success")` then `vi.advanceTimersByTimeAsync(1000)` then `toast("second", "info")`: at this point `screen.queryByTestId("toast")`'s text contains `"second"` (NOT `"first"`); `screen.queryAllByTestId("toast")` has length `=== 1` (single-toast-at-a-time, NOT a queue). Then `vi.advanceTimersByTimeAsync(1999)` → toast STILL visible (the 2000 ms timer was RESET by the second emit at t=1000, so the new dismissal is at t=3000); `vi.advanceTimersByTimeAsync(1)` → toast unmounted at t=3000. A mutant maintaining a queue (rendering both toasts stacked) fails the length-`=== 1` sub-assertion; a mutant that does NOT reset the timer (dismissing the second toast at t=2000 inherited from the first call's timer) fails the t=2999 STILL-visible sub-assertion. AC #9 last-write-wins anchor + plan § Components — `<Toaster>` "The auto-dismiss timer (2000 ms) is reset on every emit".
- **`C-m7e-021` (`<Toaster />` container z-index is 30 — per SG-m7e-04 stacking contract) asserts** that the `<Toaster />` container (`data-testid="toaster"`) has `z-index: 30` in its inline style OR computed style (verified via `window.getComputedStyle(container).zIndex === "30"`). A mutant using z-50 (overlapping sheets) OR z-20 (overlapped by dock) fails. SG-m7e-04 resolution anchor + plan § Components — `<Toaster>` "z-index: `30`".
- **`C-m7e-022` (under PRM, `<Toaster />` toast appears instantly — no slide animation) asserts** with `useReducedMotion` mocked to return `true`, `toast("instant", "success")`: the rendered `data-testid="toast"` element has NO `transform: translateY(...)` style (or the Framer `animate` prop has NO `y` axis) AND the transition is `transition: none` (or the `motion.div`'s `transition` prop is `{ duration: 0 }`). A mutant rendering the slide under PRM fails. AC #12 toast-PRM anchor + plan § Components — `<Toaster>` "PRM: instant appear/disappear (no slide)".
- **`C-m7e-023` (`<TopBar state={state}>` wraps the brand-mark cluster with `<BrandMarkLongPress>`; `<TopBar />` without `state` renders the brand mark un-wrapped — backwards compat) asserts** two render paths: (a) `render(<TopBar state={fixtureState} />)` mounts an element with `data-testid="brand-mark-longpress"` (the wrapper) AND the brand mark text "DHARMA" inside it; (b) `render(<TopBar />)` (no `state` prop) mounts the brand mark text "DHARMA" WITHOUT the `data-testid="brand-mark-longpress"` wrapper (verified via `screen.queryByTestId("brand-mark-longpress")` returning `null`). A mutant that always wraps (regardless of `state` prop) fails sub-assertion (b) — existing M0 test fixtures would break. A mutant that never wraps fails sub-assertion (a). Plan § File structure `components/TopBar.tsx` row + plan § Components — `<TopBar>` "When `state === undefined`, brand mark renders un-wrapped".
- **`C-m7e-024` (`<BrandMarkLongPress>` wrapper is a `<button>` with `aria-label="DHARMA — long-press for year heatmap"` AND tappable area ≥ 44 px tall per ADR-031) asserts** that the wrapper element's tag is `button`, its `aria-label` is `"DHARMA — long-press for year heatmap"`, AND its computed bounding-rect `height` is `>= 44` (verified via `getBoundingClientRect().height` after mount; if jsdom can't compute layout, fall back to asserting `padding-block: 12px` is applied to a 20 px-tall brand mark OR the inline style `minHeight: 44px` is present). A mutant rendering the wrapper as a `<div>` fails the `tagName === "BUTTON"` assertion; a mutant omitting the aria-label fails the accessible-name assertion. ADR-031 anchor + plan § Components — `<BrandMarkLongPress>` "the wrapper is a `<button>` element so the tappable area is ≥44 px".
- **`C-m7e-025` (`<BuildingClient>` mounts `<FirstBrickCard visible={true}>` on a 0 → 1 brick transition when `state.firstBrickShown !== true` at the prior render) asserts** with `render(<BuildingClient initialState={stateWithZeroBricksAndFlagFalse} />)`, `screen.queryByTestId("first-brick-card")` is `null` (no card on initial mount because `brickCount === 0`); then `act(() => dispatch({ type: "ADD_BRICK", brick: validBrickFixture }))` (or rerender with `stateWithOneBrickAndFlagTrue` — the post-`ADD_BRICK` shape) drives `brickCount` from 0 → 1 AND `state.firstBrickShown` from `false` → `true`: `screen.queryByTestId("first-brick-card")` becomes a real element with `visible={true}` (verified via the rendered card text "Your Empire begins."). A mutant that ignores the 0→1 transition (e.g., mounts the card on hydration into a state with bricks) fails the initial-mount `null` sub-assertion. AC #1 anchor at the BuildingClient layer + plan § Components — `<BuildingClient>` "When `brickCount` transitions from 0 to ≥1 AND `state.firstBrickShown !== true` ... set `firstCardOpen = true`".
- **`C-m7e-026` (`<BuildingClient>` does NOT re-mount `<FirstBrickCard>` on a second `ADD_BRICK` within the same mount — `state.firstBrickShown` is now `true`) asserts** with the post-`C-m7e-025` state (`brickCount === 1`, `firstBrickShown === true`, card may have auto-dismissed via 3000 ms timer), a SECOND `act(() => dispatch({ type: "ADD_BRICK", ... }))`: `screen.queryByTestId("first-brick-card")` remains `null`. A mutant that fires the card on every `ADD_BRICK` (ignoring the flag) fails. AC #4 anchor at the BuildingClient layer + plan § Edge cases "User adds first brick, reloads, adds another → card does not re-fire".
- **`C-m7e-027` (`<BuildingClient>` does NOT mount `<FirstBrickCard>` on hydration into a state with `firstBrickShown === true` AND `brickCount > 0` — existing user backfilled) asserts** with `render(<BuildingClient initialState={stateWithBricksAndFlagTrue} />)`, `screen.queryByTestId("first-brick-card")` is `null` AND remains `null` across `vi.advanceTimersByTimeAsync(5000)`. The "previous-render ref" initializes to the hydrated flag value (`true`), so the 0→≥1 transition predicate is false on the initial render. A mutant that ignores the hydrated flag and fires the card on first paint fails. AC #5 anchor at the BuildingClient layer + plan § Edge cases "Hydration into a state with `firstBrickShown: true`".
- **`C-m7e-028` (`<BuildingClient>` does NOT mount `<FirstBrickCard>` on hydration into a state with `firstBrickShown === false` AND `brickCount > 0` — defensive corruption guard) asserts** the asymmetric case: a state where `firstBrickShown === false` BUT `brickCount > 0` (which shouldn't occur via the migrator, but could occur if `firstBrickShown` was set explicitly to `false` and the user already has bricks). `render(<BuildingClient initialState={stateWithBricksAndFlagFalse} />)`: `screen.queryByTestId("first-brick-card")` is `null` (the 0→1 transition predicate is the gate — `brickCount` was NOT 0 at hydration, it was already ≥1). A mutant that fires the card whenever `firstBrickShown === false` AND `brickCount > 0` (ignoring the transition predicate) fails. Plan § Edge cases "Hydration into a state with `firstBrickShown: true`" (the predicate explicitly requires the 0→1 transition).
- **`C-m7e-029` (`<BuildingClient>` invokes `toast("Block created", "success")` after a successful `ADD_BLOCK` dispatch) asserts** with `vi.mock("@/components/Toaster", () => ({ toast: vi.fn(), Toaster: () => null }))`, `render(<BuildingClient initialState={...} />)` then `act(() => triggerAddBlock(...))` (e.g., via `handleChooserPick("block", ...)` or the equivalent UI gesture): `toast` invocation count `=== 1` with arguments `("Block created", "success")`. A mutant calling `toast("Block deleted", "info")` (wrong message OR wrong kind) fails. AC #10 anchor (block-add) + plan § Toast wiring table row 1.
- **`C-m7e-030` (`<BuildingClient>` invokes `toast("Block deleted", "info")` after a successful `DELETE_BLOCK_TODAY` OR `DELETE_BLOCK_ALL` dispatch) asserts** with the same toast mock, `act(() => triggerDeleteBlockJustToday(...))` AND separately `act(() => triggerDeleteBlockAll(...))`: each results in `toast` invocation count `=== 1` with arguments `("Block deleted", "info")`. A mutant routing one branch (e.g., DELETE_BLOCK_ALL) to a different message fails. AC #10 anchor (block-delete) + plan § Toast wiring table row 2.
- **`C-m7e-031` (`<BuildingClient>` invokes `toast("Brick added", "success")` after a successful `ADD_BRICK` dispatch) asserts** with the same toast mock, `act(() => triggerAddBrick(validBrickFixture))`: `toast` invocation count `=== 1` with arguments `("Brick added", "success")`. A mutant calling `toast("Brick deleted", "info")` (wrong kind) fails. AC #10 anchor (brick-add) + plan § Toast wiring table row 3.
- **`C-m7e-032` (`<BuildingClient>` invokes `toast("Brick deleted", "info")` after a successful `DELETE_BRICK` dispatch) asserts** with the same toast mock, `act(() => triggerDeleteBrick(...))`: `toast` invocation count `=== 1` with arguments `("Brick deleted", "info")`. A mutant calling `toast` with `"error"` kind on delete fails. AC #10 anchor (brick-delete) + plan § Toast wiring table row 4.
- **`C-m7e-033` (`<BuildingClient>` does NOT invoke `toast(...)` when an `ADD_BRICK` is rejected by the reducer — happy-path-only emit) asserts** with the same toast mock, an `act(() => triggerAddBrick(invalidBrickFixture))` (a brick violating the brick-validity guard or the M4e overlap engine — the reducer returns `state` unchanged): `toast` invocation count `=== 0`. The plan baseline wires toast emit AFTER dispatch unconditionally on the happy paths; rejected dispatches reach the same call site, but the test fixture is set up so the rejection happens at the form-validation layer (which gates the dispatch call entirely). VERIFIER may pick the alternative wiring (toast emit only if the reducer returned a different state instance) — `C-m7e-033`'s assertion holds either way. AC #11 strict-read partial anchor (the plan baseline does NOT fire an error toast on reducer-side rollback; see § Spec gaps surfaced for VERIFIER → SG-m7e-05).
- **`C-m7e-034` (M6 `REORDER_BLOCK` overlap-rejection snap-back does NOT fire a toast — plan baseline per SG-m7e-05) asserts** with the same toast mock, a `<DraggableTimelineBlock>` drag that lands on an overlapping target (the M6 snap-back path): `toast` invocation count `=== 0`. The existing M6 haptic + aria-live announce fires unchanged (per M6 plan), but no toast emit is wired at the snap-back call site. A mutant that adds toast emit at the snap-back site (the SG-m7e-05 VERIFIER-ratification alternative) fails — but this test ID is structured to flag the SG, NOT to gate VERIFIER's pick: if VERIFIER ratifies the SG-m7e-05 alternative (error toast on snap-back), this test ID's expected count flips from `0` to `1` and the assertion amends mechanically. Per dispatch prompt: "anchor a test that asserts the current behavior (no toast on snap-back) so the VERIFIER can ratify or push back". The PRIMARY SG-m7e-05 ratification anchor.
- **`C-m7e-035` (`<AppShell />` mounts `<Toaster />` as a sibling of `<ViewSwitcher>`; the Toaster persists across Day → Week → Month → Year → Day view switches) asserts** with `render(<AppShell ... />)`: `screen.queryByTestId("toaster")` is a real element on initial mount (Day view). Then drive the view switcher through Week → Month → Year → Day (via `fireEvent.click` on the dock view buttons, OR via a controlled `currentView` prop): at each view transition, `screen.queryByTestId("toaster")` remains the SAME element (verified via the element's identity reference being preserved — `const t1 = queryByTestId("toaster"); ... transitions ...; expect(queryByTestId("toaster") === t1).toBe(true)`) — confirming `<Toaster />` is mounted OUTSIDE the view-branch ternary and is not remounted per view. A mutant mounting Toaster INSIDE one of the view branches fails — switching to a non-Day view would unmount it. Plan § File structure `app/(building)/AppShell.tsx` row + plan § Components — `<AppShell>` "Mount `<Toaster />` once as a sibling of `<ViewSwitcher>` so it persists across view switches".

### Test ID layout

| Layer                                 | IDs              | Count  |
| ------------------------------------- | ---------------- | ------ |
| Unit (Vitest)                         | `U-m7e-001..016` | 16     |
| Component (Vitest + Testing Library)  | `C-m7e-001..035` | 35     |
| Accessibility (axe via Playwright)    | `A-m7e-001..005` | 5      |
| E2E (Playwright, deferred-to-preview) | `E-m7e-001..007` | 7      |
| **Total**                             |                  | **63** |

ID series start values were supplied by the orchestrator as the running totals for the four `m7e` prefixes; m7e introduces four fresh prefixes (`U-m7e-`, `C-m7e-`, `E-m7e-`, `A-m7e-`), so each series begins at `001`. IDs are unique, stable, and gap-free so VERIFIER can map AC → test ID.

**Fixture vocabulary (used across the m7e IDs unless a test overrides it):**

- A standing `AppState` fixture: `programStart: "2026-05-01"`, `currentDate: "2026-05-20"`, `deletions: {}`, `history: {}`, `schemaVersion: 3`. The `firstBrickShown` value and `blocks` / `looseBricks` shape vary per test.
- **`stateWithZeroBricksAndFlagFalse`** — `{ ...standing, blocks: [], looseBricks: [], firstBrickShown: false }`. Drives `C-m7e-025` (initial render → no card).
- **`stateWithOneBrickAndFlagTrue`** — `{ ...standing, blocks: [{ id: "B1", bricks: [validBrick] }], looseBricks: [], firstBrickShown: true }`. Drives `C-m7e-025` (post-`ADD_BRICK` render → card appears) + `C-m7e-026` (second `ADD_BRICK` → no re-mount).
- **`stateWithBricksAndFlagTrue`** — `{ ...standing, blocks: [{ id: "B1", bricks: [validBrick, validBrick2] }], looseBricks: [validBrick3], firstBrickShown: true }`. Drives `C-m7e-027` (hydration into existing-user state → no card).
- **`stateWithBricksAndFlagFalse`** — `{ ...standing, blocks: [{ id: "B1", bricks: [validBrick] }], looseBricks: [], firstBrickShown: false }`. Drives `C-m7e-028` (defensive corruption guard — bricks present but flag is `false`, the 0→1 predicate never fires).
- **`fakeTimerHarness`** — Vitest's `vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })` + `vi.useRealTimers()` afterEach. Drives `C-m7e-003`, `C-m7e-004` (FirstBrickCard 3000 ms), `C-m7e-006..008` (BrandMarkLongPress 600 ms), `C-m7e-019`, `C-m7e-020` (Toaster 2000 ms).
- **`useReducedMotionMock`** — a Vitest module mock for `motion/react`'s `useReducedMotion` hook returning `true` (drives `C-m7e-005`, `C-m7e-010`, `C-m7e-022` — the PRM-path assertions) or `false` (drives the motion-ON-path assertions in the same component-suite files).
- **`hapticsMock`** — `vi.mock("@/lib/haptics", () => ({ haptics: { light: vi.fn(), success: vi.fn(), notification: vi.fn() } }))` — drives `C-m7e-011`'s `haptics.light` fan-out assertion.
- **`toastMock`** — `vi.mock("@/components/Toaster", () => ({ toast: vi.fn(), Toaster: () => null }))` — drives `C-m7e-029..034`'s toast-emit count assertions at the BuildingClient layer. The Toaster's own behavior is tested at the unit-component layer (`C-m7e-015..022`) without the mock — the mock is only for the call-site verification.
- **`validBrickFixture`** — a `{ kind: "tick", id: ..., title: ... }` brick satisfying the M4f post-rip schema (no `time` kind). Drives `U-m7e-001..002`, `C-m7e-025..026`, `C-m7e-031`.
- **`invalidBrickFixture`** — a brick that violates the reducer's `ADD_BRICK` validity guard (e.g., a units-brick missing the `duration` field OR an overlap with an existing block per M4e's overlap engine). Drives `U-m7e-003`, `C-m7e-033`.

### Unit (Vitest)

`U-m7e-001..004` exercise the reducer's `ADD_BRICK` arm — the flag flip on first valid dispatch, the idempotence on second valid dispatch, the no-flip on rejected dispatch, and the no-flip on the other five action types. `U-m7e-005` exercises the `hasAnyBrick(blocks, looseBricks)` helper truth table. `U-m7e-006..010` exercise `migrate(raw)`'s v3 back-fill rule + v2 → v3 cascade + v1 → v3 cascade. `U-m7e-011..014` exercise the schema-lock anchors — `SCHEMA_VERSION === 3`, `defaultPersisted().firstBrickShown === false`, `saveState` write semantics, and the corruption-defensive forward-compat. `U-m7e-015..016` exercise `usePersistedState`'s `projectToAppState` + `toPersisted` field carry-through.

#### U-m7e-001 — success (reducer's `ADD_BRICK` arm flips `firstBrickShown` from `undefined` to `true` on first valid dispatch)

GIVEN `state.firstBrickShown === undefined` AND `state.blocks` + `state.looseBricks` are empty AND `validBrickFixture` is a valid tick-brick.
WHEN `reducer(state, { type: "ADD_BRICK", brick: validBrickFixture })` is invoked.
THEN the returned state has `firstBrickShown === true` AND the brick is present (in `state.looseBricks` per the routing decision OR inside the targeted block's `bricks` array).
Tested by: `lib/data.test.ts`

#### U-m7e-002 — success (reducer's `ADD_BRICK` arm is idempotent on `firstBrickShown` — second valid dispatch leaves the flag `true`)

GIVEN the post-`U-m7e-001` state (`firstBrickShown === true`, one brick present).
WHEN `reducer(state1, { type: "ADD_BRICK", brick: anotherBrick })` is invoked with a valid second brick.
THEN the returned state has `firstBrickShown === true` (still `true`; the flag never goes back to `false` or `undefined`).
Tested by: `lib/data.test.ts`

#### U-m7e-003 — invariant (rejected `ADD_BRICK` dispatch does NOT flip the flag)

GIVEN `state.firstBrickShown === false` AND `invalidBrickFixture` violates the brick-validity guard or the M4e overlap engine.
WHEN `reducer(state, { type: "ADD_BRICK", brick: invalidBrickFixture })` is invoked.
THEN the returned state has `firstBrickShown === false` (the rejected dispatch returns `state` unchanged; the flag is NOT pre-flipped).
Tested by: `lib/data.test.ts`

#### U-m7e-004 — invariant (the other six action arms do NOT flip `firstBrickShown`)

GIVEN `state.firstBrickShown === false`.
WHEN any of `{ type: "ADD_BLOCK", ... }`, `{ type: "DELETE_BLOCK_TODAY", ... }`, `{ type: "DELETE_BLOCK_ALL", ... }`, `{ type: "LOG_TICK_BRICK", ... }`, `{ type: "SET_UNITS_DONE", ... }`, `{ type: "DELETE_BRICK", ... }` is dispatched against the state.
THEN every returned state has `firstBrickShown === false` (the flag is scoped to `ADD_BRICK` only).
Tested by: `lib/data.test.ts`

#### U-m7e-005 — invariant (`hasAnyBrick(blocks, looseBricks)` truth table)

GIVEN the 5-row truth table: `([], [])` → `false`; `([{ id: "B1", bricks: [] }], [])` → `false`; `([], [validBrick])` → `true`; `([{ id: "B1", bricks: [validBrick] }], [])` → `true`; `([{ id: "B1", bricks: [] }, { id: "B2", bricks: [validBrick] }], [])` → `true`.
WHEN `hasAnyBrick(blocks, looseBricks)` is invoked for each row.
THEN the return value matches the expected truth-table column exactly.
Tested by: `lib/persist.test.ts` (helper is inline in `migrate` OR exported for testability — see § Spec gaps surfaced for VERIFIER)

#### U-m7e-006 — success (migrator v3 back-fill — payload missing `firstBrickShown` AND has bricks → back-fills to `true`)

GIVEN a raw v3 payload `{ schemaVersion: 3, blocks: [{ id: "B1", bricks: [validBrick], ... }], looseBricks: [], deletions: {}, history: {}, programStart: "2026-05-01", currentDate: "2026-05-20", categories: [] }` (no `firstBrickShown` field).
WHEN `migrate(raw)` is invoked.
THEN the returned state has `firstBrickShown === true` (the `hasAnyBrick` projection short-circuits to `true`).
Tested by: `lib/persist.test.ts`

#### U-m7e-007 — success (migrator v3 back-fill — payload missing `firstBrickShown` AND has NO bricks → back-fills to `false`)

GIVEN a raw v3 payload with `blocks: [{ id: "B1", bricks: [] }]`, `looseBricks: []`, no `firstBrickShown` field.
WHEN `migrate(raw)` is invoked.
THEN the returned state has `firstBrickShown === false`.
Tested by: `lib/persist.test.ts`

#### U-m7e-008 — success (migrator v3 round-trip — `firstBrickShown` present is preserved verbatim)

GIVEN a raw v3 payload with `firstBrickShown: true` AND `blocks: [], looseBricks: []` (the no-bricks-but-flag-already-true case); AND separately a raw v3 payload with `firstBrickShown: false` AND `blocks: [{ id: "B1", bricks: [validBrick] }]` (the has-bricks-but-flag-explicitly-false case — defensive).
WHEN `migrate(raw)` is invoked for each.
THEN the first returns `firstBrickShown === true`; the second returns `firstBrickShown === false` (the explicit value is preserved — `hasAnyBrick` is the fallback only when the field is absent).
Tested by: `lib/persist.test.ts`

#### U-m7e-009 — success (migrator v2 → v3 cascade applies `hasAnyBrick` back-fill)

GIVEN a raw v2 payload `{ schemaVersion: 2, blocks: [{ id: "B1", bricks: [validBrick] }], looseBricks: [], deletions: {}, programStart: "2026-05-01", categories: [] }` (v2 has no `history` map yet, no `firstBrickShown`).
WHEN `migrate(raw)` is invoked.
THEN the returned state is v3-projected AND has `firstBrickShown === true` (the back-fill rule applies at the v3 terminus).
Tested by: `lib/persist.test.ts`

#### U-m7e-010 — success (migrator v1 → v3 cascade lands at `firstBrickShown: false`)

GIVEN a raw v1 payload `{ schemaVersion: 1, blocks: [{ id: "B1", bricks: [] }], programStart: "2026-05-01", categories: [] }` (v1 has no `looseBricks`, no `deletions`, no `history`, no `firstBrickShown`).
WHEN `migrate(raw)` is invoked.
THEN the returned state is v3-projected AND has `firstBrickShown === false` (no bricks anywhere → `hasAnyBrick` returns `false`).
Tested by: `lib/persist.test.ts`

#### U-m7e-011 — invariant (`SCHEMA_VERSION === 3` — NOT bumped per ADR-044 additive-optional-field rule)

GIVEN the `SCHEMA_VERSION` constant exported from `lib/persist.ts`.
WHEN the test imports and asserts the value.
THEN `expect(SCHEMA_VERSION).toBe(3)` passes (no bump to 4).
Tested by: `lib/persist.test.ts`

#### U-m7e-012 — invariant (`defaultPersisted().firstBrickShown === false`)

GIVEN the `defaultPersisted()` function exported from `lib/persist.ts`.
WHEN the test invokes it.
THEN the returned object has `firstBrickShown === false` (NOT `undefined`, NOT `true`).
Tested by: `lib/persist.test.ts`

#### U-m7e-013 — invariant (`saveState(state)` writes `firstBrickShown` to JSON, defaulting to `false` when `undefined`)

GIVEN a state with `firstBrickShown: true`, a state with `firstBrickShown: false`, and a state with `firstBrickShown: undefined`.
WHEN `saveState(state)` is invoked for each (with a spy on `localStorage.setItem` OR a read-back via `localStorage.getItem`).
THEN the written JSON contains `"firstBrickShown": true`, `"firstBrickShown": false`, and `"firstBrickShown": false` respectively (the `?? false` fallback applies for `undefined`).
Tested by: `lib/persist.test.ts`

#### U-m7e-014 — invariant (defensive — corrupted `firstBrickShown` (string OR number) falls through to `hasAnyBrick` back-fill; no crash)

GIVEN raw v3 payloads with `firstBrickShown: "yes"` AND `firstBrickShown: 1` AND `blocks: [], looseBricks: []`.
WHEN `migrate(raw)` is invoked for each.
THEN neither call throws; both return states with `firstBrickShown === false` (the `typeof === "boolean"` type-guard rejects the corrupted values; the back-fill projects from `hasAnyBrick` → `false`).
Tested by: `lib/persist.test.ts`

#### U-m7e-015 — invariant (`projectToAppState(p)` carries `firstBrickShown` through from PersistedState to AppState)

GIVEN a PersistedState `{ schemaVersion: 3, firstBrickShown: true, ... }`.
WHEN `projectToAppState(p)` is invoked.
THEN the returned AppState has `firstBrickShown === true` (the field is carried through; not dropped on projection).
Tested by: `lib/usePersistedState.test.tsx`

#### U-m7e-016 — invariant (`toPersisted(s)` carries `firstBrickShown` back from AppState to PersistedState)

GIVEN an AppState `{ ...standing, firstBrickShown: true }`.
WHEN `toPersisted(s)` is invoked.
THEN the returned PersistedState has `firstBrickShown === true` (the field is carried back; not dropped on save).
Tested by: `lib/usePersistedState.test.tsx`

### Component (Vitest + Testing Library)

`C-m7e-001..005` exercise `<FirstBrickCard>` — the visible/hidden truth table + auto-dismiss + tap-dismiss + PRM cadence. `C-m7e-006..011` exercise `<BrandMarkLongPress>` — the 600 ms threshold + drift-cancel + tap-no-op + release-closes + PRM opacity-fade + haptics. `C-m7e-012..014` exercise `<YearHeatmapPreview>` — the 12-MonthCell grid + ADR-046 clock-purity + the dialog a11y attributes. `C-m7e-015..022` exercise `<Toaster>` — empty-mount + each kind variant + auto-dismiss + last-write-wins + z-index + PRM. `C-m7e-023..024` exercise `<TopBar>` + `<BrandMarkLongPress>` integration — optional-state-prop wrapping + ADR-031 ≥44 px button. `C-m7e-025..028` exercise `<BuildingClient>` first-brick-card mount logic — 0→1 transition + idempotence + hydration cases. `C-m7e-029..032` exercise `<BuildingClient>` toast-emit at the four dispatch sites. `C-m7e-033` exercises the rejected-dispatch-no-toast invariant. `C-m7e-034` exercises the SG-m7e-05 ratification anchor (M6 reorder snap-back does NOT fire a toast — plan baseline). `C-m7e-035` exercises `<AppShell>` Toaster persistence across view switches.

#### C-m7e-001 — invariant (`<FirstBrickCard visible={false} />` renders `null`)

GIVEN a `<FirstBrickCard>` with `visible={false}`.
WHEN the test renders it.
THEN `screen.queryByTestId("first-brick-card")` returns `null` AND `container.firstChild === null` (the component returns `null`, not an empty wrapper or hidden node).
Tested by: `components/FirstBrickCard.test.tsx`

#### C-m7e-002 — success (`<FirstBrickCard visible={true} />` renders the headline with `role="status"` + `aria-live="polite"`)

GIVEN a `<FirstBrickCard>` with `visible={true}` and an `onDismiss` mock.
WHEN the test renders it.
THEN the rendered element has `data-testid="first-brick-card"`, text containing `"Your Empire begins."`, `role="status"`, `aria-live="polite"`, AND a `font-family` referencing `var(--font-display)` (Instrument Serif).
Tested by: `components/FirstBrickCard.test.tsx`

#### C-m7e-003 — invariant (`<FirstBrickCard visible={true}>` auto-dismisses after exactly 3000 ms — single onDismiss call)

GIVEN `vi.useFakeTimers()` + a `<FirstBrickCard visible={true} onDismiss={onDismiss} />`.
WHEN the test runs `vi.advanceTimersByTimeAsync(2999)` then `vi.advanceTimersByTimeAsync(1)` then `vi.advanceTimersByTimeAsync(5000)`.
THEN `onDismiss` is called `0` times at 2999 ms, `1` time at 3000 ms, AND `1` time at 8000 ms (the timer fires exactly once; subsequent advances do not re-fire).
Tested by: `components/FirstBrickCard.test.tsx`

#### C-m7e-004 — success (`<FirstBrickCard>` tap-on-body fires `onDismiss` AND cancels the auto-dismiss timer)

GIVEN `vi.useFakeTimers()` + a mounted `<FirstBrickCard visible={true} onDismiss={onDismiss} />`.
WHEN `fireEvent.click(screen.getByTestId("first-brick-card"))` runs at t=0 then `vi.advanceTimersByTimeAsync(5000)`.
THEN `onDismiss` is called exactly once (synchronously on tap) AND the auto-dismiss timeout is cleared (no second call at t=3000).
Tested by: `components/FirstBrickCard.test.tsx`

#### C-m7e-005 — invariant (under PRM, `<FirstBrickCard>` opacity-fades 200 ms linear — no transform)

GIVEN `useReducedMotion` mocked to return `true` (or `prefersReducedMotion={true}` per the plan-baseline prop signature).
WHEN the test renders `<FirstBrickCard visible={true} ... />`.
THEN the rendered `motion.div` has NO `transform: translateY(...)` style (the Framer `animate` prop has NO `y` axis) AND the transition is `duration: 0.2, ease: "linear"` (or an inline CSS `transition: opacity 200ms linear` per `globals.css`'s PRM media-query block).
Tested by: `components/FirstBrickCard.test.tsx`

#### C-m7e-006 — success (`<BrandMarkLongPress>` 600 ms hold opens `<YearHeatmapPreview>`)

GIVEN `vi.useFakeTimers()` + a mounted `<BrandMarkLongPress state={fixtureState}>BRAND</BrandMarkLongPress>` AND `fireEvent.pointerDown(...)` at t=0.
WHEN the test runs `vi.advanceTimersByTimeAsync(599)` then `vi.advanceTimersByTimeAsync(1)`.
THEN `screen.queryByTestId("year-heatmap-preview")` is `null` at 599 ms AND a real element at 600 ms.
Tested by: `components/BrandMarkLongPress.test.tsx`

#### C-m7e-007 — invariant (`<BrandMarkLongPress>` short tap (pointerUp < 600 ms) → no overlay)

GIVEN `vi.useFakeTimers()` + a mounted `<BrandMarkLongPress>`. Pointer down at t=0; `vi.advanceTimersByTimeAsync(400)`; `fireEvent.pointerUp(...)` at t=400; `vi.advanceTimersByTimeAsync(1000)`.
WHEN the test queries the overlay.
THEN `screen.queryByTestId("year-heatmap-preview")` is `null` throughout (the tap path is a no-op).
Tested by: `components/BrandMarkLongPress.test.tsx`

#### C-m7e-008 — invariant (`<BrandMarkLongPress>` drift-cancel — `pointerLeave` OR `pointerCancel` < 600 ms → no overlay)

GIVEN `vi.useFakeTimers()` + a mounted `<BrandMarkLongPress>`. Two parallel test bodies: (a) Pointer down at t=0; advance 400 ms; `fireEvent.pointerLeave(...)`; advance 1000 ms. (b) Pointer down at t=0; advance 400 ms; `fireEvent.pointerCancel(...)`; advance 1000 ms.
WHEN the test queries the overlay in each.
THEN both queries return `null` (the drift-cancel path is honored).
Tested by: `components/BrandMarkLongPress.test.tsx`

#### C-m7e-009 — success (`<BrandMarkLongPress>` release (`pointerUp`) AFTER overlay open closes it)

GIVEN the post-`C-m7e-006` state (overlay visible at t≥600 ms).
WHEN `fireEvent.pointerUp(...)` fires at t=800 ms.
THEN `screen.queryByTestId("year-heatmap-preview")` returns `null` (the overlay closes on release).
Tested by: `components/BrandMarkLongPress.test.tsx`

#### C-m7e-010 — invariant (under PRM, `<BrandMarkLongPress>` opens overlay with opacity-fade — no scale)

GIVEN `useReducedMotion` mocked to return `true`.
WHEN the 600 ms hold sequence runs and the overlay mounts.
THEN the `<YearHeatmapPreview>` overlay has NO `transform: scale(...)` style applied (the Framer `animate` prop has NO `scale` axis) AND the transition is opacity-only (200 ms linear).
Tested by: `components/BrandMarkLongPress.test.tsx`

#### C-m7e-011 — invariant (`<BrandMarkLongPress>` invokes `haptics.light()` exactly once on 600 ms threshold)

GIVEN `vi.mock("@/lib/haptics", ...)` with `haptics.light = vi.fn()` AND `vi.useFakeTimers()`.
WHEN the 600 ms hold sequence runs.
THEN `haptics.light` is called exactly once (NOT on `pointerDown`, NOT twice — fires on threshold elapse).
Tested by: `components/BrandMarkLongPress.test.tsx`

#### C-m7e-012 — success (`<YearHeatmapPreview>` renders 12 `<MonthCell>` instances; re-uses M9e primitive per SG-m7e-02)

GIVEN a fixture state with a non-empty `history` map (or empty — the cells render regardless).
WHEN the test renders `<YearHeatmapPreview state={fixtureState} />`.
THEN `screen.queryByTestId("year-heatmap-preview")` is a real element AND it contains exactly 12 `<MonthCell>` instances (verified via `screen.queryAllByTestId("month-cell")` length `=== 12` OR via counting `[data-month-index]` attributes 0..11). The source file `components/YearHeatmapPreview.tsx` imports `<MonthCell>` from `components/MonthCell.tsx` (verified via source inspection) and does NOT import `<YearView>`.
Tested by: `components/YearHeatmapPreview.test.tsx`

#### C-m7e-013 — invariant (`<YearHeatmapPreview>` reads from `state` only — ADR-046 clock-purity)

GIVEN the `components/YearHeatmapPreview.tsx` source file AND a spy on `Date.now` / `new Date()`.
WHEN the file is inspected (regex `/Date\.now\b|new Date\b|useNow\b/`) AND the test renders the component with `Date.now` mocked to a 2030 timestamp.
THEN the source file has zero matches for clock helpers (the component derives "this year" from `state.currentDate`, per ADR-046) AND the rendered output's MonthCell scores are identical to a render with `Date.now` mocked to a 2026 timestamp (deterministic from `state`).
Tested by: `components/YearHeatmapPreview.test.tsx`

#### C-m7e-014 — invariant (`<YearHeatmapPreview>` overlay has `role="dialog"` + `aria-modal="true"` + `aria-label`; grid is `aria-hidden`)

GIVEN a mounted `<YearHeatmapPreview state={fixtureState} />`.
WHEN the test queries the overlay root + the grid container.
THEN the overlay root carries `role="dialog"`, `aria-modal="true"`, `aria-label="Year heatmap preview"`; the inner grid container has `aria-hidden="true"` (peek-only, no nav).
Tested by: `components/YearHeatmapPreview.test.tsx`

#### C-m7e-015 — invariant (`<Toaster />` mounts hidden when no `toast(...)` call has fired)

GIVEN a freshly rendered `<Toaster />` with no prior `toast(...)` invocation.
WHEN the test queries the DOM.
THEN `screen.queryByTestId("toaster")` is a real element (container) AND `screen.queryByTestId("toast")` is `null` (no visible toast child).
Tested by: `components/Toaster.test.tsx`

#### C-m7e-016 — success (`<Toaster />` + `toast("hello", "success")` mounts a toast with `role="status"` + `aria-live="polite"`)

GIVEN a mounted `<Toaster />`.
WHEN the test invokes the exported `toast("hello", "success")`.
THEN `screen.queryByTestId("toast")` is a real element with text containing `"hello"`, `role="status"`, AND `aria-live="polite"`.
Tested by: `components/Toaster.test.tsx`

#### C-m7e-017 — success (`<Toaster />` + `toast("oops", "error")` mounts a toast with `role="alert"` + `aria-live="assertive"` — SG-m7e-03)

GIVEN a mounted `<Toaster />`.
WHEN the test invokes `toast("oops", "error")`.
THEN the rendered toast has text `"oops"`, `role="alert"`, AND `aria-live="assertive"` (NOT `role="status"`, NOT `aria-live="polite"` — per SG-m7e-03 resolution).
Tested by: `components/Toaster.test.tsx`

#### C-m7e-018 — success (`<Toaster />` + `toast("info-msg", "info")` mounts a toast with `role="status"` + `aria-live="polite"`)

GIVEN a mounted `<Toaster />`.
WHEN the test invokes `toast("info-msg", "info")`.
THEN the rendered toast has text `"info-msg"`, `role="status"`, AND `aria-live="polite"` (info shares polite-live-region with success per SG-m7e-03; the kind discriminant beyond role is the border color).
Tested by: `components/Toaster.test.tsx`

#### C-m7e-019 — invariant (`<Toaster />` auto-dismisses each toast after exactly 2000 ms)

GIVEN `vi.useFakeTimers()` + a mounted `<Toaster />` + `toast("hello", "success")` at t=0.
WHEN the test runs `vi.advanceTimersByTimeAsync(1999)` then `vi.advanceTimersByTimeAsync(1)`.
THEN `screen.queryByTestId("toast")` is a real element at 1999 ms AND `null` at 2000 ms.
Tested by: `components/Toaster.test.tsx`

#### C-m7e-020 — invariant (`<Toaster />` last-write-wins — two rapid `toast(...)` calls show only the latest AND the timer resets)

GIVEN `vi.useFakeTimers()` + a mounted `<Toaster />`. `toast("first", "success")` at t=0; `vi.advanceTimersByTimeAsync(1000)`; `toast("second", "info")` at t=1000.
WHEN the test queries the DOM at t=1000 (immediately after the second emit), then `vi.advanceTimersByTimeAsync(1999)` → t=2999, then `vi.advanceTimersByTimeAsync(1)` → t=3000.
THEN at t=1000 there is exactly 1 toast with text `"second"` (NOT `"first"`); at t=2999 the toast is STILL visible (the 2000 ms timer was reset to start at t=1000 — dismissal at t=3000, not t=2000); at t=3000 the toast is unmounted.
Tested by: `components/Toaster.test.tsx`

#### C-m7e-021 — invariant (`<Toaster />` container z-index is 30 — SG-m7e-04 stacking contract)

GIVEN a mounted `<Toaster />` with a visible toast.
WHEN the test reads the toast container's computed style.
THEN `window.getComputedStyle(container).zIndex === "30"` (or the inline-style `z-index: 30`); NOT `50` (would overlap sheets), NOT `20` (would be hidden by dock).
Tested by: `components/Toaster.test.tsx`

#### C-m7e-022 — invariant (under PRM, `<Toaster />` toast appears instantly — no slide animation)

GIVEN `useReducedMotion` mocked to return `true` + a mounted `<Toaster />`.
WHEN `toast("instant", "success")` runs.
THEN the rendered toast `motion.div` has NO `transform: translateY(...)` style AND the transition is `transition: none` (or `duration: 0`).
Tested by: `components/Toaster.test.tsx`

#### C-m7e-023 — invariant (`<TopBar state={state}>` wraps brand-mark with `<BrandMarkLongPress>`; `<TopBar />` without `state` renders un-wrapped — backwards compat)

GIVEN two render paths: (a) `<TopBar state={fixtureState} />` AND (b) `<TopBar />` (no state prop).
WHEN the test queries each.
THEN (a) has `screen.queryByTestId("brand-mark-longpress")` returning a real element AND the "DHARMA" text inside it; (b) has `screen.queryByTestId("brand-mark-longpress")` returning `null` AND the "DHARMA" text rendered directly inside `<TopBar>` (backwards compat with existing M0/M5 test fixtures).
Tested by: `components/TopBar.test.tsx`

#### C-m7e-024 — invariant (`<BrandMarkLongPress>` wrapper is `<button>` with `aria-label` AND height ≥ 44 px — ADR-031)

GIVEN a mounted `<BrandMarkLongPress state={fixtureState}>BRAND</BrandMarkLongPress>`.
WHEN the test inspects the wrapper.
THEN the wrapper's `tagName === "BUTTON"` AND `aria-label="DHARMA — long-press for year heatmap"` AND its `getBoundingClientRect().height >= 44` (or computed `padding-block` makes the layout ≥44 px; fallback `style.minHeight === "44px"`).
Tested by: `components/BrandMarkLongPress.test.tsx`

#### C-m7e-025 — success (`<BuildingClient>` mounts `<FirstBrickCard visible={true}>` on 0 → 1 brick transition AND prior `firstBrickShown !== true`)

GIVEN `<BuildingClient initialState={stateWithZeroBricksAndFlagFalse} />` rendered.
WHEN initial render queries the DOM, THEN `act(() => dispatch({ type: "ADD_BRICK", brick: validBrickFixture }))` runs.
THEN initial render → `screen.queryByTestId("first-brick-card")` is `null` (no card; `brickCount === 0`); post-dispatch render → `screen.queryByTestId("first-brick-card")` is a real element with text `"Your Empire begins."` (the 0→1 transition fired the card).
Tested by: `app/(building)/BuildingClient.test.tsx`

#### C-m7e-026 — invariant (`<BuildingClient>` does NOT re-mount `<FirstBrickCard>` on second `ADD_BRICK` — `firstBrickShown` now `true`)

GIVEN the post-`C-m7e-025` state (`firstBrickShown === true`, card may have auto-dismissed or been tap-dismissed).
WHEN `act(() => dispatch({ type: "ADD_BRICK", brick: anotherBrick }))` runs.
THEN `screen.queryByTestId("first-brick-card")` remains `null` (the card does not re-fire on subsequent bricks).
Tested by: `app/(building)/BuildingClient.test.tsx`

#### C-m7e-027 — invariant (`<BuildingClient>` does NOT mount `<FirstBrickCard>` on hydration into `firstBrickShown === true` AND `brickCount > 0`)

GIVEN `<BuildingClient initialState={stateWithBricksAndFlagTrue} />` rendered (existing user with bricks, backfilled).
WHEN the test queries the DOM at first paint AND after `vi.advanceTimersByTimeAsync(5000)`.
THEN `screen.queryByTestId("first-brick-card")` is `null` at both timestamps (the 0→1 transition predicate is false on hydration; the previous-render ref initializes to the hydrated flag value).
Tested by: `app/(building)/BuildingClient.test.tsx`

#### C-m7e-028 — invariant (`<BuildingClient>` defensive — hydration into `firstBrickShown === false` AND `brickCount > 0` does NOT fire the card)

GIVEN `<BuildingClient initialState={stateWithBricksAndFlagFalse} />` rendered (defensive corruption case — bricks present but flag is `false`).
WHEN the test queries the DOM at first paint.
THEN `screen.queryByTestId("first-brick-card")` is `null` (the 0→1 transition is the gate; `brickCount` was NEVER 0 on this mount — the predicate never satisfies).
Tested by: `app/(building)/BuildingClient.test.tsx`

#### C-m7e-029 — success (`<BuildingClient>` invokes `toast("Block created", "success")` after `ADD_BLOCK` dispatch)

GIVEN `vi.mock("@/components/Toaster", () => ({ toast: vi.fn(), Toaster: () => null }))` + `<BuildingClient initialState={...} />` rendered.
WHEN `act(() => triggerAddBlock(...))` runs (via the M5/M4d block-creation UI gesture or a direct dispatch).
THEN `toast` is called exactly once with arguments `("Block created", "success")`.
Tested by: `app/(building)/BuildingClient.test.tsx`

#### C-m7e-030 — success (`<BuildingClient>` invokes `toast("Block deleted", "info")` after `DELETE_BLOCK_TODAY` OR `DELETE_BLOCK_ALL` dispatch)

GIVEN the toast mock + a state with at least one block.
WHEN `act(() => triggerDeleteBlockJustToday(...))` AND separately `act(() => triggerDeleteBlockAll(...))`.
THEN each call results in `toast` being called once with `("Block deleted", "info")` (both delete branches share the message).
Tested by: `app/(building)/BuildingClient.test.tsx`

#### C-m7e-031 — success (`<BuildingClient>` invokes `toast("Brick added", "success")` after `ADD_BRICK` dispatch)

GIVEN the toast mock + a state.
WHEN `act(() => triggerAddBrick(validBrickFixture))` runs.
THEN `toast` is called exactly once with arguments `("Brick added", "success")`.
Tested by: `app/(building)/BuildingClient.test.tsx`

#### C-m7e-032 — success (`<BuildingClient>` invokes `toast("Brick deleted", "info")` after `DELETE_BRICK` dispatch)

GIVEN the toast mock + a state with at least one brick.
WHEN `act(() => triggerDeleteBrick(...))` runs.
THEN `toast` is called exactly once with arguments `("Brick deleted", "info")`.
Tested by: `app/(building)/BuildingClient.test.tsx`

#### C-m7e-033 — invariant (rejected `ADD_BRICK` dispatch does NOT invoke `toast(...)` — happy-path-only emit)

GIVEN the toast mock + a state + `invalidBrickFixture` that violates the brick-validity guard or the M4e overlap engine.
WHEN `act(() => triggerAddBrick(invalidBrickFixture))` runs AND the dispatch is rejected at the form-validation layer (no dispatch fires).
THEN `toast` is called zero times.
Tested by: `app/(building)/BuildingClient.test.tsx`

#### C-m7e-034 — invariant (M6 `REORDER_BLOCK` overlap-rejection snap-back does NOT fire a toast — SG-m7e-05 ratification anchor; plan baseline = no toast)

GIVEN the toast mock + a `<DraggableTimelineBlock>` mounted with M6's drag harness + a state with two adjacent blocks whose intervals overlap on drag.
WHEN the test fires a drag-and-drop sequence ending on the overlapping target (triggering the M6 snap-back path with its existing haptic + aria-live announce).
THEN `toast` is called zero times. NOTE: per dispatch prompt, this anchors the PLAN BASELINE behavior; VERIFIER may ratify the alternative (error toast on snap-back) per SG-m7e-05 — in which case the expected count flips to `1` and the assertion amends mechanically (see § Spec gaps surfaced for VERIFIER).
Tested by: `components/DraggableTimelineBlock.test.tsx` (M6 harness) OR `app/(building)/BuildingClient.test.tsx`

#### C-m7e-035 — invariant (`<AppShell />` mounts `<Toaster />` as `<ViewSwitcher>` sibling; Toaster persists across Day → Week → Month → Year → Day view switches)

GIVEN `<AppShell ... />` rendered (initial view: Day).
WHEN the test queries `screen.queryByTestId("toaster")` at initial mount, captures its element reference `t1`, then drives the view switcher through Week → Month → Year → Day (via `fireEvent.click` on the dock view buttons OR controlled `currentView` prop), querying the toaster reference at each transition.
THEN the toaster reference identity is preserved at every transition (`screen.queryByTestId("toaster") === t1` is `true` after each view switch — proves the component is NOT remounted, i.e., it lives outside the view-branch ternary).
Tested by: `app/(building)/AppShell.test.tsx`

### Accessibility (axe via Playwright) — deferred to preview

`A-m7e-001..005` exercise the accessibility of the three new narrative surfaces + the Toaster under real-browser conditions on the Vercel preview — axe-clean during FirstBrickCard visibility, axe-clean during YearHeatmapPreview overlay, axe-clean for each Toaster kind variant, BrandMarkLongPress button is keyboard-focusable with accessible name, and the polite + assertive live-regions announce exactly once per emit (no double announcement).

#### A-m7e-001 — invariant (preview — page with `<FirstBrickCard visible={true}>` mounted is axe-clean)

GIVEN a Vercel preview page in a state where the FirstBrickCard is visible (`firstBrickShown === false` + `brickCount > 0` after a real `ADD_BRICK`).
WHEN axe scans the page.
THEN zero violations (the `role="status"` + `aria-live="polite"` + tap-target ≥44 px + contrast on `var(--ink)` / `var(--card)` all pass).
Tested by: `tests/e2e/m7e.spec.ts` (preview-deferred)

#### A-m7e-002 — invariant (preview — page with `<YearHeatmapPreview>` overlay mounted is axe-clean)

GIVEN a Vercel preview page with the year-heatmap overlay open (long-press the brand mark for 600 ms via a real touch event).
WHEN axe scans the page.
THEN zero violations (the `role="dialog"` + `aria-modal="true"` + `aria-label="Year heatmap preview"` + `aria-hidden="true"` on the inner grid all pass).
Tested by: `tests/e2e/m7e.spec.ts` (preview-deferred)

#### A-m7e-003 — invariant (preview — page with each Toaster kind variant (success / info / error) is axe-clean)

GIVEN a Vercel preview page where the test triggers each of the four toast events (block-add → success; block-delete → info; brick-add → success; brick-delete → info) AND a manually-induced error toast (via a test-harness `toast("err", "error")` injection if available, OR via the SG-m7e-05 alternative path if VERIFIER ratifies).
WHEN axe scans the page during each toast's visible window.
THEN zero violations per kind variant. The polite live-region announces exactly once per success/info emit; the assertive live-region announces exactly once per error emit (verified via the AT-announcement timing — Playwright's `aria-live` region snapshot at t=0 and t=500 ms shows the message appears once).
Tested by: `tests/e2e/m7e.spec.ts` (preview-deferred)

#### A-m7e-004 — invariant (preview — `<BrandMarkLongPress>` wrapper is keyboard-focusable with accessible name)

GIVEN a Vercel preview page rendered to the Day view.
WHEN the test tab-navigates to the brand mark.
THEN the focus lands on the `<button>` wrapper; the accessible name resolves to `"DHARMA — long-press for year heatmap"` (verified via `page.evaluate(() => document.activeElement?.ariaLabel)`); the bounding rect height is ≥ 44 px (ADR-031). NOTE: per plan § a11y, keyboard activation (Enter / Space) is documented as a NO-OP — the easter egg is touch-driven only; this is a known a11y debt accepted by the spec ("long-press is the only entry").
Tested by: `tests/e2e/m7e.spec.ts` (preview-deferred)

#### A-m7e-005 — invariant (preview — `var(--cat-9)` (error-toast border) on `var(--card)` meets WCAG AA non-text contrast)

GIVEN a Vercel preview page with an error-kind toast visible.
WHEN the test reads the toast's border-color + background-color via `page.evaluate(getComputedStyle)` AND computes the contrast ratio.
THEN the contrast ratio of `var(--cat-9)` (red) against `var(--card)` is `>= 3.0` (WCAG AA non-text contrast). The success-toast (`var(--accent)`) and info-toast (`var(--ink-dim)`) borders are similarly audited.
Tested by: `tests/e2e/m7e.spec.ts` (preview-deferred)

### E2E (Playwright, deferred-to-preview)

`E-m7e-001..007` exercise the M7e narrative surfaces on a real-browser, production-build Vercel preview deployment — real touch-event long-press timing, real `ADD_BRICK` → card-slide-in → auto-dismiss, real toast on add/delete events, PRM emulation, no console errors, AND Lighthouse Perf ≥ 90.

#### E-m7e-001 — success (preview — real touch on brand mark for ≥600 ms opens year-heatmap overlay; release closes)

GIVEN a Vercel preview Chromium page rendered to the Day view.
WHEN `page.touchscreen.tap(brandMarkX, brandMarkY)` with a 700 ms hold (via `await page.mouse.down()` + `page.waitForTimeout(700)` + `page.mouse.up()` OR `page.dispatchEvent` for pointer events).
THEN `page.locator('[data-testid="year-heatmap-preview"]')` becomes visible AT 600 ms; releases (pointerUp) at 700 ms → overlay hides within the next 200 ms.
Tested by: `tests/e2e/m7e.spec.ts`

#### E-m7e-002 — success (preview — first real `ADD_BRICK` mounts FirstBrickCard which slides in + auto-dismisses after 3000 ms)

GIVEN a Vercel preview page with cleared localStorage (fresh user — `firstBrickShown === false`, no bricks).
WHEN the test fires a real UI gesture to add a brick (tap "+" → pick "brick" → tap "Save"), waits 100 ms for the slide-in, captures a screenshot of the visible card, then waits 3000 ms.
THEN `page.locator('[data-testid="first-brick-card"]')` becomes visible within 200 ms; the visible text contains `"Your Empire begins."`; the card unmounts by t=3300 ms (3000 ms timer + 200 ms exit anim).
Tested by: `tests/e2e/m7e.spec.ts`

#### E-m7e-003 — success (preview — real `ADD_BRICK` AND real `DELETE_BRICK` each fire a toast)

GIVEN a Vercel preview page in a state with at least one block.
WHEN the test fires a real `ADD_BRICK` gesture (tap "+" → "brick" → "Save"), captures the toast's text + ARIA attributes at t=100 ms, waits for dismissal, then fires a real `DELETE_BRICK` gesture (long-press the brick → delete sheet → confirm).
THEN after `ADD_BRICK`, the toast text is `"Brick added"`, role is `"status"`, aria-live is `"polite"`. After `DELETE_BRICK`, the toast text is `"Brick deleted"`, role is `"status"`, aria-live is `"polite"`. Each toast dismisses within 2200 ms.
Tested by: `tests/e2e/m7e.spec.ts`

#### E-m7e-004 — invariant (preview — under PRM, FirstBrickCard opacity-fades + toast renders instant)

GIVEN a Vercel preview page with `page.emulateMedia({ reducedMotion: "reduce" })` + cleared localStorage.
WHEN the test fires `ADD_BRICK` → captures the FirstBrickCard's transform style across t=0..200 ms → fires another action emitting a toast → captures the toast's animate-in across t=0..50 ms.
THEN FirstBrickCard's `transform` has no `translateY(...)` component AT ANY frame; the transition is opacity-only over 200 ms. Toast appears at t=0 with no slide-in animation (no `translateY` styles across frames).
Tested by: `tests/e2e/m7e.spec.ts`

#### E-m7e-005 — invariant (preview — no console errors on any M7e celebration path)

GIVEN a Vercel preview page with `page.on("console")` listener capturing all `error` + `warning` events.
WHEN the test fires each M7e path: `ADD_BRICK` (first + second), long-press brand mark + release, `ADD_BLOCK`, `DELETE_BLOCK_TODAY`, `DELETE_BLOCK_ALL`, `DELETE_BRICK`.
THEN zero console errors across the captured event log; zero React-specific warnings (no "Cannot update a component while rendering a different component", no "Maximum update depth exceeded", no "Each child in a list should have a unique key").
Tested by: `tests/e2e/m7e.spec.ts`

#### E-m7e-006 — invariant (preview — Lighthouse Performance ≥ 90 with M7e overlays exercised)

GIVEN a Vercel preview production-build page with the M7e narrative surfaces exercised once each (single first-brick card fire; single brand-mark long-press cycle; one toast emit).
WHEN Lighthouse runs against the page.
THEN Performance score `>= 90`.
Tested by: `tests/e2e/m7e.spec.ts`

#### E-m7e-007 — invariant (preview — second `ADD_BRICK` after a reload does NOT re-fire FirstBrickCard)

GIVEN a Vercel preview page where the user has dispatched their first `ADD_BRICK` AND the FirstBrickCard has been seen (`firstBrickShown` persisted as `true`).
WHEN the test reloads the page (`page.reload()`) then fires a second `ADD_BRICK` gesture.
THEN `page.locator('[data-testid="first-brick-card"]')` is NOT visible at any frame across the next 5000 ms.
Tested by: `tests/e2e/m7e.spec.ts`

### Sandbox / preview note

The 51 Vitest IDs (`U-m7e-001..016` + `C-m7e-001..035`) run in the sandbox under `npm test` and `npm run test:tz`. The 7 E2E IDs + 5 A11y IDs (`E-m7e-001..007` + `A-m7e-001..005`) are explicitly deferred to the Vercel preview because each requires either a real Chromium frame-rate trace, real `page.emulateMedia` PRM emulation, real `page.touchscreen` long-press timing, real Lighthouse audit, real production-build console-error monitoring, real axe scans against a deployed build, OR all of the above against a deployed-build production bundle (M5b / M9a–M9e / M7a / M7b / M7c / M7d precedent). Authoring all 12 preview-deferred IDs as real `test()` blocks is mandatory — preview-deferred ≠ untested.

### Regression surface

M7e is **additive at every seam** — no existing prop / type / state shape is changed; existing tests stay green with these specific touchpoints (flagged here for VERIFIER as sanctioned-for-amendment per plan § Regression surface):

- **`lib/persist.test.ts`** — existing case-3 v3-round-trip tests need a one-line amendment: the asserted output object now includes `firstBrickShown` (`true` or `false` per the back-fill projection). Diff is small; no behavior change for fields other than the new one. The amendment is structurally inherited from the existing test suite (no separate ID needed beyond `U-m7e-006..010` which exercise the new path directly).
- **`lib/data.test.ts`** — existing `ADD_BRICK` tests need amendment: the returned state now includes `firstBrickShown: true` on the first valid dispatch. Tests that assert `expect(result).toEqual({ ...state, blocks: ... })` need to be updated to `expect(result).toEqual({ ...state, blocks: ..., firstBrickShown: true })`. Diff is mechanical and scoped to the `ADD_BRICK` arm's existing test rows; structurally inherited from `U-m7e-001..004` covering the new behavior directly.
- **`lib/usePersistedState.test.tsx`** — round-trip tests need the field included in the asserted shape; mechanical amendment. Structurally inherited from `U-m7e-015..016`.
- **`components/TopBar.test.tsx`** — existing M0/M5 tests render `<TopBar />` without `state`; under the new optional prop, the brand mark renders un-wrapped — these tests stay green byte-identical. `C-m7e-023` adds the new wrapped-path assertion.
- **`app/(building)/BuildingClient.test.tsx`** — existing dispatch tests need to either (a) mock `toast(...)` via `vi.mock("@/components/Toaster", ...)` at the top of the file or (b) accept the side-effect (a no-op stubbed Toaster). PLANNER baseline picks (a). Diff is at-the-top-of-file `vi.mock`; no per-test amendment beyond the new IDs `C-m7e-025..033`.
- **`app/(building)/AppShell.test.tsx`** — existing view-switch tests need to confirm `<Toaster />` persists. `C-m7e-035` is the new assertion; existing assertions byte-identical.
- **No M5 / M6 / M7a / M7b / M7c / M7d test** asserts the absence of `firstBrickShown`, `<FirstBrickCard>`, `<BrandMarkLongPress>`, `<Toaster>`, or any new test-id. Additive everywhere.
- **`components/MonthCell.test.tsx`** (M9c precedent) — unchanged. `<YearHeatmapPreview>` composes `<MonthCell>` directly (per SG-m7e-02 resolution) but does NOT modify the MonthCell file or its tests.
- **`components/YearView.test.tsx`** (M9e precedent) — unchanged. SG-m7e-02 explicitly rejected the prop-extension alternative; YearView is byte-identical.

### AC ↔ test-ID mapping (every AC has at least one test ID; every test ID maps to at least one AC)

| AC  | Acceptance criterion (spec § Acceptance criteria, paraphrased)                                                                                                             | Anchoring test IDs                                                                                                                                                                                                                                                                                                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #1  | Card mounts and slides in on the next paint after `ADD_BRICK` dispatches AND `state.firstBrickShown !== true`                                                              | `U-m7e-001` (reducer flips flag), `U-m7e-003` (rejected dispatch does NOT flip), `U-m7e-007` (no-bricks back-fill → flag is false → card eligible), `U-m7e-012` (defaultPersisted = false), `C-m7e-025` (BuildingClient mounts on 0→1 transition), `E-m7e-002` (preview — real `ADD_BRICK` mounts card)                                                                                         |
| #2  | Card displays "Your Empire begins." in the spec'd display type scale                                                                                                       | `C-m7e-002` (headline text + role + font-display)                                                                                                                                                                                                                                                                                                                                               |
| #3  | Card auto-dismisses after 3 s, or on tap                                                                                                                                   | `C-m7e-003` (3000 ms auto-dismiss), `C-m7e-004` (tap-dismiss + cancel-timeout), `E-m7e-002` (preview — auto-dismiss)                                                                                                                                                                                                                                                                            |
| #4  | After dismissal, `state.firstBrickShown === true` is persisted; reload does not re-show                                                                                    | `U-m7e-001` (reducer flips flag), `U-m7e-002` (idempotent on second dispatch), `U-m7e-013` (saveState writes the field), `C-m7e-026` (no re-fire on second brick within same mount), `E-m7e-007` (preview — reload + second brick → no card)                                                                                                                                                    |
| #5  | Existing saved state with at least one brick migrates to `firstBrickShown: true`; card never appears retroactively                                                         | `U-m7e-005` (hasAnyBrick truth table), `U-m7e-006` (v3 back-fill → true), `U-m7e-009` (v2 → v3 back-fill → true), `C-m7e-027` (BuildingClient hydration into existing-user state)                                                                                                                                                                                                               |
| #6  | 600 ms long-press on brand mark opens year-heatmap preview overlay; release closes                                                                                         | `C-m7e-006` (600 ms threshold opens), `C-m7e-009` (release closes), `C-m7e-007` (short tap is no-op), `E-m7e-001` (preview — real touch)                                                                                                                                                                                                                                                        |
| #7  | Drift cancels long-press (no overlay)                                                                                                                                      | `C-m7e-008` (pointerLeave + pointerCancel both cancel)                                                                                                                                                                                                                                                                                                                                          |
| #8  | Overlay re-uses M9e's year-heatmap rendering at reduced scale; no new third-party dependency                                                                               | `C-m7e-012` (12 MonthCells composed from M9e primitive — SG-m7e-02), `C-m7e-013` (clock-purity per ADR-046), `C-m7e-014` (dialog a11y attributes)                                                                                                                                                                                                                                               |
| #9  | `toast(message, kind)` mounts a single bottom-anchored toast for 2 s; next call replaces (no queue)                                                                        | `C-m7e-015` (empty mount), `C-m7e-019` (2000 ms auto-dismiss), `C-m7e-020` (last-write-wins + timer reset), `C-m7e-021` (z-30 bottom-anchored)                                                                                                                                                                                                                                                  |
| #10 | Block-add, block-delete, brick-add, brick-delete each emit a toast on successful dispatch with the appropriate message + kind                                              | `C-m7e-029` (block-add), `C-m7e-030` (block-delete), `C-m7e-031` (brick-add), `C-m7e-032` (brick-delete), `E-m7e-003` (preview — real add + delete)                                                                                                                                                                                                                                             |
| #11 | A rolled-back action emits an error-kind toast                                                                                                                             | `C-m7e-033` (PARTIAL — plan-baseline does NOT fire toast on form-validation rejection; the spec AC #11 strict-read is only satisfied today via M6 REORDER_BLOCK overlap-rejection which has its own haptic + aria-live; SG-m7e-05 surfaces this for VERIFIER ratification), `C-m7e-034` (SG-m7e-05 anchor — M6 snap-back currently does NOT fire toast). See § Spec gaps surfaced for VERIFIER. |
| #12 | With `prefers-reduced-motion: reduce`, card slide collapses to linear 200 ms; overlay opacity-fades; toast renders instantly                                               | `C-m7e-005` (FirstBrickCard PRM), `C-m7e-010` (overlay PRM opacity-fade), `C-m7e-022` (toast PRM instant), `E-m7e-004` (preview — PRM emulation)                                                                                                                                                                                                                                                |
| #13 | `tsc --noEmit` clean; ESLint 0 errors (≤13 warnings); full Vitest + `test:tz` green; covers card-once + migrator-3-cases + drift-cancel + last-write-wins + reduced-motion | `U-m7e-001..016` + `C-m7e-001..035` + **gate (`npm run eval`)**                                                                                                                                                                                                                                                                                                                                 |
| #14 | E2E (Playwright, deferred-to-preview): Lighthouse Perf ≥ 90; brand-mark long-press opens overlay on real touch; toast renders + dismisses on real brick-add                | `E-m7e-001` (real touch long-press), `E-m7e-003` (real brick-add toast), `E-m7e-006` (Lighthouse Perf ≥ 90), `A-m7e-001..005`                                                                                                                                                                                                                                                                   |
| #15 | No regression to M1–M9e / M5b / M7a / M7b / M7c / M7d behavior                                                                                                             | `C-m7e-023` (TopBar backwards-compat — un-wrapped path), `C-m7e-027` (hydration into existing-user state), § Regression surface amendments + **gate (`npm run eval`)**                                                                                                                                                                                                                          |

**Gate-verified portion:** AC #13's quality-gate half (`tsc` / ESLint / full-Vitest / `test:tz`) — consistent with M5/M6/M8/M9a–M9e/M7a/M7b/M7c/M7d precedent. AC #15's no-regression half is anchored by the sanctioned amendments in § Regression surface (all eight surfaces are byte-identical at the existing-test level except for the mechanical `firstBrickShown` field additions in persist/data/usePersistedState round-trip assertions, plus the new toast mock in BuildingClient tests). All other 13 ACs map to at least one bespoke `m7e` test ID; every `m7e` test ID maps back to at least one AC.

**Edge-case coverage (plan.md § Edge cases table + spec § Edge cases):** User adds first brick, reloads, adds another → no re-fire → `U-m7e-013` + `C-m7e-026` + `E-m7e-007`; Existing saved state with bricks (v3 payload pre-M7e) → `U-m7e-006`, `C-m7e-027`; Existing saved state with no bricks → `U-m7e-007`; Long-press drift-cancel → `C-m7e-008`; Long-press during sheet open → not separately asserted (plan baseline accepts the observable z-stack behavior — overlay hidden by sheet; documented in plan § Edge cases); Toast on rolled-back action → `C-m7e-033`, `C-m7e-034` + SG-m7e-05 ratification; Multiple rapid actions → `C-m7e-020`; `prefers-reduced-motion: reduce` → `C-m7e-005`, `C-m7e-010`, `C-m7e-022`, `E-m7e-004`; Hydration into `firstBrickShown: true` → `C-m7e-027`; `firstBrickShown` corruption → `U-m7e-014`; Brand-mark long-press at 430 px with no bricks (empty state) → structurally covered by `C-m7e-012` with a no-bricks fixture (renders 12 MonthCells with NO_DATA scores; no crash); Toast fires from non-Day view → out of scope per plan § Edge cases; `<Toaster>` mounted but no toast fired → `C-m7e-015`; Long-press → release → immediate long-press again → not separately covered (M4c's `useLongPress` reset on `pointerUp` is structurally inherited from `C-m7e-006..009` sequence); First-brick auto-dismiss vs. user-tap race → `C-m7e-004` (tap cancels the timeout — both fire `onDismiss`, React batches); PRM toggle mid-card-display → documented limitation, not separately tested (same shape as M7d's PRM-toggle-mid-fireworks limitation, status.md open loop); Idempotent flag flip → `U-m7e-002`. Edge cases not separately covered are documented as structurally inherited — VERIFIER may ask for additional IDs if any warrants its own GIVEN/WHEN/THEN.

### Spec gaps surfaced for VERIFIER

The plan resolves **all four** of the spec's named gaps in-plan (SG-m7e-01..04 — see plan.md § Resolutions to the 4 Open Spec Gaps; SG-m7e-01 RESOLVED via additive-optional-field per ADR-044, anchored by `U-m7e-006..014`; SG-m7e-02 RESOLVED via composition over modification — `<MonthCell>` direct reuse, anchored by `C-m7e-012`; SG-m7e-03 RESOLVED via kind-discriminated role + aria-live, anchored by `C-m7e-016`, `C-m7e-017`, `C-m7e-018`; SG-m7e-04 RESOLVED via z-30 toast + z-40 overlay/card + z-20 dock + z-50 sheets, anchored by `C-m7e-021`). The plan surfaces ONE NEW spec gap (SG-m7e-05) AND the TESTS phase surfaces TWO additional minor ambiguities, all non-blocking — VERIFIER picks freely.

1. **SG-m7e-05 (PLANNER-surfaced; ratification anchor) — should the M6 `REORDER_BLOCK` overlap-rejection snap-back path fire an error toast?** Plan baseline: NO (no wiring; the spec AC #11 "rolled-back action emits an error toast" is strictly read as out of M7e scope because the spec-named toast events are only the four happy-path dispatches: block-add, block-delete, brick-add, brick-delete; the M6 snap-back path has its own haptic + aria-live announce per M6 plan, not a toast). `C-m7e-034` anchors the current behavior (no toast on snap-back) so VERIFIER can ratify or push back. If VERIFIER picks the alternative (one-line addition at the `DraggableTimelineBlock` snap-back call site emitting `toast("Block overlap — move blocked", "error")`), `C-m7e-034`'s expected count flips from `0` to `1` and a new `C-m7e-034a` could be added to verify the message text + kind. AC #11 remains the contested AC.
2. **SG-m7e-06 (TESTS-surfaced; minor) — `hasAnyBrick(blocks, looseBricks)` helper exportability.** Plan baseline describes it as "a tiny inline helper or local boolean" inside `migrate(raw)`. `U-m7e-005`'s truth-table test requires the helper to be exported (or re-implemented in the test file). PLANNER intent appears to permit either; VERIFIER picks: (a) export it from `lib/persist.ts` for direct testability (preferred; matches `<BuildingClient>`'s `brickCount` computation pattern which is also a tiny inline helper); (b) inline it in `migrate(raw)` and have `U-m7e-005` test the behavior indirectly via `migrate(raw)` truth-table cases (mechanical amendment — `U-m7e-005` folds into `U-m7e-006..010`). PLAN baseline is ambiguous on the export question; TESTS picks (a) for direct testability — VERIFIER can demote to (b) if export creates a public-surface concern.
3. **SG-m7e-07 (TESTS-surfaced; minor — long-press threshold value) — the `holdMs` threshold is 600 ms per spec text + plan baseline (plan § Components — `<BrandMarkLongPress>` "`holdMs: 600`") BUT the dispatch prompt for this `mode: TESTS` run names 500 ms ("Long-press on the brand mark (500ms threshold)") AND the existing M0 / M4c `lib/longPress.ts` exports `HOLD_MS = 500` as the constant default.** The plan explicitly passes `holdMs: 600` (overriding the default), so the spec/plan baseline says 600. Tests (`C-m7e-006`, `C-m7e-007`, `C-m7e-008`, `E-m7e-001`) are written against the 600 ms plan baseline. VERIFIER picks: (a) ratify 600 ms (plan baseline; spec § Intent says "600 ms (M0's existing `longPress` threshold)" — note the spec text incorrectly attributes 600 ms to M0; the actual M0 constant is 500 ms); (b) flip to 500 ms (matches M0 default; dispatch prompt; simpler). Either way the tests amend mechanically — `599 → 499`, `600 → 500`, etc. NON-BLOCKING per dispatch prompt ratification convention.

### Pass-through ratification questions for VERIFIER (non-blocking — plan § Mechanism choices)

The plan does NOT enumerate "Open questions for VERIFIER" as a separate section (the M7d-style enumerated list), so the TESTS phase derives the implicit mechanism choices from the plan's tabular sketches. Per the M5/M6/M7a/M7b/M7c/M7d pass-through convention, the following PLANNER mechanism choices are NON-BLOCKING for VERIFIER — pick freely; the tests amend trivially per the alternative's contract; the AC assertions are identical either way:

1. **Module-level event emitter vs. React Context for `<Toaster>`** (PLANNER baseline: module-level emitter per plan § Components — `<Toaster>` "module-level event emitter (`subscribe(fn) / emit(toast)`) — NO React context, NO store dependency"). `C-m7e-015..022` are written against the plan baseline (direct invocation of the exported `toast(...)` function; subscription assertion via the singleton mount). Alternative (React Context with `useToast()` hook) amends — the tests would invoke `toast(...)` via the hook from a test component wrapper inside `<ToasterProvider>`; the AC assertions are identical. PLANNER plan § Regression surface explicitly invites VERIFIER ratification of "the **module-level event emitter pattern** for `<Toaster>` (over a React Context provider)".
2. **`<FirstBrickCard>` visibility gate — local `useState<boolean>` in `<BuildingClient>` (with `useEffect` watching `brickCount` + `firstBrickShown`) vs. reducer-driven `state.firstBrickShown` gate alone** (PLANNER baseline: local `useState` per plan § Components — `<BuildingClient>` "Replaced approach (resolves the dispatch contradiction): the card's visibility uses a separate local `useState<boolean>` (`firstCardOpen`) seeded in a `useEffect` that watches `state.looseBricks.length + state.blocks.flatMap(...).length` and `state.firstBrickShown`"). `C-m7e-025..028` are written against the plan baseline. Alternative (a new reducer action `FLIP_FIRST_BRICK_SHOWN` flips the flag separately from `ADD_BRICK`, and the card's `visible` prop is derived from `state.firstBrickShown !== true && brickCount > 0`) — but this requires a new `Action` arm (ADR-043 exhaustiveness), which the plan explicitly avoids. Tests amend trivially per the alternative's contract; the AC #1 + AC #4 assertions are identical. Pass-through per dispatch prompt.
3. **`<YearHeatmapPreview>` overlay composition — `<MonthCell>` directly vs. extend `<YearView>` with `size="full" | "preview"` prop** (PLANNER baseline: `<MonthCell>` direct, per SG-m7e-02 resolution). `C-m7e-012` is written against the plan baseline (12 MonthCells, no YearView import). Alternative (`<YearView size="preview">`) amends — the test would assert the `size` prop is wired through and the M9e YearView tests need new `size="full"` default-assertion rows. Pass-through per plan § Resolutions to the 4 Open Spec Gaps SG-m7e-02.
4. **`<BrandMarkLongPress>` wrapper element — `<button>` vs. `<div role="button">`** (PLANNER baseline: `<button>` per plan § Components a11y bullet "the wrapper is a `<button>` element so the tappable area is ≥44 px"). `C-m7e-024` is written against the plan baseline (`tagName === "BUTTON"`). Alternative (`<div role="button">` for visual-style reasons — avoids browser-default button styles) amends — `tagName === "DIV"` AND `role === "button"`. Pass-through per dispatch prompt; the ADR-031 ≥44 px contract holds either way.

No ADR is reversed: **ADR-013 / ADR-022** (one-feature-per-dispatch) — m7e is one feature group, one BUILDER dispatch (per plan § Feature grouping); **§ 0.5 / § 0.7** (narrative beats are rare + earned; motion tokens consumed unchanged) — `C-m7e-005`, `C-m7e-010`, `C-m7e-022` embody the PRM cadence; springConfigs.bloom family + inline timings are consumed verbatim; **ADR-018** (single localStorage key; transport unchanged) — M7e adds **one optional field** to the existing `dharma:v1` payload; transport unchanged (`U-m7e-013` corroborates); **ADR-023** (`useNow()` is the sole clock; two-pass hydration) — M7e introduces no clock (`C-m7e-013` corroborates `<YearHeatmapPreview>` purity); **ADR-031** (≥ 44 px touch targets) — the brand-mark wrapper becomes a `<button>` with vertical padding to reach 44 px tall (`C-m7e-024` corroborates); FirstBrickCard tap-target is the full card (>> 44 px); **ADR-039** (Dharma ships empty) — the first-brick card IS the narrative payoff for the empty-start experience (`U-m7e-001` + `C-m7e-025` + `E-m7e-002` embody AC #1); **ADR-041** (single-gate Loop; VERIFIER audits this plan + tests) — the dispatch prompt explicitly auto-chains PLAN → TESTS; VERIFIER will audit both before BUILDER starts; **ADR-043** (`assertNever` exhaustiveness) — no new `Action` arm (the flag flip rides on `ADD_BRICK`); the reducer's default arm untouched; **ADR-044** (M8 schema discipline; `schemaVersion` only bumps on required-field additions) — m7e adds **one optional boolean** with a deterministic back-fill — exactly the case ADR-044 carves out as "additive within version"; `SCHEMA_VERSION` stays at `3` (`U-m7e-011` corroborates); **ADR-045** (M9b history read-only) — `state.history` is unread by M7e; the flag flip is on `AppState` proper, not inside an `ArchivedDay`; **ADR-046** (period-aggregate helpers pure; "today" from `state.currentDate`, never the clock) — `<YearHeatmapPreview>` reads `monthScore(state, ...)` purely (`C-m7e-013` corroborates); **ADR-047** (M5 `currentDayBlocks` resolves `deletions` only) — unaffected; M7e does no recurrence resolution; the first-brick predicate uses raw brick counts in `state.blocks[].bricks` + `state.looseBricks`, not visible-today bricks (because "first brick ever" is a lifetime fact, not a daily one).
