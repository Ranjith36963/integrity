## Milestone 4d — Add chooser (Block or Brick) — Plan

### Pillars consumed

§ 0.1 (the wedge — proof, not plans), § 0.5 (atomic add — a single tap is a brick laid), § 0.14 antipattern 1 (a single atomic action probably IS a brick — open the path), ADR-031 (44 px touch target), ADR-039 (ships empty), ADR-027 (commit prefixes), ADR-041 (single-gate Loop). **Resolves SG-m3-08 in favor of a chooser** (the M3 plan deferred dock + / slot + → AddBrickSheet routing; M4d locks it as a chooser-mediated route while preserving the two M3 direct paths).

### Intent

Insert a thin routing sheet — `<AddChooserSheet>` — between the dock-`+` / empty-slot entry points and the existing `<AddBlockSheet>` / `<AddBrickSheet>`. After M4d, tapping the dock `+` opens the chooser; the user picks Block or Brick; the corresponding downstream sheet opens with the entry-point context (rounded current hour for Block via dock; the tapped slot's hour for Block via slot tap; `parentBlockId: null` for Brick from either entry; the slot's hour is discarded on the Brick path because bricks are time-agnostic). The two **inside-an-existing-surface** add paths — the "+ Add brick" button inside an expanded block and the "+ Brick" pill inside `<LooseBricksTray>` — bypass the chooser and continue to open `<AddBrickSheet>` directly with the right `parentBlockId` (the block's own id, or `null` for the tray). M4d adds **one** new component, modifies **one** wiring file (`<BuildingClient>`), and changes **zero** schema, reducer, scoring, or persistence surfaces.

**1-line value-add:** the literal-empty state now has a discoverable Brick path. Before M4d, `<LooseBricksTray>` was the only Brick entry, but the tray only renders once at least one Block or Brick already exists (M3 AC #5) — Catch-22. The chooser fixes Gate-#2 feedback from M4b preview ("user tapped + and slots, never reached a Brick").

**What this is NOT:** a new form, a category-add affordance, a long-press menu, an inline popover, or a layout change to AddBlockSheet/AddBrickSheet. The TopBar pencil and gear icons remain stubs (separate concerns: M5 edit, M6 settings).

### File structure

| Path                                | Tag                    | Role in M4d                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/AddChooserSheet.tsx`    | `[new]`                | Bottom-sheet routing surface. Composes M0 `<Sheet>` shell with `title="Add"`. Body: two stacked native `<Button>` elements — "Add Block" (variant `primary`, top) and "Add Brick" (variant `secondary`, below) — each `min-h-[44px]` per ADR-031. Owns no form state. Single callback prop `onPick(choice: 'block' \| 'brick')` plus `onCancel()`. Each button fires `haptics.light()` then calls `onPick(...)`. The `<X>` Cancel in `<Sheet>`'s header calls `onCancel()`.                                                                                                                   |
| `app/(building)/BuildingClient.tsx` | `[extends]`            | New chooser sheet state (`chooserState: { open: boolean; defaultStart: string \| null }`) and a single `onPick` handler. The dock-`+` and slot-tap entry points now open the chooser instead of opening `<AddBlockSheet>` directly. The chooser's `onPick` routes to either `setSheetState(...)` (Block) or `setBrickSheetState(...)` (Brick). The two inside-surface paths (`onAddBrick` from `<Timeline>`, `onAddBrick` from `<LooseBricksTray>`) are **unchanged** — they still call `openBrickSheet(parentBlockId, defaultCategoryId)` directly, bypassing the chooser per AC #8 + AC #9. |
| `components/BottomBar.tsx`          | `[survives unchanged]` | `onAddPress` prop signature unchanged. The behavior of the `+` button (44×44, `aria-label="Add"`) is identical at the component level — the swap is upstream in `<BuildingClient>`. No file edit needed.                                                                                                                                                                                                                                                                                                                                                                                      |
| `components/Timeline.tsx`           | `[survives unchanged]` | `onSlotTap(hour: number)` prop signature unchanged. The wiring change (slot tap now opens chooser instead of `<AddBlockSheet>`) lives in `<BuildingClient>`'s `onSlotTap` handler.                                                                                                                                                                                                                                                                                                                                                                                                            |
| `components/SlotTapTargets.tsx`     | `[survives unchanged]` | No change — fires `onSlotTap(hour)` exactly as in M2. Hour capture into the chooser is `<BuildingClient>`'s job.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `components/LooseBricksTray.tsx`    | `[survives unchanged]` | "+ Brick" pill calls `onAddBrick()` → `handleAddLooseBrick()` → `openBrickSheet(null, null)`. M4d does NOT change this — tray pill stays a direct path to `<AddBrickSheet>` (AC #9).                                                                                                                                                                                                                                                                                                                                                                                                          |
| `components/TimelineBlock.tsx`      | `[survives unchanged]` | "+ Add brick" button inside the expanded block calls `onAddBrick(block.id)` → `handleAddBrickFromBlock(blockId)` → `openBrickSheet(blockId, block.categoryId)`. M4d does NOT change this — inside-block direct path preserved (AC #8).                                                                                                                                                                                                                                                                                                                                                        |
| `components/AddBlockSheet.tsx`      | `[survives unchanged]` | Props (`open`, `defaultStart`, `categories`, `blocks`, `onSave`, `onCancel`, `onCreateCategory`) are unchanged. M4d feeds the same `defaultStart` it would have fed pre-chooser, just one routing hop later.                                                                                                                                                                                                                                                                                                                                                                                  |
| `components/AddBrickSheet.tsx`      | `[survives unchanged]` | Props (`open`, `parentBlockId`, `defaultCategoryId`, `categories`, `onSave`, `onCancel`, `onCreateCategory`) are unchanged. From the chooser path, `parentBlockId: null` and `defaultCategoryId: null` (matches the tray-pill defaults).                                                                                                                                                                                                                                                                                                                                                      |
| `components/ui/Sheet.tsx`           | `[survives unchanged]` | M0 primitive reused for the chooser exactly as M2/M3 reuse it. `role="dialog"`, `aria-modal="true"`, `aria-label={title}`, ESC-close — all already present.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `components/ui/Button.tsx`          | `[survives unchanged]` | M0 primary + secondary variants reused. ADR-031 floor (`min-h-[44px]`) already enforced.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `lib/haptics.ts`                    | `[survives unchanged]` | `haptics.light()` reused on each chooser-button tap. No new haptic.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `lib/motion.ts`                     | `[survives unchanged]` | `<Sheet>`'s `modalIn` / `modalOut` open/close transitions reused. No new motion tokens.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `lib/types.ts`                      | `[survives unchanged]` | No `Action`, `Brick`, `Block`, `Category`, or `AppState` change. M4d is purely UI routing (AC #16).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `lib/data.ts`                       | `[survives unchanged]` | No new reducer arm. The reducer keeps the M4b-locked five-arm `Action` union.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

**Summary:** 1 NEW file (`components/AddChooserSheet.tsx`), 1 MODIFIED file (`app/(building)/BuildingClient.tsx`), 0 REMOVED files, **0 schema changes**.

### Data model

**No schema, reducer, scoring, or persistence changes.** Explicit lock per AC #16:

- `lib/types.ts` — no field added or removed on `Action`, `Block`, `Brick` (any variant), `Category`, `AppState`. The existing M4b-locked `Action` union (`ADD_BLOCK | ADD_CATEGORY | ADD_BRICK | LOG_TICK_BRICK | LOG_GOAL_BRICK`) is unchanged.
- `lib/data.ts` — no new case arm. `defaultState()` unchanged.
- `lib/dharma.ts` — no new helpers. `dayPct`, `blockPct`, `brickPct` unchanged.
- `localStorage` / persistence — N/A in Phase 1 anyway (M8); M4d adds nothing that would persist.

The chooser's only state is **transient UI** — the `chooserState` object lives entirely in `<BuildingClient>`'s `useState` and is destroyed on close. No reducer dispatch fires for "open chooser" or "pick choice"; the chooser is a routing detour, not a domain mutation.

### Components

**`<AddChooserSheet>` (new)**

```tsx
// components/AddChooserSheet.tsx
"use client";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { haptics } from "@/lib/haptics";

interface Props {
  open: boolean;
  onPick: (choice: "block" | "brick") => void;
  onCancel: () => void;
}

export function AddChooserSheet({ open, onPick, onCancel }: Props) {
  function handleBlock() {
    haptics.light();
    onPick("block");
  }
  function handleBrick() {
    haptics.light();
    onPick("brick");
  }
  return (
    <Sheet open={open} onClose={onCancel} title="Add">
      <div
        role="group"
        aria-label="Choose what to add"
        className="flex flex-col gap-3 p-5"
      >
        <Button variant="primary" onClick={handleBlock} aria-label="Add Block">
          Add Block
        </Button>
        <Button
          variant="secondary"
          onClick={handleBrick}
          aria-label="Add Brick"
        >
          Add Brick
        </Button>
      </div>
    </Sheet>
  );
}
```

- **Props:** `{ open: boolean; onPick: (choice: 'block' | 'brick') => void; onCancel: () => void }`. No defaults, no internal form state, no validation, no category surface.
- **Owned state:** none. The component is fully driven by props.
- **Layout:** vertical flex stack, `gap-3` (M0 spacing), `p-5` outer padding inside the `<Sheet>` body. Two `<Button>`s at full width (the M0 `<Button>` already stretches to its container). Order top-to-bottom: "Add Block" (primary amber, matches the dock + legacy verb), "Add Brick" (secondary outline). Per SG-m4d-01 lock below.
- **Tap handlers:** each button (`onClick`) calls `haptics.light()` then `onPick('block' | 'brick')`. Cancel = `<Sheet>`'s built-in `<X>` (header) + ESC + backdrop tap + iOS swipe-down — all funnel into `<Sheet>`'s `onClose` prop, which the chooser wires to its `onCancel`. The chooser does **not** itself close on `onPick` — closing is owner-controlled (`<BuildingClient>` flips `chooserState.open` to `false` immediately upon receiving the pick, then sets the downstream sheet's open state). This mirrors M2/M3's "single sheet instance per surface, parent owns open/close" pattern.
- **Sheet stacking:** the chooser is a **single instance** owned by `<BuildingClient>`, mounted as a sibling of `<AddBlockSheet>` and `<AddBrickSheet>` — not nested inside either. This keeps each sheet's z-index independent and each sheet's dismiss owner-controlled. Per the cross-cutting invariant locked below.
- **Focus trap:** the M0 `<Sheet>` already provides `role="dialog"` + `aria-modal="true"` + ESC-close. M2/M3 sheets layer a local `useFocusTrap` effect (SG-m2-09 pattern). M4d's chooser does **not** need one because the body has only two interactive elements + the `<X>` Cancel — Tab cycles naturally through them within the dialog. If `<Sheet>` ever ships a primitive-level focus trap (M5+), the chooser inherits it for free. **Decision:** rely on `<Sheet>`'s existing keyboard semantics + native `<button>` Tab order. Document in the component's header comment that no local trap is needed.
- **Animation:** `<Sheet>` uses `modalIn` / `modalOut` Framer Motion variants by default, both gated behind `prefers-reduced-motion: reduce` in `lib/motion.ts`. Chooser inherits this verbatim.
- **A11y:**
  - Outer `<Sheet>` carries `role="dialog"` + `aria-label="Add"` (the title prop). Inner `<div role="group" aria-label="Choose what to add">` provides the action context.
  - Each button is a native `<button>` with `type="button"` (M0 default). `aria-label="Add Block"` / `aria-label="Add Brick"` (label = visible text, redundant but explicit per AC #19).
  - Tab order: `Add Block` → `Add Brick` → `<X>` Cancel (Cancel sits in `<Sheet>`'s header, after the body in DOM order, so Tab reaches it last). Per AC #20.
  - Enter/Space activates either button via native `<button>` semantics. Per AC #20.
  - axe-core target: zero violations on the open chooser (AC #21). Verified by Playwright + `@axe-core/playwright` in `tests/e2e/m4d.a11y.spec.ts`.
  - Reduced motion: chooser slide-in collapses to instant via `<Sheet>`'s existing handling. Verified by Playwright with `prefers-reduced-motion: reduce` set on the page context (AC #17).

**`<BuildingClient>` (extended)**

New state and handlers (sketch):

```tsx
interface ChooserState {
  open: boolean;
  defaultStart: string | null; // captured slot hour, or null when fired from dock +
}

const [chooserState, setChooserState] = useState<ChooserState>({
  open: false,
  defaultStart: null,
});

// Dock + → open chooser, no slot context.
const handleDockAdd = useCallback(() => {
  setChooserState({ open: true, defaultStart: null });
}, []);

// Slot tap → open chooser, capture the tapped hour for the Block branch.
const handleSlotTap = useCallback((hour: number) => {
  setChooserState({ open: true, defaultStart: hourToHHMM(hour) });
}, []);

// Chooser pick → close chooser, route to the right downstream sheet.
const handleChooserPick = useCallback(
  (choice: "block" | "brick") => {
    if (choice === "block") {
      const start = chooserState.defaultStart ?? roundDownToHour(now);
      setChooserState({ open: false, defaultStart: null });
      openSheet(start);
    } else {
      setChooserState({ open: false, defaultStart: null });
      openBrickSheet(null, null); // parentBlockId: null, defaultCategoryId: null
    }
  },
  [chooserState.defaultStart, now],
);

const handleChooserCancel = useCallback(() => {
  setChooserState({ open: false, defaultStart: null });
}, []);
```

Wiring change in JSX:

- `<BottomBar onAddPress={handleDockAdd} />` (was `onAddPress={() => openSheet(roundDownToHour(now))}`).
- `<Timeline onSlotTap={handleSlotTap} ...>` (was `onSlotTap={(hour) => openSheet(hourToHHMM(hour))}`).
- New sibling `<AddChooserSheet open={chooserState.open} onPick={handleChooserPick} onCancel={handleChooserCancel} />`, mounted alongside `<AddBlockSheet>` and `<AddBrickSheet>`.
- `<Timeline onAddBrick={handleAddBrickFromBlock} ...>` — **unchanged** (inside-block direct path).
- `<LooseBricksTray onAddBrick={handleAddLooseBrick} ...>` — **unchanged** (tray-pill direct path).

The two direct paths (`handleAddBrickFromBlock` and `handleAddLooseBrick`) remain wired straight to `openBrickSheet(...)` and **never** route through the chooser. This is a **first-class invariant** (see Decisions to honor).

**`<BottomBar>`, `<Timeline>`, `<SlotTapTargets>`, `<LooseBricksTray>`, `<TimelineBlock>`, `<AddBlockSheet>`, `<AddBrickSheet>`, `<Sheet>`, `<Button>`** — all unchanged at the component-source level. The behavior changes are entirely upstream in `<BuildingClient>`'s wiring.

### Wiring map

The four entry points and their before-vs-after behavior:

| Entry point                                 | Today (pre-M4d)                                                                                             | After M4d                                                                                                                                                                                   | Captured-hour rule                                                                                              | Routes through chooser? |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `<BottomBar onAddPress>` (dock `+`)         | `() => openSheet(roundDownToHour(now))` → AddBlockSheet                                                     | `handleDockAdd` → `setChooserState({ open: true, defaultStart: null })` → user picks → Block: `openSheet(roundDownToHour(now))`; Brick: `openBrickSheet(null, null)`                        | No hour captured. Block branch falls back to `roundDownToHour(now)` (M2 logic)                                  | **Yes**                 |
| `<Timeline onSlotTap>` → `<SlotTapTargets>` | `(hour) => openSheet(hourToHHMM(hour))` → AddBlockSheet                                                     | `handleSlotTap(hour)` → `setChooserState({ open: true, defaultStart: hourToHHMM(hour) })` → user picks → Block: `openSheet(chooserState.defaultStart)`; Brick: `openBrickSheet(null, null)` | Captured hour passed to AddBlockSheet on Block branch; **discarded** on Brick branch (bricks are time-agnostic) | **Yes**                 |
| `<TimelineBlock>` "+ Add brick" button      | `onAddBrick(block.id)` → `handleAddBrickFromBlock(block.id)` → `openBrickSheet(block.id, block.categoryId)` | **Unchanged**. Direct path to AddBrickSheet with real `parentBlockId` and parent's `categoryId` pre-fill.                                                                                   | N/A — bricks have no time anyway                                                                                | **No** (bypass)         |
| `<LooseBricksTray>` "+ Brick" pill          | `onAddBrick()` → `handleAddLooseBrick()` → `openBrickSheet(null, null)`                                     | **Unchanged**. Direct path to AddBrickSheet with `parentBlockId: null`, `defaultCategoryId: null`.                                                                                          | N/A — bricks have no time anyway                                                                                | **No** (bypass)         |

**Captured-hour propagation summary:**

- Slot tap captures `hour` into `chooserState.defaultStart` as `"HH:00"` via `hourToHHMM(hour)`.
- On chooser-`Block` pick: pass `chooserState.defaultStart` into `openSheet(...)` → `AddBlockSheet`'s `defaultStart` prop.
- On chooser-`Brick` pick: ignore `chooserState.defaultStart` entirely. `openBrickSheet(null, null)` matches the tray-pill defaults (no parent block, no category pre-fill).
- On dock-`+` pick of `Block`: no captured hour, fall back to `roundDownToHour(now)` (M2's existing default-start logic preserved).
- On dock-`+` pick of `Brick`: same as slot-`Brick` — `openBrickSheet(null, null)`.

### Design tokens

**Zero new tokens. Zero new motion.**

- `<Sheet>` reuses the M0 `modalIn` / `modalOut` Framer Motion variants from `lib/motion.ts`. Reduced-motion handled inside `<Sheet>` already.
- `<Button>` reuses M0 `primary` (amber) and `secondary` (outline) variants. Both already enforce `min-h-[44px]` per ADR-031.
- Spacing — Tailwind utility classes only (`flex flex-col gap-3 p-5`). No new CSS variables.
- Haptic — `haptics.light` (existing).
- Typography — inherited from `<Button>` and `<Sheet>` defaults. No new font sizes or weights.
- Color — `<Button>` `primary` reads `--accent`/`--accent-deep`; `secondary` reads `--ink`/`--card-edge`. No new `--cat-*` or layer tokens.

### Decisions to honor

- **ADR-031 (44 px touch target).** Both chooser buttons inherit M0 `<Button>`'s `min-h-[44px]` floor. Verified visually + via E2E touch-target test (AC #15). The chooser body uses `gap-3` (12 px) between buttons so the hit areas do not overlap.
- **ADR-039 (ships empty).** No factory blocks, bricks, or categories introduced. The chooser opens onto AddBlockSheet/AddBrickSheet with the same defaults they had pre-M4d (no auto-fill of title, category, or anything else). Empty-state remains literal-empty until the user types and Saves.
- **ADR-027 (commit prefixes).** PLANNER commits as `docs(plan-m4d): …` (this dispatch) and `docs(tests-m4d): …` (next dispatch). BUILDER commits as `test(m4d): …` (red) and `feat(m4d): …` / `fix(m4d): …` (green/refactor). SHIPPER as `chore(ship-m4d): …` and/or `docs(ship-m4d): …`.
- **ADR-022 (one feature per dispatch).** This plan covers M4d only. Other features (M4c time timer, M5 edit mode, etc.) are separate `/feature` invocations.
- **ADR-025 + ADR-026 + ADR-041 (Loop contract).** This `mode: PLAN` dispatch authors `/docs/plan.md` only. The `mode: TESTS` dispatch will follow and author `/docs/tests.md`. VERIFIER then audits both before BUILDER starts. No human gate between TESTS and BUILD.
- **M2 single-sheet-instance pattern (resolved at M2 Cross-cutting concerns).** `<AddChooserSheet>`, `<AddBlockSheet>`, `<AddBrickSheet>` are **three sibling instances** mounted at the `<BuildingClient>` root, **not** nested. Each owns its own `open` boolean. Routing flows through `<BuildingClient>`'s state, never via nested portal stacking. This preserves the M0 `<Sheet>` primitive's "one dialog at a time" contract and keeps focus restoration correct (each sheet remembers its own return target via its local hook).
- **M3 SG-m3-08 — RESOLVED-IN-FAVOR-OF-CHOOSER.** The M3 plan deferred the question "does dock-+ open Block, Brick, or a chooser?" In M3, dock-+ shipped to AddBlockSheet directly. M4d **resolves SG-m3-08** by routing dock-+ (and slot taps) through the chooser, while leaving the two direct M3 paths (`<TimelineBlock>` "+ Add brick" and `<LooseBricksTray>` "+ Brick" pill) unchanged. Document this in the M4d commit body so future readers find the lineage.
- **First-class invariant: direct paths bypass the chooser (AC #8 + AC #9).** The "+ Add brick" inside an expanded block and the "+ Brick" pill inside `<LooseBricksTray>` MUST continue to open `<AddBrickSheet>` directly without traversing `<AddChooserSheet>`. BUILDER must not consolidate these into a single chooser-mediated path "for symmetry" — they have parent-context the chooser does not (a real `parentBlockId` for the inside-block path, the explicit-loose intent for the tray path). Regression tests in `tests.md` will assert this directly.
- **First-class invariant: chooser is a single instance owned by `<BuildingClient>` (not nested).** See M2 single-sheet-instance pattern above. Without this, focus restoration breaks and z-index stacking becomes ad-hoc.

### Resolutions for open spec gaps

- **SG-m4d-01 — Chooser visual hierarchy.** **LOCKED — primary amber for "Add Block", secondary outline for "Add Brick".** Per spec recommendation. Block is still the more frequent action in current usage assumption (no data yet — revisit M7 if usage data inverts). Buttons stacked vertically (Block on top, Brick below). Trade-off acknowledged: making them visually equal would be more honest about the equal weight of the two paths; we chose hierarchy because the dock-+ verb has historically meant Block, and the chooser is the entry point most users will reach first.
- **SG-m4d-02 — Chooser title / copy.** **LOCKED — `<Sheet>` title is `"Add"`. No subtitle, no help text in body.** Body is exactly the two buttons. Rationale: keep the surface minimal and one-tap-deep. The user's eyes go to the buttons; copy in between would slow them down. If post-launch user testing surfaces confusion ("what's the difference between a block and a brick?"), surface a follow-up in M7 polish to add a `<p>` subtitle below the title — but ship the floor first.
- **SG-m4d-03 — `<SlotTapTargets>` hour capture into the chooser.** **LOCKED — store the captured hour in `<BuildingClient>`'s `chooserState.defaultStart`.** When the user picks Block, pass `defaultStart` to `<AddBlockSheet>`; when they pick Brick, ignore it. Alternative (passing the hour as a prop directly to `<AddChooserSheet>`) was rejected because the chooser is a thin routing surface and should not own time semantics — its single responsibility is "which downstream sheet?". Locating the state in `<BuildingClient>` matches the M2/M3 single-sheet-instance / parent-owns-state pattern.
- **SG-m4d-04 — Backwards-compat with M2/M3 tests.** **LOCKED — re-author affected M2 tests in the M4d TESTS dispatch.** Specifically, M2's "tap dock + → AddBlockSheet opens" tests (E-m2-NN family, plus the BuildingClient integration test) need to be updated to "tap dock + → chooser opens → tap Add Block → AddBlockSheet opens with the same defaultStart". Same shape for M2 slot-tap tests. The migration is a TESTS-mode concern; the PLANNER will list affected IDs in the M4d `tests.md` migration table. **BUILDER is forbidden from updating M2 tests in the IMPL phase except as part of the same red→green cycle for M4d's new tests** — the migration is bundled into M4d's TESTS commits, not strewn across IMPL commits.
- **SG-m4d-05 — Order of M4d vs M4c.** **OUT-OF-SCOPE for this plan.** The spec recommends M4d ships first to unblock Gate-#2 from preview. That is an orchestration decision Main Claude makes when invoking `/feature m4d` vs `/feature m4c`, not a plan-internal lock. M4d does not depend on M4c (the chooser does not interact with the time timer). M4c does not depend on M4d (the time timer fires off existing time bricks; reaching a time brick already works via the inside-block path or, post-M4d, via the tray + M3 brick creation flow). **No action in this plan.**

### Edge cases

- **Chooser open + backdrop tap or iOS swipe-down** → silent dismiss. `<Sheet>`'s `onClose` fires `onCancel` → `setChooserState({ open: false, defaultStart: null })`. No downstream sheet opens. Matches M2/M3 sheet UX.
- **Chooser open + ESC** → same as backdrop. M0 `<Sheet>` handles ESC.
- **Chooser open + user taps "Add Block" then immediately backgrounds the tab** → no bug. State is synchronous: `setChooserState` + `openSheet` both flush in the same React tick. AddBlockSheet renders open on resume, chooser is already closed.
- **Slot tap captures hour `H`, user picks Brick** → AddBrickSheet opens with `parentBlockId: null` and no time/hour context (bricks have no `start` field per ADR-034). The captured `H` is silently discarded. Verified by integration test in `tests.md` (slot-tap-then-brick path → AddBrickSheet props snapshot has no hour).
- **Dock + tap (no captured hour), user picks Block** → AddBlockSheet opens with `defaultStart = roundDownToHour(now)` (M2's existing default-start logic). Same as today's pre-M4d behavior, just routed through the chooser.
- **Reduced motion** → chooser slide-in collapses to instant. `<Sheet>` already handles this via Framer Motion's `useReducedMotion` (M0).
- **Chooser fired from a slot tap inside an existing block's vertical extent** → does NOT happen. `<SlotTapTargets>` only fires on empty slots — M2 behavior preserved. (If the block-card layer is z-above the slot-tap layer, taps on the block's footprint reach the block's `onClick`, not `onSlotTap`. M2 already verified.)
- **Two rapid taps on dock +** → first tap sets `chooserState.open = true` and the chooser begins mounting. Second tap also sets `chooserState.open = true` (no-op, React bails on identical state). Either way the chooser is open exactly once. No debounce needed.
- **User taps "Add Block" twice rapidly** → first tap fires `onPick('block')` → `setChooserState({ open: false })` + `openSheet(...)`. The chooser begins closing animation. Second tap on the same button during that window: the button is still mounted (the `<Sheet>`'s exit animation is ~200ms), but the chooser is already closing and the AddBlockSheet is already opening. Second tap re-fires `onPick('block')` → `setChooserState({ open: false })` (no-op) + `openSheet(...)` (no-op since already open with same `defaultStart`). End result: AddBlockSheet opens once, no double-fire. Acceptable; matches M2's debounce-via-state-guard pattern.
- **Keyboard: Tab cycles `Add Block` → `Add Brick` → `<X>` Cancel.** Enter/Space activates. Per AC #20.
- **Screen reader on chooser open** → `<Sheet>` announces `role="dialog"` + `aria-label="Add"`. Inner group announces "Choose what to add". Each button's `aria-label` matches its visible text.
- **`chooserState.defaultStart` stale when user re-opens chooser via dock +** → `handleDockAdd` always resets `defaultStart: null`. `handleSlotTap` always sets it to the new hour. No stale-state risk.

### Out of scope (M4d)

(Mirrored verbatim from SPEC § Out of scope:)

- Pencil / gear icons in TopBar — **M5 (edit mode) / M6 (settings)** respectively.
- A third chooser option (e.g. "Add Category" outside an Add\* form) — **never** (categories are created inline inside the existing forms).
- Long-press behavior on the dock `+` or slots — **never**.
- Inline popover / contextual menu instead of a sheet — **never** (sheet is the M0 primitive for choices).
- Changing `<AddBlockSheet>`'s or `<AddBrickSheet>`'s internal layout — **never** (this is a routing-only change).
- Pre-filling the Brick form's start time from a slot tap — **never** (bricks are time-agnostic per § 0.5; if the user wants a timed thing they pick Block).

### Migration / obsolete IDs

**No source-level component obsoletions.** All modified-or-new files listed above; nothing removed.

**Test-level migrations** (deferred to M4d's `tests.md` migration table per SG-m4d-04):

- M2 dock-+ E2E (`E-m2-NN` for "tap dock + → AddBlockSheet opens") → re-authored in M4d to insert the chooser hop. M2 IDs preserved with `(re-authored M4d)` suffix.
- M2 slot-tap E2E (`E-m2-NN` for "tap empty slot → AddBlockSheet opens with defaultStart=hour") → same re-authored shape.
- BuildingClient integration tests covering dock-+ and slot-tap dispatch → re-authored to assert chooser opens first, then downstream sheet on pick.

The detailed test ID list and migration table is the **next dispatch's** (`mode: TESTS`) deliverable. This plan declares the scope; the TESTS dispatch produces the IDs.

**No obsolete test IDs to remove.** M2/M3/M4a/M4b IDs that aren't dock-+ or slot-tap-related are unchanged. The two direct paths (`<TimelineBlock>` "+ Add brick", `<LooseBricksTray>` "+ Brick" pill) keep their existing test IDs verbatim — M4d explicitly preserves their behavior (AC #8 + AC #9), and the existing IDs serve as the regression guards listed in AC #24.

### Cross-cutting concerns BUILDER will hit

1. **Chooser is a sibling sheet, not nested.** Mount `<AddChooserSheet>` at the same level as `<AddBlockSheet>` and `<AddBrickSheet>` inside `<BuildingClient>`'s return. Do NOT nest it inside either. Three siblings, one parent owns all `open` flags.
2. **`useCallback` discipline.** Wrap `handleDockAdd`, `handleSlotTap`, `handleChooserPick`, `handleChooserCancel` in `useCallback` with proper deps (`chooserState.defaultStart` and `now` for the pick handler). This avoids re-creating functions on every render and matches the M4a/M4b discipline established for `handleTickToggle` / `handleGoalLog`.
3. **Stale closure risk on `now`.** `handleChooserPick` reads `now` (a value that ticks every 60 s via `useNow()`) for the dock-+-Block fallback. Without `now` in the dep array, the closure captures the `now` at first render. Two options: (a) include `now` in `useCallback` deps (regenerates the callback every minute, fine), (b) read `roundDownToHour(now)` inside `handleDockAdd` and store it in `chooserState.defaultStart` at open time so `handleChooserPick` doesn't need `now` at all. **Decision: (b) is cleaner.** `handleDockAdd` becomes `setChooserState({ open: true, defaultStart: roundDownToHour(now) })` — symmetric with `handleSlotTap`'s `defaultStart: hourToHHMM(hour)`. `handleChooserPick`'s Block branch then always reads `chooserState.defaultStart` (no fallback needed). This aligns the two entry points and removes the `now` dep entirely.
4. **Don't leak the chooser into the M3 direct paths.** `handleAddBrickFromBlock` and `handleAddLooseBrick` MUST continue to call `openBrickSheet(...)` directly. BUILDER must not "refactor" them to route through a unified chooser path. The two direct paths preserve the parent-context (a real `parentBlockId`, the parent's `categoryId`, the explicit-loose intent) that the chooser cannot reconstruct. Regression test: assert the chooser does NOT open when the inside-block "+ Add brick" or the tray "+ Brick" pill is tapped.
5. **`<Sheet>`'s `onClose` is the single dismiss seam.** Backdrop tap, ESC, iOS swipe-down, and the header `<X>` all fire `onClose` from M0's `<Sheet>`. The chooser wires its `onCancel` to `<Sheet>`'s `onClose` once; no need to handle each path separately.
6. **Order of state updates on pick.** Inside `handleChooserPick`, set the chooser's `open` to `false` BEFORE calling `openSheet(...)` / `openBrickSheet(...)`. React batches these in the same render tick so the user sees one transition (chooser exits, downstream sheet enters), not two simultaneous open dialogs. Test in component-integration test by asserting `<AddChooserSheet open>` flips to `false` in the same render that `<AddBlockSheet open>` flips to `true`.
7. **No new haptic on backdrop dismiss.** Cancel/dismiss is silent (no haptic). Only the two button picks fire `haptics.light()`. Matches M2/M3 sheet-cancel UX.
8. **TypeScript strict — `chooserState.defaultStart` is `string | null`.** The Block branch must handle the null fallback (post-cross-cutting-#3, the fallback is moved into `handleDockAdd` so `chooserState.defaultStart` is always non-null when the chooser is open). If BUILDER opts to keep a null branch in `handleChooserPick`, use a non-null assertion only with a defensive runtime guard (or refactor per #3).
9. **`assertNever` exhaustiveness on `choice`.** `handleChooserPick` switches on `choice: 'block' | 'brick'`. Use a `switch` with a `default: assertNever(choice)` arm so a future third option (M5+ or whatever) is a compile error until handled.
10. **Gate D (typecheck).** BUILDER must run `tsc --noEmit` before declaring red→green→commit, per the M4a/M4b BUILDER contract update.

### Test strategy

The TESTS-mode dispatch (separate, per ADR-025) will produce the actual GIVEN/WHEN/THEN IDs. This plan reserves the following layers and broad coverage targets:

- **Unit (Vitest)** — none specifically for M4d (no new pure helpers; the chooser is presentational and the wiring is integration-level).
- **Component (Vitest + Testing Library)** — `components/AddChooserSheet.test.tsx`: chooser renders two buttons with correct labels; `<X>` Cancel calls `onCancel`; clicking "Add Block" fires `onPick('block')` + `haptics.light`; clicking "Add Brick" fires `onPick('brick')` + `haptics.light`; backdrop dismiss fires `onCancel`; reduced-motion collapses animation. `app/(building)/BuildingClient.test.tsx` regression: dock-+ now opens chooser (not AddBlockSheet directly); slot-tap now opens chooser with captured hour; chooser-Block opens AddBlockSheet with correct `defaultStart`; chooser-Brick opens AddBrickSheet with `parentBlockId: null`; inside-block "+ Add brick" still bypasses the chooser; tray "+ Brick" pill still bypasses the chooser.
- **E2E (Playwright, mobile-chrome 430 px)** — `tests/e2e/m4d.spec.ts`: full empty-state path → tap dock + → chooser opens → tap "Add Brick" → AddBrickSheet opens → fill + Save → tray renders the new chip. Slot-tap path → chooser opens → tap "Add Block" → AddBlockSheet opens with `defaultStart` matching the tapped hour. Backdrop dismiss closes chooser silently. Mobile-safari deferred per ADR-010.
- **A11y (axe via Playwright)** — `tests/e2e/m4d.a11y.spec.ts`: zero violations on the open chooser. Tab order verified. `role="dialog"` + `aria-label="Add"` present.

### ADR needed

None identified. Every decision in this plan resolves under existing ADRs (ADR-031, ADR-039, ADR-027, ADR-022, ADR-025, ADR-026, ADR-041, ADR-034) or under one of the SG-m4d-0N locks above. The "M3 SG-m3-08 RESOLVED-IN-FAVOR-OF-CHOOSER" lineage is captured in spec.md and re-stated in this plan; no new ADR is needed because SG-m3-08 was a deferred-decision marker, not a previously-locked ADR. If VERIFIER finds otherwise, surface as `ADR needed: …` and Main Claude will land it as `docs(harness): …`.

---
