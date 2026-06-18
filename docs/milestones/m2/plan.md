## Milestone 2 — Add Block Flow — Plan

### Context

M2 wires the first interactive verb on top of M1's empty Building Shell: from a tap of the floating `+` or any empty timeline hour-row, the Add Block sheet opens, the user fills a plain form (Title / Start / End / Recurrence / Category), Saves, the sheet slides down, and a new block enters the timeline at its `start` row with stagger fade-in. The empty-state card unmounts; the hero stays at `0%` (scoring is M3). M2 **locks the `Block` and `Category` schemas** for the rest of Phase 1 — M3 fills blocks with bricks, M5 wires edit/delete, M8 wires persistence, M9 wires `appliesOn(rec, date)` resolution. M2 renders today only, so all blocks created today appear today regardless of their recurrence kind.

This is a **migration milestone, not a greenfield build**. M1 froze NowCard / TimelineBlock / Brick / BrickStepper / Scaffold / EmptyBricks as `[obsolete: not-imported-in-M1]`; M2 flips `TimelineBlock` to `[re-author]` and leaves the others obsolete (M3+ revisits). The four legacy CSS vars `--cat-health` / `--cat-mind` / `--cat-career` / `--cat-passive` are **removed** and replaced by a 12-color palette `--cat-1`..`--cat-12` (SG-m2-01 hexes locked below). `lib/types.ts`'s closed-set `Category = "health" | "mind" | "career" | "passive"` enum is **deleted**; `Category` becomes an object `{ id, name, color }` per ADR-032. `Block` widens to include `categoryId: string | null`, `recurrence: Recurrence`, and `bricks: Brick[]` (always `[]` in M2). `AppState` gains `categories: Category[]` (initial `[]` per ADR-039). All state mutation is in-memory via `useReducer`; localStorage is M8.

### File structure

**Create:**

- `components/AddBlockSheet.tsx` — `"use client"` host. Composes M0 `<Sheet>` + the form (`<Input>` Title with autofocus, two time-`<Input>`s for Start/End, `<RecurrenceChips>`, `<CategoryPicker>`, sticky `<Button>` Save, `<X>` Cancel top-left). Owns local form state, runs `lib/blockValidation.ts` predicates on every keystroke, surfaces inline errors and the soft-overlap warning, calls `onSave(block)` / `onCancel()` props supplied by `BuildingClient`. Manages a single internal "view" state — `'block' | 'newCategory'` — to render the new-category sub-form **inside the same `<Sheet>`** (decision per Cross-cutting concerns below; no nested portals).
- `components/RecurrenceChips.tsx` — 4-chip single-select: _Just today_ / _Every weekday_ / _Every day_ / _Custom range_. Default `just-today`. When _Custom range_ is selected, reveals two date-`<Input>`s (start, end ISO `YYYY-MM-DD`) and a 7-button weekday picker (`<Chip>` group, multi-select 0..6=Sun..Sat). Emits a fully-formed `Recurrence` discriminated-union value via `onChange(rec)`. Pure presentational — no validation; consumer (`AddBlockSheet`) calls `isValidCustomRange(rec)`.
- `components/CategoryPicker.tsx` — Renders existing `categories` as `<Chip>`s (single-select via `selectedCategoryId` prop) plus a "+ New" `<Chip>` and a "Skip" `<Chip>` (which sets `categoryId=null`). Tapping "+ New" calls `onRequestNewCategory()` (parent flips its view state to `'newCategory'`). Tapping a category chip calls `onSelect(categoryId)`. With zero categories, only "+ New" and "Skip" are visible (per AC #9).
- `components/NewCategoryForm.tsx` — Inline sub-form (rendered inside `AddBlockSheet` when the host's view is `'newCategory'`). Fields: Name `<Input>` (required, non-blank) + 12-color palette as a 4×3 `<Chip>` grid (single-select, swatches read CSS vars `--cat-1`..`--cat-12`). "Done" button is enabled when Name is non-blank AND a color is picked; on tap, calls `onCreate({ id: uuid(), name, color })` (which the parent dispatches as `ADD_CATEGORY` AND auto-selects on the block form, per AC #28+#29). "Cancel" button returns the parent's view to `'block'` without persisting.
- `components/SlotTapTargets.tsx` — Renders 24 absolutely-positioned, transparent `<button>` elements stacked **behind** the block-card layer (z-index below cards, above the hour-grid background). Each spans `HOUR_HEIGHT_PX` and triggers `onSlotTap(hour: number)` where `hour ∈ 0..23`. `aria-label="Add block at HH:00"` per button (44-px-tall hit area satisfies ADR-031 since `HOUR_HEIGHT_PX = 64`). Defaults to non-rendered when `editMode === true` to avoid future drag conflict (forward-compat note for M5).
- `lib/blockValidation.ts` — Pure helpers, no React, no Date dependencies (operates on `"HH:MM"` strings via `toMin` from `lib/dharma.ts`):
  - `isValidStart(start: string): boolean` — matches `/^([01]\d|2[0-3]):[0-5]\d$/`.
  - `isValidEnd(end: string | undefined): boolean` — undefined OR matches the same regex AND `≤ "23:59"`.
  - `endAfterStart(start: string, end: string | undefined): boolean` — true if end is undefined OR `toMin(end) > toMin(start)`.
  - `overlapsExistingBlock(blocks: Block[], candidate: { start: string; end?: string }): Block | null` — returns the **first** block whose `[start, end)` half-open interval intersects the candidate's interval (per ADR-006). When the candidate has no end, treat it as a 1-minute marker `[start, start+1)`. Used to drive the soft inline warning (AC #26).
  - `isValidCustomRange(rec: Recurrence): boolean` — for `kind === 'custom-range'`, asserts `start ≤ end` AND `weekdays.length > 0`; trivially true for other kinds.
- `lib/uuid.ts` — Single-line wrapper `export const uuid = () => crypto.randomUUID()`. Mockable seam for Vitest (`vi.mock('@/lib/uuid', () => ({ uuid: () => 'uuid-1' }))`) so generated block/category IDs are deterministic in tests.
- `tests/e2e/m2.spec.ts` — Playwright e2e for the M2 add-block surface (file path declared; bodies authored by BUILDER from `tests.md` IDs `E-m2-NN`).
- `tests/e2e/m2.a11y.spec.ts` — `@axe-core/playwright` accessibility scan with the sheet open AND closed (file path declared; bodies by BUILDER, IDs `A-m2-NN`).

**Modify:**

- `app/(building)/BuildingClient.tsx` — `[re-author: own blocks + categories state via useReducer; wire sheet open/close; pass callbacks to BottomBar, Timeline, AddBlockSheet]`. Specifically: (a) initialize state via `useReducer(reducer, defaultState())` where `defaultState()` returns `{ blocks: [], categories: [] }` (per ADR-018/039); (b) hold a sheet-open piece of local UI state `[sheetState, setSheetState] = useState<{ open: boolean; defaultStart: string }>({ open: false, defaultStart: '00:00' })`; (c) pass `onAddPress={() => setSheetState({ open: true, defaultStart: roundDownToHour(now) })}` to `<BottomBar>` and `onSlotTap={(hour) => setSheetState({ open: true, defaultStart: hourToHHMM(hour) })}` into `<Timeline>`; (d) on `<AddBlockSheet>`'s `onSave(block)`, dispatch `{ type: 'ADD_BLOCK', block }` and close the sheet; on its `onCreateCategory(category)`, dispatch `{ type: 'ADD_CATEGORY', category }` and stay open; (e) pass `state.blocks` to `<Timeline>` and `<BlueprintBar>`; (f) `roundDownToHour` is a 1-line local helper `(hhmm: string) => hhmm.slice(0, 2) + ':00'`, NOT a new lib export.
- `components/Timeline.tsx` — `[re-author: render TimelineBlock cards layered ABOVE SlotTapTargets layered ABOVE the hour-grid background; preserve M1's NowLine + auto-scroll + EmptyBlocks-when-zero-blocks branch]`. Specifically: (a) Outer scrollable container untouched; (b) Schedule column gets a new layered structure — z-index 0: hour-grid CSS gradient (M1, untouched), z-index 1: `<SlotTapTargets onSlotTap={onSlotTap} />`, z-index 2: `blocks.map(b => <TimelineBlock key={b.id} block={b} categories={categories} />)`, z-index 3: `<NowLine />` (always on top), z-index 2 (centered): `<EmptyBlocks />` only when `blocks.length === 0`; (c) Auto-scroll-to-now `useEffect` from M1 untouched; (d) Accepts new props `categories: Category[]` and `onSlotTap: (hour: number) => void`.
- `components/TimelineBlock.tsx` — `[re-author: consume new Block schema (categoryId, recurrence, bricks[]); position absolutely via timeToOffsetPx; height ∝ duration or HOUR_HEIGHT_PX/12 if no end; show category color dot when categoryId !== null; tap is no-op in M2]`. Specifically: (a) Props `{ block: Block; categories: Category[] }`; resolve `category = categories.find(c => c.id === block.categoryId) ?? null`; (b) Style `position: absolute; top: timeToOffsetPx(block.start, HOUR_HEIGHT_PX)`; (c) Height: when `block.end` is set, `timeToOffsetPx(block.end) - timeToOffsetPx(block.start)`; else `HOUR_HEIGHT_PX / 12` (≈ 5px) per SG-m2-05; (d) Inner DOM: title (`text-[--fs-14]`, single-line ellipsis), time range "HH:MM–HH:MM" or just "HH:MM" via existing `fmtRange` from `lib/dharma.ts` (extend or wrap to handle no-end), category color dot (8-px circle, `background: ${category.color}`) only when `category !== null`; (e) `onClick` handler is **explicitly empty** (no-op), preserved as a hook for M4 FLIP expand; (f) Stagger fade-in: wraps DOM in a Framer Motion `<motion.div>` with `variants={enterVariant}` and 30-ms stagger from M0 motion tokens — collapses to instant on `prefers-reduced-motion: reduce`.
- `components/BlueprintBar.tsx` — `[re-author: aggregate blocks by categoryId, render colored segments width ∝ sum-of-categorized-block-durations; preserve M1's empty-outline path]`. Specifically: (a) When `blocks.length === 0` OR `blocks.every(b => b.categoryId === null)`, render M1's empty-outline state untouched (no segments, NOW pin still computed via the inline 24-hour fallback); (b) Otherwise: filter `blocks.filter(b => b.categoryId !== null && b.end)`, group by `categoryId`, sum each group's duration in minutes (via `toMin(end) - toMin(start)`), compute each segment's width as `(sumMinutes / sumOfAllSegmentsMinutes) * 100`%, render in stable order (sorted by `categoryId` for determinism), color each via the resolved `category.color`; (c) Uncategorized blocks are excluded entirely per SG-m2-02; blocks without `end` are also excluded (M5 may revisit); (d) Legend stays hidden in M2 (M3 reintroduces with real per-category percentages).
- `components/BottomBar.tsx` — `[re-author: wire the + button's onClick to the new onAddPress prop; Voice button visibly-disabled treatment from M1 untouched]`. Specifically: accepts a new prop `onAddPress: () => void`, attaches it to the `+` button's `onClick`, removes the M1 no-op handler. The `+` button's M0 styling (primary amber, 44×44, `aria-label="Add"`) is preserved verbatim.
- `lib/types.ts` — `[re-author: replace closed-set Category enum with Category object; add Recurrence union; widen Block; introduce AppState]`. Specifically: (a) **DELETE** `type Category = "health" | "mind" | "career" | "passive"`, `CATEGORY_COLOR`, `CATEGORY_LABEL` (all four exports go away); (b) **ADD** `type Recurrence = { kind: 'just-today'; date: string } | { kind: 'every-weekday' } | { kind: 'every-day' } | { kind: 'custom-range'; start: string; end: string; weekdays: number[] }`; (c) **ADD** `type Category = { id: string; name: string; color: string }`; (d) **REPLACE** `Block` with the SPEC-locked shape — `id: string; name: string; start: string; end?: string; recurrence: Recurrence; categoryId: string | null; bricks: Brick[]`; (e) **ADD** `type AppState = { blocks: Block[]; categories: Category[] }`; (f) **ADD** `type Action = { type: 'ADD_BLOCK'; block: Block } | { type: 'ADD_CATEGORY'; category: Category }`; (g) **ADD** `function assertNever(x: never): never`. The old `CATEGORY_COLOR` / `CATEGORY_LABEL` consumers (none in M1's render path; check globally during BUILDER's first commit) must all be either removed or migrated.
- `lib/data.ts` — `[re-author: defaultState() returns { blocks: [], categories: [] }; remove any pre-pivot factory data; export reducer]`. Specifically: (a) `defaultState(): AppState` returns `{ blocks: [], categories: [] }` (per ADR-039 — no factory anything); (b) export `reducer(state: AppState, action: Action): AppState` implementing both action kinds with `assertNever(action)` exhaustiveness; (c) **DELETE** any factory blocks/categories that may have been seeded pre-pivot — none should exist after M1 but verify.
- `app/globals.css` — `[re-author: remove the 4 legacy --cat-* vars; add 12 palette vars per SG-m2-01]`. Concretely: delete `--cat-health` / `--cat-mind` / `--cat-career` / `--cat-passive`. Add `--cat-1`..`--cat-12` per SG-m2-01 hex list below. Document in a leading comment that category names live in user data, not CSS.
- `app/(building)/BuildingClient.imports.test.ts` — `[re-author: TimelineBlock is now expected in M2's import graph; M1 forbade it]`. Specifically: flip the `expect(imports).not.toContain('TimelineBlock')` assertion to `expect(imports).toContain('TimelineBlock')`; add explicit assertions that NowCard / Brick / BrickStepper / Scaffold / EmptyBricks remain absent. IDs preserved with `(re-authored M2)` suffix.

**Files unchanged (`[survives]`):**

- `components/TopBar.tsx`, `components/Hero.tsx`, `components/EmptyBlocks.tsx`, `components/EditModeProvider.tsx`, `components/AnimatedPercent.tsx`, `components/NowLine.tsx`
- `lib/useNow.ts`, `lib/dayOfYear.ts`, `lib/timeOffset.ts`, `lib/dharma.ts`, `lib/scoring.ts`, `lib/reducedMotion.ts`, `lib/motion.ts`, `lib/haptics.ts`

**Files staying obsolete (`[obsolete: not-imported-in-M2]`):**

- `components/NowCard.tsx` — M3 or M4 revisits (active-block surfacing).
- `components/Brick.tsx` — M3 revisits.
- `components/BrickStepper.tsx` — M4 revisits.
- `components/Scaffold.tsx` — M3 revisits.
- `components/EmptyBricks.tsx` — M3 revisits (lives inside an empty block's expanded view).

### Data model

M2 locks the SPEC schemas verbatim (see SPEC § "Locked schemas"). Reproduced here as the authoritative builder reference:

```ts
// lib/types.ts (post-M2)
export type Recurrence =
  | { kind: "just-today"; date: string } // ISO YYYY-MM-DD
  | { kind: "every-weekday" } // Mon–Fri
  | { kind: "every-day" }
  | { kind: "custom-range"; start: string; end: string; weekdays: number[] }; // 0=Sun..6=Sat

export type Category = {
  id: string; // crypto.randomUUID()
  name: string; // user-typed; not unique (AC #30)
  color: string; // one of var(--cat-1)..var(--cat-12) hex
};

export type Block = {
  id: string; // uuid
  name: string;
  start: string; // "HH:MM"
  end?: string; // "HH:MM" — half-open [start, end) per ADR-006
  recurrence: Recurrence;
  categoryId: string | null; // FK; null = uncategorized (SG-m2-07)
  bricks: Brick[]; // always [] in M2; M3 lands brick adding
};

export type AppState = { blocks: Block[]; categories: Category[] };

export type Action =
  | { type: "ADD_BLOCK"; block: Block }
  | { type: "ADD_CATEGORY"; category: Category };

export function assertNever(x: never): never {
  throw new Error(`unhandled ${JSON.stringify(x)}`);
}
```

**State management decision: `useReducer` (not two `useState` calls).** Rationale: M5 will add `DELETE_BLOCK` / `EDIT_BLOCK` actions, M3 will add `LOG_BRICK` / `UNLOG_BRICK` mutations, M9 will add `RESOLVE_RECURRENCE` semantics. A reducer with a discriminated `Action` union scales linearly with new mutations and stays exhaustive via `assertNever`. Two `useState`s would force prop-drilling two setters per component and silently allow incomplete updates (e.g., adding a category but forgetting to clear a stale form). `useReducer` is also the easier seam for M8 persistence (a single `dispatch` log replays into localStorage).

**ID generation:** every `Block` and `Category` gets its `id` from `lib/uuid.ts`'s `uuid()` (a 1-line wrapper around `crypto.randomUUID()`). The wrapper exists solely as a Vitest-mockable seam (`vi.mock('@/lib/uuid', ...)`).

**No persistence in M2.** Page refresh clears state — documented user-visible edge case below. M8 lands localStorage via the same reducer (the `Action` log replays to rehydrate).

### Components

| SPEC region                | Component path                                            | Migration                                                    | M2 behavior                                                                                                                                                                                                                                                |
| -------------------------- | --------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Floating `+` button        | `components/BottomBar.tsx`                                | `[re-author]`                                                | Wires `onClick` to new `onAddPress` prop. Style/a11y unchanged from M1.                                                                                                                                                                                    |
| Empty-slot tap target      | new `components/SlotTapTargets.tsx` (mounted by Timeline) | new                                                          | 24 absolute-positioned transparent `<button>`s, each `HOUR_HEIGHT_PX` tall. `aria-label="Add block at HH:00"`. z-index above hour-grid, below blocks.                                                                                                      |
| Add Block sheet            | new `components/AddBlockSheet.tsx`                        | new                                                          | Composes `<Sheet>` + form. Owns local form state + view-toggle (`'block' \| 'newCategory'`). Renders Title/Start/End/Recurrence/Category/Save/Cancel. `<Sheet>` provides `role="dialog"` and ESC-to-close already; M2 adds focus-trap (see Cross-cutting). |
| New-category inline form   | new `components/NewCategoryForm.tsx`                      | new                                                          | Renders inside `AddBlockSheet` when view is `'newCategory'` (NOT a nested portal — see Cross-cutting). Name `<Input>` + 12-color palette `<Chip>` 4×3 grid + Done/Cancel.                                                                                  |
| Block card on the timeline | `components/TimelineBlock.tsx`                            | `[re-author]` (was `[obsolete: not-imported-in-M1]` — flips) | Absolute-positioned card. Reads new `Block` shape. Stagger fade-in via `motion.div` with M0's enter variant. Tap is no-op (M4 wires expand).                                                                                                               |
| Day Blueprint bar          | `components/BlueprintBar.tsx`                             | `[re-author]`                                                | Aggregates by `categoryId`, renders colored segments. Empty-outline path from M1 preserved as fallback when zero categorized blocks exist.                                                                                                                 |
| Empty-state card           | `components/EmptyBlocks.tsx`                              | `[survives]`                                                 | M1's locked copy untouched. Conditional rendering moved into Timeline's `blocks.length === 0` branch.                                                                                                                                                      |
| Recurrence chips           | new `components/RecurrenceChips.tsx`                      | new                                                          | 4 single-select `<Chip>`s + custom-range sub-controls. Emits a fully-formed `Recurrence` value.                                                                                                                                                            |
| Category picker            | new `components/CategoryPicker.tsx`                       | new                                                          | Renders categories + "+ New" + "Skip". Calls `onRequestNewCategory` to flip parent's view.                                                                                                                                                                 |

**A11y attributes:**

- `<Sheet>` already sets `role="dialog"` + `aria-modal="true"` + `aria-label={title}`. M2 passes `title="Add Block"` (or `"New Category"` when in new-category view).
- **Focus trap:** `<Sheet>` does NOT currently trap focus. M2 adds a `useFocusTrap` effect inside `AddBlockSheet` that on open: (a) records `document.activeElement` as the return target, (b) focuses the Title `<Input>`, (c) intercepts Tab/Shift+Tab via `keydown` to cycle within the sheet, (d) on close, restores focus to the return target (the floating `+` button or the slot-tap button). This is a **local hook in AddBlockSheet**, NOT a change to the `<Sheet>` primitive (preserves M0's surface contract for other consumers).
- Save button uses `aria-disabled={!isValid}` (NOT the native `disabled` attribute — keeps the button focusable so SR users can hear the disabled-state announcement). Tap on `aria-disabled` is no-op via the button's own `onClick` guard.
- Recurrence chips: `role="radiogroup"` on the wrapper, `role="radio"` + `aria-checked` on each chip (single-select semantics). Custom-range weekday picker uses `role="group"` + `aria-checked` per chip (multi-select).
- Category picker: `role="radiogroup"` for category single-select; "+ New" and "Skip" are plain `<button>`s.
- Color palette in NewCategoryForm: `role="radiogroup"` + `role="radio"` per swatch, each `aria-label="Color N"` (1..12).
- Tab order: Title → Start → End → Recurrence chips → (if custom) date inputs → weekdays → Category chips → Skip → "+ New" → Save → Cancel. Matches visual order.

**M0 motion tokens consumed:**

- `modalIn` — sheet open transition (per AC #15 inverse: SPEC says "sheet slides down" on close; sheet slides UP on open is implicit. Use `modalIn` for open, `modalOut` for close).
- `modalOut` — sheet close transition.
- Stagger 30 ms — new-block entrance fade-in (per AC #16).
- `tap` scale — `<Chip>` and `<Button>` press feedback (M0 primitive built-in; nothing M2 adds).

**`prefers-reduced-motion: reduce` collapse points:**

- Sheet open/close — instant (no slide).
- New-block stagger fade-in — instant render, no opacity tween.
- All `<Chip>` tap-scale — already gated inside the M0 primitive (no M2 changes).

### Dependencies

**Zero new npm packages.** `crypto.randomUUID()` is a built-in browser+Node API (Next 15 Edge runtime ships it). Framer Motion, Tailwind, lucide-react, all M0 primitives, axe-core/playwright — all present.

### Design tokens

**SG-m2-01 — locked 12-color palette.** All 12 colors checked for WCAG AA contrast against `--bg` (`#07090f`); `--cat-4` lightened from `#64748b` to `#94a3b8` to clear the threshold. Add to `app/globals.css` `:root`:

```css
/* Category palette — user picks one per category they create.
   No category names live in code; see ADR-032/039. */
--cat-1: #34d399; /* emerald (M0 carry-over) */
--cat-2: #c4b5fd; /* lavender (M0 carry-over) */
--cat-3: #fbbf24; /* amber (M0 carry-over) */
--cat-4: #94a3b8; /* slate (M0 carry-over, lightened from #64748b for AA) */
--cat-5: #fb7185; /* rose */
--cat-6: #fb923c; /* orange */
--cat-7: #a3e635; /* lime */
--cat-8: #2dd4bf; /* teal */
--cat-9: #38bdf8; /* sky */
--cat-10: #818cf8; /* indigo */
--cat-11: #e879f9; /* fuchsia */
--cat-12: #d4a373; /* warm-neutral */
```

**REMOVED from `:root`:** `--cat-health`, `--cat-mind`, `--cat-career`, `--cat-passive`. M1's render path doesn't reference them; verify global grep returns zero hits before BUILDER's first green commit.

All other tokens unchanged from M0/M1: `--bg`, `--bg-elev`, `--ink`, `--ink-dim`, `--accent`, `--accent-deep`, `--card-edge`, `--font-display`, `--font-ui`, `--font-body`, `--fs-*`, `--sp-*`, `--safe-bottom`. NewCategoryForm's swatch chips use `style={{ background: var(--cat-${i}) }}` (NOT inline hex).

### Edge cases (HOW)

- **Empty Title** → `isValid = title.trim().length > 0 && ...`; Save's `aria-disabled` flips to `true`; inline message `<p role="alert" id="title-error">Title is required</p>` rendered with `aria-describedby` on the Title `<Input>`.
- **End not set** → block renders with height `HOUR_HEIGHT_PX / 12` ≈ 5 px per SG-m2-05; time-range label shows just `"HH:MM"` (no en-dash). Wrap `lib/dharma.ts:fmtRange` or add a 1-line conditional in `TimelineBlock`.
- **End ≤ Start** (when End set) → `endAfterStart(start, end)` returns false; inline error `"End must be after Start"`; Save disabled.
- **End past 23:59** → `isValidEnd(end)` returns false (regex rejects `24:00`+); inline error `"End must be before midnight"`; Save disabled. (M2 explicitly does NOT support cross-midnight blocks.)
- **Soft overlap warning** → `overlapsExistingBlock(blocks, candidate)` returns the first colliding block; inline `<p role="status">Overlaps with [name]</p>`; Save **still enabled** per AC #26.
- **Half-open boundary** → `overlapsExistingBlock` uses `<` not `≤` on the end-vs-start comparison; back-to-back `10:00–11:00` and `11:00–12:00` do NOT trigger the warning. Unit test asserts this directly.
- **Custom-range with zero weekdays** → `isValidCustomRange(rec)` returns false; inline error `"Pick at least one weekday"`; Save disabled.
- **First block before any category exists** → `categories.length === 0`; CategoryPicker renders only "+ New" and "Skip"; Save with `categoryId: null` is allowed.
- **Skip category** → Save sends `categoryId: null`; block stored; BlueprintBar excludes it (categoryId-null filter); TimelineBlock renders without color dot.
- **New category created then block Cancelled** → AddBlockSheet's `onCreate(category)` immediately dispatches `ADD_CATEGORY` (so the category persists in `state.categories` even if the user later taps Cancel on the block form). This satisfies AC #28 explicitly. The newly-created category also auto-selects on the block form, so Cancel discards only the block draft, not the category.
- **Sheet swipe-down (iOS)** → swipe-down dismissal is browser-native; M2 does NOT intercept it. Treated as silent-discard equivalent to Cancel per SG-m2-06. (No undo toast; that's M7 polish.)
- **`prefers-reduced-motion: reduce`** → AddBlockSheet wraps motion via `lib/reducedMotion.ts`'s media-query observer; new-block stagger collapses to instant; sheet open/close uses no `transition` properties.
- **Page refresh** → all state lost (no persistence until M8). M2 does not surface a banner; this is documented behavior. Tests assert `localStorage.length === 0` after Save (no accidental writes).
- **Very long Title** → CSS `text-overflow: ellipsis; overflow: hidden; white-space: nowrap` on TimelineBlock's title; M4's expanded view will reveal the full string.
- **Two categories with identical Name** → CategoryPicker renders both as separate chips (different IDs); selection by `categoryId` so disambiguation is automatic. AC #30 lock.
- **Reduced-motion + stagger** → `motion.div` reads `useReducedMotion()` from Framer Motion; on `true`, sets `transition: { duration: 0 }`.
- **`+` default Start** → `roundDownToHour(useNow())` per SG-m2-04 — string slice `now.slice(0, 2) + ':00'` (no Date math).
- **Empty-state card flicker** → unmounts as soon as `state.blocks.length > 0` (synchronous on dispatch); re-mounts only if every block is removed (M5+ surface). No transition on unmount in M2.

### Out of scope for M2

(Mirrored verbatim from SPEC § Out of scope:)

- Brick creation inside or outside a block — M3
- 3 brick types (tick / goal / time) — M3
- Live scoring / hero `%` updates — M3
- Block expand / FLIP animation on tap — M4
- Edit block, "Just today" / "All future" / "All events" delete prompts — M5
- Drag reorder — M6
- Cinematic polish layer — M7
- Inline natural-language Title parsing — M7 (per ADR-036)
- Persistence to localStorage — M8
- Recurrence resolution `appliesOn(rec, date)` — M9 (M2 renders only today's `blocks`)
- Castle / Kingdom / Empire navigation — M9
- Voice mic — M10
- Multi-day blocks crossing midnight — never (or much later)
- Category management (rename / delete / merge / reorder) — later milestone
- Loose Bricks tray (standalone bricks with `parentBlockId: null`) — M3
- NowCard surfacing the active block — M3 or M4
- `programStart`-relative `dayNumber` — M8 (M1's `dayOfYear()` stays in M2)
- Lighthouse measurement from the sandbox — still pending Vercel access

### Migration table for prior-pivot tests

`docs/tests.md` carries M0 + M1 IDs. M2 mutates the schema layer (`lib/types.ts`) and several render paths. The component-test files affected:

| Component / test file                                                                                | Migration tag for M2                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/TopBar.test.tsx`                                                                         | `[survives]` — no behavior change.                                                                                                                                                                                                                    |
| `components/Hero.test.tsx`                                                                           | `[survives]` — `pct={0}` still hardcoded; scoring is M3.                                                                                                                                                                                              |
| `components/BlueprintBar.test.tsx`                                                                   | `[re-author: add non-empty-categorized-blocks segment-rendering tests; preserve M1 empty-outline tests]` — M1 IDs preserved with `(re-authored M2)` suffix; new M2 IDs `C-m2-NN`.                                                                     |
| `components/Timeline.test.tsx`                                                                       | `[re-author: assert TimelineBlock cards render layered above SlotTapTargets; assert SlotTapTargets has 24 buttons; preserve M1 hour-grid + NowLine + auto-scroll tests]` — M1 IDs preserved with `(re-authored M2)` suffix.                           |
| `components/TimelineBlock.test.tsx`                                                                  | `[re-author: file flips from obsolete to active; consume new Block schema; absolute positioning math; height-with-and-without-end; category-color-dot conditional]` — fresh M2 IDs `C-m2-NN`.                                                         |
| `components/Brick.test.tsx` / `BrickStepper.test.tsx` / `Scaffold.test.tsx` / `EmptyBricks.test.tsx` | `[obsolete: not-imported-in-M2]` — unchanged from M1.                                                                                                                                                                                                 |
| `components/BottomBar.test.tsx`                                                                      | `[re-author: assert + button calls onAddPress prop on click; Voice button visibly-disabled treatment from M1 untouched]` — M1 IDs preserved with `(re-authored M2)` suffix.                                                                           |
| `components/EditModeProvider.test.tsx`                                                               | `[survives]`.                                                                                                                                                                                                                                         |
| `components/AnimatedPercent.test.tsx`                                                                | `[survives]`.                                                                                                                                                                                                                                         |
| `app/(building)/BuildingClient.test.tsx`                                                             | `[re-author: state managed via reducer; sheet-open state wired; assert BlueprintBar receives blocks; assert Timeline receives onSlotTap; assert AddBlockSheet receives onSave + onCreateCategory]` — M1 IDs preserved with `(re-authored M2)` suffix. |
| `app/(building)/BuildingClient.imports.test.ts`                                                      | `[re-author: TimelineBlock now expected; M1 forbade it]` — flip the assertion.                                                                                                                                                                        |
| `lib/types.test.ts` (if any; otherwise new)                                                          | `[re-author: closed-set Category enum DELETED; replaced by object shape]` — fresh M2 IDs `U-m2-NN`. Old enum tests deleted with explicit explanation.                                                                                                 |
| `lib/data.test.ts`                                                                                   | `[re-author: defaultState() returns { blocks: [], categories: [] }; reducer handles ADD_BLOCK + ADD_CATEGORY exhaustively]` — M1 IDs preserved with `(re-authored M2)` suffix.                                                                        |
| `tests/e2e/m1.spec.ts`                                                                               | `[survives]` — empty-Building scenarios still apply when no blocks added.                                                                                                                                                                             |
| `tests/e2e/m1.a11y.spec.ts`                                                                          | `[survives]`.                                                                                                                                                                                                                                         |
| `tests/e2e/m2.spec.ts` (new)                                                                         | New — `+`-button-add path, slot-tap-add path, Cancel-no-block, sheet open with default-start, validation errors, soft overlap warning, new-category inline flow. Fresh IDs `E-m2-NN`.                                                                 |
| `tests/e2e/m2.a11y.spec.ts` (new)                                                                    | New — axe scan with sheet OPEN and CLOSED. Fresh IDs `A-m2-NN`.                                                                                                                                                                                       |

EVALUATOR fails any milestone that drops a `[survives]` test without explanation OR that removes a closed-set-Category enum test without confirming all consumers migrated. The TESTS-mode dispatch will translate the above into a proper migration table at the top of `tests.md`'s M2 section and start fresh M2 IDs from `U-m2-001`, `C-m2-001`, `E-m2-001`, `A-m2-001` (continuing the per-milestone numbering convention).

### Spec gaps (locked at PLAN per pre-resolved defaults; new ones surfaced for Gate #1)

- **SG-m2-01 — Category color palette.** Locked: 12 hex values listed in Design tokens above (`--cat-1`..`--cat-12`). All checked WCAG AA on `#07090f`. The 4 legacy `--cat-*` vars are **removed** from `app/globals.css`. No category names ship in code (per § 0.14 antipattern 2).
- **SG-m2-02 — Uncategorized block in BlueprintBar.** Locked: **excluded** entirely — § 0.14 antipattern 3 ("absence of a category is itself meaningful"). BlueprintBar's segment math filters `categoryId !== null && end !== undefined`.
- **SG-m2-03 — Loose Bricks tray location.** Carried to M3 PLAN; does NOT block M2.
- **SG-m2-04 — `+` default Start.** Locked: round current time DOWN to nearest hour. Implementation: `now.slice(0, 2) + ':00'` (string-only, no Date math).
- **SG-m2-05 — End = blank rendering.** Locked: thin marker, `HOUR_HEIGHT_PX / 12` ≈ 5 px tall.
- **SG-m2-06 — Sheet swipe-down with dirty form.** Locked: silent discard. Undo toast deferred to M7.
- **SG-m2-07 — `categoryId` FK vs inline.** Locked: FK (`categoryId: string | null`). SPEC schema reflects.
- **SG-m2-08 — Empty timeline row tap target.** Locked: 24 absolutely-positioned transparent `<button>` elements via new `components/SlotTapTargets.tsx`. z-index above hour-grid, below blocks.
- **SG-m2-09 — Sheet focus trap is local to AddBlockSheet, not the M0 `<Sheet>` primitive (NEW).** Surfaced by analysis: `<Sheet>` ships `role="dialog"` + `aria-modal="true"` + ESC-close, but does NOT trap Tab focus. M2 adds the focus trap as a local effect inside `AddBlockSheet` (`useFocusTrap`) so the M0 surface contract stays unchanged for other consumers (Settings sheet later, etc.). If the trap proves needed by other M0 consumers, M5 or later may promote it into the primitive — out of scope for M2. **Recommendation: keep local; lock at Gate #1.**
- **SG-m2-10 — `lib/dharma.ts:fmtRange` no-end behavior (NEW).** Surfaced by analysis: existing `fmtRange(start, end)` assumes both arguments. With M2's `end?: string`, callers (TimelineBlock, possibly NowCard at M3) need a no-end branch returning just `start`. Two options: (a) widen `fmtRange` to accept `end: string | undefined` and branch internally, (b) add a 1-line `fmtTimeOrRange(start, end?)` wrapper. **Recommendation: (a)** — single source of truth. Lock at Gate #1.
- **SG-m2-11 — Category color picker in NewCategoryForm: required vs optional (NEW).** SPEC AC #11 says Save is enabled when "Title is non-blank, Start is valid, and any sub-form errors are clear." For NewCategoryForm specifically, AC #10 says "Name `<Input>` and a 12-color palette picker" but doesn't explicitly say color is required. **Recommendation: required** — picking no color creates a category with no visual identity, which contradicts the entire BlueprintBar UX. Lock the "Done" button as `aria-disabled` until both Name and Color are set. Surface at Gate #1 for ratification.

### Cross-cutting concerns BUILDER will hit

- **`useReducer` action union must be exhaustive.** Implement reducer with a `switch (action.type)` and a `default: return assertNever(action)` arm. Every new action kind in future milestones MUST extend the `Action` union AND add a switch case — `assertNever` makes the omission a compile-time error. Document this contract in a comment above `lib/data.ts:reducer`.
- **`<Sheet>` nesting decision.** The M0 `<Sheet>` primitive (read at `components/ui/Sheet.tsx`) is a single `role="dialog"` portal with `children`; it does NOT support a stack of sheets and does NOT trap focus. **Decision: a single `<Sheet>` instance with conditional sub-views.** `AddBlockSheet` holds `view: 'block' | 'newCategory'` local state; the same `<Sheet>` body renders either the block-form or the new-category form depending on `view`. NewCategoryForm is NOT a separate `<Sheet>` instance. Rationale: (a) avoids nested portals (which break focus restoration), (b) the SPEC describes "the sheet expands" (singular), (c) keeps the M0 primitive contract minimal. The `<Sheet>` `title` prop is updated per view (`"Add Block"` vs `"New Category"`) so the SR-announced label stays accurate. A "Back" arrow on the new-category view returns to `'block'` without dismissing the sheet.
- **TimelineBlock height math.** Single source of truth: `lib/timeOffset.ts:timeToOffsetPx`. Compute `top = timeToOffsetPx(block.start, HOUR_HEIGHT_PX)` and (when end is set) `height = timeToOffsetPx(block.end, HOUR_HEIGHT_PX) - top`; else `height = HOUR_HEIGHT_PX / 12`. Do NOT duplicate the math. `HOUR_HEIGHT_PX` stays imported from `components/Timeline.tsx` (M1's exporter); if it isn't already exported from a shared module, BUILDER's first M2 commit must hoist it to `lib/timeOffset.ts` and re-import in Timeline (single-source-of-truth refactor).
- **BlueprintBar non-empty path math.** Aggregate **by `categoryId`**, not per-block. Sum each category's total duration across all of today's blocks; segment width = `(categorySumMinutes / totalCategorizedMinutes) * 100`% (relative to ONLY categorized blocks, NOT to the 24-hour day). Render in `categoryId`-sorted order for determinism. Avoid `Object.entries` ordering surprises by sorting explicitly. Skip uncategorized + no-end blocks before aggregation.
- **ESLint `react-hooks/exhaustive-deps`.** M1's auto-scroll-on-mount `useEffect` already disables this rule (justified — runs once on mount). M2's reducer + sheet-state effects must NOT add new disables. If a builder hits a deps complaint, fix it via `useCallback` or by moving the dep into the effect; do not disable.
- **`crypto.randomUUID()` test mocking.** All Vitest tests that assert specific block/category IDs MUST `vi.mock('@/lib/uuid', () => ({ uuid: () => 'uuid-1' }))` (or use a sequential counter for multi-block scenarios). Without mocking, snapshot tests would be non-deterministic.
- **`<Chip>` `role="radio"` for single-select.** M0's `<Chip>` primitive doesn't currently set `role="radio"`. M2's RecurrenceChips and CategoryPicker wrap their chip groups with `role="radiogroup"` and pass `role="radio"` + `aria-checked={selected}` per chip via `<Chip>`'s pass-through props (it forwards `...rest` to the underlying `<button>`). Verify this in M0 `Chip.tsx` during BUILDER's first read; if it doesn't forward, the wrapper handles via `aria-*` on the parent and the chip becomes `role="presentation"`. **Document the discovery in a code comment** rather than modifying M0's primitive.
- **`prefers-reduced-motion` handoff.** Use `lib/reducedMotion.ts:useReducedMotion()` (or Framer Motion's hook of the same name — pick one consistently and document) inside `AddBlockSheet` and `TimelineBlock`. The M0 `<Sheet>` primitive does NOT consult this token internally (verified by Read), so M2 must wrap its open animation in the consumer.
- **Half-open `[start, end)` test fixture.** Add a unit test fixture asserting `overlapsExistingBlock(blocks=[10:00–11:00], candidate={start:11:00, end:12:00})` returns `null`. ADR-006 lock — every future block-math feature inherits this contract.
