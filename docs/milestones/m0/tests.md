## Milestone 0 — Design System — Tests

> Every ID below traces to `plan.md` § "Milestone 0 — Design System — Plan". The `Proves:` line names the plan section the test verifies, so EVALUATOR's spec-coverage check is mechanical.
> ID series start fresh from `001` per layer (`U-m0-*`, `C-m0-*`, `E-m0-*`, `A-m0-*`). Pre-pivot `*-bld-*` IDs continue to live above; M0 does not delete or renumber them (see migration table at top of file).

### Unit (Vitest)

- ID: U-m0-001
  GIVEN the parsed CSS output of `app/globals.css` (read with `fs.readFileSync` in the test)
  WHEN the `:root { … }` block is extracted
  THEN it declares `--bg: #07090f`, `--bg-elev: #0c1018`, `--ink: #f5f1e8`, `--ink-dim: rgba(245,241,232,.5)`, `--accent: #fbbf24`, `--accent-deep: #d97706`, `--cat-health: #34d399`, `--cat-mind: #c4b5fd`, `--cat-career: #fbbf24`, `--cat-passive: #64748b` — exact values, exact spelling.
  Tested by: `app/globals.css.test.ts`
  Proves: plan.md § Design tokens — Colors

- ID: U-m0-002
  GIVEN the same parsed `:root` block
  WHEN the typography vars are extracted
  THEN it declares `--font-display: var(--font-instrument-serif)`, `--font-ui: var(--font-jetbrains-mono)`, `--font-body: var(--font-geist-sans)`, and the full type scale `--fs-10: 0.625rem`, `--fs-12: 0.75rem`, `--fs-14: 0.875rem`, `--fs-16: 1rem`, `--fs-22: 1.375rem`, `--fs-32: 2rem`, `--fs-64: 4rem`.
  Tested by: `app/globals.css.test.ts`
  Proves: plan.md § Design tokens — Typography

- ID: U-m0-003
  GIVEN the same parsed `:root` block
  WHEN the spacing vars are extracted
  THEN it declares `--sp-4: 4px`, `--sp-8: 8px`, `--sp-12: 12px`, `--sp-16: 16px`, `--sp-24: 24px`, `--sp-32: 32px`, `--sp-48: 48px`.
  Tested by: `app/globals.css.test.ts`
  Proves: plan.md § Design tokens — Spacing

- ID: U-m0-004
  GIVEN the same parsed `:root` block
  WHEN the motion + safe-area vars are extracted
  THEN it declares `--motion-tap`, `--motion-brick-fill`, `--motion-bloom`, `--motion-modal-in`, `--motion-modal-out`, `--motion-flip`, `--motion-long-press`, `--motion-stagger`, `--safe-bottom: env(safe-area-inset-bottom)`, `--safe-top: env(safe-area-inset-top)`. Each motion var contains a duration token (`100ms`/`220ms`/`360ms`/`600ms`/`180ms`/`30ms`) matching plan.md.
  Tested by: `app/globals.css.test.ts`
  Proves: plan.md § Design tokens — Motion + Safe area

- ID: U-m0-005
  GIVEN `getMotion(token, reduced=false)` from `lib/motion.ts`
  WHEN called with each documented `Duration` (`"tap" | "brickFill" | "modalIn" | "modalOut" | "longPress" | "stagger"`)
  THEN it returns `{ durationMs, easing }` whose `durationMs` matches the table in plan.md (100/600/spring/220/180/30) and whose `easing` is one of `"easeOut" | "easeInOut" | "spring" | "linear"`.
  Tested by: `lib/motion.test.ts`
  Proves: plan.md § Data model — `Duration`/`Easing`/`MotionToken` and § Design tokens — Motion

- ID: U-m0-006
  GIVEN `getMotion(token, reduced=true)` from `lib/motion.ts`
  WHEN called with any `Duration`
  THEN every returned `durationMs` is `0` and spring tokens collapse to a hard-cut sentinel (`easing === "linear"` with `durationMs === 0`); stagger delay is `0`.
  Tested by: `lib/motion.test.ts`
  Proves: plan.md § Design tokens — "Reduced-motion collapse rule" + Edge case 1

- ID: U-m0-007
  GIVEN `lib/haptics.ts` and a stub where `navigator.vibrate` is `vi.fn()`
  WHEN `haptics.light()`, `haptics.medium()`, `haptics.success()`, `haptics.notification()` are each invoked
  THEN `navigator.vibrate` is called once per invocation with patterns `[10]`, `[20]`, `[15,30,15]`, `[20,40,20,40,20]` respectively.
  Tested by: `lib/haptics.test.ts`
  Proves: plan.md § Design tokens — Haptics table

- ID: U-m0-008
  GIVEN `lib/haptics.ts` and an environment where `(navigator as any).vibrate` is `undefined`
  WHEN `haptics.light()` (and each of the other three) is invoked
  THEN no error is thrown, the function returns `undefined`, and no global side effect occurs (silent no-op).
  Tested by: `lib/haptics.test.ts`
  Proves: plan.md § Edge case 8 — Haptics on iOS PWA

- ID: U-m0-009
  GIVEN `lib/haptics.ts` exports a `HapticEvent` union/enum
  WHEN typechecked
  THEN it admits exactly `"light" | "medium" | "success" | "notification"` and rejects any other string literal.
  Tested by: `lib/haptics.test.ts` (uses `expectTypeOf`)
  Proves: plan.md § Data model — `HapticEvent`

- ID: U-m0-010
  GIVEN `usePrefersReducedMotion()` from `lib/reducedMotion.ts` rendered in a component that captures the returned value
  WHEN `window.matchMedia` is mocked to return `{ matches: true, addEventListener, removeEventListener }`
  THEN the hook returns `true`. With `matches: false` it returns `false`.
  Tested by: `lib/reducedMotion.test.ts`
  Proves: plan.md § File structure — `lib/reducedMotion.ts` + Edge case 1

- ID: U-m0-011
  GIVEN `usePrefersReducedMotion()` rendered server-side (no `window`)
  WHEN the initial value is read
  THEN the hook returns `false` without throwing (SSR-safe initial value per plan.md).
  Tested by: `lib/reducedMotion.test.ts`
  Proves: plan.md § File structure — `lib/reducedMotion.ts` (SSR-safe)

- ID: U-m0-012
  GIVEN a mounted `usePrefersReducedMotion()` consumer
  WHEN the mocked `MediaQueryList` fires `change` with `matches: true`
  THEN the hook re-renders with `true`. On unmount, `removeEventListener("change", …)` is called exactly once with the same handler that was registered.
  Tested by: `lib/reducedMotion.test.ts`
  Proves: plan.md § File structure — `lib/reducedMotion.ts` (change listener + cleanup)

### Component (Vitest + Testing Library)

- ID: C-m0-001
  GIVEN `<Button>Tap</Button>` with no props
  WHEN rendered
  THEN it renders a `<button>` element with the primary+md variant classes (matches `buttonVariants({ variant: "primary", size: "md" })` token-class snapshot from plan.md), text "Tap", `min-w-[44px]`, and `h-11`.
  Tested by: `components/ui/Button.test.tsx`
  Proves: plan.md § Components — `<Button>` (defaults + cva contract)

- ID: C-m0-002
  GIVEN `<Button variant={v} size={s}>` rendered for every (variant, size) pair in `{primary, secondary, ghost} × {sm, md, lg}`
  WHEN each instance is inspected
  THEN class lists differ across variants (no two render the same class string) and size class height tokens map `sm→h-9`, `md→h-11`, `lg→h-12`.
  Tested by: `components/ui/Button.test.tsx`
  Proves: plan.md § Components — `<Button>` (variant matrix)

- ID: C-m0-003
  GIVEN `<Button loading>Tap</Button>`
  WHEN rendered
  THEN children "Tap" are not visible as accessible text, an inline spinner element is in the DOM (e.g. `[data-loading="true"]` or an SVG with `aria-hidden`), the button retains height ≥44px, and `aria-busy="true"` is set.
  Tested by: `components/ui/Button.test.tsx`
  Proves: plan.md § Components — `<Button>` loading state

- ID: C-m0-004
  GIVEN `<Button disabled onClick={spy}>Tap</Button>`
  WHEN the user clicks it
  THEN `spy` is not called and the rendered element has `disabled` attribute; `disabled:pointer-events-none disabled:opacity-50` classes are present.
  Tested by: `components/ui/Button.test.tsx`
  Proves: plan.md § Components — `<Button>` disabled state

- ID: C-m0-005
  GIVEN `<Modal open onClose={spy} title="Hi">body</Modal>` rendered into a portal
  WHEN the backdrop is clicked AND when ESC is pressed
  THEN `spy` is called once each. When `open={false}`, the dialog node is not in the DOM.
  Tested by: `components/ui/Modal.test.tsx`
  Proves: plan.md § Components — `<Modal>` (close affordances + open prop)

- ID: C-m0-006
  GIVEN `<Modal open>` rendered at viewport ≤430px (jsdom matchMedia stub)
  WHEN computed style of the sheet root is read
  THEN `padding-bottom` resolves to a value referencing `var(--safe-bottom)` (or matches the computed `env(safe-area-inset-bottom)` substitution).
  Tested by: `components/ui/Modal.test.tsx`
  Proves: plan.md § Edge case 6 — Modal/Sheet on iOS Safari

- ID: C-m0-007
  GIVEN `<Sheet open onClose={spy} title="Hi">body</Sheet>`
  WHEN backdrop click and ESC are dispatched
  THEN `spy` is called once each. Sheet root has `data-variant="full"` (or equivalent class) and the same `padding-bottom: var(--safe-bottom)` rule applies.
  Tested by: `components/ui/Sheet.test.tsx`
  Proves: plan.md § Components — `<Sheet>` (close affordances + safe area)

- ID: C-m0-008
  GIVEN `<Chip tone={t} selected={s} size={z}>` rendered for every `(tone, selected, size)` matrix combo (`tone ∈ {neutral, category-health, category-mind, category-career, category-passive}`, `selected ∈ {true,false}`, `size ∈ {sm,md}`)
  WHEN inspected
  THEN selected variants show filled bg classes (referencing `--cat-*` or `--accent`); unselected show outlined classes; `size="sm"` instances have a wrapper enforcing `min-w-[44px] min-h-[44px]` on the hit area even though the visible chip is smaller.
  Tested by: `components/ui/Chip.test.tsx`
  Proves: plan.md § Components — `<Chip>` + Edge case 2 (44px hit area)

- ID: C-m0-009
  GIVEN `<Input id="x" type="number" value="3" onChange={spy} label="Reps" />`
  WHEN rendered and inspected
  THEN a `<label htmlFor="x">Reps</label>` is present, the `<input>` has `inputMode="numeric"`, height ≥44px, and `aria-invalid="false"`.
  Tested by: `components/ui/Input.test.tsx`
  Proves: plan.md § Components — `<Input>` (numeric variant + label wiring)

- ID: C-m0-010
  GIVEN `<Input id="x" type="text" value="" onChange={()=>{}} label="X" error="Required" />`
  WHEN inspected
  THEN the error text "Required" is in the DOM, `aria-invalid="true"`, the input is `aria-describedby` the error element's id, and the error element's color references `--accent-deep`.
  Tested by: `components/ui/Input.test.tsx`
  Proves: plan.md § Components — `<Input>` error state

- ID: C-m0-011
  GIVEN `<Stepper value={5} min={0} max={10} onChange={spy} />`
  WHEN the user clicks `+` once and `−` once
  THEN `spy` is called with `6` then `4`; clicking `+` while `value === max` does not call `spy`; clicking `−` while `value === min` does not call `spy`.
  Tested by: `components/ui/Stepper.test.tsx`
  Proves: plan.md § Components — `<Stepper>` (bounds)

- ID: C-m0-012
  GIVEN `<Stepper value={0} max={1000} onChange={spy} />` with `vi.useFakeTimers()`
  WHEN the user pointer-presses `+` and holds for 3000ms simulated, then releases
  THEN `spy` is called multiple times, the per-tick interval shortens over the first 1500ms (acceleration ramp 1×→10×), and the maximum simulated rate caps at 10× the base rate (no spy call interval shorter than `baseInterval/10`).
  Tested by: `components/ui/Stepper.test.tsx`
  Proves: plan.md § Edge case 5 — Long-press accelerator (caps at 10×)

- ID: C-m0-013
  GIVEN `<Stepper value={5} onChange={spy} />` and a spy on `haptics.light` from `lib/haptics`
  WHEN the user clicks `+`
  THEN `haptics.light` was invoked exactly once for the commit.
  Tested by: `components/ui/Stepper.test.tsx`
  Proves: plan.md § Components — `<Stepper>` (haptic light on each commit)

- ID: C-m0-014
  GIVEN `<Toggle pressed={false} onPressedChange={spy} label="Edit mode" />`
  WHEN the user clicks it
  THEN `spy` is called with `true`. The button has `aria-pressed="false"` initially, role `"switch"` (or `<button aria-pressed>`), accessible name "Edit mode", and the bounding box is ≥44×44 px.
  Tested by: `components/ui/Toggle.test.tsx`
  Proves: plan.md § Components — `<Toggle>` (a11y wiring + 44px)

- ID: C-m0-015
  GIVEN `<EmptyState message="Nothing yet" actionLabel="Add" onAction={spy} />`
  WHEN rendered
  THEN "Nothing yet" is visible, a ghost-variant button with text "Add" is in the DOM, clicking it calls `spy` once.
  Tested by: `components/ui/EmptyState.test.tsx`
  Proves: plan.md § Components — `<EmptyState>` (CTA wiring)

- ID: C-m0-016
  GIVEN `<EmptyState message="X" pulse />` and `usePrefersReducedMotion()` mocked to `true`
  WHEN rendered
  THEN the pulse animation class is absent (or `animation-name: none` is applied) on the card root.
  Tested by: `components/ui/EmptyState.test.tsx`
  Proves: plan.md § Edge case 1 — reduced-motion collapses EmptyState pulse

- ID: C-m0-017
  GIVEN `<BlockCard name="Work" start="08:45" end="17:15" category="passive" status="current" pct={42} />`
  WHEN rendered
  THEN the name "Work", time range "08:45–17:15" (or "08:45-17:15"), the category dot styled with `--cat-passive`, and a numeric/visual representation of `pct=42` are visible. Status `"current"` adds a glow class (e.g. `now-glow` or `data-status="current"`).
  Tested by: `components/ui/BlockCard.test.tsx`
  Proves: plan.md § Components — `<BlockCard>` (status + pct rendering)

- ID: C-m0-018
  GIVEN `<BlockCard … editMode onDelete={spy} />`
  WHEN rendered
  THEN a `×` button with `aria-label="Delete block"` is present; clicking it calls `spy` once and clicking the card body itself does NOT call any onClick handler.
  Tested by: `components/ui/BlockCard.test.tsx`
  Proves: plan.md § Components — `<BlockCard>` (editMode `×` per ADR-008)

- ID: C-m0-019
  GIVEN `<BrickChip kind="tick" name="lunch" done={false} onToggle={spy} />`
  WHEN the user clicks it
  THEN `spy` is called once. Accessible name includes "lunch". Visual state is "empty" (no filled class). Bounding box ≥44×44 px.
  Tested by: `components/ui/BrickChip.test.tsx`
  Proves: plan.md § Components — `<BrickChip>` tick variant

- ID: C-m0-020
  GIVEN `<BrickChip kind="goal" name="follow-ups" current={4} target={5} unit="reps" onCommit={spy} />`
  WHEN rendered, then the user opens the inline stepper popover and clicks `+`
  THEN `spy` is called with `5`. The accessible label includes "4/5 reps" before the click and "5/5 reps" after.
  Tested by: `components/ui/BrickChip.test.tsx`
  Proves: plan.md § Components — `<BrickChip>` goal variant + ADR-016 aria-label

- ID: C-m0-021
  GIVEN `<BrickChip kind="time" name="meditate" accumulatedSec={900} targetSec={1800} running={false} onToggle={spy} />`
  WHEN rendered
  THEN the visual ring/fill represents 50% (asserted via `aria-valuenow="50"` or computed style on the fill element); accessible label includes "15/30 min" (per phase1plan brick label semantics, allowed precision-rounded).
  Tested by: `components/ui/BrickChip.test.tsx`
  Proves: plan.md § Components — `<BrickChip>` time variant

- ID: C-m0-022
  GIVEN `<BrickChip kind="tick" … editMode onDelete={spy} />`
  WHEN rendered
  THEN a `×` button with `aria-label="Delete brick"` is present; clicking the chip body does NOT invoke `onToggle`.
  Tested by: `components/ui/BrickChip.test.tsx`
  Proves: plan.md § Components — shared `editMode`/`onDelete` (ADR-008)

- ID: C-m0-023
  GIVEN `components/ui/index.ts`
  WHEN imported
  THEN it re-exports exactly: `Button`, `Modal`, `Sheet`, `Chip`, `Input`, `Stepper`, `Toggle`, `EmptyState`, `BlockCard`, `BrickChip` (and their associated `*Variants` cva functions where applicable). No extras.
  Tested by: `components/ui/index.test.ts`
  Proves: plan.md § File structure — `components/ui/index.ts` barrel

### E2E (Playwright)

> All M0 e2e run on `mobile-chrome` (Pixel 7) only per ADR-010 (mobile-safari disabled in this sandbox). Base URL `http://localhost:3000`. Harness route: `/_design`.

- ID: E-m0-001
  GIVEN the dev server is running
  WHEN visiting `/_design`
  THEN the page responds 200, `[data-testid="design-harness"]` is in the DOM, and the visible content max-width is ≤430 CSS px.
  Tested by: `tests/e2e/design.spec.ts`
  Proves: plan.md § File structure — `app/_design/page.tsx` + Edge case 2

- ID: E-m0-002
  GIVEN `/_design` is loaded
  WHEN the page is inspected
  THEN exactly one of each of the 10 primitives is rendered with its `data-testid`: `button`, `modal-trigger`, `sheet-trigger`, `chip`, `input`, `stepper`, `toggle`, `empty-state`, `block-card`, `brick-chip` (each name appears at least once; trigger buttons stand in for portal-based primitives).
  Tested by: `tests/e2e/design.spec.ts`
  Proves: plan.md § File structure — harness renders every primitive

- ID: E-m0-003
  GIVEN `/_design` is loaded
  WHEN the bounding box of every interactive element (`button, [role="button"], [role="switch"], input, [data-testid="brick-chip"], [data-testid="chip"]`) is measured
  THEN every box has `width >= 44` and `height >= 44` (CSS pixels).
  Tested by: `tests/e2e/design.spec.ts`
  Proves: plan.md § Edge case 2 — 44px touch targets

- ID: E-m0-004
  GIVEN `/_design` is loaded with the browser context emulating `prefersReducedMotion: "reduce"`
  WHEN any motion-tagged element (`[data-motion]`) is inspected
  THEN computed `animation-name` is `none` (or `transition-duration` resolves to `0s`); the EmptyState pulse element has no running animation; and the Modal open transition completes within 50ms.
  Tested by: `tests/e2e/design.spec.ts`
  Proves: plan.md § Edge case 1 + § Design tokens — reduced-motion collapse rule

- ID: E-m0-005
  GIVEN `/_design` is loaded
  WHEN the body's computed `font-family` is read
  THEN it begins with the Geist Sans family token (matches `/Geist|var\(--font-geist-sans\)/`) and falls back to a system UI family. The page does not exhibit FOIT (no element has `visibility: hidden` waiting on a font load — `font-display: swap` per `next/font`).
  Tested by: `tests/e2e/design.spec.ts`
  Proves: plan.md § Edge case 7 — Font loading

- ID: E-m0-006
  GIVEN `/_design` is loaded at viewport 430×844
  WHEN the user opens the `<Modal>` via its trigger
  THEN the modal's bottom inset (computed `padding-bottom`) is ≥ `env(safe-area-inset-bottom)` value (or at least `0px` resolved, with the rule referencing `var(--safe-bottom)` in source). The CTA button inside the modal has its bottom edge at least `var(--safe-bottom)` above the viewport bottom.
  Tested by: `tests/e2e/design.spec.ts`
  Proves: plan.md § Edge case 6 — Modal/Sheet on iOS Safari

- ID: E-m0-007
  GIVEN `/_design` is loaded
  WHEN the browser console is observed during page load and basic interaction (open/close modal, toggle Toggle, +/- stepper)
  THEN there are zero console errors and zero unhandled promise rejections.
  Tested by: `tests/e2e/design.spec.ts`
  Proves: plan.md § Components — all primitives render cleanly (Quality Gate: "No console errors")

- ID: E-m0-008
  GIVEN `/_design` is loaded
  WHEN `getComputedStyle(document.documentElement).getPropertyValue('--bg')` is read
  THEN it equals `#07090f`. Same for `--ink` (`#f5f1e8`), `--accent` (`#fbbf24`), and `--cat-passive` (`#64748b`).
  Tested by: `tests/e2e/design.spec.ts`
  Proves: plan.md § Design tokens — Colors (runtime resolution)

### Accessibility (axe via Playwright)

- ID: A-m0-001
  GIVEN `/_design` is loaded
  WHEN `@axe-core/playwright` runs against the full page
  THEN there are zero violations of severity `serious` or `critical`.
  Tested by: `tests/e2e/design.a11y.spec.ts`
  Proves: plan.md § Edge case 3 — Token contrast on `#07090f` + Acceptance criteria

- ID: A-m0-002
  GIVEN `/_design` is loaded
  WHEN axe is configured with only the `color-contrast` rule and run against text using `--ink` and `--ink-dim` over `--bg`/`--bg-elev`
  THEN there are zero violations. (Plan.md asserts ~17.5:1 for `--ink` and ~8.7:1 for `--ink-dim` on `#07090f` — both pass WCAG AA.)
  Tested by: `tests/e2e/design.a11y.spec.ts`
  Proves: plan.md § Edge case 3 — WCAG AA contrast (ADR-011)

- ID: A-m0-003
  GIVEN `/_design` is loaded
  WHEN every `<button>`, `[role="button"]`, and `[role="switch"]` is enumerated
  THEN each has a non-empty accessible name (text content OR `aria-label` OR `aria-labelledby`).
  Tested by: `tests/e2e/design.a11y.spec.ts`
  Proves: plan.md § Components — all interactive primitives expose accessible names

- ID: A-m0-004
  GIVEN `/_design` is loaded
  WHEN `Tab` is pressed repeatedly to traverse focusable elements
  THEN every interactive primitive in the harness is reached, the focused element shows a visible focus ring (computed `outline-style !== "none"` OR `box-shadow` contains a focus-ring token), and tab order is the document source order.
  Tested by: `tests/e2e/design.a11y.spec.ts`
  Proves: plan.md § Components — focus management (Quality Gate: a11y 100)

- ID: A-m0-005
  GIVEN `/_design` is loaded with the `<Modal>` open
  WHEN axe runs again
  THEN there are zero new violations introduced by the open dialog (`role="dialog"`, `aria-modal="true"`, focus trapped inside the modal, ESC closes).
  Tested by: `tests/e2e/design.a11y.spec.ts`
  Proves: plan.md § Components — `<Modal>` (a11y semantics)

### Spec gaps

- **None blocking.** Plan.md M0 is internally consistent; every Component, Edge case, and Acceptance criterion has at least one test ID above.
- **Note (deferred audit, not an M0 gap):** the migration table flags `A-bld-001..005` and `C-bld-001..010` for re-author at M1 because of the `--bg` re-base. M0's `A-m0-*` tests cover the new harness page only; if axe flags a regression on the legacy Page 1 surface when run there, that is an M1 dispatch concern.
- **Note (not a gap):** plan.md mentions a contrast-pair table at the bottom of the harness page rendered with raw `style={{ color, background }}`. `A-m0-001` runs axe across the whole page and therefore includes that table; no separate ID needed.
