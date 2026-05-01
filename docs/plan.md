## Page 1 — Building view — Plan (empty-toolkit pivot)

### wipe-demo

**Context.** The empty-toolkit pivot makes user-created routines the default. Today, `lib/data.ts` ships a hardcoded 16-block weekday demo that masks the real first-run experience; this feature deletes the demo so the app boots into `EmptyBlocks` and Hero shows 0%. Persistence, live clock, and modals come in later dispatches per ADR-022.

**Files modified:**

- `lib/data.ts` — Delete `BLOCKS`, `NOW`, `DAY_NUMBER`, `TOTAL_DAYS`, `TODAY_LABEL` constants. Replace with a `defaultState()` factory that returns the empty `AppState` shape per ADR-018: `{ schemaVersion: 1, programStart: "", blocks: [], logs: {}, timers: {}, deletions: {} }`. The factory is exported but not yet wired to localStorage (that is the `persist` feature). Imports of the deleted constants must move to local placeholders inside `BuildingClient` for this feature only.
- `lib/types.ts` — Add `id: string` to both `Block` and `Brick` per the ADR-018 schema. Keep all existing fields (`start`, `end`, `name`, `category`, `bricks` on `Block`; `kind`, `name`, etc. on `Brick`) — later features will refine. The `id` is a plain string; uuid generation is the `add-block` / `add-brick` features' problem, not this one.
- `app/(building)/BuildingClient.tsx` — Initialize `const [blocks, setBlocks] = useState<Block[]>([])`. Remove the `BLOCKS` import. Remove `NOW`, `DAY_NUMBER`, `TOTAL_DAYS`, `TODAY_LABEL` imports. Replace each with a local placeholder constant inside the component (e.g. `const now = "00:00"`, `const dayNumber = undefined`, `const totalDays = 365`, `const dateLabel = ""`) — `live-clock` will replace these with derived values per ADR-020. `dayNumber` MUST be passed as `undefined` so Hero hides the day-counter line.
- `components/Hero.tsx` — Change `dayNumber` prop to optional (`dayNumber?: number`). When `dayNumber === undefined`, do NOT render the "Building N of 365" line at all (omit the JSX node, not just hide via CSS). When defined, render exactly as before.

**Verification (no refactor):**

- `BlueprintBar` is already conditionally rendered when `blocks.length > 0` — verify the conditional is still in place after the data wipe; do not refactor.
- `NowCard` is already conditionally rendered when a current block exists — verify; do not refactor.
- `Timeline` already shows `EmptyBlocks` when `blocks.length === 0` — verify the empty copy "No blocks yet. Tap + to add your first block." renders.

**Edge cases:** The empty path (Timeline → EmptyBlocks) is already wired from the prior Page 1 build. Hero must accept `pct={0}` without crashing or showing a negative tween value. `AnimatedPercent` already handles 0 correctly.

**Out of scope (this feature):** localStorage / hydration (`persist`), `useNow()` and live `dayNumber` derivation (`live-clock`), Add Block / Add Brick modals (`add-block`, `add-brick`), recurrence evaluation (`recurrence`), real `BrickTimer` (`brick-timer`), program-start flow.

### live-clock

**Context.** Per ADR-020, `now`, `today`, `dateLabel`, and `dayNumber` must be derived live from `Date()`, not constants. This feature replaces the `wipe-demo` placeholder values in `BuildingClient.tsx` with live derivations so the Hero shows the user's real clock and date. `programStart` persistence is deferred to the `persist` feature; this feature uses a local placeholder (`programStart = today()`) so `dayNumber === 1` until `persist` lands.

**Files added/modified:**

- `lib/useNow.ts` — **new**. `"use client"` React hook. Returns the current `HH:MM` string from `new Date()`. Subscribes to a 60s `setInterval` that calls `setState(formatHHMM(new Date()))`; cleans up on unmount. Does NOT respect `prefers-reduced-motion` for tick suppression — accessibility requires that displayed time information stay current. Animation-level reduced-motion is handled elsewhere (`AnimatedPercent`). Initial value computed from `new Date()` on mount; SSR-safe by returning `""` (or formatting the server-side `Date()`) on first render and updating after mount — the builder picks one and documents it.
- `lib/dharma.ts` — **add three pure helpers** (export named, no runtime side-effects, no Date inside default-args; the caller passes the Date or string in):
  - `today(d: Date = new Date()): string` — returns local-date ISO `YYYY-MM-DD` (use `d.getFullYear()`, `d.getMonth()+1`, `d.getDate()`, zero-padded). NOT UTC.
  - `dayNumber(programStart: string | null | undefined, today: string): number | undefined` — returns `floor((today - programStart) / 1d) + 1`. Returns `undefined` if `programStart` is null, undefined, or empty string. Implementation parses both ISO strings as local-midnight `Date` and divides by `86_400_000`.
  - `dateLabel(today: string): string` — returns `"Wed, Apr 29"` style. Format chosen: `Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(d)`. The result reads as `"Wed, Apr 29"` (comma after weekday, no leading zero on day). Document the fixed `en-US` locale in code comments — see SG-bld-11.
- `app/(building)/BuildingClient.tsx` — replace the `wipe-demo` placeholder constants:
  - `const now = useNow();` (replaces `const now = "00:00"`)
  - `const todayIso = today();` (new local)
  - `const programStart = todayIso;` (placeholder; the `persist` feature will replace this with the persisted value loaded from `localStorage`. Add a `// TODO(persist): load from AppState` comment.)
  - `const dayNumberValue = dayNumber(programStart, todayIso);` (replaces `const dayNumber = undefined`)
  - `const dateLabelValue = dateLabel(todayIso);` (replaces `const dateLabel = ""`)
  - Imports: `import { useNow } from "@/lib/useNow"`; `import { today, dayNumber, dateLabel } from "@/lib/dharma"`. Use renamed locals (`dayNumberValue`, `dateLabelValue`, `todayIso`) to avoid shadowing the imported helpers.
  - Pass `now={now}`, `dateLabel={dateLabelValue}`, `dayNumber={dayNumberValue}` to `<Hero>` and `<BlueprintBar>` as before. Hero will now render `"Building 1 of 365"` (because `programStart === today` → dayNumber=1).
- `components/Hero.tsx` — no behavioural change (already accepts `dayNumber` as optional from `wipe-demo`). Verify it renders `"Building 1 of 365"` when `dayNumber=1`.

**Edge cases.**

- **Midnight roll-over.** If the user keeps the page open across midnight, `useNow` ticks every 60s and triggers a re-render; on the next render `today()` returns the new ISO date and `dateLabel` updates. There is up to a 60s lag — acceptable for Phase 1.
- **`prefers-reduced-motion`.** Time/date updates are NOT suppressed. Reduced-motion only governs animation; the displayed clock value must stay current for accessibility (WCAG-aligned).
- **DST transition.** `today()` uses local-date components, so the day boundary stays consistent regardless of DST shifts. `dayNumber` math uses local-midnight Dates parsed from ISO strings, so a 23-hour or 25-hour DST day still produces the correct integer day delta.
- **`programStart` empty string.** `dayNumber("", today)` returns `undefined` — Hero hides the day-counter line.
- **Tests must inject a controlled clock.** Use `vi.useFakeTimers()` + `vi.setSystemTime(new Date("2026-04-29T11:47:00"))` for unit/component tests. Playwright tests are not retro-fitted in this feature — e2e clock injection is `persist`'s problem.

**Out of scope (this feature):** Persisting `programStart` to localStorage (`persist`). Wiring NowCard's pulsing dot to live `now` for current-block detection (no current block in empty state — defer until blocks exist). Reduced-motion for `AnimatedPercent` (already handled). E2E clock injection (deferred).

### Context

Page 1 is the at-a-glance daily routine surface — the only screen in Phase 1 that a user opens to "build today". It already exists in committed form (rendered by `app/page.tsx`) but predates the spec; this plan codifies what the spec demands so the builder can close the deltas test-first. Everything is read from the hardcoded sample in `lib/data.ts` (`NOW = "11:47"`, `DAY_NUMBER = 119`, weekday routine of 16 blocks); persistence and modals are out of scope for this feature.

### File structure

Create:

- `lib/scoring.ts` — pure scoring helpers (`buildingPct`) extracted/clarified per spec. Re-export existing `brickPct` / `blockPct` for a single import surface. (Avoid editing `lib/dharma.ts` semantics for `brickPct`/`blockPct`; only fix `dayPct` — see below.)
- `lib/scoring.test.ts` — unit tests for `buildingPct` and equal-weight semantics.
- `components/EditModeProvider.tsx` — `"use client"` React Context provider exposing `{ editMode: boolean; toggle(): void }`. Wraps the page client tree.
- `components/EditModeProvider.test.tsx` — provider unit tests.
- `app/(building)/BuildingClient.tsx` — `"use client"` wrapper that holds the brick-log mutable state (`blocks` from `lib/data.ts` cloned into `useState`), the `EditModeProvider`, and renders TopBar / Hero / BlueprintBar / NowCard / Timeline / BottomBar. Page 1 needs interactivity, so the page becomes a server-shell that mounts this client.
- `components/BrickStepper.tsx` — `"use client"` inline +/− stepper used by Goal and Time bricks in view mode.
- `components/EmptyBlocks.tsx` — empty-state copy when `blocks.length === 0`.
- `components/EmptyBricks.tsx` — empty-state copy when a block has `bricks.length === 0`.
- `tests/e2e/building.spec.ts` — Playwright e2e for Page 1.
- `tests/e2e/building.a11y.spec.ts` — `@axe-core/playwright` accessibility check.
- Component test files: `components/TopBar.test.tsx`, `components/Hero.test.tsx`, `components/BlueprintBar.test.tsx`, `components/NowCard.test.tsx`, `components/Timeline.test.tsx`, `components/TimelineBlock.test.tsx`, `components/Brick.test.tsx`, `components/Scaffold.test.tsx`, `components/BottomBar.test.tsx`, `components/AnimatedPercent.test.tsx`.

Modify:

- `lib/dharma.ts`
  - **Fix** `dayPct(blocks)` to be the **equal-weighted average of `blockPct`** (spec §Scoring: "All equal weight"). Current code is duration-weighted, which is a spec violation.
  - Add `buildingPct(blocks)` as an alias re-exported from `lib/scoring.ts` if extraction approach is preferred; otherwise keep `dayPct` as the canonical name and document the rename inside `lib/scoring.ts` re-export.
  - No other behaviour changes.
- `lib/dharma.test.ts` — add equal-weight expectations; existing tests stay green.
- `lib/data.ts` — convert `BLOCKS` to a `let` exported as a named const **but** keep value identical. Builder must not mutate the export; the client clones into local state on mount. (No structural change required if the builder chooses to clone in the client — leave as `const` and clone.)
- `app/page.tsx` — render the new `BuildingClient` instead of composing components directly. Must remain a server component.
- `components/TopBar.tsx` — add `aria-pressed` / data attribute for edit mode; consume `EditModeProvider`. Convert to client component (`"use client"`) because it must hook into context for the toggle.
- `components/TimelineBlock.tsx` — accept `onLogBrick` callback, add `data-testid="timeline-block"`, `data-status="past|current|future"`, render an `×` delete affordance per block when `editMode` is on (no-op handler — modal is out of scope; the icon must be present and have `aria-label="Delete block"`). Pass `editMode` down to bricks.
- `components/Brick.tsx` — accept `editMode` and `onLog` callbacks. In view mode, the entire brick is a `<button>` (so it has the 44px+ tap target after styling). In edit mode, surfaces an `×` button with `aria-label="Delete brick"`. For Tick: tap toggles `done`. For Goal/Time: tap opens an inline `BrickStepper` (popover anchored to the brick) that allows incrementing `current` and committing. Block % must update live from the parent's state.
- `components/NowCard.tsx` — accept `block` and `onLogBrick` callback; same brick-tap behaviour as Timeline. The pulsing dot + amber glow must be preserved.
- `components/BlueprintBar.tsx` — add `aria-label` describing block + use `data-testid="blueprint-segment"` on each segment so e2e can assert proportional widths. The NOW pin gets `data-testid="now-pin"` and `aria-label="Now 11:47"`.
- `components/BottomBar.tsx` — Voice Log button gets `aria-label="Voice Log"` (already labelled by text). The `+` button stays a no-op for this feature (modal is out of scope) but must keep `aria-label="Add"`.
- `components/AnimatedPercent.tsx` — already correct (1.6s ease-out cubic, reduced-motion respected). No change unless tests reveal a bug.

### Data model

Existing types in `lib/types.ts` are sufficient. Re-state for clarity:

```ts
type Category = "health" | "mind" | "career" | "passive";
type Brick =
  | { kind: "tick"; name: string; done: boolean }
  | {
      kind: "goal";
      name: string;
      current: number;
      target: number;
      unit?: string;
    }
  | { kind: "time"; name: string; current: number; target: number };
interface Block {
  start: string;
  end: string;
  name: string;
  category: Category;
  bricks: Brick[];
}
```

Page-1 client state:

```ts
type PageState = { blocks: Block[]; editMode: boolean };
```

**Persistence:** none in this feature. The hardcoded `BLOCKS` array seeds the client state on mount; mutations live in memory and are lost on refresh. Document this clearly so the builder does not silently introduce `localStorage`.

### Components

| Component          | Props                                             | Owned state                          | Children                                                                                   |
| ------------------ | ------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------ |
| `BuildingClient`   | none (reads from `lib/data.ts`)                   | `blocks: Block[]`                    | `EditModeProvider`, TopBar, Hero, BlueprintBar, NowCard?, Timeline, BottomBar, EmptyBlocks |
| `EditModeProvider` | `children`                                        | `editMode: boolean` via context      | n/a                                                                                        |
| `TopBar`           | none                                              | none (reads context)                 | Pencil button, Settings button                                                             |
| `Hero`             | `dateLabel`, `dayNumber`, `totalDays`, `pct`      | none (AnimatedPercent owns count-up) | `AnimatedPercent`                                                                          |
| `AnimatedPercent`  | `value`, `durationMs?`, `className?`              | local `n` (raf tween)                | n/a                                                                                        |
| `BlueprintBar`     | `blocks`, `now`                                   | none                                 | proportional segments + NOW pin + legend                                                   |
| `NowCard`          | `block`, `onLogBrick`                             | none                                 | `Brick[]`                                                                                  |
| `Timeline`         | `blocks`, `now`, `onLogBrick`                     | none                                 | `TimelineBlock[]` or `EmptyBlocks`                                                         |
| `TimelineBlock`    | `block`, `status`, `onLogBrick`                   | none                                 | `Scaffold`, `Brick[]` or `EmptyBricks`                                                     |
| `Brick`            | `brick`, `category`, `index`, `onLog`, `editMode` | local: stepper open                  | `BrickStepper` (when stepping)                                                             |
| `BrickStepper`     | `brick`, `onCommit(value)`, `onClose`             | local draft value                    | `+` / `−` / numeric input                                                                  |
| `Scaffold`         | `pct`, `category`, `height?`                      | local animated `h`                   | n/a                                                                                        |
| `BottomBar`        | none                                              | none                                 | Voice Log button, Add button                                                               |
| `EmptyBlocks`      | none                                              | none                                 | n/a                                                                                        |
| `EmptyBricks`      | none                                              | none                                 | n/a                                                                                        |

### Dependencies

No new dependencies. All required libraries (Next 15, Tailwind, lucide-react, motion, Vitest, Playwright, @axe-core/playwright, @testing-library/react, @testing-library/user-event) are already in `package.json`.

### Design tokens

Reuse from `app/globals.css` only. Do not invent new tokens.

| Purpose                  | Token / value                                                                                                                                                                                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page background          | `--bg` `#0a1628`                                                                                                                                                                                                                                                  |
| Card surface             | `--card` `#0f1d33`, edge `--card-edge` `#1e2d47`                                                                                                                                                                                                                  |
| Primary text             | `--ink` `#e2e8f0`                                                                                                                                                                                                                                                 |
| Secondary text           | `--ink-dim` `#94a3b8`                                                                                                                                                                                                                                             |
| Tertiary text            | `--ink-faint` `#64748b`                                                                                                                                                                                                                                           |
| Accent (amber)           | `--amber` `#fbbf24`, `--amber-deep` `#b45309`, `--amber-glow` `#f59e0b`                                                                                                                                                                                           |
| Category — Health        | `--health` `#34d399`                                                                                                                                                                                                                                              |
| Category — Mind          | `--mind` `#c4b5fd`                                                                                                                                                                                                                                                |
| Category — Career        | `--career` `#fbbf24`                                                                                                                                                                                                                                              |
| Category — Passive       | `--passive` `#64748b`                                                                                                                                                                                                                                             |
| Body grid                | `--grid`, `--grid-strong`                                                                                                                                                                                                                                         |
| Hero numerals            | `font-serif-italic` (Instrument Serif italic 400) at 112px                                                                                                                                                                                                        |
| Body / monospace         | `--font-jetbrains-mono`                                                                                                                                                                                                                                           |
| Hero count-up            | 1600 ms, easing `1 - (1 - p)^3` (cubic ease-out)                                                                                                                                                                                                                  |
| Scaffold fill transition | 800 ms `cubic-bezier(0.2,0.8,0.2,1)`                                                                                                                                                                                                                              |
| NOW glow pulse           | `glow-pulse` 2.6 s ease-in-out infinite                                                                                                                                                                                                                           |
| NOW dot pulse            | `dot-pulse` 1.4 s ease-in-out infinite                                                                                                                                                                                                                            |
| NOW ring ping            | `ring-ping` 1.6 s `cubic-bezier(0,0,0.2,1)` infinite                                                                                                                                                                                                              |
| Brick stagger fade-in    | `brick-in` 380 ms cubic, `index * 35ms` delay                                                                                                                                                                                                                     |
| Reduced motion           | `@media (prefers-reduced-motion: reduce)` already disables `brick-in`, `now-glow`, `dot-pulse`, `ring-ping`, `scaffold__fill`. `AnimatedPercent` reads `matchMedia` and snaps to final value.                                                                     |
| Page max width           | `max-w-[430px]`                                                                                                                                                                                                                                                   |
| Touch target floor       | `h-12` (48 px) for primary buttons; `h-9 w-9` (36 px) for TopBar buttons — **flag**: spec says ≥44px; current TopBar buttons are 36px. Increase to `h-11 w-11` (44 px) per spec. Bricks must also meet 44 px when interactive in view mode (use padded hit area). |

### Edge cases

- **Empty blocks** — `blocks.length === 0` → render `EmptyBlocks` ("No blocks yet. Tap + to add your first block.") in place of Timeline; hide BlueprintBar and NowCard. Hero `pct` shows 0.
- **Empty bricks** — block with `bricks.length === 0` → render "No bricks yet. Tap + to add a brick." inside the block; `blockPct` is 0.
- **No current block** — `currentBlockIndex` returns `-1` (e.g. NOW falls outside any block — not possible with current 24h-covering data, but possible with sparse data). Skip NowCard render; do not crash.
- **Midnight-wrapping block** (e.g. Sleep 22:00→04:00) — already handled by `duration` and `dayOffset`. Tests must include this case.
- **Reduced motion** — `AnimatedPercent` snaps to final value; CSS animations disabled by global media query. Verify in axe-only spec that no `prefers-reduced-motion` regression.
- **Long block names** — truncate with `truncate` (already done in `TimelineBlock`); verify name like "Building AI for the Apocalypse" does not overflow card.
- **Goal brick over target** (e.g. `current: 150, target: 100`) — `brickPct` caps at 100; UI shows 100%, raw `current/target` label still visible.
- **Time brick over target** — same cap behaviour.
- **Tap during edit mode** — bricks must NOT log; only the `×` affordance is active. Block tap is also a no-op (the Edit Block modal is out of scope).
- **`%` rounding** — Hero shows `Math.round`; sub-1% changes still feel responsive because `AnimatedPercent` interpolates. Verify Hero never shows `100%` unless every brick is full.
- **Locale / time format** — all times are `HH:MM` 24h; date label is hardcoded `Wed, Apr 29`. Acceptable for Page 1; flag in spec gaps.
- **Slow network / no JS** — page must render server-side first paint with the _current_ `dayPct` from `lib/dharma.ts` (so the percent number appears even before the count-up tween runs). `AnimatedPercent` is allowed to start at 0 and tween up; document this.
- **Viewport ≤ 360 px** — content must not horizontally scroll. The `max-w-[430px]` page is centered but always full-width on small screens.

### Out of scope

- Add Block modal, Edit Block modal, Add Brick modal, Block Detail screen.
- Swipe-left to delete; long-press drag-reorder; drag handles on bricks.
- Recurrence picker ("Just today / Every Monday / …").
- Copy Building / Castle flows.
- Voice Log behaviour (button is visible and labelled; tap currently no-op).
- Real persistence (localStorage / sync). State is in-memory only.
- Settings page (button is visible; tap currently no-op).
- Week / Month / Year views.
- Real-time clock — `NOW` stays the constant `"11:47"` from `lib/data.ts`.
- Editing block name/start/end inline — only the `×` icon visibility is in scope; the actual delete confirmation modal is deferred.

---

## Milestone 0 — Design System — Plan

### Context

M0 is the foundation milestone. No feature ships before it. This dispatch builds the token layer (CSS vars, motion, haptics) and 10 reusable primitives that every later milestone (M1..M10) composes from. The pre-pivot Page-1 build leaked feature-specific styles directly into `app/globals.css`; M0 inverts that — components consume tokens, never hex literals — and re-grounds the palette on the new `#07090f` deep-navy bg per ADR-011 + phase1plan.md. Built once, reused forever.

### File structure

Create:

- `app/_design/page.tsx` — primitives harness page. Renders all 10 primitives in every documented state (default / hover / active / disabled / loading / empty / error where applicable). Server component; client wrappers used only for stateful primitives. Includes a contrast-pair table at the bottom rendered with raw `style={{ color, background }}` so axe scans every documented combo.
- `app/_design/layout.tsx` — `"use client"` wrapper applying `max-w-[430px] mx-auto` page shell + `data-testid="design-harness"`.
- `lib/motion.ts` — exported motion tokens (durations, easings, spring configs, stagger delay). No runtime side-effects.
- `lib/haptics.ts` — `haptics.light()` / `.medium()` / `.success()` / `.notification()` helpers built on `navigator.vibrate()` with iOS PWA fallback (silent no-op when `vibrate` is undefined). Exports a `HapticEvent` enum for callers.
- `lib/reducedMotion.ts` — `usePrefersReducedMotion(): boolean` hook reading `window.matchMedia("(prefers-reduced-motion: reduce)")` with SSR-safe initial value (`false`) and a `change` listener.
- `components/ui/Button.tsx`
- `components/ui/Modal.tsx`
- `components/ui/Sheet.tsx`
- `components/ui/Chip.tsx`
- `components/ui/Input.tsx`
- `components/ui/Stepper.tsx`
- `components/ui/Toggle.tsx`
- `components/ui/EmptyState.tsx`
- `components/ui/BlockCard.tsx`
- `components/ui/BrickChip.tsx`
- `components/ui/index.ts` — barrel export of all 10 primitives.
- `components/ui/README.md` — per-primitive doc: props, variants, when-to-use / when-not-to-use, why dark-mode-only.
- Vitest test files colocated next to each primitive: `components/ui/Button.test.tsx`, `Modal.test.tsx`, `Sheet.test.tsx`, `Chip.test.tsx`, `Input.test.tsx`, `Stepper.test.tsx`, `Toggle.test.tsx`, `EmptyState.test.tsx`, `BlockCard.test.tsx`, `BrickChip.test.tsx`.
- `lib/motion.test.ts`, `lib/haptics.test.ts`, `lib/reducedMotion.test.ts`.
- `tests/e2e/design.spec.ts` — Playwright e2e: harness renders, every primitive visible, touch-target pixel-measurement (≥44px), reduced-motion emulation collapses transitions.
- `tests/e2e/design.a11y.spec.ts` — `@axe-core/playwright` run on `/_design` with zero violations.

Modify:

- `app/globals.css` — re-base palette per phase1plan.md M0 § Color Tokens (see token table). Adds full type-scale CSS vars (`--fs-10`..`--fs-64`), spacing-scale vars (`--sp-4`..`--sp-48`), motion-duration + easing vars, and safe-area utilities (`--safe-bottom`, `--safe-top`). Old Page-1-specific classes (`.brick`, `.scaffold`, animation keyframes used only by NowCard, etc.) are **kept for now** — M1 cleanup will rewire them to the primitives. Do NOT delete them this milestone (they would break the running pre-pivot Page 1).
- `app/layout.tsx` — extend the existing `next/font` wiring: keep `Instrument_Serif` (italic, 400) and `JetBrains_Mono` (400/500/700); **add `Geist` sans** as the body font with `variable: "--font-geist-sans"`. Update `<html>` className to include `geist.variable`. Body font-family in globals.css switches to `var(--font-geist-sans)` with `JetBrains_Mono` reserved for UI labels and timestamps per phase1plan.md typography rules.
- `app/_design/page.tsx` route is excluded from production builds via Next.js convention (`_design` underscore prefix is treated as private route in App Router). Verify the route is reachable in dev and Playwright but not surfaced from `app/page.tsx`.

### Data model

M0 has minimal runtime data. The only shared types added:

```ts
// lib/motion.ts
export type Duration =
  | "tap" // 100ms
  | "brickFill" // 600ms
  | "modalIn" // spring
  | "modalOut" // 220ms
  | "longPress" // 180ms
  | "stagger"; // 30ms (per-sibling delay)

export type Easing = "easeOut" | "easeInOut" | "spring" | "linear";

export interface MotionToken {
  durationMs: number; // collapsed to 0 under reduced-motion
  easing: string; // CSS easing or "spring"
}

// lib/haptics.ts
export type HapticEvent =
  | "light" // brick tap
  | "medium" // drag start, long-press lift
  | "success" // block 100%
  | "notification"; // day 100%
```

No persistence introduced in M0. The locked `AppState` (phase1plan.md § Shared Data Model) does **not** crystallise here — schema lands at M2. Primitives are stateless except for local UI state (e.g. `<Modal>` open, `<Stepper>` current value) owned by their callers.

### Components

All primitives use `class-variance-authority` (`cva`) for variants per ADR-004 and accept a final `className` prop merged via the existing `cn()` helper in `lib/utils.ts` (already shipped). All interactive primitives forward refs and accept `data-testid` for harness assertions. All have `disabled` support where applicable.

| Primitive      | Props (typed)                                                                                                                                                                                                                                                                                                                                                                                                    | Owned state                               | Children / variants                                                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `<Button>`     | `variant: "primary" \| "secondary" \| "ghost"`, `size: "sm" \| "md" \| "lg"`, `loading?: boolean`, `disabled?: boolean`, `onClick`, `className`, `children`, plus all `<button>` HTML attrs                                                                                                                                                                                                                      | none (loading is parent-owned)            | `cva` shape: `buttonVariants({ variant, size })`. `loading` swaps children for an inline spinner; remains 44px+ tall.                 |
| `<Modal>`      | `open: boolean`, `onClose(): void`, `title?: string`, `children`, `className?`. Bottom-sheet variant only in M0.                                                                                                                                                                                                                                                                                                 | none (parent owns `open`)                 | Backdrop + sheet, spring open via `motion/react`. Respects `--safe-bottom`. ESC + backdrop click both call `onClose`.                 |
| `<Sheet>`      | `open: boolean`, `onClose(): void`, `title?: string`, `children`, `className?`. Full-screen variant.                                                                                                                                                                                                                                                                                                             | none                                      | Slide-in from right at desktop, full-screen takeover ≤430px. Same close affordances as Modal.                                         |
| `<Chip>`       | `selected?: boolean`, `tone?: "neutral" \| "category-health" \| "category-mind" \| "category-career" \| "category-passive"`, `size?: "sm" \| "md"`, `onClick?`, `disabled?`, `children`, `className?`                                                                                                                                                                                                            | none                                      | `cva` variants. Selected state has filled bg; unselected outlined. 44×44 hit area enforced via padded wrapper when `size === "sm"`.   |
| `<Input>`      | `type: "text" \| "time" \| "number"`, `value`, `onChange(value)`, `placeholder?`, `error?: string`, `disabled?`, `label?`, `id`, `className?`                                                                                                                                                                                                                                                                    | none (controlled)                         | Renders `<label>` + `<input>` + error text. Error state colored with `--accent-deep`. 44px+ tall. Numeric uses `inputMode="numeric"`. |
| `<Stepper>`    | `value: number`, `onChange(next: number)`, `min?: number`, `max?: number`, `step?: number` (default 1), `disabled?`, `unit?: string`, `className?`                                                                                                                                                                                                                                                               | local: long-press timer, accel multiplier | `−` / value / `+`. Long-press accelerates (caps 10×). Stops at min/max. Haptic light on each commit.                                  |
| `<Toggle>`     | `pressed: boolean`, `onPressedChange(next: boolean)`, `label: string` (visually hidden, used for `aria-label`), `disabled?`, `className?`                                                                                                                                                                                                                                                                        | none (controlled)                         | iOS-style switch. `aria-pressed`. 44×44 hit area. Used by edit-mode lock/unlock in M5; M0 just renders the primitive.                 |
| `<EmptyState>` | `message: string`, `tone?: "neutral" \| "info"`, `pulse?: boolean` (default true), `actionLabel?: string`, `onAction?(): void`, `className?`                                                                                                                                                                                                                                                                     | none                                      | Card with subtle pulse animation; honors reduced-motion (no pulse). Optional CTA button uses `<Button variant="ghost">`.              |
| `<BlockCard>`  | `name: string`, `start: string` (HH:MM), `end: string`, `category: Category`, `status: "past" \| "current" \| "future"`, `pct: number` (0..100), `onClick?`, `editMode?: boolean`, `onDelete?(): void`, `children?`, `className?`                                                                                                                                                                                | none                                      | Container + scaffold-bar (left) + content. `editMode` shows `×` per ADR-008. `current` adds glow-pulse. `pct` drives scaffold fill.   |
| `<BrickChip>`  | Discriminated by `kind`: `tick: { kind: "tick"; name: string; done: boolean; onToggle?(): void }` ⏐ `goal: { kind: "goal"; name: string; current: number; target: number; unit?: string; onCommit?(n: number): void }` ⏐ `time: { kind: "time"; name: string; accumulatedSec: number; targetSec: number; running?: boolean; onToggle?(): void }`. Plus shared `editMode?`, `onDelete?`, `category`, `className`. | local: stepper popover open (goal only)   | Three sub-variants render distinct visuals (tick chip vs goal pill vs time ring). All meet 44px hit area in interactive states.       |

`Category` is imported from the locked schema in phase1plan.md (`type Category = "health" | "mind" | "career" | "passive"`). Defined locally in `components/ui/types.ts` for M0; will move to `lib/types.ts` at M2 when AppState lands.

`cva` variant signatures live in each primitive file. Example for `<Button>`:

```ts
const buttonVariants = cva(
  "inline-flex items-center justify-center font-mono uppercase tracking-wide transition-transform active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "bg-[--accent] text-[--bg] hover:brightness-110",
        secondary:
          "border border-[--ink-dim] text-[--ink] hover:bg-[--bg-elev]",
        ghost: "text-[--ink-dim] hover:text-[--ink]",
      },
      size: {
        sm: "h-9 px-3 text-[--fs-12] min-w-[44px]",
        md: "h-11 px-4 text-[--fs-14] min-w-[44px]",
        lg: "h-12 px-6 text-[--fs-16] min-w-[44px]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);
```

Builders may copy this pattern for the other primitives; tests assert the rendered class list contains the expected variant.

### Dependencies

No new npm dependencies. `class-variance-authority`, `clsx`, `tailwind-merge`, `motion`, `tailwindcss-animate`, `lucide-react`, `@axe-core/playwright`, `@testing-library/*`, `vitest`, `@playwright/test` are all present in `package.json`.

`Geist` sans loads via `next/font/google` (already wired pattern — same as `Instrument_Serif`). No package install needed.

### Design tokens

All tokens land in `app/globals.css` `:root`. Hex values from phase1plan.md M0 § Color Tokens take precedence over the spec-table values where they differ (the spec lists category-color hex codes redundantly with phase1plan.md; phase1plan.md is canonical for M0 per the orchestrator's note).

**Colors (re-based per ADR-011 + phase1plan.md):**

| Spec name        | CSS var         | Hex / value            | Use                                                            |
| ---------------- | --------------- | ---------------------- | -------------------------------------------------------------- |
| bg               | `--bg`          | `#07090f`              | Page background (deep navy, replaces `#0a1628`)                |
| bg-elev          | `--bg-elev`     | `#0c1018`              | Card, modal, sheet surfaces                                    |
| ink              | `--ink`         | `#f5f1e8`              | Primary text (warm white) — must hit 4.5:1 on `--bg`           |
| ink-dim          | `--ink-dim`     | `rgba(245,241,232,.5)` | Secondary text — re-verified for ≥4.5:1 small text per ADR-011 |
| accent           | `--accent`      | `#fbbf24`              | Primary CTA (fired amber)                                      |
| accent-deep      | `--accent-deep` | `#d97706`              | Pressed / error states                                         |
| category-health  | `--cat-health`  | `#34d399`              | Health bricks/blocks                                           |
| category-mind    | `--cat-mind`    | `#c4b5fd`              | Mind bricks/blocks                                             |
| category-career  | `--cat-career`  | `#fbbf24`              | Career (== accent — documented dual purpose)                   |
| category-passive | `--cat-passive` | `#64748b`              | Passive bricks/blocks                                          |

Old Page-1 vars (`--card`, `--card-edge`, `--ink-faint`, `--amber`, `--amber-deep`, `--amber-glow`, `--health`, `--mind`, `--career`, `--passive`, `--grid`, `--grid-strong`) **stay in globals.css for now** — Page 1 still consumes them. M1 will alias them to the new vars and M5 will remove the duplicates. Document this in `components/ui/README.md`.

**Typography:**

| Token            | Value                                                               |
| ---------------- | ------------------------------------------------------------------- |
| `--font-display` | `var(--font-instrument-serif)` (italic 400) — Hero %, big numerals  |
| `--font-ui`      | `var(--font-jetbrains-mono)` (400/500/700) — block names, UI labels |
| `--font-body`    | `var(--font-geist-sans)` (variable, `display: swap`) — body copy    |
| `--fs-10`        | `0.625rem`                                                          |
| `--fs-12`        | `0.75rem`                                                           |
| `--fs-14`        | `0.875rem`                                                          |
| `--fs-16`        | `1rem`                                                              |
| `--fs-22`        | `1.375rem`                                                          |
| `--fs-32`        | `2rem`                                                              |
| `--fs-64`        | `4rem`                                                              |

**Spacing (`--sp-N` = N px):** `--sp-4: 4px`, `--sp-8: 8px`, `--sp-12: 12px`, `--sp-16: 16px`, `--sp-24: 24px`, `--sp-32: 32px`, `--sp-48: 48px`. Tailwind's spacing scale already covers these — vars exist so JS / motion-token consumers can read the same numbers.

**Motion (per phase1plan.md):**

| Token       | CSS var               | Value                                                          | Notes                                        |
| ----------- | --------------------- | -------------------------------------------------------------- | -------------------------------------------- |
| Tap         | `--motion-tap`        | `100ms ease-out`, scale `0.96`                                 | Used by `<Button>` `active:scale-[0.96]`     |
| Brick fill  | `--motion-brick-fill` | `600ms cubic-bezier(.4,0,.2,1)`                                | Width transition for `<BrickChip>` goal/time |
| Block bloom | `--motion-bloom`      | spring `{ stiffness: 220, damping: 22 }` (motion/react) + glow | `<BlockCard>` 100% state                     |
| Modal in    | `--motion-modal-in`   | spring `{ stiffness: 320, damping: 30 }` from `y: 100%`        | `<Modal>`                                    |
| Modal out   | `--motion-modal-out`  | `220ms ease-in`, fade + slide                                  | `<Modal>` close                              |
| FLIP / page | `--motion-flip`       | `360ms cubic-bezier(.2,.8,.2,1)`                               | Layout animations (M3+ uses this)            |
| Long-press  | `--motion-long-press` | `180ms ease-out`, scale 1.02 + shadow                          | `<BlockCard>` lift, `<Stepper>` accel        |
| Stagger     | `--motion-stagger`    | `30ms` per sibling                                             | List entry; cap at 10× delay                 |

`lib/motion.ts` exports the same numbers as JS objects so motion components can read them without parsing CSS. Reduced-motion collapse rule: `usePrefersReducedMotion() === true` → all `durationMs` collapse to `0`, springs become hard-cuts, FLIP becomes instant, bloom becomes a static glow (drop-shadow without animation), stagger delay becomes `0`. Implemented as a single `getMotion(token, reduced)` helper plus a global `@media (prefers-reduced-motion: reduce)` block in `globals.css` that disables CSS-driven transitions/animations for all `[data-motion]`-tagged elements.

**Haptics (`lib/haptics.ts`):**

| Event          | Method                                    | Pattern (ms)       |
| -------------- | ----------------------------------------- | ------------------ |
| `light`        | `navigator.vibrate(10)`                   | `[10]`             |
| `medium`       | `navigator.vibrate(20)`                   | `[20]`             |
| `success`      | `navigator.vibrate([15, 30, 15])`         | three quick pulses |
| `notification` | `navigator.vibrate([20, 40, 20, 40, 20])` | five pulses        |

When `typeof navigator.vibrate !== "function"` (iOS Safari) → silent no-op. No throw. Test asserts the no-op path with `vi.spyOn(navigator, "vibrate")` undefined.

**Safe area:** `--safe-bottom: env(safe-area-inset-bottom)` and `--safe-top: env(safe-area-inset-top)` exposed as CSS vars; `<Modal>` and `<Sheet>` consume them via `padding-bottom: var(--safe-bottom)`.

### Edge cases

Mirroring spec.md M0 § Edge cases — every entry has a planned handling:

1. **`prefers-reduced-motion`** → `usePrefersReducedMotion()` hook + `@media (prefers-reduced-motion: reduce)` block. Motion durations collapse to 0; FLIP becomes hard-cut; bloom becomes static glow (drop-shadow with no keyframes); EmptyState pulse disabled; Stepper accel still works (it's input behaviour, not animation).
2. **430px viewport** → harness page wraps everything in `max-w-[430px] mx-auto`. Each primitive's interactive surface ≥44px enforced via `min-h-[44px] min-w-[44px]` on hit-area wrappers; verified by Playwright `boundingBox()` measurement test.
3. **Token contrast on `#07090f`** → `--ink` (`#f5f1e8`) yields ~17.5:1 (passes AAA). `--ink-dim` `rgba(245,241,232,.5)` against `--bg` yields ~8.7:1 (passes AA for body text). `--accent` (`#fbbf24`) yields ~13:1 against `--bg` (passes AA for UI components). Category dots are non-text — ≥3:1 required and met. Verified by axe in `tests/e2e/design.a11y.spec.ts` and a Vitest unit test that computes contrast ratio with `culori` (NOT a new dep — ratios are precomputed and asserted as constants; no runtime ratio calc shipped).
4. **Empty / loading / error states** → every primitive that holds data has all three documented in the harness. `<Button loading>`, `<Input error="…">`, `<Stepper disabled>`, `<EmptyState />`, `<Modal open={false}>` (off state), `<BlockCard pct={0}>`, `<BrickChip kind="tick" done={false}>`, etc.
5. **Long-press accelerator on Stepper** → `<Stepper>` ramps the per-tick rate from 1× to 10× over 1.5s of held press; caps at 10×. Tested by `vi.useFakeTimers()` + `userEvent.pointer({ keys: "[MouseLeft>]" })` simulation, asserting commit count over a 3s held press.
6. **Modal/Sheet on iOS Safari** → `padding-bottom: var(--safe-bottom)` on the sheet root + `viewport-fit=cover` already in `app/layout.tsx` viewport metadata. Bottom-anchored CTAs (`<Button>` inside `<Modal>`) sit above the home-indicator inset.
7. **Font loading** → `next/font` already uses `display: "swap"` for both fonts; Geist added with the same. Body falls back to system UI (`ui-sans-serif`) until Geist loads. No FOIT.
8. **Haptics on iOS PWA** → `lib/haptics.ts` checks `typeof navigator.vibrate === "function"` before calling; otherwise silent. Documented limitation.
9. **Dark mode only** → `components/ui/README.md` documents the rationale: Phase 1 ships dark-mode-only because the routine-tracker context (early morning, late night, focus modes) is dark-dominant; light mode adds testing and design surface area without proven user demand. Reconsider at Phase 2.

### Out of scope

This milestone explicitly does NOT include:

- Any Block / Brick rendering with real data (`<BlockCard>` and `<BrickChip>` are primitives only — wired into actual pages at M1+).
- Scoring math (`brickPct`, `blockPct`, `dayPct`) — already exists in `lib/dharma.ts` and `lib/scoring.ts` from the pre-pivot build; not touched here.
- Recurrence helpers (`appliesOn`, `currentDayBlocks`) — M9.
- localStorage persistence (`loadState`, `saveState`, `usePersistedState`) — M8.
- Calendar nav (Castle / Kingdom / Empire) — M9.
- Voice Log primitives (waveform, transcript) — M10.
- The actual edit-mode toggle behaviour — `<Toggle>` is built; wiring into a global edit-mode context is M5.
- Drag-handle visuals — M6.
- The current real Page-1 surface at `app/page.tsx` — stays as-is. M1 will rewire it to consume primitives. Demo wipe is already done in the prior pivot.
- Light-mode tokens.
- Storybook proper — `app/_design/page.tsx` is the lightweight equivalent.
- Wiring Geist into existing Page 1 components (M1's job).
- Removing legacy CSS classes in `globals.css` (`.brick`, `.scaffold`, `.now-glow`, etc.) — kept until M5; M0 only adds the new token layer alongside.

### Migration plan for the 94 pre-pivot test IDs

The previous 8-feature empty-toolkit pivot left 94 test IDs in `/docs/tests.md` (25× `U-bld-*`, 40× `C-bld-*`, 24× `E-bld-*`, 5× `A-bld-*`). The next dispatch (`mode: TESTS`) will translate this into a migration table at the top of the new tests.md M0 section. Tagging plan by ID range:

- **`U-bld-001..009`** — `[survives]`. Pure scoring helpers (`brickPct`, `blockPct`, `dayPct`, `currentBlockIndex`, `formatTime`, etc.) in `lib/dharma.ts` / `lib/scoring.ts`. M0 does not touch these helpers; behaviour unchanged. Tests stay green as-is.
- **`U-bld-010..016`** — `[survives]`. Type / data-shape assertions on `lib/types.ts` and `lib/data.ts`. Wipe-demo already turned `lib/data.ts` into `defaultState()`; the asserted shape still holds.
- **`U-bld-017..019`** — `[re-author: brick label semantics moved to <BrickChip> primitive]`. The legacy IDs assert `brickLabel()` strings on `lib/dharma.ts`. M0's `<BrickChip>` owns its own label rendering and aria-labels per ADR-016; the helper may stay but the assertion target shifts to the primitive in M1+.
- **`U-bld-020..021`** — `[survives]`. Date helpers (`today`, `dayNumber`, `dateLabel`) from `live-clock`. Untouched in M0.
- **`U-bld-022..025`** — `[survives]`. Live-clock unit tests for `useNow` SSR-safety, midnight-rollover, DST. Untouched.
- **`C-bld-001..010`** — `[re-author: token names changed (--bg #07090f), some assertions on bg color literals will fail]`. TopBar / Hero / BlueprintBar component tests that hard-code `#0a1628` or `bg-[--bg]` class checks. Tests survive structurally; only the expected values change. M1 dispatch will own the re-author.
- **`C-bld-011..025`** — `[survives]`. NowCard / Timeline / TimelineBlock / Brick / Scaffold tests asserting structural behaviour (data-testids, aria-labels, status states). M0 does not touch these components.
- **`C-bld-026..033`** — `[survives]`. BottomBar, EmptyBlocks, EmptyBricks, AnimatedPercent. Untouched in M0.
- **`C-bld-034..038`** — `[survives]`. Wipe-demo component assertions (Hero hides "Building N of 365" when dayNumber undefined; Timeline empty-state copy; etc.). Untouched.
- **`C-bld-039..040`** — `[survives]`. Live-clock component tests (Hero renders "Building 1 of 365" when programStart === today; BlueprintBar consumes live now). Untouched.
- **`E-bld-001..021`** — `[survives]` for the most part; **`[re-author]` for any that screenshot-compare against the old `#0a1628` bg**. None of the pre-pivot e2e tests appear to do pixel-comparison on bg color (they assert text and visibility), so flag this as a **deferred audit** during the M1 re-author dispatch — not an M0 concern. M0 adds new e2e in `tests/e2e/design.spec.ts`; pre-pivot e2e stays parallel.
- **`E-bld-022..024`** — `[survives]`. Wipe-demo e2e (page renders empty state, Hero shows 0%, no hardcoded blocks visible). Untouched.
- **`A-bld-001..005`** — `[re-author: ink-dim contrast re-verified on new #07090f bg]`. ADR-011 already moved `--ink-faint` text to `--ink-dim`; M0 changes `--ink-dim` from `#94a3b8` to `rgba(245,241,232,.5)`. The contrast calculation differs on the new bg, but axe runs at runtime so the assertions ("0 violations") survive structurally — only the underlying ratios shift. Verify in M0's `tests/e2e/design.a11y.spec.ts`. If axe finds a regression on Page 1 with the new vars, that's a deferred M1 concern (surface as a spec gap).

The mode: TESTS dispatch will format the above into a proper table at the top of `tests.md` and start fresh M0 IDs from `U-m0-001`, `C-m0-001`, `E-m0-001`, `A-m0-001`.

### Spec gaps

- **None blocking.** Spec.md M0 § Acceptance and phase1plan.md M0 § Acceptance are internally consistent. Geist Sans is named in spec.md but not in phase1plan.md M0 typography — phase1plan.md says "Geist Sans (or Inter as fallback)" so the M0 build wires Geist via `next/font` and falls back to system UI; no gap.
- **Note (not a gap):** SG-bld-13..19 are open in phase1plan.md but all target M4..M10. None block M0.
- **Note (not a gap):** the route choice `app/_design/page.tsx` (vs. `app/(design)/page.tsx` or a non-route Storybook) is a builder-level decision; the underscore-prefix convention keeps it out of production routing and reachable only in dev. If Next.js 16 changes the convention, builder picks the closest equivalent and notes it in `components/ui/README.md`.
