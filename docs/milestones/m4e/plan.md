## Milestone 4e — Brick duration + overlap engine — Plan

### Pillars consumed

§ 0.5 (interaction primitives — duration becomes a universal orthogonal axis on top of tick/goal/time), § 0.6 (spatial timeline — timed loose bricks land on hour rows alongside blocks), § 0.9 (locked Brick — schema extends additively with `hasDuration` + optional `start`/`end`/`recurrence`), § 0.10 (haptic on every flip + medium on rejected overlap-Save), § 0.14 (no factory anything — toggle defaults OFF), ADR-006 (half-open `[start, end)` overlap math), ADR-019 (`Recurrence` discriminated union — now applies to bricks too), ADR-031 (44 px tap targets), ADR-034 (SOFTENED by ADR-042: brick clause "optionally timed via toggle"; block clause unchanged), ADR-035 (loose bricks remain first-class — timed loose bricks just relocate to the timeline), ADR-039 (ships empty — no migration data), ADR-041 (single-gate Loop — VERIFIER audits this plan + tests before BUILDER starts), ADR-042 (NEW — universal duration axis; the conceptual frame for M4e), ADR-027 (commit prefixes).

### Intent

Wire the **universal duration axis** from ADR-042 into every brick. Every brick chip gains an opt-in `<Toggle>` (default OFF) inside `<AddBrickSheet>`. When OFF, the brick behaves byte-identically to M3/M4a/M4b/M4c (the orthogonal "score type" axis — tick / goal / time — is untouched). When ON, the brick reveals the same time-window contract blocks already have: required Start, required End (half-open `[start, end)`), and a Recurrence picker (`<RecurrenceChips>` — the existing 4-variant component already extracted in M2). For time bricks specifically, the new `start`/`end` is the **allocated window**; M4c's `durationMin` remains the **performance target inside that window** (untouched — two distinct numbers per ADR-042 § Consequences).

M4e also lands an **overlap engine** (new pure module `lib/overlap.ts`) that detects three pair types simultaneously — block↔block, brick↔block (when the brick has duration ON), and brick↔brick (when both have duration ON). Detection runs **live** on every field-change tick inside `<AddBlockSheet>` and `<AddBrickSheet>`. Collisions render a warning chip (`role="alert"`) and **disable Save** until resolved. Block↔block detection is retroactively added to AddBlockSheet (M2 ships with a soft `role="status"` warning only; M4e upgrades to a Save-blocking `role="alert"`).

Loose bricks with duration ON are **filtered out of `<LooseBricksTray>`** and **promoted to `<Timeline>`** at their `start` hour row, rendered with a dashed 1.5 px outline to distinguish "brick-ness" from blocks (solid outline). Nested bricks (with `parentBlockId !== null`) never promote — they stay inside their parent block card regardless of toggle state — but their chip gains a secondary line showing the `HH:MM–HH:MM` badge.

**1-line value-add over M4c:** duration becomes a universal axis (the user can schedule any brick), and Save is overlap-aware on both Add sheets. Nothing else changes.

**What this is NOT:** changing M4a/M4b/M4c score-type reducer arms (untouched); changing `durationMin` semantics for time bricks (M4c timer math preserved verbatim); editing an existing brick's `hasDuration` flag or any of its time fields (M5 Edit Mode); deleting bricks (M5); persisting the toggle state across page reloads (M8 persistence); resolving recurrence against past/future dates (M9 `appliesOn(rec, date)` resolver — M4e renders today only); promoting nested bricks to their own timeline row (never per ADR-042); auto-shifting / merge-prompting on collision (the user is the resolver per ADR-042 § Consequences); hard-constraining a nested brick's window to fit inside its parent block (never per ADR-042 — the spill is allowed; overlap engine still warns if the spill collides with anything else); a new add chooser (M4d already routes).

### File structure

| Path                                 | Tag                    | Role in M4e                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/types.ts`                       | `[extends]`            | `BrickBase` adds `hasDuration: boolean` (always present), `start?: string`, `end?: string`, `recurrence?: Recurrence`. Inline comment locks the presence invariant ("hasDuration === true IFF all three optional fields present"). `Brick` discriminated union and `Action` union are otherwise unchanged. `assertNever` exhaustiveness preserved.                                                                                                                                          |
| `lib/data.ts`                        | `[extends]`            | (a) New helper `withDurationDefaults(brick): Brick` exported for fixture migration (resolves SG-m4e-06). (b) `ADD_BRICK` arm enforces the presence invariant — rejects (returns state unchanged) if `hasDuration === true` and any of `start/end/recurrence` missing, OR `hasDuration === false` and any of the three present. (c) Other arms unchanged.                                                                                                                                    |
| `lib/overlap.ts`                     | `[new]`                | NEW pure-function module. Exports `intervalsOverlap(a, b): boolean` (half-open math per ADR-006), `findOverlaps(candidate, items, excludeId?): TimedItem[]` (returns sorted list of colliders), `TimedItem` discriminated union (`{ kind: "block"                                                                                                                                                                                                                                           | "brick"; id; name; start; end; categoryId }`), and `selectAllTimedItems(state): TimedItem[]`(the input set: all blocks with`end`+ all bricks with`hasDuration === true`). No React, no side effects, no reducer involvement. |
| `lib/dharma.ts`                      | `[survives unchanged]` | `toMin` already shipped (M1); `lib/overlap.ts` imports it. No math changes.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `lib/blockValidation.ts`             | `[partial-supersede]`  | `overlapsExistingBlock(blocks, candidate)` (M2's block-only single-collider check, returns first match) is **superseded** by `findOverlaps` for M4e UX. The old export STAYS for M4a/b/c regression safety (no consumer outside AddBlockSheet); AddBlockSheet switches to `findOverlaps`. Note added at the top of `blockValidation.ts` pointing to `lib/overlap.ts` for the new path.                                                                                                      |
| `lib/haptics.ts`                     | `[survives unchanged]` | `light` (toggle flip — M0 already exposes it; new call site in `<AddBrickSheet>`), `medium` (disabled-Save tap — M4b/M4c already use this haptic for clamp / long-press, semantics extend cleanly). No new haptic primitives.                                                                                                                                                                                                                                                               |
| `lib/reducedMotion.ts`               | `[survives unchanged]` | The toggle-reveal animation reads `prefers-reduced-motion: reduce` via this helper (or `useReducedMotion` from `motion/react` — BUILDER picks whichever is closer to existing call sites; see `<TimelineBlock>` for precedent).                                                                                                                                                                                                                                                             |
| `components/ui/Toggle.tsx`           | `[survives — verify]`  | **Already shipped as an M0 primitive** (per `components/ui/index.ts:23-24`). API: `pressed: boolean`, `onPressedChange(next): void`, `label: string`, `disabled?`, `className?`. `role="switch"`, `aria-checked={pressed}`, 44×44 tap target, focus ring, iOS-style track + thumb. **M4e reuses as-is.** Spec AC #1 wording says "Toggle row" — same component, just rendered in the AddBrickSheet form. **No new primitive file.** Resolves SG-m4e-04.                                     |
| `components/RecurrenceChips.tsx`     | `[survives unchanged]` | Already extracted in M2. AddBrickSheet imports the same module the AddBlockSheet does. No code changes — BUILDER passes the same `today` prop. Resolves SG-m4e-08 (extract-and-reuse, already done).                                                                                                                                                                                                                                                                                        |
| `components/AddBrickSheet.tsx`       | `[extends]`            | (a) New duration `<Toggle>` row inserted between the type selector (`tick`/`goal`/`time`) and the Save button. Default OFF. (b) When ON, reveals three fields: Start (time input), End (time input), `<RecurrenceChips>`. (c) Validation: inline alerts for `End ≤ Start`, custom-range zero-weekdays, and the live overlap warning chip. (d) Save-disable when overlap list non-empty OR validation fails. Medium haptic on disabled-Save tap. (e) Light haptic on toggle flip.            |
| `components/AddBlockSheet.tsx`       | `[extends]`            | **Minimal change.** Replace the M2 `role="status"` soft `overlapsExistingBlock` warning with the M4e `findOverlaps` + warning-chip + Save-disable path. Engine input set widened to include timed loose bricks (currently considers blocks only). All other M2 fields/layout/validation stay verbatim.                                                                                                                                                                                      |
| `components/BrickChip.tsx`           | `[extends]`            | When `brick.hasDuration === true`, render a secondary line below the brick name with the `HH:MM–HH:MM` badge in `font-mono text-xs text-[--ink-dim]`. Applies to all three variants (tick / goal / time). When OFF, chip is **byte-identical** to M4a/M4b/M4c output (resolves SG-m4e-02 — below-name placement). Time-brick chip's existing `${minutesDone} / ${durationMin} m` performance badge is unchanged and coexists.                                                               |
| `components/LooseBricksTray.tsx`     | `[extends]`            | Replace the direct `looseBricks` prop consumption with `selectTrayBricks(state)` filtering. Tray-visibility contract from M3 preserved: tray hidden iff filtered list is empty AND no blocks exist. **Caller change in `<BuildingClient>`:** pass `selectTrayBricks(state)` instead of raw `state.looseBricks`.                                                                                                                                                                             |
| `components/Timeline.tsx`            | `[extends]`            | Replace the current `blocks.map(...)` loop with `items.map(...)` where `items = selectTimelineItems(state)` (already-sorted union of blocks + timed loose bricks). For each item: if `kind === "block"`, render the existing `<TimelineBlock>` (unchanged); if `kind === "brick"`, render the NEW `<TimedLooseBrickCard>` (see below). Caller (BuildingClient) passes `selectTimelineItems(state)` instead of `state.blocks`.                                                               |
| `components/TimedLooseBrickCard.tsx` | `[new]`                | NEW. Renders a timed loose brick on the timeline. Same hour-row math as `<TimelineBlock>` (`top = timeToOffsetPx(start, HOUR_HEIGHT_PX)`, `height = timeToOffsetPx(end) - top`). Visual: dashed 1.5 px outline (`border-dashed`) using the brick's category color (or `--ink-dim` if uncategorized). Body reuses `<BrickChip>` (the full chip — tick / goal / time variants render with their existing interactivity). The card is a thin positioning wrapper, not a separate brick widget. |
| `app/(building)/BuildingClient.tsx`  | `[extends]`            | (a) Migration on init: call `withDurationDefaults` over `state.looseBricks` and every `block.bricks[]` once at first render via a lazy `useReducer` initializer wrapping `defaultState()` (`defaultState()` already returns empty; the call is defensive against future in-memory seeds). (b) Pass `selectTrayBricks(state)` to `<LooseBricksTray>` and `selectTimelineItems(state)` to `<Timeline>`. (c) Pass `state` (full) to both Add sheets so they can call `findOverlaps`.           |
| `app/globals.css`                    | `[survives unchanged]` | Reuses `--accent`, `--accent-deep`, `--ink`, `--ink-dim`, `--bg-elev`, `--cat-*`. No new CSS variables. The dashed-outline weight uses Tailwind's `border-dashed` + `border-[1.5px]` arbitrary; the warning-chip background reuses `--accent-deep` at 10 % opacity (same chip pattern M2 uses for hard alerts).                                                                                                                                                                             |

Untouched in M4e (read-only): `Hero`, `HeroRing`, `BlueprintBar`, `TopBar`, `BottomBar`, `AddChooserSheet`, `CategoryPicker`, `NewCategoryForm`, `EditModeProvider`, `SlotTapTargets`, `Scaffold`, `EmptyBlocks`, `EmptyBricks`, `NowLine`, `NowCard`, `TimelineBlock`, `TimerSheet`, `Fireworks`, `BrickStepper`. Every M4a/M4b/M4c/M4d chip and sheet contract is preserved verbatim — M4e's only behavioural surfaces are AddBrickSheet (new toggle + fields), AddBlockSheet (overlap chip upgrade), BrickChip (secondary line iff `hasDuration`), LooseBricksTray + Timeline (selector swaps), and the new `<TimedLooseBrickCard>` + `lib/overlap.ts`.

**Summary:** 2 NEW files (`lib/overlap.ts`, `components/TimedLooseBrickCard.tsx`), 7 MODIFIED files (`lib/types.ts`, `lib/data.ts`, `components/AddBrickSheet.tsx`, `components/AddBlockSheet.tsx`, `components/BrickChip.tsx`, `components/LooseBricksTray.tsx`, `components/Timeline.tsx`, `app/(building)/BuildingClient.tsx`), 1 MODIFIED-COMMENT-ONLY file (`lib/blockValidation.ts`), 0 NEW M0 primitives (Toggle already shipped — resolves SG-m4e-04 in BUILDER's favor).

### Locked schema additions

**`lib/types.ts` — `BrickBase` extension (M4e):**

```ts
type BrickBase = {
  id: string;
  name: string;
  categoryId: string | null;
  parentBlockId: string | null;
  // NEW in M4e — universal duration axis (orthogonal to score type per ADR-042).
  // Presence invariant: hasDuration === true IFF all three of start/end/recurrence are present;
  // hasDuration === false IFF all three are undefined. Reducer enforces in ADD_BRICK.
  hasDuration: boolean; // default false; controlled by the AddBrickSheet <Toggle>
  start?: string; // "HH:MM"; present iff hasDuration === true
  end?: string; // "HH:MM"; present iff hasDuration === true; half-open [start, end) per ADR-006
  recurrence?: Recurrence; // present iff hasDuration === true; default { kind: "just-today", date: <today ISO> }
};
```

The three score-type discriminants (`tick`, `goal`, `time`) and their performance fields (`done` / `target+unit+count` / `durationMin+minutesDone`) are **unchanged** from M3 + M4a/b/c. The `Brick` discriminated union shape stays identical.

**`Block`:** unchanged. (Blocks have always had `start`, `end`, `recurrence` since M2.)

**`AppState`:** unchanged. M4c's `runningTimerBrickId` is untouched.

**`Action`:** unchanged. No new action types. `ADD_BRICK` already accepts a `Brick`; M4e widens its payload shape via the `BrickBase` extension.

**`withDurationDefaults` helper (lib/data.ts):**

```ts
// lib/data.ts — Migration helper for pre-M4e in-memory brick literals.
// Returns the brick unchanged if hasDuration is already set; else fills hasDuration: false
// and leaves start/end/recurrence absent (matching the presence invariant for hasDuration === false).
// Used to migrate test fixtures and any in-memory seeded state defensively at boot.
// Resolves SG-m4e-06 (helper-based migration, not per-fixture explicitness).
export function withDurationDefaults<T extends Brick>(brick: T): T {
  // Use `in` because the field is optional at the TS-shape level pre-migration but always present post-migration.
  if (
    "hasDuration" in brick &&
    typeof (brick as Brick).hasDuration === "boolean"
  )
    return brick;
  return { ...brick, hasDuration: false };
}
```

**Reducer invariant enforcement (sketch):**

```ts
// lib/data.ts — ADD_BRICK arm (M4e additions)
case "ADD_BRICK": {
  const b = action.brick;
  // Presence invariant guard (defense-in-depth — UI should never construct an invalid action).
  const allPresent = b.start !== undefined && b.end !== undefined && b.recurrence !== undefined;
  if (b.hasDuration === true && !allPresent) return state;
  if (b.hasDuration === false && (b.start !== undefined || b.end !== undefined || b.recurrence !== undefined)) return state;
  // (existing M3 routing by parentBlockId follows unchanged)
  if (b.parentBlockId === null) return { ...state, looseBricks: [...state.looseBricks, b] };
  return {
    ...state,
    blocks: state.blocks.map((bl) =>
      bl.id === b.parentBlockId ? { ...bl, bricks: [...bl.bricks, b] } : bl,
    ),
  };
}
```

Reducer never mutates in place; existing identity-preservation patterns from `LOG_GOAL_BRICK` / `TICK_TIMER` / `SET_TIMER_MINUTES` are unaffected (those arms key on `brick.id` + `kind`; the new optional fields are passive payload).

### Library modules

**`lib/overlap.ts` — pure-function overlap engine (resolves AC #11–18)**

```ts
// lib/overlap.ts — pure-function module. No React, no side effects, no reducer involvement.
// Half-open [start, end) intervals per ADR-006.
import { toMin } from "./dharma";
import type { AppState, Block, Brick } from "./types";

export type TimedItem =
  | {
      kind: "block";
      id: string;
      name: string;
      start: string;
      end: string;
      categoryId: string | null;
    }
  | {
      kind: "brick";
      id: string;
      name: string;
      start: string;
      end: string;
      categoryId: string | null;
    };

/** Half-open interval intersection: [a.start, a.end) ∩ [b.start, b.end) ≠ ∅
 *  iff a.start < b.end AND b.start < a.end. Touching boundaries do NOT overlap.
 *  AC #11. */
export function intervalsOverlap(
  a: { start: string; end: string },
  b: { start: string; end: string },
): boolean {
  const as = toMin(a.start),
    ae = toMin(a.end);
  const bs = toMin(b.start),
    be = toMin(b.end);
  return as < be && bs < ae;
}

/** Returns all items that overlap `candidate`, excluding `excludeId` (M5 edit case).
 *  Sort: start asc, then kind ("block" before "brick"), then name alphabetic. AC #18. */
export function findOverlaps(
  candidate: { start: string; end: string },
  items: TimedItem[],
  excludeId?: string,
): TimedItem[] {
  const hits = items.filter(
    (it) =>
      (excludeId === undefined || it.id !== excludeId) &&
      intervalsOverlap(candidate, it),
  );
  hits.sort((x, y) => {
    const xs = toMin(x.start),
      ys = toMin(y.start);
    if (xs !== ys) return xs - ys;
    if (x.kind !== y.kind) return x.kind === "block" ? -1 : 1;
    return x.name.localeCompare(y.name);
  });
  return hits;
}

/** Union selector: every block with an `end` + every brick with `hasDuration === true`.
 *  Bricks without `hasDuration` are excluded (AC #16). The candidate-being-added is NOT
 *  in this set (AddBrickSheet/AddBlockSheet pass the not-yet-saved candidate separately). */
export function selectAllTimedItems(state: AppState): TimedItem[] {
  const out: TimedItem[] = [];
  for (const bl of state.blocks) {
    if (!bl.end) continue; // skip no-end blocks (matches blockValidation.overlapsExistingBlock)
    out.push({
      kind: "block",
      id: bl.id,
      name: bl.name,
      start: bl.start,
      end: bl.end,
      categoryId: bl.categoryId,
    });
  }
  const pushBrick = (br: Brick) => {
    if (
      br.hasDuration !== true ||
      br.start === undefined ||
      br.end === undefined
    )
      return;
    out.push({
      kind: "brick",
      id: br.id,
      name: br.name,
      start: br.start,
      end: br.end,
      categoryId: br.categoryId,
    });
  };
  for (const bl of state.blocks) for (const br of bl.bricks) pushBrick(br);
  for (const br of state.looseBricks) pushBrick(br);
  return out;
}

/** Tray filter: loose bricks without duration. AC #27. */
export function selectTrayBricks(state: AppState): Brick[] {
  return state.looseBricks.filter((b) => b.hasDuration !== true);
}

/** Timeline union: blocks + loose bricks with duration ON. Sorted by start asc. AC #28. */
export function selectTimelineItems(
  state: AppState,
): Array<{ kind: "block"; block: Block } | { kind: "brick"; brick: Brick }> {
  const items: Array<
    { kind: "block"; block: Block } | { kind: "brick"; brick: Brick }
  > = [];
  for (const bl of state.blocks) items.push({ kind: "block", block: bl });
  for (const br of state.looseBricks) {
    if (br.hasDuration === true && br.start !== undefined)
      items.push({ kind: "brick", brick: br });
  }
  items.sort((a, b) => {
    const as = a.kind === "block" ? a.block.start : a.brick.start!;
    const bs = b.kind === "block" ? b.block.start : b.brick.start!;
    return toMin(as) - toMin(bs);
  });
  return items;
}
```

**Why this shape.** Pure functions only. Two selectors (`selectTrayBricks`, `selectTimelineItems`) plus two collision primitives (`intervalsOverlap`, `findOverlaps`) plus the union accessor (`selectAllTimedItems`). No memoization in M4e (the input sets are small — single-digit blocks, single-digit timed bricks); add `useMemo` at the call sites only if profiling shows it during the EVAL run. `findOverlaps` accepts a generic `candidate` shape `{ start, end }` (not a full `TimedItem`) so callers can pass the **in-progress form state** before a brick id exists. `excludeId` is reserved for M5 edit mode (M4e never passes it).

### Components

**`<AddBrickSheet>` (extended — main M4e surface)**

- Imports added: `Toggle` from `@/components/ui/Toggle`, `RecurrenceChips` from `@/components/RecurrenceChips`, `findOverlaps` + `selectAllTimedItems` from `@/lib/overlap`, `today` from `@/lib/dharma`. Plus `AppState` typing for the new `state` prop.
- New prop: `state: AppState` (replaces the standalone `categories` prop OR — BUILDER picks — a narrower `timedItems: TimedItem[]` precomputed at the parent; plan-side preference is `state` since `selectAllTimedItems(state)` is cheap and centralizes the contract). Existing props (`open`, `parentBlockId`, `defaultCategoryId`, `categories`, `onSave`, `onCancel`, `onCreateCategory`) preserved.
- New local form state (between the existing type selector and Save):
  - `hasDuration: boolean` — default `false`. Source of truth for whether the brick saves with time fields.
  - `start: string` ("HH:MM") — initialized lazily on first ON-flip per AC #3 (parent block's `start` if `parentBlockId !== null` AND the block is found, else `roundDownToHour(now)` — reuse `<BuildingClient>`'s exported helper or duplicate the 1-liner).
  - `end: string` ("HH:MM") — initialized lazily on first ON-flip per AC #3 (parent block's `end` if available, else `Start + 30 min` via a `toMin` + `+30` + format helper).
  - `recurrence: Recurrence` — default `{ kind: "just-today", date: today() }`.
- Toggle row DOM:
  ```
  <div role="group" aria-label="Duration">
    <span>Duration</span>
    <Toggle pressed={hasDuration} onPressedChange={handleDurationToggle} label="Has duration" />
  </div>
  ```
- `handleDurationToggle(next: boolean)`:
  1. `haptics.light()`.
  2. `setHasDuration(next)`.
  3. If `next === true` AND fields are still at their initial empty values: initialize `start`, `end`, `recurrence` per the defaults above. If `next === false`: leave fields populated but irrelevant (they're filtered out on Save; AC #4 silent-discard). **Decision:** do NOT clear on OFF — the user might toggle back ON and expect their values preserved within the session. Save reads `hasDuration` as the source of truth (AC #5/#6).
- Conditional reveal — when `hasDuration === true`:
  - `<label>Start</label><input type="time" required>` — same 44 px styling as AddBlockSheet's time inputs.
  - `<label>End</label><input type="time" required>` — same.
  - Inline error `<p role="alert">End must be after Start</p>` when `endAfterStart(start, end) === false`.
  - Inline error `<p role="alert">End must be on the same day as Start</p>` when start/end straddle midnight — same single-day constraint M2 already enforces; reuse `isValidEnd(end)` from `blockValidation.ts` (returns false if past midnight format is invalid; same regex `[0-2]\d:[0-5]\d`).
  - `<RecurrenceChips value={recurrence} onChange={setRecurrence} today={today()} />`.
  - Inline error `<p role="alert">Pick at least one weekday</p>` when `recurrence.kind === "custom-range"` AND `weekdays.length === 0`. Reuse `isValidCustomRange` from `blockValidation.ts`.
- Overlap chip — rendered above Save iff `hasDuration === true` AND `start/end` valid AND `findOverlaps` returns a non-empty list:
  ```
  <p role="alert" data-testid="overlap-warning">
    ⚠ overlaps with {firstThree.map(it => `[${cap(it.kind)}: ${it.name}, ${it.start}–${it.end}]`).join(", ")}
    {hits.length > 3 ? `, +${hits.length - 3} more` : ""}
  </p>
  ```
  Where `cap` capitalizes ("block" → "Block"). Up to 3 listed, then "+N more" per AC #20.
- `isValid` = `titleValid && goalValid && timeValid && (hasDuration ? durationValid && overlapsEmpty : true)` where `durationValid` = `isValidStart(start) && isValidEnd(end) && endAfterStart(start, end) && isValidCustomRange(recurrence)`.
- Save button `aria-disabled={!isValid}`; styling uses `opacity: 0.6` + `cursor: not-allowed` when disabled (matches existing AddBrickSheet pattern lines 392–408).
- Disabled-Save tap (AC #22):
  - Existing `handleSave()` already calls `haptics.medium()` then `return` when `!isValid` — that path covers the overlap case automatically.
  - Add `aria-describedby="brick-save-hint"` to the Save button when disabled by overlap; render `<span id="brick-save-hint" className="sr-only">Resolve the overlap to save.</span>` adjacent. The visible hint copy uses `var(--ink-dim)`.
- Save handler (`handleSave`) writes the brick with `hasDuration` + the three fields if ON, else just the score-type fields per M3 contract (AC #5/#6):
  ```ts
  const base = {
    id: uuid(),
    name: title.trim(),
    categoryId: selectedCategoryId,
    parentBlockId,
  };
  const duration = hasDuration
    ? { hasDuration: true as const, start, end, recurrence }
    : { hasDuration: false as const };
  // ...then merge with kind-specific fields as today.
  ```
- Focus trap — unchanged (M3's pattern still applies; the new `<Toggle>` and `<input type="time">` are part of the focusable set automatically).
- Reduced motion (resolves SG-m4e-07): under `prefers-reduced-motion: reduce`, the reveal of the three fields is **instant** (no height-transition). Default motion: **none** — the fields just appear/disappear via React conditional rendering. The Toggle's own track-color transition (defined inside `<Toggle>`) already opts out of motion-sensitive paths because it's `transition-colors duration-200` — fine for non-RM; under RM, BUILDER may keep it (color crossfades are not motion). **Plan-locked:** no `<AnimatePresence>` wrapper on the three fields in M4e; instant reveal/hide for everyone. Rationale: the spec AC #2 says "instantly reveals (no animation gate)"; the only motion budget is the Toggle thumb slide (which the M0 primitive already manages). Simpler than wrapping fields in `<motion.div>` collapse/expand.

**`<AddBlockSheet>` (extended — minimal change)**

- Replace the M2 `overlapping` derivation:
  ```ts
  const overlapping = titleValid
    ? overlapsExistingBlock(blocks, candidate)
    : null;
  ```
  with:
  ```ts
  const candidateInterval = endEmpty ? null : { start, end };
  const overlapHits =
    titleValid && candidateInterval !== null
      ? findOverlaps(candidateInterval, selectAllTimedItems(state))
      : [];
  ```
  Same render-cycle as today; engine is pure.
- New prop: `state: AppState` (replaces `blocks: Block[]` OR adds alongside — plan-side preference is to pass `state` and derive both `blocks` and the timed-items list from it; BUILDER may add a narrower `timedItems: TimedItem[]` precomputed prop if it keeps the existing `blocks: Block[]` prop intact and avoids a wider diff).
- Upgrade the `role="status"` warning to `role="alert"` and disable Save when `overlapHits.length > 0`:
  ```jsx
  {
    overlapHits.length > 0 && (
      <p role="alert" data-testid="overlap-warning">
        ⚠ overlaps with{" "}
        {/* same comma-joined list as AddBrickSheet, max 3 + N-more */}
      </p>
    );
  }
  ```
- `isValid` extends with `&& overlapHits.length === 0`.
- Existing `handleSave()` already early-returns on `!isValid`; reuse. Add `medium` haptic on disabled-Save tap by wrapping the existing button's `onClick`:
  ```jsx
  onClick={() => { if (!isValid) { haptics.medium(); return; } handleSave(); }}
  ```
  (Mirror AddBrickSheet's existing pattern.)
- Everything else (Title input, Start/End inputs, RecurrenceChips, CategoryPicker, focus trap, view toggle, Save/Cancel layout) is byte-identical.

**`<BrickChip>` (extended — additive secondary line)**

- New conditional inside the existing chip body, right under the `<span>` that renders `brick.name`:
  ```jsx
  {
    brick.hasDuration === true &&
      brick.start !== undefined &&
      brick.end !== undefined && (
        <span
          data-testid="brick-time-window"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--fs-10)",
            color: "var(--ink-dim)",
            marginTop: "2px",
            display: "block",
          }}
        >
          {brick.start}–{brick.end}
        </span>
      );
  }
  ```
- Placement: secondary line **below the brick name** (SG-m4e-02 lock — name on top, time window below). The existing kind-specific badge (tick check, goal count, time `m/m` + Play/Pause glyph) stays on the same row as the name (its current location); the new time-window badge sits between them visually (under name, above the kind badge row).
- All three variants (tick / goal / time) share this conditional. **When `hasDuration === false`, the conditional renders nothing — the chip output is byte-identical to M4a/M4b/M4c** (AC #25). Regression tests assert this.
- `aria-label` extension (additive — does not displace the M4a/M4b/M4c labels): append `", scheduled HH:MM to HH:MM"` to every `buildAriaLabel` return value when `hasDuration === true`. E.g., a tick brick: `"Run, not done, tap to toggle, scheduled 06:00 to 06:40"`. Spec doesn't mandate this AND it doesn't break existing aria-label tests (those assert prefix or exact M4a/b/c strings; appending is a small risk — BUILDER must check that M4a tick tests use `toHaveAccessibleName(/exact-string/)` vs `toContain(...)`; the M4c label literal pattern in `buildAriaLabel` uses concatenation and is straightforward to extend). **Decision:** the appended suffix is additive but optional; if any existing test breaks on exact-string match, BUILDER drops the suffix from M4e and adds a separate `aria-describedby` span instead. Flag for VERIFIER awareness.
- Time-brick chip's existing `${minutesDone} / ${durationMin} m` performance badge (line 113–123 of current `BrickChip.tsx`) is **untouched**. AC #26 confirms both coexist.
- No new props. The chip reads `brick.hasDuration`, `brick.start`, `brick.end` from the already-passed `brick` prop.

**`<LooseBricksTray>` (extended — selector swap)**

- Change the input prop from `looseBricks: Brick[]` to either (a) keep `looseBricks: Brick[]` and rely on the caller to pre-filter (`selectTrayBricks(state)`) — plan-side preference because it keeps the component dumb and testable in isolation, or (b) accept `state: AppState` and call `selectTrayBricks(state)` internally. **Locked: (a) — caller pre-filters.** Rationale: the tray is already a presentational component with no state-aware logic; moving the selector inside would force a `state` prop drill where none exists today.
- AC #29: tray-visibility contract reads `showTray = blocks.length > 0 || selectTrayBricks(state).length > 0` at the `<BuildingClient>` parent. Filtered-empty + no-blocks → tray hidden. Same M3 invariant.

**`<Timeline>` (extended — union renderer + new `<TimedLooseBrickCard>`)**

- Change the input prop from `blocks: Block[]` to either (a) `items: Array<{kind:"block";block:Block}|{kind:"brick";brick:Brick}>` from `selectTimelineItems(state)`, or (b) `state: AppState` and call the selector internally. **Locked: (a).** Mirrors the LooseBricksTray decision; keeps Timeline presentational.
- Inside the existing `{blocks.map((b) => <TimelineBlock ... />)}` block, replace with:
  ```jsx
  {
    items.map((item) =>
      item.kind === "block" ? (
        <TimelineBlock
          key={item.block.id}
          block={item.block}
          categories={categories}
          onAddBrick={onAddBrick}
          onTickToggle={onTickToggle}
          onGoalLog={onGoalLog}
          runningTimerBrickId={runningTimerBrickId}
          onTimerToggle={onTimerToggle}
          onTimerOpenSheet={onTimerOpenSheet}
        />
      ) : (
        <TimedLooseBrickCard
          key={item.brick.id}
          brick={item.brick}
          categories={categories}
          onTickToggle={onTickToggle}
          onGoalLog={onGoalLog}
          runningTimerBrickId={runningTimerBrickId}
          onTimerToggle={onTimerToggle}
          onTimerOpenSheet={onTimerOpenSheet}
        />
      ),
    );
  }
  ```
- `hasLooseBricks` prop (M4d): semantically becomes "are there any tray-eligible loose bricks?" The caller should pass `selectTrayBricks(state).length > 0` (not the raw `state.looseBricks.length > 0`). Otherwise a state with only timed loose bricks would suppress the `<EmptyBlocks>` card incorrectly. **BUILDER must verify** this prop's source in `<BuildingClient>`.

**`<TimedLooseBrickCard>` (NEW)**

- Props: `brick: Brick`, `categories: Category[]`, plus all the chip-interactivity callbacks (`onTickToggle`, `onGoalLog`, `runningTimerBrickId`, `onTimerToggle`, `onTimerOpenSheet`).
- DOM shape (mirrors `<TimelineBlock>`'s absolute positioning):
  ```jsx
  <div
    data-testid="timed-loose-brick"
    style={{
      position: "absolute",
      top: `${timeToOffsetPx(brick.start!, HOUR_HEIGHT_PX)}px`,
      height: `${timeToOffsetPx(brick.end!, HOUR_HEIGHT_PX) - timeToOffsetPx(brick.start!, HOUR_HEIGHT_PX)}px`,
      left: "8px",
      right: "8px",
      border: "1.5px dashed " + (category?.color ?? "var(--ink-dim)"),
      borderRadius: "8px",
      background: "var(--bg-elev)",
      padding: "8px",
      overflow: "hidden",
    }}
  >
    <BrickChip brick={brick} categories={categories} size="md" {...chipCallbacks} />
  </div>
  ```
- Visual distinction from blocks: **dashed 1.5 px outline** (resolves SG-m4e-03). Solid background `--bg-elev` (same as block cards). No category color stripe on the left (the dashed outline carries the category color across the full border). No internal time label — the timeline gutter on the left provides the hour reference.
- The chip inside is fully interactive (tap a tick to toggle, tap a goal stepper, tap a time chip to start/stop, long-press to open TimerSheet). All existing M4a/M4b/M4c verbs work identically because the chip is unchanged.
- No `<motion.div>` wrapper, no fade-in. The card just appears at the timeline position. (Optional polish: BUILDER may add the same 4 px fade-in `motion.div` `<TimelineBlock>` uses, but the spec doesn't require it and M4e wants minimum diff.)

**`<BuildingClient>` (extended)**

- Replace `<Timeline blocks={state.blocks} ...>` with `<Timeline items={selectTimelineItems(state)} ...>`.
- Replace `<LooseBricksTray looseBricks={state.looseBricks} ...>` with `<LooseBricksTray looseBricks={selectTrayBricks(state)} ...>`.
- Replace `hasLooseBricks={state.looseBricks.length > 0}` with `hasLooseBricks={selectTrayBricks(state).length > 0}`.
- Update `showTray = state.blocks.length > 0 || selectTrayBricks(state).length > 0`.
- Pass `state` to AddBlockSheet (replacing the current `blocks={state.blocks}` prop) and to AddBrickSheet (additive — prop didn't exist before).
- No new callbacks. No reducer changes beyond `ADD_BRICK` invariant. The single-running timer machinery (M4c `useTimer` + the four timer actions) is untouched.
- The lazy `useReducer` initializer (defensive migration via `withDurationDefaults`) is a one-liner around `defaultState()`. Since `defaultState()` returns empty arrays today, the helper effectively does nothing — but documents intent and protects against future in-memory seeds (M8 hydration path).

### Design tokens

| Token / value                         | Source                                            | M4e use                                                                                  |
| ------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `--accent` (`#fbbf24`)                | `app/globals.css` line 15                         | Toggle ON-state track color (already wired in `components/ui/Toggle.tsx:41`)             |
| `--accent-deep` (`#d97706`)           | `app/globals.css` line 16                         | Inline-error and overlap-warning text color (matches M2's pattern; `role="alert"`)       |
| `--ink-dim` (`rgba(245,241,232,0.5)`) | `app/globals.css` line 14                         | Toggle OFF-state track tint (`bg-[--ink-dim]/30` in Toggle); secondary-line text on chip |
| `--ink` (`#f5f1e8`)                   | `app/globals.css` line 13                         | Toggle thumb fill (Toggle primitive); primary brick-chip name text                       |
| `--bg-elev` (`#0c1018`)               | `app/globals.css` line 12                         | TimedLooseBrickCard background                                                           |
| `--cat-1..--cat-12`                   | `app/globals.css` lines 22–33                     | TimedLooseBrickCard dashed-outline color (resolves to the brick's `categoryId` color)    |
| `--font-mono` (JetBrains Mono)        | M0                                                | BrickChip secondary-line time-window badge `font-mono text-[--fs-10]`                    |
| `--font-ui` (Instrument Serif)        | M0                                                | All Toggle/sheet/form labels                                                             |
| `--fs-10`, `--fs-12`, `--fs-14`       | M0                                                | Existing scale; BrickChip secondary line uses `--fs-10`; sheet labels `--fs-12`          |
| Border `1.5px dashed`                 | Tailwind arbitrary `border-[1.5px] border-dashed` | TimedLooseBrickCard outline — distinguishes from block cards (solid border)              |
| Tap target `min-h-[44px]`             | ADR-031                                           | Toggle (`h-11 w-11` already enforces); Save button; time inputs (`height: 44px`)         |

No new CSS variables or tokens. No font additions. The amber Toggle track + dashed outline are achieved by reusing the existing palette.

### Motion

- **Toggle flip:** the M0 `<Toggle>` primitive uses `transition-colors duration-200` on the track and `transition-transform duration-200` on the thumb. **Under `prefers-reduced-motion: reduce`:** the track-color transition is a color change (not motion) and is preserved; the thumb-translate (`transition-transform`) — BUILDER must verify whether the M0 primitive currently respects reduced-motion (if not, this is an M0 hygiene fix for a future milestone, not an M4e gap). For M4e: accept the M0 primitive as-shipped. If A-m4e-01 axe-core flags the thumb motion, file a separate ticket (not in scope here).
- **Field reveal/hide when Toggle flips:** **instant** (no `<AnimatePresence>`, no height transition) — per AC #2 ("instantly reveals (no animation gate)") and SG-m4e-07 lock. React's conditional render does the work.
- **Warning chip appearance:** instant. No fade-in. The chip is a `role="alert"` paragraph; SR announces on first render.
- **TimedLooseBrickCard:** no entrance animation. Static absolute positioning. (Optional polish — `<TimelineBlock>` has a 4 px fade-in via `motion.div`; M4e does NOT add one for the brick card. Rationale: minimum-diff principle.)
- **AddBrickSheet open/close:** inherits `<Sheet>`'s `modalIn` / `modalOut` (unchanged from M0).

### Reduced motion

- Toggle thumb slide: respect M0 primitive's existing behavior. Plan-locked: instant for both reveal/hide AND warning-chip appearance.
- Cascade visuals (chip foreground gradient, scaffold bar, BlueprintBar, HeroRing): unchanged from M4c — those already collapse to per-tick under reduced motion.
- All M4a/M4b/M4c celebrations (bloom / fireworks / chime) still fire as today — none are new in M4e.

### Haptics map

| Trigger                                                     | Haptic event   | Source                                      |
| ----------------------------------------------------------- | -------------- | ------------------------------------------- |
| Toggle flip ON or OFF inside AddBrickSheet                  | `light`        | `<AddBrickSheet>` (M4e NEW call site)       |
| Save tap on AddBrickSheet with overlap active               | `medium`       | `<AddBrickSheet>` (existing pattern reused) |
| Save tap on AddBlockSheet with overlap active               | `medium`       | `<AddBlockSheet>` (M4e NEW call site)       |
| Save tap with toggle ON AND form valid (success)            | `success`      | `<AddBrickSheet>` (existing pattern reused) |
| Tray chevron expand/collapse, dock add, slot tap, chip taps | (M3/M4 reused) | (no new M4e haptics on those surfaces)      |

No new haptic primitives. The `light` / `medium` / `success` triad is already wired in `lib/haptics.ts`.

### A11y

- **Toggle (M0 primitive — already shipped):** `role="switch"`, `aria-checked={pressed}`, `aria-label="Has duration"` (label prop value). Focus ring via `focus-visible:outline`. 44 × 44 tap target. **AC #1 & A-m4e-01 satisfied by reusing the M0 component as-is.**
- **Warning chip:** `role="alert"` element so screen readers announce on first appearance (AC #20 + A-m4e-02). `data-testid="overlap-warning"` for tests.
- **Disabled Save button:** `aria-disabled="true"` (existing pattern in both Add sheets). `aria-describedby="brick-save-hint"` on AddBrickSheet (`block-save-hint` on AddBlockSheet) pointing to a hidden `<span className="sr-only">Resolve the overlap to save.</span>` (A-m4e-03). When `isValid === true`, the Save button drops both attributes.
- **Recurrence chip group:** already `role="radiogroup"` with `role="radio"` per chip — verbatim from M2's `<RecurrenceChips>` component. No M4e changes.
- **Time-window badge on brick chip:** plain `<span>` element. The badge is **decorative-supplementary**; the accessible name of the chip's button is what matters. Plan-locked aria approach: append `", scheduled HH:MM to HH:MM"` to `buildAriaLabel`'s return when `hasDuration === true` (see component section caveat — fallback to `aria-describedby` if exact-string tests break).
- **TimedLooseBrickCard:** the outer `<div>` carries no role; the inner `<BrickChip>` carries the existing accessible name + role. Axe expects no extra labelling on the wrapper.
- **Axe target (A-m4e-04):** zero violations on AddBrickSheet open with toggle ON AND overlap warning visible. Tested via Playwright + `@axe-core/playwright`. Same vacuous-pass-guarded harness pattern as M4a–M4d (per `status.md` open loops — deterministic seeding helper is still TODO; M4e tests inherit the guard).

### Edge cases

- **Toggle OFF on Save with start/end half-filled.** Save reads `hasDuration` as the source of truth; the time fields are not read. Brick saves with `hasDuration: false`, no time fields. No "are you sure?" prompt (AC #4, AC #5).
- **Toggle ON, Start === End.** Zero-duration window. `endAfterStart(start, end)` returns `false`. Inline `role="alert"` error renders. Save disabled.
- **Toggle ON, Start > End.** Same path — `endAfterStart` returns `false`. Same inline error. Same Save-disable.
- **Toggle ON, Start/End straddle midnight.** Reject. `isValidEnd(end)` from `blockValidation.ts` already enforces a single-day model. Inline error: "End must be on the same day as Start." Save disabled. (Multi-day windows are out of scope; same constraint as blocks.)
- **Back-to-back tasks share a boundary** (Block A 9:00–10:00, Brick B 10:00–11:00). `intervalsOverlap` returns `false` (half-open `[start, end)`). No warning, Save enabled. Spec AC + ADR-006.
- **Two tasks share both Start and End.** `intervalsOverlap` returns `true`. Warning chip lists both, Save disabled.
- **One task fully contains another.** `intervalsOverlap` returns `true`. Warning chip names the containing item (sort: start asc — the container is listed first if its start < candidate's start; ties broken by kind then name).
- **Multiple simultaneous overlaps.** Up to 3 listed, then "+N more". Save disabled. AC #20.
- **Loose brick with duration ON, Start hour empty of other items.** Renders on Timeline at that hour row via `selectTimelineItems(state)`. Tray count decreases by one (via `selectTrayBricks`).
- **Loose brick with duration ON whose Start === existing Block's Start.** Overlap detected (identical start, overlapping intervals). Warning + Save disabled.
- **Last loose brick with duration ON promotes to Timeline.** Tray's empty state re-applies if `selectTrayBricks(state).length === 0` AND `state.blocks.length === 0` → `showTray = false` (M3 invariant preserved).
- **Existing brick literal pre-M4e (`hasDuration` absent).** `withDurationDefaults(brick)` fills `hasDuration: false`. Defense-in-depth — no real legacy persistence yet (M8). All M3/M4a/M4b/M4c test fixtures opt into this helper via the suggested fixture-builder pattern.
- **Recurrence custom-range with zero weekdays.** `isValidCustomRange(recurrence)` returns `false`. Inline error: "Pick at least one weekday." Save disabled. (Matches M2 AC for blocks; AddBrickSheet reuses verbatim.)
- **Two tick/goal/time bricks with same `parentBlockId` and overlapping windows** (brick↔brick inside the same block). `findOverlaps` includes nested bricks via `selectAllTimedItems(state)` walking `state.blocks[*].bricks[*]`. Detection fires. Save disabled.
- **Nested brick's window spills outside parent block's window.** **NOT a hard error in M4e** (per user direction 2026-05-14 in spec § Edge cases). The brick can save. `findOverlaps` still surfaces any _other_ collision the spill creates (e.g., spilling into the next block's window). No "fit inside parent" check.
- **AddBlockSheet save while existing timed loose brick overlaps.** `findOverlaps` includes the timed brick (via `selectAllTimedItems`); warning chip shows `"⚠ overlaps with [Brick: <name>, HH:MM–HH:MM]"`; Save disabled. Resolves AC #14 from the block side.
- **AddBrickSheet save where the candidate has `hasDuration === false`.** Overlap engine never runs (gated on `hasDuration === true && fields valid`). Save behaves byte-identically to M3/M4a/M4b/M4c (AC #5, AC #25).

### Cross-cutting concerns BUILDER will hit

1. **Selector imports.** `selectTrayBricks`, `selectTimelineItems`, `selectAllTimedItems`, `findOverlaps`, `intervalsOverlap` all live in `lib/overlap.ts`. Don't re-derive in components; always go through the selector. This keeps the contract testable in one place (`lib/overlap.test.ts`).
2. **`<Timeline>` prop signature change.** `blocks: Block[]` → `items: TimelineItem[]`. Every test that constructs `<Timeline blocks={...} />` needs migration. BUILDER does this during the TDD red phase as typecheck errors surface.
3. **`<LooseBricksTray>` filtering at the parent.** Caller passes `selectTrayBricks(state)`; component is dumb. Tests that bypass the parent and pass timed loose bricks directly to the tray will see them rendered — that's a test bug, not a behavior bug. Update those tests to pre-filter.
4. **`<AddBlockSheet>` overlap-warning role change.** M2 ships `role="status"` (soft warning, Save enabled). M4e upgrades to `role="alert"` + Save-disable. The M2 e2e specs that assert `role="status"` need migration. Check `tests/` for occurrences.
5. **`<BrickChip>` aria-label suffix.** The optional `", scheduled HH:MM to HH:MM"` suffix on `buildAriaLabel` may break exact-string match tests in `BrickChip.test.tsx`. BUILDER's first red phase will surface these; either (a) update tests to match the new label, or (b) fall back to a separate `aria-describedby` span. **Plan-locked preference:** (a).
6. **`withDurationDefaults` at the boundary.** Apply once at the `useReducer` initializer (lazy init) in `<BuildingClient>` and once in every test fixture builder (the standard `makeBrick({...})` helper if one exists; else inline at the literal). This keeps the presence invariant trivially true everywhere downstream.
7. **`ADD_BRICK` invariant rejection.** The reducer silently returns state unchanged on an invalid action shape. Tests can assert this via dispatching a malformed action and checking state identity. Real UI never produces such an action — the AddBrickSheet always builds the brick correctly because `hasDuration` and the field set are co-managed.
8. **No new haptics, no new audio, no new motion tokens.** M4e fully reuses M0/M3/M4a/M4b/M4c infrastructure.
9. **Live engine doesn't need memoization in M4e.** Input sets are small. `findOverlaps` runs on every render of the AddBrickSheet (cheap — O(n) over single-digit n). If profiling shows render cost during EVAL, add `useMemo` at the call site keyed on `[state.blocks, state.looseBricks, start, end, hasDuration]`.
10. **`<Toggle>` is the M0 primitive (already exists).** Do NOT author a new component. Import from `@/components/ui/Toggle` or `@/components/ui` barrel. The API is `pressed` / `onPressedChange` (not `checked` / `onCheckedChange` — the spec prose used "checked" loosely; the M0 primitive uses "pressed" semantics matching its `role="switch"` button origin). BUILDER threads the boolean correctly.
11. **Gate D (typecheck).** Running `tsc --noEmit` will surface every consumer of `Brick` that needs `hasDuration: false` added. Fix in place during the red phase.
12. **`<EditModeProvider>` is irrelevant in M4e.** Edit Mode lands in M5. The toggle is a duration toggle, not an edit toggle — different surface entirely.

### Decisions to honor

- **ADR-042 (universal duration axis)** — the conceptual frame for M4e. Every selector, every UI surface, every selector test traces back to this ADR.
- **ADR-034 (softened)** — block clause unchanged ("always timed"). Brick clause now "optionally timed via toggle." M4e implements the softening exactly as ADR-042 § Decision specifies.
- **ADR-006 (half-open `[start, end)` intervals)** — `intervalsOverlap`'s formula `a.start < b.end && b.start < a.end` is the canonical half-open intersection. Back-to-back tasks share a boundary but do NOT overlap.
- **ADR-019 (`Recurrence` discriminated union)** — applies to bricks (M4e) the same way it applied to blocks (M2). Same 4-variant union, same `<RecurrenceChips>` component. `appliesOn(rec, date)` is M9.
- **ADR-031 (44 px touch target)** — Toggle (44×44 already), all time inputs (44 px tall via existing styling), Save button (44 px tall).
- **ADR-039 (ships empty)** — no factory data. `defaultState()` returns empty. Toggle defaults OFF for every new brick.
- **ADR-035 (loose bricks first-class)** — timed loose bricks just relocate from tray to timeline. They're still first-class entities; the user still creates them via the same `+ Brick` pill (with the new toggle exposed).
- **ADR-027 (commit prefixes)** — BUILDER commits `test(m4e): …` (red), `feat(m4e): …` / `fix(m4e): …` (green/refactor). PLANNER lands as `docs(plan-m4e): …` and `docs(tests-m4e): …`. SHIPPER as `chore(ship-m4e): …` / `docs(ship-m4e): …`.
- **ADR-022 (one feature per dispatch)** — this plan covers M4e only.
- **ADR-025 / ADR-026 / ADR-041 (mode separation + single-gate Loop)** — this dispatch writes `/docs/plan.md` only. The next dispatch (`mode: TESTS`) writes `/docs/tests.md`. VERIFIER then audits both. No human gate between TESTS and BUILD.
- **ADR-018 (localStorage `dharma:v1`)** — M4e does NOT route through `lib/persist.ts`. State is in-memory until M8. The `hasDuration` + time fields ride along whenever M8 lands.
- **ADR-024 (3-FAIL EVALUATOR cap)** — applies as usual.
- **Locked Brick discriminated union** — M4e extends `BrickBase` additively. The discriminant (`kind`) is unchanged; tick / goal / time arms in the reducer are untouched.
- **`assertNever` exhaustiveness** — preserved by NOT adding any new `Action` types.
- **No new npm deps.** All math is `toMin` (already shipped) plus arithmetic. No date library, no new icon, no animation library beyond existing `motion/react`.

### Resolutions for open spec gaps (SG-m4e-01..SG-m4e-08)

- **SG-m4e-01 — Toggle default per brick kind.** **LOCKED — OFF for all three kinds (tick / goal / time).** Rationale: preserves backwards-compat for M3/M4a/b/c surfaces (every existing brick literal stays valid without time fields). Time bricks could plausibly default ON (a "time-of-day to do this timed thing" is natural), but defaulting OFF keeps the toggle's signal value high — the user opts into duration explicitly. M7 polish may revisit if usage data argues for it.
- **SG-m4e-02 — Brick chip secondary-line vertical order.** **LOCKED — name (top) → time-window badge (below name) → kind-specific badge (same row as name, right side).** Rationale: the name is the primary identity; the time window is supplemental scheduling context; the kind badge (Play/Pause for time, count for goal, check/empty for tick) is the primary interactive cue. Stacking the time window above the name would visually emphasize scheduling over identity, which contradicts the user's mental model of "this brick is X, and oh, it's scheduled at Y."
- **SG-m4e-03 — Timed-loose-brick visual distinction on Timeline.** **LOCKED — dashed 1.5 px outline using the brick's category color (or `--ink-dim` if uncategorized).** Solid background `--bg-elev` (same as blocks). Rationale: dashed-vs-solid is the cleanest established "brick-ness vs block-ness" cue (M3 already uses dashed borders on the tray's `+ Brick` pill — same visual language). A background tint would compete with the block category-color stripe for attention. The 1.5 px weight is loud enough to read at 430 px viewport but subtle enough not to dominate.
- **SG-m4e-04 — `<Toggle>` location: M0 primitive vs M4e-local.** **LOCKED — M0 primitive, already shipped.** `components/ui/Toggle.tsx` exists with the exact API M4e needs (`pressed` / `onPressedChange` / `label` / 44×44 tap target / `role="switch"`). No new file. Resolves SG-m4e-04 in BUILDER's favor — zero new primitive work.
- **SG-m4e-05 — Overlap detection: live vs on-blur vs on-Save.** **LOCKED — live on every field-change tick.** Rationale: the data set is small (O(n) over single-digit n). Live feedback reflects the "duration is universal" mental model — the user sees the collision the moment they pick a time, not after they commit. The pure-function engine has zero side effects, so re-evaluating on every render is cheap. M7 polish may add `useMemo` if profiling justifies it.
- **SG-m4e-06 — Migration of pre-M4e in-memory Brick literals.** **LOCKED — `withDurationDefaults(brick)` helper in `lib/data.ts`.** Fills `hasDuration: false` for any literal missing it. Applied (a) once via lazy `useReducer` initializer in `<BuildingClient>`, (b) inside test fixtures' brick-builder helpers (`makeBrick` if present; otherwise inline at the literal). Rationale: preserves the existing M3/M4a/b/c fixture surface area unchanged — none of those tests grow `hasDuration: false` annotations unless they directly assert duration-aware behavior.
- **SG-m4e-07 — Reduced-motion behavior for the toggle's reveal/hide.** **LOCKED — instant (no animation) for everyone, all the time.** Rationale: AC #2 mandates "instantly reveals (no animation gate)." Adding a 150 ms collapse/expand for non-RM users would create a behavior gap between AC and implementation. Simpler and more honest: never animate the reveal. The Toggle thumb itself still slides (M0 primitive's 200 ms transform) — but that's UI feedback for the gesture, not motion of the form fields.
- **SG-m4e-08 — Recurrence "Custom range" UI on AddBrickSheet.** **LOCKED — reuse `<RecurrenceChips>` verbatim.** The component is already extracted (`components/RecurrenceChips.tsx`, 210 lines, shipped in M2). AddBrickSheet imports the same module AddBlockSheet uses. Zero new UI work. Rationale: visual consistency between block and brick scheduling, plus M5 Edit Mode will need exactly one component to edit recurrence on either entity type.

### Out of scope (M4e)

- Editing an existing brick to flip duration ON or OFF → **M5 Edit Mode**.
- Editing an existing brick's start/end/recurrence → **M5 Edit Mode**.
- Deleting a brick → **M5 Edit Mode**.
- Promoting nested bricks to their own timeline row → **never** (nested bricks always render inside parent block card).
- Drag-to-reschedule on the timeline → **M5/M7 polish**.
- Recurrence resolution against past or future dates → **M9** (`appliesOn(rec, date)` resolver).
- Cross-day overlap (recurrence-aware) → **M9**.
- Conflict-resolution UI beyond Save-disable (auto-shift, merge prompts, suggested alternatives) → **never; the user resolves**.
- Persisting toggle state across page reloads → **M8**.
- Auto-deriving `durationMin` from `end - start` on time bricks → **never** (two distinct numbers per ADR-042).
- Hard-constraining a nested brick's window to fit inside its parent → **never** (per user direction; spill is allowed).
- Memoization of overlap engine via `useMemo` → **M7 polish** (only if profiling shows it).

### Test strategy

The TESTS-mode dispatch (separate, per ADR-025) will produce the actual GIVEN/WHEN/THEN IDs. This plan reserves the following layers and broad coverage targets:

- **Unit (Vitest)** — `lib/overlap.test.ts` (NEW): truth table for `intervalsOverlap` (overlap, touching boundary, separated, identical, contained); `findOverlaps` exclusion + sort + multi-collision; `selectAllTimedItems` filters out `hasDuration === false`; `selectTrayBricks` and `selectTimelineItems` selector correctness on mixed state; both selectors handle empty state. `lib/data.test.ts` extension: `ADD_BRICK` with `hasDuration: true` happy path; invariant rejection paths (ON missing fields, OFF with fields present); `withDurationDefaults` idempotency + fills missing flag.
- **Component (Vitest + Testing Library)** — `components/AddBrickSheet.test.tsx`: toggle OFF preserves M3/M4a/b/c byte-identical save path; toggle ON reveals three fields with correct defaults; saves with all three populated; overlap chip renders on collision; Save aria-disabled when overlap or invalid; Save fires `haptics.medium()` on disabled-Save tap; Save re-enables when fields adjusted; reduced-motion does not add `<AnimatePresence>` to field reveal. `components/AddBlockSheet.test.tsx`: overlap chip renders against existing blocks (M2 regression-free) and against timed loose bricks (M4e new); Save aria-disabled. `components/BrickChip.test.tsx`: time-window badge renders iff `hasDuration === true`; chip output byte-identical when OFF (regression test); aria-label gains suffix when ON (or aria-describedby fallback). `components/LooseBricksTray.test.tsx`: receives pre-filtered list; tray hides when filtered-empty + no blocks. `components/Timeline.test.tsx`: receives union items; renders `<TimelineBlock>` for blocks and `<TimedLooseBrickCard>` for timed-loose-bricks at correct hour rows. `components/TimedLooseBrickCard.test.tsx` (NEW): dashed outline color resolves to category color or `--ink-dim`; positions absolutely via `timeToOffsetPx`; inner `<BrickChip>` is fully interactive (tap to toggle a tick, etc.).
- **E2E (Playwright, mobile-chrome 430 px)** — `tests/e2e/m4e.spec.ts`: add loose brick with toggle ON → renders on timeline at `start` row with dashed outline; add brick with collision → warning + disabled Save; fix overlap → warning clears + Save enabled; add block with collision against a timed loose brick → warning on AddBlockSheet + disabled Save; add brick with toggle OFF → byte-identical to M3 path (regression). Vacuous-pass guarded per the M4a–M4d pattern.
- **A11y (axe via Playwright)** — `tests/e2e/m4e.a11y.spec.ts`: zero violations on AddBrickSheet with toggle ON + overlap warning visible; `<Toggle>` role=switch + aria-checked; warning chip role=alert; disabled Save aria-disabled + aria-describedby. Vacuous-pass guarded.

### Migration / obsolete IDs

- M2/M3/M4a/M4b/M4c/M4d test IDs continue to apply unchanged. M4e IDs are net-additive.
- Existing tests that construct `Brick` literals without `hasDuration` will type-error under strict TS. BUILDER fixes via either (a) inline `hasDuration: false`, or (b) wrapping the literal in `withDurationDefaults(...)`. **Plan-locked preference:** (a) when the test directly cares about brick shape; (b) when the test routes through a fixture helper.
- `<AddBlockSheet>` M2 specs that assert `role="status"` on the soft warning need migration to `role="alert"`. Count visible at red phase.
- `<Timeline>` specs that pass `blocks: Block[]` directly need migration to `items: TimelineItem[]`.
- `<LooseBricksTray>` specs that pass `state.looseBricks` directly (unfiltered) need migration to pre-filtered via `selectTrayBricks` OR continue passing the raw array if the test doesn't intentionally include a timed brick.
- The 4 deferred M4a tests.md cleanup items + 1 deferred M4b cleanup item + 12 vacuous-pass-guarded M4d e2e/a11y items + M4c's vacuous-pass items (per `status.md` open loops) are explicitly OUT of scope for the M4e TESTS dispatch.

### Open questions for VERIFIER

None genuinely unresolvable from the inputs. The plan resolves all 8 SG-m4e-0N spec gaps inline, references every relevant ADR (most importantly ADR-042 as the conceptual frame and ADR-006 for the overlap math), and threads the design through every existing M2–M4d invariant. **One item VERIFIER may want to flag and either accept or escalate** (in either case the answer should be a one-line confirmation — not a re-plan):

1. **BrickChip aria-label suffix vs aria-describedby.** Plan-locked preference is appending `", scheduled HH:MM to HH:MM"` to `buildAriaLabel`'s return for `hasDuration === true` bricks. If M4a/b/c BrickChip tests use exact-string match (e.g., `toHaveAccessibleName(/^Run, not done, tap to toggle$/)`), the suffix will break them. BUILDER's first red phase will surface this; the fallback is a separate `aria-describedby` span with the time-window text. Both paths satisfy a11y; the plan documents the choice for VERIFIER's awareness. **Plan-locked resolution:** prefer the suffix; fall back to describedby only if exact-string tests block the suffix. Either way, A-m4e-01..04 are satisfied.

### ADR needed

None identified pre-emptively. Every decision in this plan resolves under existing ADRs (ADR-042 as the primary frame, plus ADR-006, ADR-019, ADR-027, ADR-031, ADR-034, ADR-035, ADR-039) or under one of the SG-m4e-0N locks above. No conditional caveats.
