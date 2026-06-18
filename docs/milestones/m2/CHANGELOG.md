# Changelog — M2

## [unreleased]

### Added (M2)

- **M2 — Add Block Flow:** first interactive verb. Add via floating `+` button (defaults Start to current hour rounded down) or via empty-slot tap (24 absolutely-positioned transparent buttons behind block cards). Single `<Sheet>` instance with `view: 'block' | 'newCategory'` local state; M0 `<Sheet>` primitive untouched. Inline category creation — first category created as side-effect of categorizing first block; new category auto-selected; persists on "Done" even if block is then Cancelled. Validation: empty Title disables Save; End ≤ Start inline error; End past 23:59 inline error; Custom-range zero-weekdays inline error; overlap soft-warning (Save still allowed). Day Blueprint Bar non-empty path: aggregates by `categoryId`, segment width proportional to sum-of-durations / day-total; uncategorized blocks excluded. No-end blocks render as ~5px markers (`HOUR_HEIGHT_PX / 12`). Closes 50 test IDs (`U-m2-001..011`, `C-m2-001..020`, `E-m2-001..013`, `A-m2-001..006`); 33 testable SPEC ACs (3 deferred-by-design). Playwright + axe deferred to Vercel preview (sandbox `next dev` socket bind failure — M1 pattern).
- `components/AddBlockSheet.tsx`, `RecurrenceChips.tsx`, `CategoryPicker.tsx`, `NewCategoryForm.tsx`, `SlotTapTargets.tsx` — new.
- `lib/blockValidation.ts` — pure validators (5 helpers): `validateTitle`, `validateEndTime`, `validateEndOverflow`, `validateRecurrenceWeekdays`, `validateOverlap`.
- `lib/uuid.ts` — `crypto.randomUUID()` mockable seam.
- 12-color palette `--cat-1`..`--cat-12` in `app/globals.css` (replaces legacy `--cat-health/mind/career/passive` per ADR-032). `--cat-4` lightened from `#64748b` → `#94a3b8` for WCAG AA contrast on `#07090f`.
- Locked Phase-1 schemas in `lib/types.ts`: `Block` (`id`, `name`, `start`, `end?`, `recurrence`, `categoryId | null`, `bricks: []`), `Category` (`id`, `name`, `color`), `AppState` (`blocks`, `categories`), `Recurrence` union per ADR-019 (stored, not yet resolved — `appliesOn` lands in M9), `Action` discriminated union with `assertNever` exhaustiveness guard.

### Changed (M2)

- `app/(building)/BuildingClient.tsx` — owns `useReducer` over `(blocks, categories)`; wires sheet open/close + `ADD_BLOCK` / `ADD_CATEGORY` callbacks.
- `components/Timeline.tsx` — renders `<TimelineBlock>` cards over the M1 24-hour grid; layers `<SlotTapTargets>` underneath; preserves now-line + auto-scroll.
- `components/TimelineBlock.tsx` — re-authored (was obsolete in M1); height = `timeToOffsetPx(end) - timeToOffsetPx(start)` when `end` set, else `HOUR_HEIGHT_PX / 12` (~5px no-end marker); category dot via `data-testid="category-dot"`.
- `components/BlueprintBar.tsx` — non-empty path aggregates by `categoryId`; uncategorized blocks excluded.
- `components/BottomBar.tsx` — `+` button now wires `onClick` to open AddBlockSheet (M1 left it no-op).
- `lib/data.ts` — `defaultState()` adds `categories: []`; reducer with `ADD_BLOCK` + `ADD_CATEGORY` and `assertNever` exhaustiveness.
- `lib/dharma.ts:duration()` — widened to handle `end?: string` (returns 0 for no-end blocks; pre-M2 `U-bld-014` tests still pass).
