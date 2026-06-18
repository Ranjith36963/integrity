## Milestone 4d — Add chooser (Block or Brick)

> **Pillars:** § 0.1, § 0.5 (atomic add), § 0.14 antipattern 1 (a single atomic action probably IS a brick — open the path), ADR-031 (44 px), ADR-039 (ships empty). **Resolves SG-m3-08 in favor of a chooser.** First chance to add a Brick from the literal-empty state.

### Intent

Today, the only path to add a Brick is the "+ Brick" pill inside `<LooseBricksTray>`. The tray only renders when at least one Block or one Brick already exists (per M3 AC #5). In the literal-empty state the user cannot reach a Brick at all — their only option is to lay a Block first.

Gate #2 on M4b surfaced this: the user tapped the dock `+` and tapped time slots and got AddBlockSheet every time. They could not find a Brick path.

M4d inserts a small chooser bottom-sheet between the entry point and the existing Add\* sheets:

- Tap the dock `+` → chooser opens → **Block** routes to `<AddBlockSheet>` · **Brick** routes to `<AddBrickSheet>` with `parentBlockId: null`.
- Tap any empty time slot → chooser opens with the slot's hour pre-captured → **Block** routes to `<AddBlockSheet>` with `defaultStart` set to the tapped hour · **Brick** routes to `<AddBrickSheet>` with `parentBlockId: null` (the slot's hour is discarded for the Brick path — bricks are time-agnostic).
- The "+ Add brick" button **inside** an expanded block is unchanged (already routes straight to AddBrickSheet with a real `parentBlockId`).
- The "+ Brick" pill **inside** `<LooseBricksTray>` is unchanged (already routes straight to AddBrickSheet with `parentBlockId: null`).

The chooser is a thin routing surface, not a new form. It owns no fields, no validation, no category — it just picks which downstream sheet to open and forwards the entry-point context (hour, parent) appropriately.

**What this is NOT:** changing AddBlockSheet or AddBrickSheet themselves; adding a third option (e.g. "Add Category"); a long-press-only menu; an inline popover. The pencil and gear icons in the top bar remain stubs (separate concern, M5/M6).

### Inputs

- The full M4c surface (or M4b if M4d ships first) — `<BuildingClient>`, `<BottomBar>`, `<Timeline>` with `<SlotTapTargets>`, `<AddBlockSheet>`, `<AddBrickSheet>`, `<LooseBricksTray>`.
- M0 primitives — `<Sheet>` (reused), `<Button>` (two large primary buttons inside the chooser).
- M0 motion — `modalIn` / `modalOut` (chooser uses the same Sheet shell, same animation).
- M0 haptics — `light` on each chooser button tap (matches every other primary tap in the app).

### Outputs (regions and behaviors)

| Region                              | Role in M4d                                                                                                                                                                                                                                                                             | Sync with prior milestones                                                                                              |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `<AddChooserSheet>` (NEW)           | Bottom-sheet on M0 `<Sheet>`. Body: two large stacked `<Button>`s — "Add Block" (primary amber) and "Add Brick" (secondary). Cancel = `<X>` top-left. No form fields. Tapping a button closes the chooser and opens the corresponding downstream sheet, forwarding entry-point context. | New component. Reuses `<Sheet>` shell + animation tokens.                                                               |
| `<BuildingClient>` (CHANGED)        | New chooser state (`open: boolean`, `defaultStart: string \| null`). `<BottomBar onAddPress>` and `<Timeline onSlotTap>` now open the chooser instead of opening AddBlockSheet directly.                                                                                                | M2/M3 routing replaced for the dock + slot paths only. The other two add paths (inside-block, tray) bypass the chooser. |
| `<AddBlockSheet>`                   | Unchanged.                                                                                                                                                                                                                                                                              | —                                                                                                                       |
| `<AddBrickSheet>`                   | Unchanged. Receives `parentBlockId: null` and no category pre-fill when invoked via the chooser (matches the tray path).                                                                                                                                                                | —                                                                                                                       |
| `<LooseBricksTray>` "+ Brick" pill  | Unchanged — still bypasses the chooser and goes straight to AddBrickSheet.                                                                                                                                                                                                              | M3 path preserved.                                                                                                      |
| Expanded block "+ Add brick" button | Unchanged — still bypasses the chooser and goes straight to AddBrickSheet with the real `parentBlockId`.                                                                                                                                                                                | M3 path preserved.                                                                                                      |

### Edge cases

- **Chooser open + user taps backdrop or swipes down** → silent dismiss (no downstream sheet opens). Matches M2/M3 sheet UX.
- **Chooser open + user taps "Add Block" then immediately backgrounds the tab** → no bug; AddBlockSheet opens on resume; chooser is already closed.
- **Slot tap captures hour `H`; user picks "Add Brick"** → AddBrickSheet opens with `parentBlockId: null` and no time/hour context (bricks have no `start`). The captured `H` is discarded.
- **Dock + tap (no hour context)** → chooser opens; if user picks "Add Block", AddBlockSheet uses its current default-start logic (rounded current hour, M2 behavior).
- **Reduced motion** → chooser sheet animation collapses to instant (M0 `modalIn` already respects `prefers-reduced-motion`; reuse).
- **Chooser fired from a slot tap inside an existing block's vertical extent** → does NOT happen in M4d; SlotTapTargets only fire on empty slots (M2 behavior preserved).
- **Two rapid taps on dock +** → second tap is swallowed by the open chooser's backdrop or no-ops while sheet is mounting (debounce via the `open` state guard, M2 pattern).
- **Keyboard:** chooser opens with focus trapped inside it; Tab cycles `Add Block` → `Add Brick` → `Cancel`; Enter/Space activates.

### Acceptance criteria

**Routing — dock +**

1. Tapping the dock `+` (`<BottomBar onAddPress>`) opens `<AddChooserSheet>` (NOT `<AddBlockSheet>` directly).
2. Inside the chooser, tapping "Add Block" closes the chooser and opens `<AddBlockSheet>` with `defaultStart` set to the rounded current hour (M2's existing logic). Haptic `light` fires on tap.
3. Inside the chooser, tapping "Add Brick" closes the chooser and opens `<AddBrickSheet>` with `parentBlockId: null` and no category pre-fill (matches the tray path). Haptic `light` fires on tap.
4. Tapping the chooser's `<X>` Cancel closes the chooser. No downstream sheet opens.

**Routing — slot tap** 5. Tapping any empty hour slot in `<Timeline>` opens `<AddChooserSheet>` (NOT `<AddBlockSheet>` directly), and the chooser captures the tapped hour. 6. Inside the chooser, tapping "Add Block" closes the chooser and opens `<AddBlockSheet>` with `defaultStart` set to the captured hour. 7. Inside the chooser, tapping "Add Brick" closes the chooser and opens `<AddBrickSheet>` with `parentBlockId: null` (the captured hour is discarded — bricks are time-agnostic).

**Other add paths preserved** 8. The "+ Add brick" button inside an expanded block opens `<AddBrickSheet>` directly (no chooser). `parentBlockId` is the block's id; `categoryId` pre-fills to the block's category. 9. The "+ Brick" pill inside `<LooseBricksTray>` opens `<AddBrickSheet>` directly (no chooser). `parentBlockId: null`; no category pre-fill.

**Empty state — first brick** 10. From the literal-empty state (no blocks, no loose bricks, tray hidden), tapping the dock `+` → chooser → "Add Brick" → AddBrickSheet → Save → the new brick appears in `<LooseBricksTray>` (the tray now renders because `state.looseBricks.length > 0`). The empty-state card unmounts. 11. From the literal-empty state, tapping a slot → chooser → "Add Brick" → Save → same outcome as #10 (the chooser correctly discards the hour for the Brick path).

**Sheet UX** 12. Chooser uses M0 `<Sheet>` with `modalIn` / `modalOut` animations. 13. Backdrop tap dismisses the chooser silently. 14. Swipe-down on iOS Safari dismisses silently (M2 SG-m2-06 pattern). 15. Two large `<Button>`s stacked vertically: "Add Block" (primary amber, top), "Add Brick" (secondary, below). Each ≥ 44 px tall. Spacing per M0 tokens.

**Schema** 16. No reducer, action, or AppState changes. M4d is purely UI routing. No new persistence.

**Reduced motion + a11y** 17. Reduced motion: chooser slide-in collapses to instant (inherited from `<Sheet>`). 18. Chooser has `role="dialog"`, `aria-label="Add"`, focus trap. 19. Each button has `aria-label="Add Block"` / `aria-label="Add Brick"` (label = visible text). 20. Tab order: Add Block → Add Brick → Cancel. Enter/Space activates. 21. axe-core: zero violations on the open chooser.

**Quality** 22. `tsc --noEmit`: zero new errors. 23. ESLint: zero new errors. 24. Vitest: component test for `<AddChooserSheet>` (renders two buttons, dispatches the right callback, Cancel closes); integration test in `<BuildingClient>` (dock + → chooser opens; choosing Block opens AddBlockSheet; choosing Brick opens AddBrickSheet with `parentBlockId: null`); regression tests for M3 add paths (inside-block + tray pill still bypass the chooser). 25. Playwright (deferred-to-preview, M4a/M4b pattern): full empty-state path → chooser → Add Brick → save → tray renders the new chip; slot-tap → chooser → Add Block path verifies `defaultStart` matches the tapped hour.

### Out of scope (M4d)

- Pencil / gear icons in TopBar — **M5 (edit mode) / M6 (settings)** respectively.
- A third chooser option (e.g. "Add Category" outside an Add\* form) — **never (categories are created inline inside the existing forms)**.
- Long-press behavior on the dock `+` or slots — **never**.
- Inline popover / contextual menu instead of a sheet — **never (sheet is the M0 primitive for choices)**.
- Changing AddBlockSheet's or AddBrickSheet's internal layout — **never (this is a routing-only change)**.
- Pre-filling the Brick form's start time from a slot tap — **never (bricks are time-agnostic per § 0.5; if the user wants a timed thing they pick Block)**.

### Open spec gaps (resolve at VERIFY)

- **SG-m4d-01 — Chooser visual hierarchy.** Recommendation: "Add Block" is primary amber (matches the dock `+` legacy verb); "Add Brick" is secondary outline (visually distinct so the user understands the difference). Trade-off: making them visually equal could be more honest about the equal weight of the two paths. Lean toward primary/secondary because Block is still the more frequent action in current usage data (no actual data; assumption — revisit M7).
- **SG-m4d-02 — Chooser title / copy.** Recommendation: title `"Add"`. Body: just the two buttons, no help text. Trade-off: a one-line subtitle ("Pick what you want to add") could be friendlier. Lean toward no subtitle to keep the surface minimal and one-tap-deep.
- **SG-m4d-03 — `<SlotTapTargets>` hour capture into the chooser.** Recommendation: store the captured hour in `<BuildingClient>`'s chooser state (`chooserState: { open, defaultStart: string | null }`). When "Add Block" is chosen, pass `defaultStart` to AddBlockSheet; when "Add Brick" is chosen, ignore. Alternative: pass the hour as a prop directly to the chooser. Lean toward state-in-BuildingClient because the chooser is already a single-instance Sheet and state-per-feature is the M2/M3 pattern.
- **SG-m4d-04 — Backwards-compat with M2/M3 tests.** Recommendation: M2's "tap dock + → AddBlockSheet opens" test must be updated to "tap dock + → chooser opens → tap Add Block → AddBlockSheet opens". Same for M2 slot-tap tests. This is a test-refactor cost paid in M4d's TESTS phase.
- **SG-m4d-05 — Order of M4d vs M4c.** Recommendation: ship M4d FIRST (it unblocks Gate #2 from preview), then M4c (time timer). M4c assumes a brick exists; M4d makes the brick reachable from empty state. Without M4d, the user has to lay a Block they don't want before they can lay a Brick.
