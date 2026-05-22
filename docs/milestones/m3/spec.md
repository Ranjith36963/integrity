## Milestone 3 — Add Brick Flow + Live Scoring + Visual Fill

> **Pillars:** § 0.1 (the wedge — Dharma scores proof, not plans), § 0.3 (visual identity — hero ring is the dopamine surface), § 0.5 (interaction primitives — three brick types: tick / goal / time), § 0.9 (data model — bricks never timed; bricks live inside a block OR standalone in the Loose Bricks tray; brick category is independent of parent block), § 0.11 (Loose Bricks tray now LOCKED — Option A pinned above dock), § 0.14 (no factory bricks, no factory categories, no seed data), ADR-019 (recurrence stays untouched in M3), ADR-032 (categories user-defined), ADR-034 (blocks always timed), ADR-035 (bricks can be standalone), ADR-039 (ships empty).

### Intent

Wire the second and third interactive verbs and the dopamine layer all in one milestone:

1. **Add Brick (inside a block)** — tap a block → it expands → "+ Add brick" → AddBrickSheet.
2. **Add Brick (standalone)** — Loose Bricks tray (pinned above dock, always visible once at least one block or one loose brick exists) has a "+ Brick" pill → AddBrickSheet with `parentBlockId: null`.
3. **Live scoring engine** — extends the existing `lib/dharma.ts` math layer (M0 already ships `brickPct` / `blockPct` / `dayPct`, all returning 0..100). M3 updates the field reads to match the rewritten `Brick` schema, replaces `dayPct(blocks: Block[])` with `dayPct(state: AppState)` so loose bricks are counted, and adds `categoryDayPct(state, categoryId)`. The math runs every render; a brick added at 0% leaves the day at 0%, but the pipe is now wired and observable in the DOM (data attributes + computed styles).
4. **Visual fill primitives** — brick chips fill with category-color gradient (left→right by progress) using M0's `brickFill` motion token (600 ms easeInOut), block scaffold left-bar fills bottom-up (height = block %), hero ring stroke-dashoffset animates with the day %, BlueprintBar segment opacity = `0.3 + ((block% / 100) × 0.7)`, block 100% triggers bloom (M0's `bloom` spring config already exists — `{ stiffness: 220, damping: 22 }`) + chime, day 100% triggers fireworks (NEW motion; Empire square deferred to M9).

This milestone **rewrites M2's stub `Brick`** (adds `id` / `categoryId` / `parentBlockId`, renames goal/time progress fields per § 0.9 — see Migration note below) and **extends `AppState`** to add `looseBricks: Brick[]`. Each Block's existing `bricks: Brick[]` field (M2 placeholder; always `[]`) now gets populated.

**What this is NOT:** logging bricks (tick toggle / goal stepper / timer ticks) — M4. Block edit / delete — M5. Drag reorder — M6. Polish layer (the cinematic stagger / count-up / hidden Easter eggs) — M7. Persistence — M8. Calendar navigation — M9. Voice mic — M10. Per ADR-039, no factory bricks ship — the user creates each brick.

### Inputs

- The day-with-blocks surface from M2 — top bar, hero (`0%`, but now backed by a real `<HeroRing>` component instead of a static numeral), BlueprintBar (renders categorized segments at full opacity in M2; M3 modulates segment opacity by block %), 24-hour timeline with block cards, dock with `+`, AddBlockSheet, `<EditModeProvider>`, `<SlotTapTargets>`.
- M0 primitives — `<Sheet>`, `<Input>`, `<Chip>`, `<Button>`, `<EmptyState>`. M2's `<CategoryPicker>` and `<NewCategoryForm>` are reused as-is inside AddBrickSheet.
- M0 motion tokens — `modalIn` / `modalOut` for AddBrickSheet, `stagger` for new-brick fade-in inside an expanded block, `brickFill` (already shipped, 600 ms easeInOut) for chip fill animation, `bloom` (already shipped as a `springConfigs` entry) for block 100% celebration, **`fireworks` (NEW Duration token)** for day 100%.
- M0 haptics — `light` on chip-select; `success` on Save and on block 100%; `medium` on validation error; `notification` on day 100% (per § 0.10).
- M2 helpers — `lib/uuid.ts` (M2 mockable seam), `lib/data.ts` reducer (extend with `ADD_BRICK`), `lib/blockValidation.ts` (M2 ships `isValidStart`, `isValidEnd`, `endAfterStart`, `overlapsExistingBlock`, `isValidCustomRange`; M3 may add `isValidBrickGoal`, `isValidBrickTime` to the same module), `lib/dharma.ts` (extended — see "Locked schemas" below).
- The locked `Block` and `Category` schemas from M2.
- In-memory `AppState`: `blocks` (M2), `categories` (M2), **new** `looseBricks: Brick[]` (initial `[]`).

### Outputs (regions and behaviors)

| Region                       | Role in M3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Sync with M0 / M1 / M2                                                                                                                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero ring                    | Wraps M0/M1's static `pct` numeral inside a `<HeroRing>`: SVG circle, stroke-dashoffset = `(1 − dayPct(state)/100) × circumference`, animated via M0's `brickFill` token (600 ms easeInOut) on change. Numeral inside the ring stays the existing `Math.round(dayPct(state))%`. M2's `0%` literal stays correct because zero bricks → `dayPct = 0`.                                                                                                                                                | New surface. The existing M1 `Hero` component is extended (not replaced); the ring is added around the numeral.                                                                        |
| BlueprintBar segment opacity | Each categorized segment's opacity = `0.3 + (block% × 0.7)`. Uncategorized blocks remain excluded (SG-m2-02).                                                                                                                                                                                                                                                                                                                                                                                      | M2 path is preserved; M3 adds the per-segment opacity modulation.                                                                                                                      |
| Block card (collapsed)       | Adds left vertical scaffold bar 4px wide, full card height. Filled bottom-up by block %; color = category color (or `--text-dim` when `categoryId === null`). Tap behavior changes from no-op (M2) to "expand".                                                                                                                                                                                                                                                                                    | Re-author of `<TimelineBlock>` from M2; M2 had a static color dot — M3 keeps the dot AND adds the scaffold.                                                                            |
| Block card (expanded)        | After tap-to-expand: card grows in height (max-height transition, 200 ms eased; reduced-motion → instant). Reveals: vertical list of `<BrickChip>`s, then a "+ Add brick" `<Button>` ghost variant at the bottom. Re-tap collapses.                                                                                                                                                                                                                                                                | New surface. Layout is plain (FLIP magic is M7). Edit-mode interactions are M5 — M3's expanded view is view-mode only.                                                                 |
| AddBrickSheet                | Bottom-sheet built on M0 `<Sheet>`. Form: Title (required, autofocus), Type selector (3 large `<Chip>` cards: Tick / Goal / Time, default = Tick), per-type fields (Goal: target + unit; Time: target minutes), Category (`<CategoryPicker>` reused; default pre-fills to parent block's category for inside-block bricks, blank for standalone), Save (sticky bottom amber), Cancel (X top-left).                                                                                                 | First reuse of M2's `<CategoryPicker>` + `<NewCategoryForm>` outside `<AddBlockSheet>`. The single-`<Sheet>`-instance pattern from M2 carries over (view: `'brick' \| 'newCategory'`). |
| `<BrickChip>`                | Rounded-rect chip ~44px tall (touch target, ADR-031). Background = category color at 12% alpha (or `--surface-2` when uncategorized). Foreground gradient overlay = category color at 60% alpha, width = `(brickPct / 100) × 100%`, animated via M0's `brickFill` token (600 ms easeInOut) on change. Title left-aligned. Type-specific badge right-aligned: Tick → `☐` / `✓`; Goal → `count / target unit`; Time → `minutesDone / durationMin m ▶`. Tap surface in M3 = no-op (M4 wires logging). | New component. Lives inside expanded blocks AND inside the Loose Bricks tray.                                                                                                          |
| `<LooseBricksTray>`          | Pinned above `<BottomBar>`. Renders iff `state.blocks.length > 0 \|\| state.looseBricks.length > 0`. Two states: **Collapsed** (default, max-height 56 px) — single horizontal scroll row of small `<BrickChip>`s, with a trailing "+ Brick" pill; tap chevron-up to expand. **Expanded** (max-height ≈ 40 vh) — vertical list of full-size `<BrickChip>`s + "+ Brick" ghost button at top; tap chevron-down to collapse. When zero loose bricks, collapsed state shows only the "+ Brick" pill.   | New component. Renders ABOVE M1's `<BottomBar>`. The `+` button in BottomBar still adds a Block (M2 verb preserved); standalone-brick creation lives only inside the tray.             |
| Empty-state card             | Now appears iff `state.blocks.length === 0 && state.looseBricks.length === 0`. Copy unchanged from M1: `"Tap any slot to lay your first block."` (Loose Bricks tray is hidden in this exact state, matching M1's "literal empty" promise.)                                                                                                                                                                                                                                                         | M2 disappeared the card on first block; M3 widens the visibility predicate to also account for loose bricks.                                                                           |
| 100% block celebration       | When `blockPct` crosses from `<100` to `100`, the block card fires a one-shot bloom (Framer-Motion spring, M0 `springConfigs.bloom`) + a soft chime (`Audio` API, single-shot, mute-respecting) + `success` haptic. Reduced-motion → bloom-suppressed; chime still fires (audio is not motion).                                                                                                                                                                                                    | Wires the trigger in M3; the only path that fires it in M3 is test-injected state (M4 wires user-driven logging).                                                                      |
| 100% day celebration         | When `dayPct` crosses from `<100` to `100`, fireworks particle burst plays for 1.6 s + `notification` haptic. Empire square light-up is M9. Reduced-motion → fireworks-suppressed.                                                                                                                                                                                                                                                                                                                 | Same wiring story as block 100%.                                                                                                                                                       |

### Locked schemas (this milestone fixes them)

> **Migration note.** M2 stubbed `Brick` in `lib/types.ts:6–15` as `{ kind, name, done | current/target/unit }` with no `id`, `categoryId`, or `parentBlockId`. M0 also shipped scoring helpers in `lib/dharma.ts` — `brickPct` / `blockPct` / `dayPct` returning **0–100 percentages** — that already read M2's stub fields. M3 **rewrites the stub** (adds the three FK/identity fields, renames the goal/time progress fields to match § 0.9), **extends** `lib/dharma.ts` (it already houses the math; no new file), and migrates every existing call site that constructs a `Brick` literal. The `kind` discriminator is **kept** (already shipped; matches the `Recurrence` convention).

```ts
// lib/types.ts — REPLACES M2's stub Brick. Adds id/categoryId/parentBlockId; renames goal/time fields per § 0.9.

type BrickBase = {
  id: string;                  // crypto.randomUUID via lib/uuid.ts
  name: string;
  categoryId: string | null;   // FK to AppState.categories; null = uncategorized
  parentBlockId: string | null;// FK to AppState.blocks; null = standalone (loose)
};

type Brick =
  | (BrickBase & { kind: 'tick'; done: boolean })
  | (BrickBase & { kind: 'goal'; target: number; unit: string; count: number })
  | (BrickBase & { kind: 'time'; durationMin: number; minutesDone: number });

type AppState = {
  blocks: Block[];           // M2; each Block.bricks now gets populated in M3
  categories: Category[];    // M2
  looseBricks: Brick[];      // M3 — bricks with parentBlockId === null
};

// Reducer additions (extend M2's discriminated Action union; assertNever exhaustiveness preserved)
type Action =
  | /* M2 actions: ADD_BLOCK, ADD_CATEGORY */
  | { type: 'ADD_BRICK'; brick: Brick };  // routed by brick.parentBlockId
```

```ts
// lib/dharma.ts — EXTENDS the existing M0 scoring helpers (does NOT introduce lib/scoring.ts).
// Existing (M0): brickPct(b) | blockPct(block) | dayPct(blocks)  — all return 0..100
// Updated in M3:
//   • brickPct still dispatches by `kind`, now reads renamed fields:
//       tick: b.done → 0 | 100
//       goal: min(b.count / b.target, 1) × 100        // was b.current/b.target
//       time: min(b.minutesDone / b.durationMin, 1) × 100   // was b.current/b.target
//   • blockPct unchanged in shape; still 0 when bricks: [].
//   • dayPct(blocks) DEPRECATED in favor of:
//       dayPct(state: AppState): number
//         — averages over (state.blocks + state.looseBricks), each as one unit per § 0.9.
//         — empty state (zero blocks AND zero loose bricks) → 0 (no divide-by-zero).
// New in M3:
//   • categoryDayPct(state: AppState, categoryId: string): number
//       — averages bricks AND blocks attributed to that categoryId.
//       — bricks inside a block contribute to THEIR own category, not the block's.
//       — standalone bricks with categoryId: null are excluded from category-filtered queries
//         but still count in dayPct.
```

**Schema rules (locked):**

- A new `tick` brick saves with `done: false` → 0%.
- A new `goal` brick saves with `count: 0` → 0%.
- A new `time` brick saves with `minutesDone: 0` → 0%.
- `target` (goal) and `durationMin` (time) are integers `> 0` (validation enforced).
- `unit` (goal) is a free-text string, may be blank (e.g., "100" with no unit).
- `categoryId` for inside-block bricks **defaults to** the parent block's `categoryId`, but the user can override (including to `null`).
- A block with `bricks: []` has `blockPct = 0` in M3 (the "empty block tickable as 0/1" rule from § 0.9 is M4 behavior — wired only when M4 ships the tap-to-tick UX).
- `dayPct(state)` averages over the union of `state.blocks` (each contributing one entry — its own `blockPct`) and `state.looseBricks` (each contributing one entry — its own `brickPct`). Empty state (zero blocks, zero loose bricks) → `dayPct = 0` (no division by zero).
- All scoring functions return values in **`[0, 100]`** (not 0–1) — matches the existing dharma.ts contract that M0/M1/M2 already consume. Internal math uses 0–1 fractions where convenient (`min(count/target, 1)`); the boundary multiplies by 100.

### Edge cases

- **Block with zero bricks** → `blockPct = 0` (until M4 wires empty-block tick).
- **Adding the first brick to an empty block** → block keeps showing 0% (new brick defaults to 0%). The scaffold bar stays empty; this is correct — the dopamine arrives in M4 when logging fires.
- **`goal` brick with `target = 0`** → save disabled (validation).
- **`time` brick with `durationMin = 0`** → save disabled (validation).
- **`goal` `count > target`** → progress capped at 100 (`min(count/target, 1) × 100`). M3 has no UX path to `count > target` (count starts at 0; M4 wires the stepper); this is a math invariant for M4 and persistence migrations.
- **`time` `minutesDone > durationMin`** → progress capped at 100 (same math). M3 has no UX path to push `minutesDone` above zero; this guards M4 + persistence.
- **Brick inside a block, brick category ≠ block category** → allowed. Per-category day score correctly attributes the brick to ITS category, not the block's.
- **Standalone brick with `categoryId: null`** → counted in `dayPct` (it's a unit), excluded from `categoryDayPct(_, any)` (no category to attribute to).
- **Hero ring at 0%** → stroke-dashoffset = circumference (empty arc). Numeral reads `0%`.
- **Hero ring on first state change** → animates from previous % to new % via M0's `brickFill` token (600 ms easeInOut). Reduced-motion → instant.
- **BlueprintBar segment opacity at 0%** → 0.3 (the floor). At 100% → 1.0.
- **Block crosses 100% but immediately drops below** (M4 stepper down) → the bloom is a one-shot; it does not retrigger until the block has been below 100% AND crossed up again. Detection lives in `useEffect` watching `blockPct`.
- **Day crosses 100% then drops** → same one-shot rule for fireworks.
- **`prefers-reduced-motion: reduce`** → ring stroke animation collapses to instant; brick-chip fill collapses to instant; bloom and fireworks suppressed (CSS-driven, not haptic-driven). Haptics + chime audio still fire (motion ≠ haptics ≠ audio per M0 conventions).
- **AddBrickSheet swipe-down with dirty form** → silent discard (matches M2 SG-m2-06).
- **Sheet nesting** — single `<Sheet>` instance with `view: 'brick' \| 'newCategory'` (matches M2's `<AddBlockSheet>` pattern).
- **Block-tap to expand: tap target** — entire block card is the tap surface. Tapping the category dot or scaffold bar inside the card also expands (no nested click-eaters). The category-color dot's `data-testid="category-dot"` (M2 SG-m2-13) stays.
- **Block expanded, user taps "+ Add brick"** → AddBrickSheet opens with `parentBlockId` pre-set to this block AND `categoryId` pre-set to this block's `categoryId` (overrideable in the sheet).
- **Tray "+ Brick" tapped** → AddBrickSheet opens with `parentBlockId: null`, `categoryId: null` (no parent block to inherit from).
- **Tray expand/collapse during AddBrickSheet open** → sheet is full-screen and traps focus; tray interactions are blocked behind it.
- **Page refresh** → all state lost (no persistence until M8). Same as M2.
- **Brick name length** — long names truncate with ellipsis on the chip; full name visible only after M4's edit surface (M5 actually — M3 has no brick edit). Acceptable for M3.
- **Two bricks with identical Name inside the same block** → allowed (no de-dup; matches M2's category rule).
- **`<HeroRing>` SSR/CSR mismatch** — the ring is SVG with computed stroke-dashoffset. Server renders 0%; client hydrates to actual day % using the same two-pass pattern from M1's auto-scroll (the `mounted` flag).

### Acceptance criteria

**Add paths (inside a block)**

1. Tapping a block card in view mode toggles its expanded state (collapsed ↔ expanded).
2. Expanded block reveals: vertical list of `<BrickChip>`s (one per `block.bricks[]`) + "+ Add brick" ghost button.
3. Tapping "+ Add brick" opens AddBrickSheet with `parentBlockId` = this block's id and `categoryId` pre-filled to the block's `categoryId`.
4. On Save: a new `Brick` is appended to that block's `bricks[]` with `crypto.randomUUID()` id and `parentBlockId` set; the brick chip enters the expanded view with stagger fade-in.

**Add paths (standalone via tray)** 5. The Loose Bricks tray renders iff `state.blocks.length > 0 || state.looseBricks.length > 0`. In the literal-empty state (both zero), the tray is hidden and M1's empty-state card is visible. 6. The tray renders pinned above the BottomBar dock. Default state when at least one criterion in #5 holds = collapsed (max-height 56 px). 7. The tray's "+ Brick" pill (always visible while the tray is rendered) opens AddBrickSheet with `parentBlockId: null` and `categoryId: null`. 8. On Save with `parentBlockId: null`: a new `Brick` is appended to `state.looseBricks[]` with `crypto.randomUUID()` id; the brick chip enters the tray with stagger fade-in. 9. Tap the tray's chevron toggle to expand → tray grows to max-height ≈ 40 vh, vertical list of full-size chips. Tap chevron again → collapses. State persists for the session (resets on refresh — no M8 yet).

**AddBrickSheet form** 10. Title is a required `<Input>` with autofocus on open. 11. Type selector renders 3 large `<Chip>` cards (Tick / Goal / Time) as a single-select group; default = Tick. 12. Selecting Goal reveals: target (number `<Input>`, integer `≥ 1`) + unit (text `<Input>`, optional). Both fields disappear when type ≠ Goal. 13. Selecting Time reveals: target minutes (number `<Input>`, integer `≥ 1`). Field disappears when type ≠ Time. 14. Category renders M2's `<CategoryPicker>` (existing categories + "+ New" + "Skip"). Inside-block: pre-filled to parent block's `categoryId` (or "Skip" when block is uncategorized). Standalone: no pre-fill. 15. Save button is `<Button>` primary amber, sticky bottom; disabled until validation clears (Title non-blank AND per-type fields valid). 16. Cancel is an `<X>` icon top-left; tapping discards sheet state and closes. 17. New-category creation works identically to M2 (single `<Sheet>` instance, `view: 'newCategory'`, the new category persists immediately on Done). 18. Sheet swipe-down on iOS Safari = silent discard (matches M2).

**Brick creation behavior** 19. On Save: a new `Brick` matching the locked schema is appended to the appropriate slot (`block.bricks[]` for inside-block, `state.looseBricks[]` for standalone). 20. The sheet slides down (M0 `modalOut`); reduced-motion → instant. 21. The new chip renders with progress = 0 (empty fill). Stagger fade-in = M0 `30 ms` between siblings; reduced-motion → instant. 22. The chip displays title, type-badge, and category color (background tint + foreground gradient placeholder). Uncategorized chips use `--surface-2` background. 23. The saved brick matches the locked `Brick` discriminated union (Vitest schema test per type).

**Visual fill (math + render)** 24. `<HeroRing>` renders as SVG with stroke-dashoffset reflecting `(1 − dayPct(state)/100) × circumference`. At `dayPct = 0` the arc is empty; at `100` the arc is full. Stroke = `--accent` (amber). 25. Hero numeral text node = `${Math.round(dayPct(state))}%`. Updates synchronously with the ring. 26. Block scaffold left-bar height = `(blockPct(block) / 100) × cardHeight`. Color = category color or `--text-dim`. 27. BrickChip foreground gradient width = `(brickPct(brick) / 100) × 100%`. Animated via M0's `brickFill` token (600 ms easeInOut) on change; reduced-motion → instant. 28. BlueprintBar categorized segment opacity = `0.3 + ((blockPct / 100) × 0.7)` (clamp `[0.3, 1]`). Uncategorized blocks remain excluded. 29. State changes (adding a brick) re-render every dependent view in the same React tick; no flash of stale 0%.

**Scoring (math)** 30. `brickPct({ kind: 'tick', done: false }) === 0` and `brickPct({ kind: 'tick', done: true }) === 100`. 31. `brickPct({ kind: 'goal', target: 100, count: 50 }) === 50`; `count: 100` → `100`; `count: 200` → capped at `100`; `count: 0` → `0`. 32. `brickPct({ kind: 'time', durationMin: 30, minutesDone: 15 }) === 50`; `minutesDone: 60` → capped at `100`; `0` → `0`. 33. `blockPct({ bricks: [] })` → `0`. With bricks → `avg(brickPct(b) for b in bricks)`. 34. `dayPct({ blocks: [], categories: [], looseBricks: [] })` → `0`. With one block at `100` and zero loose bricks → `100`. With one block at `100` and one loose brick at `0` → `50`. 35. `categoryDayPct(state, "cat-x")` averages only the bricks AND blocks attributed to `cat-x`. Bricks inside a block contribute to THEIR own category, not the block's. Standalone bricks with `categoryId: null` are excluded from any category-filtered query but still count in `dayPct(state)`.

**100% celebrations (wired but injection-tested in M3)** 36. When `blockPct(block)` crosses from `<100` to `100`, a `bloom` Framer-Motion spring plays once on that block card (M0 `springConfigs.bloom = { stiffness: 220, damping: 22 }`; class added on the cross transition, removed after the spring settles). A `success` haptic fires. 37. When `dayPct(state)` crosses from `<100` to `100`, a `fireworks` overlay plays for ~1.6 s (Framer Motion or canvas; bounded particle count so the work doesn't leak into the next render). A `notification` haptic fires. 38. Both celebrations are one-shot per crossing: dropping back below 100 and re-crossing fires again. Test via state injection (M3 has no user path to logging). 39. Reduced-motion → bloom and fireworks visuals suppressed (no animation classes added). Haptics still fire. Audio (chime) still fires unless OS-muted.

**Edit mode (no-op in M3)** 40. With Edit Mode toggled ON (M5 mechanism is already wired in M2's `<EditModeProvider>`), block tap-to-expand and the Loose Bricks tray "+ Brick" pill remain functional. Edit-mode-specific affordances (jiggle, ×, drag handles) are M5; M3 ships nothing edit-specific. **`<SlotTapTargets>` continues to pass through edit mode (returns null when `editMode === true`, per M2 C-m2-013).**

**A11y / quality** 41. All interactive elements ≥ 44 px (ADR-031). Tab order matches visual order. AddBrickSheet has `role="dialog"` with focus trap. 42. `<HeroRing>` has `role="img"` and `aria-label="Day score: ${pct}%"`. Updates live with `aria-live="polite"`. 43. `<BrickChip>` has accessible name `"${name}, ${kind}, ${brickPct}% complete"`. Type-specific suffix: Goal → `, ${count} of ${target} ${unit}`; Time → `, ${minutesDone} of ${durationMin} minutes`. 44. `<LooseBricksTray>` has `role="region"`, `aria-label="Loose bricks"`, `aria-expanded={open}`. Chevron toggle has `aria-controls` pointing at the list region. 45. Expanded block card sets `aria-expanded="true"` on the block-card button; collapsed = `false`. The list of bricks inside has `role="list"`. 46. axe-core: zero violations on day view, on open AddBrickSheet, on expanded block, AND on expanded Loose Bricks tray. 47. `tsc --noEmit`: zero new errors. 48. ESLint: zero new warnings. 49. `prefers-reduced-motion`: ring animation, chip fill animation, bloom, and fireworks all collapse to instant / suppressed. 50. Playwright: add brick inside block via expand → "+ Add brick" → Save → chip appears at 0%; add standalone brick via tray "+ Brick" → Save → chip appears in tray at 0%; mobile viewport 430 px; no horizontal overflow when sheet is open; tray chevron toggle expands and collapses; HeroRing renders (visible) and is `0%` at session start.

### Out of scope

- Logging bricks: tick toggle, goal +/- stepper, time start/stop timer, manual time entry — **M4**
- Block edit (rename, retime), brick edit (rename, retype, retarget) — **M5**
- Block delete and brick delete with "Just today / All recurrences" prompts — **M5**
- Drag-reorder for blocks AND for bricks within a block — **M6**
- The full polish layer: stagger on first paint, count-up animation on hero, "now" line glow, NOW tag, "Your Empire begins." card, brand-mark Easter egg, skeleton loaders, toasts — **M7**
- Persistence (`dharma:v1` localStorage, schema migrations, multi-tab last-writer-wins) — **M8**
- Calendar navigation (week strip, Castle / Kingdom / Empire), `appliesOn(rec, date)` resolver — **M9** (M3 still renders only today; recurrence kinds stored on Block from M2 are inert until M9)
- Voice mic — **M10**
- Multi-day blocks crossing midnight — **never (or much later)**
- "Empty block tickable as 0/1" UX — **M4** (the math is wired with a `0` floor in M3; M4 adds the tap-to-tick gesture that flips it to 1)
- Empire square light-up on day 100% — **M9** (M3 fires only the fireworks overlay locally on the Building view)
- "+ Block" via long-press menu / brick-and-block chooser — **never** (M3 keeps M2's `+` = New Block; standalone-brick creation lives only inside the tray)
- Block-detail surface as a separate route or sheet — **never** (block expand stays inline per § 0.5)
- Lighthouse measurement from sandbox — pending Vercel access (carries over from M2)

### Open spec gaps (lock at Gate #1)

- **SG-m3-01 — Brick category FK vs inline.** Recommendation: `categoryId: string | null` (FK), matching M2's SG-m2-07 ratification. Schema above reflects this.
- **SG-m3-02 — Loose Bricks tray location.** **LOCKED Gate #2 (M2 ship-react)** — Option A: pinned above the dock, always visible once `blocks.length > 0 \|\| looseBricks.length > 0`, collapsed chip-row default with chevron-up to expand. Hidden in the literal-empty state to preserve M1's empty-state contract. Recorded in § 0.11.
- **SG-m3-03 — Bricks: embedded under blocks vs flat array.** Recommendation: **embedded** for inside-block bricks (`block.bricks[]` — M2's locked field, populated in M3) AND flat for standalone (`state.looseBricks[]` — new in M3). This matches M8's persistence shape (block templates carry their bricks; standalone bricks are a peer collection).
- **SG-m3-04 — Inside-block brick category default.** Recommendation: pre-fill brick `categoryId` to the parent block's `categoryId` (overrideable). Alternative: always blank.
- **SG-m3-05 — 100% bloom / chime / fireworks: ship in M3 or defer.** Recommendation: **ship the wiring in M3** (component + cross-detection effect + tests via state injection). M3 has no user path to logging — but M4 needs the celebrations primed when its first stepper tick lands. Deferring to M4 means M4 ships TWO surfaces (logging + celebrations) which dilutes the M3 / M4 boundary.
- **SG-m3-06 — Block expand mechanism.** Recommendation: tap-to-expand in view mode; max-height transition 200 ms; re-tap collapses. No FLIP magic in M3 (that's M7). Carry the simplest implementation that lets brick-adding flow through.
- **SG-m3-07 — Hero ring component.** Recommendation: introduce `<HeroRing>` now as SVG with `stroke-dasharray` / `stroke-dashoffset`. Replaces the static numeral M0/M1 shipped. Numeral text node lives inside the ring.
- **SG-m3-08 — Where the "+ Brick" verb lives.** Recommendation: ONLY inside the Loose Bricks tray (when tray is rendered). The BottomBar `+` keeps M2's verb (New Block). No long-press menu, no chooser modal. Trade-off: in the literal-empty state (no blocks, no loose bricks), there is no path to add a standalone brick first. Resolution: the user must create their first block before the tray appears; if a user wants a single atomic action, they tap a slot, name it, and skip End — that's a no-end block, which is closer to a brick semantically. (Acceptable per § 0.14 antipattern 1: a single atomic action probably IS a brick, but in the literal-empty state Dharma still asks the user to "lay your first block" — the brick path opens up immediately after.)
- **SG-m3-09 — Empty-block scoring in M3.** Recommendation: `blockPct({ bricks: [] }) → 0` in M3. § 0.9's "empty block → 0 or 1 (boolean tick)" is a M4 feature; the math floor in M3 is `0` until M4 adds the per-block tick state. Document this so M4 doesn't have to renegotiate.
- **SG-m3-10 — Day score with zero bricks.** Recommendation: `dayPct({ blocks: [...], looseBricks: [] }) = avg(blockPct)` when at least one block exists; `dayPct({ blocks: [], looseBricks: [] }) = 0` for the literal-empty case (no division by zero). Average is taken over the union of (blocks + looseBricks) treating each as one unit per § 0.9's "Day score = average across all top-level units". **Migration:** the existing `dayPct(blocks: Block[])` signature in `lib/dharma.ts` is replaced by `dayPct(state: AppState)`; every call site (M0/M1/M2 — currently `Hero pct={...}` is the only consumer) must update to pass `state` instead of `state.blocks`.
- **SG-m3-11 — Bloom + chime + fireworks reduced-motion behavior.** Recommendation: bloom and fireworks are visuals → suppressed under `prefers-reduced-motion`. Chime is audio → still plays unless OS-muted (audio is not motion). Haptics still fire (haptics are not motion either; they're tactile).
- **SG-m3-12 — Audio asset for the chime.** Recommendation: ship a single small (< 30 KB) chime as a static asset under `public/sounds/chime.mp3`. Loaded on app boot via `new Audio()`. No external dependency. Mute respect: check `navigator.mediaSession` or fall back to a UA-mute check; M3 ships the simplest path (let the OS handle mute) and revisits in M7.
- **SG-m3-13 — Brick chip touch target during expanded block.** Recommendation: 44 px minimum height per ADR-031. Chips do not double-purpose as logging surfaces in M3 (tap = no-op until M4). M3 still keeps the tap target compliant so M4 doesn't have to resize.
- **SG-m3-14 — `<LooseBricksTray>` z-index relative to AddBrickSheet.** Recommendation: tray z-index < AddBrickSheet z-index. The sheet's full-screen overlay covers the tray. M2's `<AddBlockSheet>` already has the right z-index — reuse it.
- **SG-m3-15 — Brick add via tray when tray is collapsed.** Recommendation: the "+ Brick" pill is always present in the collapsed row (rightmost position, after any chips). User does NOT need to expand the tray to add a brick. Expand is only for browsing existing bricks.
- **SG-m3-16 — `Block.bricks` ordering in expanded view.** Recommendation: render in insertion order (the order they appear in `block.bricks[]`). M6 wires drag-reorder. Tests assert order matches array order.
- **SG-m3-17 — `<HeroRing>` SSR.** Recommendation: server renders the ring at `0%` (full empty arc). Client hydrates to actual day score with a 600 ms ease-in. This avoids hydration mismatch warnings even when the user has session state by the time of hydration. (Once M8 ships, persistence rehydrates state on mount — M3 has no persistence, so this is a forward-compatible default.)
- **SG-m3-18 — Stagger fade-in on new chip insert.** Recommendation: 30 ms between chips on first render of an expanded block; `0 ms` (no stagger) when adding ONE chip after the fact (single-element insert doesn't need a stagger sequence). Reduced-motion → instant in either case.

---
