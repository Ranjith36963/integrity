## Milestone 5 — Edit Mode + Delete

> **Pillars:** § 0.5 (interaction primitives — editing is a deliberate, moded gesture, never accidental), § 0.9 (data model — `deletions` is a keyed override map, not a structural mutation), ADR-008 (the `×` delete affordance is always visible in edit mode — no swipe-only deletes), ADR-018 (`deletions` is a separate keyed map: `${date}:${blockId}`), ADR-044 / ADR-045 (`schemaVersion` + migrator discipline; `history` is read-only); M2's `<EditModeProvider>` / `<SlotTapTargets>`; M9a's `appliesOn` resolver; the M0 design system.

### Intent

M5 gives the user the two verbs that make a day **revisable**: a moded **Edit Mode**, and **Delete**.

Today the day is append-only — a user can add a block or a brick but can never take one away or correct a mistake. M5 closes that gap.

**Edit Mode** is a deliberate, moded state, toggled by a pencil control in the top bar. Locked (the default) the app is view-and-log only — exactly as it behaves today; no structural change is possible, so a stray tap can never delete anything. Unlocked, the structural surface signals it is editable: blocks gently jiggle (iOS-style), and an always-visible `×` delete affordance appears on every block and every brick (ADR-008 — no swipe-only deletes). Tapping the pencil again settles the surface back to Locked.

**Delete** is recurrence-aware. Tapping a block's `×` opens a confirmation modal — deletion is never a single tap. For a recurring block the modal offers two outcomes:

- **Just today** — writes a single override key `deletions[${currentDate}:${blockId}] = true`. The block template is untouched; the block simply does not render on the current day; every other day — past and future — is unaffected.
- **All recurrences** — removes the block template from `state.blocks`. The block disappears from today and every future day. Past `history` is **not** rewritten (ADR-045 — `history` is read-only); archived days keep the block exactly as it was logged.

The "just today" delete is a keyed override, not a structural mutation — consistent with ADR-018.

**What this is NOT:** drag-to-reorder or drag handles (M6 — M5 only reveals the jiggle + `×`); editing a block's or brick's content — renaming, re-timing, re-categorising (a later milestone; M5 only deletes); editing or deleting archived `history` days (ADR-045 — history is immutable); an undo stack (the confirmation modal is the safety net; undo is out of scope); bulk / multi-select delete; a settings screen to clear all data.

### Inputs

- The full current app surface — top bar, hero, BlueprintBar, 24-hour timeline with `<TimelineBlock>` cards, `<LooseBricksTray>`, `<BrickChip>`, the dock.
- M2's `<EditModeProvider>` — the edit-mode React context already exists, and `<SlotTapTargets>` already returns null when `editMode === true`. M5 adds the **toggle control** and the edit-mode **affordances**.
- The persisted `AppState` (`schemaVersion: 2` from M9b): `{ schemaVersion, programStart, currentDate, blocks, categories, looseBricks, history }`.
- `lib/persist.ts` — `loadState` / `saveState` / the version-migrator chain; the `usePersistedState` hook.
- M9a's `appliesOn(recurrence, date)` resolver and the today-blocks resolution that decides which block templates render on `currentDate`.
- M0 — motion tokens (the jiggle keyframe, modal transitions, the shrink-and-fade removal), haptics (`light` on the mode toggle, a destructive-confirm haptic), the modal/sheet primitive, `lucide-react` pencil + `×` icons, 44px touch targets (ADR-031).

### Locked schema additions

```ts
// schemaVersion 2 → 3
interface AppState {
  // ...all v2 fields unchanged...
  deletions: Record<string, true>;   // key: `${currentDate}:${blockId}` — per-day "just today" overrides
}

// lib/data.ts — extend the Action union
type Action =
  | /* existing actions */
  | { type: 'DELETE_BLOCK_TODAY'; blockId: string }   // sets deletions[`${currentDate}:${blockId}`]
  | { type: 'DELETE_BLOCK_ALL'; blockId: string }     // removes the template from state.blocks
  | { type: 'DELETE_BRICK'; brickId: string };        // removes the brick from its block or looseBricks
```

`loadState` gains a v2 → v3 migrator: it adds `deletions: {}` to any v2 payload with no data loss. The reducer updates immutably (existing pattern; `assertNever` exhaustiveness preserved).

### Outputs

| Region                          | Role in M5                                                                                                                                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Top bar                         | A **pencil toggle** control. Locked ↔ Unlocked. `light` haptic on each toggle. Screen-reader-labeled, ≥44px.                                                                                                  |
| `<TimelineBlock>` / block cards | In Edit Mode: a gentle continuous jiggle (M0 motion; suppressed under reduced motion). An always-visible `×` on every block.                                                                                  |
| `<BrickChip>` / brick rows      | In Edit Mode: an always-visible `×` on every brick. Brick tap-to-log is suppressed in Edit Mode (the `×` owns the gesture).                                                                                   |
| Confirmation modal              | "Delete this block?" — for a recurring block: **Just today** + **All recurrences** + Cancel. For a non-recurring (single-day) block: a single **Delete** + Cancel. For a brick: a single **Delete** + Cancel. |
| Day render                      | A block with `deletions[${currentDate}:${blockId}] === true` does not render on the current day. Today-blocks resolution consults `deletions` alongside `appliesOn`.                                          |
| Removal animation               | The deleted block/brick shrinks + fades; siblings reflow (M0 motion; instant under reduced motion).                                                                                                           |

### Edge cases

- **Locked mode** — no `×`, no jiggle; every block/brick tap behaves exactly as today (expand, log). A delete is impossible.
- **Reduced motion** — jiggle and shrink-fade collapse to instant; the mode still toggles, the `×` still appears, delete still works.
- **"Just today" on a non-recurring block** — a single-day block has no future occurrences; the modal offers one **Delete** (equivalent to removing the template) rather than the two-way choice.
- **"All recurrences" on a block that appears in `history`** — past archived days are untouched (ADR-045); the block still appears in any `PastDayDetail` for a day it was logged.
- **"Just today" then a day rollover** — `deletions` is keyed by date; tomorrow's `currentDate` is a new key namespace, so a recurring block deleted "just today" reappears tomorrow.
- **Deleting the block a brick lives in** — the brick is removed with it; no orphan brick.
- **Deleting every block and brick of the day** — the day returns to the M1 locked empty-state; `dayPct` reads with no crash.
- **Toggling Edit Mode with a confirmation modal open** — the modal stays authoritative; it resolves (Cancel or confirm) first.
- **Delete during a log/score animation** — the removal supersedes; scores recompute from the post-delete state.
- **A "just today" key targeting a block id not applicable today** — harmless; the key only ever suppresses a render, so there is no crash.

### Acceptance criteria

**Edit Mode**

1. A pencil control in the top bar toggles Edit Mode between Locked and Unlocked; the control's current state is visually and screen-reader discernible.
2. In Locked mode (the default) no edit affordance is shown and every block/brick behaves exactly as before M5 — view + log only; no delete is reachable.
3. In Unlocked mode, blocks jiggle (iOS-style; suppressed under `prefers-reduced-motion`) and an always-visible `×` appears on every block and every brick (ADR-008).
4. Toggling the pencil back settles the surface to Locked; Edit Mode always boots Locked on a fresh load (see SG-m5-04).

**Delete — block**

5. Tapping a block's `×` opens a confirmation modal; no block is ever deleted on a single tap.
6. For a recurring block the modal offers **Just today** and **All recurrences**; **Just today** writes `deletions[${currentDate}:${blockId}] = true`, leaves `state.blocks` untouched, and the block no longer renders today while still appearing tomorrow.
7. **All recurrences** removes the block template from `state.blocks`; the block is gone from today and every future day, and past `history` is not rewritten (ADR-045).
8. For a non-recurring (single-day) block the modal offers a single **Delete**; Cancel always aborts with no change.

**Delete — brick**

9. Tapping a brick's `×` opens a confirmation modal; confirming removes the brick from its containing block (or from `looseBricks`); Cancel aborts.

**Persistence & schema**

10. M5 bumps the persisted schema to `schemaVersion: 3`; `loadState` migrates a v2 payload by adding an empty `deletions` map with no data loss; every delete survives a reload.
11. Today-blocks resolution consults `deletions` — a block keyed in `deletions` for `currentDate` does not render that day, while `appliesOn` and all other days are unaffected.

**Quality & regression**

12. The removal animates (shrink + fade, siblings reflow; instant under reduced motion); the dependent scores (`dayPct`, `blockPct`, BlueprintBar, HeroRing) recompute correctly after any delete.
13. Mobile viewport (430px) renders Edit Mode and the confirmation modal without overflow; axe a11y clean; the pencil, every `×`, and the modal buttons are keyboard-operable and screen-reader-labeled.
14. No regression to M1–M9e behavior; quality gates clean (`tsc` clean, ESLint 0 errors, full Vitest green, `test:tz` green); E2E (deferred-to-preview) covers toggling Edit Mode, a "just today" block delete, an "all recurrences" block delete, and a brick delete.

### Open spec gaps (resolve at VERIFY)

- **SG-m5-01 — Brick deletion and recurrence.** A brick lives inside a block (or the loose tray); recurrence is a block-level property. AC #9 specs brick delete as a plain structural removal — for a brick inside a recurring block this edits the template and so affects every future occurrence. Recommendation: keep brick delete structural (no per-day brick override); a "just today" brick suppression would need a second `deletions` namespace and is not in phase1plan's M5 scope. PLANNER confirms; a per-day brick delete, if wanted, is a separate spec entry.
- **SG-m5-02 — `schemaVersion` number.** ADR-044 originally reserved v2 for M5's `deletions`; M9b shipped first and took v2 (decisions.md / ADR-045 note), so M5 takes **v3** with a v2→v3 migrator. Recommendation: PLANNER writes the v2→v3 migrator into the existing `lib/persist.ts` chain; VERIFIER checks it is additive and lossless.
- **SG-m5-03 — Drag handles in Edit Mode.** phase1plan's M5 sketch lists "drag handles appear" among the Unlocked affordances, but dragging itself is M6. Recommendation: M5 reveals only the jiggle + `×`; the drag handle and reorder belong wholly to M6, so M5 ships no handle. PLANNER confirms the M5/M6 boundary.
- **SG-m5-04 — Edit-Mode persistence.** Should Locked/Unlocked survive a reload, or always boot Locked? Recommendation: **always boot Locked** — Edit Mode is a transient, deliberate mode and a destructive surface should never be the state a user returns to cold; the mode flag is not written to `localStorage`. PLANNER confirms; VERIFIER checks Edit Mode is not persisted.
- **SG-m5-05 — Brick tap routing in Edit Mode.** In Unlocked mode a brick shows a `×` and its log gesture is suppressed (AC #3 + the Outputs table). Recommendation: in Edit Mode a brick tap is inert except on the `×` — mirroring `<SlotTapTargets>` going null in edit mode (M2). PLANNER specifies the exact gesture routing; VERIFIER checks there is no double-fire (log + delete).
- **SG-m5-06 — Stale `deletions` keys after rollover.** A "just today" key for a past date is never read again. Recommendation: leave stale keys in place (harmless, negligible size); a future cleanup milestone may prune them — not blocking M5. PLANNER confirms no pruning is in M5 scope.
