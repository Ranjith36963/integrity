# Changelog — M6

## [unreleased]

### Added (M6) — Drag Reorder

- **M6 — Drag Reorder:** makes the day revisable without the keyboard. In Edit Mode (Unlocked),
  every block card gains a visible **drag handle** (≥ 44 px, aria-label "Drag to reorder",
  `data-testid="drag-handle"` — ADR-008, no swipe-only, ADR-031). Dragging a block re-times it
  along the 24-hour timeline: drop position snaps to the nearest 30-minute slot (`lib/snapToSlot.ts`);
  if the snapped position would overlap an existing block, the move is rejected — the block
  animates back with a **medium haptic** snap-back and an **aria-live** announcement
  (`"Move blocked — overlaps [block name]"`) for screen-reader users. Drop + snap dispatches
  `REORDER_BLOCK` (new reducer arm). Bricks inside a block can be reordered within their parent
  via Framer Motion `Reorder.Group` — drop dispatches `REORDER_BRICK_IN_BLOCK` (new reducer arm).
  `prefers-reduced-motion: reduce` skips the Framer layout animations while preserving drag
  affordance and haptics. No schema bump; no new persisted field; `state.history` untouched
  (ADR-045). 1249/1249 Vitest across 79 files (+75 tests / +4 files vs M5's 1174/75);
  `test:tz` 11/11. 0 lint errors, 22 warnings (all carryover + 1 intentional inline
  `eslint-disable-next-line react-hooks/exhaustive-deps` at `DraggableTimelineBlock.tsx:102`
  — flagged for future audit, see Notes below).
  Closes U-m6-001..014, C-m6-001..011, SG-m6-01..05 (partial).
  E-m6-001..004 + A-m6-001..002 deferred-to-preview (Playwright E2E + axe; same sandbox
  `next dev` socket-bind pattern as all prior milestones).
  **ADR-006** (half-open intervals) · **ADR-008** (visible affordance) · **ADR-018** (no new
  overrides namespace) · **ADR-031** (≥ 44px touch target) · **ADR-045** (`history` immutable).
- `lib/snapToSlot.ts` — new. Pure `snapToSlot(minutesSinceMidnight): number` helper. Rounds
  the raw drop offset (minutes from midnight) to the nearest 30-minute boundary. Tests: U-m6-001..005.
- `REORDER_BLOCK` reducer action — re-times a block: validates new start (overlap check via
  `intervalsOverlap`), rejects if any overlap found, otherwise applies the snapped start/end.
  Tests: U-m6-006..010.
- `REORDER_BRICK_IN_BLOCK` reducer action — reorders `block.bricks[]` array by accepting a
  new ordered `brickId[]` array; immutable update. Tests: U-m6-011..014.
- `components/DraggableTimelineBlock.tsx` — new. Framer Motion `motion.div`-wrapped block card
  with drag handle affordance; wires `onDragEnd` (dispatches `REORDER_BLOCK`) and `onDragStart`
  (suppresses `<DeleteConfirmModal>` triggers). Receives `modalOpen` prop from `Timeline` to
  suppress drag while the delete modal is open. Tests: C-m6-001..011.
- `tests/e2e/m6.spec.ts` — 4 Playwright e2e specs (deferred to preview). IDs: E-m6-001..004.
- `tests/e2e/m6.a11y.spec.ts` — 2 Playwright axe-core a11y specs (deferred to preview).
  IDs: A-m6-001..002.

### Changed (M6)

- `components/Timeline.tsx` — now threads `modalOpen` (= `pendingDelete !== null`, owned by
  `BuildingClient`) down to `<DraggableTimelineBlock>` so M5's delete-confirmation modal
  suppresses drag while it is open. Tests: C-m6-010.

### Notes (M6)

- **One inline `eslint-disable-next-line react-hooks/exhaustive-deps`** at
  `DraggableTimelineBlock.tsx:102`. The `dropSeq` effect intentionally tracks only `dropSeq`
  (the incrementing sequence number), not `block.start`/`block.end`, because the effect reads
  the snapped position from a ref captured at drag-end time (not from React state). Flagged for
  future audit. Non-blocking.
- **Deferred-to-preview:** E-m6-001..004 (Playwright E2E) and A-m6-001..002 (axe a11y) are
  real `test()` blocks but execute against the Vercel preview only — vacuous-pass in-sandbox
  (same pattern as all prior milestones). Verify drag-reorder behavior and axe scores on the
  Vercel preview at Gate #2.
- **Decisions honored:** ADR-006 (half-open intervals in overlap check), ADR-008 (always-visible
  drag handle affordance, no swipe-only), ADR-018 (no new `localStorage` overrides namespace),
  ADR-031 (≥ 44px touch target on drag handle), ADR-045 (`state.history` immutable — past days
  unaffected by reorder). No `schemaVersion` bump.
- **SG-m6-02 (per-day "just today" time override) considered + deferred.** Kept all-future
  template semantics; reordering a recurring block updates the template for all future
  occurrences. A "just today" time-override path (parallel to M5's `deletions` map) was
  explicitly out of scope for M6.
- **SG-m6-03 (cross-container brick move) and SG-m6-04 (loose-tray reorder) are out of scope.**
  Follow-up if prioritized by user.
- **Proposed ADR-048** (per EVALUATOR): "Post-dispatch readback for optimistic UI rejection
  uses an incrementing sequence + `useEffect` (not microtask) so React's batched re-render
  flushes before detection." Proposal logged here; draft ADR to be written in a follow-up
  session.

---
