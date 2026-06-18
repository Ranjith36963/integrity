## Milestone 4d — Add chooser (Block or Brick) — Tests

This entry covers M4d. Test ID prefixes:

- `U-m4d-` — unit (Vitest, no DOM)
- `C-m4d-` — component (Vitest + Testing Library)
- `E-m4d-` — Playwright e2e
- `A-m4d-` — Playwright a11y (axe-core via Playwright)

E2E and a11y specs continue the **deferred-to-preview** pattern from M4a/M4b: tests live in `tests/e2e/m4d.spec.ts` and `tests/e2e/m4d.a11y.spec.ts`, are run against the Vercel preview by EVALUATOR or CI, and use `if ((await x.count()) > 0)` guards in sandbox. EVALUATOR's M4b report flagged this as an open-loop debt (M4a + M4b combined have ~17 such guards). M4d perpetuates the pattern for consistency; a future TESTS-mode dispatch will land deterministic seeding helpers (per `status.md` open loop and ADR-039 ships-empty constraint). Flag, not block.

AC #16 locks no schema/reducer changes, so the unit-test surface is intentionally tiny (two IDs). Most coverage lives in `C-m4d-*` because M4d is a routing-and-rendering feature exercised through `<BuildingClient>`'s sheet state.

### Unit (Vitest)

#### U-m4d-001

Target file: `components/AddChooserSheet.test.tsx`
**GIVEN** `<AddChooserSheet open={true} onPick={vi.fn()} onCancel={vi.fn()} />` rendered twice (two separate `render()` calls in one test) with identical props
**WHEN** the rendered DOM of each instance is compared (innerHTML or `prettyDOM` snapshot)
**THEN** the two instances produce byte-identical DOM (no hidden state, no random ids, no timestamp leak).
Proves: plan.md § Components > AddChooserSheet ("pure routing surface, no internal state") — covers SPEC AC #16 (purity) by ruling out a hidden-state regression.

#### U-m4d-002

Target file: `components/AddChooserSheet.test.tsx`
**GIVEN** the module `components/AddChooserSheet` exports `AddChooserSheet` as a React component
**WHEN** the prop signature is read at type-check time (`Parameters<typeof AddChooserSheet>[0]`)
**THEN** the prop type contains `open: boolean`, `onPick: (choice: 'block' | 'brick') => void`, `onCancel: () => void`; calling `onPick('block')` and `onPick('brick')` typecheck; calling `onPick('other' as any)` does not (this is enforced by `tsc --noEmit`, the assertion just exercises the type at runtime).
Proves: plan.md § Components > AddChooserSheet (prop signature lock) — covers SPEC AC #22 (`tsc --noEmit` clean).

### Component (Vitest + Testing Library)

#### C-m4d-001

Target file: `components/AddChooserSheet.test.tsx`
**GIVEN** `<AddChooserSheet open={true} onPick={vi.fn()} onCancel={vi.fn()} />` rendered
**WHEN** the DOM is queried by role
**THEN** there are exactly two buttons with accessible names `"Add Block"` and `"Add Brick"` plus one Cancel control (X icon button); the outer wrapper has `role="dialog"` and `aria-label="Add"`.
Proves: plan.md § Components > AddChooserSheet ("two stacked `<Button>`s plus X cancel") + § A11y — covers SPEC AC #1, #18, #19.

#### C-m4d-002

Target file: `components/AddChooserSheet.test.tsx`
**GIVEN** `<AddChooserSheet open={true}>` rendered in a fixed-width container
**WHEN** `getBoundingClientRect()` is read on the Add Block button, the Add Brick button, and the Cancel control (or `getComputedStyle().minWidth` / `.minHeight`)
**THEN** each button reports `min-width` ≥ 44 (px) AND `min-height` ≥ 44 (px) per ADR-031.
Proves: plan.md § Components > AddChooserSheet + § Decisions to honor (ADR-031) — covers SPEC AC #15.

#### C-m4d-003

Target file: `components/AddChooserSheet.test.tsx`
**GIVEN** `<AddChooserSheet open={true} onPick={onPick} onCancel={onCancel} />` rendered with focus on `body`
**WHEN** the user presses Tab three times (lands on Add Block, then Add Brick, then Cancel), then `Enter` on Add Block in a separate render, then `Space` on Add Brick in a third render
**THEN** Tab order is Add Block → Add Brick → Cancel (`document.activeElement` after each Tab matches); Enter on Add Block fires `onPick('block')` once; Space on Add Brick fires `onPick('brick')` once.
Proves: plan.md § A11y ("native `<button>` activation via Enter and Space") — covers SPEC AC #20.

#### C-m4d-004

Target file: `components/AddChooserSheet.test.tsx`
**GIVEN** `<AddChooserSheet open={true} onPick={onPick} onCancel={onCancel} />` with both spies fresh
**WHEN** the user clicks the X Cancel control (test 1) and then re-renders and clicks the backdrop overlay (test 2)
**THEN** `onCancel` is called exactly once per test; `onPick` is never called in either test.
Proves: plan.md § Components > AddChooserSheet (Cancel + backdrop dismiss) — covers SPEC AC #4, #13.

#### C-m4d-005

Target file: `components/AddChooserSheet.test.tsx`
**GIVEN** `<AddChooserSheet open={true} onPick={onPick} />` with `lib/haptics.light` mocked
**WHEN** the user clicks the Add Block button
**THEN** `onPick` is called exactly once with `'block'`; `haptics.light` is called exactly once.
Proves: plan.md § Components > AddChooserSheet (Add Block tap) — covers SPEC AC #2.

#### C-m4d-006

Target file: `components/AddChooserSheet.test.tsx`
**GIVEN** `<AddChooserSheet open={true} onPick={onPick} />` with `lib/haptics.light` mocked
**WHEN** the user clicks the Add Brick button
**THEN** `onPick` is called exactly once with `'brick'`; `haptics.light` is called exactly once.
Proves: plan.md § Components > AddChooserSheet (Add Brick tap) — covers SPEC AC #3.

#### C-m4d-007

Target file: `components/AddChooserSheet.test.tsx`
**GIVEN** `<AddChooserSheet open={false} onPick={vi.fn()} onCancel={vi.fn()} />` rendered
**WHEN** the DOM is queried for the chooser's role=dialog or for the Add Block / Add Brick buttons
**THEN** none of these are present (`queryByRole` returns null). The chooser is fully unmounted (or hidden via `<Sheet>`'s `open=false` contract).
Proves: plan.md § Components > AddChooserSheet (open=false ⇒ nothing rendered) — covers SPEC AC #12 (Sheet contract).

#### C-m4d-008

Target file: `components/AddChooserSheet.test.tsx`
**GIVEN** `<AddChooserSheet open={true}>` rendered with `useReducedMotion()` stubbed `true`
**WHEN** the chooser's outer animation wrapper is inspected (`style.transition` or the equivalent motion class)
**THEN** the slide-in transition is `none` (or `0ms`); the chooser still renders with both buttons visible (animation suppressed but content present).
Proves: plan.md § Reduced motion (chooser inherits `<Sheet>`'s reduced-motion behavior) — covers SPEC AC #17.

#### C-m4d-009

Target file: `app/(building)/BuildingClient.test.tsx` (or a dedicated `BuildingClient.m4d.test.tsx` if defaultState mocking is needed)
**GIVEN** `<BuildingClient />` rendered (empty default state)
**WHEN** the user clicks the dock `+` button (`<BottomBar onAddPress>`)
**THEN** `<AddChooserSheet>` is open in the DOM (`role="dialog"` with `aria-label="Add"` is queryable); `<AddBlockSheet>` is NOT open.
Continuation: when the user clicks the chooser's "Add Block" button, the chooser closes (no longer queryable) AND `<AddBlockSheet>` opens with the `Title` input visible and `defaultStart` set to the rounded current hour (M2 logic).
Proves: plan.md § Wiring map (dock + → chooser → AddBlockSheet) — covers SPEC AC #1, #2.

#### C-m4d-010

Target file: `app/(building)/BuildingClient.test.tsx`
**GIVEN** `<BuildingClient />` rendered, dock `+` clicked so chooser is open
**WHEN** the user clicks "Add Brick" inside the chooser
**THEN** chooser closes; `<AddBrickSheet>` opens; the brick form's `parentBlockId` indicator (component prop or visible "Loose brick" hint, depending on plan) reflects `parentBlockId: null`; the CategoryPicker is not pre-filled (matches the tray path).
Proves: plan.md § Wiring map (dock + → chooser → AddBrickSheet, parentBlockId null) — covers SPEC AC #3.

#### C-m4d-011

Target file: `app/(building)/BuildingClient.test.tsx`
**GIVEN** `<BuildingClient />` rendered with empty state and the system time mocked to `2026-05-09T08:30:00`
**WHEN** the user clicks an empty hour slot at hour `13` in `<Timeline>` (via `<SlotTapTargets>`)
**THEN** the chooser opens AND captures hour `13`. Continuation A: clicking "Add Block" closes the chooser and opens `<AddBlockSheet>` with `defaultStart` rendered as `"13:00"`. Continuation B (separate render): clicking "Add Brick" closes the chooser and opens `<AddBrickSheet>` with `parentBlockId: null`; the captured hour is discarded (the brick form has no time/start surface to inspect, but `parentBlockId: null` proves the routing).
Proves: plan.md § Wiring map (slot tap → chooser → AddBlockSheet w/ defaultStart OR AddBrickSheet) — covers SPEC AC #5, #6, #7.

#### C-m4d-012

Target file: `components/TimelineBlock.test.tsx` (or `BuildingClient.test.tsx` — wherever the inside-block "+ Add brick" path is exercised today)
**GIVEN** `<BuildingClient />` rendered with one block in state (or `<TimelineBlock>` rendered standalone in expanded state); the "+ Add brick" ghost button visible
**WHEN** the user clicks "+ Add brick"
**THEN** `<AddBrickSheet>` opens directly with `parentBlockId` = this block's id and `categoryId` pre-filled to the block's `categoryId` (M3 behavior preserved); `<AddChooserSheet>` is NOT mounted at any point during the interaction.
Proves: plan.md § Wiring map (inside-block bypass) + first-class invariant — covers SPEC AC #8 (regression).

#### C-m4d-013

Target file: `components/LooseBricksTray.test.tsx` (or `BuildingClient.test.tsx`)
**GIVEN** `<BuildingClient />` rendered with at least one loose brick (so the tray is visible and expanded), or `<LooseBricksTray>` rendered standalone in expanded view
**WHEN** the user clicks the "+ Brick" / "Add Brick" pill inside the tray
**THEN** `<AddBrickSheet>` opens directly with `parentBlockId: null` and no category pre-fill (M3 behavior preserved); `<AddChooserSheet>` is NOT mounted at any point.
Proves: plan.md § Wiring map (tray bypass) + first-class invariant — covers SPEC AC #9 (regression).

#### C-m4d-014

Target file: `app/(building)/BuildingClient.test.tsx`
**GIVEN** `<BuildingClient />` rendered with literal-empty default state (no blocks, no loose bricks; tray hidden; empty-state card visible)
**WHEN** the user clicks the dock `+` → "Add Brick" inside the chooser → fills the AddBrickSheet form (Title `"My Brick"`, type Tick) → clicks Save
**THEN** the new brick appears in `<LooseBricksTray>` (which now renders because `state.looseBricks.length > 0`); the empty-state card unmounts; `state.blocks.length` is still `0`.
Proves: plan.md § Wiring map (empty-state first-brick) + spec AC #10 — covers SPEC AC #10.

#### C-m4d-015

Target file: `app/(building)/BuildingClient.test.tsx`
**GIVEN** `<BuildingClient />` rendered with literal-empty default state, system time mocked
**WHEN** the user clicks an empty hour slot (hour `H`) → "Add Brick" inside the chooser → fills the form → Save
**THEN** the same outcome as C-m4d-014 (loose brick in tray, empty-state unmounts); the captured hour `H` is correctly discarded (no time/start field populated on the saved brick).
Proves: plan.md § Wiring map (slot → Brick discards hour) — covers SPEC AC #11.

#### C-m4d-016

Target file: `app/(building)/BuildingClient.test.tsx`
**GIVEN** `<BuildingClient />` rendered, dock `+` clicked once so chooser is open
**WHEN** the user clicks the dock `+` a second time (the dock button may be obscured by the chooser backdrop in real DOM, but `fireEvent.click` bypasses)
**THEN** the chooser remains open exactly once (only one `role="dialog"` with `aria-label="Add"` in the DOM; `state.chooserState.open === true` once).
Proves: plan.md § Edge cases ("two rapid taps on dock + don't double-mount") — covers SPEC § Edge cases (rapid-tap debounce).

#### C-m4d-017

Target file: `app/(building)/BuildingClient.test.tsx` (replaces the M2 direct-path assertion)
**GIVEN** `<BuildingClient />` rendered (replays the M2 `C-m2-020` user journey but via the M4d chooser)
**WHEN** the user taps the dock `+`, then taps "Add Block" in the chooser, then types title `"Foo"`, then clicks Save
**THEN** a new block named `"Foo"` is appended to `state.blocks`; the EmptyBlocks card unmounts; the M2 contract holds end-to-end through the new chooser routing.
Proves: SG-m4d-04 (M2 dock-+ test re-targeted through chooser); migration of M2 `C-m2-020` direct-path semantics — covers SPEC AC #1, #2, #16.

### E2E (Playwright)

#### E-m4d-001

Target file: `tests/e2e/m4d.spec.ts`
**GIVEN** the app at `/` in default empty state
**WHEN** the user taps the dock `+` button, then taps "Add Block" inside the chooser
**THEN** `<AddChooserSheet>` is briefly visible after the first tap; after the second tap the chooser is gone and `<AddBlockSheet>` is visible (the Title input is rendered).
Proves: plan.md § Wiring map (dock + → chooser → AddBlockSheet) — covers SPEC AC #1, #2.

#### E-m4d-002

Target file: `tests/e2e/m4d.spec.ts`
**GIVEN** the app at `/` in default empty state
**WHEN** the user taps the dock `+`, then taps "Add Brick" inside the chooser
**THEN** the chooser closes; `<AddBrickSheet>` is visible; the brick form's type selector renders three options (Tick / Goal / Time).
Proves: plan.md § Wiring map (dock + → chooser → AddBrickSheet with three measurement types preserved from M3) — covers SPEC AC #3.

#### E-m4d-003

Target file: `tests/e2e/m4d.spec.ts`
**GIVEN** the app at `/` in default empty state, viewport at desktop default
**WHEN** the user taps an empty hour slot at hour `H` in `<Timeline>`, then taps "Add Block" inside the chooser
**THEN** `<AddBlockSheet>` opens with the start time input pre-filled to `H:00`.
Proves: plan.md § Wiring map (slot → chooser → AddBlockSheet with defaultStart) — covers SPEC AC #5, #6.

#### E-m4d-004

Target file: `tests/e2e/m4d.spec.ts`
**GIVEN** the app at `/` in default empty state
**WHEN** the user taps an empty slot, then taps "Add Brick" inside the chooser
**THEN** `<AddBrickSheet>` opens; no `start` / `time` input field is present in the brick form (bricks are time-agnostic; the captured hour is discarded).
Proves: plan.md § Wiring map (slot → chooser → AddBrickSheet, hour discarded) — covers SPEC AC #7.

#### E-m4d-005

Target file: `tests/e2e/m4d.spec.ts`
**GIVEN** the page emulated at mobile viewport `430 × 932`
**WHEN** the user taps the dock `+` and the chooser opens
**THEN** `document.documentElement.scrollWidth <= clientWidth` (no horizontal overflow); both Add Block and Add Brick buttons have `getBoundingClientRect().height >= 44` and `width >= 44`; the Cancel control is also tappable (≥ 44 px).
Proves: plan.md § Mobile + § Decisions to honor (ADR-031) — covers SPEC AC #15.

#### E-m4d-006

Target file: `tests/e2e/m4d.spec.ts`
**GIVEN** the browser context with `prefers-reduced-motion: reduce` emulated
**WHEN** the user taps the dock `+`
**THEN** the chooser is visible immediately (no observable slide-in animation duration > 50 ms; the chooser's outer transition resolves to `none` or `0ms`).
Proves: plan.md § Reduced motion — covers SPEC AC #17.

### Accessibility (axe via Playwright)

#### A-m4d-001

Target file: `tests/e2e/m4d.a11y.spec.ts`
**GIVEN** the app at `/` with the chooser open (tap dock `+` first)
**WHEN** axe-core runs against the document
**THEN** zero violations are reported across all rule categories enabled in the project's axe config.
Proves: plan.md § A11y — covers SPEC AC #21.

#### A-m4d-002

Target file: `tests/e2e/m4d.a11y.spec.ts`
**GIVEN** the chooser is open
**WHEN** the page DOM is inspected and the user presses Tab from the chooser's first focusable element
**THEN** the outer wrapper has `role="dialog"`, `aria-label="Add"`; initial focus is inside the chooser; Tab order cycles Add Block → Add Brick → Cancel (then traps back to Add Block); Shift+Tab cycles in reverse.
Proves: plan.md § A11y (focus trap + tab order) — covers SPEC AC #18, #20.

#### A-m4d-003

Target file: `tests/e2e/m4d.a11y.spec.ts`
**GIVEN** the chooser is open at the default desktop viewport
**WHEN** `getBoundingClientRect()` is read on Add Block, Add Brick, and Cancel
**THEN** each measured `width` ≥ 44 px AND `height` ≥ 44 px (ADR-031 enforced via computed CSS).
Proves: plan.md § Decisions to honor (ADR-031) — covers SPEC AC #15.

#### A-m4d-004

Target file: `tests/e2e/m4d.a11y.spec.ts`
**GIVEN** the chooser is open
**WHEN** the user presses `Escape`
**THEN** the chooser closes (no `role="dialog"` with `aria-label="Add"` in the DOM); no `onPick` is observed (no downstream sheet opens).
Note: stretch test verifying the dialog convention beyond explicit AC — if Esc isn't wired, this is a future polish item flagged for `status.md`.
Proves: dialog convention (a11y best practice) — covers SPEC AC #13 (silent dismiss) by extension.

### M2 / M3 test migration notes (per SG-m4d-04)

The following pre-existing tests must be amended in BUILDER's red→green sequence so they walk through the chooser instead of asserting direct routing. Each is a one-line adjustment:

- `C-m2-020` (M2): "saves a block: name='Foo'..." — must click "Add Block" inside the chooser between the dock + tap and the Title input. (Replaced semantically by `C-m4d-017`.)
- `C-m2-016` (M2): "Empty-state card unmounts when blocks.length > 0" — same chooser-walk amendment as above.
- `C-m2-012` (M2): "New category persists if block Cancelled" — opens via dock + (or sheet trigger); chooser-walk amendment.
- Any M2 / M3 slot-tap → AddBlockSheet test (search `onSlotTap` in `*.test.tsx`) — chooser-walk amendment.

BUILDER finds these via `grep -rn "Add Block\|AddBlockSheet" *.test.tsx` and threads "click Add Block in chooser" between the trigger and the form interaction. EVALUATOR validates that the migration is mechanical, not semantic (no AC change).

### Coverage map (SPEC AC → covering test IDs)

| AC# | Acceptance criterion (paraphrased)                                                                                  | Covering test IDs                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| #1  | Dock + opens AddChooserSheet (not AddBlockSheet directly)                                                           | C-m4d-009, C-m4d-017, E-m4d-001                                                        |
| #2  | Chooser → "Add Block" → AddBlockSheet w/ defaultStart=current hour; haptic light                                    | C-m4d-005, C-m4d-009, C-m4d-017, E-m4d-001                                             |
| #3  | Chooser → "Add Brick" → AddBrickSheet w/ parentBlockId:null, no category pre-fill; haptic light                     | C-m4d-006, C-m4d-010, E-m4d-002                                                        |
| #4  | Chooser X Cancel closes the chooser; no downstream sheet opens                                                      | C-m4d-004                                                                              |
| #5  | Slot tap opens AddChooserSheet (not AddBlockSheet directly); chooser captures the hour                              | C-m4d-011, E-m4d-003                                                                   |
| #6  | Slot → "Add Block" → AddBlockSheet w/ defaultStart=captured hour                                                    | C-m4d-011, E-m4d-003                                                                   |
| #7  | Slot → "Add Brick" → AddBrickSheet w/ parentBlockId:null; captured hour discarded                                   | C-m4d-011, C-m4d-015, E-m4d-004                                                        |
| #8  | Inside-block "+ Add brick" bypasses chooser; AddBrickSheet opens directly w/ real parentBlockId + category pre-fill | C-m4d-012                                                                              |
| #9  | Tray "+ Brick" pill bypasses chooser; AddBrickSheet opens directly w/ parentBlockId:null                            | C-m4d-013                                                                              |
| #10 | Empty state: dock + → chooser → "Add Brick" → Save → tray renders new chip; empty-state card unmounts               | C-m4d-014                                                                              |
| #11 | Empty state: slot tap → chooser → "Add Brick" → Save → same outcome as #10                                          | C-m4d-015                                                                              |
| #12 | Chooser uses M0 `<Sheet>` w/ modalIn / modalOut animations                                                          | C-m4d-007 (open=false ⇒ unmount), C-m4d-008                                            |
| #13 | Backdrop tap dismisses chooser silently                                                                             | C-m4d-004, A-m4d-004                                                                   |
| #14 | iOS swipe-down dismisses silently (M2 SG-m2-06 pattern)                                                             | inherited from `<Sheet>` (M0 — covered by M0 unit tests); flagged for preview tap-test |
| #15 | Two stacked `<Button>`s ≥ 44 px each: Add Block primary amber, Add Brick secondary                                  | C-m4d-001, C-m4d-002, A-m4d-003, E-m4d-005                                             |
| #16 | No reducer / action / AppState changes — UI routing only                                                            | U-m4d-001, U-m4d-002, C-m4d-017                                                        |
| #17 | Reduced motion: chooser slide-in collapses to instant                                                               | C-m4d-008, E-m4d-006                                                                   |
| #18 | Chooser has `role="dialog"`, `aria-label="Add"`, focus trap                                                         | C-m4d-001, A-m4d-002                                                                   |
| #19 | Each button has `aria-label="Add Block"` / `aria-label="Add Brick"`                                                 | C-m4d-001                                                                              |
| #20 | Tab order: Add Block → Add Brick → Cancel; Enter/Space activate                                                     | C-m4d-003, A-m4d-002                                                                   |
| #21 | axe-core: zero violations on the open chooser                                                                       | A-m4d-001                                                                              |
| #22 | `tsc --noEmit`: zero new errors                                                                                     | gate (`npm run eval`); also U-m4d-002                                                  |
| #23 | ESLint: zero new errors                                                                                             | gate (`npm run eval`)                                                                  |
| #24 | Vitest: chooser component test + BuildingClient integration + M3 regression for direct paths                        | U-m4d-001..002, C-m4d-001..017                                                         |
| #25 | Playwright (deferred-to-preview): empty-state path + slot-tap defaultStart match                                    | E-m4d-001..006                                                                         |

**Spec gaps surfaced for VERIFIER:** none. SG-m4d-01 through SG-m4d-05 are resolved in plan.md and reflected in the test IDs above. AC #14 (iOS swipe-down) is inherited from M0 `<Sheet>` and intentionally not re-tested at the M4d level — covered by M0 + flagged for preview tap-test.
