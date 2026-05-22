## Milestone 5 — Edit Mode + Delete — Plan

### Context

Today the day is append-only — a user can add a block or a brick (M2/M3) and log against it (M4a/M4f), but can never remove one or correct a mistake. M5 closes that gap with two verbs: a moded **Edit Mode** (a top-bar pencil toggle that flips a Locked ↔ Unlocked surface) and a recurrence-aware **Delete**. Locked is exactly today's behavior — view + log only, no structural change reachable, so a stray tap can never destroy data. Unlocked, blocks jiggle (iOS-style) and an always-visible `×` appears on every block and every brick (ADR-008). Deletion is never a single tap — every `×` opens a confirmation modal; for a recurring block the modal offers **Just today** (a keyed per-day override) vs **All recurrences** (a template removal). This is the milestone the locked `deletions` map (`§ 0.9`, ADR-018) was reserved for.

### Feature grouping

m5 is **one feature group** (slug `m5`), one BUILDER dispatch. `tests.md` IDs use the `m5` slug (`U-m5-*`, `C-m5-*`, `E-m5-*`, `A-m5-*`). See § Test-ID prefix scheme.

### File structure

| File                                                                           | Change                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/types.ts`                                                                 | MODIFY — **additive only.** `AppState` gains `deletions: Record<string, true>`. `Action` union gains three members: `DELETE_BLOCK_TODAY`, `DELETE_BLOCK_ALL`, `DELETE_BRICK`. `Block`/`Brick`/`Recurrence`/`Category`/`ArchivedDay` byte-identical. (`schemaVersion` stays a `PersistedState`-only key — it is **not** added to `AppState`; see § Data model.)                                               |
| `lib/data.ts`                                                                  | MODIFY — `defaultState()` gains `deletions: {}`. `reducer` gains three new `case` arms (`DELETE_BLOCK_TODAY` / `DELETE_BLOCK_ALL` / `DELETE_BRICK`) — all immutable; `assertNever` exhaustiveness preserved (adding the union members forces these arms to compile).                                                                                                                                         |
| `lib/persist.ts`                                                               | MODIFY — `SCHEMA_VERSION` `2 → 3`; `PersistedState.schemaVersion` type `2 → 3`; `PersistedState` gains `deletions`. `defaultPersisted()` gains `deletions: {}` and `schemaVersion: 3`. `migrate()` gains a **v2 → v3** arm (additive, lossless — `case 2` becomes the v2→v3 step; a new `case 3` is the v3 load+coerce arm); `saveState()` writes `deletions`. Unknown/future version still → `null`.        |
| `lib/usePersistedState.ts`                                                     | MODIFY — `projectToAppState` carries `deletions` through; `toPersisted` lifts `deletions` back and stamps `schemaVersion: 3`.                                                                                                                                                                                                                                                                                |
| `lib/currentDayBlocks.ts`                                                      | NEW — pure helper `currentDayBlocks(state: AppState): Block[]`: returns `state.blocks` minus any block keyed in `state.deletions` for `state.currentDate`. The single site that joins `deletions` into the day render (AC #11). Does **not** reimplement `appliesOn` — see § Day-render wiring.                                                                                                              |
| `components/EditModeProvider.tsx`                                              | MODIFY — **optional, minimal.** Context already exposes `{ editMode, toggle }`. M5 may add a `setEditMode(false)` or keep `toggle` as-is. No persistence wiring — Edit Mode is **never** written to `localStorage` (SG-m5-04). The provider's `useState(false)` already guarantees a Locked cold boot.                                                                                                       |
| `components/TopBar.tsx`                                                        | MODIFY — the pencil `<button>` already exists with `aria-pressed={editMode}` + `onClick={toggle}`. M5 adds: a `light` haptic on toggle; a Locked/Unlocked visual treatment (accent tint when Unlocked); `aria-label` made state-discernible (`"Edit mode, off"` / `"Edit mode, on"`); confirm ≥44px (already `h-11 w-11`).                                                                                   |
| `components/TimelineBlock.tsx`                                                 | MODIFY — consumes `useEditMode()`. Unlocked: a continuous jiggle (M0 motion; suppressed under reduced motion); an always-visible `×` delete button (ADR-008, ≥44px hit area). In Edit Mode the card's tap-to-expand is suppressed (SG-m5-05 — the `×` owns the gesture). New `onRequestDeleteBlock?(blockId)` prop fired by the `×`.                                                                         |
| `components/BrickChip.tsx`                                                     | MODIFY — consumes `useEditMode()`. Unlocked: an always-visible `×` on every chip (tick + units, ≥44px hit area); the chip's log gesture (`onTickToggle` / `onUnitsOpenSheet`) is suppressed — a brick tap is inert except on the `×` (SG-m5-05, no log+delete double-fire). New `onRequestDeleteBrick?(brickId)` prop.                                                                                       |
| `components/TimedLooseBrickCard.tsx`                                           | MODIFY — same `×` + suppressed-log treatment as `BrickChip` for timed loose bricks (it renders a brick on the timeline). New `onRequestDeleteBrick?(brickId)` prop.                                                                                                                                                                                                                                          |
| `components/LooseBricksTray.tsx`                                               | MODIFY — threads `onRequestDeleteBrick` down to each tray `<BrickChip>`. No tray-level `×` (the per-chip `×` covers it).                                                                                                                                                                                                                                                                                     |
| `components/Timeline.tsx`                                                      | MODIFY — threads `onRequestDeleteBlock` / `onRequestDeleteBrick` down to `TimelineBlock` / `TimedLooseBrickCard`. (Edit Mode is read from context inside those children, not prop-drilled.)                                                                                                                                                                                                                  |
| `components/DeleteConfirmModal.tsx`                                            | NEW — `"use client"`. The recurrence-aware confirmation modal. Wraps the existing `components/ui/Modal` primitive (bottom-sheet, spring, ESC-close, focus, portal). Renders **Just today + All recurrences + Cancel** for a recurring block, or a single **Delete + Cancel** for a non-recurring block and for a brick. Uses `components/ui/Button`. Fires a destructive-confirm haptic on a confirm choice. |
| `components/BuildingClient.tsx`                                                | MODIFY — owns the delete-confirmation flow: a `pendingDelete` state, the three dispatch handlers (`DELETE_BLOCK_TODAY` / `DELETE_BLOCK_ALL` / `DELETE_BRICK`), mounts `<DeleteConfirmModal>`, and feeds `Timeline` from `currentDayBlocks(state)` instead of `state.blocks` directly (AC #11). Recurring-vs-non-recurring is computed from the target block's `recurrence`.                                  |
| `lib/data.test.ts`                                                             | (test file — TESTS/BUILDER deliverable) reducer-arm unit tests for the three new actions.                                                                                                                                                                                                                                                                                                                    |
| `lib/persist.test.ts`                                                          | (test file) v2→v3 migrator + `SCHEMA_VERSION === 3` + round-trip tests.                                                                                                                                                                                                                                                                                                                                      |
| `lib/currentDayBlocks.test.ts`                                                 | (test file) `currentDayBlocks` unit tests.                                                                                                                                                                                                                                                                                                                                                                   |
| `components/DeleteConfirmModal.test.tsx`                                       | (test file) modal-variant + button-wiring component tests.                                                                                                                                                                                                                                                                                                                                                   |
| `components/TopBar.test.tsx` / `TimelineBlock.test.tsx` / `BrickChip.test.tsx` | (test files — EXIST) gain Edit-Mode affordance + `×` cases (additive — see § Regression surface).                                                                                                                                                                                                                                                                                                            |
| `app/(building)/BuildingClient.*.test.tsx`                                     | (test files — EXIST) gain delete-flow cases (additive).                                                                                                                                                                                                                                                                                                                                                      |
| `e2e/` (Playwright spec)                                                       | (test file) deferred-to-preview E2E — toggle Edit Mode, a "just today" block delete, an "all recurrences" block delete, a brick delete (AC #14).                                                                                                                                                                                                                                                             |

**Not modified — confirmed:** `lib/dharma.ts` (`dayPct`/`blockPct`/`brickPct` consumed unchanged — scores recompute automatically from the post-delete `state`); `lib/appliesOn.ts` (consumed read-only by `currentDayBlocks` — no recurrence-logic change); `lib/history.ts` (`rollover`/`dayScore`/`seedFreshDay` byte-identical — "All recurrences" delete touches **only** `state.blocks`, never `state.history`, see § "All recurrences" + history); `lib/overlap.ts` (`selectTimelineItems`/`selectTrayBricks` consumed unchanged — `currentDayBlocks` filters `blocks` _before_ the selectors, or `BuildingClient` projects a filtered `state`); `app/(building)/AppShell.tsx` (no view-state change — Edit Mode lives in `EditModeProvider` inside `BuildingClient`); `components/ui/Modal.tsx` / `components/ui/Button.tsx` (reused as-is — `DeleteConfirmModal` composes them); `lib/scoring.ts` / `BlueprintBar` / `HeroRing` / `Hero` (recompute from `state` — no edit); `app/globals.css` (M5 adds one jiggle keyframe — see § Design tokens — but no token rename); `lib/motion.ts` / `lib/haptics.ts` (existing tokens reused; no new export needed — `haptics.medium` serves the destructive-confirm pulse, see § Design tokens).

### Data model

**Schema bumps `v2 → v3` (SG-m5-02, ADR-044/ADR-045 reversibility clause).** ADR-044 originally reserved v2 for M5's `deletions`; M9b shipped first and took v2 (ADR-045 explicitly notes "A future Edit-Mode milestone … would be v3"). M5 honors that: it claims `schemaVersion: 3` with an **additive, lossless v2 → v3 migrator**.

**Important — `schemaVersion` lives on `PersistedState` only, NOT on `AppState`.** The spec's "Locked schema additions" block writes `// schemaVersion 2 → 3` as a comment inside an `interface AppState` sketch, but the live codebase (post-M8, SG-m8-04) deliberately keeps `schemaVersion` a **persist-boundary-only** key — `projectToAppState` strips it, `toPersisted` re-stamps it. M5 keeps that separation: `deletions` is added to **both** `AppState` and `PersistedState` (it is real runtime data that must round-trip); `schemaVersion` is bumped on `PersistedState`/`SCHEMA_VERSION` only. The reducer never reads `schemaVersion`.

```ts
// lib/types.ts — AppState gains one field (additive)
export type AppState = {
  // ...all v2 fields unchanged: blocks, categories, looseBricks, programStart, currentDate, history...
  deletions: Record<string, true>; // M5 — key: `${currentDate}:${blockId}` — per-day "just today" overrides
};

// lib/types.ts — Action union gains three members (additive)
export type Action =
  | /* ADD_BLOCK | ADD_CATEGORY | ADD_BRICK | LOG_TICK_BRICK | SET_UNITS_DONE */
  | { type: "DELETE_BLOCK_TODAY"; blockId: string } // sets deletions[`${currentDate}:${blockId}`] = true
  | { type: "DELETE_BLOCK_ALL"; blockId: string }   // removes the template from state.blocks
  | { type: "DELETE_BRICK"; brickId: string };      // removes the brick from its block.bricks[] or looseBricks[]

// lib/persist.ts
export const SCHEMA_VERSION = 3 as const;
export type PersistedState = {
  schemaVersion: 3;
  // ...programStart, currentDate, history, blocks, categories, looseBricks unchanged...
  deletions: Record<string, true>; // M5
};
```

**`deletions` key format — exact:** `` `${state.currentDate}:${blockId}` `` — the in-progress day's ISO date, a colon, the block id. Identical grammar to ADR-018's `${date}:${blockId}`. The reducer's `DELETE_BLOCK_TODAY` arm builds the key from `state.currentDate` (never the wall clock — ADR-020/ADR-046 discipline). A brick-level "just today" override is **not** added (SG-m5-01 — there is no second `deletions` namespace for bricks).

### Reducer arms (`lib/data.ts`)

All three arms are pure and immutable; `assertNever(action)` in `default` stays — adding the union members without these arms is a TS compile error (the existing exhaustiveness guarantee, ADR-043 pattern).

- **`DELETE_BLOCK_TODAY`** — `const key = \`${state.currentDate}:${action.blockId}\`;`→`return { ...state, deletions: { ...state.deletions, [key]: true } }`. `state.blocks`is **untouched** (the template survives — AC #6). Idempotent: re-deleting the same block "just today" re-sets the same`true`(harmless). The key is set unconditionally even if`blockId`is not currently in`state.blocks` — harmless, the key only suppresses a render (spec edge case "a 'just today' key targeting a block id not applicable today").
- **`DELETE_BLOCK_ALL`** — `return { ...state, blocks: state.blocks.filter((b) => b.id !== action.blockId) }`. Removes the template from `state.blocks` only. **`state.history` is NOT touched** (ADR-045 — `history` is read-only; archived days keep the block as logged — AC #7). `state.deletions` is **not** pruned — any stale `deletions` key for the now-removed block is left in place (harmless; SG-m5-06). No-op if `blockId` not found (the `filter` returns an equivalent array).
- **`DELETE_BRICK`** — removes the brick with `action.brickId` from whichever container holds it: `looseBricks` (the loose tray) **or** the `bricks[]` of its parent block. Mirrors the M4f `SET_UNITS_DONE` array-identity pattern: map `state.blocks` filtering each `block.bricks`, and filter `state.looseBricks`; return the original `state` reference if nothing changed (no-op on a missing id — spec edge case). Brick delete is **structural** — for a brick inside a recurring block this edits the template and so affects every future occurrence (SG-m5-01, accepted). `state.history` untouched (ADR-045).

### v2 → v3 migrator (`lib/persist.ts`)

`migrate(raw)` is the single version-logic site. M5 extends the `switch (obj.schemaVersion)` chain so the v1 → v2 → v3 ladder is unbroken:

- **`case 1`** — v1 → v2 (unchanged from ADR-045) **then falls through / is re-targeted to v3 shape**: the cleanest implementation is for `case 1` and `case 2` to both produce the v3 shape. Practically: `case 1` does its existing v1→v2 coercion **and** adds `deletions: {}` + `schemaVersion: 3`; `case 2` adds `deletions: {}` + `schemaVersion: 3` to an otherwise byte-identical v2 payload (the v1 day data is never lost — ADR-045's stance carries forward).
- **`case 3`** — NEW — the v3 load+coerce arm: reads `deletions` defensively (`obj.deletions` must be a non-null non-array object; otherwise coerce to `{}`), all other fields coerced exactly as the old `case 2` did. Returns the v3 `PersistedState`.
- **`default`** — unknown / future `schemaVersion` (≥ 4, non-numeric, absent) → `null` → `loadState` falls back to `defaultPersisted()`. Unchanged robustness stance (ADR-044/ADR-045).

The migrator is **additive and lossless**: a v1 or v2 payload migrates to v3 with `deletions: {}` and zero day-data loss (AC #10). VERIFIER checks additivity.

### Day-render wiring (`lib/currentDayBlocks.ts` + `BuildingClient`)

**The real-code gap:** `BuildingClient` currently feeds `Timeline` from `selectTimelineItems(state)` / `selectTrayBricks(state)` (`lib/overlap.ts`), which read `state.blocks` **directly** — they consult neither `appliesOn` nor `deletions`. M5's AC #11 requires today's render to drop any block keyed in `deletions` for `currentDate`.

**Mechanism (minimal, additive):**

- A new pure helper `currentDayBlocks(state: AppState): Block[]` in `lib/currentDayBlocks.ts`: `return state.blocks.filter((b) => !state.deletions[\`${state.currentDate}:${b.id}\`])`. It is the single join site between `deletions` and the day render.
- `BuildingClient` computes `const visibleBlocks = currentDayBlocks(state)` and projects a filtered state into the selectors — i.e. it passes `selectTimelineItems`/`selectTrayBricks` a `state` whose `blocks` is `visibleBlocks` (a shallow `{ ...state, blocks: visibleBlocks }`), or filters the `selectTimelineItems` block output by membership. Either is acceptable; the plan baseline is the shallow-projection so the selectors stay byte-identical.
- **`appliesOn` scope (honest note for VERIFIER):** today's Day view does **not currently** filter `state.blocks` through `appliesOn` either — M9a shipped `appliesOn` as the resolver but the live Day render still shows every block (M9a's status note: "M9a closes that gap" for the _resolver_, not the Day-view _wiring_). M5's spec AC #11 says resolution "consults `deletions` **alongside `appliesOn`**." Two readings:
  - **(a)** M5 only adds the `deletions` filter; `appliesOn` wiring is whatever M9 left it. — _Plan baseline._ M5 is "Edit Mode + Delete," not "recurrence resolution"; bolting an `appliesOn` filter onto the Day view is a scope expansion the spec's Intent/Outputs do not ask for (the Outputs table names only `deletions`). `currentDayBlocks` filters by `deletions` only.
  - **(b)** M5 also wires `appliesOn` into `currentDayBlocks`. — Rejected as scope creep; flagged to VERIFIER below.
  - **Resolution adopted: (a).** `currentDayBlocks` consults `deletions` only. If the team wants the Day view to honor `appliesOn`, that is a separate spec entry. Flagged under § Open questions for VERIFIER and § ADR needed as a new-ADR candidate.
- Rollover (`lib/history.ts`, M9b) is **unaffected**: `rollover` archives/seeds days and never reads `deletions`; a "just today" key keyed to yesterday simply becomes a stale, unread key after midnight (SG-m5-06). A recurring block deleted "just today" reappears tomorrow because tomorrow's `currentDate` is a fresh key namespace (spec edge case "'Just today' then a day rollover"). VERIFIER confirms `rollover` is byte-identical.

### "All recurrences" + `history` (ADR-045)

`DELETE_BLOCK_ALL` removes the block template **only** from `state.blocks`. It **never** writes to `state.history` — archived `ArchivedDay` snapshots are immutable per ADR-045 (`history` is read-only). Consequence the BUILDER and VERIFIER must accept as correct: after an "All recurrences" delete the block is gone from today and every future day, **but** any `PastDayDetail` for a day the block was logged still shows it (AC #7, spec edge case "'All recurrences' on a block that appears in `history`"). The Year/Month/Week period scores over past days are unchanged — they read `history`, which was not rewritten. This is the spec's explicit intent ("history is not retroactively rewritten").

### Confirmation modal (`components/DeleteConfirmModal.tsx`)

A NEW `"use client"` component that **composes the existing `components/ui/Modal`** (bottom-sheet, spring-in, ESC-close, `role="dialog"` `aria-modal`, backdrop click-to-close, portal) — it does not reinvent a modal. Buttons are the existing `components/ui/Button` (`primary` / `secondary` / `ghost` variants; `min-h-[44px]` per ADR-031).

- **Props:** `{ open: boolean; target: { kind: "block"; recurring: boolean } | { kind: "brick" } | null; onConfirmJustToday(): void; onConfirmAll(): void; onConfirmDelete(): void; onCancel(): void }`. `BuildingClient` decides which `onConfirm*` callbacks are live per `target`.
- **Variants (driven by `target`):**
  - **Recurring block** (`target.kind === "block" && target.recurring`) — title `"Delete this block?"`; three actions: **Just today** (`secondary`) → `onConfirmJustToday` → `DELETE_BLOCK_TODAY`; **All recurrences** (`primary`, destructive accent) → `onConfirmAll` → `DELETE_BLOCK_ALL`; **Cancel** (`ghost`) → `onCancel`.
  - **Non-recurring block** (`target.kind === "block" && !target.recurring`) — title `"Delete this block?"`; a single **Delete** (`primary`, destructive) → `onConfirmDelete` (BuildingClient routes it to `DELETE_BLOCK_ALL` — a single-day block has no future occurrences, so "remove the template" _is_ the delete; spec edge case) + **Cancel**.
  - **Brick** (`target.kind === "brick"`) — title `"Delete this brick?"`; a single **Delete** (`primary`, destructive) → `onConfirmDelete` → `DELETE_BRICK` + **Cancel**.
- **Recurring vs non-recurring** is derived from the target block's `recurrence.kind`: `recurrence.kind === "just-today"` → non-recurring (one-shot); `every-weekday` / `every-day` / `custom-range` → recurring. `BuildingClient` computes `recurring = block.recurrence.kind !== "just-today"` when opening the modal. (A `custom-range` is recurring even if its range is one day — the modal still offers the two-way choice; harmless, "Just today" and "All recurrences" converge in that degenerate case.)
- **Haptic:** a destructive-confirm haptic fires on any confirm choice (`haptics.medium` — the firmest non-celebratory pulse in `lib/haptics.ts`; no new haptic export). Cancel fires no haptic.
- **Modal-open + Edit-Mode-toggle interaction** (spec edge case): the modal is authoritative — toggling the pencil while the modal is open does not dismiss it; the modal resolves (Cancel or a confirm) first. `BuildingClient` keeps `pendingDelete` independent of `editMode`; closing Edit Mode does not clear `pendingDelete`.
- **A11y:** inherits `Modal`'s `role="dialog"` `aria-modal="true"`; the modal carries an `aria-label`/title; all buttons are keyboard-operable (real `<button>` via `ui/Button`) and ≥44px; focus moves into the modal on open; ESC = Cancel. axe-clean at 430px, no overflow (AC #13).

### Components

All modified/new components are `"use client"`.

**`<TopBar>` (MODIFY — pencil toggle becomes the Edit-Mode control)**

- The pencil `<button>` already calls `toggle()` from `useEditMode()` with `aria-pressed={editMode}`. M5 adds: (1) a `light` haptic in the click handler (`haptics.light()` before `toggle()`); (2) a Locked/Unlocked **visual** state — Unlocked tints the button with `var(--accent)` (border/icon), Locked is the current neutral `var(--card)` + `var(--ink-dim)` icon; (3) `aria-label` made state-discernible — `"Edit mode, off"` when Locked, `"Edit mode, on"` when Unlocked (keeping `aria-pressed` too). ≥44px is already satisfied (`h-11 w-11`). No other TopBar change.

**`<TimelineBlock>` (MODIFY — jiggle + block `×`)**

- Consumes `useEditMode()`. When `editMode === true` **and not** `prefersReducedMotion`: the card gets a continuous low-amplitude jiggle (the M0 `dharma-jiggle` keyframe — see § Design tokens; a small rotate/translate oscillation, ~0.18° / ~0.4px, infinite). Under reduced motion the jiggle is omitted entirely (the `×` and delete still work — spec edge case).
- An always-visible `×` delete `<button>` (ADR-008 — no swipe-only) renders in the card's top-right corner **only when `editMode === true`**, ≥44px hit area (a small visible glyph in a 44px target), `lucide-react`'s `X` icon, `aria-label={\`Delete block ${block.name}\`}`. `onClick`calls`e.stopPropagation()`then`onRequestDeleteBlock?.(block.id)`.
- **Tap routing in Edit Mode (SG-m5-05):** when `editMode === true`, `handleCardClick` (tap-to-expand) is a **no-op** — the card does not expand/collapse; only the `×` is interactive. When `editMode === false`, behavior is byte-identical to M4 (expand/collapse, log). This mirrors `<SlotTapTargets>` returning `null` in edit mode.
- New optional prop `onRequestDeleteBlock?(blockId: string)`.

**`<BrickChip>` (MODIFY — brick `×` + suppressed log)**

- Consumes `useEditMode()`. When `editMode === true`: an always-visible `×` `<button>` (ADR-008) at the chip's trailing edge, ≥44px hit area, `aria-label={\`Delete brick ${brick.name}\`}`, `onClick`→`e.stopPropagation()`→`onRequestDeleteBrick?.(brick.id)`.
- **Log gesture suppressed in Edit Mode (SG-m5-05 — no double-fire):** when `editMode === true`, the chip's main button does **not** call `onTickToggle` / `onUnitsOpenSheet` and fires no `light` haptic — a brick tap is inert except on the `×`. The chip-fill visual still reflects the brick's current score (read-only). When `editMode === false`, behavior is byte-identical to M4f.
- New optional prop `onRequestDeleteBrick?(brickId: string)`. Applies to both the tick and units chip branches.

**`<TimedLooseBrickCard>` (MODIFY)** — the timeline-rendered loose brick gets the same `×` + suppressed-log Edit-Mode treatment as `<BrickChip>`; new `onRequestDeleteBrick?` prop.

**`<DeleteConfirmModal>` (NEW)** — see § Confirmation modal above.

**`<BuildingClient>` (MODIFY — owns the delete flow)**

- New state: `const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)` where `PendingDelete` is `{ kind: "block"; blockId: string; recurring: boolean } | { kind: "brick"; brickId: string }`.
- Handlers: `handleRequestDeleteBlock(blockId)` looks up the block, computes `recurring = block.recurrence.kind !== "just-today"`, sets `pendingDelete`. `handleRequestDeleteBrick(brickId)` sets `pendingDelete`. The modal's confirm callbacks dispatch `DELETE_BLOCK_TODAY` / `DELETE_BLOCK_ALL` / `DELETE_BRICK` then clear `pendingDelete`; Cancel clears `pendingDelete` only.
- Feeds `Timeline` from `currentDayBlocks(state)` instead of `state.blocks` directly (see § Day-render wiring); threads `onRequestDeleteBlock` / `onRequestDeleteBrick` into `Timeline` and `LooseBricksTray`.
- Mounts `<DeleteConfirmModal open={pendingDelete !== null} target={…} … />`.
- Scores (`dayPct(state)` for the Hero, `BlueprintBar` from `state.blocks`/`currentDayBlocks`, `blockPct`/`scaffold-fill`) recompute automatically on the next render from the post-delete `state` — no extra wiring (AC #12). `useCrossUpEffect` already only fires on an _upward_ crossing, so a delete that lowers `dayPct` triggers no celebration.

### Removal animation + score recompute

- The deleted block/brick **shrinks + fades** on exit; siblings reflow. Implementation: the deleted element is wrapped in Framer Motion `AnimatePresence` with an `exit` variant (`opacity: 0`, `scale: 0.9` / height collapse). `TimelineBlock` already sits inside an `AnimatePresence` and keys on `block.id`; removing the block from the rendered list triggers the exit. `BrickChip`s inside a block and tray chips key on `brick.id` similarly.
- Under `prefersReducedMotion` the exit is **instant** (no shrink/fade — `transition: { duration: 0 }`), consistent with M0 reduced-motion discipline. Delete still works (spec edge case).
- Sibling reflow on the absolutely-positioned timeline: deleting a block does not re-time siblings (no auto-shift — re-timing is M6's drag concern); the removed card simply disappears and the timeline keeps its hour grid. Bricks inside a block and tray chips reflow via normal flex layout.
- **Score recompute (AC #12):** `dayPct` / `blockPct` / `BlueprintBar` / `HeroRing` are all pure derivations of `state` — they recompute on the post-delete render with zero extra code. Deleting the day's last block/brick returns the Day view to the M1 locked empty-state and `dayPct` reads `0` with no crash (spec edge case — `dayPct` already guards an empty `state`).

### Dependencies

**None.** No new `package.json` entry. `lucide-react` (installed) supplies the `X` (`×`) and `Pencil` icons. `motion/react` (installed) supplies `AnimatePresence` + the jiggle/exit animation and `useReducedMotion`. `components/ui/Modal` + `components/ui/Button` (built in M0) compose the confirmation modal. Vitest + Testing Library + Playwright + `@axe-core/playwright` (all installed) cover the tests.

### Design tokens

All M0 tokens, all **defined** in `app/globals.css`. M5 adds **one** new asset: the `dharma-jiggle` keyframe (a motion token — the M0 motion table names "iOS jiggle" conceptually but no keyframe ships yet).

| Element                  | Tokens / spec                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pencil toggle — Locked   | `background: var(--card)`, icon `var(--ink-dim)`, border `white/5` (current TopBar styling, unchanged)                                                                                                                                                                                                                                                                                            |
| Pencil toggle — Unlocked | border + icon tinted `var(--accent)` (#fbbf24); ≥44px (`h-11 w-11`, ADR-031)                                                                                                                                                                                                                                                                                                                      |
| Block jiggle (Unlocked)  | NEW `@keyframes dharma-jiggle` in `app/globals.css` — low-amplitude oscillation (~`rotate(-0.18deg)`↔`rotate(0.18deg)` + ~`0.4px` translate), `~0.3s` infinite alternate, `ease-in-out`. Applied via a class/`data-` attr so the existing `@media (prefers-reduced-motion: reduce)` block collapses it (and the BUILDER also gates it on `useReducedMotion()` in JS for the M0 double-guarantee). |
| Delete `×` button        | `lucide-react` `X` glyph (~14–16px) centered in a ≥44px hit target (ADR-031); glyph `var(--ink)` on a subtle `var(--card)`/translucent backing; `aria-label` includes the block/brick name                                                                                                                                                                                                        |
| Confirmation modal       | Reuses `components/ui/Modal` (bottom-sheet, `var(--motion-modal-in)` spring in / `var(--motion-modal-out)` out, `var(--bg-elev)` surface, `var(--sp-16)` padding) + `components/ui/Button` variants                                                                                                                                                                                               |
| Removal shrink-fade      | `motion/react` `exit` variant — `opacity 0` + `scale 0.9` (or height collapse); duration via M0 `--motion-modal-out` grammar (~220ms ease-in); **instant under reduced motion**                                                                                                                                                                                                                   |
| Haptics                  | `haptics.light()` on the pencil toggle (M0 "edit mode" tap); `haptics.medium()` on a destructive confirm (firmest non-celebratory pulse — no new haptic export). Cancel: no haptic.                                                                                                                                                                                                               |
| Touch targets            | Pencil, every `×`, and every modal button ≥44px (ADR-031)                                                                                                                                                                                                                                                                                                                                         |

**No `var(--surface-2)`:** `TimelineBlock` and `BrickChip` already reference the undefined `var(--surface-2)` (a tracked pre-existing latent bug — see status.md Open loops). M5 **must not introduce or propagate** any new `--surface-2` reference; the new `×` button and `DeleteConfirmModal` use only **defined** tokens (`--bg`, `--bg-elev`, `--card`, `--card-edge`, `--ink`, `--ink-dim`, `--accent`). M5 does not fix the existing `--surface-2` references (out of scope — a separate `chore`). VERIFIER checks no new `--surface-2`.

### Edge cases

| Spec edge case                                             | Planned code path                                                                                                                                                                                                                |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Locked mode** — no affordances                           | `editMode === false` (the cold-boot default) → no `×` rendered, no jiggle, tap-to-expand + log behave exactly as M4. A delete is unreachable (AC #2).                                                                            |
| **Reduced motion**                                         | `useReducedMotion()` true → jiggle omitted, removal exit `duration: 0` (instant). The mode still toggles, the `×` still appears, delete still works (AC #3, #12).                                                                |
| **"Just today" on a non-recurring block**                  | `recurrence.kind === "just-today"` → modal offers a single **Delete** → routed to `DELETE_BLOCK_ALL` (removing the one-shot template _is_ the delete). No two-way choice (AC #8).                                                |
| **"All recurrences" on a block in `history`**              | `DELETE_BLOCK_ALL` filters `state.blocks` only; `state.history` untouched (ADR-045) → the block still appears in any `PastDayDetail` for a day it was logged (AC #7).                                                            |
| **"Just today" then a day rollover**                       | `deletions` is keyed by `currentDate`; after `rollover` the new `currentDate` is a fresh key namespace → a recurring block deleted "just today" reappears tomorrow. The stale yesterday key is left in place (SG-m5-06).         |
| **Deleting the block a brick lives in**                    | `DELETE_BLOCK_ALL` removes the block and its nested `bricks[]` together — no orphan brick (the bricks live inside `block.bricks`).                                                                                               |
| **Deleting every block and brick**                         | The Day view returns to the M1 locked empty-state; `dayPct(state)` reads `0` with no crash (existing empty-state guard).                                                                                                         |
| **Toggling Edit Mode with the modal open**                 | `pendingDelete` is independent of `editMode`; the modal stays mounted and authoritative — it resolves (Cancel or confirm) first. Closing Edit Mode does not clear `pendingDelete`.                                               |
| **Delete during a log/score animation**                    | The removal supersedes — the deleted element exits; scores recompute from the post-delete `state` on the next render. `useCrossUpEffect` fires only on an _upward_ crossing, so a score-lowering delete triggers no celebration. |
| **A "just today" key for a block id not applicable today** | Harmless — `DELETE_BLOCK_TODAY` sets the key unconditionally; `currentDayBlocks` only ever _suppresses a render_ by that key, so a key with no matching block is a no-op. No crash.                                              |
| **`custom-range` with a one-day range**                    | Treated as recurring (`recurrence.kind !== "just-today"`) → the two-way modal; "Just today" and "All recurrences" converge harmlessly in that degenerate case.                                                                   |

### Accessibility

- **Pencil toggle:** `<button>` with `aria-pressed={editMode}` **and** a state-discernible `aria-label` (`"Edit mode, on/off"`) — state conveyed by more than color (AC #1). ≥44px.
- **Delete `×`:** every `×` is a real `<button>` — focusable, Enter/Space activate — with an `aria-label` naming its target (`"Delete block <name>"` / `"Delete brick <name>"`), ≥44px hit area (ADR-031). No swipe-only path (ADR-008).
- **Confirmation modal:** inherits `components/ui/Modal`'s `role="dialog"` `aria-modal="true"` + ESC-close; carries a title/`aria-label`; all action buttons are keyboard-operable `ui/Button`s ≥44px; focus enters the modal on open. ESC = Cancel (no destructive default).
- **430px (AC #13):** Edit Mode adds only a corner `×` per card and the bottom-sheet modal — no new horizontal content; no overflow at 430px. The modal's three buttons stack within the `max-w-[430px]` sheet.
- **Contrast / axe (AC #13):** the `×` glyph `var(--ink)` and the Unlocked accent tint `var(--accent)` are AA at the M0 set; the modal reuses M0-audited tokens. axe-clean — VERIFIER/EVALUATOR confirm on the preview.
- **Reduced motion:** jiggle + shrink-fade collapse to instant; no a11y regression — the mode and the `×` are non-motion affordances.

### Commit strategy

m5 is **one feature group, one BUILDER dispatch.** Standard TDD inner loop (Red → Green → Refactor → Commit). **Per-test-group commit batching is sanctioned** — the BUILDER may group red+green commits per logical area: one pair for the `lib/types.ts` + `lib/data.ts` reducer arms, one for the `lib/persist.ts` v2→v3 migrator + `usePersistedState` round-trip, one for `lib/currentDayBlocks.ts`, one for the `TopBar` Edit-Mode toggle, one for the `TimelineBlock`/`BrickChip`/`TimedLooseBrickCard` affordances (jiggle + `×` + suppressed log), one for `<DeleteConfirmModal>`, one for the `BuildingClient` delete-flow wiring — rather than one commit pair per individual ID. Red commits: `test(m5): …`; green/refactor commits: `feat(m5): …` or `fix(m5): …`. **Commit-label accuracy:** each batch commit message must name exactly the area(s) its diff touches (the M9d mislabel must not recur). No phase exit until every `m5` ID in `tests.md` is green.

### Out of scope

- **Drag-to-reorder / drag handles** — wholly M6 (SG-m5-03). M5 reveals **only** the jiggle + `×`; **no drag handle ships** in M5. The M5/M6 boundary is confirmed.
- **Per-day brick suppression** — there is no second `deletions` namespace for bricks (SG-m5-01). Brick delete is structural — for a brick in a recurring block it edits the template (affects every future occurrence). A per-day brick override, if ever wanted, is a separate spec entry.
- **Editing block/brick content** — renaming, re-timing, re-categorising are a later milestone; M5 only **deletes**.
- **Editing or deleting archived `history` days** — `history` is read-only (ADR-045). M5 never rewrites a past `ArchivedDay`.
- **An undo stack** — the confirmation modal is the safety net; undo is out of scope.
- **Bulk / multi-select delete; a "clear all data" settings screen.**
- **Pruning stale `deletions` keys** — a "just today" key for a past date is left in place (harmless, negligible size); a future cleanup milestone may prune (SG-m5-06). **No pruning in M5.**
- **Wiring `appliesOn` into the Day view** — `currentDayBlocks` consults `deletions` only; M5 does not change how/whether the Day view honors `appliesOn` (see § Day-render wiring resolution (a) and § Open questions for VERIFIER).
- **Swipe-to-delete** — ADR-008: the `×` is the only delete affordance; no swipe.
- **Fixing the pre-existing `var(--surface-2)` references** — a tracked separate `chore` (status.md Open loops).

### Test-ID prefix scheme

m5 uses **four stable prefixes**, grouped by the single feature slug `m5`, for the `mode: TESTS` dispatch and VERIFIER:

- **`U-m5-NNN`** — Unit (Vitest): the three reducer arms, the v2→v3 migrator + `SCHEMA_VERSION === 3` + round-trip, `currentDayBlocks`, `defaultState`/`defaultPersisted` `deletions` defaults.
- **`C-m5-NNN`** — Component (Vitest + Testing Library): the `TopBar` toggle, `TimelineBlock`/`BrickChip`/`TimedLooseBrickCard` Edit-Mode affordances (jiggle gating, `×` presence, suppressed log), `<DeleteConfirmModal>` variants, the `BuildingClient` delete flow.
- **`E-m5-NNN`** — E2E (Playwright, deferred-to-preview): toggle Edit Mode, "just today" block delete, "all recurrences" block delete, brick delete (AC #14).
- **`A-m5-NNN`** — Accessibility (axe via Playwright): Edit Mode + the confirmation modal axe-clean, keyboard-operable pencil/`×`/modal buttons, 430px no-overflow (AC #13).

ID numbering continues from the running totals the orchestrator supplies in the `mode: TESTS` dispatch prompt. IDs are unique and stable so VERIFIER can map AC → test ID.

### Regression surface

Edit Mode changing `TimelineBlock`/`BrickChip` behavior **creates a small regression surface — flagged here for VERIFIER as sanctioned-for-amendment**:

- **`components/TopBar.test.tsx`** — any existing assertion on the pencil button's `aria-label` (currently the literal `"Edit"`) is made stale by the state-discernible `"Edit mode, on/off"` label (AC #1). The TESTS/BUILDER dispatch amends it. Additive: new toggle/haptic/visual-state cases.
- **`components/TimelineBlock.test.tsx` / `BrickChip.test.tsx`** — M4-era tests assert tap-to-expand and tap-to-log fire **unconditionally**. Those tests run with `editMode === false` (the default `EditModeProvider` value), so they remain green **unchanged** — the M5 suppression only triggers under `editMode === true`. New Edit-Mode cases (jiggle, `×`, suppressed log) are an M5 TESTS deliverable, **not** an amendment. VERIFIER confirms no M4 expand/log test is broken (it should not be — suppression is `editMode`-gated).
- **`lib/persist.test.ts`** — the two `SCHEMA_VERSION is the number 2` assertions are made stale by the `2 → 3` bump (AC #10) and **must be amended** to `=== 3`. Any test asserting a v2 payload is the _terminal_ migration is amended for the new v3 terminus. This is sanctioned, expected M5 collateral — exactly as M9b amended persist tests for the v1→v2 bump.
- **`lib/data.test.ts` / `lib/usePersistedState.test.tsx`** — adding `deletions` to `defaultState()`/`projectToAppState`/`toPersisted` is additive; any test deep-equaling the _whole_ `defaultState()`/`PersistedState` object must be amended to include `deletions: {}`. Sanctioned collateral.
- **`app/(building)/BuildingClient.*.test.tsx`** — feeding `Timeline` from `currentDayBlocks(state)` is byte-identical when `state.deletions` is empty (the default) → existing BuildingClient tests pass unchanged. New delete-flow cases are additive.
- **No other M1–M9e test** asserts the absence of `deletions`, the Action union's size, or `schemaVersion === 2` outside `persist.test.ts`.

VERIFIER: please ratify the `TopBar` `aria-label` and `persist.test.ts` `SCHEMA_VERSION`/`defaultState` amendments as expected M5 collateral.

### Open questions for VERIFIER

Five of six SG items are **resolved in-plan exactly per the spec's recommendation**; one is resolved with a noted scope clarification:

- **SG-m5-01 — RESOLVED → brick delete is structural; no per-day brick override.** Confirmed per the spec recommendation. A brick inside a recurring block edits the template (affects future occurrences). No second `deletions` namespace. A per-day brick delete, if wanted, is a separate spec entry.
- **SG-m5-02 — RESOLVED → `schemaVersion: 3` with an additive, lossless v2→v3 migrator** in `lib/persist.ts`. Confirmed per recommendation. **Plan clarification (not a deviation):** the spec's "Locked schema additions" sketch places the `schemaVersion` comment inside `interface AppState`; the live codebase keeps `schemaVersion` a `PersistedState`-only key (SG-m8-04) — M5 honors that separation. `deletions` goes on both `AppState` and `PersistedState`; `schemaVersion` is bumped on `PersistedState`/`SCHEMA_VERSION` only. VERIFIER ratifies this as faithful to the spec's intent (the spec's prose elsewhere consistently treats `deletions` as the schema addition and `schemaVersion: 3` as the persisted-shape version).
- **SG-m5-03 — RESOLVED → M5 ships the jiggle + `×` only; no drag handle.** Confirmed per recommendation. Drag handle + reorder are wholly M6.
- **SG-m5-04 — RESOLVED → Edit Mode always boots Locked; the mode flag is never persisted.** Confirmed per recommendation. `EditModeProvider`'s `useState(false)` guarantees a Locked cold boot; nothing about `editMode` is written to `localStorage`. VERIFIER checks Edit Mode is not in `PersistedState`/`saveState`.
- **SG-m5-05 — RESOLVED → in Edit Mode a brick/block tap is inert except on the `×`.** Confirmed per recommendation. `TimelineBlock`'s tap-to-expand and `BrickChip`'s tap-to-log are both no-ops when `editMode === true` — only the `×` is interactive, mirroring `<SlotTapTargets>` going `null`. No log+delete double-fire. VERIFIER checks the exact gesture routing.
- **SG-m5-06 — RESOLVED → stale `deletions` keys are left in place; no pruning in M5.** Confirmed per recommendation.

**One scope clarification for VERIFIER to ratify (the only non-verbatim resolution):** AC #11 / the Outputs table say today-blocks resolution "consults `deletions` **alongside `appliesOn`**." The plan's `currentDayBlocks` helper filters by **`deletions` only** — because the live Day view does **not currently** filter `state.blocks` through `appliesOn` (M9a shipped the _resolver_ but the Day-view _wiring_ was never added; M9's status confirms). Adding an `appliesOn` filter to the Day view would be a scope expansion M5's Intent ("Edit Mode + Delete") does not ask for. **Plan resolution: `currentDayBlocks` consults `deletions` only**; honoring `appliesOn` in the Day view is a separate spec entry. VERIFIER: please ratify that M5 wiring `deletions` (and not `appliesOn`) into the Day render satisfies AC #11's intent given the pre-existing Day-view state — or, if VERIFIER reads AC #11 as _requiring_ the `appliesOn` filter, flag it back to PLANNER. See § ADR needed.

### ADR needed

**One new-ADR candidate — surfaced for Main Claude (PLANNER does not write the ADR).** The plan resolves the AC #11 "`alongside appliesOn`" wording by having M5's `currentDayBlocks` consult **`deletions` only**, deferring any Day-view `appliesOn` filter to a separate spec entry. This is a non-obvious scope boundary (the live Day view has never honored `appliesOn` despite M9a shipping the resolver) and would benefit from a recorded decision — **candidate: "M5's `currentDayBlocks` resolves `deletions` only; wiring `appliesOn` into the Day-view render is deferred to a dedicated spec entry."** If Main Claude/VERIFIER prefers M5 to also wire `appliesOn`, that reverses this plan resolution and must come back to PLANNER.

Otherwise no new ADR is required: ADR-008 (always-visible `×`, no swipe) governs the delete affordance; ADR-018 (`deletions` keyed `${date}:${blockId}`) governs the override map; ADR-044/ADR-045 (`schemaVersion` + migrator discipline; `history` read-only) govern the v2→v3 bump and the "All recurrences" / `history` boundary; ADR-031 (44px) governs touch targets; ADR-020 (no clock constants) governs the reducer building the `deletions` key from `state.currentDate`; ADR-043 (`assertNever` exhaustiveness) governs the three new reducer arms; the M0 design ADRs lock tokens/fonts/motion. M5 introduces no other genuinely non-obvious decision — the jiggle keyframe, the confirmation-modal composition, and the recurrence-aware two-way choice are all spec-mandated implementations within the existing ADR set.
