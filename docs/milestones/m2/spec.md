## Milestone 2 — Add Block Flow

> **Pillars:** § 0.1 (the wedge — calendars show plans, Dharma needs blocks before it can show proof), § 0.3 (visual identity — categories light the BlueprintBar; Block cards land at their `start` row), § 0.5 (interaction primitives — three ways to add; plain forms in M2 per ADR-036), § 0.9 (data model — blocks always timed; `parentBlockId` reserved for M3 bricks), § 0.14 (no factory categories, no factory blocks), ADR-006 (half-open `[start, end)` intervals), ADR-019 (`Recurrence` discriminated union), ADR-032 (user-defined categories, unlimited count), ADR-036 (plain forms in M2, voice in M10), ADR-039 (ships empty).

### Intent

Wire the first interactive verb. From the empty Building Shell that M1 ships, a user creates their first block: tap the floating `+` button (sheet at default time) **or** tap an empty timeline hour-row (sheet pre-filled with that hour). The Add Block sheet uses plain forms — Title, Start, End (optional), Recurrence, Category — saves to in-memory state, slides down, and the new block enters the timeline at its `start` row with stagger fade-in. The empty-state card disappears. The hero stays at `0%` because scoring is M3.

This milestone **locks the `Block` and `Category` schemas** for the rest of Phase 1. M3 fills blocks with bricks. M5 wires edit + delete. M8 wires persistence. M9 wires recurrence resolution (`appliesOn(rec, date)`); M2 only renders today, so all blocks created today appear today regardless of their recurrence kind.

**What this is NOT:** a brick adder (M3), a scoring engine (M3), an editor (M5), a deleter (M5), a persistence layer (M8), a recurrence resolver (M9), a voice mic (M10), an inline natural-language parser (M7). Per ADR-039, no factory categories ship — the user creates their first category inline when they categorize their first block, or skips the field entirely.

### Inputs

- The empty Building Shell from M1 — top bar, hero (`0%`), BlueprintBar, 24-hour timeline with now-line, dock with `+` (M1 left no-op; M2 wires it).
- M0 primitives — `<Sheet>` (full-screen form), `<Input>` (text + time), `<Chip>` (categories + recurrence options), `<Button>` (primary amber for Save, ghost for Cancel), `<EmptyState>` (M1 reuses).
- M0 motion tokens — `modalIn` / `modalOut` for the sheet, stagger for the new block's entrance.
- M0 haptics — `light` on chip-select; `success` on Save; `medium` on validation error.
- M1 helpers — `useNow()` (drives `+` button's default Start), `dayOfYear()` (unchanged), `timeToOffsetPx()` + `HOUR_HEIGHT_PX` (unchanged; new block cards consume these to position themselves on the grid).
- The locked `Recurrence` discriminated union per ADR-019.
- In-memory `AppState.blocks: Block[]` (M1 ships `[]`; M2 mutates) and **new** `AppState.categories: Category[]` (initial `[]` per ADR-039).

### Outputs (regions and behaviors)

| Region                     | Role in M2                                                                                                                                                                                                                                                                                       | Sync with M0 / M1                                                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Floating `+` button        | Tappable. Opens the Add Block sheet with `start` defaulted to the current hour (rounded down) and `recurrence` defaulted to `just-today`.                                                                                                                                                        | M1 left it no-op; M2 wires the `onClick`. M0 `<Button>` primary amber unchanged.                                                                        |
| Empty-slot tap target      | Tapping any empty timeline hour-row opens the Add Block sheet with `start` pre-filled to that row's hour.                                                                                                                                                                                        | New behavior. M1's Timeline grid stays the same; M2 attaches `onClick` to each empty row.                                                               |
| Add Block sheet            | Bottom-sheet built on M0 `<Sheet>`. Form: Title (required, autofocus), Start (required, time picker), End (optional, time picker), Recurrence (4 single-select `<Chip>`s), Category (`<Chip>` group of existing categories + "+ New" + "Skip"), Save (sticky bottom amber), Cancel (X top-left). | First real consumer of `<Sheet>`, `<Input>`, `<Chip>`.                                                                                                  |
| New-category inline form   | When "+ New" is tapped, the sheet expands to: Name `<Input>` + 12-color palette picker (`<Chip>` grid). "Done" returns to the block sheet with the new category selected and persisted to `AppState.categories`.                                                                                 | New surface. Category creation is a side-effect of needing one — there is no separate "Manage Categories" screen in M2.                                 |
| Block card on the timeline | After Save: card enters at the `start` row (height ∝ duration; or fixed marker if no End). Displays title, time range, and a category color dot (if categorized). Tapping is a **no-op** in M2 (M4 wires FLIP expand).                                                                           | Re-introduces the existing `components/TimelineBlock.tsx` (M1 tagged it `[obsolete: not-imported-in-M1]`). Migration tag flips to `[re-author]` for M2. |
| Day Blueprint bar          | Once a categorized block exists, the bar gains a colored segment with width ∝ block duration / day duration and color = category color. Uncategorized blocks are excluded from the bar (per SG-m2-02).                                                                                           | M1's empty-outline path stays as the zero-blocks fallback. Non-empty path is new in M2.                                                                 |
| Empty-state card           | Disappears as soon as `blocks.length > 0`. Reappears if the last block is removed (M5+ surface).                                                                                                                                                                                                 | M1's locked copy `"Tap any slot to lay your first block."` unchanged.                                                                                   |

### Locked schemas (this milestone fixes them)

```ts
// lib/types.ts — replaces M1's tagged-soft-deprecated `Category` enum

type Recurrence = // ADR-019
  | { kind: "just-today"; date: string } // ISO YYYY-MM-DD
  | { kind: "every-weekday" } // Mon–Fri
  | { kind: "every-day" }
  | {
      kind: "custom-range";
      start: string;
      end: string; // ISO YYYY-MM-DD
      weekdays: number[];
    }; // 0=Sun..6=Sat

type Block = {
  id: string; // uuid (crypto.randomUUID)
  name: string;
  start: string; // "HH:MM"
  end?: string; // "HH:MM" — half-open [start, end) per ADR-006
  recurrence: Recurrence;
  categoryId: string | null; // FK into AppState.categories; null = uncategorized
  bricks: Brick[]; // always [] in M2; M3 lands brick adding
};

type Category = {
  id: string; // uuid
  name: string; // user-typed; not unique
  color: string; // hex from the curated 12-color palette (SG-m2-01)
};
```

The four legacy CSS vars (`--cat-health` / `--cat-mind` / `--cat-career` / `--cat-passive`) are removed; a 12-color palette `--cat-1` through `--cat-12` is introduced (locked at Gate #1 — see SG-m2-01). Per § 0.14 antipattern 2, no category names ship in code.

### Edge cases

- **Empty Title** → Save disabled.
- **Start with no End** → block renders as a thin 1-minute marker on the timeline (per SG-m2-05).
- **End ≤ Start** (when End is set) → inline error, Save disabled.
- **End on the next day** (e.g., `23:30` → `00:30`) → not supported in M2; clamp End to ≤ `23:59` with inline error.
- **Times overlap an existing block** → soft inline warning ("Overlaps with [block name]"); Save still allowed.
- **Half-open boundary** `[start, end)` per ADR-006 — back-to-back blocks (`10:00`–`11:00`, `11:00`–`12:00`) do not "overlap".
- **Custom-range recurrence with zero weekdays** → inline error, Save disabled.
- **Add the first block before any category exists** → category list is empty; only "+ New" and "Skip" are visible. Saving with category=null is allowed.
- **Skip category on Save** → block stored with `categoryId: null`; BlueprintBar excludes it (SG-m2-02).
- **New category created but block then Cancelled** → category persists in `AppState.categories` (per AC #24); user can pick it next time.
- **Sheet dismissed via swipe-down (iOS Safari)** → equivalent to Cancel; silent discard (per SG-m2-06).
- **`prefers-reduced-motion: reduce`** → sheet open is instant; new-block stagger fade-in collapses to instant render.
- **Page refresh** → all state lost (no persistence until M8). Documented in the dock or status — TBD; for M2, refresh = empty Building (M1's state).
- **Very long Title** → truncated with ellipsis on the block card; full title visible only via M4's expanded view.
- **Two categories with identical Name** → allowed (case-sensitive, no de-dup).

### Acceptance criteria

**Add paths**

1. Tapping the floating `+` button opens the Add Block sheet with `start` = current hour rounded down, `recurrence` = `just-today`, `categoryId` = `null`.
2. Tapping any empty timeline hour-row opens the Add Block sheet with `start` pre-filled to that row's hour.
3. The `+` button uses the M0 `<Button>` primary amber variant; the sheet uses the M0 `<Sheet>` primitive.

**Sheet form** 4. Title is a required `<Input>` with autofocus on open. 5. Start is a required time picker, pre-filled per the trigger. 6. End is an optional time picker; clearing it returns the block to "no End" state. 7. Recurrence renders four `<Chip>`s (single-select): _Just today_ / _Every weekday_ / _Every day_ / _Custom range_. Default = _Just today_. 8. The Custom-range chip, when selected, reveals start-date / end-date inputs and a 7-day weekday picker. 9. Category renders existing `AppState.categories` as `<Chip>`s plus a "+ New" chip and a "Skip" affordance. With zero categories, only "+ New" and "Skip" are visible. 10. New-category inline form has a Name `<Input>` and a 12-color palette picker (`<Chip>` 4×3 grid). 11. Save button is `<Button>` primary amber, sticky bottom; disabled until Title is non-blank, Start is valid, and any sub-form errors are clear. 12. Cancel is an `<X>` icon top-left; tapping discards sheet state and closes. 13. Sheet dismiss via swipe-down on iOS Safari is equivalent to Cancel.

**Block creation behavior** 14. On Save: a new `Block` is appended to `AppState.blocks` with a `crypto.randomUUID()` id. 15. The sheet slides down (M0 `modalOut` motion); reduced-motion collapses to instant. 16. The new block enters the timeline at its `start` row with a stagger fade-in (M0 stagger 30 ms). 17. The block card displays title, time range (e.g., `09:00–10:00`), and a category color dot when `categoryId !== null`. 18. The Day Blueprint bar updates to include the new block's segment (categorized blocks only — SG-m2-02). 19. The empty-state card unmounts as soon as `blocks.length > 0`. 20. The hero's `0%` does not change in M2 (scoring is M3). 21. The saved block matches the locked `Block` schema (Vitest schema test).

**Validation** 22. Empty Title → Save disabled with inline message. 23. End ≤ Start (when End is set) → inline error; Save disabled. 24. End past `23:59` → inline error; Save disabled. 25. Custom-range with zero weekdays selected → inline error; Save disabled. 26. Times overlap an existing block → soft inline warning naming the block; Save still allowed.

**Categories** 27. With zero categories, Save with `categoryId: null` is allowed; block renders without a color dot. 28. New-category form persists the new `Category` to `AppState.categories` immediately on "Done", even if the block is then Cancelled. 29. Newly created categories appear as `<Chip>`s in any subsequent Add Block sheet within the session. 30. Two categories with identical Name are allowed (no de-dup).

**A11y / quality** 31. All interactive elements ≥ 44px (ADR-031). Tab order matches visual order. Sheet has `role="dialog"` with a focus trap. 32. axe-core: zero violations on the day view AND on the open sheet. 33. `tsc --noEmit`: zero new errors. 34. ESLint: zero new warnings. 35. `prefers-reduced-motion`: sheet open and new-block stagger collapse to instant. 36. Playwright: add via `+` → block appears at default Start; add via slot-tap → block appears at slot's hour; Cancel → no block added; mobile viewport 430px; no horizontal overflow when sheet is open.

### Out of scope

- Brick creation inside or outside a block — M3
- 3 brick types (tick / goal / time) — M3
- Live scoring / hero `%` updates — M3
- Block expand / FLIP animation on tap — M4
- Edit block, "Just today" / "All future" / "All events" delete prompts — M5
- Drag reorder — M6
- Cinematic polish layer — M7
- Inline natural-language Title parsing — M7 (per ADR-036)
- Persistence to localStorage — M8
- Recurrence resolution `appliesOn(rec, date)` — M9 (M2 renders only today's `blocks`)
- Castle / Kingdom / Empire navigation — M9
- Voice mic — M10
- Multi-day blocks crossing midnight — never (or much later)
- Category management (rename / delete / merge / reorder) — later milestone
- Loose Bricks tray (standalone bricks with `parentBlockId: null`) — M3 (the tray location lock per § 0.11 blocks M3 PLAN, not M2)
- NowCard surfacing the active block — M3 or M4 (component exists; M2 keeps it un-rendered)
- `programStart`-relative `dayNumber` — M8 (M1's `dayOfYear()` stays in M2)
- Lighthouse measurement from the sandbox — still pending Vercel access

### Open spec gaps (lock at Gate #1)

- **SG-m2-01 — Category color palette.** Curated set of 12 hex colors as CSS vars `--cat-1`..`--cat-12`. Recommendation: keep M0's 4 colors (emerald `#34d399`, lavender `#c4b5fd`, amber `#fbbf24`, slate `#64748b`) and add 8 more covering: rose, orange, yellow-green, teal, sky, indigo, fuchsia, neutral-warm. PLANNER picks specific hexes at PLAN dispatch unless user pre-specifies.
- **SG-m2-02 — Uncategorized block in BlueprintBar.** Recommendation: **excluded** — § 0.14 antipattern 3 ("the absence of a category is itself meaningful"). Alternative: render as a neutral gray segment.
- **SG-m2-03 — Loose Bricks tray location.** Carried from § 0.11. **Does NOT block M2** (M2 ships only blocks; standalone bricks with `parentBlockId: null` are M3). Lock before M3 PLAN.
- **SG-m2-04 — `+` button default Start.** Round current time DOWN to the nearest hour (recommended — matches Apple Calendar tap-a-slot "right now") or UP (next round hour).
- **SG-m2-05 — End = blank rendering.** Recommendation: thin 1-minute marker (height ≈ 5px) on the timeline. Alternatives: 1-hour default, or require End.
- **SG-m2-06 — Sheet swipe-down with dirty form.** Recommendation: silent discard (matches Apple Reminders); add an undo toast in M7. Alternative: confirm "Discard?".
- **SG-m2-07 — `categoryId` FK vs inline `category: { name, color }`.** Recommendation: **FK** (cleaner for renaming categories in a later milestone). Schema above reflects this; flag here for ratification.
- **SG-m2-08 — Empty timeline row tap target.** M1's Timeline renders an hour grid via CSS gradient. Each row is currently not individually tappable. M2 needs to attach a click handler per hour. Approach: 24 absolutely-positioned transparent buttons over the grid, each spanning one `HOUR_HEIGHT_PX` row. PLANNER decides exact technique; flag here so the choice is conscious.

---
