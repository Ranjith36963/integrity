# Changelog — M5

## [unreleased]

### Added (M5) — Edit Mode + Delete

- **M5 — Edit Mode + Delete:** makes the day revisable. A top-bar **pencil toggle** flips a
  moded Edit Mode: Locked (default — view + log only, identical to pre-M5) ↔ Unlocked (blocks
  jiggle iOS-style, an always-visible `×` delete affordance appears on every block and brick —
  ADR-008, no swipe-only). Edit Mode is not persisted — always boots Locked. Tapping a block's `×`
  opens `<DeleteConfirmModal>` (never one-tap delete): a recurring block offers **Just today**
  (writes a `deletions[${currentDate}:${blockId}]` override key — template untouched, block hidden
  today only, back tomorrow) or **All recurrences** (removes the template from `state.blocks`;
  past `history` is never rewritten — ADR-045); a non-recurring block and any brick get a single
  **Delete**. New `lib/currentDayBlocks.ts` — a pure helper that filters the day's blocks by
  the `deletions` map (`appliesOn` Day-view wiring deferred per ADR-047). Persisted schema bumps
  **v2 → v3** (`AppState`/`PersistedState` gain `deletions: Record<string,true>`; additive lossless
  v2→v3 migrator). A11y: Edit-Mode chip body stays in the accessibility tree (drop `aria-hidden`
  from brick label). 1174/1174 Vitest across 75 files (was 1078/72); `test:tz` 11/11.
  0 lint errors, 20 warnings; `tsc --noEmit` clean.
  Closes U-m5-001..014, C-m5-001..020, A-m5-001..003, E-m5-001..004
  (a11y + E2E deferred-to-preview).
- `components/DeleteConfirmModal.tsx` — new. Recurrence-aware delete confirmation modal.
  Recurring block: "Just today" (writes `deletions` override) vs "All recurrences" (removes
  template). Non-recurring block and brick: single Delete button. Tests: C-m5-001..020.
- `lib/currentDayBlocks.ts` — new. Pure `currentDayBlocks(state, todayISO)` helper: filters the
  day's applicable blocks by the `deletions` map. `appliesOn` Day-view wiring deferred per
  ADR-047. Tests: U-m5-001..014.
- Top-bar pencil Edit-Mode toggle chip. Flips `editMode: 'locked' | 'unlocked'` in local UI
  state (not persisted). Tests: C-m5-001..004.
- `deletions: Record<string,true>` field on `AppState` and `PersistedState`. Three new reducer
  actions: `DELETE_BLOCK_TODAY` / `DELETE_BLOCK_ALL` / `DELETE_BRICK`. Tests: U-m5-005..014.
- `tests/e2e/m5.spec.ts` — 4 Playwright e2e specs (deferred to preview). IDs: E-m5-001..004.
- `tests/e2e/m5.a11y.spec.ts` — 3 Playwright axe-core a11y specs (deferred to preview).
  IDs: A-m5-001..003.

### Changed (M5)

- Persisted schema **v2 → v3**: additive lossless migrator in `lib/persist.ts` adds an empty
  `deletions: {}` map to any loaded v2 payload. No data loss; v1→v2→v3 chain intact.
- `BrickChip.tsx`, `TimedLooseBrickCard.tsx`, `TimelineBlock.tsx` — gain the always-visible `×`
  delete affordance in Edit Mode (Unlocked) and tap-suppression of the primary action while
  Unlocked. Tests: C-m5-005..016.
- `BrickChip.tsx` Edit-Mode chip body: `aria-hidden` removed — chip label remains in the
  accessibility tree in both Locked and Unlocked states. Tests: A-m5-001..003.
