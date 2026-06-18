## Milestone 6 — Drag Reorder

> **Pillars:** § 0.5 (interaction primitives — Edit Mode is the deliberate state in which structure changes; the drag handle is the discoverable, non-buried gesture entry, consistent with M5's always-visible `×`), § 0.9 (data model — a block's position **is** its `start`/`end`; a brick's position inside a block **is** its index in `block.bricks[]` — no parallel `order` field), ADR-006 (half-open `[start, end)` block intervals), ADR-008 (edit-mode affordances are always visible, never gesture-buried), ADR-013 (one feature per BUILDER dispatch), ADR-018 (overrides are a separate keyed map, never structural mutation — relevant to SG-m6-02), ADR-031 (≥44px touch targets), ADR-045 (`history` is read-only — drag never rewrites past days); M4e's `lib/overlap.ts` half-open overlap engine; M5's `<EditModeProvider>` + the always-visible `×`; M9a's `appliesOn` resolver; the M0 design system (Framer Motion `layout` + reduced-motion).

### Intent

M6 gives the user the third revision verb: **reorder**. M5 made the day deletable; M6 makes it rearrangeable.

A user can grab a block and move it to a new time, or grab a brick and move it to a new position inside its parent block. The day's structure becomes physical — touch it, slide it, drop it where it belongs. The cinematic polish (FLIP block-expand, count-up animations) is **M7**; M6 ships the working gesture and the working data write, in Edit Mode only.

**Where the gesture lives.** Reorder is a structural mutation, so it is gated by Edit Mode — exactly like Delete. In Locked mode (the default) blocks and bricks are not draggable; every tap behaves as today. In Unlocked mode a **drag handle** (a small grab affordance — lucide `grip-vertical`) is revealed on every block card and every brick row, alongside the M5 `×`. The handle is the only drag surface; tapping the card body in Edit Mode continues to be inert (M5 SG-m5-05). The handle is always visible (ADR-008 — no long-press-to-discover; no swipe-to-reveal). See SG-m6-01 for the handle-vs-long-press fork.

**Block reorder = re-time.** A block's position on the timeline **is** its `start` (and `end`, if set). Dragging a block to a new slot writes a new `start`/`end` on that block's template. There is no parallel `order` field — that would duplicate state and drift. The M4e overlap engine (`lib/overlap.ts`) validates every drop: an attempt to drop a block onto an overlapping slot is **rejected** — the card snaps back to its original position with a medium haptic, and no state is written. A valid drop writes the new `start`/`end` and persists immediately (M8 pattern).

**Brick reorder = array shuffle.** A brick's position inside its parent block **is** its index in `block.bricks[]` (SG-m3-16 — render in insertion order). Dragging a brick to a new position inside the same block reorders the array. A brick with `hasDuration` (M4e) keeps its own `start`/`end` — those are independent of the array index, so a brick reorder never changes a brick's time window. The overlap engine is therefore not invoked for brick reorders.

**Recurrence semantics.** A block's `start`/`end` are properties of the template, not of a single day's instance. Dragging a recurring block to a new time changes the template — the block re-times for today **and every future day** the recurrence covers. Past `history` is never rewritten (ADR-045 — archived days keep the time they were logged). There is no per-day "just today" re-time in M6 (mirrors M5 SG-m5-01: a per-day override would need a new overrides namespace and is out of scope here). See SG-m6-02 for the per-day vs all-future fork.

**What this is NOT:** the cinematic polish layer — FLIP block-expand, count-up animation, stagger on first paint, "now" line glow, "Your Empire begins." card, brand-mark Easter egg, skeleton loaders, toasts (all **M7** per phase1plan § Polish Layer); editing a block's or brick's content — renaming, re-categorising, manually retiming via a sheet (a later milestone; M6 only re-positions); moving a brick **out of its parent block** into a different block, or into the loose-bricks tray, or vice-versa (cross-container brick move — see SG-m6-03; not in M6); reordering the loose-bricks tray (SG-m6-04 — out of scope, tray stays insertion-ordered); reordering archived `history` days (ADR-045 — history is immutable); a multi-select drag; a Lock to prevent reorder of a specific block.

### Inputs

- The full current app surface — top bar, hero, BlueprintBar, 24-hour timeline with `<TimelineBlock>` cards, `<LooseBricksTray>`, `<BrickChip>` / `<TimedLooseBrickCard>`, the dock.
- M5's `<EditModeProvider>` — the edit-mode React context already gates the jiggle and the `×`. M6 adds the drag handle alongside the `×` and gates `pointerdown` on the handle by `editMode === true`.
- The persisted `AppState` (`schemaVersion: 3` from M5): `{ schemaVersion, programStart, currentDate, blocks, categories, looseBricks, deletions, history }`. **M6 introduces no new persisted fields** — block `start`/`end` and `block.bricks[]` ordering already exist.
- `lib/persist.ts` — `loadState` / `saveState` / `usePersistedState`. Every drag commit writes through the existing M8 pipeline; no migrator needed.
- `lib/overlap.ts` — M4e's half-open overlap engine validates every block drop.
- M9a's `appliesOn(recurrence, date)` resolver — unchanged; a re-timed recurring block still resolves correctly under its existing `recurrence`.
- Framer Motion (already in the stack) — `Reorder.Group` / `Reorder.Item` for the brick list inside a block; the block-card drag uses Framer's `motion.div` with `drag="y"` constrained to the timeline column (or whichever solution the PLANNER picks — see SG-m6-05).
- M0 — motion tokens (drag-lift scale `1.02`, shadow elevation, the spring drop), haptics (light on lift, light on a successful drop, **medium on a rejected drop**), `lucide-react` `grip-vertical` icon, ≥44px touch targets (ADR-031).

### Locked schema additions

**None.** M6 introduces no new fields on `AppState`, no new persisted keys, no `schemaVersion` bump. Block ordering is implicit in `start`; brick ordering is implicit in `block.bricks[]` array index. The reducer gains two new action arms:

```ts
// lib/data.ts — extend the Action union
type Action =
  | /* existing actions */
  | {
      type: 'REORDER_BLOCK';
      blockId: string;
      newStart: string;            // "HH:MM"
      newEnd: string | null;       // "HH:MM" | null — preserved-or-shifted; see PLANNER
    }
  | {
      type: 'REORDER_BRICK_IN_BLOCK';
      blockId: string;
      fromIndex: number;
      toIndex: number;
    };
```

`REORDER_BLOCK` calls into `lib/overlap.ts` (or the equivalent guard) before writing; if the proposed `newStart`/`newEnd` overlaps any other block applicable on `currentDate`, the action is a **no-op** (returns `state` unchanged) — the UI layer is responsible for the snap-back animation + the rejected-drop haptic. `REORDER_BRICK_IN_BLOCK` is a pure array splice; bounds-checked. The reducer remains immutable; `assertNever` exhaustiveness preserved.

### Outputs

| Region                                                    | Role in M6                                                                                                                                                                                                                                                                                    |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<TimelineBlock>` / block cards                           | In Edit Mode: a drag handle (`grip-vertical`) is revealed alongside the M5 `×`. The handle is ≥44px tappable. The whole card is **not** draggable — only the handle initiates a drag (so a stray scroll on the card body still scrolls the timeline).                                         |
| `<BrickChip>` / `<TimedLooseBrickCard>` (in-block bricks) | In Edit Mode: a drag handle is revealed on every brick row inside a block. The handle is the drag origin; the chip body remains inert per M5 SG-m5-05.                                                                                                                                        |
| `<LooseBricksTray>`                                       | **No handles in M6** (SG-m6-04 — tray reorder is out of scope). Loose bricks render in insertion order, as today.                                                                                                                                                                             |
| Drag-in-flight                                            | The dragged card / chip lifts (scale `1.02`, shadow elevation; M0 tokens), follows the pointer, and siblings smoothly flow around it (Framer `layout`). Reduced-motion → no lift, no flow — the card snaps directly to the drop position on commit.                                           |
| Drop                                                      | A valid drop writes the new `start`/`end` (block) or array position (brick), persists, and the card settles with a spring (instant under reduced motion). A rejected drop (block-on-block overlap) snaps back to the original position with a **medium haptic**.                              |
| Haptics                                                   | Light on lift; light on successful drop; **medium on rejected drop**. No haptic on a no-op (drop on the same slot).                                                                                                                                                                           |
| Day render                                                | After a block re-time, the block renders at the new slot; BlueprintBar and HeroRing recompute from the post-reorder state. After a brick reorder, the brick list inside the block re-renders in the new array order; scoring is array-position-independent so day/block scores are unchanged. |
| A11y                                                      | The drag handle is screen-reader-labeled ("Reorder block <name>" / "Reorder brick <name>"). A successful reorder emits an `aria-live` polite announcement ("Block <name> moved to <HH:MM>" / "Brick <name> moved"). See SG-m6-06 for the keyboard-alternative fork.                           |

### Edge cases

- **Locked mode** — no drag handles, no drag possible; every block/brick tap behaves exactly as today.
- **Reduced motion** — no lift, no in-flight flow; the dragged card snaps to the drop slot on commit, siblings reposition instantly. The reorder still works; only the motion is suppressed.
- **Block dropped on an overlapping slot** — the drop is **rejected**: no state write, the card snaps back to its origin, medium haptic fires. An accessible announcement ("Cannot move — overlaps <other block name>") is polite.
- **Block dragged across the now-line into a past slot** — allowed (re-timing is a structural change; the now-line is a visual cue, not a constraint). The block re-times; today's scoring may immediately mark it "now/past" if appropriate. No special-case.
- **Block dropped onto its own current slot** — no-op; no haptic, no animation beyond the spring settle, no state write.
- **Block with `end: null`** (open-ended) — drag moves the `start`; PLANNER specifies whether `end` is preserved as `null` or recomputed. Recommendation: preserve `null` — the user picked open-ended deliberately.
- **Brick reorder inside a block** — pure array shuffle; `block.bricks[]` is mutated; scoring is the average across bricks, which is order-independent, so day/block `Pct` are unchanged. Confirm no UI flicker on the unchanged HeroRing.
- **Brick with `hasDuration`** (M4e) inside a block — array reorder does **not** change the brick's `start`/`end`. The overlap engine is not invoked. Confirm a timed-brick reorder writes only the array shuffle.
- **Drag cancel mid-flight** — pointer-up outside any valid drop zone, `Escape` keypress, or browser tab loses focus → snap back to origin, no state write, no haptic.
- **Toggling Edit Mode mid-drag** — the drag must complete (snap-back or commit) before the mode flips; the handle disappears after Edit Mode exits.
- **A delete modal open during a drag** — drag is disabled while the modal is up (M5's confirmation modal is authoritative; M6 cannot fire on top of it).
- **Dragging a recurring block** — re-times the template; AC #6 + SG-m6-02 specify the all-future semantics; past `history` is untouched (ADR-045).
- **Drag handle 44px clearance** — on the smallest brick row (a `<BrickChip>`), the handle, the chip body, and the `×` must all clear ≥44px tap targets without visual overlap. PLANNER lays out; VERIFIER measures.
- **`saveState` quota-exceeded during a drag commit** — surfaces the existing M8 error toast; the in-memory state has already updated, so the UI shows the new position; the user is told persistence failed. (No new error path for M6.)

### Acceptance criteria

**Gesture & affordance**

1. In Edit Mode, every block card shows a drag handle (`grip-vertical` icon, ≥44px tap target) alongside the M5 `×`; in Locked mode no handle is shown and no drag is possible.
2. In Edit Mode, every brick row inside a block shows a drag handle (≥44px) alongside the M5 `×`; loose-tray bricks show no handle (out of scope per SG-m6-04).
3. The handle is the only drag origin — tapping or pressing the card/chip **body** in Edit Mode is inert (no drag, no log — M5 SG-m5-05 preserved).

**Block reorder**

4. Grabbing a block's handle lifts the card (scale `1.02`, shadow elevation; suppressed under `prefers-reduced-motion`), and siblings smoothly flow around it as the pointer moves.
5. Releasing on a **valid** slot writes the block's new `start` (and `end`, with the open-ended `null` case preserved) via a `REORDER_BLOCK` action; the new times persist immediately (M8); the card settles with a spring (instant under reduced motion).
6. Releasing on a slot that would **overlap** any other block applicable on `currentDate` (M4e overlap engine) is rejected: no state write, the card snaps back to its origin, a medium haptic fires, and a polite a11y announcement explains the rejection.
7. Re-timing a **recurring** block changes the template — today and every future day the recurrence covers use the new `start`/`end`; past `history` is unchanged (ADR-045).

**Brick reorder**

8. Grabbing a brick's handle and releasing on another position inside the **same** block writes a `REORDER_BRICK_IN_BLOCK` action (an array splice on `block.bricks[]`); the new order persists; the day's and block's scores are unchanged (scoring is order-independent).
9. A brick with `hasDuration` reordered inside its block keeps its own `start`/`end` — the overlap engine is not invoked, and the brick's time-window badge is unchanged.

**Persistence & schema**

10. M6 introduces no new persisted fields and no `schemaVersion` bump; the existing `dharma:v3` payload is sufficient. Every reorder survives a reload.

**Quality & regression**

11. The drag honors reduced motion (no lift / no in-flight flow / instant snap on commit); haptics fire on lift, successful drop, and rejected drop only.
12. Mobile viewport (430px) renders both handles (block + brick) without overflow and without colliding with the M5 `×`; axe a11y clean; the handles are screen-reader-labeled and a successful reorder emits a polite `aria-live` announcement.
13. No regression to M1–M9e behavior; quality gates clean (`tsc` clean, ESLint 0 errors, full Vitest green, `test:tz` green); E2E (deferred-to-preview) covers a block re-time, an overlap-rejected drop, a brick array reorder, and an Edit-Mode/Locked toggle around a drag.

### Open spec gaps (resolve at VERIFY)

- **SG-m6-01 — Drag origin: handle vs long-press.** § 0.5's Edit-Mode bullet lists a "drag handle (M6)"; phase1plan.md's M6 outline says "long-press block → lift." The Intent above adopts the visible handle (ADR-008 consistency — every Edit-Mode affordance is discoverable, never gesture-buried; matches M5 always-visible `×`). Recommendation: ship the visible drag handle; do not gate drag on long-press. PLANNER confirms; VERIFIER checks the handle is the only drag origin.
- **SG-m6-02 — Re-timing a recurring block: per-day override vs all-future.** Dragging a recurring block could either (a) write a per-day "just today" time-override into a new `timeOverrides` map (mirrors M5 `deletions`; would need a new persisted field and a `schemaVersion` bump) or (b) re-time the template (all-future semantics; no schema change). M5 deferred per-day brick overrides for the same reason (SG-m5-01). Recommendation: **(b) re-time the template**, all-future semantics, no schema bump — keeps M6 within phase1plan scope. A per-day re-time, if wanted, is a separate spec entry. PLANNER confirms; VERIFIER checks no new persisted field is introduced.
- **SG-m6-03 — Cross-container brick move.** Dragging a brick **out of its parent block** into a different block, into the loose-tray, or out of the loose-tray into a block is a `parentBlockId` rewrite, not an array shuffle. The Intent above scopes M6 to **within-container** reorder only. Recommendation: defer cross-container brick moves to a follow-up milestone (call it M6b if/when prioritized); ship within-container only. PLANNER confirms; VERIFIER checks the drag is constrained to its container.
- **SG-m6-04 — Loose-bricks-tray reorder.** phase1plan's M6 outline does not mention the tray; the Outputs table excludes tray handles. Recommendation: tray stays insertion-ordered; no handles in the tray in M6. PLANNER confirms; VERIFIER checks no `Reorder.Group` is wired around `<LooseBricksTray>`.
- **SG-m6-05 — Library / mechanism for the drag.** Framer Motion's `Reorder.Group` is the natural fit for the brick list inside a block (vertical array reorder). For block re-timing the gesture is 1D against the 24-hour timeline column — a `motion.div` with `drag="y"` plus a per-slot snap calculator is one option; a `Reorder.Group` over the visible-today blocks (with snap-to-slot derived from drop position) is another. Recommendation: PLANNER picks; VERIFIER checks both block and brick reorders share consistent motion tokens (lift, spring, settle).
- **SG-m6-06 — Keyboard / screen-reader alternative.** A pointer drag is inaccessible to keyboard-only and screen-reader users. Two options: (a) ship a keyboard alternative in M6 — `Tab` to the handle, `Space` to "lift", arrow-keys to move, `Space` to commit, `Escape` to cancel; (b) defer the keyboard alternative to a follow-up (axe will still pass — handles are labeled and reachable; the gesture itself just won't be operable). Recommendation: defer (b); document as a known a11y debt in `status.md` open loops; the visible `aria-live` announcement on commit + the handle's accessible name are M6's a11y floor. PLANNER confirms; VERIFIER checks the accessible name + announcement land.
- **SG-m6-07 — Snap granularity for block re-time.** A pointer drag yields continuous Y; block `start` is `HH:MM` (typically 30-minute slot grid). Should the snap be 30-min, 15-min, 1-min? Recommendation: **30-min slots** (matches M1's slot grid and M2's slot-tap targets); a finer-grained re-time belongs in a future "edit times via sheet" milestone. PLANNER confirms; VERIFIER checks every drop lands on an `HH:00` or `HH:30` boundary.
- **SG-m6-08 — Empty timeline drop, drop above midnight / below 24:00.** A block could be dragged to a slot before its earliest sibling or above the visible timeline top / below its bottom. Recommendation: clamp to `00:00`-`24:00`; dropping outside the timeline column is rejected with the snap-back + medium haptic. PLANNER specifies the clamp.
