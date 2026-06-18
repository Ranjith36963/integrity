## Milestone 3 — Add Brick Flow + Live Scoring + Visual Fill — Plan

### Pillars consumed

- **§ 0.1 — the wedge.** Dharma scores PROOF, not plans. M3 wires the math layer (already shipped in M0) to a real schema and to live DOM, so every brick-add observably changes `dayPct(state)` even when the change is `0 → 0`.
- **§ 0.3 — visual identity.** The Hero ring is the dopamine surface. M3 introduces it as an SVG arc wrapping (not replacing) M1's `<Hero>` numeral.
- **§ 0.5 — interaction primitives.** Three brick types — `tick` / `goal` / `time` — surfaced via the AddBrickSheet type-selector chip cards. M3 wires creation; M4 wires logging.
- **§ 0.9 — data model.** Bricks are never timed (M3 stores `durationMin` for `time` bricks but does not animate elapsed time — that's M4). Bricks live inside a Block via `block.bricks[]` OR standalone in `state.looseBricks[]`. Brick category is independent of parent block (`categoryId` on the Brick, not inherited at read-time).
- **§ 0.11 — Loose Bricks tray LOCKED Option A.** Pinned above dock; visible iff `blocks.length > 0 || looseBricks.length > 0`; collapsed chip-row default; chevron expands.
- **§ 0.14 — no factory anything.** Per ADR-039, M3 ships zero factory bricks, zero factory categories, zero seed data.
- **ADR-019 — recurrence stays untouched in M3.** Brick is non-recurring (recurrence lives on Block only); M3 does not extend the `Recurrence` union.
- **ADR-022 — one feature per dispatch.** This entry covers M3 only — Add Brick flow + scoring extension + visual fill primitives. M4 (logging) and M5 (edit/delete) are explicit out-of-scope.
- **ADR-026 — single planning gate.** This `plan.md` entry will be reviewed alongside the `tests.md` entry written in the auto-chained `mode: TESTS` dispatch. No code is written between PLAN and TESTS.
- **ADR-027 — commit prefix.** `docs(plan-m3): …` for this entry; tests dispatch uses `docs(tests-m3): …`.
- **ADR-031 — 44 px touch target.** All `<BrickChip>` instances ≥ 44 px tall. Loose Bricks tray's collapsed-row chips also clear 44 px (chip body inside a ≥ 56 px row).
- **ADR-032 — categories user-defined.** AddBrickSheet's category picker reuses the M2 `<CategoryPicker>` + `<NewCategoryForm>` verbatim; brick → category resolution is by FK lookup at render time.
- **ADR-034 — blocks always timed.** Unchanged in M3. The Loose Bricks tray exists precisely because bricks are NOT bound to time.
- **ADR-035 — bricks can be standalone.** M3 wires the standalone path via the tray's `+` Brick pill (`parentBlockId: null` save).
- **ADR-039 — ships empty.** `looseBricks: Brick[]` initial value is `[]`; the literal-empty state (zero blocks AND zero loose bricks) hides the tray entirely so M1's empty-state card stays the sole surface.

### File structure

**New files (6):**

- `components/AddBrickSheet.tsx` — `"use client"` host. Composes M0 `<Sheet>` + form (Title `<Input>`, 3-chip Type selector, per-type fields, `<CategoryPicker>`, sticky Save, X Cancel). Owns local form state + view toggle (`view: 'brick' | 'newCategory'`). Mirrors M2's `<AddBlockSheet>` single-`<Sheet>`-instance pattern.
- `components/BrickChip.tsx` — Rounded-rect 44-px-tall chip. Background = category color at 12% alpha (or `--surface-2` when uncategorized). Foreground gradient overlay = category color at 60% alpha, width = `brickPct(brick)%`. Animated via M0 `brickFill` token. Type-specific badge slot. Used in expanded blocks AND in the tray.
- `components/HeroRing.tsx` — SVG circle wrapping the existing `<Hero>` numeral. Stroke-dashoffset reflects day score. Animated via M0 `brickFill` token. SSR-safe via the M1 `mounted` two-pass pattern (server renders `0%`, client hydrates).
- `components/LooseBricksTray.tsx` — Pinned-above-dock region. Renders iff `state.blocks.length > 0 || state.looseBricks.length > 0`. Collapsed chip-row default (max-height 56 px); chevron-up expands to vertical list (max-height ~40 vh). Always shows the `+ Brick` pill in the rightmost trailing position.
- `lib/celebrations.ts` — Pure helpers for cross-detection. `useCrossUpEffect(value, threshold, fn)` (custom hook) — fires `fn()` once when `value` transitions from `< threshold` to `>= threshold`, resets when value drops back below threshold. Used by `<TimelineBlock>` (block 100% bloom + chime + `success` haptic) and `<HeroRing>` host (day 100% fireworks + `notification` haptic). Pure module so unit tests can drive it directly.
- `public/sounds/chime.mp3` — Single small (< 30 KB) chime asset. Loaded via `new Audio('/sounds/chime.mp3')` on app boot. Mute respect: lets the OS handle mute (no manual gate in M3); SG-m3-12 recommendation.

**Files extended (9):**

- `lib/types.ts` — Rewrite `Brick` per locked schema (adds `id` / `categoryId` / `parentBlockId`; renames goal/time progress fields). Add `looseBricks: Brick[]` to `AppState`. Extend `Action` union with `{ type: 'ADD_BRICK'; brick: Brick }`. `assertNever` exhaustiveness preserved.
- `lib/data.ts` — `defaultState()` returns `{ blocks: [], categories: [], looseBricks: [] }`. Reducer adds `ADD_BRICK` case; routes by `brick.parentBlockId` (null → push to `looseBricks`, non-null → find block by id and push to its `bricks[]`, immutably).
- `lib/dharma.ts` — `brickPct` field reads updated to match new schema (`b.count / b.target` for goal; `b.minutesDone / b.durationMin` for time). `dayPct(blocks: Block[])` REPLACED by `dayPct(state: AppState)` — averages over the union of `state.blocks` (each as one `blockPct` unit) and `state.looseBricks` (each as one `brickPct` unit); empty-state floor `0`. New: `categoryDayPct(state: AppState, categoryId: string): number` — averages bricks AND blocks attributed to that category; bricks-inside-block contribute to THEIR own category, not the block's; standalone bricks with `categoryId: null` excluded from category-filtered queries but counted in `dayPct`. All return `[0, 100]`.
- `lib/motion.ts` — Add `fireworks: 1.6` second (or 1600 ms) Duration token + `easeOut` curve binding. Existing `brickFill`, `bloom`, `modalIn`, `modalOut`, `stagger` tokens reused unchanged.
- `lib/blockValidation.ts` — Add `isValidBrickGoal(target: number): boolean` (integer ≥ 1) and `isValidBrickTime(durationMin: number): boolean` (integer ≥ 1). No new module — same file, same predicate naming convention.
- `components/Hero.tsx` — Wrap the existing numeral inside the new `<HeroRing>`. Numeral text node + font tokens unchanged. Now reads `dayPct(state)` instead of `dayPct(state.blocks)`. Adds `aria-label="Day score: ${pct}%"` + `aria-live="polite"`.
- `components/TimelineBlock.tsx` — Add left vertical scaffold bar (4 px wide, full card height, fills bottom-up by `blockPct(block)`; color = category color or `--text-dim`). Add tap-to-expand: card grows in height (max-height transition 200 ms eased; reduced-motion → instant) revealing vertical list of `<BrickChip>`s + `+ Add brick` ghost button. Re-tap collapses. Wire `useCrossUpEffect(blockPct, 100, fireBloom)` for one-shot bloom + chime + `success` haptic. View-mode-only expand (M5 wires edit-mode interactions).
- `components/BlueprintBar.tsx` — Per-segment opacity = `0.3 + ((blockPct(block) / 100) × 0.7)`, clamped `[0.3, 1]`. Uncategorized blocks remain excluded (SG-m2-02 invariant). Aggregation, sort order, and empty-outline fallback from M2 untouched.
- `app/(building)/BuildingClient.tsx` — Add a second piece of sheet UI state for AddBrickSheet (`brickSheetState: { open: boolean; parentBlockId: string | null; defaultCategoryId: string | null }`). Pass `onAddBrick` callback into `<TimelineBlock>` (for inside-block path) and `<LooseBricksTray>` (for standalone path). On `<AddBrickSheet>`'s `onSave(brick)`, dispatch `{ type: 'ADD_BRICK', brick }` and close. Mount `<LooseBricksTray>` between the timeline scroll container and `<BottomBar>`. Wire `useCrossUpEffect(dayPct, 100, fireFireworks)`.

**Files unchanged (8) — why still clean:**

- `lib/uuid.ts` — Mockable seam from M2. M3 generates Brick IDs via the same `uuid()` wrapper.
- `lib/haptics.ts` — M0 primitive. M3 calls `light` (chip-select), `success` (Save + block 100%), `medium` (validation error), `notification` (day 100%) — all already exposed.
- `components/AddBlockSheet.tsx` — M2 surface untouched. M3's AddBrickSheet is a sibling, not an extension.
- `components/SlotTapTargets.tsx` — M2 contract preserved (returns null when `editMode === true`, per C-m2-013). M3 adds no edit-mode-specific behavior.
- `components/CategoryPicker.tsx` — Reused as-is inside AddBrickSheet. First reuse outside `<AddBlockSheet>`.
- `components/NewCategoryForm.tsx` — Reused as-is inside AddBrickSheet. Single `<Sheet>` instance with `view: 'newCategory'` view-toggle pattern carries over.
- `components/BottomBar.tsx` — `+` button stays "New Block" verb. No long-press menu, no chooser modal (SG-m3-08 lock).
- `components/EditModeProvider.tsx` — M2 wiring untouched. M3 ships no edit-mode-specific affordances (those are M5).

### Migration tags

| Component / file                         | Prior tag                        | M3 tag                                                                          | Rationale                                                                                                                                          |
| ---------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/BrickChip.tsx`               | `[obsolete: not-imported-in-M2]` | `[re-author]`                                                                   | Promoted to active surface. Built fresh against the locked Brick schema — do NOT carry forward any pre-pivot field reads.                          |
| `components/BrickStepper.tsx`            | `[obsolete]`                     | `[obsolete]`                                                                    | M4 logging surface. M3 does not import.                                                                                                            |
| `components/BrickTimer.tsx` (if present) | `[obsolete]`                     | `[obsolete]`                                                                    | M4 logging (per ADR-017). M3 does not import.                                                                                                      |
| `components/Brick.tsx` (legacy wrapper)  | `[obsolete]`                     | `[obsolete]`                                                                    | Replaced by `<BrickChip>` in M3. M3 does not import.                                                                                               |
| `components/NowCard.tsx`                 | `[obsolete: not-imported-in-M2]` | `[obsolete: not-imported-in-M3]`                                                | Active-block surfacing is M3 or M4 per spec; M3 still defers. Keeps the file un-rendered.                                                          |
| `components/EmptyBricks.tsx`             | `[obsolete]`                     | `[obsolete: replaced by Loose Bricks tray empty pill]`                          | The `+ Brick` pill in the collapsed tray IS the empty-state surface for standalone bricks. The legacy empty-bricks card is permanently superseded. |
| `components/Scaffold.tsx`                | `[obsolete]`                     | `[obsolete]`                                                                    | The scaffold left-bar is now an inline DOM element inside `<TimelineBlock>`, not a separate component.                                             |
| `components/Hero.tsx`                    | `[survives]`                     | `[re-author: wrap numeral in <HeroRing>; consume dayPct(state)]`                | Numeral + font unchanged; ring is added around it; `pct` prop signature widened or replaced (decision below).                                      |
| `components/TimelineBlock.tsx`           | `[re-author M2]`                 | `[re-author: scaffold bar + tap-to-expand + <BrickChip> list + cross-up bloom]` | View-mode-only expand. Edit-mode behavior is M5.                                                                                                   |
| `components/BlueprintBar.tsx`            | `[re-author M2]`                 | `[re-author: per-segment opacity = 0.3 + (blockPct × 0.7)]`                     | Aggregation logic from M2 preserved verbatim.                                                                                                      |
| `app/(building)/BuildingClient.tsx`      | `[re-author M2]`                 | `[re-author: AddBrickSheet wiring + LooseBricksTray mount + day-100 cross-up]`  | Reducer + sheet-state pattern from M2 carries over.                                                                                                |

Test-file migration table will live in the auto-chained `tests.md` M3 section (per M2's convention). M2 test IDs are preserved with `(re-authored M3)` suffix where the underlying behavior changes; new IDs continue from per-milestone counters supplied in the TESTS dispatch prompt.

### Data models

**`lib/types.ts` — final shapes (replaces M2's `Brick` stub):**

```ts
// Brick — REPLACES M2's stub. Adds id/categoryId/parentBlockId; renames goal/time progress fields.
type BrickBase = {
  id: string; // crypto.randomUUID via lib/uuid.ts
  name: string;
  categoryId: string | null; // FK to AppState.categories; null = uncategorized
  parentBlockId: string | null; // FK to AppState.blocks; null = standalone (loose)
};

export type Brick =
  | (BrickBase & { kind: "tick"; done: boolean })
  | (BrickBase & { kind: "goal"; target: number; unit: string; count: number })
  | (BrickBase & { kind: "time"; durationMin: number; minutesDone: number });

// AppState — extends M2's shape with looseBricks
export type AppState = {
  blocks: Block[]; // M2; each Block.bricks now gets populated in M3
  categories: Category[]; // M2
  looseBricks: Brick[]; // M3 — bricks with parentBlockId === null
};

// Action — extends M2's discriminated union; assertNever exhaustiveness preserved
export type Action =
  | { type: "ADD_BLOCK"; block: Block } // M2
  | { type: "ADD_CATEGORY"; category: Category } // M2
  | { type: "ADD_BRICK"; brick: Brick }; // M3 — routed by brick.parentBlockId
```

**Reducer addition (`lib/data.ts`):**

- `ADD_BRICK` case: if `action.brick.parentBlockId === null`, return `{ ...state, looseBricks: [...state.looseBricks, action.brick] }`. Otherwise, return `{ ...state, blocks: state.blocks.map(b => b.id === action.brick.parentBlockId ? { ...b, bricks: [...b.bricks, action.brick] } : b) }`. Immutable update; no in-place mutation.
- `defaultState()` returns `{ blocks: [], categories: [], looseBricks: [] }`.

**`lib/dharma.ts` — function-signature deltas:**

- `brickPct(b: Brick): number` — keeps 0..100 contract. Dispatches by `b.kind`. Field reads:
  - `tick`: `b.done ? 100 : 0`
  - `goal`: `Math.min(b.count / b.target, 1) * 100`
  - `time`: `Math.min(b.minutesDone / b.durationMin, 1) * 100`
- `blockPct(block: Block): number` — unchanged shape; still returns 0 when `block.bricks` is empty (the M4 "empty-block tickable as 0/1" rule lands with M4's tap-to-tick UX, not here).
- `dayPct(state: AppState): number` — REPLACES the prior `dayPct(blocks: Block[])` signature. Averages over `state.blocks` (each contributing `blockPct(block)`) and `state.looseBricks` (each contributing `brickPct(brick)`). Empty state (zero blocks AND zero loose bricks) → `0` (no divide-by-zero).
- `categoryDayPct(state: AppState, categoryId: string): number` — NEW. Averages over: (a) every Block whose `categoryId === categoryId` excluding those bricks under it whose own `categoryId !== categoryId`; (b) every Brick (inside-block + standalone) whose `categoryId === categoryId`. Practically: filter bricks-inside-block first by `brick.categoryId === categoryId` (NOT block.categoryId), include the block's own contribution only when `block.categoryId === categoryId`, include loose bricks with matching `categoryId`. Standalone bricks with `categoryId: null` are excluded. Empty (no matching units) → `0`.
- All return values in `[0, 100]`. Internal math uses 0..1 fractions; the boundary multiplies by 100.

**Persistence:** none in M3 (M8 wires `dharma:v1` localStorage). Page refresh clears state. Same as M2.

### Components

**`<HeroRing>` (NEW)**

- Props: `{ pct: number }` — caller passes `dayPct(state)`.
- Behavior: SVG `<svg>` with a single `<circle>` for the track + a second `<circle>` for the filled arc. `r = 56`, `circumference = 2 * Math.PI * r`. Filled-arc `stroke-dasharray = circumference`, `stroke-dashoffset = (1 - pct/100) * circumference`. Stroke = `var(--accent)`. Track stroke = `var(--surface-2)`.
- Hosts the existing numeral as a `<text>` element OR via absolute-positioned child container (decision: child container so M0's `<Hero>` font tokens stay unchanged).
- SSR safety: server renders with `pct={0}` (full empty arc) regardless of input; client hydrates to actual value via the M1 `mounted` two-pass pattern. Avoids hydration mismatch warnings forever-forward (even after M8 persistence rehydrates state).
- Motion: `dashoffset` change animated via M0 `brickFill` token (600 ms easeInOut). Reduced-motion → instant.
- A11y: `role="img"`, `aria-label={`Day score: ${Math.round(pct)}%`}`, `aria-live="polite"`. Numeral inside is `aria-hidden="true"` (the ring's `aria-label` is the canonical reading).

**`<BrickChip>` (NEW — promoted from `[obsolete]`)**

- Props: `{ brick: Brick; categories: Category[]; size?: 'sm' | 'md' }` — `'md'` (default, 44 px tall) for inside-block + expanded tray; `'sm'` (still ≥ 44 px per ADR-031) for collapsed tray row.
- Rendered DOM: outer rounded-rect (`border-radius: 12px`), background = category color at 12% alpha (resolved via `categories.find(c => c.id === brick.categoryId)?.color ?? var(--surface-2)`). Foreground = absolute-positioned gradient overlay (60% alpha of the same color), `width: ${brickPct(brick)}%`, `transition` driven by Framer Motion `brickFill` token. Title left-aligned, type-specific badge right-aligned.
- Type-specific badge:
  - `tick`: `☐` when `!done`, `✓` when `done` (lucide-react `Square` / `Check` icons).
  - `goal`: `${count} / ${target}${unit ? ' ' + unit : ''}`.
  - `time`: `${minutesDone} / ${durationMin} m ▶` (▶ = lucide-react `Play` icon, faded; M4 wires the actual play action).
- Tap target: M3 `onClick` is **explicitly empty** (no-op). M4 wires logging; M5 wires edit. The 44-px hit area is preserved.
- Motion: chip enter via `stagger` (30 ms between siblings) on first paint of an expanded block; single-element insert (the new chip from a Save) uses `0 ms` stagger (just fade-in via M0 `enterVariant`). Foreground gradient width change via `brickFill` token.
- Haptic: none on M3 tap (it's a no-op). M4 wires `light` on tick toggle, etc.
- A11y: outer is a `<button>`. `aria-label = `${brick.name}, ${brick.kind}, ${Math.round(brickPct(brick))}% complete`` + type-specific suffix:
  - `goal`: `, ${count} of ${target}${unit ? ' ' + unit : ''}`.
  - `time`: `, ${minutesDone} of ${durationMin} minutes`.

**`<LooseBricksTray>` (NEW)**

- Props: `{ looseBricks: Brick[]; categories: Category[]; onAddBrick: () => void }`.
- Owned state: `[expanded, setExpanded] = useState(false)` — session-only; refresh resets to collapsed (no M8 persistence).
- Render predicate (caller-side, in `BuildingClient`): mount this component iff `state.blocks.length > 0 || state.looseBricks.length > 0`. Tray is hidden in literal-empty state to preserve M1's empty-state contract.
- Collapsed (default, `max-height: 56px`): horizontal scroll row. `overflow-x: auto`. Contents in order: every loose brick as `<BrickChip size="sm">`, then trailing `+ Brick` pill (always last). `+ Brick` pill = small `<button>` with `Plus` icon + label, fixed-width.
- Expanded (`max-height: 40vh`): vertical list. Top: `+ Brick` ghost `<Button>` (full-width). Below: each loose brick as `<BrickChip size="md">` in insertion order.
- Chevron toggle: positioned at the tray's top-right edge. `ChevronUp` icon when collapsed, `ChevronDown` when expanded. Tap toggles `expanded` state.
- Motion: max-height transition 200 ms eased on toggle; reduced-motion → instant. New chip enter via `stagger`.
- Z-index: below `<AddBrickSheet>` z-index (sheet's full-screen overlay covers the tray). M2's `<AddBlockSheet>` z-index is reused as the reference value.
- A11y: outer `<section role="region" aria-label="Loose bricks" aria-expanded={expanded}>`. Chevron toggle has `aria-controls={listId}` pointing at the `<ul>` of bricks. `+ Brick` pill has `aria-label="Add loose brick"`.
- Haptics: chevron toggle = `light`. `+ Brick` pill = `light` on tap (matches M2 `+`-button-add convention).

**`<AddBrickSheet>` (NEW)**

- Props: `{ open: boolean; parentBlockId: string | null; defaultCategoryId: string | null; categories: Category[]; onSave: (brick: Brick) => void; onCreateCategory: (cat: Category) => void; onCancel: () => void }`.
- View toggle: `view: 'brick' | 'newCategory'` (mirrors M2 `<AddBlockSheet>`). Single `<Sheet>` instance; conditional sub-views.
- Form (view = `'brick'`):
  - Title `<Input>` — required, autofocus on open.
  - Type selector — 3 large `<Chip>` cards as a single-select group (`role="radiogroup"`); default = `'tick'`. Cards: Tick / Goal / Time. Selecting changes `kind`; per-type fields render below.
  - Per-type fields:
    - `'goal'`: `target` number `<Input>` (integer ≥ 1) + `unit` text `<Input>` (optional, may be blank).
    - `'time'`: `durationMin` number `<Input>` (integer ≥ 1).
    - `'tick'`: no extra fields.
  - Category — reuses M2 `<CategoryPicker>` (existing categories + `+ New` + `Skip`). Pre-fill: when `parentBlockId !== null`, defaults to `defaultCategoryId` (the parent block's `categoryId`); when `parentBlockId === null`, no pre-fill (leaves "no selection" state, equivalent to "Skip").
  - Save — `<Button>` primary amber, sticky bottom. `aria-disabled` until validation clears (Title non-blank AND, for `goal`, `isValidBrickGoal(target)` true AND, for `time`, `isValidBrickTime(durationMin)` true). On valid Save: emits `onSave({ id: uuid(), name, kind, categoryId, parentBlockId, …per-kind fields with progress fields zeroed })`.
  - Cancel — `<X>` icon top-left; tapping discards sheet state and closes (silent discard, no toast — matches M2 SG-m2-06).
- Sheet swipe-down (iOS): silent discard (matches M2).
- View toggle to `'newCategory'`: `<NewCategoryForm>` reused verbatim. On Done, dispatches `ADD_CATEGORY` (parent dispatches; same wiring as M2) AND auto-selects the new category on the brick form. On Cancel, returns to `'brick'` view without persisting.
- Focus trap: same `useFocusTrap` pattern as M2 `<AddBlockSheet>` — local effect, NOT a change to the M0 `<Sheet>` primitive.
- Motion: sheet open via M0 `modalIn`; close via `modalOut`. Reduced-motion → instant.
- Haptics: `light` on chip select; `success` on Save; `medium` on validation error (when user taps a disabled Save).
- A11y: M0 `<Sheet>` provides `role="dialog"` + `aria-modal="true"`. M3 sets `title="Add Brick"` (or `"New Category"` per view). Type-selector chip group: `role="radiogroup"`, each chip `role="radio"` + `aria-checked`.

**`<Hero>` (extended)**

- Props: was `{ pct: number; sub: string }` from M0/M1; M3 changes the consumer to pass `dayPct(state)` (the wider function).
- Now wraps the numeral inside `<HeroRing pct={pct}>`. Numeral text node + font tokens unchanged.
- A11y: the numeral becomes `aria-hidden="true"`; the `<HeroRing>` carries the `aria-label`. Sub-line below the ring is unchanged.

**`<TimelineBlock>` (extended)**

- New prop: `{ block: Block; categories: Category[]; onAddBrick: (parentBlockId: string) => void }` — opens `<AddBrickSheet>` with the block's id pre-set.
- New owned state: `[expanded, setExpanded] = useState(false)`.
- New DOM:
  - **Scaffold left-bar** — 4 px wide, full card height, absolutely positioned at the card's left edge. Bottom-up fill: inner `<div>` with `height: ${blockPct(block)}%` from the bottom, `background: ${category.color ?? var(--text-dim)}`. Animated via M0 `brickFill` token.
  - **Tap target** — entire card is the tap surface in view mode; `onClick = () => setExpanded(!expanded)`. Tapping the existing category-color dot (M2 `data-testid="category-dot"`) ALSO expands (no nested click-eaters).
  - **Expanded view** — when `expanded === true`, card grows in height (max-height transition 200 ms eased; reduced-motion → instant). Reveals: vertical list of `<BrickChip>` (one per `block.bricks[]`, insertion order), then `+ Add brick` ghost `<Button>` (full-width). Tap-handler: `onAddBrick(block.id)`. Re-tap card → collapses.
  - **Edit mode** — when `editMode === true` (from `<EditModeProvider>`), expand still works; M3 ships no edit-mode-specific affordances (jiggle / × / drag handles are M5).
- Cross-up effect: `useCrossUpEffect(blockPct(block), 100, () => { fireBloom(); fireChime(); haptic('success'); })`.
- Bloom: Framer-Motion spring (`springConfigs.bloom = { stiffness: 220, damping: 22 }`) — class added on cross transition, removed after settle.
- Chime: `new Audio('/sounds/chime.mp3').play()` (single-shot; OS handles mute).
- A11y: outer block becomes a `<button>` with `aria-expanded={expanded}` (true / false). The inner `<ul>` of bricks has `role="list"`. Each brick `<li>` wraps a `<BrickChip>`.

**`<BlueprintBar>` (extended)**

- Per-segment opacity = `Math.max(0.3, Math.min(1.0, 0.3 + (blockPct(block) / 100) * 0.7))`.
- Segment color, sort order, aggregation, and uncategorized-block-exclusion from M2 unchanged.
- Empty-outline fallback (zero blocks OR all-uncategorized) unchanged.

### Design tokens

**Reused from M0 / M2 (no change):**

- Motion: `brickFill` (600 ms easeInOut — chip foreground gradient + ring stroke-dashoffset + scaffold bar height), `bloom` (spring `{ stiffness: 220, damping: 22 }` — block 100% celebration), `modalIn` / `modalOut` (sheet open/close), `stagger` (30 ms between siblings — new chip insert).
- Palette: `--cat-1` … `--cat-12` (per M2 SG-m2-01 lock). All chip backgrounds, foreground gradients, scaffold bars, and BlueprintBar segments resolve through the user's chosen `category.color` hex (one of the 12).
- Surface: `--surface-2` for uncategorized chip backgrounds; `--text-dim` for uncategorized scaffold bars.
- Accent: `--accent` (amber) for the HeroRing filled-arc stroke + AddBrickSheet Save button.
- Type: existing `--fs-*` font-size scale and `--font-display` / `--font-ui` / `--font-body` carry over.

**New token (1):**

- `motion.fireworks` — Duration token. Recommended: `1600 ms` total particle burst, easeOut on individual particle decay. Implemented in `lib/motion.ts` alongside existing `brickFill` / `bloom` tokens.

### Edge cases

- **Block with zero bricks** → `blockPct = 0`. Scaffold bar empty. Expanded view shows only the `+ Add brick` ghost button.
- **Adding the first brick to an empty block** → block stays at 0% (new brick defaults to 0% — `done: false` / `count: 0` / `minutesDone: 0`). Scaffold bar stays empty. Dopamine arrives in M4 when logging fires.
- **`goal` brick with `target = 0` at form-time** → `isValidBrickGoal(0) === false`; Save `aria-disabled`; inline error `"Target must be ≥ 1"`.
- **`time` brick with `durationMin = 0` at form-time** → `isValidBrickTime(0) === false`; Save `aria-disabled`; inline error `"Duration must be ≥ 1 minute"`.
- **`goal` `count > target` at math-time** → `min(count/target, 1) × 100` caps at 100. M3 has no UX path here; this is a forward guard for M4 + M8 persistence migrations.
- **`time` `minutesDone > durationMin` at math-time** → same cap. Same forward-guard story.
- **Brick inside a block, brick category ≠ block category** → allowed. `categoryDayPct(state, brick.categoryId)` attributes the brick to ITS category, NOT the block's.
- **Standalone brick with `categoryId: null`** → counted in `dayPct(state)` (it's a unit). Excluded from `categoryDayPct(_, anyCatId)` (no category to attribute to).
- **HeroRing at 0%** → `stroke-dashoffset = circumference` (empty arc). Numeral `0%`.
- **HeroRing first state change** → animates from previous % to new % via `brickFill` token. Reduced-motion → instant.
- **HeroRing SSR/CSR mismatch** → server renders `pct={0}`; client hydrates to actual via `mounted` two-pass pattern. No hydration warnings.
- **BlueprintBar segment opacity at 0%** → `0.3` (floor). At 100% → `1.0`.
- **Block crosses 100% then drops below (M4 stepper down)** → bloom is one-shot per crossing; will not retrigger until block has been below 100% AND crossed up again. `useCrossUpEffect` tracks `prev` value via `useRef`.
- **Day crosses 100% then drops** → fireworks one-shot per crossing; same rule.
- **`prefers-reduced-motion: reduce`** → ring stroke animation collapses to instant; chip foreground fill collapses to instant; scaffold bar height fill collapses to instant; bloom suppressed (no spring class added); fireworks suppressed (overlay does not mount). Haptics + chime audio still fire (motion ≠ haptics ≠ audio).
- **AddBrickSheet swipe-down with dirty form** → silent discard (matches M2 SG-m2-06).
- **Sheet nesting** → single `<Sheet>` instance with `view: 'brick' | 'newCategory'` (matches M2). No nested portals.
- **Block-tap to expand: tap target** → entire block card. Tapping the category dot, scaffold bar, or any inner element ALSO expands.
- **Tray expand/collapse during AddBrickSheet open** → sheet traps focus; tray interactions blocked behind it.
- **Page refresh** → all state lost (no persistence until M8). Same as M2.
- **Brick name length** → CSS truncation with ellipsis on the chip; full name visible only after M5 edit surface (M3 / M4 do not surface the full name beyond the chip).
- **Two bricks with identical name inside the same block** → allowed (no de-dup; matches M2 category rule).
- **Tray hidden when `state.blocks.length === 0 && state.looseBricks.length === 0`** → M1 empty-state card is the sole surface. The first standalone-brick path opens up only after the user creates their first block (or has created at least one loose brick before all blocks were deleted in some future flow).
- **Save with `kind = 'goal'` and blank `unit`** → allowed. Brick chip badge renders `${count} / ${target}` with no unit suffix.
- **Tray collapsed row, many loose bricks** → horizontal `overflow-x: auto`. The `+ Brick` pill stays at the rightmost trailing position, scrolling into view as needed.
- **Block expanded, user deletes the parent block via M5** → out of scope (M5). M3 has no delete path.

### Out of scope

- Logging bricks: tick toggle, goal +/- stepper, time start/stop timer, manual time entry — **M4**.
- Block edit (rename, retime), brick edit (rename, retype, retarget) — **M5**.
- Block delete and brick delete with "Just today / All recurrences" prompts — **M5**.
- Drag-reorder for blocks AND for bricks within a block — **M6**.
- Polish layer: stagger on first paint, count-up on hero, "now" line glow, NOW tag, "Your Empire begins." card, brand-mark Easter egg, skeleton loaders, toasts — **M7**.
- Persistence (`dharma:v1` localStorage, schema migrations, multi-tab last-writer-wins) — **M8**.
- Calendar navigation (week strip, Castle / Kingdom / Empire), `appliesOn(rec, date)` resolver — **M9**. M3 still renders only today; recurrence kinds stored on Block from M2 are inert until M9.
- Voice mic — **M10**.
- Multi-day blocks crossing midnight — **never (or much later)**.
- "Empty block tickable as 0/1" UX — **M4**. The math floor is `0` in M3; M4 adds the tap-to-tick gesture that flips it to 1.
- Empire square light-up on day 100% — **M9**. M3 fires only the local fireworks overlay on the Building view.
- "+ Block" via long-press menu / brick-and-block chooser — **never**. M3 keeps M2's `+` = New Block; standalone-brick creation lives only inside the tray.
- Block-detail surface as a separate route or sheet — **never**. Block expand stays inline per § 0.5.
- NowCard surfacing the active block — deferred (still `[obsolete: not-imported-in-M3]`).
- Lighthouse measurement from sandbox — pending Vercel access (carries from M2).

### Decisions to honor

- **Brick schema LOCKED.** `kind: 'tick' | 'goal' | 'time'` discriminator. Tick: `done`. Goal: `count / target / unit`. Time: `minutesDone / durationMin`. Every Brick carries `id / categoryId / parentBlockId` FKs. Renames `current` → `count` (goal) and `current` → `minutesDone` (time) from M2's stub.
- **Scoring location LOCKED in `lib/dharma.ts` (extended).** No new `lib/scoring.ts`. All scoring functions return `[0, 100]` (not 0..1).
- **`dayPct` signature change LOCKED.** `dayPct(state: AppState)` replaces `dayPct(blocks: Block[])`. Every caller (M0/M1/M2 — currently `<Hero>` is the only consumer) migrates to pass `state`.
- **`categoryDayPct` brick attribution LOCKED.** Bricks-inside-block contribute to THEIR own category, not the parent block's category. Standalone bricks with `categoryId: null` are excluded from category-filtered queries but still count in `dayPct`.
- **Loose Bricks tray Option A LOCKED.** Pinned above dock; visible iff `blocks.length > 0 || looseBricks.length > 0`; collapsed chip-row default; chevron expand. Hidden in literal-empty state. (SG-m3-02; ratified at M2 ship-react Gate #2; recorded in spec § 0.11.)
- **HeroRing introduced now LOCKED.** SVG arc wrapping (not replacing) M1's numeral.
- **`+ Brick` verb location LOCKED.** Tray-only. No long-press menu, no chooser modal. BottomBar `+` stays "New Block".
- **AddBrickSheet pattern LOCKED.** Mirrors M2 `<AddBlockSheet>` — single `<Sheet>` instance with `view: 'brick' | 'newCategory'`. Reuses `<CategoryPicker>` + `<NewCategoryForm>` verbatim.
- **Motion tokens reused from M0** (`brickFill` / `bloom` / `modalIn` / `modalOut` / `stagger`). New token `fireworks` (1.6 s easeOut) added to `lib/motion.ts`.
- **Reduced-motion semantics.** Visuals (ring fill, chip fill, scaffold fill, bloom, fireworks) collapse to instant / suppressed. Haptics + chime audio still fire (motion ≠ haptics ≠ audio).
- **ADRs honored:** ADR-019 (recurrence untouched on Brick), ADR-022 (one feature per dispatch), ADR-026 (single planning gate), ADR-027 (commit prefix `docs(plan-m3): …`), ADR-031 (44 px touch target), ADR-032 (categories user-defined), ADR-034 (blocks always timed), ADR-035 (bricks can be standalone), ADR-039 (ships empty).
- **No factory data (ADR-039).** No example brick names, no example category names, no seed bricks. `looseBricks: []` initial value.

### Open spec gaps still to resolve at Gate #1

- **SG-m3-01 — Brick category FK vs inline.** **LOCKED** (FK; matches M2 SG-m2-07 ratification). Schema reflects: `categoryId: string | null`.
- **SG-m3-02 — Loose Bricks tray location.** **LOCKED Gate #2 (M2 ship-react)** — Option A (pinned above dock, visible iff `blocks > 0 || looseBricks > 0`, collapsed chip-row default, chevron expand). Recorded in spec § 0.11.
- **SG-m3-03 — Bricks: embedded under blocks vs flat array.** **LOCKED** — embedded for inside-block (`block.bricks[]` populated) AND flat for standalone (`state.looseBricks[]`). Matches M8 persistence shape.
- **SG-m3-04 — Inside-block brick category default.** **Awaiting Gate #1.** PLANNER recommends: pre-fill brick `categoryId` to the parent block's `categoryId`, overrideable in the AddBrickSheet (including to `null` via "Skip"). Alternative is "always blank, force user to pick." Recommendation rationale: matches the user's mental model that "this brick belongs to this block" without forcing a redundant tap.
- **SG-m3-05 — 100% bloom / chime / fireworks: ship in M3 or defer.** **Awaiting Gate #1.** PLANNER recommends: ship the wiring + tests via state injection in M3. Defer to M4 means M4 ships TWO surfaces (logging + celebrations) which dilutes the M3 / M4 boundary. M3 has no user path to logging, so the celebrations only fire from injected test state — but the cross-up effect, the bloom DOM hook, and the fireworks overlay component are all in place when M4's first stepper tick lands.
- **SG-m3-06 — Block expand mechanism.** **LOCKED** — tap-to-expand in view mode; max-height transition 200 ms eased; re-tap collapses. No FLIP magic in M3 (that's M7). Carry the simplest implementation through.
- **SG-m3-07 — Hero ring component introduced now.** **LOCKED** — `<HeroRing>` introduced in M3 as SVG with stroke-dasharray / stroke-dashoffset. Numeral lives inside.
- **SG-m3-08 — Where the `+ Brick` verb lives.** **LOCKED** — tray-only. BottomBar `+` keeps "New Block" verb. Trade-off: in literal-empty state there's no path to add a standalone brick first. Acceptable per § 0.14 antipattern 1 (a single atomic action probably IS a brick, but in literal-empty state the user lays a block first — the tray opens up immediately after).
- **SG-m3-09 — Empty-block scoring in M3.** **LOCKED** — `blockPct({ bricks: [] }) === 0` in M3. The "empty block tickable as 0/1" rule lands in M4 with the tap-to-tick gesture.
- **SG-m3-10 — Day score with zero bricks.** **LOCKED** — `dayPct({ blocks: [...], looseBricks: [...] })` averages over union of (blocks + looseBricks) treating each as one unit. Zero-zero literal-empty → `0`. Migration: every `dayPct(state.blocks)` call site migrates to `dayPct(state)`. Currently `<Hero>` is the only caller.
- **SG-m3-11 — Bloom + chime + fireworks reduced-motion behavior.** **Awaiting Gate #1.** PLANNER recommends: bloom and fireworks visuals → suppressed under `prefers-reduced-motion`. Chime is audio → still plays unless OS-muted. Haptics still fire (haptics are tactile, not motion).
- **SG-m3-12 — Audio asset for the chime.** **Awaiting Gate #1.** PLANNER recommends: ship a single small (< 30 KB) chime as `public/sounds/chime.mp3`. Loaded on app boot via `new Audio()`. No external dep. Mute respect: let the OS handle mute (no manual gate); revisit in M7 polish if real users report a need.
- **SG-m3-13 — Brick chip touch target during expanded block.** **Awaiting Gate #1.** PLANNER recommends: 44 px minimum height per ADR-031, regardless of `size` prop. Chips do not double-purpose as logging surfaces in M3 (tap = no-op). M3 still keeps the tap target compliant so M4 doesn't have to resize.
- **SG-m3-14 — `<LooseBricksTray>` z-index relative to AddBrickSheet.** **Awaiting Gate #1.** PLANNER recommends: tray z-index < AddBrickSheet z-index. Reuse M2 `<AddBlockSheet>`'s z-index value as the reference.
- **SG-m3-15 — Brick add via tray when tray is collapsed.** **Awaiting Gate #1.** PLANNER recommends: the `+ Brick` pill is always present in the collapsed row (rightmost trailing position). User does NOT need to expand the tray to add a brick. Expand is only for browsing existing bricks.
- **SG-m3-16 — `Block.bricks` ordering in expanded view.** **Awaiting Gate #1.** PLANNER recommends: render in insertion order (the order they appear in `block.bricks[]`). M6 wires drag-reorder. Tests assert order matches array order.
- **SG-m3-17 — `<HeroRing>` SSR.** **Awaiting Gate #1.** PLANNER recommends: server renders the ring at `pct={0}` (full empty arc); client hydrates to actual day score with a 600 ms ease-in via `mounted` two-pass pattern. Forward-compatible with M8 persistence rehydration.
- **SG-m3-18 — Stagger fade-in on new chip insert.** **Awaiting Gate #1.** PLANNER recommends: 30 ms between chips on first render of an expanded block; `0 ms` (no stagger) when adding ONE chip post-hoc (single-element insert doesn't need a stagger sequence). Reduced-motion → instant in either case.

---
