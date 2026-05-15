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

---

## Milestone 1 — Empty Building Shell — Plan

### Context

M1 is the spatial canvas. It renders the seven user-visible regions of the daily "Building" surface — top bar, hero, Day Blueprint bar, 24-hour vertical timeline with hour labels and amber now-line, empty-state card, floating dock, and the page composition that holds them — in a fully empty state per ADR-039 (Dharma ships empty: no factory habits, no seed blocks, no demo bricks). This is the skeleton every later milestone hangs muscle on (M2 wires `+`, M3 fills the hero, M9 wires Castle/Kingdom/Empire, M10 wires Voice). M1 must deliver the spatial metaphor and chrome layout on a real iPhone viewport before any interaction is wired, because once blocks exist the timeline math is harder to verify.

The existing prior-pivot components (`components/TopBar.tsx`, `components/Hero.tsx`, `components/BlueprintBar.tsx`, `components/Timeline.tsx`, `components/EmptyBlocks.tsx`, `components/BottomBar.tsx`, plus the deeper layer of `NowCard.tsx`, `TimelineBlock.tsx`, `Brick.tsx`, `BrickStepper.tsx`, `Scaffold.tsx`, `EmptyBricks.tsx`) all exist already. Most of the chrome they implement matches M1's SPEC closely enough that wholesale rewrites would be wasteful. M1 is therefore a **migration audit** of the prior pivot, not a rewrite: each file gets a `[survives]` / `[re-author: <reason>]` / `[obsolete: not-imported-in-M1]` tag below, and the work is tightly scoped to (a) replacing the BlueprintBar's stacked-segments rendering with an empty outline + faint grid (zero categories exist yet per ADR-032/033/039), (b) re-authoring the Timeline to render a 24-hour vertical column with hour labels and the amber now-line described in SPEC § Outputs (the prior Timeline was a simple list of block cards with no hour grid), (c) ensuring NowCard / TimelineBlock / Brick / etc. are **not** imported in M1's render path so the empty page has no DOM ghosts of the M2+ components, and (d) updating EmptyBlocks to use the locked SPEC copy ("Tap any slot to lay your first block.") via the M0 `<EmptyState>` primitive. Reaffirming ADR-039: zero seed data, zero demo content, zero factory categories.

### File structure

**Create:**

- `components/NowLine.tsx` — `"use client"` presentational component. Props: `{ now: string; "data-testid"?: string }`. Renders a horizontal amber rule (`background: var(--accent)`) absolute-positioned inside its parent (the Timeline's hour-grid column) at the pixel offset corresponding to `now`. Uses the new `lib/timeOffset.ts` helper to convert `"HH:MM"` to a pixel offset against a fixed `HOUR_HEIGHT_PX` constant (recommended `64px` per § Components). Honors `prefers-reduced-motion` by **omitting** any transition on `top`/`transform` updates (the new value snaps; no animated slide). Carries `aria-label="Now ${now}"` for SR users; `role="img"` so the ruling is exposed as a single landmark, not a stray div. Imports from existing flat `/components/`; no `/components/building/*` subdir.
- `lib/dayOfYear.ts` — pure helper: `dayOfYear(date: Date): number` returns 1..366. Uses local-date components (per the precedent set by `today()` in `lib/dharma.ts`) so DST and timezone shifts do not move the day boundary. Leap-year handling falls out of the implementation when computing UTC-stable day-of-year. Also exports `daysInYear(date: Date): number` returning 365 or 366 for the SPEC's "Building N of 365|366" hero line.
- `lib/timeOffset.ts` — pure helpers for the timeline's vertical math:
  - `timeToOffsetPx(hhmm: string, hourHeightPx: number): number` — converts `"HH:MM"` (`"00:00"`–`"23:59"`) to a pixel offset from the timeline's 00:00 origin. Pure; no Date dependency. Clamps inputs outside `[0, 23:59]` to the boundaries (returns `0` for negative offsets, `24 * hourHeightPx` for ≥24:00).
  - `clampOffsetPx(offsetPx: number, hourHeightPx: number): number` — guards now-line position to the timeline's pixel range `[0, 24 * hourHeightPx]`. Defends against off-by-one when `now === "23:59"` rounds to a position past the bottom-most label.
- `tests/e2e/m1.spec.ts` — Playwright e2e for the M1 empty Building surface (file path declared; bodies authored by BUILDER, IDs from `tests.md`).
- `tests/e2e/m1.a11y.spec.ts` — `@axe-core/playwright` accessibility check against `/` (file path declared; body by BUILDER).

**Modify:**

- `app/page.tsx` — `[survives]` (1-line server shell that mounts `BuildingClient`). No edit required if BuildingClient swaps to M1's render tree; verify the import path remains `./(building)/BuildingClient`.
- `app/(building)/BuildingClient.tsx` — `[re-author: replace M0-era render tree with M1's seven regions; remove imports of NowCard, TimelineBlock, Brick, etc. so they are NOT in the DOM]`. Specifically: (a) drop the `BlueprintBar` conditional (`blocks.length > 0 && …`) — M1 SPEC § AC #8 requires the BlueprintBar to render in its empty-outline state with zero segments **always** in M1, even with `blocks.length === 0`, so it must be unconditional in this milestone; (b) drop the `NowCard` conditional rendering and remove the import (SPEC § AC #13: "NowCard component is NOT rendered"); (c) remove `currentBlockIndex` and `dayPct` calls (they are still useful but not consumed in M1's empty path — leave the imports if the linter doesn't flag dead imports, otherwise drop and re-add at M2); (d) replace `dayNumber(programStart, todayIso)` with the new `dayOfYear(new Date())` derivation since M1 explicitly redefines `dayNumber` semantics until M8 lands persistence (see Data model below); (e) compute `totalDays = daysInYear(new Date())` (365 or 366) and pass to Hero — replaces the hardcoded `const totalDays = 365`; (f) keep `useNow()` call as-is per ADR-023.
- `components/TopBar.tsx` — `[survives]`. Already implements DHARMA wordmark + amber tile + Edit toggle (44×44) + Settings (44×44), with the Edit button using `aria-pressed={editMode}` and the Settings button using `aria-label="Settings"`. **Compatibility note for SPEC § AC #2:** SPEC says "Edit-mode toggle is rendered with `aria-pressed='false'` initially". The current TopBar uses `aria-pressed`, but ADR-028 mandates `<Toggle>` primitive use `role="switch"` + `aria-checked` for switch components. TopBar's pencil button is a **toggle-button**, not a switch primitive; `aria-pressed` is correct for it per ADR-028's reservation ("`aria-pressed` is reserved for future toggle-buttons that are NOT switches"). M1 keeps `aria-pressed`. Surfacing this for tests.md: assertions should target `aria-pressed`, not `aria-checked`. No code changes required.
- `components/Hero.tsx` — `[re-author: drop AnimatedPercent count-up on mount; consume new dayNumber semantics]`. Specifically: (a) replace the `<AnimatedPercent value={pct} … />` invocation with a plain `<span>{pct}</span>` rendered with the same Instrument Serif Italic font and 112px size — SPEC § AC #7 explicitly forbids the count-up animation in M1 (count-up returns in M3 with real scoring). The `AnimatedPercent` component itself is **not deleted** (`[survives]` for the component); it returns at M3. (b) Continue accepting `dayNumber?: number` and the existing `totalDays` prop — render "Building N of 365|366" using whatever values BuildingClient passes. (c) `dateLabel` prop continues to render at the top, unchanged.
- `components/BlueprintBar.tsx` — `[re-author: render empty-outline state when blocks.length === 0]`. Currently the component crashes on empty input (`total = 0`, division by zero in segment width math) and renders nothing meaningful. M1 needs an explicit branch: if `blocks.length === 0`, render an outlined container with the same dimensions (height 36 px, rounded-md, `--card-edge` border) but with zero segments inside, plus a faint grid background pattern (CSS gradient lines at 25% / 50% / 75% horizontal positions, color `--ink-dim` at 12% opacity, OR a single inline SVG with three vertical hairlines — see SG-m1-02 below). Keep the section header ("DAY BLUEPRINT") and timestamp display. Hide the legend (it currently lists Health/Mind/Career/Passive — those are the **antipattern hardcoded categories per ADR-032**; M1's empty BlueprintBar does NOT render the legend at all, since zero categories exist yet). Restore the legend at M3 when real per-category segments arrive. The NOW pin (`data-testid="now-pin"`) at the current time position **does** still render — it sits at `0%` with no segments, which is consistent (M1's BlueprintBar shows "where we are in the day"). Keep `aria-label="Day blueprint"` on the section.
- `components/Timeline.tsx` — `[re-author: replace block-card list with 24-hour vertical column]`. The current Timeline renders `EmptyBlocks` when `blocks.length === 0` and a list of `<TimelineBlock>` cards otherwise. M1 replaces this entirely with a **24-hour vertical column**:
  - Outer scrollable container, full mobile-viewport width minus padding, height ~`24 * 64 = 1536px` (with `HOUR_HEIGHT_PX = 64`).
  - Left margin column (~56 px wide): faded JetBrains Mono hour labels `00:00`, `01:00`, …, `23:00` at 64-px intervals, color `var(--ink-dim)`.
  - Hour grid lines at each row (hairline `border-top: 1px solid var(--ink-dim) at 0.12 alpha` or `var(--grid)`). The grid is rendered as a CSS background pattern on the timeline column (`linear-gradient` with stops at multiples of 64 px) so it tiles cheaply and respects reduced-motion (no animation).
  - Right column (the schedule region): an absolutely-positioned NowLine at the current `useNow()` offset.
  - When `blocks.length === 0` (always in M1): inside the schedule column, an `<EmptyBlocks>` card sits anchored at a sensible vertical position (recommendation: vertically centered in the visible viewport on mount, not absolute-positioned at 12:00 — see Edge cases). The NowLine continues to render through the empty card; it must **not** be obscured.
  - Timeline mounts with auto-scroll so the NowLine is in the visible viewport (SPEC § AC #12). Implementation: `useEffect` after first paint, compute the NowLine's pixel offset, then `scrollContainerRef.current.scrollTop = offsetPx - viewportHeight / 2`. Must be SSR-safe — guard with `typeof window !== "undefined"` or run only inside `useEffect`.
  - The block-list path (`blocks.map` rendering `TimelineBlock`) is **REMOVED** for M1 — restored at M2 when blocks become non-empty.
  - `data-testid="hour-grid"` on the column container; `data-testid="hour-label"` on each label so e2e can count 24 labels.
- `components/EmptyBlocks.tsx` — `[re-author: switch copy to locked SPEC string and use the M0 <EmptyState> primitive]`. Replace the inline `<div>` with `<EmptyState message="Tap any slot to lay your first block." pulse={true} />` from `@/components/ui`. The `<EmptyState>` primitive already honors `prefers-reduced-motion: reduce` (CSS-only `animation: pulse` gated by `@media (prefers-reduced-motion: no-preference)`, see `app/globals.css:151`), so SPEC § AC #16 (no pulse under reduced motion) is free.
- `components/BottomBar.tsx` — `[re-author: visibly disable the Voice Log button per SPEC § AC #17]`. Currently both buttons are unstyled-as-disabled and unlabeled accessibly for state. M1 changes: (a) Voice button gets `aria-disabled="true"` and `aria-label="Voice Log (coming in a later release)"`, plus visual disabled treatment (`opacity-50`, no hover gradient flare). The button **stays a `<button>` element** (not a `<div>`) so SR users hear the disabled state. Tap is no-op (does not throw). (b) The `+` button keeps `aria-label="Add"`, stays styled-enabled, tap is no-op (M2 wires the sheet). (c) The dock keeps its existing `pointer-events-auto` flex container, but the outer wrapper must add `padding-bottom: env(safe-area-inset-bottom)` (currently uses Tailwind `pb-5`; replace with `style={{ paddingBottom: "calc(20px + var(--safe-bottom))" }}` so iOS home-indicator inset is respected per SPEC § AC #18).
- `lib/types.ts` — `[survives]`. Existing `Block` / `Brick` / `Category` shapes remain (the user-defined-categories pivot per ADR-032 lands at M2 when categories first persist; M1 has zero blocks so no category strings flow through the type system). Tag the closed-set `Category = "health" | "mind" | "career" | "passive"` as **soft-deprecated for M1** in a code comment — it is unused in M1's render path because no blocks exist; M2 will widen to `category: string` per ADR-032. **No type changes in M1.**
- `lib/dharma.ts` — `[survives]`. All existing helpers (`toMin`, `dayOffset`, `duration`, `brickPct`, `blockPct`, `dayPct`, `currentBlockIndex`, `nowOffsetPct`, `blockStatus`, `brickLabel`, `fmtRange`, `today`, `dayNumber`, `dateLabel`) stay. M1's BuildingClient stops calling `dayNumber(programStart, today)` and switches to `dayOfYear(new Date())`, so `dharma.ts`'s `dayNumber` remains exported but unused in M1 — re-activated at M8. **No edits.**
- `lib/data.ts` — `[survives]`. `defaultState()` already returns `{ blocks: [], … }` per ADR-018 / ADR-039. No edits.
- `lib/scoring.ts` — `[survives]`. Re-exports stay; M1 doesn't call them (no blocks → no scoring). No edits.
- `lib/useNow.ts` — `[survives]` REUSE AS-IS per ADR-023. **Do NOT propose creating a new clock hook.** M1's NowLine consumes the existing string output.

**Components retained but not imported in M1's render path (`[obsolete: not-imported-in-M1]`):**

These files stay on disk; no deletes. M2+ wires them back in. M1's only job is to ensure they are **not in the DOM** when blocks are empty.

- `components/NowCard.tsx` — re-imported at M2 once at-least-one block exists.
- `components/TimelineBlock.tsx` — re-imported at M2.
- `components/Brick.tsx` — re-imported at M3 with the M0 `<BrickChip>` primitive likely replacing it; for M1, just don't import.
- `components/BrickStepper.tsx` — re-imported at M4 (block expand + brick logging).
- `components/Scaffold.tsx` — re-imported at M3 when bricks visually fill blocks.
- `components/EmptyBricks.tsx` — re-imported at M2 (copy lands inside the empty block, not on the whole-day surface).

**EditModeProvider.tsx** — `[survives]`. `BuildingClient` keeps it as the outer wrapper so the TopBar's Edit toggle continues to call into context. No state change visible in M1 because no blocks render edit affordances; this is correct.

### Data model

M1 introduces no new persisted state. ADR-018's `AppState` schema stays; `defaultState()` already returns `{ blocks: [], … }`. Specifically:

- **`AppState.blocks: Block[]`** — empty array on app boot per ADR-039. M1 confirms the locked `Block` shape from `lib/types.ts` is unchanged. Note: per ADR-032 the eventual `category` field will widen to `string` (user-defined), but since zero blocks render in M1, the existing closed-enum `Category` type is M2's problem to relax. No edits in M1.
- **`dayNumber: number`** — pure derivation `dayOfYear(new Date())`. Lives in M1 only; M8 replaces with `programStart`-relative computation by re-pointing BuildingClient at `lib/dharma.ts`'s existing `dayNumber(programStart, today)`. The new `lib/dayOfYear.ts` helper does NOT replace `lib/dharma.ts`'s `dayNumber` — they coexist; M1 picks `dayOfYear` only because `programStart` is not yet persisted.
- **`totalDays: number`** — pure derivation `daysInYear(new Date())`. Returns 366 in leap years (e.g., 2028) and 365 otherwise (e.g., 2026). M1 hero copy reads "Building N of 365" or "Building N of 366" accordingly. M8 may swap this for a 365-day program horizon if program-start years differ from current — out of scope for M1.
- **`dateLabel: string`** — derivation only via existing `dateLabel(today())` in `lib/dharma.ts`. SPEC's "e.g., 'Wed · May 6'" uses a middle dot but the existing helper outputs `"Wed, Apr 29"` (comma). See SG-m1-01 below.
- **`now: string`** — `useNow()` returns `"HH:MM"`. M1 callers pass that string directly into `timeToOffsetPx(now, HOUR_HEIGHT_PX)`. No new state.

**No localStorage. No IndexedDB. No server state.** ADR-018 persistence is M8.

### Components

| Region            | Component path                                                                            | Migration                                                       | Children / behavior in M1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Top bar           | `components/TopBar.tsx`                                                                   | `[survives]`                                                    | DHARMA wordmark + amber logo tile (no test changes). Edit pencil `<button aria-pressed={editMode}>` toggles `EditModeProvider` state (M5 will wire visible behavior). Settings `<button aria-label="Settings">` is keyboard-focusable, tap is no-op. Both buttons keep 44×44 hit area.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Hero              | `components/Hero.tsx`                                                                     | `[re-author]`                                                   | Receives `dateLabel`, `dayNumber={N}` (`dayOfYear`), `totalDays={365                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 366}`, `pct={0}`. Renders date label, "Building N of 365 | 366", `0%` (Instrument Serif Italic 112 px) — **no count-up animation** (drop `<AnimatedPercent>`; render plain `<span>{0}</span>`), and "day complete" caption. Counter line continues to render only when `dayNumber !== undefined`; in M1 it always is. |
| Day Blueprint bar | `components/BlueprintBar.tsx`                                                             | `[re-author]`                                                   | When `blocks.length === 0` (always in M1), render outlined container (height 36 px, `--card-edge` border, rounded-md) with faint grid background. **Zero category segments inside.** **Legend hidden** (zero categories exist per ADR-032). NOW pin still renders at the current `now` position via `nowOffsetPct(blocks, now)` — but with `blocks=[]`, `total=0`, the helper currently returns 0, which is a logical "we're at the start of nothing"; safe but ugly. Recommend M1 wraps `nowOffsetPct` with a fallback: when `blocks.length === 0`, position the pin at the same percentage as the current time within a 24-hour day, computed inline (`(toMin(now) / (24 * 60)) * 100`). This is **inside BlueprintBar**, not a new helper. Document the fallback in a code comment. |
| Schedule timeline | `components/Timeline.tsx` + new `components/NowLine.tsx`                                  | `[re-author]` (Timeline) + new (NowLine)                        | Renders 24-hour vertical scroll column with hour labels, hour grid lines, and the amber NowLine. **Block-card list path REMOVED for M1.** Empty-state card sits inside the column at a sensible vertical position. Auto-scroll on mount centers the NowLine.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Empty-state card  | `components/EmptyBlocks.tsx`                                                              | `[re-author]`                                                   | Re-implements as `<EmptyState message="Tap any slot to lay your first block." pulse={true} />` from `@/components/ui`. The M0 `<EmptyState>` primitive already wraps the pulsing card visually and honors reduced-motion; M1 just consumes it with the locked SPEC copy.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Floating dock     | `components/BottomBar.tsx`                                                                | `[re-author]`                                                   | Voice button: amber primary, **visibly disabled** (`opacity-50`, no hover flare), `aria-disabled="true"`, label "Voice Log (coming in a later release)" (or similar — see SG-m1-04). `+` button: secondary, enabled visually, tap no-op. `padding-bottom: calc(20px + var(--safe-bottom))` for iOS home-indicator.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Page composition  | `app/page.tsx` (server shell) → `app/(building)/BuildingClient.tsx` (`"use client"` host) | `app/page.tsx` `[survives]`; `BuildingClient.tsx` `[re-author]` | `BuildingClient` mounts `EditModeProvider` → `<TopBar />`, `<Hero />`, `<BlueprintBar />` (always, in empty state), `<Timeline />`, `<BottomBar />`. **No `<NowCard>` import. No `currentBlockIndex` call** (or unused — fine either way).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

**Decisions captured:**

- **Hour-height constant.** Pick `HOUR_HEIGHT_PX = 64`. Rationale: 64 × 24 = 1536 px total timeline height — comfortable for a 430-px-wide mobile viewport. Each hour row is ~64 px tall, accommodating the JetBrains Mono label (10–12 px) plus breathing room. If BUILDER picks a different value during implementation (e.g., 56 or 72), update both `lib/timeOffset.ts`'s caller in NowLine/Timeline and the hour-grid CSS. Whatever is picked must be a **single shared constant**, not duplicated per file.
- **Hour-grid rendering technique.** Use a CSS `linear-gradient` background with stops every `HOUR_HEIGHT_PX` (1-px line, transparent in between). Cheaper than 24 sibling `<div>` elements, scales for free, and respects reduced-motion (no animation). SVG would also work but adds a dependency on the SVG namespace and slightly heavier render. **Decision: CSS gradient.** See SG-m1-03 if the gradient antialiases poorly on mobile WebKit; fall back to 24 hairline `<div>`s or absolutely-positioned hour-label rows.
- **NowLine absolute positioning.** Use `top: ${timeToOffsetPx(now, HOUR_HEIGHT_PX)}px; transform: translateY(-1px);` for crisp 1-px alignment. Width: 100% of the timeline's right column (i.e., excluding the hour-label column, ~56 px reserved on the left). Reduced-motion: no `transition: top 1s linear` — when `useNow()` ticks, `top` snaps to the new value immediately. Always.
- **Auto-scroll on mount.** In `Timeline`'s `useEffect` (after first paint, SSR-safe): compute `targetTop = timeToOffsetPx(now, HOUR_HEIGHT_PX) - (containerHeight / 2)`. Apply `scrollRef.current.scrollTop = Math.max(0, targetTop)`. Use `behavior: "auto"` (instant, no smooth scroll) — smooth scroll on mount is jarring, and `prefers-reduced-motion` would force-disable it anyway. The scroll happens **once on mount**, not on every `now` tick (the user may have scrolled away intentionally).
- **`aria-disabled` on Voice button.** Per SPEC § AC #17 the button must be "visibly disabled" without using the native HTML `disabled` attribute (because we want it focusable for SR users to hear "you can't use this yet"). Use `aria-disabled="true"` + `tabIndex={0}` + an inline `onClick={(e) => e.preventDefault()}` to defang the click without removing the button from the tab order. Visual disable via `opacity-50` + `cursor: not-allowed`. Keep the existing amber-gradient background but at half opacity (so the user can see "this is the Voice button").
- **`aria-pressed` vs `aria-checked` on Edit toggle.** Per ADR-028, the `<Toggle>` primitive uses `role="switch"` + `aria-checked`; ADR-028 reserves `aria-pressed` for "future toggle-buttons that are NOT switches." The TopBar's pencil button has been a toggle-button (icon + visible state via filled/outlined background) since pre-M0, not a switch primitive. **M1 keeps `aria-pressed`** to satisfy SPEC § AC #2 verbatim. If a future milestone (M5 — Edit Mode) prefers the switch pattern, that becomes a separate ADR. Captured in SG-m1-05.

### Dependencies

**No new npm packages.** Next 16, Tailwind, lucide-react, motion (Framer Motion), Vitest, Playwright, @axe-core/playwright, @testing-library/react, @testing-library/user-event, class-variance-authority, clsx, tailwind-merge — all present per M0's dependency review. M1 is a composition milestone.

### Design tokens

M1 adds **zero new tokens.** This is a composition milestone — every visual primitive draws from M0's already-shipped tokens in `app/globals.css`:

- **Page bg** — `--bg` (`#07090f`)
- **Card surface (BottomBar pill, BlueprintBar container)** — `--bg-elev` (`#0c1018`)
- **Primary text (DHARMA wordmark, hero numerals)** — `--ink` (`#f5f1e8`)
- **Secondary text (date label, hour labels, "day complete" caption, BlueprintBar legend headings, EmptyBlocks copy)** — `--ink-dim` (`rgba(245,241,232,.5)`)
- **Accent (amber logo tile, NowLine, Voice button gradient, "now" pin)** — `--accent` (`#fbbf24`) and the deeper `--accent-deep` (`#d97706`)
- **Hour grid hairlines** — reuses the existing legacy `--grid` (`rgba(148,163,184,.07)`) until M5's globals cleanup retires the legacy tokens; M1 does NOT introduce a new grid token.
- **Display font (hero numerals)** — `--font-display` (Instrument Serif Italic via `next/font`)
- **UI font (hour labels, NOW timestamp, DHARMA wordmark)** — `--font-ui` (JetBrains Mono via `next/font`)
- **Body font** — `--font-body` (Geist Sans via `next/font`)
- **Type scale** — `--fs-10` for hour labels and the "day complete" caption; `--fs-12` for "Building N of 365"; `--fs-64` (already the closest to 112px, but Hero uses an inline `text-[112px]` Tailwind utility to hit the exact display size from `phase1plan.md` § typography — that's not a new token, it's a one-off escape).
- **Spacing** — `--sp-12` / `--sp-16` / `--sp-24` / `--sp-32` for region paddings.
- **Motion** — only `pulse` (already in `globals.css:151` gated by `@media (prefers-reduced-motion: no-preference)`) used by the EmptyState card. Everything else is static.
- **Safe area** — `--safe-bottom` consumed by BottomBar.

If any new visual need surfaces during BUILDER's TDD cycle (e.g., a token for the hour-grid hairline alpha), that is a planner gap — escalate, do not silently add.

### Edge cases (HOW)

- **Now-line at the very top (00:00) or bottom (23:59)** — `lib/timeOffset.ts:clampOffsetPx` handles this. `00:00` → `top: 0px`. `23:59` → `top: 23 * 64 + (59 / 60) * 64 ≈ 1535px`, which is still within `[0, 24 * 64]`. Tests in tests.md will assert both boundary inputs return positions within the timeline column.
- **Midnight crossing during a session** — `useNow()` ticks every 60 s. When it goes from `"23:59"` → `"00:00"`, NowLine's `top` jumps from ~1535px to 0. **No animated slide** — it snaps. The page does **not** auto-scroll back to the top on midnight cross (the user may have scrolled away; surprising scroll-jumps are jarring). Scroll-position recomputation on midnight is M9's job (cross-day "what is today" semantics). M1 just clamps.
- **Auto-scroll-to-now on mount** — implemented in `Timeline.tsx`'s `useEffect` (post-paint, SSR-safe). Uses `scrollRef.current.scrollTop = Math.max(0, timeToOffsetPx(now, 64) - viewportHeight / 2)` with `behavior: "auto"`. **Must run inside `useEffect`**, never during render — `scrollTop` writes mutate the DOM and would error on SSR. Also: if `useNow()` returns `""` on the very first SSR paint (it does not — ADR-023 says it formats the server clock), the effect would set `scrollTop = NaN`; defend with a `now ? … : noop` guard.
- **`prefers-reduced-motion: reduce`** — already wired through `lib/reducedMotion.ts` and the global `@media (prefers-reduced-motion: reduce)` block in `globals.css:263`. Call sites in M1: (a) `<EmptyState>` already gates pulse on `@media (prefers-reduced-motion: no-preference)` — no further action; (b) `<Hero>` does NOT call `<AnimatedPercent>` in M1 so the count-up reduction is moot; (c) NowLine omits any `transition` on `top` updates regardless of reduced-motion (always snaps); (d) Timeline auto-scroll uses `behavior: "auto"` (instant) — no smooth-scroll to disable. The reduced-motion test (SPEC § AC #24) verifies no animation classes are present on any M1 element when the media query matches; tests.md covers this with a Playwright `emulateMedia({ reducedMotion: "reduce" })` snapshot.
- **Safe-area insets (iOS notch + home indicator)** — TopBar already paddings via `pt-5`; **add `padding-top: env(safe-area-inset-top)`** on the outer page container in `BuildingClient.tsx` (or via a `--safe-top` utility class). BottomBar adds `padding-bottom: env(safe-area-inset-bottom)` per the re-author note above. Verify nothing clips behind iOS chrome via Playwright iPhone-13 device emulation.
- **Viewport height < 600px** — Timeline's outer container uses `max-h-[calc(100dvh - <chrome>)]` (where `<chrome>` is the sum of TopBar + Hero + BlueprintBar + BottomBar approximate heights — recommend `~360px`). At < 600px viewports, the timeline reduces to a small scrollable strip but does not collapse; horizontal overflow is forbidden by the `max-w-[430px]` page wrapper.
- **Leap year for `dayNumber`** — `lib/dayOfYear.ts` handles 366-day years. Hero copy reads "Building N of 366" when `daysInYear(today)` returns 366. tests.md asserts both 365- and 366-day cases via `vi.setSystemTime(new Date("2028-02-29"))` (leap year).
- **Zero blocks** — confirmed by every component re-author tag. NowCard / TimelineBlock / Brick / BrickStepper / Scaffold / EmptyBricks are not imported, not rendered, not in the DOM. The Day Blueprint bar renders its empty outline. The Timeline renders the hour-grid + NowLine + EmptyBlocks card. No DOM ghosts.
- **`now` skew on first paint** — per ADR-023, `useNow()` formats the server clock on SSR; the first interval tick (within 60 s) reconciles to the client. NowLine's first paint may be off by < 2 s from the user's wall clock — imperceptible. Tests should mock `useNow` directly via `vi.mock` for component tests, or `page.addInitScript` for e2e (to override `Date.now`), to keep the pixel position deterministic.

### Out of scope for M1

(Mirrored verbatim from SPEC § Out of scope, do not paraphrase or expand:)

- Interactive `+` button behavior (Add Block sheet) — M2
- Tap-empty-slot to open Add Block — M2
- Voice Log behavior — M10
- Edit-mode behavior (block jiggle, drag handles, delete affordances) — M5
- Settings page contents — later milestone
- Any block or brick rendering — M2+
- Hero ring/ring-graphic visualization with real completion % — M3 (M1's hero is text-only `0%`, not a ring)
- Per-category Day Blueprint segments — M3 (M1 shows the empty container only)
- Loose Bricks tray — M2+, tray location still TBD per § 0.11
- Castle / Kingdom / Empire navigation dock — M9
- Top-of-screen tiny week strip (Cron-style) — M9
- Persistence (`programStart`, localStorage) — M8
- SG-bld-16 (rest-day affordance when recurrence yields zero blocks today) — M9
- Real-blocks-driven NowCard — M2+ (component exists but is not rendered in M1)

### Migration table for prior-pivot tests

`docs/tests.md` carries 142 IDs total (94 pre-M0 + 48 M0). M1 modifies the render tree of TopBar (no), Hero (yes), BlueprintBar (yes), Timeline (yes), EmptyBlocks (yes), BottomBar (yes), and removes NowCard/TimelineBlock/Brick from M1's DOM (no edits to those component files). The component-test files for those components must be tagged so the M1 TESTS-mode dispatch can derive new G/W/T entries without dropping any `[survives]` IDs.

| Component test file                              | Migration tag for M1                                                                                                                                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/TopBar.test.tsx`                     | `[survives]` — no behavior change. IDs preserved.                                                                                                                                     |
| `components/Hero.test.tsx`                       | `[re-author: drop count-up assertion; expected hero numeral renders as plain number, no animation]` — IDs preserved with `(re-authored M1)` suffix.                                   |
| `components/BlueprintBar.tsx` (no test file yet) | New: tests added in M1 covering empty-outline path and empty `blocks=[]` rendering. Fresh IDs `C-m1-NN`.                                                                              |
| `components/Timeline.test.tsx`                   | `[re-author: replace block-list-rendering tests with hour-grid + NowLine assertions; remove TimelineBlock-presence assertions]` — IDs preserved with `(re-authored M1)` suffix.       |
| `components/TimelineBlock.test.tsx`              | `[obsolete: not-imported-in-M1]` — file stays, tests stay (skipped or kept for M2). Component returns at M2.                                                                          |
| `components/Brick.test.tsx`                      | `[obsolete: not-imported-in-M1]` — same.                                                                                                                                              |
| `components/Scaffold.test.tsx`                   | `[obsolete: not-imported-in-M1]` — component returns at M3.                                                                                                                           |
| `components/BottomBar.test.tsx`                  | `[re-author: assert aria-disabled='true' on Voice button + safe-area padding-bottom]` — IDs preserved with `(re-authored M1)` suffix.                                                 |
| `components/EditModeProvider.test.tsx`           | `[survives]` — context wiring unchanged.                                                                                                                                              |
| `components/AnimatedPercent.test.tsx`            | `[survives]` — component is not used in M1's hero, but its unit tests remain valid (the component still exists, returns at M3).                                                       |
| `app/(building)/BuildingClient.test.tsx`         | `[re-author: assert NowCard NOT in DOM, BlueprintBar always rendered, Timeline rendered with hour grid + NowLine + EmptyBlocks card]` — IDs preserved with `(re-authored M1)` suffix. |
| `lib/useNow.test.ts`                             | `[survives]` — ADR-023 contract unchanged.                                                                                                                                            |
| `lib/dharma.test.ts`                             | `[survives]` — date helpers untouched in M1.                                                                                                                                          |
| `tests/e2e/empty.spec.ts`                        | `[re-author: empty-state copy is now 'Tap any slot to lay your first block.', not 'No blocks yet. Tap + to add your first block.']` — IDs preserved with `(re-authored M1)` suffix.   |
| `tests/e2e/building.a11y.spec.ts`                | `[survives]` — axe-clean assertion against `/` survives structurally; underlying DOM differs, but axe runs at runtime so 0 violations is the same target.                             |
| `tests/e2e/m1.spec.ts` (new)                     | New: e2e for the seven M1 regions (top bar, hero, BlueprintBar empty, hour-grid, NowLine, EmptyBlocks copy, dock with disabled Voice + enabled `+`). Fresh IDs `E-m1-NN`.             |
| `tests/e2e/m1.a11y.spec.ts` (new)                | New: axe scan of the M1 page. Fresh IDs `A-m1-NN`.                                                                                                                                    |

EVALUATOR fails any milestone whose diff drops a `[survives]` test without explanation. The TESTS-mode dispatch will translate the above into a proper migration table at the top of `tests.md`'s M1 section and start fresh M1 IDs from `U-m1-001`, `C-m1-001`, `E-m1-001`, `A-m1-001` (continuing the per-milestone numbering convention from M0).

### Spec gaps you must surface

- **SG-m1-01 — `dateLabel` punctuation.** SPEC § Outputs row "Hero" gives the example "Wed · May 6" (middle-dot separator). The existing `lib/dharma.ts:dateLabel` helper (built in `live-clock`, locked at SG-bld-11 with `en-US` Intl format) outputs `"Wed, Apr 29"` (comma separator). Two options: (a) widen the helper to accept a separator argument and pass `"·"` from M1, (b) keep the comma and accept that SPEC's "e.g." is illustrative-not-prescriptive. **Recommendation: (b).** SPEC says "e.g.,"; treat as illustrative. If the user prefers the middle dot, surface as an early-M1 chore commit. **Decision deferred to user at Gate #1.**
- **SG-m1-02 — BlueprintBar's "faint grid" rendering technique.** SPEC § Outputs row says the empty BlueprintBar shows "an outlined container with faint grid". Two implementations: (a) CSS `linear-gradient` background with three vertical 1-px hairlines at 25% / 50% / 75%, (b) inline SVG with three `<line>` elements. **Recommendation: (a)** for zero-dependency render and free reduced-motion compliance. Locking to (a) unless tests reveal antialiasing issues on mobile WebKit.
- **SG-m1-03 — Hour-grid CSS gradient mobile rendering.** Mobile WebKit historically antialiases multi-stop gradients inconsistently. If 24 hairlines via `linear-gradient` look fuzzy on iPhone Safari, fall back to 24 absolutely-positioned `<div>` hairlines. BUILDER discovers this during Playwright trace; M1 plan locks the gradient default and the fallback is a tested escape hatch.
- **SG-m1-04 — Voice button "visibly disabled" copy.** SPEC § AC #17 requires "tooltip or label indicating it arrives later." Three options: (a) `aria-label="Voice Log (coming in a later release)"`, (b) `aria-label="Voice Log (coming soon)"`, (c) a visible `<span>` next to the icon reading "Soon". **Recommendation: (a)** — most explicit, no visual addition to the dock, screen-reader friendly. Lock at M1 unless Gate #1 specifies otherwise.
- **SG-m1-05 — `aria-pressed` vs `aria-checked` on the Edit toggle (TopBar).** SPEC § AC #2 says "`aria-pressed='false'`". ADR-028 says `<Toggle>` primitive uses `role="switch"` + `aria-checked`. The TopBar pencil button is a toggle-button (icon + visible state), not a `<Toggle>` primitive instance, so `aria-pressed` is permitted by ADR-028's reservation. **No conflict.** Locking to `aria-pressed` per SPEC. Document the call-site distinction in `components/ui/README.md` if a future user mixes them up — defer to M5.
- **SG-m1-06 — Settings icon choice.** SPEC § Outputs and § AC #1 / #3 say "Settings gear icon" with `aria-label="Settings"`. The current TopBar uses `lucide-react`'s `Settings` icon, which is a gear. **No gap.** Captured here so Gate #1 reviewers can validate the icon choice without re-checking the code.
- **SG-m1-07 — `dayNumber` semantics in M1 vs M8.** SPEC explicitly says M1 computes `dayNumber = dayOfYear(new Date())` (1..365|366) and M8 replaces with `programStart`-relative. This is **the locked semantics for M1**. The existing `lib/dharma.ts:dayNumber` helper expects `programStart` — M1 BuildingClient ignores it and calls the new `lib/dayOfYear.ts:dayOfYear` instead. M8 will swap back. Captured to remind M8 PLANNER. **No gap.**
- **SG-m1-08 — Hero `pct={0}` mount behavior.** SPEC § AC #7 says "0% does not animate on mount (no count-up — count-up arrives in M3)." M1's Hero re-author drops the `<AnimatedPercent>` invocation. The component file `components/AnimatedPercent.tsx` stays on disk; M3 re-imports it. Tests must assert the rendered `0%` text appears synchronously on first paint, with no `requestAnimationFrame` tween. **No gap; surfaced for tests.md.**

---

## Milestone 2 — Add Block Flow — Plan

### Context

M2 wires the first interactive verb on top of M1's empty Building Shell: from a tap of the floating `+` or any empty timeline hour-row, the Add Block sheet opens, the user fills a plain form (Title / Start / End / Recurrence / Category), Saves, the sheet slides down, and a new block enters the timeline at its `start` row with stagger fade-in. The empty-state card unmounts; the hero stays at `0%` (scoring is M3). M2 **locks the `Block` and `Category` schemas** for the rest of Phase 1 — M3 fills blocks with bricks, M5 wires edit/delete, M8 wires persistence, M9 wires `appliesOn(rec, date)` resolution. M2 renders today only, so all blocks created today appear today regardless of their recurrence kind.

This is a **migration milestone, not a greenfield build**. M1 froze NowCard / TimelineBlock / Brick / BrickStepper / Scaffold / EmptyBricks as `[obsolete: not-imported-in-M1]`; M2 flips `TimelineBlock` to `[re-author]` and leaves the others obsolete (M3+ revisits). The four legacy CSS vars `--cat-health` / `--cat-mind` / `--cat-career` / `--cat-passive` are **removed** and replaced by a 12-color palette `--cat-1`..`--cat-12` (SG-m2-01 hexes locked below). `lib/types.ts`'s closed-set `Category = "health" | "mind" | "career" | "passive"` enum is **deleted**; `Category` becomes an object `{ id, name, color }` per ADR-032. `Block` widens to include `categoryId: string | null`, `recurrence: Recurrence`, and `bricks: Brick[]` (always `[]` in M2). `AppState` gains `categories: Category[]` (initial `[]` per ADR-039). All state mutation is in-memory via `useReducer`; localStorage is M8.

### File structure

**Create:**

- `components/AddBlockSheet.tsx` — `"use client"` host. Composes M0 `<Sheet>` + the form (`<Input>` Title with autofocus, two time-`<Input>`s for Start/End, `<RecurrenceChips>`, `<CategoryPicker>`, sticky `<Button>` Save, `<X>` Cancel top-left). Owns local form state, runs `lib/blockValidation.ts` predicates on every keystroke, surfaces inline errors and the soft-overlap warning, calls `onSave(block)` / `onCancel()` props supplied by `BuildingClient`. Manages a single internal "view" state — `'block' | 'newCategory'` — to render the new-category sub-form **inside the same `<Sheet>`** (decision per Cross-cutting concerns below; no nested portals).
- `components/RecurrenceChips.tsx` — 4-chip single-select: _Just today_ / _Every weekday_ / _Every day_ / _Custom range_. Default `just-today`. When _Custom range_ is selected, reveals two date-`<Input>`s (start, end ISO `YYYY-MM-DD`) and a 7-button weekday picker (`<Chip>` group, multi-select 0..6=Sun..Sat). Emits a fully-formed `Recurrence` discriminated-union value via `onChange(rec)`. Pure presentational — no validation; consumer (`AddBlockSheet`) calls `isValidCustomRange(rec)`.
- `components/CategoryPicker.tsx` — Renders existing `categories` as `<Chip>`s (single-select via `selectedCategoryId` prop) plus a "+ New" `<Chip>` and a "Skip" `<Chip>` (which sets `categoryId=null`). Tapping "+ New" calls `onRequestNewCategory()` (parent flips its view state to `'newCategory'`). Tapping a category chip calls `onSelect(categoryId)`. With zero categories, only "+ New" and "Skip" are visible (per AC #9).
- `components/NewCategoryForm.tsx` — Inline sub-form (rendered inside `AddBlockSheet` when the host's view is `'newCategory'`). Fields: Name `<Input>` (required, non-blank) + 12-color palette as a 4×3 `<Chip>` grid (single-select, swatches read CSS vars `--cat-1`..`--cat-12`). "Done" button is enabled when Name is non-blank AND a color is picked; on tap, calls `onCreate({ id: uuid(), name, color })` (which the parent dispatches as `ADD_CATEGORY` AND auto-selects on the block form, per AC #28+#29). "Cancel" button returns the parent's view to `'block'` without persisting.
- `components/SlotTapTargets.tsx` — Renders 24 absolutely-positioned, transparent `<button>` elements stacked **behind** the block-card layer (z-index below cards, above the hour-grid background). Each spans `HOUR_HEIGHT_PX` and triggers `onSlotTap(hour: number)` where `hour ∈ 0..23`. `aria-label="Add block at HH:00"` per button (44-px-tall hit area satisfies ADR-031 since `HOUR_HEIGHT_PX = 64`). Defaults to non-rendered when `editMode === true` to avoid future drag conflict (forward-compat note for M5).
- `lib/blockValidation.ts` — Pure helpers, no React, no Date dependencies (operates on `"HH:MM"` strings via `toMin` from `lib/dharma.ts`):
  - `isValidStart(start: string): boolean` — matches `/^([01]\d|2[0-3]):[0-5]\d$/`.
  - `isValidEnd(end: string | undefined): boolean` — undefined OR matches the same regex AND `≤ "23:59"`.
  - `endAfterStart(start: string, end: string | undefined): boolean` — true if end is undefined OR `toMin(end) > toMin(start)`.
  - `overlapsExistingBlock(blocks: Block[], candidate: { start: string; end?: string }): Block | null` — returns the **first** block whose `[start, end)` half-open interval intersects the candidate's interval (per ADR-006). When the candidate has no end, treat it as a 1-minute marker `[start, start+1)`. Used to drive the soft inline warning (AC #26).
  - `isValidCustomRange(rec: Recurrence): boolean` — for `kind === 'custom-range'`, asserts `start ≤ end` AND `weekdays.length > 0`; trivially true for other kinds.
- `lib/uuid.ts` — Single-line wrapper `export const uuid = () => crypto.randomUUID()`. Mockable seam for Vitest (`vi.mock('@/lib/uuid', () => ({ uuid: () => 'uuid-1' }))`) so generated block/category IDs are deterministic in tests.
- `tests/e2e/m2.spec.ts` — Playwright e2e for the M2 add-block surface (file path declared; bodies authored by BUILDER from `tests.md` IDs `E-m2-NN`).
- `tests/e2e/m2.a11y.spec.ts` — `@axe-core/playwright` accessibility scan with the sheet open AND closed (file path declared; bodies by BUILDER, IDs `A-m2-NN`).

**Modify:**

- `app/(building)/BuildingClient.tsx` — `[re-author: own blocks + categories state via useReducer; wire sheet open/close; pass callbacks to BottomBar, Timeline, AddBlockSheet]`. Specifically: (a) initialize state via `useReducer(reducer, defaultState())` where `defaultState()` returns `{ blocks: [], categories: [] }` (per ADR-018/039); (b) hold a sheet-open piece of local UI state `[sheetState, setSheetState] = useState<{ open: boolean; defaultStart: string }>({ open: false, defaultStart: '00:00' })`; (c) pass `onAddPress={() => setSheetState({ open: true, defaultStart: roundDownToHour(now) })}` to `<BottomBar>` and `onSlotTap={(hour) => setSheetState({ open: true, defaultStart: hourToHHMM(hour) })}` into `<Timeline>`; (d) on `<AddBlockSheet>`'s `onSave(block)`, dispatch `{ type: 'ADD_BLOCK', block }` and close the sheet; on its `onCreateCategory(category)`, dispatch `{ type: 'ADD_CATEGORY', category }` and stay open; (e) pass `state.blocks` to `<Timeline>` and `<BlueprintBar>`; (f) `roundDownToHour` is a 1-line local helper `(hhmm: string) => hhmm.slice(0, 2) + ':00'`, NOT a new lib export.
- `components/Timeline.tsx` — `[re-author: render TimelineBlock cards layered ABOVE SlotTapTargets layered ABOVE the hour-grid background; preserve M1's NowLine + auto-scroll + EmptyBlocks-when-zero-blocks branch]`. Specifically: (a) Outer scrollable container untouched; (b) Schedule column gets a new layered structure — z-index 0: hour-grid CSS gradient (M1, untouched), z-index 1: `<SlotTapTargets onSlotTap={onSlotTap} />`, z-index 2: `blocks.map(b => <TimelineBlock key={b.id} block={b} categories={categories} />)`, z-index 3: `<NowLine />` (always on top), z-index 2 (centered): `<EmptyBlocks />` only when `blocks.length === 0`; (c) Auto-scroll-to-now `useEffect` from M1 untouched; (d) Accepts new props `categories: Category[]` and `onSlotTap: (hour: number) => void`.
- `components/TimelineBlock.tsx` — `[re-author: consume new Block schema (categoryId, recurrence, bricks[]); position absolutely via timeToOffsetPx; height ∝ duration or HOUR_HEIGHT_PX/12 if no end; show category color dot when categoryId !== null; tap is no-op in M2]`. Specifically: (a) Props `{ block: Block; categories: Category[] }`; resolve `category = categories.find(c => c.id === block.categoryId) ?? null`; (b) Style `position: absolute; top: timeToOffsetPx(block.start, HOUR_HEIGHT_PX)`; (c) Height: when `block.end` is set, `timeToOffsetPx(block.end) - timeToOffsetPx(block.start)`; else `HOUR_HEIGHT_PX / 12` (≈ 5px) per SG-m2-05; (d) Inner DOM: title (`text-[--fs-14]`, single-line ellipsis), time range "HH:MM–HH:MM" or just "HH:MM" via existing `fmtRange` from `lib/dharma.ts` (extend or wrap to handle no-end), category color dot (8-px circle, `background: ${category.color}`) only when `category !== null`; (e) `onClick` handler is **explicitly empty** (no-op), preserved as a hook for M4 FLIP expand; (f) Stagger fade-in: wraps DOM in a Framer Motion `<motion.div>` with `variants={enterVariant}` and 30-ms stagger from M0 motion tokens — collapses to instant on `prefers-reduced-motion: reduce`.
- `components/BlueprintBar.tsx` — `[re-author: aggregate blocks by categoryId, render colored segments width ∝ sum-of-categorized-block-durations; preserve M1's empty-outline path]`. Specifically: (a) When `blocks.length === 0` OR `blocks.every(b => b.categoryId === null)`, render M1's empty-outline state untouched (no segments, NOW pin still computed via the inline 24-hour fallback); (b) Otherwise: filter `blocks.filter(b => b.categoryId !== null && b.end)`, group by `categoryId`, sum each group's duration in minutes (via `toMin(end) - toMin(start)`), compute each segment's width as `(sumMinutes / sumOfAllSegmentsMinutes) * 100`%, render in stable order (sorted by `categoryId` for determinism), color each via the resolved `category.color`; (c) Uncategorized blocks are excluded entirely per SG-m2-02; blocks without `end` are also excluded (M5 may revisit); (d) Legend stays hidden in M2 (M3 reintroduces with real per-category percentages).
- `components/BottomBar.tsx` — `[re-author: wire the + button's onClick to the new onAddPress prop; Voice button visibly-disabled treatment from M1 untouched]`. Specifically: accepts a new prop `onAddPress: () => void`, attaches it to the `+` button's `onClick`, removes the M1 no-op handler. The `+` button's M0 styling (primary amber, 44×44, `aria-label="Add"`) is preserved verbatim.
- `lib/types.ts` — `[re-author: replace closed-set Category enum with Category object; add Recurrence union; widen Block; introduce AppState]`. Specifically: (a) **DELETE** `type Category = "health" | "mind" | "career" | "passive"`, `CATEGORY_COLOR`, `CATEGORY_LABEL` (all four exports go away); (b) **ADD** `type Recurrence = { kind: 'just-today'; date: string } | { kind: 'every-weekday' } | { kind: 'every-day' } | { kind: 'custom-range'; start: string; end: string; weekdays: number[] }`; (c) **ADD** `type Category = { id: string; name: string; color: string }`; (d) **REPLACE** `Block` with the SPEC-locked shape — `id: string; name: string; start: string; end?: string; recurrence: Recurrence; categoryId: string | null; bricks: Brick[]`; (e) **ADD** `type AppState = { blocks: Block[]; categories: Category[] }`; (f) **ADD** `type Action = { type: 'ADD_BLOCK'; block: Block } | { type: 'ADD_CATEGORY'; category: Category }`; (g) **ADD** `function assertNever(x: never): never`. The old `CATEGORY_COLOR` / `CATEGORY_LABEL` consumers (none in M1's render path; check globally during BUILDER's first commit) must all be either removed or migrated.
- `lib/data.ts` — `[re-author: defaultState() returns { blocks: [], categories: [] }; remove any pre-pivot factory data; export reducer]`. Specifically: (a) `defaultState(): AppState` returns `{ blocks: [], categories: [] }` (per ADR-039 — no factory anything); (b) export `reducer(state: AppState, action: Action): AppState` implementing both action kinds with `assertNever(action)` exhaustiveness; (c) **DELETE** any factory blocks/categories that may have been seeded pre-pivot — none should exist after M1 but verify.
- `app/globals.css` — `[re-author: remove the 4 legacy --cat-* vars; add 12 palette vars per SG-m2-01]`. Concretely: delete `--cat-health` / `--cat-mind` / `--cat-career` / `--cat-passive`. Add `--cat-1`..`--cat-12` per SG-m2-01 hex list below. Document in a leading comment that category names live in user data, not CSS.
- `app/(building)/BuildingClient.imports.test.ts` — `[re-author: TimelineBlock is now expected in M2's import graph; M1 forbade it]`. Specifically: flip the `expect(imports).not.toContain('TimelineBlock')` assertion to `expect(imports).toContain('TimelineBlock')`; add explicit assertions that NowCard / Brick / BrickStepper / Scaffold / EmptyBricks remain absent. IDs preserved with `(re-authored M2)` suffix.

**Files unchanged (`[survives]`):**

- `components/TopBar.tsx`, `components/Hero.tsx`, `components/EmptyBlocks.tsx`, `components/EditModeProvider.tsx`, `components/AnimatedPercent.tsx`, `components/NowLine.tsx`
- `lib/useNow.ts`, `lib/dayOfYear.ts`, `lib/timeOffset.ts`, `lib/dharma.ts`, `lib/scoring.ts`, `lib/reducedMotion.ts`, `lib/motion.ts`, `lib/haptics.ts`

**Files staying obsolete (`[obsolete: not-imported-in-M2]`):**

- `components/NowCard.tsx` — M3 or M4 revisits (active-block surfacing).
- `components/Brick.tsx` — M3 revisits.
- `components/BrickStepper.tsx` — M4 revisits.
- `components/Scaffold.tsx` — M3 revisits.
- `components/EmptyBricks.tsx` — M3 revisits (lives inside an empty block's expanded view).

### Data model

M2 locks the SPEC schemas verbatim (see SPEC § "Locked schemas"). Reproduced here as the authoritative builder reference:

```ts
// lib/types.ts (post-M2)
export type Recurrence =
  | { kind: "just-today"; date: string } // ISO YYYY-MM-DD
  | { kind: "every-weekday" } // Mon–Fri
  | { kind: "every-day" }
  | { kind: "custom-range"; start: string; end: string; weekdays: number[] }; // 0=Sun..6=Sat

export type Category = {
  id: string; // crypto.randomUUID()
  name: string; // user-typed; not unique (AC #30)
  color: string; // one of var(--cat-1)..var(--cat-12) hex
};

export type Block = {
  id: string; // uuid
  name: string;
  start: string; // "HH:MM"
  end?: string; // "HH:MM" — half-open [start, end) per ADR-006
  recurrence: Recurrence;
  categoryId: string | null; // FK; null = uncategorized (SG-m2-07)
  bricks: Brick[]; // always [] in M2; M3 lands brick adding
};

export type AppState = { blocks: Block[]; categories: Category[] };

export type Action =
  | { type: "ADD_BLOCK"; block: Block }
  | { type: "ADD_CATEGORY"; category: Category };

export function assertNever(x: never): never {
  throw new Error(`unhandled ${JSON.stringify(x)}`);
}
```

**State management decision: `useReducer` (not two `useState` calls).** Rationale: M5 will add `DELETE_BLOCK` / `EDIT_BLOCK` actions, M3 will add `LOG_BRICK` / `UNLOG_BRICK` mutations, M9 will add `RESOLVE_RECURRENCE` semantics. A reducer with a discriminated `Action` union scales linearly with new mutations and stays exhaustive via `assertNever`. Two `useState`s would force prop-drilling two setters per component and silently allow incomplete updates (e.g., adding a category but forgetting to clear a stale form). `useReducer` is also the easier seam for M8 persistence (a single `dispatch` log replays into localStorage).

**ID generation:** every `Block` and `Category` gets its `id` from `lib/uuid.ts`'s `uuid()` (a 1-line wrapper around `crypto.randomUUID()`). The wrapper exists solely as a Vitest-mockable seam (`vi.mock('@/lib/uuid', ...)`).

**No persistence in M2.** Page refresh clears state — documented user-visible edge case below. M8 lands localStorage via the same reducer (the `Action` log replays to rehydrate).

### Components

| SPEC region                | Component path                                            | Migration                                                    | M2 behavior                                                                                                                                                                                                                                                |
| -------------------------- | --------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Floating `+` button        | `components/BottomBar.tsx`                                | `[re-author]`                                                | Wires `onClick` to new `onAddPress` prop. Style/a11y unchanged from M1.                                                                                                                                                                                    |
| Empty-slot tap target      | new `components/SlotTapTargets.tsx` (mounted by Timeline) | new                                                          | 24 absolute-positioned transparent `<button>`s, each `HOUR_HEIGHT_PX` tall. `aria-label="Add block at HH:00"`. z-index above hour-grid, below blocks.                                                                                                      |
| Add Block sheet            | new `components/AddBlockSheet.tsx`                        | new                                                          | Composes `<Sheet>` + form. Owns local form state + view-toggle (`'block' \| 'newCategory'`). Renders Title/Start/End/Recurrence/Category/Save/Cancel. `<Sheet>` provides `role="dialog"` and ESC-to-close already; M2 adds focus-trap (see Cross-cutting). |
| New-category inline form   | new `components/NewCategoryForm.tsx`                      | new                                                          | Renders inside `AddBlockSheet` when view is `'newCategory'` (NOT a nested portal — see Cross-cutting). Name `<Input>` + 12-color palette `<Chip>` 4×3 grid + Done/Cancel.                                                                                  |
| Block card on the timeline | `components/TimelineBlock.tsx`                            | `[re-author]` (was `[obsolete: not-imported-in-M1]` — flips) | Absolute-positioned card. Reads new `Block` shape. Stagger fade-in via `motion.div` with M0's enter variant. Tap is no-op (M4 wires expand).                                                                                                               |
| Day Blueprint bar          | `components/BlueprintBar.tsx`                             | `[re-author]`                                                | Aggregates by `categoryId`, renders colored segments. Empty-outline path from M1 preserved as fallback when zero categorized blocks exist.                                                                                                                 |
| Empty-state card           | `components/EmptyBlocks.tsx`                              | `[survives]`                                                 | M1's locked copy untouched. Conditional rendering moved into Timeline's `blocks.length === 0` branch.                                                                                                                                                      |
| Recurrence chips           | new `components/RecurrenceChips.tsx`                      | new                                                          | 4 single-select `<Chip>`s + custom-range sub-controls. Emits a fully-formed `Recurrence` value.                                                                                                                                                            |
| Category picker            | new `components/CategoryPicker.tsx`                       | new                                                          | Renders categories + "+ New" + "Skip". Calls `onRequestNewCategory` to flip parent's view.                                                                                                                                                                 |

**A11y attributes:**

- `<Sheet>` already sets `role="dialog"` + `aria-modal="true"` + `aria-label={title}`. M2 passes `title="Add Block"` (or `"New Category"` when in new-category view).
- **Focus trap:** `<Sheet>` does NOT currently trap focus. M2 adds a `useFocusTrap` effect inside `AddBlockSheet` that on open: (a) records `document.activeElement` as the return target, (b) focuses the Title `<Input>`, (c) intercepts Tab/Shift+Tab via `keydown` to cycle within the sheet, (d) on close, restores focus to the return target (the floating `+` button or the slot-tap button). This is a **local hook in AddBlockSheet**, NOT a change to the `<Sheet>` primitive (preserves M0's surface contract for other consumers).
- Save button uses `aria-disabled={!isValid}` (NOT the native `disabled` attribute — keeps the button focusable so SR users can hear the disabled-state announcement). Tap on `aria-disabled` is no-op via the button's own `onClick` guard.
- Recurrence chips: `role="radiogroup"` on the wrapper, `role="radio"` + `aria-checked` on each chip (single-select semantics). Custom-range weekday picker uses `role="group"` + `aria-checked` per chip (multi-select).
- Category picker: `role="radiogroup"` for category single-select; "+ New" and "Skip" are plain `<button>`s.
- Color palette in NewCategoryForm: `role="radiogroup"` + `role="radio"` per swatch, each `aria-label="Color N"` (1..12).
- Tab order: Title → Start → End → Recurrence chips → (if custom) date inputs → weekdays → Category chips → Skip → "+ New" → Save → Cancel. Matches visual order.

**M0 motion tokens consumed:**

- `modalIn` — sheet open transition (per AC #15 inverse: SPEC says "sheet slides down" on close; sheet slides UP on open is implicit. Use `modalIn` for open, `modalOut` for close).
- `modalOut` — sheet close transition.
- Stagger 30 ms — new-block entrance fade-in (per AC #16).
- `tap` scale — `<Chip>` and `<Button>` press feedback (M0 primitive built-in; nothing M2 adds).

**`prefers-reduced-motion: reduce` collapse points:**

- Sheet open/close — instant (no slide).
- New-block stagger fade-in — instant render, no opacity tween.
- All `<Chip>` tap-scale — already gated inside the M0 primitive (no M2 changes).

### Dependencies

**Zero new npm packages.** `crypto.randomUUID()` is a built-in browser+Node API (Next 15 Edge runtime ships it). Framer Motion, Tailwind, lucide-react, all M0 primitives, axe-core/playwright — all present.

### Design tokens

**SG-m2-01 — locked 12-color palette.** All 12 colors checked for WCAG AA contrast against `--bg` (`#07090f`); `--cat-4` lightened from `#64748b` to `#94a3b8` to clear the threshold. Add to `app/globals.css` `:root`:

```css
/* Category palette — user picks one per category they create.
   No category names live in code; see ADR-032/039. */
--cat-1: #34d399; /* emerald (M0 carry-over) */
--cat-2: #c4b5fd; /* lavender (M0 carry-over) */
--cat-3: #fbbf24; /* amber (M0 carry-over) */
--cat-4: #94a3b8; /* slate (M0 carry-over, lightened from #64748b for AA) */
--cat-5: #fb7185; /* rose */
--cat-6: #fb923c; /* orange */
--cat-7: #a3e635; /* lime */
--cat-8: #2dd4bf; /* teal */
--cat-9: #38bdf8; /* sky */
--cat-10: #818cf8; /* indigo */
--cat-11: #e879f9; /* fuchsia */
--cat-12: #d4a373; /* warm-neutral */
```

**REMOVED from `:root`:** `--cat-health`, `--cat-mind`, `--cat-career`, `--cat-passive`. M1's render path doesn't reference them; verify global grep returns zero hits before BUILDER's first green commit.

All other tokens unchanged from M0/M1: `--bg`, `--bg-elev`, `--ink`, `--ink-dim`, `--accent`, `--accent-deep`, `--card-edge`, `--font-display`, `--font-ui`, `--font-body`, `--fs-*`, `--sp-*`, `--safe-bottom`. NewCategoryForm's swatch chips use `style={{ background: var(--cat-${i}) }}` (NOT inline hex).

### Edge cases (HOW)

- **Empty Title** → `isValid = title.trim().length > 0 && ...`; Save's `aria-disabled` flips to `true`; inline message `<p role="alert" id="title-error">Title is required</p>` rendered with `aria-describedby` on the Title `<Input>`.
- **End not set** → block renders with height `HOUR_HEIGHT_PX / 12` ≈ 5 px per SG-m2-05; time-range label shows just `"HH:MM"` (no en-dash). Wrap `lib/dharma.ts:fmtRange` or add a 1-line conditional in `TimelineBlock`.
- **End ≤ Start** (when End set) → `endAfterStart(start, end)` returns false; inline error `"End must be after Start"`; Save disabled.
- **End past 23:59** → `isValidEnd(end)` returns false (regex rejects `24:00`+); inline error `"End must be before midnight"`; Save disabled. (M2 explicitly does NOT support cross-midnight blocks.)
- **Soft overlap warning** → `overlapsExistingBlock(blocks, candidate)` returns the first colliding block; inline `<p role="status">Overlaps with [name]</p>`; Save **still enabled** per AC #26.
- **Half-open boundary** → `overlapsExistingBlock` uses `<` not `≤` on the end-vs-start comparison; back-to-back `10:00–11:00` and `11:00–12:00` do NOT trigger the warning. Unit test asserts this directly.
- **Custom-range with zero weekdays** → `isValidCustomRange(rec)` returns false; inline error `"Pick at least one weekday"`; Save disabled.
- **First block before any category exists** → `categories.length === 0`; CategoryPicker renders only "+ New" and "Skip"; Save with `categoryId: null` is allowed.
- **Skip category** → Save sends `categoryId: null`; block stored; BlueprintBar excludes it (categoryId-null filter); TimelineBlock renders without color dot.
- **New category created then block Cancelled** → AddBlockSheet's `onCreate(category)` immediately dispatches `ADD_CATEGORY` (so the category persists in `state.categories` even if the user later taps Cancel on the block form). This satisfies AC #28 explicitly. The newly-created category also auto-selects on the block form, so Cancel discards only the block draft, not the category.
- **Sheet swipe-down (iOS)** → swipe-down dismissal is browser-native; M2 does NOT intercept it. Treated as silent-discard equivalent to Cancel per SG-m2-06. (No undo toast; that's M7 polish.)
- **`prefers-reduced-motion: reduce`** → AddBlockSheet wraps motion via `lib/reducedMotion.ts`'s media-query observer; new-block stagger collapses to instant; sheet open/close uses no `transition` properties.
- **Page refresh** → all state lost (no persistence until M8). M2 does not surface a banner; this is documented behavior. Tests assert `localStorage.length === 0` after Save (no accidental writes).
- **Very long Title** → CSS `text-overflow: ellipsis; overflow: hidden; white-space: nowrap` on TimelineBlock's title; M4's expanded view will reveal the full string.
- **Two categories with identical Name** → CategoryPicker renders both as separate chips (different IDs); selection by `categoryId` so disambiguation is automatic. AC #30 lock.
- **Reduced-motion + stagger** → `motion.div` reads `useReducedMotion()` from Framer Motion; on `true`, sets `transition: { duration: 0 }`.
- **`+` default Start** → `roundDownToHour(useNow())` per SG-m2-04 — string slice `now.slice(0, 2) + ':00'` (no Date math).
- **Empty-state card flicker** → unmounts as soon as `state.blocks.length > 0` (synchronous on dispatch); re-mounts only if every block is removed (M5+ surface). No transition on unmount in M2.

### Out of scope for M2

(Mirrored verbatim from SPEC § Out of scope:)

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
- Loose Bricks tray (standalone bricks with `parentBlockId: null`) — M3
- NowCard surfacing the active block — M3 or M4
- `programStart`-relative `dayNumber` — M8 (M1's `dayOfYear()` stays in M2)
- Lighthouse measurement from the sandbox — still pending Vercel access

### Migration table for prior-pivot tests

`docs/tests.md` carries M0 + M1 IDs. M2 mutates the schema layer (`lib/types.ts`) and several render paths. The component-test files affected:

| Component / test file                                                                                | Migration tag for M2                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/TopBar.test.tsx`                                                                         | `[survives]` — no behavior change.                                                                                                                                                                                                                    |
| `components/Hero.test.tsx`                                                                           | `[survives]` — `pct={0}` still hardcoded; scoring is M3.                                                                                                                                                                                              |
| `components/BlueprintBar.test.tsx`                                                                   | `[re-author: add non-empty-categorized-blocks segment-rendering tests; preserve M1 empty-outline tests]` — M1 IDs preserved with `(re-authored M2)` suffix; new M2 IDs `C-m2-NN`.                                                                     |
| `components/Timeline.test.tsx`                                                                       | `[re-author: assert TimelineBlock cards render layered above SlotTapTargets; assert SlotTapTargets has 24 buttons; preserve M1 hour-grid + NowLine + auto-scroll tests]` — M1 IDs preserved with `(re-authored M2)` suffix.                           |
| `components/TimelineBlock.test.tsx`                                                                  | `[re-author: file flips from obsolete to active; consume new Block schema; absolute positioning math; height-with-and-without-end; category-color-dot conditional]` — fresh M2 IDs `C-m2-NN`.                                                         |
| `components/Brick.test.tsx` / `BrickStepper.test.tsx` / `Scaffold.test.tsx` / `EmptyBricks.test.tsx` | `[obsolete: not-imported-in-M2]` — unchanged from M1.                                                                                                                                                                                                 |
| `components/BottomBar.test.tsx`                                                                      | `[re-author: assert + button calls onAddPress prop on click; Voice button visibly-disabled treatment from M1 untouched]` — M1 IDs preserved with `(re-authored M2)` suffix.                                                                           |
| `components/EditModeProvider.test.tsx`                                                               | `[survives]`.                                                                                                                                                                                                                                         |
| `components/AnimatedPercent.test.tsx`                                                                | `[survives]`.                                                                                                                                                                                                                                         |
| `app/(building)/BuildingClient.test.tsx`                                                             | `[re-author: state managed via reducer; sheet-open state wired; assert BlueprintBar receives blocks; assert Timeline receives onSlotTap; assert AddBlockSheet receives onSave + onCreateCategory]` — M1 IDs preserved with `(re-authored M2)` suffix. |
| `app/(building)/BuildingClient.imports.test.ts`                                                      | `[re-author: TimelineBlock now expected; M1 forbade it]` — flip the assertion.                                                                                                                                                                        |
| `lib/types.test.ts` (if any; otherwise new)                                                          | `[re-author: closed-set Category enum DELETED; replaced by object shape]` — fresh M2 IDs `U-m2-NN`. Old enum tests deleted with explicit explanation.                                                                                                 |
| `lib/data.test.ts`                                                                                   | `[re-author: defaultState() returns { blocks: [], categories: [] }; reducer handles ADD_BLOCK + ADD_CATEGORY exhaustively]` — M1 IDs preserved with `(re-authored M2)` suffix.                                                                        |
| `tests/e2e/m1.spec.ts`                                                                               | `[survives]` — empty-Building scenarios still apply when no blocks added.                                                                                                                                                                             |
| `tests/e2e/m1.a11y.spec.ts`                                                                          | `[survives]`.                                                                                                                                                                                                                                         |
| `tests/e2e/m2.spec.ts` (new)                                                                         | New — `+`-button-add path, slot-tap-add path, Cancel-no-block, sheet open with default-start, validation errors, soft overlap warning, new-category inline flow. Fresh IDs `E-m2-NN`.                                                                 |
| `tests/e2e/m2.a11y.spec.ts` (new)                                                                    | New — axe scan with sheet OPEN and CLOSED. Fresh IDs `A-m2-NN`.                                                                                                                                                                                       |

EVALUATOR fails any milestone that drops a `[survives]` test without explanation OR that removes a closed-set-Category enum test without confirming all consumers migrated. The TESTS-mode dispatch will translate the above into a proper migration table at the top of `tests.md`'s M2 section and start fresh M2 IDs from `U-m2-001`, `C-m2-001`, `E-m2-001`, `A-m2-001` (continuing the per-milestone numbering convention).

### Spec gaps (locked at PLAN per pre-resolved defaults; new ones surfaced for Gate #1)

- **SG-m2-01 — Category color palette.** Locked: 12 hex values listed in Design tokens above (`--cat-1`..`--cat-12`). All checked WCAG AA on `#07090f`. The 4 legacy `--cat-*` vars are **removed** from `app/globals.css`. No category names ship in code (per § 0.14 antipattern 2).
- **SG-m2-02 — Uncategorized block in BlueprintBar.** Locked: **excluded** entirely — § 0.14 antipattern 3 ("absence of a category is itself meaningful"). BlueprintBar's segment math filters `categoryId !== null && end !== undefined`.
- **SG-m2-03 — Loose Bricks tray location.** Carried to M3 PLAN; does NOT block M2.
- **SG-m2-04 — `+` default Start.** Locked: round current time DOWN to nearest hour. Implementation: `now.slice(0, 2) + ':00'` (string-only, no Date math).
- **SG-m2-05 — End = blank rendering.** Locked: thin marker, `HOUR_HEIGHT_PX / 12` ≈ 5 px tall.
- **SG-m2-06 — Sheet swipe-down with dirty form.** Locked: silent discard. Undo toast deferred to M7.
- **SG-m2-07 — `categoryId` FK vs inline.** Locked: FK (`categoryId: string | null`). SPEC schema reflects.
- **SG-m2-08 — Empty timeline row tap target.** Locked: 24 absolutely-positioned transparent `<button>` elements via new `components/SlotTapTargets.tsx`. z-index above hour-grid, below blocks.
- **SG-m2-09 — Sheet focus trap is local to AddBlockSheet, not the M0 `<Sheet>` primitive (NEW).** Surfaced by analysis: `<Sheet>` ships `role="dialog"` + `aria-modal="true"` + ESC-close, but does NOT trap Tab focus. M2 adds the focus trap as a local effect inside `AddBlockSheet` (`useFocusTrap`) so the M0 surface contract stays unchanged for other consumers (Settings sheet later, etc.). If the trap proves needed by other M0 consumers, M5 or later may promote it into the primitive — out of scope for M2. **Recommendation: keep local; lock at Gate #1.**
- **SG-m2-10 — `lib/dharma.ts:fmtRange` no-end behavior (NEW).** Surfaced by analysis: existing `fmtRange(start, end)` assumes both arguments. With M2's `end?: string`, callers (TimelineBlock, possibly NowCard at M3) need a no-end branch returning just `start`. Two options: (a) widen `fmtRange` to accept `end: string | undefined` and branch internally, (b) add a 1-line `fmtTimeOrRange(start, end?)` wrapper. **Recommendation: (a)** — single source of truth. Lock at Gate #1.
- **SG-m2-11 — Category color picker in NewCategoryForm: required vs optional (NEW).** SPEC AC #11 says Save is enabled when "Title is non-blank, Start is valid, and any sub-form errors are clear." For NewCategoryForm specifically, AC #10 says "Name `<Input>` and a 12-color palette picker" but doesn't explicitly say color is required. **Recommendation: required** — picking no color creates a category with no visual identity, which contradicts the entire BlueprintBar UX. Lock the "Done" button as `aria-disabled` until both Name and Color are set. Surface at Gate #1 for ratification.

### Cross-cutting concerns BUILDER will hit

- **`useReducer` action union must be exhaustive.** Implement reducer with a `switch (action.type)` and a `default: return assertNever(action)` arm. Every new action kind in future milestones MUST extend the `Action` union AND add a switch case — `assertNever` makes the omission a compile-time error. Document this contract in a comment above `lib/data.ts:reducer`.
- **`<Sheet>` nesting decision.** The M0 `<Sheet>` primitive (read at `components/ui/Sheet.tsx`) is a single `role="dialog"` portal with `children`; it does NOT support a stack of sheets and does NOT trap focus. **Decision: a single `<Sheet>` instance with conditional sub-views.** `AddBlockSheet` holds `view: 'block' | 'newCategory'` local state; the same `<Sheet>` body renders either the block-form or the new-category form depending on `view`. NewCategoryForm is NOT a separate `<Sheet>` instance. Rationale: (a) avoids nested portals (which break focus restoration), (b) the SPEC describes "the sheet expands" (singular), (c) keeps the M0 primitive contract minimal. The `<Sheet>` `title` prop is updated per view (`"Add Block"` vs `"New Category"`) so the SR-announced label stays accurate. A "Back" arrow on the new-category view returns to `'block'` without dismissing the sheet.
- **TimelineBlock height math.** Single source of truth: `lib/timeOffset.ts:timeToOffsetPx`. Compute `top = timeToOffsetPx(block.start, HOUR_HEIGHT_PX)` and (when end is set) `height = timeToOffsetPx(block.end, HOUR_HEIGHT_PX) - top`; else `height = HOUR_HEIGHT_PX / 12`. Do NOT duplicate the math. `HOUR_HEIGHT_PX` stays imported from `components/Timeline.tsx` (M1's exporter); if it isn't already exported from a shared module, BUILDER's first M2 commit must hoist it to `lib/timeOffset.ts` and re-import in Timeline (single-source-of-truth refactor).
- **BlueprintBar non-empty path math.** Aggregate **by `categoryId`**, not per-block. Sum each category's total duration across all of today's blocks; segment width = `(categorySumMinutes / totalCategorizedMinutes) * 100`% (relative to ONLY categorized blocks, NOT to the 24-hour day). Render in `categoryId`-sorted order for determinism. Avoid `Object.entries` ordering surprises by sorting explicitly. Skip uncategorized + no-end blocks before aggregation.
- **ESLint `react-hooks/exhaustive-deps`.** M1's auto-scroll-on-mount `useEffect` already disables this rule (justified — runs once on mount). M2's reducer + sheet-state effects must NOT add new disables. If a builder hits a deps complaint, fix it via `useCallback` or by moving the dep into the effect; do not disable.
- **`crypto.randomUUID()` test mocking.** All Vitest tests that assert specific block/category IDs MUST `vi.mock('@/lib/uuid', () => ({ uuid: () => 'uuid-1' }))` (or use a sequential counter for multi-block scenarios). Without mocking, snapshot tests would be non-deterministic.
- **`<Chip>` `role="radio"` for single-select.** M0's `<Chip>` primitive doesn't currently set `role="radio"`. M2's RecurrenceChips and CategoryPicker wrap their chip groups with `role="radiogroup"` and pass `role="radio"` + `aria-checked={selected}` per chip via `<Chip>`'s pass-through props (it forwards `...rest` to the underlying `<button>`). Verify this in M0 `Chip.tsx` during BUILDER's first read; if it doesn't forward, the wrapper handles via `aria-*` on the parent and the chip becomes `role="presentation"`. **Document the discovery in a code comment** rather than modifying M0's primitive.
- **`prefers-reduced-motion` handoff.** Use `lib/reducedMotion.ts:useReducedMotion()` (or Framer Motion's hook of the same name — pick one consistently and document) inside `AddBlockSheet` and `TimelineBlock`. The M0 `<Sheet>` primitive does NOT consult this token internally (verified by Read), so M2 must wrap its open animation in the consumer.
- **Half-open `[start, end)` test fixture.** Add a unit test fixture asserting `overlapsExistingBlock(blocks=[10:00–11:00], candidate={start:11:00, end:12:00})` returns `null`. ADR-006 lock — every future block-math feature inherits this contract.

## Milestone 3 — Add Brick Flow + Live Scoring + Visual Fill — Plan

### Pillars consumed

- **§ 0.1 — the wedge.** Dharma scores PROOF, not plans. M3 wires the math layer (already shipped in M0) to a real schema and to live DOM, so every brick-add observably changes `dayPct(state)` even when the change is `0 → 0`.
- **§ 0.3 — visual identity.** The Hero ring is the dopamine surface. M3 introduces it as an SVG arc wrapping (not replacing) M1's `<Hero>` numeral.
- **§ 0.5 — interaction primitives.** Three brick types — `tick` / `goal` / `time` — surfaced via the AddBrickSheet type-selector chip cards. M3 wires creation; M4 wires logging.
- **§ 0.9 — data model.** Bricks are never timed (M3 stores `durationMin` for `time` bricks but does not animate elapsed time — that's M4). Bricks live inside a Block via `block.bricks[]` OR standalone in `state.looseBricks[]`. Brick category is independent of parent block (`categoryId` on the Brick, not inherited at read-time).
- **§ 0.11 — Loose Bricks tray LOCKED Option A.** Pinned above dock; visible iff `blocks.length > 0 || looseBricks.length > 0`; collapsed chip-row default; chevron expands.
- **§ 0.14 — no factory anything.** Per ADR-039, M3 ships zero factory bricks, zero factory categories, zero seed data.
- **ADR-019 — recurrence stays untouched in M3.** Brick is non-recurring (recurrence lives on Block only); M3 does not extend the `Recurrence` union.
- **ADR-022 — one feature per dispatch.** This entry covers M3 only — Add Brick flow + scoring extension + visual fill primitives. M4 (logging) and M5 (edit/delete) are explicit out-of-scope.
- **ADR-026 — single planning gate.** This `plan.md` entry will be reviewed alongside the `tests.md` entry written in the auto-chained `mode: TESTS` dispatch. No code is written between PLAN and TESTS.
- **ADR-027 — commit prefix.** `docs(plan-m3): …` for this entry; tests dispatch uses `docs(tests-m3): …`.
- **ADR-031 — 44 px touch target.** All `<BrickChip>` instances ≥ 44 px tall. Loose Bricks tray's collapsed-row chips also clear 44 px (chip body inside a ≥ 56 px row).
- **ADR-032 — categories user-defined.** AddBrickSheet's category picker reuses the M2 `<CategoryPicker>` + `<NewCategoryForm>` verbatim; brick → category resolution is by FK lookup at render time.
- **ADR-034 — blocks always timed.** Unchanged in M3. The Loose Bricks tray exists precisely because bricks are NOT bound to time.
- **ADR-035 — bricks can be standalone.** M3 wires the standalone path via the tray's `+` Brick pill (`parentBlockId: null` save).
- **ADR-039 — ships empty.** `looseBricks: Brick[]` initial value is `[]`; the literal-empty state (zero blocks AND zero loose bricks) hides the tray entirely so M1's empty-state card stays the sole surface.

### File structure

**New files (6):**

- `components/AddBrickSheet.tsx` — `"use client"` host. Composes M0 `<Sheet>` + form (Title `<Input>`, 3-chip Type selector, per-type fields, `<CategoryPicker>`, sticky Save, X Cancel). Owns local form state + view toggle (`view: 'brick' | 'newCategory'`). Mirrors M2's `<AddBlockSheet>` single-`<Sheet>`-instance pattern.
- `components/BrickChip.tsx` — Rounded-rect 44-px-tall chip. Background = category color at 12% alpha (or `--surface-2` when uncategorized). Foreground gradient overlay = category color at 60% alpha, width = `brickPct(brick)%`. Animated via M0 `brickFill` token. Type-specific badge slot. Used in expanded blocks AND in the tray.
- `components/HeroRing.tsx` — SVG circle wrapping the existing `<Hero>` numeral. Stroke-dashoffset reflects day score. Animated via M0 `brickFill` token. SSR-safe via the M1 `mounted` two-pass pattern (server renders `0%`, client hydrates).
- `components/LooseBricksTray.tsx` — Pinned-above-dock region. Renders iff `state.blocks.length > 0 || state.looseBricks.length > 0`. Collapsed chip-row default (max-height 56 px); chevron-up expands to vertical list (max-height ~40 vh). Always shows the `+ Brick` pill in the rightmost trailing position.
- `lib/celebrations.ts` — Pure helpers for cross-detection. `useCrossUpEffect(value, threshold, fn)` (custom hook) — fires `fn()` once when `value` transitions from `< threshold` to `>= threshold`, resets when value drops back below threshold. Used by `<TimelineBlock>` (block 100% bloom + chime + `success` haptic) and `<HeroRing>` host (day 100% fireworks + `notification` haptic). Pure module so unit tests can drive it directly.
- `public/sounds/chime.mp3` — Single small (< 30 KB) chime asset. Loaded via `new Audio('/sounds/chime.mp3')` on app boot. Mute respect: lets the OS handle mute (no manual gate in M3); SG-m3-12 recommendation.

**Files extended (9):**

- `lib/types.ts` — Rewrite `Brick` per locked schema (adds `id` / `categoryId` / `parentBlockId`; renames goal/time progress fields). Add `looseBricks: Brick[]` to `AppState`. Extend `Action` union with `{ type: 'ADD_BRICK'; brick: Brick }`. `assertNever` exhaustiveness preserved.
- `lib/data.ts` — `defaultState()` returns `{ blocks: [], categories: [], looseBricks: [] }`. Reducer adds `ADD_BRICK` case; routes by `brick.parentBlockId` (null → push to `looseBricks`, non-null → find block by id and push to its `bricks[]`, immutably).
- `lib/dharma.ts` — `brickPct` field reads updated to match new schema (`b.count / b.target` for goal; `b.minutesDone / b.durationMin` for time). `dayPct(blocks: Block[])` REPLACED by `dayPct(state: AppState)` — averages over the union of `state.blocks` (each as one `blockPct` unit) and `state.looseBricks` (each as one `brickPct` unit); empty-state floor `0`. New: `categoryDayPct(state: AppState, categoryId: string): number` — averages bricks AND blocks attributed to that category; bricks-inside-block contribute to THEIR own category, not the block's; standalone bricks with `categoryId: null` excluded from category-filtered queries but counted in `dayPct`. All return `[0, 100]`.
- `lib/motion.ts` — Add `fireworks: 1.6` second (or 1600 ms) Duration token + `easeOut` curve binding. Existing `brickFill`, `bloom`, `modalIn`, `modalOut`, `stagger` tokens reused unchanged.
- `lib/blockValidation.ts` — Add `isValidBrickGoal(target: number): boolean` (integer ≥ 1) and `isValidBrickTime(durationMin: number): boolean` (integer ≥ 1). No new module — same file, same predicate naming convention.
- `components/Hero.tsx` — Wrap the existing numeral inside the new `<HeroRing>`. Numeral text node + font tokens unchanged. Now reads `dayPct(state)` instead of `dayPct(state.blocks)`. Adds `aria-label="Day score: ${pct}%"` + `aria-live="polite"`.
- `components/TimelineBlock.tsx` — Add left vertical scaffold bar (4 px wide, full card height, fills bottom-up by `blockPct(block)`; color = category color or `--text-dim`). Add tap-to-expand: card grows in height (max-height transition 200 ms eased; reduced-motion → instant) revealing vertical list of `<BrickChip>`s + `+ Add brick` ghost button. Re-tap collapses. Wire `useCrossUpEffect(blockPct, 100, fireBloom)` for one-shot bloom + chime + `success` haptic. View-mode-only expand (M5 wires edit-mode interactions).
- `components/BlueprintBar.tsx` — Per-segment opacity = `0.3 + ((blockPct(block) / 100) × 0.7)`, clamped `[0.3, 1]`. Uncategorized blocks remain excluded (SG-m2-02 invariant). Aggregation, sort order, and empty-outline fallback from M2 untouched.
- `app/(building)/BuildingClient.tsx` — Add a second piece of sheet UI state for AddBrickSheet (`brickSheetState: { open: boolean; parentBlockId: string | null; defaultCategoryId: string | null }`). Pass `onAddBrick` callback into `<TimelineBlock>` (for inside-block path) and `<LooseBricksTray>` (for standalone path). On `<AddBrickSheet>`'s `onSave(brick)`, dispatch `{ type: 'ADD_BRICK', brick }` and close. Mount `<LooseBricksTray>` between the timeline scroll container and `<BottomBar>`. Wire `useCrossUpEffect(dayPct, 100, fireFireworks)`.

**Files unchanged (8) — why still clean:**

- `lib/uuid.ts` — Mockable seam from M2. M3 generates Brick IDs via the same `uuid()` wrapper.
- `lib/haptics.ts` — M0 primitive. M3 calls `light` (chip-select), `success` (Save + block 100%), `medium` (validation error), `notification` (day 100%) — all already exposed.
- `components/AddBlockSheet.tsx` — M2 surface untouched. M3's AddBrickSheet is a sibling, not an extension.
- `components/SlotTapTargets.tsx` — M2 contract preserved (returns null when `editMode === true`, per C-m2-013). M3 adds no edit-mode-specific behavior.
- `components/CategoryPicker.tsx` — Reused as-is inside AddBrickSheet. First reuse outside `<AddBlockSheet>`.
- `components/NewCategoryForm.tsx` — Reused as-is inside AddBrickSheet. Single `<Sheet>` instance with `view: 'newCategory'` view-toggle pattern carries over.
- `components/BottomBar.tsx` — `+` button stays "New Block" verb. No long-press menu, no chooser modal (SG-m3-08 lock).
- `components/EditModeProvider.tsx` — M2 wiring untouched. M3 ships no edit-mode-specific affordances (those are M5).

### Migration tags

| Component / file                         | Prior tag                        | M3 tag                                                                          | Rationale                                                                                                                                          |
| ---------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/BrickChip.tsx`               | `[obsolete: not-imported-in-M2]` | `[re-author]`                                                                   | Promoted to active surface. Built fresh against the locked Brick schema — do NOT carry forward any pre-pivot field reads.                          |
| `components/BrickStepper.tsx`            | `[obsolete]`                     | `[obsolete]`                                                                    | M4 logging surface. M3 does not import.                                                                                                            |
| `components/BrickTimer.tsx` (if present) | `[obsolete]`                     | `[obsolete]`                                                                    | M4 logging (per ADR-017). M3 does not import.                                                                                                      |
| `components/Brick.tsx` (legacy wrapper)  | `[obsolete]`                     | `[obsolete]`                                                                    | Replaced by `<BrickChip>` in M3. M3 does not import.                                                                                               |
| `components/NowCard.tsx`                 | `[obsolete: not-imported-in-M2]` | `[obsolete: not-imported-in-M3]`                                                | Active-block surfacing is M3 or M4 per spec; M3 still defers. Keeps the file un-rendered.                                                          |
| `components/EmptyBricks.tsx`             | `[obsolete]`                     | `[obsolete: replaced by Loose Bricks tray empty pill]`                          | The `+ Brick` pill in the collapsed tray IS the empty-state surface for standalone bricks. The legacy empty-bricks card is permanently superseded. |
| `components/Scaffold.tsx`                | `[obsolete]`                     | `[obsolete]`                                                                    | The scaffold left-bar is now an inline DOM element inside `<TimelineBlock>`, not a separate component.                                             |
| `components/Hero.tsx`                    | `[survives]`                     | `[re-author: wrap numeral in <HeroRing>; consume dayPct(state)]`                | Numeral + font unchanged; ring is added around it; `pct` prop signature widened or replaced (decision below).                                      |
| `components/TimelineBlock.tsx`           | `[re-author M2]`                 | `[re-author: scaffold bar + tap-to-expand + <BrickChip> list + cross-up bloom]` | View-mode-only expand. Edit-mode behavior is M5.                                                                                                   |
| `components/BlueprintBar.tsx`            | `[re-author M2]`                 | `[re-author: per-segment opacity = 0.3 + (blockPct × 0.7)]`                     | Aggregation logic from M2 preserved verbatim.                                                                                                      |
| `app/(building)/BuildingClient.tsx`      | `[re-author M2]`                 | `[re-author: AddBrickSheet wiring + LooseBricksTray mount + day-100 cross-up]`  | Reducer + sheet-state pattern from M2 carries over.                                                                                                |

Test-file migration table will live in the auto-chained `tests.md` M3 section (per M2's convention). M2 test IDs are preserved with `(re-authored M3)` suffix where the underlying behavior changes; new IDs continue from per-milestone counters supplied in the TESTS dispatch prompt.

### Data models

**`lib/types.ts` — final shapes (replaces M2's `Brick` stub):**

```ts
// Brick — REPLACES M2's stub. Adds id/categoryId/parentBlockId; renames goal/time progress fields.
type BrickBase = {
  id: string; // crypto.randomUUID via lib/uuid.ts
  name: string;
  categoryId: string | null; // FK to AppState.categories; null = uncategorized
  parentBlockId: string | null; // FK to AppState.blocks; null = standalone (loose)
};

export type Brick =
  | (BrickBase & { kind: "tick"; done: boolean })
  | (BrickBase & { kind: "goal"; target: number; unit: string; count: number })
  | (BrickBase & { kind: "time"; durationMin: number; minutesDone: number });

// AppState — extends M2's shape with looseBricks
export type AppState = {
  blocks: Block[]; // M2; each Block.bricks now gets populated in M3
  categories: Category[]; // M2
  looseBricks: Brick[]; // M3 — bricks with parentBlockId === null
};

// Action — extends M2's discriminated union; assertNever exhaustiveness preserved
export type Action =
  | { type: "ADD_BLOCK"; block: Block } // M2
  | { type: "ADD_CATEGORY"; category: Category } // M2
  | { type: "ADD_BRICK"; brick: Brick }; // M3 — routed by brick.parentBlockId
```

**Reducer addition (`lib/data.ts`):**

- `ADD_BRICK` case: if `action.brick.parentBlockId === null`, return `{ ...state, looseBricks: [...state.looseBricks, action.brick] }`. Otherwise, return `{ ...state, blocks: state.blocks.map(b => b.id === action.brick.parentBlockId ? { ...b, bricks: [...b.bricks, action.brick] } : b) }`. Immutable update; no in-place mutation.
- `defaultState()` returns `{ blocks: [], categories: [], looseBricks: [] }`.

**`lib/dharma.ts` — function-signature deltas:**

- `brickPct(b: Brick): number` — keeps 0..100 contract. Dispatches by `b.kind`. Field reads:
  - `tick`: `b.done ? 100 : 0`
  - `goal`: `Math.min(b.count / b.target, 1) * 100`
  - `time`: `Math.min(b.minutesDone / b.durationMin, 1) * 100`
- `blockPct(block: Block): number` — unchanged shape; still returns 0 when `block.bricks` is empty (the M4 "empty-block tickable as 0/1" rule lands with M4's tap-to-tick UX, not here).
- `dayPct(state: AppState): number` — REPLACES the prior `dayPct(blocks: Block[])` signature. Averages over `state.blocks` (each contributing `blockPct(block)`) and `state.looseBricks` (each contributing `brickPct(brick)`). Empty state (zero blocks AND zero loose bricks) → `0` (no divide-by-zero).
- `categoryDayPct(state: AppState, categoryId: string): number` — NEW. Averages over: (a) every Block whose `categoryId === categoryId` excluding those bricks under it whose own `categoryId !== categoryId`; (b) every Brick (inside-block + standalone) whose `categoryId === categoryId`. Practically: filter bricks-inside-block first by `brick.categoryId === categoryId` (NOT block.categoryId), include the block's own contribution only when `block.categoryId === categoryId`, include loose bricks with matching `categoryId`. Standalone bricks with `categoryId: null` are excluded. Empty (no matching units) → `0`.
- All return values in `[0, 100]`. Internal math uses 0..1 fractions; the boundary multiplies by 100.

**Persistence:** none in M3 (M8 wires `dharma:v1` localStorage). Page refresh clears state. Same as M2.

### Components

**`<HeroRing>` (NEW)**

- Props: `{ pct: number }` — caller passes `dayPct(state)`.
- Behavior: SVG `<svg>` with a single `<circle>` for the track + a second `<circle>` for the filled arc. `r = 56`, `circumference = 2 * Math.PI * r`. Filled-arc `stroke-dasharray = circumference`, `stroke-dashoffset = (1 - pct/100) * circumference`. Stroke = `var(--accent)`. Track stroke = `var(--surface-2)`.
- Hosts the existing numeral as a `<text>` element OR via absolute-positioned child container (decision: child container so M0's `<Hero>` font tokens stay unchanged).
- SSR safety: server renders with `pct={0}` (full empty arc) regardless of input; client hydrates to actual value via the M1 `mounted` two-pass pattern. Avoids hydration mismatch warnings forever-forward (even after M8 persistence rehydrates state).
- Motion: `dashoffset` change animated via M0 `brickFill` token (600 ms easeInOut). Reduced-motion → instant.
- A11y: `role="img"`, `aria-label={`Day score: ${Math.round(pct)}%`}`, `aria-live="polite"`. Numeral inside is `aria-hidden="true"` (the ring's `aria-label` is the canonical reading).

**`<BrickChip>` (NEW — promoted from `[obsolete]`)**

- Props: `{ brick: Brick; categories: Category[]; size?: 'sm' | 'md' }` — `'md'` (default, 44 px tall) for inside-block + expanded tray; `'sm'` (still ≥ 44 px per ADR-031) for collapsed tray row.
- Rendered DOM: outer rounded-rect (`border-radius: 12px`), background = category color at 12% alpha (resolved via `categories.find(c => c.id === brick.categoryId)?.color ?? var(--surface-2)`). Foreground = absolute-positioned gradient overlay (60% alpha of the same color), `width: ${brickPct(brick)}%`, `transition` driven by Framer Motion `brickFill` token. Title left-aligned, type-specific badge right-aligned.
- Type-specific badge:
  - `tick`: `☐` when `!done`, `✓` when `done` (lucide-react `Square` / `Check` icons).
  - `goal`: `${count} / ${target}${unit ? ' ' + unit : ''}`.
  - `time`: `${minutesDone} / ${durationMin} m ▶` (▶ = lucide-react `Play` icon, faded; M4 wires the actual play action).
- Tap target: M3 `onClick` is **explicitly empty** (no-op). M4 wires logging; M5 wires edit. The 44-px hit area is preserved.
- Motion: chip enter via `stagger` (30 ms between siblings) on first paint of an expanded block; single-element insert (the new chip from a Save) uses `0 ms` stagger (just fade-in via M0 `enterVariant`). Foreground gradient width change via `brickFill` token.
- Haptic: none on M3 tap (it's a no-op). M4 wires `light` on tick toggle, etc.
- A11y: outer is a `<button>`. `aria-label = `${brick.name}, ${brick.kind}, ${Math.round(brickPct(brick))}% complete`` + type-specific suffix:
  - `goal`: `, ${count} of ${target}${unit ? ' ' + unit : ''}`.
  - `time`: `, ${minutesDone} of ${durationMin} minutes`.

**`<LooseBricksTray>` (NEW)**

- Props: `{ looseBricks: Brick[]; categories: Category[]; onAddBrick: () => void }`.
- Owned state: `[expanded, setExpanded] = useState(false)` — session-only; refresh resets to collapsed (no M8 persistence).
- Render predicate (caller-side, in `BuildingClient`): mount this component iff `state.blocks.length > 0 || state.looseBricks.length > 0`. Tray is hidden in literal-empty state to preserve M1's empty-state contract.
- Collapsed (default, `max-height: 56px`): horizontal scroll row. `overflow-x: auto`. Contents in order: every loose brick as `<BrickChip size="sm">`, then trailing `+ Brick` pill (always last). `+ Brick` pill = small `<button>` with `Plus` icon + label, fixed-width.
- Expanded (`max-height: 40vh`): vertical list. Top: `+ Brick` ghost `<Button>` (full-width). Below: each loose brick as `<BrickChip size="md">` in insertion order.
- Chevron toggle: positioned at the tray's top-right edge. `ChevronUp` icon when collapsed, `ChevronDown` when expanded. Tap toggles `expanded` state.
- Motion: max-height transition 200 ms eased on toggle; reduced-motion → instant. New chip enter via `stagger`.
- Z-index: below `<AddBrickSheet>` z-index (sheet's full-screen overlay covers the tray). M2's `<AddBlockSheet>` z-index is reused as the reference value.
- A11y: outer `<section role="region" aria-label="Loose bricks" aria-expanded={expanded}>`. Chevron toggle has `aria-controls={listId}` pointing at the `<ul>` of bricks. `+ Brick` pill has `aria-label="Add loose brick"`.
- Haptics: chevron toggle = `light`. `+ Brick` pill = `light` on tap (matches M2 `+`-button-add convention).

**`<AddBrickSheet>` (NEW)**

- Props: `{ open: boolean; parentBlockId: string | null; defaultCategoryId: string | null; categories: Category[]; onSave: (brick: Brick) => void; onCreateCategory: (cat: Category) => void; onCancel: () => void }`.
- View toggle: `view: 'brick' | 'newCategory'` (mirrors M2 `<AddBlockSheet>`). Single `<Sheet>` instance; conditional sub-views.
- Form (view = `'brick'`):
  - Title `<Input>` — required, autofocus on open.
  - Type selector — 3 large `<Chip>` cards as a single-select group (`role="radiogroup"`); default = `'tick'`. Cards: Tick / Goal / Time. Selecting changes `kind`; per-type fields render below.
  - Per-type fields:
    - `'goal'`: `target` number `<Input>` (integer ≥ 1) + `unit` text `<Input>` (optional, may be blank).
    - `'time'`: `durationMin` number `<Input>` (integer ≥ 1).
    - `'tick'`: no extra fields.
  - Category — reuses M2 `<CategoryPicker>` (existing categories + `+ New` + `Skip`). Pre-fill: when `parentBlockId !== null`, defaults to `defaultCategoryId` (the parent block's `categoryId`); when `parentBlockId === null`, no pre-fill (leaves "no selection" state, equivalent to "Skip").
  - Save — `<Button>` primary amber, sticky bottom. `aria-disabled` until validation clears (Title non-blank AND, for `goal`, `isValidBrickGoal(target)` true AND, for `time`, `isValidBrickTime(durationMin)` true). On valid Save: emits `onSave({ id: uuid(), name, kind, categoryId, parentBlockId, …per-kind fields with progress fields zeroed })`.
  - Cancel — `<X>` icon top-left; tapping discards sheet state and closes (silent discard, no toast — matches M2 SG-m2-06).
- Sheet swipe-down (iOS): silent discard (matches M2).
- View toggle to `'newCategory'`: `<NewCategoryForm>` reused verbatim. On Done, dispatches `ADD_CATEGORY` (parent dispatches; same wiring as M2) AND auto-selects the new category on the brick form. On Cancel, returns to `'brick'` view without persisting.
- Focus trap: same `useFocusTrap` pattern as M2 `<AddBlockSheet>` — local effect, NOT a change to the M0 `<Sheet>` primitive.
- Motion: sheet open via M0 `modalIn`; close via `modalOut`. Reduced-motion → instant.
- Haptics: `light` on chip select; `success` on Save; `medium` on validation error (when user taps a disabled Save).
- A11y: M0 `<Sheet>` provides `role="dialog"` + `aria-modal="true"`. M3 sets `title="Add Brick"` (or `"New Category"` per view). Type-selector chip group: `role="radiogroup"`, each chip `role="radio"` + `aria-checked`.

**`<Hero>` (extended)**

- Props: was `{ pct: number; sub: string }` from M0/M1; M3 changes the consumer to pass `dayPct(state)` (the wider function).
- Now wraps the numeral inside `<HeroRing pct={pct}>`. Numeral text node + font tokens unchanged.
- A11y: the numeral becomes `aria-hidden="true"`; the `<HeroRing>` carries the `aria-label`. Sub-line below the ring is unchanged.

**`<TimelineBlock>` (extended)**

- New prop: `{ block: Block; categories: Category[]; onAddBrick: (parentBlockId: string) => void }` — opens `<AddBrickSheet>` with the block's id pre-set.
- New owned state: `[expanded, setExpanded] = useState(false)`.
- New DOM:
  - **Scaffold left-bar** — 4 px wide, full card height, absolutely positioned at the card's left edge. Bottom-up fill: inner `<div>` with `height: ${blockPct(block)}%` from the bottom, `background: ${category.color ?? var(--text-dim)}`. Animated via M0 `brickFill` token.
  - **Tap target** — entire card is the tap surface in view mode; `onClick = () => setExpanded(!expanded)`. Tapping the existing category-color dot (M2 `data-testid="category-dot"`) ALSO expands (no nested click-eaters).
  - **Expanded view** — when `expanded === true`, card grows in height (max-height transition 200 ms eased; reduced-motion → instant). Reveals: vertical list of `<BrickChip>` (one per `block.bricks[]`, insertion order), then `+ Add brick` ghost `<Button>` (full-width). Tap-handler: `onAddBrick(block.id)`. Re-tap card → collapses.
  - **Edit mode** — when `editMode === true` (from `<EditModeProvider>`), expand still works; M3 ships no edit-mode-specific affordances (jiggle / × / drag handles are M5).
- Cross-up effect: `useCrossUpEffect(blockPct(block), 100, () => { fireBloom(); fireChime(); haptic('success'); })`.
- Bloom: Framer-Motion spring (`springConfigs.bloom = { stiffness: 220, damping: 22 }`) — class added on cross transition, removed after settle.
- Chime: `new Audio('/sounds/chime.mp3').play()` (single-shot; OS handles mute).
- A11y: outer block becomes a `<button>` with `aria-expanded={expanded}` (true / false). The inner `<ul>` of bricks has `role="list"`. Each brick `<li>` wraps a `<BrickChip>`.

**`<BlueprintBar>` (extended)**

- Per-segment opacity = `Math.max(0.3, Math.min(1.0, 0.3 + (blockPct(block) / 100) * 0.7))`.
- Segment color, sort order, aggregation, and uncategorized-block-exclusion from M2 unchanged.
- Empty-outline fallback (zero blocks OR all-uncategorized) unchanged.

### Design tokens

**Reused from M0 / M2 (no change):**

- Motion: `brickFill` (600 ms easeInOut — chip foreground gradient + ring stroke-dashoffset + scaffold bar height), `bloom` (spring `{ stiffness: 220, damping: 22 }` — block 100% celebration), `modalIn` / `modalOut` (sheet open/close), `stagger` (30 ms between siblings — new chip insert).
- Palette: `--cat-1` … `--cat-12` (per M2 SG-m2-01 lock). All chip backgrounds, foreground gradients, scaffold bars, and BlueprintBar segments resolve through the user's chosen `category.color` hex (one of the 12).
- Surface: `--surface-2` for uncategorized chip backgrounds; `--text-dim` for uncategorized scaffold bars.
- Accent: `--accent` (amber) for the HeroRing filled-arc stroke + AddBrickSheet Save button.
- Type: existing `--fs-*` font-size scale and `--font-display` / `--font-ui` / `--font-body` carry over.

**New token (1):**

- `motion.fireworks` — Duration token. Recommended: `1600 ms` total particle burst, easeOut on individual particle decay. Implemented in `lib/motion.ts` alongside existing `brickFill` / `bloom` tokens.

### Edge cases

- **Block with zero bricks** → `blockPct = 0`. Scaffold bar empty. Expanded view shows only the `+ Add brick` ghost button.
- **Adding the first brick to an empty block** → block stays at 0% (new brick defaults to 0% — `done: false` / `count: 0` / `minutesDone: 0`). Scaffold bar stays empty. Dopamine arrives in M4 when logging fires.
- **`goal` brick with `target = 0` at form-time** → `isValidBrickGoal(0) === false`; Save `aria-disabled`; inline error `"Target must be ≥ 1"`.
- **`time` brick with `durationMin = 0` at form-time** → `isValidBrickTime(0) === false`; Save `aria-disabled`; inline error `"Duration must be ≥ 1 minute"`.
- **`goal` `count > target` at math-time** → `min(count/target, 1) × 100` caps at 100. M3 has no UX path here; this is a forward guard for M4 + M8 persistence migrations.
- **`time` `minutesDone > durationMin` at math-time** → same cap. Same forward-guard story.
- **Brick inside a block, brick category ≠ block category** → allowed. `categoryDayPct(state, brick.categoryId)` attributes the brick to ITS category, NOT the block's.
- **Standalone brick with `categoryId: null`** → counted in `dayPct(state)` (it's a unit). Excluded from `categoryDayPct(_, anyCatId)` (no category to attribute to).
- **HeroRing at 0%** → `stroke-dashoffset = circumference` (empty arc). Numeral `0%`.
- **HeroRing first state change** → animates from previous % to new % via `brickFill` token. Reduced-motion → instant.
- **HeroRing SSR/CSR mismatch** → server renders `pct={0}`; client hydrates to actual via `mounted` two-pass pattern. No hydration warnings.
- **BlueprintBar segment opacity at 0%** → `0.3` (floor). At 100% → `1.0`.
- **Block crosses 100% then drops below (M4 stepper down)** → bloom is one-shot per crossing; will not retrigger until block has been below 100% AND crossed up again. `useCrossUpEffect` tracks `prev` value via `useRef`.
- **Day crosses 100% then drops** → fireworks one-shot per crossing; same rule.
- **`prefers-reduced-motion: reduce`** → ring stroke animation collapses to instant; chip foreground fill collapses to instant; scaffold bar height fill collapses to instant; bloom suppressed (no spring class added); fireworks suppressed (overlay does not mount). Haptics + chime audio still fire (motion ≠ haptics ≠ audio).
- **AddBrickSheet swipe-down with dirty form** → silent discard (matches M2 SG-m2-06).
- **Sheet nesting** → single `<Sheet>` instance with `view: 'brick' | 'newCategory'` (matches M2). No nested portals.
- **Block-tap to expand: tap target** → entire block card. Tapping the category dot, scaffold bar, or any inner element ALSO expands.
- **Tray expand/collapse during AddBrickSheet open** → sheet traps focus; tray interactions blocked behind it.
- **Page refresh** → all state lost (no persistence until M8). Same as M2.
- **Brick name length** → CSS truncation with ellipsis on the chip; full name visible only after M5 edit surface (M3 / M4 do not surface the full name beyond the chip).
- **Two bricks with identical name inside the same block** → allowed (no de-dup; matches M2 category rule).
- **Tray hidden when `state.blocks.length === 0 && state.looseBricks.length === 0`** → M1 empty-state card is the sole surface. The first standalone-brick path opens up only after the user creates their first block (or has created at least one loose brick before all blocks were deleted in some future flow).
- **Save with `kind = 'goal'` and blank `unit`** → allowed. Brick chip badge renders `${count} / ${target}` with no unit suffix.
- **Tray collapsed row, many loose bricks** → horizontal `overflow-x: auto`. The `+ Brick` pill stays at the rightmost trailing position, scrolling into view as needed.
- **Block expanded, user deletes the parent block via M5** → out of scope (M5). M3 has no delete path.

### Out of scope

- Logging bricks: tick toggle, goal +/- stepper, time start/stop timer, manual time entry — **M4**.
- Block edit (rename, retime), brick edit (rename, retype, retarget) — **M5**.
- Block delete and brick delete with "Just today / All recurrences" prompts — **M5**.
- Drag-reorder for blocks AND for bricks within a block — **M6**.
- Polish layer: stagger on first paint, count-up on hero, "now" line glow, NOW tag, "Your Empire begins." card, brand-mark Easter egg, skeleton loaders, toasts — **M7**.
- Persistence (`dharma:v1` localStorage, schema migrations, multi-tab last-writer-wins) — **M8**.
- Calendar navigation (week strip, Castle / Kingdom / Empire), `appliesOn(rec, date)` resolver — **M9**. M3 still renders only today; recurrence kinds stored on Block from M2 are inert until M9.
- Voice mic — **M10**.
- Multi-day blocks crossing midnight — **never (or much later)**.
- "Empty block tickable as 0/1" UX — **M4**. The math floor is `0` in M3; M4 adds the tap-to-tick gesture that flips it to 1.
- Empire square light-up on day 100% — **M9**. M3 fires only the local fireworks overlay on the Building view.
- "+ Block" via long-press menu / brick-and-block chooser — **never**. M3 keeps M2's `+` = New Block; standalone-brick creation lives only inside the tray.
- Block-detail surface as a separate route or sheet — **never**. Block expand stays inline per § 0.5.
- NowCard surfacing the active block — deferred (still `[obsolete: not-imported-in-M3]`).
- Lighthouse measurement from sandbox — pending Vercel access (carries from M2).

### Decisions to honor

- **Brick schema LOCKED.** `kind: 'tick' | 'goal' | 'time'` discriminator. Tick: `done`. Goal: `count / target / unit`. Time: `minutesDone / durationMin`. Every Brick carries `id / categoryId / parentBlockId` FKs. Renames `current` → `count` (goal) and `current` → `minutesDone` (time) from M2's stub.
- **Scoring location LOCKED in `lib/dharma.ts` (extended).** No new `lib/scoring.ts`. All scoring functions return `[0, 100]` (not 0..1).
- **`dayPct` signature change LOCKED.** `dayPct(state: AppState)` replaces `dayPct(blocks: Block[])`. Every caller (M0/M1/M2 — currently `<Hero>` is the only consumer) migrates to pass `state`.
- **`categoryDayPct` brick attribution LOCKED.** Bricks-inside-block contribute to THEIR own category, not the parent block's category. Standalone bricks with `categoryId: null` are excluded from category-filtered queries but still count in `dayPct`.
- **Loose Bricks tray Option A LOCKED.** Pinned above dock; visible iff `blocks.length > 0 || looseBricks.length > 0`; collapsed chip-row default; chevron expand. Hidden in literal-empty state. (SG-m3-02; ratified at M2 ship-react Gate #2; recorded in spec § 0.11.)
- **HeroRing introduced now LOCKED.** SVG arc wrapping (not replacing) M1's numeral.
- **`+ Brick` verb location LOCKED.** Tray-only. No long-press menu, no chooser modal. BottomBar `+` stays "New Block".
- **AddBrickSheet pattern LOCKED.** Mirrors M2 `<AddBlockSheet>` — single `<Sheet>` instance with `view: 'brick' | 'newCategory'`. Reuses `<CategoryPicker>` + `<NewCategoryForm>` verbatim.
- **Motion tokens reused from M0** (`brickFill` / `bloom` / `modalIn` / `modalOut` / `stagger`). New token `fireworks` (1.6 s easeOut) added to `lib/motion.ts`.
- **Reduced-motion semantics.** Visuals (ring fill, chip fill, scaffold fill, bloom, fireworks) collapse to instant / suppressed. Haptics + chime audio still fire (motion ≠ haptics ≠ audio).
- **ADRs honored:** ADR-019 (recurrence untouched on Brick), ADR-022 (one feature per dispatch), ADR-026 (single planning gate), ADR-027 (commit prefix `docs(plan-m3): …`), ADR-031 (44 px touch target), ADR-032 (categories user-defined), ADR-034 (blocks always timed), ADR-035 (bricks can be standalone), ADR-039 (ships empty).
- **No factory data (ADR-039).** No example brick names, no example category names, no seed bricks. `looseBricks: []` initial value.

### Open spec gaps still to resolve at Gate #1

- **SG-m3-01 — Brick category FK vs inline.** **LOCKED** (FK; matches M2 SG-m2-07 ratification). Schema reflects: `categoryId: string | null`.
- **SG-m3-02 — Loose Bricks tray location.** **LOCKED Gate #2 (M2 ship-react)** — Option A (pinned above dock, visible iff `blocks > 0 || looseBricks > 0`, collapsed chip-row default, chevron expand). Recorded in spec § 0.11.
- **SG-m3-03 — Bricks: embedded under blocks vs flat array.** **LOCKED** — embedded for inside-block (`block.bricks[]` populated) AND flat for standalone (`state.looseBricks[]`). Matches M8 persistence shape.
- **SG-m3-04 — Inside-block brick category default.** **Awaiting Gate #1.** PLANNER recommends: pre-fill brick `categoryId` to the parent block's `categoryId`, overrideable in the AddBrickSheet (including to `null` via "Skip"). Alternative is "always blank, force user to pick." Recommendation rationale: matches the user's mental model that "this brick belongs to this block" without forcing a redundant tap.
- **SG-m3-05 — 100% bloom / chime / fireworks: ship in M3 or defer.** **Awaiting Gate #1.** PLANNER recommends: ship the wiring + tests via state injection in M3. Defer to M4 means M4 ships TWO surfaces (logging + celebrations) which dilutes the M3 / M4 boundary. M3 has no user path to logging, so the celebrations only fire from injected test state — but the cross-up effect, the bloom DOM hook, and the fireworks overlay component are all in place when M4's first stepper tick lands.
- **SG-m3-06 — Block expand mechanism.** **LOCKED** — tap-to-expand in view mode; max-height transition 200 ms eased; re-tap collapses. No FLIP magic in M3 (that's M7). Carry the simplest implementation through.
- **SG-m3-07 — Hero ring component introduced now.** **LOCKED** — `<HeroRing>` introduced in M3 as SVG with stroke-dasharray / stroke-dashoffset. Numeral lives inside.
- **SG-m3-08 — Where the `+ Brick` verb lives.** **LOCKED** — tray-only. BottomBar `+` keeps "New Block" verb. Trade-off: in literal-empty state there's no path to add a standalone brick first. Acceptable per § 0.14 antipattern 1 (a single atomic action probably IS a brick, but in literal-empty state the user lays a block first — the tray opens up immediately after).
- **SG-m3-09 — Empty-block scoring in M3.** **LOCKED** — `blockPct({ bricks: [] }) === 0` in M3. The "empty block tickable as 0/1" rule lands in M4 with the tap-to-tick gesture.
- **SG-m3-10 — Day score with zero bricks.** **LOCKED** — `dayPct({ blocks: [...], looseBricks: [...] })` averages over union of (blocks + looseBricks) treating each as one unit. Zero-zero literal-empty → `0`. Migration: every `dayPct(state.blocks)` call site migrates to `dayPct(state)`. Currently `<Hero>` is the only caller.
- **SG-m3-11 — Bloom + chime + fireworks reduced-motion behavior.** **Awaiting Gate #1.** PLANNER recommends: bloom and fireworks visuals → suppressed under `prefers-reduced-motion`. Chime is audio → still plays unless OS-muted. Haptics still fire (haptics are tactile, not motion).
- **SG-m3-12 — Audio asset for the chime.** **Awaiting Gate #1.** PLANNER recommends: ship a single small (< 30 KB) chime as `public/sounds/chime.mp3`. Loaded on app boot via `new Audio()`. No external dep. Mute respect: let the OS handle mute (no manual gate); revisit in M7 polish if real users report a need.
- **SG-m3-13 — Brick chip touch target during expanded block.** **Awaiting Gate #1.** PLANNER recommends: 44 px minimum height per ADR-031, regardless of `size` prop. Chips do not double-purpose as logging surfaces in M3 (tap = no-op). M3 still keeps the tap target compliant so M4 doesn't have to resize.
- **SG-m3-14 — `<LooseBricksTray>` z-index relative to AddBrickSheet.** **Awaiting Gate #1.** PLANNER recommends: tray z-index < AddBrickSheet z-index. Reuse M2 `<AddBlockSheet>`'s z-index value as the reference.
- **SG-m3-15 — Brick add via tray when tray is collapsed.** **Awaiting Gate #1.** PLANNER recommends: the `+ Brick` pill is always present in the collapsed row (rightmost trailing position). User does NOT need to expand the tray to add a brick. Expand is only for browsing existing bricks.
- **SG-m3-16 — `Block.bricks` ordering in expanded view.** **Awaiting Gate #1.** PLANNER recommends: render in insertion order (the order they appear in `block.bricks[]`). M6 wires drag-reorder. Tests assert order matches array order.
- **SG-m3-17 — `<HeroRing>` SSR.** **Awaiting Gate #1.** PLANNER recommends: server renders the ring at `pct={0}` (full empty arc); client hydrates to actual day score with a 600 ms ease-in via `mounted` two-pass pattern. Forward-compatible with M8 persistence rehydration.
- **SG-m3-18 — Stagger fade-in on new chip insert.** **Awaiting Gate #1.** PLANNER recommends: 30 ms between chips on first render of an expanded block; `0 ms` (no stagger) when adding ONE chip post-hoc (single-element insert doesn't need a stagger sequence). Reduced-motion → instant in either case.

---

## Milestone 4a — Tick Brick Logging — Plan

### Pillars consumed

§ 0.1 (the wedge — Dharma scores proof, not plans), § 0.3 (every tap is a brick laid), § 0.5 (interaction primitives — the simplest verb is a tick), § 0.9 (data model — `tick` brick is `done: boolean`), § 0.10 (haptic on every tap), ADR-031 (44 px touch target), ADR-039 (ships empty), ADR-041 (single-gate Loop — VERIFIER will audit this plan + tests before BUILDER starts).

### Intent

Wire the simplest user-driven verb in the entire app: **tap a tick brick to mark it done.** This is the moment Dharma stops being a setup screen and starts being a tracker. M4a delivers ONLY the tick verb; goal stepper is M4b, time timer is M4c. Every M3 surface (HeroRing, BlueprintBar opacity, scaffold left-bar, BrickChip rendering, AddBrickSheet, LooseBricksTray, AddBlockSheet, EditModeProvider) survives unchanged at the structural level — M4a additively wraps the tick chip in a tap surface, dispatches a new reducer action, and ships the chime audio asset that M3 deferred per SG-m3-12. M4a is also the first feature that fires `useCrossUpEffect` from a real user gesture; M3 ships the hook unwired (only `lib/celebrations.test.ts` injects state). M4a closes that loop end-to-end: tap → reducer → cascade visuals → bloom + chime + fireworks.

**What this is NOT:** goal stepper (M4b). Time timer (M4c). Block edit / brick edit / brick delete (M5). Drag reorder (M6). FLIP block-expand magic (M7). Persistence (M8).

### File structure

| Path                                | Tag                    | Role in M4a                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/types.ts`                      | `[extends]`            | Add `LOG_TICK_BRICK` member to the `Action` discriminated union. No other type changes. `assertNever` exhaustiveness preserved.                                                                                                                                                                                                                                                                                                                                 |
| `lib/data.ts`                       | `[extends]`            | Add a `case "LOG_TICK_BRICK":` arm to the reducer. Routes by `brickId`: search `state.blocks[*].bricks[]` first, then `state.looseBricks[]`; flip `done` on the matching brick; return new `AppState` (immutable update). No-op return when id is unmatched (defensive, matches M3 ADD_BRICK pattern). Non-tick bricks with the matching id are also a no-op (defensive — tap dispatch only fires for tick chips, but the reducer guards against future drift). |
| `lib/dharma.ts`                     | `[survives unchanged]` | `brickPct` already returns `done ? 100 : 0` for tick (lines 32-33). `blockPct` and `dayPct(state)` already cascade. No math changes.                                                                                                                                                                                                                                                                                                                            |
| `lib/celebrations.ts`               | `[survives unchanged]` | M3 ships `useCrossUpEffect` complete. M4a only adds **call sites** (in `TimelineBlock` for block-100 and in `BuildingClient` for day-100). The hook itself is untouched.                                                                                                                                                                                                                                                                                        |
| `lib/audio.ts`                      | `[new]`                | Tiny helper: lazily constructs a single `HTMLAudioElement` for `/sounds/chime.mp3` at first call, caches it, exposes `playChime()` that calls `.play()` inside `try/catch` (silent failure on iOS pre-unlock or offline). Server-side / SSR guard: returns no-op when `typeof Audio === 'undefined'`.                                                                                                                                                           |
| `lib/haptics.ts`                    | `[survives unchanged]` | `haptics.light` / `haptics.success` / `haptics.notification` already shipped in M0. M4a calls them from new sites.                                                                                                                                                                                                                                                                                                                                              |
| `lib/motion.ts`                     | `[extends]`            | Add `fireworks` motion token (1.6 s easeOut) per spec.md M3 line 1124 ("New token `fireworks`...") — M3 plan reserved this; M4a is where the overlay actually consumes the token. If M3 already shipped this token (verify), tag becomes `[survives unchanged]`. **PLANNER VERIFY:** `lib/motion.ts` line 34 currently has `brickFill`; check whether `fireworks` was added in M3 ship; if not, M4a adds it.                                                    |
| `components/BrickChip.tsx`          | `[extends]`            | Branch by `brick.kind`: tick chips dispatch `LOG_TICK_BRICK` on click; goal/time chips keep M3's `<button>` element with `cursor: default` and click handler is no-op (no dispatch, no haptic). Tick chip's `<button>` gains `aria-pressed={done}` and a richer aria-label ("${name}, ${done ? 'done' : 'not done'}, tap to toggle"). Adds `onTickToggle?: (brickId: string) => void` prop.                                                                     |
| `components/TimelineBlock.tsx`      | `[extends]`            | Threads `onTickToggle` down to each `<BrickChip>`. Wires `useCrossUpEffect(blockPct(block), 100, onBlockComplete)` — when block crosses to 100, fires `haptics.success()` + `playChime()` + sets a one-shot `bloom` animation flag on the card (M0 `springConfigs.bloom`). Suppresses bloom visual when `useReducedMotion()` is true; haptics + chime still fire.                                                                                               |
| `components/Fireworks.tsx`          | `[new]`                | Day-100% celebration overlay. Fixed-position absolute layer; bounded particle count; ~1.6 s easeOut animation per the new `fireworks` motion token; respects `useReducedMotion` (visual suppressed but haptic + chime still fire from the host). Mounted always; `active` prop drives a single play.                                                                                                                                                            |
| `app/(building)/BuildingClient.tsx` | `[extends]`            | (a) Adds `onTickToggle` callback that dispatches `{ type: 'LOG_TICK_BRICK', brickId }`; passes it down to `Timeline → TimelineBlock → BrickChip` and to `LooseBricksTray → BrickChip`. (b) Hosts the day-level cross-up: `useCrossUpEffect(dayPct(state), 100, onDayComplete)` where `onDayComplete` fires `haptics.notification()` + `playChime()` + sets a `fireworksActive` state. (c) Renders `<Fireworks active={fireworksActive} />` overlay.             |
| `components/Timeline.tsx`           | `[extends]`            | Pass-through prop only: accepts `onTickToggle` and threads it to `<TimelineBlock>`. No render changes.                                                                                                                                                                                                                                                                                                                                                          |
| `components/LooseBricksTray.tsx`    | `[extends]`            | Pass-through prop only: accepts `onTickToggle` and threads it to each `<BrickChip>` it renders.                                                                                                                                                                                                                                                                                                                                                                 |
| `public/sounds/chime.mp3`           | `[new]`                | Single short tone, MP3, ≤ 30 KB. Used for both block-100 and day-100 celebrations (same asset; spec.md AC #20).                                                                                                                                                                                                                                                                                                                                                 |

Untouched in M4a (read-only): `Hero`, `HeroRing`, `BlueprintBar`, `TopBar`, `BottomBar`, `AddBlockSheet`, `AddBrickSheet`, `CategoryPicker`, `NewCategoryForm`, `RecurrenceChips`, `EditModeProvider`, `SlotTapTargets`, `Scaffold`, `EmptyBlocks`, `EmptyBricks`, `NowLine`. M3 chip rendering is preserved — only the tap path changes.

### Locked schema additions

```ts
// lib/types.ts — extend the Action union (M3 had three members; M4a adds a fourth)
export type Action =
  | { type: "ADD_BLOCK"; block: Block }
  | { type: "ADD_CATEGORY"; category: Category }
  | { type: "ADD_BRICK"; brick: Brick }
  | { type: "LOG_TICK_BRICK"; brickId: string }; // M4a — flips `done` on the brick with this id
```

```ts
// lib/data.ts — reducer arm (sketch)
case "LOG_TICK_BRICK": {
  const flip = (b: Brick): Brick =>
    b.id === action.brickId && b.kind === "tick" ? { ...b, done: !b.done } : b;
  return {
    ...state,
    blocks: state.blocks.map((bl) => ({ ...bl, bricks: bl.bricks.map(flip) })),
    looseBricks: state.looseBricks.map(flip),
  };
}
```

The reducer never mutates in place; the `flip` helper applies to every brick in both arrays but only the one whose `id` matches and `kind === "tick"` actually changes. This is O(n) over all bricks, acceptable for Phase-1 scale (no user has hundreds of bricks). `assertNever(action)` exhaustiveness is preserved by the new union member matching the `case`.

### Components

**`<BrickChip>` (tick variant — extended)**

- Props (additive): `onTickToggle?: (brickId: string) => void`. M3 props (`brick`, `categories`, `size`) preserved.
- Tap target: keeps M3's existing `<button type="button">` element (which already provides `min-height: 44px` per M3 plan SG-m3-13 lock). M4a does **not** add a new wrapper element — it specializes the existing button's behavior by `brick.kind`. **Decision (SG-m4a-01):** branch the `onClick` handler by kind. Tick → `haptics.light()` + `onTickToggle?.(brick.id)`. Goal/time → no-op (no haptic, no dispatch). Cursor: tick → `cursor: pointer`; goal/time → `cursor: default` (preserves M3 visual no-op affordance).
- ARIA (SG-m4a-02): tick chip's button gains `aria-pressed={brick.done}` and an enriched `aria-label` of the form `"${brick.name}, ${brick.done ? 'done' : 'not done'}, tap to toggle"` (replacing M3's static "${name}, tick, ${pct}% complete" label for tick kind only — goal/time keep their M3 labels). The visible glyph swap (`Check` ↔ `Square`) is unchanged from M3.
- Keyboard: native `<button>` already handles Enter and Space; no extra wiring needed.
- Animation: the existing `data-testid="brick-fill"` div (M3 lines 117-129) already animates `width` via `transition: width 600ms ease-in-out`. M4a does not change the transition — the same CSS handles 0 → 100 and 100 → 0 symmetrically because `pct` is recomputed from the new `brick.done` after each reducer flip (SG-m4a-08). Reduced-motion: M3's transition does NOT yet branch on `useReducedMotion`. **M4a adds the branch:** when `prefers-reduced-motion: reduce`, the chip-fill `transition` becomes `none`. Use the existing `useReducedMotion` import pattern that `TimelineBlock` already employs.

**`<TimelineBlock>` (extended)**

- Props (additive): `onTickToggle?: (brickId: string) => void`. Threaded to each `<BrickChip>`.
- Block-100 cross-up: hosts `useCrossUpEffect(blockPct(block), 100, fireBlockComplete)` where `fireBlockComplete = useCallback(() => { haptics.success(); playChime(); setBloomKey(k => k + 1); }, [])`. The bloom visual is a `motion.div` with M0's `springConfigs.bloom` keyed by `bloomKey` so each new crossing remounts and replays. `useReducedMotion()` → `bloomKey` increments still fire (haptic + chime fire), but the bloom `motion.div` returns null or renders without animation.
- One-shot rule: `useCrossUpEffect` already enforces this (lib/celebrations.ts:30-37); cross-down resets, re-cross-up re-fires. Verified by `lib/celebrations.test.ts` U-m3-012.

**`<Fireworks>` (new)**

- Props: `active: boolean`. When `active` toggles `false → true`, plays a single fireworks animation; auto-resets internal play state on completion (~1.6 s) to remain mountable. When `useReducedMotion()`, returns `null` (renders nothing). No internal audio or haptic — caller (`<BuildingClient>`) handles those.
- Implementation: bounded particle count (~12 particles); CSS keyframes or motion variants per the M3-reserved `fireworks` token (1.6 s easeOut). Fixed-position overlay, `pointer-events: none`, `z-index` above timeline but below any open `<Sheet>`. Aria: `aria-hidden="true"` (decorative).

**`<BuildingClient>` (extended)**

- New callback `handleTickToggle = useCallback((brickId: string) => dispatch({ type: 'LOG_TICK_BRICK', brickId }), [dispatch])`.
- Threads `handleTickToggle` to `<Timeline onTickToggle={handleTickToggle}>` (which threads to `<TimelineBlock>`, which threads to `<BrickChip>`) and to `<LooseBricksTray onTickToggle={handleTickToggle}>` (which threads directly to `<BrickChip>`).
- New state `const [fireworksActive, setFireworksActive] = useState(false)`. New callback `fireDayComplete = useCallback(() => { haptics.notification(); playChime(); setFireworksActive(true); setTimeout(() => setFireworksActive(false), 1700); }, [])`.
- Hosts `useCrossUpEffect(heroPct, 100, fireDayComplete)` — same `heroPct` already passed to `<Hero>`. Cross-up at the day level fires fireworks + chime + notification haptic.
- Renders `<Fireworks active={fireworksActive} />` as a sibling of `<EditModeProvider>`'s root div (so it's above the timeline but inside the page tree).

### Audio playback details

- **Where loaded:** `lib/audio.ts` exports `playChime()`. Internally, the module lazily constructs `new Audio('/sounds/chime.mp3')` on first call and caches the element on a module-scoped variable. SSR guard: `typeof Audio === 'undefined' → no-op`.
- **Why module-scoped, not inside a component:** avoids per-component `new Audio()` allocation; one element, many plays. Avoids re-fetching the asset on each play (browser caches the response, but an explicit single `Audio` instance is cleaner). Avoids a `useEffect` dance to construct on mount.
- **Why not inside `lib/celebrations.ts`:** keeps the hook generic (the hook fires `fn`; the caller decides whether `fn` plays audio or not). Honors single-responsibility.
- **Triggered by:** `<TimelineBlock>` (block-100 crossing) and `<BuildingClient>` (day-100 crossing). Both cross-up sites call `playChime()` synchronously inside the cross-up callback; `useCrossUpEffect` already guarantees one-shot semantics.
- **Failure handling (SG-m4a-04 + spec AC #24):** `playChime` wraps `audio.play()` in `try/catch` (the call returns a `Promise` that rejects on iOS pre-gesture; we discard the rejection silently). Audio failures never break the visual cascade.
- **iOS first-tap unlock (SG-m4a-06):** the first tick tap IS the user gesture; the chime playback initiated by that same React tick may or may not unlock per Safari version. Accept that the first chime may be silent; subsequent chimes work. Document in CHANGELOG when SHIPPER lands M4a.
- **Reduced motion (SG-m3-11 + spec AC #26):** chime ignores `prefers-reduced-motion` (audio ≠ motion).
- **Mute respect (SG-m4a-05):** no in-app mute toggle in M4a. OS / browser mute is honored automatically by `<audio>`.

### Dependencies

**No new npm dependencies.** `motion`, `lucide-react`, and the existing test toolchain cover everything M4a needs. `Audio` is a Web API. The `chime.mp3` asset is a static file under `public/`.

### Design tokens

All consumed tokens already exist:

- `brickFill` (600 ms easeInOut) — `lib/motion.ts:34` — drives chip foreground gradient on toggle.
- `bloom` spring — `lib/motion.ts` (M0's `springConfigs.bloom = { stiffness: 220, damping: 22 }`) — drives `<TimelineBlock>` block-100 visual.
- `--surface-2`, `--accent`, `--ink`, `--ink-dim` — M0/M1 css vars — already used by `<BrickChip>`.
- Haptic events (`haptics.light/success/notification`) — `lib/haptics.ts` — M0.
- **`fireworks`** (1.6 s easeOut) — `lib/motion.ts` — added in M4a per the M3 plan reservation. Used by `<Fireworks>` overlay only.

No new colors, fonts, or spacing tokens.

### Edge cases

- **Reduced motion** — chip-fill `transition` becomes `none`; scaffold-fill (M3 already obeys reduced-motion via `prefersReducedMotion`); HeroRing arc (M3 already); BlueprintBar opacity is a `transition` on `opacity` — verify M3 honors reduced-motion; if not, M4a adds the branch. Bloom visual suppressed; fireworks overlay returns null. Haptics + chime still fire (spec AC #25-26).
- **Tap during in-flight 600 ms animation** — Framer / CSS `transition: width` cancels and reverses naturally. No special-case needed.
- **Tap a tick brick with `categoryId: null`** — `<BrickChip>` already handles uncategorized via the `--surface-2` background and `--accent` fill. Works the same on tap.
- **Tap inside a collapsed block** — block must be expanded for the chip to be in the DOM (M3 collapse renders no `<BrickChip>` until expanded). Tap on a non-existent chip is impossible by definition.
- **Tap inside the Loose Bricks tray when tray is collapsed** — M3 SG-m3-15 ships chips visible in the collapsed scroll row; the dispatch path works identically (tray collapse / expand is purely visual).
- **Block at 99% pre-tick → 100%** — `blockPct` recomputes; `useCrossUpEffect` fires once; bloom + chime + success haptic fire.
- **Day at 99% pre-tick → 100%** — `dayPct(state)` recomputes; day-level `useCrossUpEffect` in `<BuildingClient>` fires once; fireworks + chime + notification haptic fire.
- **Untoggle from 100 → 99** — bloom does not replay; cross-up rule resets the gate.
- **Audio asset fails to load** — `try/catch` around `audio.play()`; visuals + haptics still fire. `audio.onerror` is silently logged to console only in dev (gated by `process.env.NODE_ENV`).
- **Audio blocked pre-gesture (iOS)** — first chime may be silent; subsequent chimes work. Self-resolving by the second tick.
- **Page refresh after a tick** — state lost (no persistence until M8). Same as M3.
- **Tap goal or time chip in M4a** — no-op. No haptic, no dispatch. Cursor stays default. Spec AC #7-8.
- **Keyboard activation (Enter / Space) on a tick chip** — works via native `<button>` semantics. Same dispatch path.
- **Same brickId dispatched twice in quick succession (e.g., double-click)** — each dispatch flips `done`; second flip undoes the first. Acceptable; a debounce is unnecessary at human gesture rates and would mask intentional rapid toggles.
- **Brick id collision (theoretically impossible — UUIDs)** — defensive: the reducer matches by id AND `kind === "tick"`; a non-tick brick with the same id (impossible by uuid generation but defensible) is a no-op.

### Out of scope

- **Goal +/- stepper** — M4b
- **Time timer (start / stop / pause / manual entry)** — M4c
- **Edit / delete bricks or blocks** — M5
- **Drag reorder** — M6
- **FLIP block-expand magic** — M7
- **Persistence (state survives refresh)** — M8
- **In-app mute toggle** — explicitly deferred (SG-m4a-05); revisit in M7 if user feedback warrants.
- **Per-block / per-day chime variants** — same asset for both crossings (spec AC #20).
- **Long-press / haptic-detent on tick chips** — tick is a single-tap toggle. Long-press belongs to M4b's goal stepper acceleration.

### Decisions to honor

- **ADR-031 (44 px touch target)** — preserved; existing `<BrickChip>` button already enforces `minHeight: '44px'`.
- **ADR-039 (ships empty)** — M4a adds no factory data. The chime mp3 is a static asset, not user-data.
- **ADR-027 (commit prefixes)** — BUILDER commits as `test(m4a): …` (red) and `feat(m4a): …` / `fix(m4a): …` (green/refactor). PLANNER's commits land as `docs(plan-m4a): …` and `docs(tests-m4a): …`. SHIPPER as `chore(ship-m4a): …` and `docs(ship-m4a): …`.
- **ADR-022 (one feature per dispatch)** — this plan covers M4a only. M4b (goal stepper) and M4c (time timer) are separate `/feature m4b` and `/feature m4c` invocations.
- **ADR-041 (single-gate Loop)** — VERIFIER will read this plan and the just-to-be-written `tests.md` entry against `/docs/spec.md § Milestone 4a` before BUILDER starts. No human gate between TESTS and BUILD.
- **ADR-032 / ADR-035 / ADR-034** — categories are user-defined, bricks may be standalone, blocks are always timed; M4a touches none of these contracts.
- **`assertNever` exhaustiveness** — `lib/data.ts:default → assertNever(action)` arm preserved by adding the `LOG_TICK_BRICK` case. TypeScript compile guarantees this.
- **No new npm deps** — verified above.

### Open spec gaps (resolutions)

- **SG-m4a-01 — Tap target shape.** **LOCKED — branch by `kind` inside the existing `<button>` element.** Keep M3's single `<button>` chip element for all kinds; tick path dispatches and gives haptic, goal/time path is no-op. Rationale: avoids a wrapper element; preserves all M3 test-IDs (`C-m3-001..008`); minimal diff; goal/time dangling-tap-target concern is mitigated by `cursor: default` + no haptic, which gives goal/time chips the same M3 "press has no effect" feel.
- **SG-m4a-02 — Chip element role.** **LOCKED — `<button>` (native) + `aria-pressed={done}` for tick; goal/time keep M3 `<button>` without `aria-pressed`.** Rationale: native `<button>` already covers role + keyboard; `aria-pressed` is the canonical toggle-button pattern (per ADR-028, `aria-pressed` is reserved for non-switch toggle buttons — exactly what a tick brick is). Tick is NOT semantically a "switch" (no on/off control of a setting); it's a "press to toggle done state" which is canonical button-pressed pattern.
- **SG-m4a-03 — Reducer placement.** **LOCKED — extend `lib/data.ts` reducer with `LOG_TICK_BRICK` case** that searches both `state.blocks[*].bricks[]` and `state.looseBricks[]` by `brickId`, flipping `done` on the matching tick brick. Pattern matches M3's `ADD_BRICK` parentBlockId routing.
- **SG-m4a-04 — Audio asset format + size.** **LOCKED — MP3, ≤ 30 KB, single short tone (~250 ms).** Source: royalty-free pack or generated tone. Final asset committed under `public/sounds/chime.mp3`. BUILDER must verify file size at commit time.
- **SG-m4a-05 — Mute respect.** **LOCKED — defer in-app mute toggle to M7.** OS / browser mute is honored automatically by `<audio>`. No work in M4a.
- **SG-m4a-06 — First-tap audio unlock on iOS.** **LOCKED — accept silent first chime on iOS Safari.** The first tick IS a user gesture; subsequent chimes work. SHIPPER documents in CHANGELOG.
- **SG-m4a-07 — Test seam for cross-up firing.** **LOCKED — Vitest tests inject state via existing `useCrossUpEffect` testbed (lib/celebrations.test.ts pattern); component-level tests assert that on simulated tick toggle the celebration callback fires; Playwright tests assert the visual class / DOM state lands after a tick that brings block to 100%.**
- **SG-m4a-08 — Chip animation direction on untoggle.** **LOCKED — symmetric.** Toggle to `true` plays 0 → 100; toggle to `false` plays 100 → 0. Same `brickFill` token; no special-case for "undo".

### Cross-cutting concerns BUILDER will hit

1. **State lift through `Timeline`.** `Timeline` currently passes `onAddBrick` through; M4a adds `onTickToggle` as a second pass-through. Use the same prop-drill pattern, not a Context — Context would over-engineer at this scale.
2. **`useCallback` discipline at the hosts.** `useCrossUpEffect`'s `fn` argument should be stable across renders to avoid spurious effect re-runs. Both `<TimelineBlock>` (block-100) and `<BuildingClient>` (day-100) wrap their celebration callbacks in `useCallback`.
3. **Mock-clock + audio mocking in unit tests.** `lib/audio.ts` should be importable in tests and `playChime` should be a thin wrapper that tests can spy on (Vitest `vi.spyOn`); the underlying `Audio` constructor isn't called in jsdom anyway — the SSR guard handles it. For `<BrickChip>` component tests, mock `lib/audio.ts` if the chip ever calls it (it doesn't directly — only `<TimelineBlock>` and `<BuildingClient>` do), and mock `lib/haptics.ts` to assert `light` is called on tick taps.
4. **`prefers-reduced-motion` thread-through for chip-fill.** M3's `<BrickChip>` doesn't yet read `useReducedMotion()`; M4a adds the import + branch. This is a one-line edit but BUILDER must run M3 chip tests after to confirm no regression.
5. **Fireworks overlay z-index.** Below open `<Sheet>` instances (M2's `--z-sheet` value), above timeline. SHIPPER's smoke test should confirm that opening AddBlockSheet during a fireworks play hides the fireworks behind the sheet.
6. **`fireworks` motion token verification.** Before BUILDER edits, check `lib/motion.ts` for the `fireworks` entry. If absent, the M4a build adds it (single-line addition, plus matching `lib/motion.test.ts` assertion). If present (M3 ship may have added it), the build only consumes it.

---

## Milestone 4b — Goal Brick Stepper — Plan

### Pillars consumed

§ 0.1 (the wedge — proof, not plans), § 0.3 (every tap is a brick laid), § 0.5 (the second verb: a quantitative count), § 0.9 (locked Brick: `kind: 'goal'` is `count + target + unit`), § 0.10 (haptic on every increment / decrement), ADR-031 (44 px touch target), ADR-039 (ships empty), ADR-027 (commit prefixes), ADR-041 (single-gate Loop — VERIFIER will audit this plan + tests before BUILDER starts).

### Intent

Wire the **second** user-driven verb: tap `−` or `+` on a goal brick to decrement or increment its `count`, clamped to `[0, target]`. Long-press (≥ 500 ms hold) starts auto-repeat at ~50 ms intervals; release stops. M4b is purely additive on top of the M4a surface — every cascade visual (chip foreground gradient, scaffold fill, BlueprintBar opacity, HeroRing arc) and every celebration path (block-100 bloom + chime + `success` haptic; day-100 fireworks + chime + `notification` haptic) is reused unchanged. M4b adds **one** new reducer arm (`LOG_GOAL_BRICK`), **two** new buttons inside `<BrickChip>` for `kind === "goal"`, and a single long-press auto-repeat helper. The dispatch site at `<BuildingClient>` and the prop-drill through `<Timeline> → <TimelineBlock> → <BrickChip>` and `<LooseBricksTray> → <BrickChip>` are siblings to M4a's `onTickToggle`.

**1-line value-add over M4a:** the **count-style** goal verb (steppers + clamp + auto-repeat) becomes live; tick remains live; time stays inert until M4c.

**What this is NOT:** time timer (M4c). Editing the brick's `target`/`unit` (M5). Manual `count` entry by typing (M5 polish or M7). Brick delete or rename (M5). Drag reorder (M6). Persistence (M8).

### File structure

| Path                                | Tag                    | Role in M4b                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/types.ts`                      | `[extends]`            | Add `LOG_GOAL_BRICK` member to the `Action` discriminated union: `{ type: "LOG_GOAL_BRICK"; brickId: string; delta: 1 \| -1 }`. No other type changes. `assertNever` exhaustiveness preserved.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `lib/data.ts`                       | `[extends]`            | Add a `case "LOG_GOAL_BRICK":` arm to the reducer. Routes by `brickId` across `state.blocks[*].bricks[]` then `state.looseBricks[]`. On match where `kind === "goal"`, computes `next = clamp(count + delta, 0, target)`; if `next === count` (clamp hit at floor or ceiling), returns the original state by reference (true no-op — useful for the celebration cross-up gate to not re-fire). Otherwise returns a new `AppState` with the brick replaced. Non-goal id matches are no-ops. `assertNever` arm preserved.                                                                                                                                                                                                                                                                            |
| `lib/dharma.ts`                     | `[survives unchanged]` | `brickPct` already returns `min(count / target, 1) × 100` for `kind === "goal"`. `blockPct` and `dayPct(state)` already cascade. No math changes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `lib/celebrations.ts`               | `[survives unchanged]` | `useCrossUpEffect` shipped in M3, wired in M4a. M4b adds **no new call sites** — both block-100 and day-100 cross-ups already fire from `<TimelineBlock>` and `<BuildingClient>` whenever any brick mutation drives the percentage upward. Goal stepper bumps just become an additional source.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `lib/audio.ts`                      | `[survives unchanged]` | `playChime()` shipped in M4a. M4b reuses the existing module-scoped lazy `Audio` element. No new asset. Same iOS first-tap caveat applies.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `lib/haptics.ts`                    | `[survives unchanged]` | `haptics.light` / `haptics.medium` / `haptics.success` / `haptics.notification` already shipped in M0. M4b uses `light` for successful ticks, `medium` for clamp ticks; reuses M4a's `success` (block-100) and `notification` (day-100) cross-up paths.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `lib/motion.ts`                     | `[survives unchanged]` | `brickFill` (600 ms easeInOut) drives the chip foreground gradient on count changes — already animates `width` symmetrically per M4a SG-m4a-08. `springConfigs.bloom` and `fireworks` shipped via M4a. No new tokens.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `lib/longPress.ts`                  | `[new]`                | Tiny pointer-events helper. Exposes a single `useLongPressRepeat({ onTick, onClampStop?, holdMs?, intervalMs?, enabled })` hook returning `{ onPointerDown, onPointerUp, onPointerCancel, onPointerLeave }` handlers. First fires `onTick()` synchronously on `pointerdown` (the initial tap is the first tick). After `holdMs` (default 500), starts a `setInterval(intervalMs ≈ 50)` that calls `onTick` on each fire. All timers cleared on `pointerup` / `pointercancel` / `pointerleave` and on unmount. Respects `useReducedMotion` only for the visual scale callback wired by `<BrickChip>` (haptics + dispatch unaffected — see § Reduced motion). Module-local; no React Context.                                                                                                        |
| `components/BrickChip.tsx`          | `[extends]`            | Branch by `brick.kind`: goal chips render `−` and `+` `<button>` controls flanking the badge. Each is a separate native `<button>` with `min-height: 44px` per ADR-031, `aria-label="Decrease ${brick.name}"` / `Increase ${brick.name}"`, and `disabled` set when the corresponding clamp boundary is reached. The outer chip surface for goal stops being a `<button>` — instead it is a `<div role="group" aria-label="${brick.name}, goal, ${count} of ${target}${unitSuffix}">` that wraps the title, the foreground fill, and the two stepper buttons. Tick chips remain a single `<button>` exactly as M4a; time chips remain a single inert `<button>` with `cursor: default`. New prop: `onGoalLog?: (brickId: string, delta: 1 \| -1) => void`. M4a's `onTickToggle` survives unchanged. |
| `components/TimelineBlock.tsx`      | `[extends]`            | Threads `onGoalLog` to each `<BrickChip>`. Pass-through only. No render or layout changes. M4a's `useCrossUpEffect` block-100 wiring is reused — goal stepper bumps that bring `blockPct` to 100 fire the existing bloom + chime + `success` haptic.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `components/Timeline.tsx`           | `[extends]`            | Pass-through prop only: accepts `onGoalLog` and threads it to `<TimelineBlock>`. No render changes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `components/LooseBricksTray.tsx`    | `[extends]`            | Pass-through prop only: accepts `onGoalLog` and threads it to each `<BrickChip>` it renders.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `app/(building)/BuildingClient.tsx` | `[extends]`            | Adds `handleGoalLog = useCallback((brickId, delta) => dispatch({ type: "LOG_GOAL_BRICK", brickId, delta }), [dispatch])`. Threads it to `<Timeline onGoalLog={…}>` and to `<LooseBricksTray onGoalLog={…}>` alongside the existing `onTickToggle`. Day-100 cross-up via `useCrossUpEffect(heroPct, 100, fireDayComplete)` is reused unchanged — goal increments that bring `heroPct` to 100 fire fireworks + chime + `notification` haptic via the M4a path.                                                                                                                                                                                                                                                                                                                                       |
| `components/Fireworks.tsx`          | `[survives unchanged]` | Day-100 overlay shipped in M4a. M4b is just an additional trigger source.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `app/globals.css`                   | `[survives unchanged]` | No new CSS variables. Reuses `--surface-2`, `--accent`, `--ink`, `--ink-dim`, `--cat-*` from M0/M1.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `public/sounds/chime.mp3`           | `[survives unchanged]` | Shipped in M4a. Same single asset, same caveat about the placeholder pending real audio.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

Untouched in M4b (read-only): `Hero`, `HeroRing`, `BlueprintBar`, `TopBar`, `BottomBar`, `AddBlockSheet`, `AddBrickSheet`, `CategoryPicker`, `NewCategoryForm`, `RecurrenceChips`, `EditModeProvider`, `SlotTapTargets`, `Scaffold`, `EmptyBlocks`, `EmptyBricks`, `NowLine`. M3/M4a tick chip rendering is preserved verbatim — the only behavioral surface M4b touches is the `kind === "goal"` branch inside `<BrickChip>`.

**Summary:** 1 NEW file (`lib/longPress.ts`), 7 MODIFIED files (`lib/types.ts`, `lib/data.ts`, `components/BrickChip.tsx`, `components/Timeline.tsx`, `components/TimelineBlock.tsx`, `components/LooseBricksTray.tsx`, `app/(building)/BuildingClient.tsx`), 7 REUSED-UNCHANGED files (`lib/dharma.ts`, `lib/celebrations.ts`, `lib/audio.ts`, `lib/haptics.ts`, `lib/motion.ts`, `components/Fireworks.tsx`, `public/sounds/chime.mp3`).

### Locked schema additions

```ts
// lib/types.ts — extend the Action union (M4a had four members; M4b adds a fifth)
export type Action =
  | { type: "ADD_BLOCK"; block: Block }
  | { type: "ADD_CATEGORY"; category: Category }
  | { type: "ADD_BRICK"; brick: Brick }
  | { type: "LOG_TICK_BRICK"; brickId: string }
  | { type: "LOG_GOAL_BRICK"; brickId: string; delta: 1 | -1 }; // M4b
```

```ts
// lib/data.ts — reducer arm (sketch)
case "LOG_GOAL_BRICK": {
  const apply = (b: Brick): Brick => {
    if (b.id !== action.brickId || b.kind !== "goal") return b;
    const next = Math.max(0, Math.min(b.target, b.count + action.delta));
    if (next === b.count) return b; // clamp no-op — preserve identity
    return { ...b, count: next };
  };
  // Identity short-circuit: if nothing changed, return state by reference.
  let changed = false;
  const blocks = state.blocks.map((bl) => {
    let blockChanged = false;
    const bricks = bl.bricks.map((br) => {
      const out = apply(br);
      if (out !== br) blockChanged = true;
      return out;
    });
    if (!blockChanged) return bl;
    changed = true;
    return { ...bl, bricks };
  });
  const looseBricks = state.looseBricks.map((br) => {
    const out = apply(br);
    if (out !== br) changed = true;
    return out;
  });
  if (!changed) return state;
  return { ...state, blocks, looseBricks };
}
```

The reducer never mutates in place. The `apply` helper applies to every brick in both arrays but only one whose `id` matches AND `kind === "goal"` AND whose clamp does not no-op actually changes. Identity short-circuit at the array level keeps React reconciliation cheap on clamp-rejected ticks (especially during long-press bursts at the cap). `assertNever(action)` exhaustiveness is preserved.

**Delta granularity:** strictly `1 | -1`. No `SET_BRICK_COUNT`, no batched `delta: N`. The TypeScript literal-union type enforces this at compile time. Manual entry is M5+.

### Components

**`<BrickChip>` (goal variant — extended; tick + time variants unchanged from M4a)**

- Props (additive): `onGoalLog?: (brickId: string, delta: 1 | -1) => void`. M4a props (`brick`, `categories`, `size`, `onTickToggle`) preserved.
- DOM shape for `kind === "goal"`: outer `<div role="group" aria-label="…">` wrapping (a) the foreground-fill div (unchanged from M4a, animates via `brickFill`), (b) the title `<span>`, (c) the two stepper buttons, and (d) the existing `<TypeBadge>` numeric `count / target unit`. Layout: title flex-1 left-aligned; then `−` button; then badge (centered between buttons); then `+` button. Two-button hit area: each button is its own `<button type="button">` with `min-width: 44px`, `min-height: 44px`, transparent background, `border: none`, the lucide `Minus` / `Plus` icon at 14 px, and `cursor: pointer` (or `not-allowed` when `disabled`).
- ARIA per AC #21: `aria-label="Decrease ${brick.name}"` on `−`, `aria-label="Increase ${brick.name}"` on `+`. Outer group's `aria-label` mirrors M4a's narrative label so screen readers announce the goal context once: `"${brick.name}, goal, ${roundedPct}% complete, ${count} of ${target}${unitSuffix}"` (preserves the `buildAriaLabel` shape M4a already produces for goal).
- Disabled state per AC #3 + AC #11/12: `−` is `disabled` (HTML `disabled` attribute + visual `opacity: 0.4`) when `count === 0`. `+` is `disabled` when `count === target`. The disabled state is the natural stop signal for long-press auto-repeat — the press-down handler also short-circuits when `disabled` is true so the timer never starts at the cap (defense-in-depth alongside the reducer's clamp no-op).
- Tap path per AC #4–8: `pointerdown` on `+` → `haptics.light()` + `onGoalLog?.(brick.id, 1)` synchronously (the first tap counts as the first tick). Subsequent ticks during a held press are driven by `lib/longPress.ts`'s interval. Same shape for `−` with `delta: -1`. Each non-clamped tick fires `light`; each clamp tick fires `medium` (haptic only — the reducer no-op short-circuits dispatch from causing any UI change). The clamp-haptic decision is computed from `brick.count` and `delta` against `[0, target]` **before** dispatch so the chip can pick the right haptic without round-tripping through the reducer.
- Keyboard per AC #22: native `<button>` already handles Enter and Space (browsers fire `click` on both). Each press dispatches one tick — keyboard does NOT auto-repeat. Long-press is a touch / mouse hold gesture; keyboard users decrement / increment one tap at a time. Spec AC #22 only asks "Enter / Space triggers the same dispatch as a tap" — single-tick dispatch satisfies that.
- Animation per AC #6: the existing `data-testid="brick-fill"` div continues to animate `width` via `transition: width 600ms ease-in-out`. M4a already added the `prefers-reduced-motion: reduce → transition: none` branch; M4b reuses it verbatim. During long-press auto-repeat at ~50 ms cadence the CSS `width` transition continually retargets — the DOM `width` style updates on every reducer commit; CSS interpolates to whatever the current target is. Visually this reads as a smooth fill rising during a held press, which is the intended outcome.
- Long-press visual feedback (SG-m4b-03): each auto-repeat tick triggers a subtle scale-press (`transform: scale(0.95)` for ~80 ms, returning to `scale(1)`) on the active stepper button only. Driven by a transient state flag inside `<BrickChip>` set by the long-press hook's `onTick` callback. Reduced-motion: visual feedback suppressed (no transform applied); haptics + dispatch unaffected.

**`<TimelineBlock>` (extended)**

- Props (additive): `onGoalLog?: (brickId: string, delta: 1 | -1) => void`. Threaded to each `<BrickChip>` alongside the existing `onTickToggle`.
- Block-100 cross-up wiring is reused unchanged from M4a (`useCrossUpEffect(blockPct(block), 100, fireBlockComplete)`); a goal stepper push that brings `blockPct` to 100 fires the same bloom + chime + `success` haptic.

**`<Timeline>` and `<LooseBricksTray>` (extended)**

- Each accepts `onGoalLog` and threads it to `<TimelineBlock>` / `<BrickChip>` respectively. No render or layout changes — pure prop pass-through, mirroring M4a's `onTickToggle` plumbing.

**`<BuildingClient>` (extended)**

- New callback `handleGoalLog = useCallback((brickId: string, delta: 1 | -1) => dispatch({ type: "LOG_GOAL_BRICK", brickId, delta }), [dispatch])`.
- Threaded to `<Timeline onGoalLog={handleGoalLog}>` and `<LooseBricksTray onGoalLog={handleGoalLog}>` next to the existing `onTickToggle`.
- Day-100 cross-up (`useCrossUpEffect(heroPct, 100, fireDayComplete)`) is reused unchanged — goal increments that bring `heroPct` to 100 trigger fireworks + chime + `notification` haptic via the M4a path. Cross-down via `−` taps resets the gate; re-cross-up via subsequent `+` taps replays the celebration per AC #17 (M3-locked one-shot-per-crossing semantics).

### Long-press / auto-repeat strategy (`lib/longPress.ts`)

- **Threshold (SG-m4b-02):** 500 ms hold to start auto-repeat. **Interval:** 50 ms between auto-repeat ticks. Both expressed as named constants (`HOLD_MS = 500`, `INTERVAL_MS = 50`) for easy M7 polish tuning.
- **Mechanics:** on `pointerdown`, the hook (a) immediately calls `onTick()` (the initial tap is the first dispatch + haptic), (b) starts a `setTimeout(holdMs)` to enter auto-repeat mode, (c) when that fires, switches to a `setInterval(intervalMs)` that calls `onTick()` on each fire. On `pointerup`, `pointercancel`, or `pointerleave`, both timers are cleared. Same on component unmount. The hook's `enabled` flag (driven by the chip's `disabled` prop on the active button) acts as a guard rail — when the button becomes disabled during a held press (e.g., the count just reached `target`), the hook clears its timers proactively. Alongside the reducer's clamp no-op, this gives belt-and-suspenders defense per AC #11.
- **Why a custom hook rather than a third-party library:** the requirement is ~30 lines of code; adding `react-aria` or `use-long-press` is over-budget for a Phase-1 single-feature need. Local utility keeps the dependency graph minimal (no new npm deps).
- **Pointer Events vs Touch Events:** use Pointer Events (`onPointerDown` / `onPointerUp` / `onPointerCancel` / `onPointerLeave`). Pointer Events unify mouse, touch, and stylus; supported in every browser the Phase-1 spec targets (iOS Safari 14+, Chrome 90+). No fallback wiring needed.
- **Click suppression:** because `pointerdown` already dispatches the first tick, the same gesture's synthetic `click` event must NOT re-dispatch. `<BrickChip>` does not register an `onClick` on the stepper buttons — only the pointer handlers from the long-press hook. The native button's keyboard activation (`Enter` / `Space`) fires `click`, which IS handled separately to dispatch one tick — this is the keyboard path per AC #22.

### Haptics map

| Trigger                                             | Haptic event                         | Source                                       |
| --------------------------------------------------- | ------------------------------------ | -------------------------------------------- |
| Successful `+` or `−` tick (count actually changed) | `light`                              | `<BrickChip>` (M4b NEW call site)            |
| Clamp tick (`+` at `target` or `−` at `0`)          | `medium`                             | `<BrickChip>` (M4b NEW call site)            |
| Block-100 cross-up triggered by a goal increment    | `success` (+ chime)                  | `<TimelineBlock>` (reused from M4a)          |
| Day-100 cross-up triggered by a goal increment      | `notification` (+ chime + fireworks) | `<BuildingClient>` (reused from M4a)         |
| Auto-repeat tick (per fire of the 50 ms interval)   | `light` (or `medium` if at clamp)    | `<BrickChip>` (same code path as single-tap) |

### Visual cascade

**All cascade visuals from M4a are reused unchanged.** A successful goal tick path is:

1. `<BrickChip>` calls `onGoalLog(brickId, delta)` → `dispatch({ type: "LOG_GOAL_BRICK", … })`.
2. Reducer clamps and returns new state → React re-renders.
3. New `pct` flows through `brickPct` for the goal brick → `data-testid="brick-fill"` div's `width` style retargets → CSS transitions over 600 ms (instant under reduced-motion).
4. New `blockPct` propagates → block scaffold left-bar fills (M3 wiring).
5. New `dayPct` propagates → BlueprintBar opacity recomputes (M3 wiring).
6. New `heroPct` propagates → HeroRing arc redraws (M3 wiring).
7. If `blockPct` crossed 100 from below: `<TimelineBlock>` cross-up callback fires bloom + chime + `success` haptic (M4a).
8. If `heroPct` crossed 100 from below: `<BuildingClient>` cross-up callback fires fireworks + chime + `notification` haptic (M4a).
9. Cross-down via `−` resets the gate; re-cross-up replays celebration (AC #17, already locked by M3 one-shot rule).

M4b adds **zero** new visual primitives — every paint path is M3 + M4a's.

### Reduced motion

- Chip foreground gradient `width` transition: collapses to `none` (already done in M4a; reused).
- Bloom on block-100: visual suppressed; haptic + chime still fire (already done in M4a).
- Fireworks on day-100: visual returns null; haptic + chime still fire (already done in M4a).
- **Long-press scale-press visual feedback (M4b new):** suppressed under `prefers-reduced-motion: reduce`. Haptics + dispatch unaffected.
- Per AC #20: reduced-motion users still feel every tick (`light` / `medium` haptics) and hear celebrations (`success` / `notification` chimes). The motion budget is purely visual.

### A11y

- `−` and `+` are native `<button type="button">` elements with explicit `aria-label="Decrease ${brick.name}"` / `"Increase ${brick.name}"` per AC #21. The visible glyphs (`Minus` / `Plus` icons) are `aria-hidden="true"`.
- Per AC #22, native `<button>` semantics provide keyboard activation via Enter and Space; one tap = one dispatch. No auto-repeat from the keyboard (long-press is a pointer gesture). This matches platform conventions (mobile screen-reader users don't `long-press`).
- Outer `<div role="group">` carries the goal context label so screen readers announce the brick's identity once when focus enters; per-button labels are scoped to the action.
- `disabled` attribute removes the button from the tab order at the clamp boundary (browser default for `<button disabled>`). Visual: `opacity: 0.4`, `cursor: not-allowed`. The chip remains visible and the user can keyboard-tab to the still-enabled sibling button.
- axe-core target per AC #23: zero violations on the building view with at least one goal brick rendered, and on the AddBrickSheet flow if it lands on the page after creating a goal brick. Verified by Playwright + `@axe-core/playwright` (the M4a a11y suite at `tests/e2e/m4a.a11y.spec.ts` already covers the page; M4b's tests will reuse the harness with a new fixture that adds a goal brick).
- ARIA contract: tick chips keep `aria-pressed={done}` (M4a). Goal chips do **NOT** carry `aria-pressed` — they are not toggle buttons; they are stepper controls. The role distinction is intentional and matches WAI-ARIA APG patterns for spin buttons (we use button-pair rather than a single `role="spinbutton"` because spinbutton implies a typed-in numeric input, which is M5+).

### Resolutions for open spec gaps

- **Decision SG-m4b-01 — Stepper position.** **LOCKED — flanking layout: title left, `−` button, numeric badge centered between buttons, `+` button right.** Rationale: matches the spec's recommendation; matches user mental model (decrement on the left, increment on the right) and reads naturally L-to-R. At 430 px viewport with `min-width: 44px` per button + 8 px gap + a typical 60–80 px chip badge, the layout fits without overflow on every realistic chip-name length (verified by AC #2 visual test). If a name is so long it would push the buttons off-screen, the title's `text-overflow: ellipsis` (already in M3) clips first, preserving the controls.
- **Decision SG-m4b-02 — Long-press threshold + interval.** **LOCKED — 500 ms hold to start auto-repeat; 50 ms interval.** Both per spec recommendation; both are named constants in `lib/longPress.ts` so M7 polish can tune without a refactor. 50 ms ≈ 20 ticks/sec, comfortable for "I want to crank from 0 to 30 reps quickly" without feeling jittery.
- **Decision SG-m4b-03 — Long-press visual feedback.** **LOCKED — subtle button-press scale (0.95 → 1.0, ~80 ms) on each auto-repeat tick.** Reduced-motion → suppressed. The visual is small but reinforces "the press is doing something" during a long hold. If implementation cost spikes during BUILDER, drop to the floor (no visual; haptics + count update carry the feedback) per spec's "skippable feature" allowance, and surface a follow-up note in `status.md` for M7. Default is to ship with the scale.
- **Decision SG-m4b-04 — Reducer delta granularity.** **LOCKED — `delta: 1 | -1` only.** Per spec recommendation. Enforced by TypeScript literal-union type. No `SET_BRICK_COUNT`, no batched delta. Manual numeric entry deferred to M5 polish or M7. Rationale: limits the action surface; every UI path that mutates count goes through tap → light haptic → 1-step dispatch, which keeps celebration cross-up semantics straightforward (no atomic 0 → target jump that would short-circuit haptic feedback).
- **Decision SG-m4b-05 — Clamp haptic.** **LOCKED — `medium`.** Per spec recommendation. Distinct from `light` (normal tick) and from `success` (block-100 celebration). The user feels "blocked" without being startled. iOS Vibration API maps `medium` to a heavier impact than `light` — concrete bytes per `lib/haptics.ts:medium` from M0.

### Test strategy

The TESTS-mode dispatch (separate, ADR-025) will produce the actual GIVEN/WHEN/THEN IDs. This plan reserves the following layers and broad coverage targets:

- **Unit (Vitest)** — `lib/data.test.ts`: `LOG_GOAL_BRICK` reducer (increment, decrement, clamp at top, clamp at bottom, no-op identity short-circuit, non-goal kind no-op, unknown id no-op). `lib/longPress.test.ts`: hook fires first tick on `pointerdown`, starts auto-repeat after `holdMs`, fires at `intervalMs` cadence, stops on `pointerup` / `pointercancel` / `pointerleave`, and on `enabled: false` flip. Mock-clock via `vi.useFakeTimers()`.
- **Component (Vitest + Testing Library)** — `components/BrickChip.test.tsx`: goal chip renders `−` / `+` / badge, both controls have correct ARIA labels, `−` disabled at `count === 0`, `+` disabled at `count === target`, single tap dispatches once with correct delta, single tap fires `light` haptic, clamp tap fires `medium` haptic, long-press auto-repeats (with mock clock), reduced-motion suppresses scale-press. Tick chip M4a behavior is regression-checked (no change). Time chip remains inert (no change).
- **E2E (Playwright, mobile-chrome 430 px)** — `tests/e2e/m4b.spec.ts`: tap `+` on a goal brick → chip fill animates and badge updates; long-press `+` → count reaches `target`, auto-repeat stops, bloom fires; `−` decrements; clamp at 0 and at `target` are visually inert (no further fill change). Mobile-safari deferred per ADR-010.
- **A11y (axe via Playwright)** — `tests/e2e/m4b.a11y.spec.ts`: zero violations on the building view with at least one goal brick at 0%, at intermediate %, and at 100%; verifies that `disabled` controls retain accessible names; verifies that the outer group label is present.

### Edge cases

- **Tap `+` at `count === target`:** reducer no-op (identity short-circuit); chip fires `medium` haptic; chip stays at 100% gradient. Long-press auto-repeat: hook clears its interval as soon as the button's `disabled` flips true (the next render after the clamp-reaching tick).
- **Tap `−` at `count === 0`:** symmetric — reducer no-op; `medium` haptic; gradient stays at 0%.
- **Long-press at `count === target − 1`:** first auto-repeat tick brings count to `target` (success: `light` + cascade); subsequent interval fires would be clamps but the `disabled` short-circuit + identity-check reducer prevents any churn. Spec AC #11 satisfied.
- **Long-press release mid-burst:** all timers cleared within one frame on `pointerup`. No "ghost ticks" after release.
- **Pointer leaves the button mid-press (e.g., user drags off):** `pointerleave` clears timers. Pressing back DOES NOT re-trigger; user must `pointerdown` again. This matches platform stepper conventions.
- **Reduced motion:** chip fill animation collapses to instant; long-press scale-press visual suppressed; haptics + chime + dispatch unaffected.
- **`unit` is empty string:** badge renders `${count} / ${target}` with no unit suffix. ARIA label ends at "of ${target}" (no trailing space). Already covered by M3's `unitSuffix` ternary.
- **Cross to 100% on a single tap:** count was `target − 1`, tap `+` → reducer brings count to `target`, `brickPct === 100`, `blockPct` may cross to 100, `<TimelineBlock>` cross-up fires bloom + chime + `success`. Simultaneously possible: `heroPct` crosses to 100 (if this was the last incomplete brick of the day) and `<BuildingClient>` fires fireworks + chime + `notification` in the same render tick. Both celebrations can fire on the same tick — not a bug (this is M4a-locked behavior; M4b just adds another trigger source).
- **Cross-down from 100% via `−`:** chip-fill animates back; bloom does not replay; cross-up gate is reset for next time (one-shot-per-crossing per M3).
- **Re-cross-up after cross-down:** bloom replays. Spec AC #17 satisfied. Same applies to fireworks.
- **Double-click on `+` in quick succession (≤ 500 ms):** Pointer Events fire two `pointerdown`s; each fires the initial tick; auto-repeat from the first is canceled by the second's `pointerdown` (timers cleared on the second mount of the hook's listeners). End result: two ticks, both `light` haptics. Acceptable; no debounce needed.
- **Brick id collision:** defensive — reducer matches by id AND `kind === "goal"`; a non-goal brick with the same id (impossible by uuid generation but defensible) is a no-op.
- **Page refresh after a goal increment:** state lost (no persistence until M8). Same as M3 / M4a.
- **`target === 0` (degenerate user input):** `brickPct` returns 0; both buttons immediately disabled; reducer no-ops both directions. Not specified as forbidden in the schema, so the reducer must handle it gracefully. The AddBrickSheet validation prevents a user from creating such a brick (M3 SG validation), but defense-in-depth is free here.

### Out of scope (M4b)

- Time timer (start / stop / pause / manual entry) → **M4c** (per spec lines 1216–1219).
- Manual `count` entry (e.g., type "50" directly) → **M5 polish or M7**.
- Brick edit (rename, retype, retarget, change unit) → **M5**.
- Brick delete → **M5**.
- Drag reorder → **M6**.
- FLIP block-expand magic → **M7**.
- Persistence (state survives refresh) → **M8**.
- Per-brick or per-block chime variants → out of scope (same single asset as M4a).
- Long-press on tick chips → tick is single-tap toggle (locked by M4a).
- Touch-Events fallback → unnecessary; Pointer Events are universal in target browsers.

### Decisions to honor

- **ADR-031 (44 px touch target)** — both `−` and `+` buttons enforce `min-width: 44px` AND `min-height: 44px` per the cumulative cva pattern from M0 ADR-031. The chip's outer height continues to exceed 44 px because the buttons themselves do.
- **ADR-039 (ships empty)** — M4b adds no factory data. No new categories, blocks, or bricks. The goal stepper has nothing to step until a user adds a goal brick via the M3 AddBrickSheet.
- **ADR-027 (commit prefixes)** — BUILDER commits as `test(m4b): …` (red) and `feat(m4b): …` / `fix(m4b): …` (green/refactor). PLANNER's commits land as `docs(plan-m4b): …` and `docs(tests-m4b): …`. SHIPPER as `chore(ship-m4b): …` and `docs(ship-m4b): …`.
- **ADR-022 (one feature per dispatch)** — this plan covers M4b only. M4c is a separate `/feature m4c` invocation.
- **ADR-025 (mode separation)** — this dispatch writes `/docs/plan.md` only. The TESTS-mode dispatch authors `/docs/tests.md` separately.
- **ADR-041 (single-gate Loop)** — VERIFIER will read this plan + the just-to-be-written `tests.md` against `/docs/spec.md § Milestone 4b` before BUILDER starts. No human gate between TESTS and BUILD.
- **ADR-017 (time bricks use a real timer)** — irrelevant to M4b but explicitly preserved: M4b does NOT touch time bricks; they remain inert as M3 shipped them.
- **ADR-032 / ADR-035 / ADR-034** — categories user-defined, bricks may be standalone, blocks always timed. M4b touches none of these contracts.
- **Locked Brick discriminated union** — M4b mutates `count` only on the `kind === "goal"` arm. The `target` and `unit` fields are read-only in M4b (edit is M5). The reducer's pattern-match on `kind === "goal"` is the type-system guard; without it, TypeScript would reject `b.count + delta` because tick / time bricks have no `count` field.
- **`assertNever` exhaustiveness** — `lib/data.ts:default → assertNever(action)` arm preserved by adding the `LOG_GOAL_BRICK` case. TypeScript compile guarantees this.
- **No new npm deps** — verified above. Pointer Events and `setTimeout` / `setInterval` are Web APIs.
- **Gate D (typecheck)** — added to BUILDER contract at end of M4a (per `status.md` open loop). Effective for M4b: BUILDER must run `tsc --noEmit` before declaring red→green→commit, not only Vitest.

### Cross-cutting concerns BUILDER will hit

1. **State lift through `Timeline`.** Same prop-drill pattern as M4a's `onTickToggle`; add `onGoalLog` as a sibling pass-through. Do not introduce React Context.
2. **`useCallback` discipline at `<BuildingClient>`.** `handleGoalLog` MUST be wrapped in `useCallback([dispatch])` — same hygiene as `handleTickToggle`. Spurious re-renders of every `<BrickChip>` would otherwise tank long-press auto-repeat (since the hook's handlers depend on a stable `onTick`).
3. **Long-press hook stability.** `lib/longPress.ts`'s returned handlers must remain referentially stable across renders unless inputs change — `useCallback` inside the hook for each handler. Otherwise React re-attaches listeners every render, which is fine functionally but triggers spurious work.
4. **Click vs pointerdown ordering.** On goal stepper buttons, do NOT register `onClick` for the pointer path (would double-fire). Keyboard activation (Enter / Space) DOES need to dispatch — handle by attaching a separate `onKeyDown` listener that fires on Enter/Space and calls the same single-tick path, OR by leaving `onClick` registered and detecting the click came from a key event vs. a pointer event. **Decision:** attach `onClick` and have the pointer-down path call `event.preventDefault()` on the synthetic click that follows pointer events. Simpler than dual paths and matches how Pointer Events are typically integrated. BUILDER must test both paths in component tests.
5. **Reducer no-op identity preservation.** The clamp-no-op MUST return the same `state` reference (not a shallow new object) — `useCrossUpEffect` uses memo'd inputs and a fresh `state` reference would force unnecessary effect re-runs, potentially mis-firing celebrations during long-press cap mashing. The sketch above's identity short-circuit guards this.
6. **Mock-clock test ergonomics.** `lib/longPress.test.ts` and the `<BrickChip>` long-press component test will use `vi.useFakeTimers()` + `vi.advanceTimersByTime()`. BUILDER should isolate `setTimeout` / `setInterval` references inside the hook to be testable (no `window.setTimeout` or globalThis-shadow workarounds — Vitest hooks `globalThis.setTimeout` directly).
7. **Disabled-button `pointerdown` semantics.** A `<button disabled>` does NOT fire `pointerdown` in any major browser — this is the platform-correct behavior. The long-press hook's `enabled` flag is therefore redundant for the _initial_ press but still necessary to terminate an in-flight interval the moment the button becomes disabled mid-press (the renderer flips `disabled` on the same tick the cap is reached). BUILDER must verify this via the Playwright auto-repeat-to-cap test.
8. **Reduced-motion thread-through for the new scale-press visual.** Use the same `useReducedMotion()` hook M4a wired into `<BrickChip>` for the chip-fill transition. Do NOT introduce a new mechanism.

### Migration / obsolete IDs

None expected. M4a's test IDs continue to apply unchanged (tick chip behavior is stable). M4b's IDs are net-additive. The 4 deferred M4a tests.md cleanup items noted in `status.md` open loops (U-m4a-009 prose-vs-impl drift; C-m4a-002 snapshot-claim drift; C-m4a-003 schema-mismatch in prose; A-m4a-\* + E-m4a-005 vacuous-pass guards) are explicitly OUT of scope for the M4b TESTS dispatch — they belong to a separate `docs(tests-m4a):` cleanup commit OR a future TESTS-mode re-dispatch for M4a, not bundled into M4b.

### ADR needed

None identified. Every decision in this plan resolves under existing ADRs (ADR-031, ADR-039, ADR-017, ADR-027, ADR-041) or under one of the SG-m4b-0N locks above. If VERIFIER finds otherwise, surface as `ADR needed: …` and Main Claude will land it as `docs(harness): …`.

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

## Milestone 4c — Time Brick Timer — Plan

### Pillars consumed

§ 0.1 (the wedge — proof, not plans), § 0.3 (every tap is a brick laid), § 0.5 (the third verb: time elapsed against a target), § 0.9 (locked Brick: `kind: "time"` is `durationMin + minutesDone`), § 0.10 (haptic on every start/stop, clamp on manual-entry overflow), ADR-031 (44 px touch target), ADR-039 (ships empty), ADR-017 (time bricks use a real timer — phase-1 timestamp-based), ADR-027 (commit prefixes), ADR-041 (single-gate Loop — VERIFIER will audit this plan + tests before BUILDER starts). Completes the M4 brick-logging trilogy.

### Intent

Wire the **third and final** user-driven verb: tap a time brick to start its per-brick timer; tap the same chip again to stop. Long-press (≥ 500 ms hold) opens a manual-entry `<TimerSheet>` with a single number input (minutes) and Save / Cancel. While running, a single module-level `setInterval` at 1 s cadence dispatches `TICK_TIMER` actions that re-derive `minutesDone` from `Date.now() - startedAt + initialMinutesDone` and write the floored integer minute count to state. Cascade visuals (chip foreground gradient, scaffold left-bar, BlueprintBar opacity, HeroRing arc, hero numeral) update on each tick exactly as M4a/M4b. Block-100 and day-100 cross-up celebrations (bloom + chime + `success` haptic; fireworks + chime + `notification` haptic) reuse M4a's `useCrossUpEffect` wiring with **zero** new call sites. Single-running-timer is a state-level invariant enforced by the reducer (`runningTimerBrickId: string | null`), not by UI. Tab-background recovery is a `visibilitychange` listener inside `lib/timer.ts` that dispatches a corrective `TICK_TIMER` on `visible`. Tick (M4a) and goal (M4b) chips are unchanged — M4c is the `kind === "time"` branch only.

**1-line value-add over M4a/M4b:** the **time-style** verb (start / stop / manual entry) becomes live; tick + goal stay live; nothing else changes. M4c closes the M4 trilogy and the empty-toolkit pivot's three-verb promise.

**What this is NOT:** background-tab timer accuracy (the browser throttles `setInterval` to ~1 s minimum on Chrome and pauses it on Safari — recovery on `visible` is best-effort). Multiple concurrent timers (forbidden by the single-running invariant per § 0.5). Persistence of `runningTimerBrickId` + `startedAt` across page refresh (M8). Manual minute editing inline (`+/-` like the goal stepper) — M5 polish. Pomodoro / interval pattern (never, or M10+). Timer-driven push notifications outside the app (never, or M10+).

### File structure

| Path                                | Tag                    | Role in M4c                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/types.ts`                      | `[extends]`            | (a) Add `runningTimerBrickId: string \| null` to `AppState`. (b) Add four new `Action` union members: `START_TIMER`, `STOP_TIMER`, `TICK_TIMER`, `SET_TIMER_MINUTES`. `assertNever` exhaustiveness preserved.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `lib/data.ts`                       | `[extends]`            | (a) `defaultState()` returns `runningTimerBrickId: null`. (b) Four new `case` arms in the reducer (one per new Action). `START_TIMER` sets `runningTimerBrickId = action.brickId` (no separate STOP for the prior running brick — the field is single-valued, the swap IS the stop). `STOP_TIMER` sets `runningTimerBrickId = null` (no-op when already null). `TICK_TIMER` writes `minutesDone` to the matching `kind === "time"` brick (identity short-circuit on no-change). `SET_TIMER_MINUTES` clamps to `[0, durationMin]` and writes. All four arms preserve `assertNever`.                                                                                                                                                                                                                                                                               |
| `lib/dharma.ts`                     | `[survives unchanged]` | `brickPct` for `kind === "time"` already returns `Math.min(minutesDone / durationMin, 1) × 100` with a zero-duration guard. `blockPct` and `dayPct(state)` cascade as in M4a/M4b. No math changes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `lib/celebrations.ts`               | `[survives unchanged]` | `useCrossUpEffect` shipped in M3, wired in M4a, reused in M4b. M4c adds **zero** new call sites — both block-100 (`<TimelineBlock>`) and day-100 (`<BuildingClient>`) cross-ups already fire whenever any brick mutation drives the percentage upward. `TICK_TIMER` and `SET_TIMER_MINUTES` just become additional sources.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `lib/audio.ts`                      | `[survives unchanged]` | `playChime()` shipped in M4a. M4c reuses it via the existing M4a `<TimelineBlock>` / `<BuildingClient>` cross-up sites. No new asset.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `lib/haptics.ts`                    | `[survives unchanged]` | `light` (start/stop), `medium` (manual-entry clamp at `> durationMin`), `success` (block-100 — reused), `notification` (day-100 — reused). All shipped in M0.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `lib/longPress.ts`                  | `[survives unchanged]` | `useLongPressRepeat` shipped in M4b. M4c uses it in **non-repeat mode**: M4c does NOT want auto-repeat at all — long-press just opens the sheet. **Decision (SG-m4c-07):** introduce a sibling helper `useLongPress` (single-fire) inside `lib/longPress.ts` that exports the same pointer handlers but fires `onLongPress` once after `holdMs`, with `pointerup` before `holdMs` firing `onTap` instead. Implementation reuses the timer machinery; ~25 lines added; the M4b hook is unchanged. **No new file** — same module.                                                                                                                                                                                                                                                                                                                                  |
| `lib/motion.ts`                     | `[survives unchanged]` | `brickFill` (600 ms easeInOut) drives the chip foreground gradient on tick updates. `springConfigs.bloom` and `fireworks` shipped via M4a. No new tokens.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `lib/timer.ts`                      | `[new]`                | NEW module owning the single `setInterval` (1 s) + `visibilitychange` listener. Exposes `useTimer(state, dispatch)` — a hook called once at the top of `<BuildingClient>`. Internally: a `useEffect` keyed on `state.runningTimerBrickId` starts the interval when non-null and tears it down when null. Tracks `startedAtRef: Date.now()` and `initialMinutesDoneRef: number` captured at start. On every tick (and on `visible`), computes `floor((Date.now() - startedAtRef) / 60000) + initialMinutesDoneRef` and dispatches `TICK_TIMER` if the value changed. Pure module — no React Context.                                                                                                                                                                                                                                                              |
| `components/BrickChip.tsx`          | `[extends]`            | Branch by `brick.kind === "time"`: chip becomes a single `<button>` (matches M4a tick chip shape) with the **whole surface** as the tap target (≥ 44 px, per ADR-031). Tap dispatches `START_TIMER` or `STOP_TIMER`. Long-press (≥ 500 ms) opens `<TimerSheet>`. Glyph: `Play` (▶) when stopped; `Pause` (⏸) + subtle scale-pulse when running (suppressed under reduced-motion). `aria-pressed={running}`; aria-label per AC #28. Pointer handlers from `useLongPress`. New props: `running: boolean`, `onTimerToggle?: (brickId: string) => void`, `onTimerOpenSheet?: (brickId: string) => void`. M4a tick + M4b goal variants unchanged.                                                                                                                                                                                                                     |
| `components/TimerSheet.tsx`         | `[new]`                | NEW. Bottom-sheet via M0 `<Sheet>` (title `"Set minutes"` or `"Edit time"`). Single `<input type="number" min="0" max={durationMin}>` pre-filled with current `minutesDone`. Save and Cancel buttons (each `min-h-[44px]`). Save dispatches `SET_TIMER_MINUTES` with `Math.max(0, Math.min(durationMin, parsedValue))`; if `parsedValue > durationMin`, fires `haptics.medium()` before dispatch (the clamp cue per AC #18). Cancel closes silently. Focus trap follows the M4d AddChooserSheet pattern (Tab cycle within the sheet).                                                                                                                                                                                                                                                                                                                            |
| `components/TimelineBlock.tsx`      | `[extends]`            | Threads `runningTimerBrickId` through to each `<BrickChip>` (computed: `running = runningTimerBrickId === brick.id`). New props: `runningTimerBrickId: string \| null`, `onTimerToggle: (brickId: string) => void`, `onTimerOpenSheet: (brickId: string) => void`. Pass-through only; no other render or layout changes. M4a's block-100 `useCrossUpEffect` wiring is reused unchanged — a `TICK_TIMER` that brings `blockPct` to 100 fires the same bloom + chime + `success` haptic.                                                                                                                                                                                                                                                                                                                                                                           |
| `components/Timeline.tsx`           | `[extends]`            | Pass-through prop only: `runningTimerBrickId`, `onTimerToggle`, `onTimerOpenSheet` threaded to `<TimelineBlock>`. No render changes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `components/LooseBricksTray.tsx`    | `[extends]`            | Pass-through prop only: same three props threaded to each `<BrickChip>` it renders. No render changes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `app/(building)/BuildingClient.tsx` | `[extends]`            | (a) Reducer's initial `defaultState()` already gives `runningTimerBrickId: null` (extended in `lib/data.ts`). (b) New callbacks `handleTimerToggle = useCallback((brickId) => dispatch(state.runningTimerBrickId === brickId ? { type: "STOP_TIMER", brickId } : { type: "START_TIMER", brickId }), [dispatch, state.runningTimerBrickId])` and `handleTimerOpenSheet = useCallback((brickId) => setTimerSheetState({ open: true, brickId }), [])`. (c) Threads `runningTimerBrickId={state.runningTimerBrickId}` + the two callbacks to `<Timeline>` and `<LooseBricksTray>`. (d) Calls `useTimer(state, dispatch)` once near the top of the component (alongside `useNow`). (e) Renders `<TimerSheet>` as a sibling of the other sheets, fed by `timerSheetState`. Day-100 cross-up via `useCrossUpEffect(heroPct, 100, fireDayComplete)` is reused unchanged. |
| `components/Fireworks.tsx`          | `[survives unchanged]` | Day-100 overlay shipped in M4a. M4c is just an additional trigger source.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `app/globals.css`                   | `[survives unchanged]` | No new CSS variables. Reuses `--surface-2`, `--accent`, `--ink`, `--ink-dim`, `--cat-*`, `--bg-elev` from M0/M1.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `public/sounds/chime.mp3`           | `[survives unchanged]` | Shipped in M4a. Same single asset, same placeholder caveat carried in `status.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

Untouched in M4c (read-only): `Hero`, `HeroRing`, `BlueprintBar`, `TopBar`, `BottomBar`, `AddBlockSheet`, `AddBrickSheet`, `AddChooserSheet`, `CategoryPicker`, `NewCategoryForm`, `RecurrenceChips`, `EditModeProvider`, `SlotTapTargets`, `Scaffold`, `EmptyBlocks`, `EmptyBricks`, `NowLine`, `NowCard`. M3/M4a/M4b/M4d chip and sheet wiring is preserved verbatim — the only behavioural surface M4c touches is the `kind === "time"` branch inside `<BrickChip>` plus the new timer module + sheet.

**Summary:** 2 NEW files (`lib/timer.ts`, `components/TimerSheet.tsx`), 7 MODIFIED files (`lib/types.ts`, `lib/data.ts`, `lib/longPress.ts` [adds sibling `useLongPress` helper], `components/BrickChip.tsx`, `components/Timeline.tsx`, `components/TimelineBlock.tsx`, `components/LooseBricksTray.tsx`, `app/(building)/BuildingClient.tsx`), 7 REUSED-UNCHANGED files (`lib/dharma.ts`, `lib/celebrations.ts`, `lib/audio.ts`, `lib/haptics.ts`, `lib/motion.ts`, `components/Fireworks.tsx`, `public/sounds/chime.mp3`).

### Locked schema additions

```ts
// lib/types.ts — extend AppState (M4c — single-running-timer invariant)
export type AppState = {
  blocks: Block[];
  categories: Category[];
  looseBricks: Brick[];
  runningTimerBrickId: string | null; // M4c — null = no timer running; one running brick at a time
};

// lib/types.ts — extend the Action union (M4b had five members; M4c adds four → nine total)
export type Action =
  | { type: "ADD_BLOCK"; block: Block }
  | { type: "ADD_CATEGORY"; category: Category }
  | { type: "ADD_BRICK"; brick: Brick }
  | { type: "LOG_TICK_BRICK"; brickId: string }
  | { type: "LOG_GOAL_BRICK"; brickId: string; delta: 1 | -1 }
  | { type: "START_TIMER"; brickId: string } // M4c — implicitly stops any other running timer
  | { type: "STOP_TIMER"; brickId: string } // M4c — no-op when brickId is not the running one
  | { type: "TICK_TIMER"; brickId: string; minutesDone: number } // M4c — dispatched by lib/timer.ts
  | { type: "SET_TIMER_MINUTES"; brickId: string; minutes: number }; // M4c — long-press manual entry, clamped in reducer
```

```ts
// lib/data.ts — reducer arms (sketch)
case "START_TIMER": {
  // Single-running invariant: just write the new id. No separate stop for the prior running brick;
  // the field is single-valued, the swap IS the stop. lib/timer.ts captures the new startedAt
  // off the change in state.runningTimerBrickId.
  if (state.runningTimerBrickId === action.brickId) return state; // already running — true no-op
  return { ...state, runningTimerBrickId: action.brickId };
}
case "STOP_TIMER": {
  if (state.runningTimerBrickId === null) return state;
  if (state.runningTimerBrickId !== action.brickId) return state; // stopping a non-running brick is a no-op
  return { ...state, runningTimerBrickId: null };
}
case "TICK_TIMER": {
  // Identity short-circuit when minutesDone is unchanged (avoids spurious cross-up effect re-runs).
  const apply = (b: Brick): Brick => {
    if (b.id !== action.brickId || b.kind !== "time") return b;
    if (b.minutesDone === action.minutesDone) return b;
    return { ...b, minutesDone: action.minutesDone };
  };
  // Same array-identity preservation pattern as LOG_GOAL_BRICK.
  let blocksChanged = false;
  const newBlocks = state.blocks.map((bl) => {
    let changed = false;
    const bricks = bl.bricks.map((br) => {
      const out = apply(br);
      if (out !== br) changed = true;
      return out;
    });
    if (!changed) return bl;
    blocksChanged = true;
    return { ...bl, bricks };
  });
  let looseChanged = false;
  const newLoose = state.looseBricks.map((br) => {
    const out = apply(br);
    if (out !== br) looseChanged = true;
    return out;
  });
  if (!blocksChanged && !looseChanged) return state;
  return {
    ...state,
    blocks: blocksChanged ? newBlocks : state.blocks,
    looseBricks: looseChanged ? newLoose : state.looseBricks,
  };
}
case "SET_TIMER_MINUTES": {
  // Clamp at the reducer level (defense-in-depth alongside the sheet's own clamp).
  const apply = (b: Brick): Brick => {
    if (b.id !== action.brickId || b.kind !== "time") return b;
    const clamped = Math.max(0, Math.min(b.durationMin, action.minutes));
    if (b.minutesDone === clamped) return b;
    return { ...b, minutesDone: clamped };
  };
  // (same array-identity pattern as TICK_TIMER above — omitted for brevity, BUILDER copies)
  // ...
}
```

The reducer never mutates in place. `START_TIMER`'s "swap is the stop" semantics make the single-running invariant a single-line guarantee — there is no codepath in which two bricks could be marked running. `TICK_TIMER` and `SET_TIMER_MINUTES` short-circuit on identity to keep React reconciliation cheap during the 1 s tick cadence (especially during long sessions where >99% of state is unchanged each tick — same reference returned). `assertNever(action)` exhaustiveness is preserved by the four new union members each having a matching `case`. **The new `runningTimerBrickId` field has a clean migration path: the prior `defaultState()` shape is extended additively; existing tests that constructed `AppState` literals must add `runningTimerBrickId: null` (BUILDER will surface these as TypeScript errors during typecheck — fix in place).**

### Components

**`<BrickChip>` (time variant — extended; tick + goal variants unchanged from M4a/M4b)**

- Props (additive): `running: boolean` (computed at the parent — `runningTimerBrickId === brick.id`), `onTimerToggle?: (brickId: string) => void`, `onTimerOpenSheet?: (brickId: string) => void`. M4a/M4b props (`brick`, `categories`, `size`, `onTickToggle`, `onGoalLog`) preserved.
- DOM shape for `kind === "time"`: a single native `<button type="button">` (mirrors M4a tick chip — NOT a `role="group"` like M4b goal). Whole surface is the tap target. Inside: title (left, `flex: 1`, ellipsis on overflow), then the badge area (`Play` or `Pause` icon + `${minutesDone} / ${durationMin} m` text). Same gradient `<div data-testid="brick-fill">` for the foreground fill, transitions via `brickFill` token.
- Tap behaviour (AC #1, #2, #10): `onClick` fires `haptics.light()` synchronously, then calls `onTimerToggle?.(brick.id)`. The parent decides whether the dispatched action is `START_TIMER` or `STOP_TIMER` based on `state.runningTimerBrickId === brick.id` (avoids stale-closure risk inside the chip — see Cross-cutting concerns). Pointer handlers come from the new `useLongPress` helper (single-fire), which suppresses the synthetic click after a true long-press.
- Long-press behaviour (AC #13, #14): `useLongPress({ holdMs: 500, onTap, onLongPress })`. `onTap` calls the toggle path described above. `onLongPress` calls `haptics.medium()` (the long-press lift — same haptic M4b uses for clamp; consistent "hard cue" semantics) and then `onTimerOpenSheet?.(brick.id)`. The `useLongPress` helper guarantees that a true long-press does NOT also fire `onTap` — exactly one of the two callbacks runs per gesture.
- Glyph (AC #9): `Play` (▶, lucide-react) when `running === false`; `Pause` (⏸) when `running === true`. Both `aria-hidden="true"`. The pulse animation on the running chip is a CSS `@keyframes` (or Framer `motion.button`) that scales between `1.0` and `1.04` on a 1 s loop. **Suppressed under `prefers-reduced-motion: reduce`** (no transform applied, plain static glyph).
- Foreground gradient (AC #6, #8): the existing `<div data-testid="brick-fill">` element animates `width` via `transition: width 600ms ease-in-out` (re-uses the M4a `prefers-reduced-motion: reduce → transition: none` branch). On each `TICK_TIMER` reducer commit, the new `brickPct` is recomputed from `Math.min(minutesDone / durationMin, 1) × 100` and the inline `width` style retargets — CSS interpolates over 600 ms. At 1 s tick cadence the animation reads as a smooth, continuously-rising fill (the new target arrives 600 ms before the next tick, so the transition fully completes between ticks). **Reduced motion → fill jumps per tick (no smooth interpolation)** — already wired via M4a.
- ARIA (AC #28, #29): `aria-pressed={running}` on the `<button>`. Composite `aria-label` per AC #28: `"${brick.name}, ${minutesDone} of ${durationMin} minutes, ${running ? 'running, tap to stop' : 'stopped, tap to start'}"`. Use a new branch in the existing `buildAriaLabel` function — extend the `kind === "time"` branch to take a `running` argument and produce the AC #28 string.
- Keyboard: native `<button>` already handles Enter and Space. Both fire `onClick`, which does the toggle path. **Long-press has no keyboard equivalent** (long-press is a pointer gesture). Keyboard users tap to start/stop; for manual entry, an alternative path is **not** provided in M4c (M5 polish may add an inline edit mode for keyboard parity — out of scope here per spec § Out of scope).
- Click suppression after long-press: `useLongPress`'s `onPointerDown` calls `e.preventDefault()` to suppress the synthetic click that follows pointer events; if the long-press timer fires, the hook sets a "consumed" ref that causes `onPointerUp` to skip the `onTap` callback. Same belt-and-suspenders pattern M4b uses.

**`<TimerSheet>` (new)**

- Props: `open: boolean`, `brick: Extract<Brick, { kind: "time" }> | null`, `onSave: (minutes: number) => void`, `onCancel: () => void`. The parent (`<BuildingClient>`) holds `timerSheetState: { open: boolean; brickId: string | null }` and resolves the brick by id at render time (avoids stale-brick-snapshot risk during a running timer — see Cross-cutting concerns).
- DOM: `<Sheet open={open} onClose={onCancel} title="Set minutes">`. Body: a `<label>` wrapping `<input type="number" inputMode="numeric" min="0" max={brick.durationMin}>` pre-filled with `String(brick.minutesDone)`. Below the input: two buttons — Save (primary, `min-h-[44px]`, `aria-label="Save minutes"`) and Cancel (secondary, `min-h-[44px]`, `aria-label="Cancel"`). Cancel closes silently; Save reads the input value, parses with `Number(value)`, falls back to `0` if `NaN`, then clamps to `[0, durationMin]`. **If the parsed value (pre-clamp) was > `durationMin`, fire `haptics.medium()` BEFORE calling `onSave` to give the user the clamp cue per AC #18.**
- Focus trap: same Tab-cycle pattern as `<AddChooserSheet>` (per `components/AddChooserSheet.tsx:32–65` which BUILDER added in M4d under VERIFIER D2). Re-use the inline `useEffect`-with-keydown approach; do not extract a hook in M4c (extraction is a separate refactor — out of scope, would touch M4d).
- Accessibility: `<input>` carries `aria-label="Minutes done"`. Sheet's `role="dialog"` + `aria-modal="true"` come from `<Sheet>`. The number input's `min` and `max` attributes are honored by browsers for the spinner UI; the explicit clamp + haptic in `handleSave` is the load-bearing path (don't trust browser validation alone).
- Reduced motion: inherits `<Sheet>`'s `modalIn` / `modalOut` (already collapsed under reduced-motion via `<Sheet>`).
- **The sheet does NOT stop the timer when opened** (AC #16). If `running === true` at long-press, the timer continues to accumulate during the sheet session. Save updates `minutesDone` to the new value; the running timer's next tick computes a NEW `startedAt`-based delta from the new `minutesDone` floor. **This is `lib/timer.ts`'s responsibility:** when `runningTimerBrickId` is unchanged but the underlying `minutesDone` of that brick changes (e.g., a `SET_TIMER_MINUTES` mid-run), the timer module must recompute `startedAtRef = Date.now()` and `initialMinutesDoneRef = newMinutesDone` so the next tick is correct. See § Library modules below.

**`<TimelineBlock>` (extended)**

- Props (additive): `runningTimerBrickId: string | null`, `onTimerToggle?: (brickId: string) => void`, `onTimerOpenSheet?: (brickId: string) => void`. Each `<BrickChip>` rendered inside is given `running={runningTimerBrickId === brick.id}` plus the two callbacks.
- Block-100 cross-up: reused from M4a — `useCrossUpEffect(blockPct(block), 100, fireBlockComplete)` already fires on every `blockPct` recomputation. Each `TICK_TIMER` that brings the block to 100 fires bloom + chime + `success` haptic exactly once.
- The `TICK_TIMER` reducer's identity short-circuit means redundant ticks (no minute boundary crossed) do NOT cause a new `useCrossUpEffect` evaluation — the value reference is stable, the effect's dep array is unchanged, the celebration cannot mis-fire.

**`<Timeline>` and `<LooseBricksTray>` (extended)**

- Pass-through-only: each accepts `runningTimerBrickId`, `onTimerToggle`, `onTimerOpenSheet` and threads them down. No render or layout changes — mirrors the M4a `onTickToggle` and M4b `onGoalLog` plumbing.

**`<BuildingClient>` (extended)**

- New state: `const [timerSheetState, setTimerSheetState] = useState<{ open: boolean; brickId: string | null }>({ open: false, brickId: null })`.
- New callback `handleTimerToggle = useCallback((brickId: string) => { dispatch(state.runningTimerBrickId === brickId ? { type: "STOP_TIMER", brickId } : { type: "START_TIMER", brickId }); }, [dispatch, state.runningTimerBrickId])`. Threaded to `<Timeline>` and `<LooseBricksTray>`. The dependency on `state.runningTimerBrickId` regenerates the callback on every running-timer change — fine, since the callback is consumed by chip `<button>` handlers that re-bind freely on each render.
- New callback `handleTimerOpenSheet = useCallback((brickId: string) => setTimerSheetState({ open: true, brickId }), [])`. Threaded same way.
- New callback `handleTimerSave = useCallback((minutes: number) => { if (timerSheetState.brickId !== null) dispatch({ type: "SET_TIMER_MINUTES", brickId: timerSheetState.brickId, minutes }); setTimerSheetState({ open: false, brickId: null }); }, [dispatch, timerSheetState.brickId])`. New callback `handleTimerCancel = useCallback(() => setTimerSheetState({ open: false, brickId: null }), [])`.
- Resolve the active brick at render: `const timerSheetBrick = timerSheetState.brickId !== null ? findBrickById(state, timerSheetState.brickId) : null` (helper traverses `state.blocks[*].bricks[]` then `state.looseBricks[]`, returning the first `kind === "time"` match). Render `<TimerSheet open={timerSheetState.open} brick={timerSheetBrick} onSave={handleTimerSave} onCancel={handleTimerCancel} />`.
- **Call `useTimer(state, dispatch)` once** near the top of the component (alongside `useNow`). The hook owns the interval lifecycle (see § Library modules).
- Day-100 cross-up via `useCrossUpEffect(heroPct, 100, fireDayComplete)` is reused unchanged. A `TICK_TIMER` that brings `heroPct` to 100 fires fireworks + chime + `notification` haptic via the M4a path. Cross-down (e.g., if the user sets `minutesDone` back to 0 via `SET_TIMER_MINUTES`) resets the gate; re-cross-up replays the celebration per the M3-locked one-shot rule.

### Library modules

**`lib/timer.ts` — `useTimer(state, dispatch)` design (resolves SG-m4c-01, SG-m4c-02, SG-m4c-03, SG-m4c-04, SG-m4c-08)**

```ts
"use client";
import { useEffect, useRef } from "react";
import type { AppState, Action, Brick } from "./types";

const TICK_INTERVAL_MS = 1000; // SG-m4c-02 — 1 s default; M7 may revisit

function findTimeBrickById(
  state: AppState,
  id: string,
): Extract<Brick, { kind: "time" }> | null {
  for (const block of state.blocks) {
    for (const brick of block.bricks) {
      if (brick.id === id && brick.kind === "time") return brick;
    }
  }
  for (const brick of state.looseBricks) {
    if (brick.id === id && brick.kind === "time") return brick;
  }
  return null;
}

export function useTimer(
  state: AppState,
  dispatch: React.Dispatch<Action>,
): void {
  const startedAtRef = useRef<number | null>(null);
  const initialMinutesDoneRef = useRef<number>(0);
  const lastDispatchedMinutesRef = useRef<number>(0);

  // Drive the interval off state.runningTimerBrickId.
  useEffect(() => {
    const runningId = state.runningTimerBrickId;
    if (runningId === null) {
      startedAtRef.current = null;
      return;
    }

    // Capture the floor at start (SG-m4c-03 — floor, not round).
    const brick = findTimeBrickById(state, runningId);
    if (brick === null) return; // defensive — should not happen
    startedAtRef.current = Date.now();
    initialMinutesDoneRef.current = brick.minutesDone;
    lastDispatchedMinutesRef.current = brick.minutesDone;

    const computeAndDispatch = () => {
      if (startedAtRef.current === null) return;
      const elapsedMs = Date.now() - startedAtRef.current;
      const next =
        Math.floor(elapsedMs / 60000) + initialMinutesDoneRef.current;
      if (next === lastDispatchedMinutesRef.current) return; // identity short-circuit (SG-m4c-02)
      lastDispatchedMinutesRef.current = next;
      dispatch({ type: "TICK_TIMER", brickId: runningId, minutesDone: next });
    };

    const intervalId = window.setInterval(computeAndDispatch, TICK_INTERVAL_MS);

    // SG-m4c-08 — visibilitychange recovery. On tab foreground, dispatch one corrective tick
    // immediately (browser-throttled intervals miss ticks while backgrounded).
    const onVisible = () => {
      if (document.visibilityState === "visible") computeAndDispatch();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
      startedAtRef.current = null;
    };
  }, [state.runningTimerBrickId, dispatch, state]);
}
```

**Why this shape (resolving SG-m4c-01).** A React hook called once at the top of `<BuildingClient>` (the existing `useReducer` host) is the simplest design: no Context, no external store, no module-scoped global state, no risk of duplicate intervals. The `useEffect` keyed on `state.runningTimerBrickId` is the single source of lifecycle truth — start when non-null, stop when null. Auto-stops via `useEffect` cleanup when the effect re-runs (i.e., when the user starts a new timer while another is running, which flips the id to a new value). External-store alternatives (Zustand, observable singleton) add weight and a second source of truth without solving any concrete problem at this scope. Lives in `<BuildingClient>` (not the root layout) because: (a) `<BuildingClient>` owns the reducer; the timer module wants the same `dispatch` reference, and (b) the building view is the only surface that needs the timer — the root layout has no business hosting feature-specific machinery.

**Tick cadence (SG-m4c-02).** 1 s default. Identity short-circuit at the reducer's `TICK_TIMER` arm + the `lastDispatchedMinutesRef` guard inside the hook combine to ensure that when no minute boundary is crossed (~59 of every 60 ticks), no React re-render happens — `dispatch` is not even called. Only minute-boundary crossings cause a state update. **M7 fallback:** if profiling shows render cost during multi-timer sessions (theoretically impossible per single-running invariant, but if M7 ever lifts that), batch dispatch to every 5 s while still updating display via local component state. M4c ships 1 s.

**Rounding on stop (SG-m4c-03).** Floor — only fully-completed minutes count. The hook computes `Math.floor(elapsedMs / 60000) + initialMinutesDoneRef.current` on every tick AND on stop. There is no separate "stop" computation — `STOP_TIMER` reducer just clears `runningTimerBrickId`; the last `TICK_TIMER` dispatched (one per minute boundary) is the captured value. This avoids premature 100% celebrations from an "in the moment of stopping, round up" path. **`SET_TIMER_MINUTES`** uses the user-typed integer directly (no further floor — the input is already `<input type="number">`); if the user types a fractional value, `Number()` parses it and the reducer's clamp accepts the float as-is. AC review: spec accepts integer minutes only — the input's `step="1"` attribute (browser-default) plus `Number()` parsing yields integer-ish behaviour; documented in the sheet that fractional input rounds toward 0 via the implicit floor inside the input's spinner. **Decision:** add `step="1"` explicitly to the input to force integer increments via the spinner, and use `Math.floor(Number(value))` in `handleSave` to be defensive.

**Battery / power efficiency (SG-m4c-04).** Confirmed: M4c does NOT implement explicit battery-aware logic. The browser throttles `setInterval` to ~1 s minimum on Chrome and pauses it on Safari when backgrounded — that's the OS's job. M7 polish may add `requestAnimationFrame`-based smoother visuals or longer ticks if profiling justifies it. No new APIs are wired in M4c.

**Single-timer invariant enforcement (SG-m4c-05).** Reducer-side. `START_TIMER` writes the new id; the prior id (if any) is overwritten. There is no second "running" field, no list, no map. The data-flow proof: the chip's `running` prop is computed at the parent as `runningTimerBrickId === brick.id`; only one chip in the entire tree can satisfy that equality at any given time. Therefore only one chip displays the ⏸ glyph + pulse. UI and state agree by construction. The `<TimelineBlock>` and `<LooseBricksTray>` props pass `runningTimerBrickId` (the whole field), not a per-chip `running` boolean, so the equality check is centralized at the chip site (not duplicated at the parent). No "auto-stop the prior brick" branch is needed — the field is single-valued, the swap IS the stop.

**Manual-entry sheet location (SG-m4c-06).** Confirmed: bottom sheet via M0 `<Sheet>`. Same pattern as `<AddChooserSheet>` (M4d). Single number input + Save / Cancel. No category picker, no recurrence picker, no toggle — simpler than the M2/M3 sheets.

**Long-press vs tap (SG-m4c-07).** Threshold: 500 ms hold (matches M4b's `HOLD_MS`). `pointerdown` starts a 500 ms timer; if `pointerup` fires before 500 ms, treat as tap (call `onTap`); if 500 ms elapses without `pointerup`, treat as long-press (call `onLongPress`, mark gesture as consumed so the eventual `pointerup` does NOT also call `onTap`). Implementation: extend `lib/longPress.ts` with a sibling `useLongPress({ holdMs, onTap, onLongPress })` hook. **The new hook does not change `useLongPressRepeat` (used by M4b) — they coexist as two independent exports from the same module.** `useLongPress` is ~25 lines: one `useRef` for the timeout id, one `useRef<'idle' | 'tap-eligible' | 'long-pressed'>` state machine, the four pointer handlers (`onPointerDown` / `onPointerUp` / `onPointerCancel` / `onPointerLeave`), and a `useEffect` cleanup. BUILDER will write the actual implementation; this plan reserves the API.

**Tab-background recovery (SG-m4c-08).** `visibilitychange` listener inside `lib/timer.ts`'s effect. On `document.visibilityState === "visible"`, dispatch one corrective tick immediately (compute via `Date.now() - startedAtRef.current` per the same path as the regular interval). This recovers the accurate elapsed minute count after Chrome's throttled interval missed ticks or Safari paused entirely. The listener is registered alongside the interval and torn down in the same cleanup — single source of truth. **Page refresh is NOT recovered** — that requires persistence of `runningTimerBrickId` + `startedAt`, which is M8.

### Haptics map

| Trigger                                                               | Haptic event                         | Source                               |
| --------------------------------------------------------------------- | ------------------------------------ | ------------------------------------ |
| Tap a stopped time chip → `START_TIMER`                               | `light`                              | `<BrickChip>` (M4c NEW call site)    |
| Tap a running time chip → `STOP_TIMER`                                | `light`                              | `<BrickChip>` (M4c NEW call site)    |
| Long-press a time chip → opens `<TimerSheet>`                         | `medium`                             | `<BrickChip>` (M4c NEW call site)    |
| Manual entry > `durationMin` (clamp on Save)                          | `medium`                             | `<TimerSheet>` (M4c NEW call site)   |
| Block-100 cross-up triggered by a `TICK_TIMER` or `SET_TIMER_MINUTES` | `success` (+ chime)                  | `<TimelineBlock>` (reused from M4a)  |
| Day-100 cross-up triggered by a `TICK_TIMER` or `SET_TIMER_MINUTES`   | `notification` (+ chime + fireworks) | `<BuildingClient>` (reused from M4a) |

### Visual cascade

**All cascade visuals from M4a/M4b are reused unchanged.** A successful timer tick path is:

1. `lib/timer.ts`'s interval fires → `dispatch({ type: "TICK_TIMER", brickId, minutesDone: next })`.
2. Reducer's identity short-circuit either returns the same state ref (no minute boundary crossed → no re-render) OR returns a new state with the brick's `minutesDone` updated.
3. New `pct` flows through `brickPct` for the time brick → `data-testid="brick-fill"` `width` style retargets → CSS transitions over 600 ms (instant under reduced-motion).
4. New `blockPct` propagates → block scaffold left-bar fills (M3 wiring).
5. New `dayPct` propagates → BlueprintBar opacity recomputes (M3 wiring).
6. New `heroPct` propagates → HeroRing arc redraws + hero numeral count-up (M3 wiring).
7. If `blockPct` crossed 100 from below: `<TimelineBlock>` cross-up fires bloom + chime + `success` haptic (M4a).
8. If `heroPct` crossed 100 from below: `<BuildingClient>` cross-up fires fireworks + chime + `notification` haptic (M4a).
9. Cross-down via `SET_TIMER_MINUTES` (e.g., user opens sheet, types 0, saves) resets the gate; re-cross-up replays celebration (M3 one-shot rule).

M4c adds **zero** new visual primitives — every paint path is M3 + M4a's. The chip's `Pause` glyph + scale-pulse is the only new visual element, and it's localized to the chip's badge area.

### Reduced motion

- Chip foreground gradient `width` transition: collapses to `none` (already done in M4a; reused by time chip).
- Chip running-state pulse: suppressed under `prefers-reduced-motion: reduce` (no `transform` applied, plain static glyph). Per AC #27.
- Bloom on block-100: visual suppressed; haptic + chime still fire (M4a).
- Fireworks on day-100: visual returns null; haptic + chime still fire (M4a).
- `<TimerSheet>` open/close: inherits `<Sheet>`'s `modalIn` / `modalOut` reduced-motion collapse.
- Per AC #27: reduced-motion users still feel every start/stop (`light`) and clamp (`medium`), and hear celebrations (`success` / `notification` chimes). The motion budget is purely visual.

### A11y

- Time chip is a single native `<button type="button">`. Native role + keyboard activation (Enter / Space) come for free.
- `aria-pressed={running}` per AC #29. `aria-label` per AC #28 — full string `"${name}, ${minutesDone} of ${durationMin} minutes, ${running ? 'running, tap to stop' : 'stopped, tap to start'}"`.
- `<TimerSheet>`'s `<input>` carries `aria-label="Minutes done"`. Save and Cancel buttons carry explicit `aria-label="Save minutes"` / `"Cancel"`.
- Tab focus order in the sheet: input → Save → Cancel → (back to input via Tab cycle).
- axe-core target per AC #30: zero violations on the building view with at least one time brick rendered (running and stopped variants), and on the open `<TimerSheet>`. Verified by Playwright + `@axe-core/playwright`.
- Long-press is a pointer gesture only — keyboard users cannot open the sheet from a chip. **Documented limitation**, M5+ may add an inline edit mode for keyboard parity. Not an axe violation (the chip's primary action — start/stop — is fully keyboard-accessible).

### Cross-cutting concerns BUILDER will hit

1. **State lift through `Timeline` / `LooseBricksTray`.** Three new props (`runningTimerBrickId`, `onTimerToggle`, `onTimerOpenSheet`) thread through the same prop-drill pattern as M4a's `onTickToggle` and M4b's `onGoalLog`. Do NOT introduce React Context.
2. **`useCallback` discipline.** `handleTimerToggle` MUST depend on `state.runningTimerBrickId` (it reads the field to decide `START_TIMER` vs `STOP_TIMER`). `handleTimerSave` MUST depend on `timerSheetState.brickId`. Without these, stale closures could dispatch the wrong action.
3. **Chip `running` is a derived prop, not a separate state.** Compute `running={runningTimerBrickId === brick.id}` at the parent; do NOT mirror it inside the chip. This guarantees the chip's `running` always reflects state.
4. **Find-by-id helper for `<TimerSheet>`.** The sheet receives a `brick` prop, but the parent stores only `brickId`. Resolving `brickId → brick` at render time means: when a running timer's `minutesDone` ticks while the sheet is open (yes, the sheet stays open during a running timer per AC #16), the input's `defaultValue` reflects the latest. **Decision:** the input is **uncontrolled** — `defaultValue={brick.minutesDone}` initialized once when the sheet opens. Subsequent ticks DO update the underlying brick but the input's displayed value does NOT change (intentional — the user is editing; we don't yank their typing). Save reads `inputRef.current!.value` at submit time. Cancel discards. (Alternative: controlled input with `key={brickId}` to remount on open — equivalent UX. BUILDER picks the simpler path; document in PR.)
5. **Reducer no-op identity preservation.** Both `TICK_TIMER` and `SET_TIMER_MINUTES` short-circuit on identity (return the same state reference when `minutesDone` is unchanged). This is critical at the 1 s tick cadence: ~59 of every 60 dispatches are no-ops; without identity preservation, `useCrossUpEffect`'s effect re-runs every second, potentially mis-firing celebrations during long sessions.
6. **`assertNever` exhaustiveness.** `lib/data.ts:default → assertNever(action)` arm preserved by adding the four new cases. TypeScript compile guarantees this.
7. **Timer module testability.** `lib/timer.ts` MUST be testable with `vi.useFakeTimers()` + `vi.advanceTimersByTime()` + a controlled `Date.now()` (via `vi.setSystemTime`). Use raw `window.setInterval` / `document.addEventListener("visibilitychange", ...)` (not `requestAnimationFrame`) so the Vitest harness hooks them. The `findTimeBrickById` helper is exported for unit testing in isolation.
8. **`<TimerSheet>` focus trap reuses M4d's pattern verbatim.** Do NOT extract a hook in M4c. The M4d `AddChooserSheet` has the canonical inline implementation; copy it to `TimerSheet.tsx`. Extraction is a separate refactor (deferred to M5+).
9. **Click suppression after long-press.** `useLongPress`'s `onPointerDown` calls `e.preventDefault()` and the hook's internal "consumed" ref ensures the synthetic click is skipped after a true long-press. BUILDER must verify this in component tests using `fireEvent.pointerDown` + `vi.advanceTimersByTime(500)` + asserting `onTap` was NOT called.
10. **Test seeds for time bricks.** `tests.md` will need a deterministic seed helper to put the running-timer state into the page (per the M4d ships-empty-and-vacuous-pass note in `status.md`). Reuse the same seeding approach M4a/M4b/M4d tests use (constructing `AppState` literals in Vitest; for Playwright, the `?seed=` query-param helper if it exists, else continue the vacuous-pass-guarded pattern with a TODO for M7 cleanup).
11. **Gate D (typecheck).** BUILDER must run `tsc --noEmit` before declaring red→green→commit. The new `runningTimerBrickId: string | null` field on `AppState` will surface as TypeScript errors in any test fixture that constructs `AppState` literals — fix in place by adding the field.
12. **`window.setInterval` SSR guard.** `lib/timer.ts` is `"use client"` and only runs after first paint, so `setInterval` is always available. No SSR guard needed inside the hook (the `"use client"` boundary is sufficient).

### Edge cases

- **Tap a running time chip.** Dispatches `STOP_TIMER`; reducer clears `runningTimerBrickId`; `lib/timer.ts`'s effect tears down the interval; the chip's `running` flips to `false`; glyph reverts to `Play`. The last `TICK_TIMER` dispatched (at the most recent minute boundary) is the captured `minutesDone` — no extra "stop snapshot" computation. Per AC #2, AC #4.
- **Tap a stopped time chip while another timer is running.** Dispatches `START_TIMER` for the new brick; reducer overwrites `runningTimerBrickId`; the prior timer's effect tears down (its cleanup runs); a new effect starts for the new brick. The prior brick's chip `running` flips to `false` (its glyph reverts to `Play`); the new chip's `running` flips to `true` (its glyph becomes `Pause` + pulse). Per AC #11, AC #12.
- **Timer reaches `durationMin`.** `TICK_TIMER` continues to dispatch (`minutesDone` exceeds `durationMin`); `brickPct` clamps to 100; the chip stays at full fill; block-100 / day-100 cross-ups fire once on first crossing. The user can stop to lock in the value or keep running for over-target tracking. Per spec § Edge cases.
- **Manual entry > `durationMin`.** `<TimerSheet>` clamps in `handleSave` and fires `haptics.medium()` before dispatching. Reducer's `SET_TIMER_MINUTES` arm clamps again (defense-in-depth). Per AC #18.
- **Manual entry < 0.** Clamp to 0 in both sheet and reducer. No haptic on under-zero (the spec only mandates `medium` on overflow; under-zero is a rarer edge case and `light` would be misleading because under-zero means "saved nothing happened"). BUILDER picks: silent clamp on negative input. Document in PR.
- **Long-press while another timer is running.** Long-press opens `<TimerSheet>` for the long-pressed brick. The other brick's timer keeps running. Saving updates the long-pressed brick's `minutesDone`; if the long-pressed brick IS the running one, see "Manual entry while running" below.
- **Manual entry while running** (AC #16). The timer keeps running. Save calls `SET_TIMER_MINUTES` → reducer updates `minutesDone`. Because this changes the running brick's `minutesDone`, `lib/timer.ts`'s effect re-runs (its dep array includes `state` for this exact reason — `state.blocks` / `state.looseBricks` reference changes when the brick is updated), which captures a new `startedAtRef = Date.now()` and `initialMinutesDoneRef = newMinutesDone`. The next 1 s tick computes from the new floor. **Subtle:** including the full `state` in the dep array is heavier than needed; BUILDER may prefer to depend only on the running brick's `minutesDone`, which requires a derived selector. **Plan-level decision:** depend on `state` (the whole reducer state). Cost: the effect re-runs whenever any state changes (including unrelated ticks/adds). Mitigation: the effect's body returns early when `runningTimerBrickId === null`; when non-null, the cleanup tears down and the body re-runs — which captures the current `initialMinutesDoneRef` correctly. The interval handler is recreated each time but the `setInterval` lifecycle is tied to the `useEffect` body, so this is correct. BUILDER may optimize later; correctness comes first.
- **Tab backgrounded during a running timer** (AC #24). Browser throttles `setInterval` to ~1 s minimum (Chrome) or pauses (Safari). On `visibilitychange === "visible"`, the listener inside `lib/timer.ts` dispatches one corrective `TICK_TIMER` immediately, computed from `Date.now() - startedAtRef.current` so the displayed `minutesDone` is accurate. Documented limitation: page refresh during a backgrounded timer loses everything (M8 fixes via persistence).
- **Page refresh during a running timer.** State resets to `defaultState()` → `runningTimerBrickId === null`. The effect doesn't start. The previously-running brick's `minutesDone` reflects only what was committed before the refresh. M8 will persist `runningTimerBrickId` + `startedAt` to recover.
- **Reduced motion.** Chip pulse suppressed; gradient fill collapses to per-tick (no smooth interpolation). Haptics + chime still fire.
- **Block expand / collapse during a running timer** (AC #22, #23). `lib/timer.ts` is unaware of expand/collapse. The interval keeps running. When the block re-expands, the chip is re-mounted with the latest accumulated `minutesDone` (the running flag and the `running` prop are read from `state.runningTimerBrickId`, not from any per-chip mount-time snapshot). Verified by spec AC #22-23.
- **Time chip in a collapsed block.** The chip is not in the DOM (the parent block doesn't render bricks until expanded). The timer keeps running regardless. The user can re-expand to see the live count.
- **Time chip in `<LooseBricksTray>`.** Identical behaviour. The tray's collapsed scroll-row state (M3 SG-m3-15) does not affect the timer.
- **Two long-presses in quick succession.** Each long-press opens the sheet; the second open replaces the first (same `timerSheetState` slot). `<TimerSheet>` rendering is conditional on `open`, so the React tree just re-renders with the new `brickId`.
- **`durationMin === 0` (degenerate user input).** `brickPct` returns 0 (the existing zero-duration guard in `lib/dharma.ts:39-40`). Tapping the chip dispatches `START_TIMER`, the timer runs and dispatches `TICK_TIMER` with growing `minutesDone`, but `brickPct` stays at 0. The block-100 / day-100 cross-ups never fire from this brick alone. AddBrickSheet validation (M3) prevents creating such a brick, but defense-in-depth is free here.
- **Brick id collision.** Defensive — reducer's `apply` helpers match by `id` AND `kind === "time"`; a non-time brick with the same id (impossible by uuid generation but defensible) is a no-op.
- **`SET_TIMER_MINUTES` for a non-running brick.** Allowed. Reducer updates `minutesDone` regardless of `runningTimerBrickId`. The user's mental model: "manually log time on a brick I'm not actively timing." Useful for past-session logging. Per spec AC #15.
- **`STOP_TIMER` while no timer running.** Reducer no-op. The chip's `onClick` only dispatches `STOP_TIMER` when `running === true` (which requires `runningTimerBrickId === brick.id`), so this codepath is normally unreachable; the no-op is defensive.
- **Click vs `pointerdown` on time chip.** The `useLongPress` hook attaches pointer handlers; the chip's `<button>` ALSO has an `onClick` for keyboard activation (Enter / Space, where `e.detail === 0`). Same dual-path pattern as M4b's stepper buttons. BUILDER copies the M4b pattern (the `e.detail === 0` keyboard guard). Pointer-driven clicks are suppressed by the hook's `preventDefault` + consumed-ref logic.

### Decisions to honor

- **ADR-031 (44 px touch target)** — the time chip's `<button>` enforces `min-height: 44px` (mirrors M4a tick chip). The whole chip surface is the tap target.
- **ADR-039 (ships empty)** — M4c adds no factory data. No new categories, blocks, bricks, or timers. The timer has nothing to start until a user adds a time brick via the M3 / M4d AddBrickSheet path.
- **ADR-027 (commit prefixes)** — BUILDER commits as `test(m4c): …` (red) and `feat(m4c): …` / `fix(m4c): …` (green/refactor). PLANNER's commits land as `docs(plan-m4c): …` and `docs(tests-m4c): …`. SHIPPER as `chore(ship-m4c): …` and `docs(ship-m4c): …`.
- **ADR-022 (one feature per dispatch)** — this plan covers M4c only. M4 is now complete (M4a + M4b + M4c logging trilogy + M4d chooser). M5 is a separate `/feature m5` invocation.
- **ADR-025 / ADR-026 / ADR-041 (mode separation + single-gate Loop)** — this dispatch writes `/docs/plan.md` only. The next dispatch (`mode: TESTS`) writes `/docs/tests.md`. VERIFIER then audits both. No human gate between TESTS and BUILD.
- **ADR-017 (time bricks use a real timer)** — directly fulfilled. Phase-1 implements a real timer per the empty-toolkit pivot. **Note:** ADR-017 specifies localStorage persistence of `{ runningSince, accumulatedSec }`; M4c does NOT implement persistence (deferred to M8 per spec § Out of scope). This is a planned partial-fulfillment of ADR-017 — the timer is real (start/stop, mm-accurate display, single-running invariant), persistence is M8's job. ADR-017 is honored in spirit; the persistence half is staged for M8. **VERIFIER note:** if VERIFIER reads ADR-017 strictly and flags non-persistence as a gap, escalate as `ADR needed: Confirm M4c partial-fulfillment of ADR-017; persistence is M8's job.`. Spec AC #34 explicitly does NOT require persistence (the Playwright test asserts behaviour within a session, not across refresh), so the partial-fulfillment is spec-grounded.
- **ADR-032 / ADR-035 / ADR-034** — categories user-defined, bricks may be standalone, blocks always timed. M4c touches none of these contracts.
- **ADR-018 (localStorage `dharma:v1`)** — M4c does NOT route through `lib/persist.ts`. State is in-memory until M8.
- **ADR-024 (3-FAIL EVALUATOR cap)** — applies as usual.
- **Locked Brick discriminated union** — M4c mutates `minutesDone` only on the `kind === "time"` arm. The `durationMin` field is read-only in M4c (edit is M5). The reducer's pattern-match on `kind === "time"` is the type-system guard; without it, TypeScript would reject `b.minutesDone = next` because tick / goal bricks have no `minutesDone` field.
- **`assertNever` exhaustiveness** — preserved by adding the four new cases.
- **No new npm deps** — verified. `setInterval`, `document.addEventListener("visibilitychange")`, `Date.now()` are all Web APIs. Pointer Events for long-press already shipped via M4b. `motion`, `lucide-react` already installed.
- **Gate D (typecheck)** — added at end of M4a. M4c BUILDER must run `tsc --noEmit` before declaring red→green→commit.
- **Vacuous-pass debt** — M4c's E2E + a11y tests will continue to use the `if ((await x.count()) > 0)` guard pattern OR the seed-via-state injection pattern, matching M4a/M4b/M4d. The deterministic-seeding helper is still TODO for a future TESTS-mode follow-up; M4c does NOT introduce it (out of scope; would touch M4a-M4d harnesses).

### Resolutions for open spec gaps (SG-m4c-01..SG-m4c-08)

- **SG-m4c-01 — `lib/timer.ts` shape.** **LOCKED — `useTimer(state, dispatch)` React hook called once at the top of `<BuildingClient>`.** Single `useEffect` keyed on `state.runningTimerBrickId`. No external store, no Context, no module-level globals. Rationale: simplest design that satisfies the single-running invariant and the 1 s tick cadence; reuses the existing `useReducer` host's `dispatch`; lifecycle tied to the existing component tree. Alternative (Zustand-style external store) adds a dependency and a second source of truth without solving any concrete problem at this scope.
- **SG-m4c-02 — Tick cadence vs render cost.** **LOCKED — 1 s default.** Plus identity short-circuit at the reducer's `TICK_TIMER` arm and a `lastDispatchedMinutesRef` guard inside the hook so ~59 of every 60 ticks dispatch nothing. M7 fallback: batch to 5 s if profiling shows jank, with display still updating at 1 s via local component state. M4c ships 1 s. Constants in `lib/timer.ts`: `TICK_INTERVAL_MS = 1000`.
- **SG-m4c-03 — Rounding when stopping.** **LOCKED — floor.** `Math.floor((Date.now() - startedAt) / 60000) + initialMinutesDone`. No round-up. Rationale: only completed minutes count, avoids premature 100% celebrations, matches user mental model ("the timer hit 14:59 and I stopped — it's 14 minutes done, not 15"). `SET_TIMER_MINUTES` uses the user-typed integer (input has `step="1"`); `Math.floor(Number(value))` in `handleSave` is defensive against fractional input.
- **SG-m4c-04 — Battery / power efficiency.** **LOCKED — no explicit logic in M4c, browser throttling suffices.** Foreground 1 s ticks are acceptable. Background throttling is the OS / browser's job. M7 polish may revisit with `requestAnimationFrame`-based smoother visuals or longer ticks; not in scope here.
- **SG-m4c-05 — Single-timer invariant enforcement.** **LOCKED — reducer-side via single-valued `runningTimerBrickId: string | null`.** No list, no map. `START_TIMER` writes the new id (overwriting the prior); the field's single-valuedness IS the invariant. UI's `running` is derived as `runningTimerBrickId === brick.id` at the parent — only one chip in the tree can satisfy this equality at a time. Data-flow proof above (§ Library modules → "Single-timer invariant enforcement").
- **SG-m4c-06 — Manual-entry sheet location.** **LOCKED — `<Sheet>` reuse via new `<TimerSheet>` component.** Mirrors `<AddChooserSheet>` simplicity (single view, one input, two buttons). No category picker, no recurrence picker. Focus trap copied verbatim from M4d's `AddChooserSheet.tsx:32-65`.
- **SG-m4c-07 — Long-press vs tap.** **LOCKED — 500 ms threshold; `pointerdown` starts a 500 ms timer; `pointerup` before 500 ms → `onTap`; 500 ms elapsed without `pointerup` → `onLongPress` + consumed flag (suppresses the eventual `onTap`).** New sibling helper `useLongPress({ holdMs: 500, onTap, onLongPress })` in `lib/longPress.ts` (adds ~25 lines; coexists with `useLongPressRepeat`). M4b's hook is unchanged. Pointer-Events only (no Touch-Events fallback), per M4b's locked decision.
- **SG-m4c-08 — Tab-background recovery.** **LOCKED — `visibilitychange` listener inside `lib/timer.ts`.** On `document.visibilityState === "visible"`, dispatch one corrective `TICK_TIMER` immediately (computed from `Date.now() - startedAtRef.current + initialMinutesDoneRef.current`). Listener registered alongside the interval and torn down in the same `useEffect` cleanup — single source of truth.

### Out of scope (M4c)

- Page-refresh timer recovery → **M8** (needs persistence of `runningTimerBrickId` + `startedAt`).
- Multiple concurrent timers → **never** (intentional, single-running invariant per § 0.5).
- Pomodoro / interval pattern → **never (or M10+)**.
- Timer-driven push notifications outside the app → **never (or M10+)**.
- Manual minute editing inline (`+/-` like the goal stepper, without a sheet) → **M5** edit mode.
- Timer audio cues at start / stop (chime on start, distinct chime on stop) → **never (or M7 polish)**. Spec mandates haptic only.
- Per-block / per-timer chime variants → **never** (same single asset as M4a; chime is reserved for cross-up celebrations only).
- A `useFocusTrap` extraction for `<TimerSheet>` and `<AddChooserSheet>` → **deferred refactor** (M5+ cleanup).
- Background-tab timer accuracy beyond `visibilitychange` recovery → **M7 polish** (would require Web Workers or Service Worker timekeeping).
- Notifications when a timer reaches `durationMin` → **never (or M10+)**.
- A `useLongPress` extraction into `react-aria` or a third-party library → **never** (~25 lines locally is cheaper than a dependency).
- Edit `durationMin` from inside `<TimerSheet>` → **M5 polish** (sheet is single-purpose: minutes elapsed only).
- Visual progress beyond the 1 s tick (e.g., a smooth `requestAnimationFrame`-driven sub-second sweep) → **M7 polish**.
- A "lap" / "split" timer → **never (or M10+)**.

### Test strategy

The TESTS-mode dispatch (separate, per ADR-025) will produce the actual GIVEN/WHEN/THEN IDs. This plan reserves the following layers and broad coverage targets:

- **Unit (Vitest)** — `lib/data.test.ts`: four reducer arms (`START_TIMER` first run, `START_TIMER` swaps prior, `STOP_TIMER` non-no-op + no-op, `TICK_TIMER` writes minutes + identity short-circuit, `SET_TIMER_MINUTES` clamp at floor/ceiling/in-range/non-time-kind no-op). `lib/timer.test.ts` (NEW): hook starts interval when `runningTimerBrickId` non-null, dispatches `TICK_TIMER` at 60 s boundaries (mock `Date.now()` + `vi.advanceTimersByTime`), tears down on null, dispatches corrective tick on `visibilitychange === "visible"`, identity short-circuit suppresses no-op dispatches. `lib/longPress.test.ts` extension: `useLongPress` (new sibling hook) — fires `onTap` on quick `pointerup`, fires `onLongPress` after `holdMs`, suppresses `onTap` after `onLongPress`, clears on `pointercancel` / `pointerleave` / unmount.
- **Component (Vitest + Testing Library)** — `components/BrickChip.test.tsx`: time chip renders Play glyph when stopped, Pause glyph when running, `aria-pressed` reflects running, `aria-label` matches AC #28 string for both states, tap fires haptic.light + onTimerToggle, long-press fires haptic.medium + onTimerOpenSheet (with vi.useFakeTimers + vi.advanceTimersByTime), long-press suppresses tap, reduced-motion suppresses pulse. `components/TimerSheet.test.tsx` (NEW): renders with input pre-filled to brick.minutesDone, Save fires onSave with parsed integer, Save with overflow clamps + fires haptic.medium, Save with negative clamps to 0 silently, Cancel fires onCancel, focus trap cycles through input → Save → Cancel → input. `components/TimelineBlock.test.tsx`, `components/Timeline.test.tsx`, `components/LooseBricksTray.test.tsx`: regression — pass-through plumbing for new props (no behaviour change for tick / goal). `app/(building)/BuildingClient.m4c.test.tsx` (NEW dedicated file per the M4b precedent — `defaultState` mock isolation): integration of the chip-tap → reducer → cascade → cross-up wiring; `useTimer` integration; `<TimerSheet>` open/close lifecycle.
- **E2E (Playwright, mobile-chrome 430 px)** — `tests/e2e/m4c.spec.ts`: tap a time brick → glyph becomes Pause, chip pulses, badge updates over time (5 s wait + assert badge incremented or page state shows TICK_TIMER fired; vacuous-pass guarded); collapse the parent block → re-expand → badge still incremented (timer kept running); start a second timer while first is running → first chip's glyph reverts to Play, second's becomes Pause; long-press → `<TimerSheet>` opens, type a value > durationMin, Save → minutes clamped to durationMin (verify badge); long-press → Cancel → no change.
- **A11y (axe via Playwright)** — `tests/e2e/m4c.a11y.spec.ts`: zero violations on the building view with at least one time brick (running and stopped variants), zero violations on the open `<TimerSheet>`, `aria-pressed` correctness, `aria-label` parity with AC #28.

### Migration / obsolete IDs

- M4a / M4b / M4d test IDs continue to apply unchanged (tick + goal + chooser behaviour is stable). M4c IDs are net-additive.
- Existing tests that construct `AppState` literals MUST add `runningTimerBrickId: null` to compile under TypeScript strict. BUILDER fixes these in place during the TDD red phase (the typecheck will surface them immediately on first failed test). Surface the count in the eventual EVAL report; if any test was implicitly relying on `AppState` not having the field, treat as a planner-side oversight and amend in M5+ cleanup.
- The 4 deferred M4a tests.md cleanup items + the 1 deferred M4b cleanup item + the 12 vacuous-pass-guarded M4d e2e/a11y items (per `status.md` open loops) are explicitly OUT of scope for the M4c TESTS dispatch — they belong to a separate TESTS-mode re-dispatch for those milestones.

### Open questions for VERIFIER

None genuinely unresolvable from the inputs. The plan resolves all 8 spec gaps, references every relevant ADR (most importantly ADR-017's partial-fulfillment caveat above), and threads the design through every existing M3/M4a/M4b/M4d invariant. **Two items VERIFIER may want to flag and either accept or escalate** (in either case the answer should be a one-line confirmation — not a re-plan):

1. **ADR-017 partial-fulfillment.** The plan implements the timer behaviour but defers localStorage persistence to M8. Spec AC #34 explicitly does not require persistence. ADR-017's "Decision" subbullets list persistence as part of the timer's identity. Plan-side resolution: this is a planned partial-fulfillment, spec-grounded. If VERIFIER reads ADR-017 strictly, escalate as `ADR needed: Confirm M4c partial-fulfillment of ADR-017; persistence is M8's job.` and Main Claude lands a one-line ADR amendment. Otherwise PASS.
2. **`useEffect` dep on full `state` inside `lib/timer.ts`.** The plan accepts a wider-than-minimal dep array (the whole `state`) to keep the running-brick `minutesDone` change a re-trigger of the effect. A tighter dep (the running brick's `minutesDone` only) would require a derived selector and complicates the hook. Plan-side resolution: ship wide deps in M4c; optimise in M7 polish if profiling shows it. If VERIFIER prefers tight deps, the alternative is a thin `useMemo` selector — minor refactor, not a scope change. Either way is acceptable; flag for awareness.

### ADR needed

None identified pre-emptively. Every decision in this plan resolves under existing ADRs (ADR-031, ADR-039, ADR-017, ADR-018, ADR-027, ADR-022, ADR-025, ADR-026, ADR-041, ADR-032, ADR-034, ADR-035) or under one of the SG-m4c-0N locks above. **One conditional caveat:** if VERIFIER flags ADR-017 strict-fulfillment as a gap (per Open question #1), Main Claude lands a one-line ADR amendment confirming M4c's partial-fulfillment; this is a paperwork operation, not a re-plan.

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

## Milestone 4f — Collapse to two brick kinds; rip the timer — Plan

One-line summary (per ADR-043, supersedes ADR-035 + M4c timer infrastructure): collapse `Brick` to `kind: "tick" | "units"`, rename `count → done`, drop `runningTimerBrickId` and four timer actions plus `LOG_GOAL_BRICK` from the `Action` union, add `SET_UNITS_DONE`, delete `lib/timer.ts` / `<TimerSheet>` / `useTimer` / `<BrickStepper>` / dead-code `overlapsExistingBlock` (audio is RETAINED — block/day completion chimes stay), and add one new component `<UnitsEntrySheet>` that opens on a single tap of any units `<BrickChip>`. No persistence migration needed; M4e schema additions (`hasDuration`, `start`, `end`, `recurrence`) on `BrickBase` are preserved untouched.

### Pillars consumed

Spec § 0.5 (interaction primitives — collapse to tick + units), § 0.9 (data model — `Brick` union shrinks; AppState loses `runningTimerBrickId`; Action loses 5 variants, gains 1), § 0.14 (no factory anything — manual entry replaces auto-counting), **ADR-043** (primary frame; supersedes the score-type cardinality of ADR-035 and the timer infrastructure of M4c), ADR-042 (universal duration axis — kept; only the "tick / goal / time" prose is harmonized to "tick / units" via an in-place rewrite), ADR-035 (three score types — explicitly superseded by ADR-043), ADR-034 (already softened by ADR-042; brick clause now reads "two kinds, optionally timed via toggle"), ADR-006 (half-open intervals — referenced by surviving M4e overlap math), ADR-019 (`Recurrence` union — unchanged), ADR-031 (44 px tap target — applied to the new sheet's Save / Cancel / number input), ADR-024 (3-retry eval cap — unchanged), ADR-027 (commit prefix convention — `docs(plan-m4f)` for this entry; `test(m4f)` + `feat(m4f)` for BUILDER), ADR-041 (single human gate; VERIFIER replaces Gate #1), ADR-039 (no factory data — units bricks start at `done: 0`).

### Intent

After M4c shipped a live timer and M4e shipped the universal-duration axis, the user clarified the mental model on 2026-05-14: **two brick kinds only**. A tick brick is a boolean ("did you?"). A units brick has a `target`, a free-text `unit`, and a `done` number the user **types** ("how much, of what?"). The app does not count for the user. Anything previously expressed as a "time" brick — "30 minutes meditation, did 20" — is now a units brick with `unit: "minutes"`, `target: 30`, `done: 20`. Time-of-day windows remain orthogonal via M4e's `hasDuration` toggle. The pillar shift: **schedule and performance are independent axes; the user types the number, never the timer**. ADR-043 locks this; M4f is the implementation milestone.

### File structure

```
DELETE  lib/timer.ts
DELETE  lib/timer.test.ts
DELETE  components/TimerSheet.tsx
DELETE  components/TimerSheet.test.tsx
DELETE  components/BrickStepper.tsx                     (SG-m4f-02: delete; ±1 stepper UX retired)
DELETE  components/Brick.tsx                            (already [obsolete]; references soon-deleted shape — would break tsc)
DELETE  components/ui/BrickChip.tsx                     (legacy M0 BrickChip; uses pre-M3 Category strings + kind: "time"|"goal" — dead, would break tsc)
DELETE  components/ui/BrickChip.test.tsx                (same)
DELETE  components/BrickStepper.test.tsx                (if present — verify; deletion paired with BrickStepper.tsx)
KEEP    lib/audio.ts                                    (RETAINED — block/day completion chimes stay; user decision 2026-05-14)
KEEP    lib/audio.test.ts                               (RETAINED — paired with lib/audio.ts)
KEEP    public/sounds/chime.mp3                         (RETAINED — placeholder asset; real-asset swap remains an M7 open loop)
DELETE  lib/scoring.ts                                  (NOT — keep; re-export shim still valid; just confirms it compiles)  ← stays
EDIT    lib/types.ts                                    (Brick union collapse; AppState drop runningTimerBrickId; Action union shrink+add)
EDIT    lib/data.ts                                     (drop 5 arms, add SET_UNITS_DONE, defaultState loses runningTimerBrickId, ADD_BRICK invariant + defensive kind reject)
EDIT    lib/dharma.ts                                   (brickPct + brickLabel: drop time arm; rename goal arm to units; field reads count→done)
EDIT    lib/blockValidation.ts                          (delete overlapsExistingBlock + isWithin1Min helpers; keep isValidStart/isValidEnd/isEndAfterStart — verify the safe surface)
EDIT    lib/overlap.ts                                  (remove comment reference to "matches blockValidation.overlapsExistingBlock"; behavior unchanged)
EDIT    components/AddBrickSheet.tsx                    (kind selector 3 chips → 2; rip "time" branch; rename "goal" branch to "units"; keep M4e duration toggle)
EDIT    components/BrickChip.tsx                        (delete TimerChip; delete GoalStepperChip; units variant renders "<done> / <target> <unit>"; chip-tap fires onUnitsOpenSheet for units)
EDIT    components/TimelineBlock.tsx                    (drop runningTimerBrickId prop + threading; drop onTimerToggle/onTimerOpenSheet props; keep onUnitsOpenSheet pass-through)
EDIT    components/LooseBricksTray.tsx                  (drop runningTimerBrickId prop + threading; drop onTimerToggle/onTimerOpenSheet props; keep onUnitsOpenSheet pass-through)
EDIT    components/Timeline.tsx                         (drop runningTimerBrickId pass-through)
EDIT    components/TimedLooseBrickCard.tsx              (drop running/onTimerToggle/onTimerOpenSheet props if present; verify; thread onUnitsOpenSheet through)
EDIT    components/AddBlockSheet.tsx                    (drop runningTimerBrickId import/usage if any; remove unused imports surfaced by lint)
EDIT    app/(building)/BuildingClient.tsx               (drop useTimer wiring, drop timer-sheet state, drop START/STOP/SET_TIMER_MINUTES dispatches, drop LOG_GOAL_BRICK dispatch, drop TimerSheet mount; add UnitsEntrySheet mount with activeUnitsBrickId state)
CREATE  components/UnitsEntrySheet.tsx                  (new; sheet primitive composition; § Component design)
CREATE  components/UnitsEntrySheet.test.tsx             (BUILDER writes per TDD; declared here for inventory completeness)
MIGRATE lib/data.test.ts                                (heaviest; 13 goal literals + multiple time literals + 5 timer-action arm tests retire/migrate)
MIGRATE lib/dharma.test.ts                              (3 goal literals + time literals; pct math assertions re-pointed at done/target)
MIGRATE lib/overlap.test.ts                             (2 goal literals + time literals; mixed-kind fixtures rewrite to units)
MIGRATE lib/scoring.test.ts                             (1 goal literal; re-export shim test)
MIGRATE lib/blockValidation.test.ts                     (re-point U-m2-004/005 to lib/overlap.ts:intervalsOverlap per SG-m4f-03)
MIGRATE components/AddBrickSheet.test.tsx               (kind-selector chip count 3→2; rip "Time" chip tests; rename "Goal" tests to "Units"; durationMin input tests retire)
MIGRATE components/AddBlockSheet.test.tsx               (1 goal literal in fixture; mechanical)
MIGRATE components/BrickChip.test.tsx                   (4 goal literals + time literals; rip TimerChip-specific tests; rip stepper button tests; add chip-tap-opens-sheet tests at M4f IDs)
MIGRATE components/LooseBricksTray.test.tsx            (1 goal literal + time literal in fixtures; drop runningTimerBrickId prop expectations)
MIGRATE components/TimelineBlock.test.tsx              (1 goal literal + time literal in fixtures; drop runningTimerBrickId prop expectations)
MIGRATE components/TimedLooseBrickCard.test.tsx        (1 goal literal in fixtures)
MIGRATE app/(building)/BuildingClient.m4b.test.tsx     (LOG_GOAL_BRICK assertions — full retire; M4b regression scope absorbs into M4f units tests)
RETIRE  app/(building)/BuildingClient.m4c.test.tsx     (full file deletion; M4c timer behavior no longer exists)
EDIT    app/(building)/BuildingClient.imports.test.ts  (drop "does not import BrickStepper" assertion or invert to "BrickStepper file no longer exists"; planner choice — see § Test fixture migration)
EDIT    docs/decisions.md                              (in-place harmonize ADR-042 prose: "tick / goal / time" → "tick / units"; SG-m4f-08)
EDIT    docs/status.md                                 (M4f Shipped row + open-loop resolutions; SHIPPER writes per ADR-041)
```

### Pre-flight inventory (grep-confirmed)

`grep -rn "kind: \"time\"\|kind: 'time'\|kind: \"goal\"\|kind: 'goal'\|runningTimerBrickId\|START_TIMER\|STOP_TIMER\|TICK_TIMER\|SET_TIMER_MINUTES\|LOG_GOAL_BRICK\|useTimer\|TimerSheet\|durationMin\|minutesDone\|BrickStepper\|overlapsExistingBlock" lib components app hooks` returns **504 hits across 35 unique files**. Per-token breakdown:

| Token                                                             | Files | Action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kind: "time"` / `'time'`                                         | 15    | DELETE the literal entirely (production) or MIGRATE to `kind: "units"` with `unit: "minutes"` (fixtures). 34 literal occurrences.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `kind: "goal"` / `'goal'`                                         | 16    | RENAME to `kind: "units"`. 36 literal occurrences. `count` → `done`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `runningTimerBrickId`                                             | 18    | DELETE (production fields + test prop expectations).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `START_TIMER` / `STOP_TIMER` / `TICK_TIMER` / `SET_TIMER_MINUTES` | 7     | DELETE (reducer arms + dispatch sites + test assertions).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `LOG_GOAL_BRICK`                                                  | 5     | DELETE (reducer arm + 2 dispatch sites + tests).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `useTimer`                                                        | 4     | DELETE (the hook and its 2 call sites + 1 test).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `TimerSheet`                                                      | 5     | DELETE (component, test, import in `BuildingClient`, import in `BrickChip`, references in `BuildingClient.m4c.test`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `durationMin` / `minutesDone`                                     | 22    | DELETE (production reads in dharma/data/timer/components) or MIGRATE (fixtures convert to `target` / `done`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `BrickStepper`                                                    | 3     | DELETE the component + its sole consumer (`components/Brick.tsx`, already obsolete) + the imports-test assertion.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `overlapsExistingBlock`                                           | 3     | DELETE the function in `lib/blockValidation.ts`; re-point its 2 test IDs (U-m2-004, U-m2-005) to `lib/overlap.ts:intervalsOverlap` per SG-m4f-03.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `chime` (broader sweep)                                           | 8     | RETAIN all audio. `lib/audio.ts`, `lib/audio.test.ts`, `public/sounds/chime.mp3`, and every `playChime()` call site (M4a block-complete in `TimelineBlock.tsx`, M4a day-complete in `BuildingClient.tsx`, any call in `Fireworks.tsx` / `lib/celebrations.ts`) all STAY. The only audio that goes is the M4c timer's own `playChime()` invocation, which is removed for free by virtue of `lib/timer.ts` being deleted — there is no separate audio-cleanup work. See § Audio cleanup below. (Factual note: the spec's original `public/chime.mp3` path never existed — the real asset is `public/sounds/chime.mp3`.) |

Inventory annotation key by file (DELETE = remove the file outright; STRIP = file stays but token references are removed; MIGRATE = test-fixture rewrite; RETIRE = test file deleted because its subject is gone):

- `lib/types.ts` — STRIP. The single source of truth for the schema collapse.
- `lib/data.ts` — STRIP. Loses 5 reducer arms; gains `SET_UNITS_DONE`.
- `lib/timer.ts` — DELETE.
- `lib/timer.test.ts` — DELETE.
- `components/TimerSheet.tsx` — DELETE.
- `components/TimerSheet.test.tsx` — DELETE.
- `components/BrickStepper.tsx` — DELETE (per SG-m4f-02).
- `components/Brick.tsx` — DELETE (already `[obsolete]` per its own header; references `BrickStepper` and `kind: "time" | "goal"` shapes; would break tsc otherwise; not imported anywhere in the live render path — confirmed via grep).
- `components/ui/BrickChip.tsx` — DELETE (M0-era legacy; uses pre-M3 `Category` string literals and `kind: "time"|"goal"` discriminators; not imported anywhere; would break tsc).
- `components/ui/BrickChip.test.tsx` — DELETE (paired with the above).
- `lib/audio.ts` + `lib/audio.test.ts` + `public/sounds/chime.mp3` — RETAINED. NOT in the deletion set. The M4a block-complete and day-complete chimes keep playing (user decision 2026-05-14). M4f touches audio only insofar as the deleted `lib/timer.ts` no longer calls `playChime()`. See § Audio cleanup.
- `lib/blockValidation.ts` — STRIP. Deletes `overlapsExistingBlock`; keeps `isValidStart` / `isValidEnd` / `isEndAfterStart` / `isValidBrickGoal` / `isValidBrickTime` — though the last two (`isValidBrickGoal` / `isValidBrickTime`) need renaming: `isValidBrickGoal` → `isValidBrickUnitsTarget` (validates the target ≥ 1 integer rule); `isValidBrickTime` → DELETE (time bricks are gone; the function validated `durationMin ≥ 1`, which is now the same constraint as `isValidBrickUnitsTarget`). AddBrickSheet's `timeValid` derivation goes away with it.
- `lib/blockValidation.test.ts` — MIGRATE. U-m2-004 + U-m2-005 re-point to `lib/overlap.ts:intervalsOverlap` (same half-open math per ADR-006) — the assertion bodies stay nearly identical, only the imported symbol changes.
- `lib/overlap.ts` — STRIP. Single line: remove the comment "matches blockValidation.overlapsExistingBlock" (line 69). Behavior unchanged.
- `lib/overlap.test.ts` — MIGRATE. Fixture migrations only; behavior assertions hold.
- `lib/dharma.ts` — STRIP. `brickPct`: collapse to 2 arms (`tick` returns 0/100; `units` returns `Math.min(b.done / b.target, 1) * 100` with zero-target guard). `brickLabel` at line 131: collapse to 2 arms; drop the time arm; the units arm renders `${b.done}/${b.target}${b.unit ? " " + b.unit : ""}` (no special "min" suffix — unit is in the data).
- `lib/dharma.test.ts` — MIGRATE. 3 goal literals + multiple time literals; assertions on `brickPct` for time-kind become assertions on units-kind with `unit: "minutes"`.
- `lib/scoring.ts` — KEEP (7-line re-export shim is collapse-safe; just compiles).
- `lib/scoring.test.ts` — MIGRATE. 1 goal literal in fixture; mechanical.
- `components/AddBrickSheet.tsx` — STRIP. § Component edits — AddBrickSheet below.
- `components/AddBrickSheet.test.tsx` — MIGRATE. Kind-selector chip tests reduce 3→2; the "Time" branch and `durationMin` input tests retire; the "Goal" tests rename to "Units" and keep their assertions on target/unit inputs.
- `components/BrickChip.tsx` — STRIP. § Component edits — BrickChip below.
- `components/BrickChip.test.tsx` — MIGRATE. Drop `TimerChip` / `GoalStepperChip` test groups; add a tests group for "units chip tap fires onUnitsOpenSheet".
- `components/Brick.test.tsx` — DELETE (file's subject is being deleted).
- `components/TimedLooseBrickCard.tsx` + `.test.tsx` — STRIP / MIGRATE. Drop the `running` / `onTimerToggle` / `onTimerOpenSheet` props the M4e component currently forwards. Add `onUnitsOpenSheet` pass-through.
- `components/LooseBricksTray.tsx` + `.test.tsx` — STRIP / MIGRATE. Same prop trims as above.
- `components/TimelineBlock.tsx` + `.test.tsx` — STRIP / MIGRATE. Same prop trims as above.
- `components/Timeline.tsx` — STRIP. Drop the `runningTimerBrickId` pass-through line (currently threaded but not actually used in the render itself — verify with grep).
- `components/AddBlockSheet.tsx` + `.test.tsx` — STRIP / MIGRATE. Goal/time literals in fixtures only; the AddBlockSheet itself is kind-agnostic post-M4e (overlap engine reads `hasDuration`, not `kind`).
- `app/(building)/BuildingClient.tsx` — STRIP. § Component edits — BuildingClient below.
- `app/(building)/BuildingClient.m4b.test.tsx` — MIGRATE. M4b LOG_GOAL_BRICK assertions become SET_UNITS_DONE assertions; the M4b stepper-DOM assertions retire (chip is no longer a stepper).
- `app/(building)/BuildingClient.m4c.test.tsx` — DELETE (file's entire subject — M4c timer integration — is gone).
- `app/(building)/BuildingClient.m4e.test.tsx` — MIGRATE. Tests that exercised `hasDuration: true` against `kind: "time"` re-point to `kind: "units"` with `unit: "minutes"`; M4e IDs remain green per AC #37.
- `app/(building)/BuildingClient.imports.test.ts` — EDIT. The "does not import BrickStepper" assertion (line 33) still holds (file is being deleted — neither importable nor needed); rather than invert it, keep the assertion as a regression check that the dead-file deletion holds. The "does not import Brick component" assertion (line 29) likewise stays valid.

Total surface: **18 production files edited, 5 files outright deleted, 13 test files migrated, 2 test files deleted outright, 1 new component file, 1 new test file** (the latter written by BUILDER in TDD). Audio files (`lib/audio.ts`, `lib/audio.test.ts`, `public/sounds/chime.mp3`) are NOT in the deletion set — they are retained (user decision 2026-05-14). Plus `docs/decisions.md` (ADR-042 prose harmonization) and `docs/status.md` (SHIPPER updates).

### Locked schema (post-M4f, reproduced verbatim from spec lines 1622–1651)

```ts
type BrickBase = {
  id: string;
  parentBlockId: string | null;
  name: string;
  categoryId: string | null;
  hasDuration: boolean; // M4e — unchanged
  start?: string; // M4e — unchanged
  end?: string; // M4e — unchanged
  recurrence?: Recurrence; // M4e — unchanged
};

export type Brick =
  | (BrickBase & { kind: "tick"; done: boolean })
  | (BrickBase & { kind: "units"; target: number; unit: string; done: number });

export type AppState = {
  blocks: Block[];
  categories: Category[];
  looseBricks: Brick[];
  // runningTimerBrickId: REMOVED
};

export type Action =
  | { type: "ADD_BLOCK"; block: Block }
  | { type: "ADD_CATEGORY"; category: Category }
  | { type: "ADD_BRICK"; brick: Brick }
  | { type: "LOG_TICK_BRICK"; brickId: string }
  | { type: "SET_UNITS_DONE"; brickId: string; done: number };
// START_TIMER, STOP_TIMER, TICK_TIMER, SET_TIMER_MINUTES, LOG_GOAL_BRICK: REMOVED
```

`Recurrence`, `Category`, `Block` are unchanged. `BrickBase.hasDuration` and the presence invariant for `start`/`end`/`recurrence` (M4e) are unchanged. `assertNever` from `lib/types.ts:72` continues to enforce reducer exhaustiveness — the collapse leaves the union with 5 action variants and 2 brick kinds.

### Component design — `<UnitsEntrySheet>` (NEW)

**Path.** `components/UnitsEntrySheet.tsx` (+ `.test.tsx` written by BUILDER per AC #41 net-add accounting).

**Composition.** Composes M0's `<Sheet>` (modal layout + animation + focus trap), M0's `<Input type="number">` (single field), and M0's `<Button>` (Save + Cancel). No new primitives.

**Props.**

```ts
interface Props {
  brick: Extract<Brick, { kind: "units" }> | null; // null = closed
  open: boolean;
  onClose: () => void;
  onSave: (brickId: string, done: number) => void; // parent dispatches SET_UNITS_DONE
}
```

`brick` is passed as the full object (not just id) so the sheet can render the name and `unit` for its heading/subhead without re-reading state. `open` is derived in the parent from `activeUnitsBrickId !== null`; the sheet calls `onClose` for both Cancel and successful Save (parent resets the id, sheet unmounts).

**Local state.** Single piece of local state: `const [draft, setDraft] = useState<string>("")`. Pre-fill on open via `useEffect(() => { if (open && brick) setDraft(String(brick.done)); }, [open, brick?.id])` — keyed on `brick?.id` so reopening for a different units brick re-seeds the input. The `string` type matters: lets the user clear the field without coercion to `0`, and matches HTML `<input>` native semantics.

**Validation rules.**

1. **Empty** → Save disabled.
2. **Not a non-negative integer** (regex `^\d+$` or `Number.isFinite(parseInt) && parseInt >= 0 && Number.isInteger(parseFloat)`) → Save disabled. Plan-locked: prefer the regex `^\d+$` test against `draft.trim()` because it's both faster and unambiguous about decimals/negatives/whitespace.
3. **Otherwise** → Save enabled. On click, parse via `parseInt(draft, 10)` and call `onSave(brick.id, parsed)`. Reducer defensively re-applies `Math.max(0, Math.floor(...))` per AC #7.

The HTML attributes `inputMode="numeric"`, `min="0"`, `step="1"`, `pattern="\d*"` carry the validation hint to the browser (numeric keypad on mobile per AC #33; rejects decimal-point key on browsers that honor `step="1"`). The JS validation is the truth — HTML attrs are UX hints.

**Accessibility wiring.**

- Sheet root: `role="dialog"`, `aria-labelledby="units-entry-heading"`, `aria-modal="true"` (inherited from M0 `<Sheet>`).
- Heading: `<h2 id="units-entry-heading">{brick.name}</h2>` — satisfies A-m4f-01.
- Subhead: `<p>Today's {brick.unit}</p>` (e.g., "Today's minutes", "Today's reps") — satisfies AC #27.
- Number input: `aria-label={`Enter ${brick.unit} done today`}` — satisfies A-m4f-02.
- Save button: `aria-disabled={!isValid}` + `aria-describedby="units-save-hint"` + an `<span id="units-save-hint" className="sr-only">Enter a number to save.</span>` rendered only when invalid — mirrors M4e AddBrickSheet's overlap-warning pattern; satisfies A-m4f-03 + AC #30.
- Cancel button: standard text label "Cancel", no `aria-describedby`.
- Tap targets all min 44 × 44 px per ADR-031 (Save + Cancel buttons; number input).

**Tailwind / token wiring.** Number input class stack mirrors `<AddBrickSheet>`'s target input — `font-mono text-[--fs-14] text-[--ink] bg-[--surface-1] border border-[--ink-dim]/30 rounded-md px-3 py-2 min-h-[44px]`. Heading uses `font-serif text-[--fs-20] text-[--ink]`; subhead uses `font-ui text-[--fs-12] text-[--ink-dim]`. Save uses `<Button variant="primary">`; Cancel uses `<Button variant="ghost">`.

**Motion.** Inherits M0's `<Sheet>` slide-up motion (200 ms, ease-out). Under `prefers-reduced-motion`, M0 `<Sheet>` already swaps to a no-motion mount (verified in M0 plan § Motion).

**Haptics.**

- Save tap with a valid value → `haptics.light()` immediately before `onSave` call (matches M4e AddBrickSheet Save haptic).
- Save tap while `aria-disabled` → `haptics.medium()` + render the hint via `aria-describedby` (matches M4e disabled-Save pattern; AC #30).
- Cancel tap → no haptic (matches M0 dismiss convention).
- Input change → no haptic (typing into a field is silent across the codebase).

**Auto-focus.** On open, the number input receives focus + selects its current value (the pre-filled `done`) so the user can overwrite by typing. Implementation: `useEffect(() => { if (open) inputRef.current?.focus(); inputRef.current?.select(); }, [open])`. This explicitly closes the `<TimerSheet>` open loop noted in `docs/status.md` ("does NOT auto-focus the minutes input on open") — the replacement DOES auto-focus.

**Closing behavior.** Cancel → call `onClose` only (no save). Save (valid) → call `onSave` then `onClose`. Save (invalid) → no-op except the haptic + sr-only hint. The single-sheet contract from M4d (only one sheet at a time): the parent (BuildingClient) tracks `activeUnitsBrickId: string | null`; tapping a different units chip while open swaps the brick via the id change (the `useEffect` keyed on `brick?.id` re-seeds the draft).

### Component edits — `<BrickChip>` (collapse)

**Delete.**

- The entire `TimerChip` sub-component (lines 149–264 of current file) — gone.
- The entire `GoalStepperChip` sub-component (lines 266–472 of current file) — gone.
- The `if (brick.kind === "time")` branch in the main `BrickChip` function — gone.
- The `if (brick.kind === "goal")` branch — gone (its tap-handler is replaced by the units variant below).
- All goal/time-specific props: `onGoalLog`, `running`, `onTimerToggle`, `onTimerOpenSheet` — gone.

**Add / edit.**

- New prop `onUnitsOpenSheet?: (brickId: string) => void`.
- New sub-component `UnitsChip` (or inline branch) that renders the chip-tap-opens-sheet surface. It is a single `<button>` (not a button group like the M4b stepper) covering the entire chip surface; `min-height: 44px`; `onClick` fires `haptics.light()` then `onUnitsOpenSheet?.(brick.id)`.
- The chip's primary line renders `<TypeBadge>` (units form): `{brick.done} / {brick.target} {brick.unit}` (e.g., `"20 / 30 minutes"`, `"50 / 100 reps"`). The trailing `m` suffix that the time variant used disappears — the unit is now in the data and renders directly.
- `TimeWindowBadge` (M4e) renders identically when `brick.hasDuration === true` — for both tick and units variants. No changes there.
- `buildAriaLabel`:
  - tick arm: unchanged from M4a.
  - units arm: `${brick.name}, units, ${pct}% complete, ${brick.done} of ${brick.target} ${brick.unit}, tap to log progress`. The "tap to log progress" suffix replaces M4b's silence (the chip is now actionable, not a label).
  - M4e duration suffix `", scheduled HH:MM to HH:MM"` appends to either arm when `hasDuration === true` (preserved from M4e).
- `aria-pressed` is **removed** from the units chip (it isn't a toggle anymore; it's a sheet trigger). Retained on tick chips (still a toggle). This is a regression-safe change because M4b's goal chips did not have `aria-pressed`.
- All scale-press, long-press, and clamp-haptic logic from M4b/M4c retire with the deleted sub-components.

**Tick variant unchanged.** Lines 540–613 of current file (the tick branch of the main `BrickChip` function) are byte-identical post-M4f. AC #25 (tap a tick chip → flip `done` via M4a) is a regression test.

### Component edits — `<AddBrickSheet>` (collapse kind selector)

**Kind selector (3 → 2 chips).**

- Current (M4c): array literal `const KIND_CHIPS = ["tick", "goal", "time"] as const` at line ~360 of `AddBrickSheet.tsx`.
- Post-M4f: `const KIND_CHIPS = ["tick", "units"] as const`. Labels: "Tick", "Units". A11y: `role="radiogroup"` + `aria-checked` semantics preserved.
- The `BrickKind` type alias either becomes a literal union of the two strings or just `(typeof KIND_CHIPS)[number]` — planner pref: keep the inline type alias for readability.

**Reveal-on-units (renamed from reveal-on-goal).**

- The conditional `{kind === "goal" && ( … target + unit inputs … )}` at line ~392 renames to `{kind === "units" && ( … )}`. The target input keeps `<Input type="number" min="1" step="1" required>`. The unit input keeps `<Input type="text" required placeholder="minutes / reps / pages">`. The validation helper `isValidBrickGoal` renames to `isValidBrickUnitsTarget` (or `isValidUnitsTarget`) and asserts `target >= 1 && Number.isInteger(target)`. Same logic; symmetric name.

**Delete the time branch.**

- The conditional `{kind === "time" && ( … durationMin input … )}` at line ~475 — gone, entirely.
- The `durationMin` parse on line 217 — gone.
- The `timeValid` derivation on line 219 — gone.
- The `isValidBrickTime` import (and the function in `lib/blockValidation.ts`) — gone.

**Save construction.**

- The `else if (kind === "goal") { … kind: "goal", count: 0 … }` branch at line 252 becomes `else if (kind === "units") { … kind: "units", target, unit, done: 0 … }`. M4e duration fields continue to spread in conditionally.
- The `else { kind: "time", durationMin, minutesDone: 0 … }` branch at line 268 — gone.

**Overlap chip + Save-disable.** Unchanged from M4e (AC #22). The duration toggle row is below the kind selector and is untouched. AC #21 holds.

### Component edits — `<BuildingClient>`

**Delete.**

- Lines 23 + 34: `import { useTimer, findTimeBrickById } from "@/lib/timer";` and `import { TimerSheet } from "@/components/TimerSheet";` — gone.
- Lines 67–69 + 100: the `TimerSheetState` interface + `timerSheetState` useState — gone.
- Line 129: `useTimer(state, dispatch);` — gone.
- Lines 131–141 (`handleTimerToggle`): gone.
- Lines 144–148 (`handleTimerOpenSheet`): gone.
- Lines 149–168 (`handleTimerSheetSave` / `handleTimerSheetCancel`): gone.
- Lines 178–183 (`handleGoalLog` dispatching `LOG_GOAL_BRICK`): gone (replaced by units-sheet open below).
- Lines 308–325: timer-related JSX props (`onTimerToggle`, `onTimerOpenSheet`, `runningTimerBrickId={state.runningTimerBrickId}`) threaded to `<Timeline>` and `<LooseBricksTray>` — gone.
- Lines 357–366: the `<TimerSheet open={…}>` mount — gone.

**Add.**

- New state: `const [activeUnitsBrickId, setActiveUnitsBrickId] = useState<string | null>(null);`.
- New derivation: `const activeUnitsBrick = useMemo(() => activeUnitsBrickId === null ? null : findUnitsBrickById(state, activeUnitsBrickId), [state, activeUnitsBrickId]);` where `findUnitsBrickById` is a new helper in `lib/data.ts` (mirrors M4c's `findTimeBrickById` — verified-by-typecheck single-Extract pattern).
- New handler: `const handleUnitsOpenSheet = useCallback((brickId: string) => setActiveUnitsBrickId(brickId), []);`.
- New handler: `const handleUnitsSheetSave = useCallback((brickId: string, done: number) => { dispatch({ type: "SET_UNITS_DONE", brickId, done }); setActiveUnitsBrickId(null); }, [dispatch]);`.
- New handler: `const handleUnitsSheetClose = useCallback(() => setActiveUnitsBrickId(null), []);`.
- Thread `onUnitsOpenSheet={handleUnitsOpenSheet}` through `<Timeline>` (then `<TimelineBlock>` → `<BrickChip>`) and `<LooseBricksTray>` (then `<BrickChip>` / `<TimedLooseBrickCard>` → `<BrickChip>`).
- Mount the new sheet at the bottom (replaces the deleted `<TimerSheet>` mount):
  ```tsx
  <UnitsEntrySheet
    brick={activeUnitsBrick}
    open={activeUnitsBrickId !== null}
    onClose={handleUnitsSheetClose}
    onSave={handleUnitsSheetSave}
  />
  ```

**Day-100% cross-up.** The `useCrossUpEffect` for day-100% (line 118 fires haptic + chime + fireworks) is **unchanged** — it KEEPS its `playChime()` call (user decision 2026-05-14: block/day completion chimes stay). Haptic + chime + fireworks all remain. The cross-up math is unchanged.

### Reducer edits — `lib/data.ts`

**Delete arms.** `LOG_GOAL_BRICK` (lines 100–134), `START_TIMER` (135–141), `STOP_TIMER` (142–146), `TICK_TIMER` (147–179), `SET_TIMER_MINUTES` (180–213). Total 114 lines removed.

**Add arm.** `SET_UNITS_DONE`:

```ts
case "SET_UNITS_DONE": {
  const clamped = Math.max(0, Math.floor(action.done));
  const apply = (b: Brick): Brick => {
    if (b.id !== action.brickId) return b;
    if (b.kind !== "units") return b;   // AC #9: no-op on tick brick
    if (b.done === clamped) return b;    // identity short-circuit
    return { ...b, done: clamped };
  };
  // Same array-identity preservation pattern as the old LOG_GOAL_BRICK arm.
  let blocksChanged = false;
  const newBlocks = state.blocks.map((bl) => {
    let blockChanged = false;
    const bricks = bl.bricks.map((br) => {
      const out = apply(br);
      if (out !== br) blockChanged = true;
      return out;
    });
    if (!blockChanged) return bl;
    blocksChanged = true;
    return { ...bl, bricks };
  });
  let looseChanged = false;
  const newLoose = state.looseBricks.map((br) => {
    const out = apply(br);
    if (out !== br) looseChanged = true;
    return out;
  });
  if (!blocksChanged && !looseChanged) return state;   // AC #8: missing id ⇒ unchanged
  return {
    ...state,
    blocks: blocksChanged ? newBlocks : state.blocks,
    looseBricks: looseChanged ? newLoose : state.looseBricks,
  };
}
```

This is structurally identical to the deleted `LOG_GOAL_BRICK` arm — same loose-then-nested search, same identity short-circuit, same array-identity preservation. The behavioral difference is absolute-value semantics (`done = clamped`) instead of delta (`count + delta`).

**Defensive `ADD_BRICK` invariant.** Currently (line 54) the arm switches on `action.brick`'s shape only. Post-M4f: TypeScript prevents constructing `kind: "time"` or `kind: "goal"` at compile time, but per AC #10 we add a runtime guard so that test fixtures or migration leftovers do not silently land in state:

```ts
const k = b.kind as string;
if (k !== "tick" && k !== "units") return state;
```

Casts to `string` to suppress the exhaustive-check warning (the runtime check is defense-in-depth against bad fixtures, not against legitimate TS code paths). M4e duration invariant rules (lines 56–69) stay verbatim.

**`defaultState`.** Drop the `runningTimerBrickId: null` field (line 39). Remaining: `blocks: [], categories: [], looseBricks: []`.

**`assertNever` exhaustiveness.** After the 5 deletions and 1 addition, the switch covers exactly: `ADD_BLOCK`, `ADD_CATEGORY`, `ADD_BRICK`, `LOG_TICK_BRICK`, `SET_UNITS_DONE`. `assertNever(action)` in the default branch confirms exhaustiveness against `Action` union.

**New helper.** `findUnitsBrickById(state: AppState, id: string): Extract<Brick, { kind: "units" }> | null` — mirrors the deleted `findTimeBrickById` from `lib/timer.ts:25`. Same shape, different kind discriminator. Lives in `lib/data.ts` (the closest module to `AppState`) and is exported. Used by `<BuildingClient>` to resolve the active brick for the sheet.

### Scoring migration — `lib/dharma.ts` (and `lib/scoring.ts` re-export shim)

**`brickPct` (line 32).** Current 3-arm switch becomes 2-arm:

```ts
export function brickPct(b: Brick): number {
  if (b.kind === "tick") return b.done ? 100 : 0;
  // units (kind === "units" by exhaustiveness)
  if (b.target <= 0) return 0;
  return Math.min(b.done / b.target, 1) * 100;
}
```

The completion-ratio math is byte-identical to the deleted goal branch with `count → done`, and byte-identical to the deleted time branch with `(minutesDone, durationMin) → (done, target)`. The zero-target guard handles AC #38's "existing M4b assertions hold" — `target <= 0` returns 0 the same way the deleted `durationMin <= 0` guard did.

**`brickLabel` (line 131).** Current 3-arm becomes 2-arm:

```ts
if (b.kind === "tick") return b.done ? "done" : "todo";
return `${b.done}/${b.target}${b.unit ? " " + b.unit : ""}`;
```

The time-arm's "min" suffix at line 131 is gone — the unit string is now in the data ("20/30 minutes" instead of "20/30 min"). M4b's assertions on the goal arm continue to hold post-rename. The single tick-arm assertion at the head is unchanged behaviorally (text may differ — TESTS dispatch handles).

**`blockPct`, `dayPct`, `categoryDayPct`.** No changes — they call `brickPct(b)` indirectly and don't read brick fields.

**Re-export shim.** `lib/scoring.ts` re-exports `brickPct, blockPct, dayPct, buildingPct` — no edits needed; the 4 functions retain the same signatures, so import sites in tests continue to resolve.

### Test fixture migration plan

Migration is mechanical. Plan-locked: **no `migrateToUnits()` helper**. Reasons: (1) the test files where the rewrite happens are the contract surface — silencing the change through a helper hides the schema collapse from readers; (2) the rename of `count → done` and `kind: "goal" → kind: "units"` is a 2-token sed; (3) the time-to-units conversion is a 4-token sed (`kind: "time"` → `kind: "units"`, `durationMin: N` → `target: N`, `minutesDone: N` → `done: N`, add `unit: "minutes"`). Per SG-m4f rec, keep it inline.

**Per-file migration scope (with literal counts from grep):**

| File                                         | `goal` literals | `time` literals       | Plan                                                                                                                                                                                                                                                                |
| -------------------------------------------- | --------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/data.test.ts`                           | 13              | (heavy)               | Goal arms rewrite to units; time arms retire entirely (the corresponding reducer arms are deleted). M4b `LOG_GOAL_BRICK` test groups rewrite as `SET_UNITS_DONE` groups (with absolute-value, not delta, assertions). M4c timer-action test groups delete outright. |
| `lib/dharma.test.ts`                         | 3               | (some)                | Mechanical rename. Time-kind brickPct cases re-point to `kind: "units"` with `unit: "minutes"`.                                                                                                                                                                     |
| `lib/overlap.test.ts`                        | 2               | (some)                | Mechanical rename. Overlap math is kind-agnostic — fixtures just need shape correctness.                                                                                                                                                                            |
| `lib/scoring.test.ts`                        | 1               | 0                     | Single literal rename.                                                                                                                                                                                                                                              |
| `lib/blockValidation.test.ts`                | 0               | 0                     | U-m2-004 + U-m2-005 re-point to `lib/overlap.ts:intervalsOverlap` per SG-m4f-03. Two-line import + symbol swap; assertion bodies unchanged.                                                                                                                         |
| `components/AddBrickSheet.test.tsx`          | 0               | (kind-selector tests) | Kind-selector test group reduces 3→2; the "Time" chip group + `durationMin` input group RETIRE; the "Goal" group renames to "Units" and its assertions on target/unit inputs stay.                                                                                  |
| `components/AddBlockSheet.test.tsx`          | 1               | 0                     | Single fixture literal.                                                                                                                                                                                                                                             |
| `components/BrickChip.test.tsx`              | 4               | (time tests)          | Goal-stepper group RETIRES (stepper deleted). Time-chip group RETIRES (timer deleted). New tests for units chip tap → fires `onUnitsOpenSheet`. Tick group unchanged.                                                                                               |
| `components/Brick.test.tsx`                  | 2               | (some)                | File DELETE (subject deleted). All IDs retire.                                                                                                                                                                                                                      |
| `components/TimedLooseBrickCard.test.tsx`    | 1               | 0                     | Fixture rename + drop `running` / `onTimerToggle` prop expectations.                                                                                                                                                                                                |
| `components/LooseBricksTray.test.tsx`        | 1               | (some)                | Fixture rename + drop timer prop expectations.                                                                                                                                                                                                                      |
| `components/TimelineBlock.test.tsx`          | 1               | (some)                | Fixture rename + drop timer prop expectations.                                                                                                                                                                                                                      |
| `app/(building)/BuildingClient.m4b.test.tsx` | 1               | 0                     | LOG_GOAL_BRICK assertions rewrite to SET_UNITS_DONE; the M4b stepper-DOM tests retire (chip is no longer a stepper); the tray-rendering tests stay.                                                                                                                 |
| `app/(building)/BuildingClient.m4c.test.tsx` | 0               | (entire)              | File DELETE. M4c IDs retired in tests.md with a one-line ADR-043 pointer per AC #36.                                                                                                                                                                                |
| `app/(building)/BuildingClient.m4e.test.tsx` | 0               | (some)                | Tests asserting M4e duration toggle against `kind: "time"` re-point to `kind: "units"` with `unit: "minutes"`. M4e IDs remain green per AC #37.                                                                                                                     |

**Retired test IDs (M4c).** The TESTS dispatch will record the M4c IDs being retired with a one-line "RETIRED by M4f per ADR-043" note next to each. The same note pattern applies to M4b stepper-on-chip IDs that retire because the stepper is gone.

**New test IDs (M4f, BUILDER target).** TESTS dispatch derives these. Broad shape: ~6 U-m4f IDs (reducer arm: 4 happy/edge + 2 defensive); ~6 C-m4f IDs (UnitsEntrySheet: validation + a11y + haptics); ~3 C-m4f IDs (BrickChip units variant + AddBrickSheet kind selector); ~4 E-m4f IDs (per AC #42); ~4 A-m4f IDs (per AC #43). Net headcount: TESTS dispatch will reconcile retired vs added; AC #41 says "drops by ~10–25" and "grows back".

### File deletions — exact paths

```
lib/timer.ts
lib/timer.test.ts
components/TimerSheet.tsx
components/TimerSheet.test.tsx
components/BrickStepper.tsx
components/BrickStepper.test.tsx                (delete iff present — verify; SG-m4f-02)
components/Brick.tsx                            (dead; would break tsc; not in render graph)
components/Brick.test.tsx                       (paired)
components/ui/BrickChip.tsx                     (dead; pre-M3 legacy; would break tsc)
components/ui/BrickChip.test.tsx                (paired)
app/(building)/BuildingClient.m4c.test.tsx     (subject deleted)
```

`lib/audio.ts`, `lib/audio.test.ts`, and `public/sounds/chime.mp3` are **NOT in this deletion set** — they are retained (user decision 2026-05-14; the M4a block/day completion chimes stay). The deletions commit (Phase E) touches no audio files. The M4c timer's own `playChime()` invocation is removed for free by `lib/timer.ts` being deleted — no separate audio-cleanup commit exists.

`lib/blockValidation.ts:overlapsExistingBlock` is a **function deletion**, not a file deletion — the file stays for `isValidStart`/`isValidEnd`/`isEndAfterStart`/`isValidBrickUnitsTarget`. `isValidBrickTime` deletes (gone with the time kind).

### Audio cleanup (scope clarification)

**Audio is RETAINED in M4f.** User decision 2026-05-14 (spec corrected in commit `55c00b6`): keep the M4a block-complete and day-complete chimes. `lib/audio.ts`, `lib/audio.test.ts`, and `public/sounds/chime.mp3` all STAY. M4f does **no separate audio-cleanup work**.

Factual note worth keeping: the spec's earlier draft said "delete `public/chime.mp3`" — but a file at that exact path never existed (`ls /home/user/integrity/public/` returns `icon.svg` and `sounds/`). The real placeholder asset lives at **`public/sounds/chime.mp3`** (431 bytes, per `docs/status.md:52`). The corrected AC #14 reflects this and locks the asset as retained.

`public/sounds/chime.mp3` is consumed by **`lib/audio.ts:playChime()`**, invoked from these sites — all RETAINED:

1. `app/(building)/BuildingClient.tsx:118` — M4a day-100% cross-up effect. **KEEP its `playChime()` call.**
2. `components/TimelineBlock.tsx:64` — M4a block-100% cross-up effect. **KEEP its `playChime()` call.**
3. Any `playChime()` reference in `lib/celebrations.ts` / `Fireworks.tsx` (block/day celebration registry). **KEEP.**

The ONLY audio that goes in M4f is the M4c timer's own `playChime()` invocation, _if one exists_ — and it is removed **for free** by virtue of `lib/timer.ts` being deleted. There is no `playChime()` strip work in `BuildingClient.tsx`, `TimelineBlock.tsx`, or `lib/celebrations.ts`. The deletions commit (Phase E) touches no audio files.

The `chime.mp3`-is-a-431-byte-placeholder open loop in `docs/status.md:52` (replace with a real royalty-free asset) **stays open** — replacing it remains an M7 concern. M4f does NOT resolve it.

### Migration ordering (BUILDER guidance)

Strict TDD (red → green → refactor per test) is the default per The Loop, but the schema collapse has irreducible cross-test coupling: any single failing test that constructs `kind: "goal"` will fail to compile once `types.ts` collapses. Pre-collapse, the test passes against `kind: "goal"`; post-collapse, the test must construct `kind: "units"`. There is no half-collapsed state where one test passes alone.

**Recommended phasing (BUILDER follows; deviation from strict per-test red/green is justified):**

1. **Phase A — types-first collapse (one tightening commit).** Write the failing M4f-001..006 tests for the new schema shape FIRST (red phase). Commit `test(m4f): schema collapse contract`. Then in a single follow-up commit, rewrite `lib/types.ts` to the locked schema AND bulk-migrate every fixture literal in the test suite (`kind: "goal"` → `kind: "units"`; `count` → `done`; `kind: "time"` → `kind: "units"` with `unit: "minutes"`/`target`/`done`). Commit `feat(m4f): collapse Brick union; migrate fixtures`. The migration must include scoring (`lib/dharma.ts`) and components in the same commit because each surface reads the same fields; splitting them leaves tsc red across the suite.

2. **Phase B — reducer rewrite + dispatch sites (red→green per arm).** Add `SET_UNITS_DONE` arm + the `findUnitsBrickById` helper with red→green. Delete the 5 obsolete arms + their dispatch sites with red phase: tests assert the arms no longer exist (e.g., `expect((reducer as any)(state, { type: "LOG_GOAL_BRICK", brickId: "x", delta: 1 })).toBe(state)` — type-cast escape hatch; the action type is gone from the union).

3. **Phase C — component edits per-test.** `<BrickChip>` units variant tap → sheet (M4f IDs), `<AddBrickSheet>` kind-selector reduction (M4f IDs), `<BuildingClient>` wiring (M4f IDs). Each per strict TDD.

4. **Phase D — `<UnitsEntrySheet>` test-by-test build.** Compose M0 primitives; each AC #27..33 + A-m4f-01..04 in its own red→green cycle.

5. **Phase E — file deletions.** Once nothing references the deleted files, delete them in a single commit (`feat(m4f): rip M4c timer infrastructure`). No audio files are deleted — `lib/audio.ts`, `lib/audio.test.ts`, and `public/sounds/chime.mp3` are retained. Run `npx tsc --noEmit` after this commit; expected: zero errors.

6. **Phase F — `docs/decisions.md` ADR-042 prose harmonization.** Search/replace "tick / goal / time" → "tick / units" in the ADR-042 body. Single `docs(harness)` commit (per § ADR-042 prose harmonization below).

7. **Phase G — `lib/blockValidation.ts:overlapsExistingBlock` deletion + U-m2-004/005 re-point.** Per SG-m4f-03; one paired red→green.

Justification for deviating from strict per-test in Phase A: the cost of a half-collapsed schema (every other test failing for a transient reason unrelated to the test under test) outweighs the TDD purity benefit. BUILDER pre-writes the schema-contract tests in red phase first, then bulk-migrates in a single green-restoring commit. This pattern is precedented by M3's locked-schema-introduction commit. The TESTS dispatch will record schema-contract IDs that explicitly authorize this phasing.

### ADR-042 prose harmonization (companion edit, SG-m4f-08)

`docs/decisions.md` ADR-042 (lines ~800–841) references "tick / goal / time" across its Context and Decision sections. Per ADR-043's resolution and SG-m4f-08, harmonize in place: search/replace "tick / goal / time" → "tick / units" and any single-instance variants (e.g., "tick, goal, and time bricks all expose the same toggle" → "tick and units bricks all expose the same toggle"; "time bricks specifically, `durationMin`" → strip that paragraph entirely since `durationMin` no longer exists). The ADR-042 decision itself (universal duration axis) is unchanged.

**Commit prefix for the harmonization edit:** `docs(harness)`, NOT `docs(plan-m4f)` — this is out-of-Loop per ADR-027 (the harmonization is to the ADR repository, not to plan/test artifacts for this feature). The BUILDER attaches it to whichever Phase commit aligns naturally.

### Status.md open-loop resolutions (SHIPPER updates)

The following open loops in `docs/status.md` close out at M4f ship:

| Open loop (status.md line)                                               | Resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/sounds/chime.mp3` placeholder (line 52)                          | NOT resolved — placeholder retained; `lib/audio.ts` and the M4a block/day `playChime()` call sites all stay (user decision 2026-05-14). Real-asset replacement remains an M7 open loop; this row stays open in `docs/status.md`.                                                                                                                                                                                                                                                                                                                                                                                  |
| `useTimer` exhaustive-deps lint warning (line 61)                        | RESOLVED — `lib/timer.ts` deleted; warning evaporates.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `useTimer` wide dep-array trade-off (line 59)                            | RESOLVED — same.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `<TimerSheet>` does NOT auto-focus minutes input (line 60)               | RESOLVED — `<TimerSheet>` deleted; the replacement `<UnitsEntrySheet>` DOES auto-focus the number input on open.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `lib/blockValidation.ts:overlapsExistingBlock` dead code (line 57)       | RESOLVED — function deleted; U-m2-004/005 re-pointed to `lib/overlap.ts:intervalsOverlap`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 8 unused-`card` lint warnings in `BuildingClient.m4c.test.tsx` (line 63) | RESOLVED — file deleted.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ADR-042 text harmonization (line 58)                                     | RESOLVED — SG-m4f-08 in-place edit.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **16 pre-existing lint warnings** (Eval gate row, status.md line 70)     | **Partially resolved** — the M4c-derived warnings (8 unused-`card`, 1 useTimer-exhaustive-deps, plus 2 unused-import warnings that should surface from the M4c file deletes) zero out. The 3 `lib/longPress.ts` underscore-param warnings (line 62) PERSIST — `useLongPress` is still used by other components (verify; `longPress.ts` may itself become unused once `BrickChip` drops its goal/time handlers — if so, ALSO RESOLVED). The 2 `aria-expanded` warnings (status.md line 48) are spec-mandated by M2 ACs and continue to carry. Net expected post-M4f: roughly **3–5 lint warnings** (down from 16). |
| Vacuous-pass debt (~35 post-M4e, line 53)                                | UNCHANGED — M4f's deferred-to-preview e2e/a11y items are net-additive with the same vacuous-pass-guard pattern; the M4c-derived vacuous items retire with the file deletes. SHIPPER reports the net delta.                                                                                                                                                                                                                                                                                                                                                                                                        |

`docs/status.md` updates are SHIPPER's job per ADR-041; this plan just enumerates the resolutions BUILDER should expect to land.

### SG-m4f resolutions (all 8)

- **SG-m4f-01 — `count → done` rename.** RESOLVED: rename in the same PR. The cost is a 36-literal sed across 16 files; the benefit is one consistent field name (`done`) for "progress" across both kinds. Plan-locked per spec recommendation.
- **SG-m4f-02 — Delete `<BrickStepper>` or leave dormant?** RESOLVED: delete (file + component + the obsolete `Brick.tsx` consumer). Reasoning: the user explicitly rejected the stepper UX 2026-05-14; reintroducing it later costs ~80 LOC (the current file size). Cheaper to re-derive than to maintain dead code.
- **SG-m4f-03 — Delete `lib/blockValidation.ts:overlapsExistingBlock`?** RESOLVED: delete the function (keep the file for the surviving validators); re-point U-m2-004 and U-m2-005 to `lib/overlap.ts:intervalsOverlap` per the spec recommendation. Behavior is identical (both use half-open math per ADR-006); only the imported symbol changes. The "M2 regression coverage" the function previously provided is preserved.
- **SG-m4f-04 — UnitsEntrySheet trigger: tap vs long-press?** RESOLVED: tap. The chip becomes a single-tap surface (M4b stepper gone, M4c long-press gone), so there is no contested gesture. Long-press would create a hidden affordance and conflict with future M5 edit-mode patterns. Tap is the locked UX.
- **SG-m4f-05 — Replace chime for units bricks?** RESOLVED: no celebratory sound for _units bricks_ in M4f (typing a number into a units brick triggers no chime). This does **not** touch the M4a block-complete / day-complete chimes — those are RETAINED (user decision 2026-05-14; see § Audio cleanup). `lib/audio.ts` + `public/sounds/chime.mp3` survive. A future M7 polish milestone may add a units-completion sound and swap the placeholder asset.
- **SG-m4f-06 — Decimals in `target` or `done`?** RESOLVED: integers only. `Math.floor()` in the reducer + `step="1"` on the input + the regex `^\d+$` validation in the sheet enforce this in three layers. Decimals revisit in M7 if usage signals warrant ("1.5 km", "2.5 cups").
- **SG-m4f-07 — Migrate auto-running-timer state across session refresh?** RESOLVED: no migration code. There is no persistence (M8 owns that), so no in-flight state survives a refresh. The rip is clean by construction.
- **SG-m4f-08 — Supersede ADR-042 or rewrite in place?** RESOLVED: in-place rewrite of the "tick / goal / time" phrasing in ADR-042's body. ADR-042's decision is unchanged; only the score-type cardinality phrasing it references in its own prose is updated. ADR-043 notes the harmonization. Commit prefix is `docs(harness)`, NOT `docs(plan-m4f)`, per ADR-027.

### Edge cases (re-stated from spec for BUILDER)

- Units chip tapped while UnitsEntrySheet for a different brick is open → close prev, open new (single-sheet contract per M4d).
- User clears input, taps Save → Save aria-disabled; medium haptic + sr-only hint surfaces.
- Negative number → input layer rejects (`min="0"` HTML attr + regex `^\d+$`); Save stays disabled.
- Value > target → valid (overachievement); chip renders e.g. "120 / 100 reps" with no special styling.
- Decimal pasted in → reducer floors via `Math.floor(action.done)` defensively (input layer also rejects, but reducer is the truth).
- Existing `kind: "time"` fixtures → tsc compile error post-collapse; the Phase A bulk migration converts in the same commit.
- Existing `kind: "goal"` fixtures → tsc compile error post-collapse; same.
- M4e duration toggle ON for units brick → unchanged from M4e; the duration axis is kind-agnostic.
- `unit: ""` saved → AddBrickSheet's Unit input is `required`; defensive reducer rejection on `unit === ""` is plan-locked (mirrors `target <= 0` rejection per spec edge case).
- `target: 0` saved → AddBrickSheet's Target input is `min="1"`; defensive reducer rejection on `target <= 0` per same edge case.
- `lib/timer` import remains in any source file → typecheck/lint failure on `lib/timer.ts` deletion surfaces any forgotten import. (`lib/audio` imports are expected to survive — audio is retained.)

### Risks

- **R1 — incomplete sweep.** A missed `kind: "time"` reference or stale `runningTimerBrickId` access causes `tsc --noEmit` errors. **Mitigation:** the grep inventory above lists all 504 hits across 35 files; BUILDER runs `npx tsc --noEmit` after each Phase (A through G) and treats any error as a blocker. Eval Gate (Phase 6) gates on zero tsc errors per AC #39.
- **R2 — M4e regression on units bricks with `hasDuration: true`.** M4e tests exercised time-kind + duration; rewriting them to units-kind must preserve every M4e AC. **Mitigation:** the TESTS dispatch will include explicit "M4e duration-axis parity on units bricks" checks (re-pointed M4e IDs per AC #37). The plan locks: any failure of a re-pointed M4e ID is a build-blocker, not a "minor migration" — the M4e contract is sacred.
- **R3 — scoring math drift.** Field renames in `lib/dharma.ts` could subtly change completion ratios if a `??` or `||` default isn't migrated. **Mitigation:** the `brickPct` rewrite above shows the algorithm is byte-identical modulo field names (`count` → `done`, `(minutesDone, durationMin)` → `(done, target)`). A snapshot-style assertion on a representative day's `dayPct` (e.g., a day with 1 tick + 1 units brick at 50% completion) lives in `lib/dharma.test.ts`'s migration set as a regression anchor.
- **R4 — UnitsEntrySheet keyboard handling on mobile.** Number inputs have known quirks across iOS Safari / Android Chrome (decimal-point key, virtual keyboard "submit" key, paste of locale-formatted numbers). **Mitigation:** `inputMode="numeric"` + `step="1"` + `min="0"` + `pattern="\d*"` covers the mobile keypad; the regex `^\d+$` is the JS truth; `Math.floor()` in the reducer is the final defense. E-m4f-01 + E-m4f-04 verify on mobile-chrome viewport.
- **R5 — Audio cleanup scope (RESOLVED by user decision 2026-05-14).** An earlier draft of this plan proposed deleting all audio. The user has since decided to **retain** the M4a block-complete and day-complete chimes; the spec was corrected accordingly (commit `55c00b6`). `lib/audio.ts`, `lib/audio.test.ts`, `public/sounds/chime.mp3`, and every `playChime()` call site all stay. M4f does no audio-cleanup work — the M4c timer's own chime invocation (if any) is removed for free when `lib/timer.ts` is deleted. No risk remains here.

### Out of scope (re-stated from spec for BUILDER)

- Decimals in `target` or `done` — M7 polish.
- Editing an existing units brick's `target` or `unit` — M5 Edit Mode.
- Re-introducing a ±1 stepper UX on the chip — locked out per user direction.
- Quick-log gesture on chip (long-press to increment, swipe) — M7 if signal.
- Persisting `done` across reloads — M8.
- Auto-suggest unit dropdown — M7 polish.
- History view of past `done` — M9 (depends on M8).
- Resurrecting any timer behavior — never.
- Any conflict-resolution UI beyond Save-disable — never (user resolves; app surfaces).
- Celebratory audio on `done >= target` — M7 polish (locked out of M4f per SG-m4f-05).

### Test strategy (TESTS dispatch reserves)

The TESTS-mode dispatch (separate, per ADR-025) will produce the actual GIVEN/WHEN/THEN IDs. This plan reserves the following layers and broad coverage targets:

- **Unit (Vitest)** — `lib/data.test.ts`: `SET_UNITS_DONE` happy path (loose + nested + missing id + tick-brick no-op + identity short-circuit + Math.floor defense + clamp at 0); `ADD_BRICK` defensive `kind` reject; `findUnitsBrickById` returns the brick or null; `defaultState` shape. `lib/dharma.test.ts`: `brickPct` for tick / units (zero target / overachievement / typical). `lib/overlap.test.ts`: re-pointed U-m2-004/005 against `intervalsOverlap`; fixture migrations.
- **Component (Vitest + Testing Library)** — `components/UnitsEntrySheet.test.tsx` (NEW): renders brick name + "Today's {unit}" + pre-filled input; Save disabled when empty / non-integer / negative; Save calls `onSave(brickId, parsed)` when valid; Cancel calls only `onClose`; disabled-Save tap fires medium haptic + reveals sr-only hint; sheet auto-focuses + selects input on open. `components/BrickChip.test.tsx`: units chip tap fires `onUnitsOpenSheet(brick.id)` + light haptic; chip primary line renders "{done} / {target} {unit}"; aria-label includes "tap to log progress"; tick variant unchanged (regression). `components/AddBrickSheet.test.tsx`: kind selector renders exactly 2 chips; "Time" chip absent; selecting "Units" reveals target + unit inputs; Save constructs `kind: "units"` with `done: 0` plus M4e duration fields if toggle on.
- **E2E (Playwright, mobile-chrome 430 px)** — `tests/e2e/m4f.spec.ts`: 5 IDs per AC #42 (add units brick → open sheet → type 20 → Save → chip renders "20 / 30 minutes"; tap tick chip → flip done no sheet; AddBrickSheet shows 2 kind chips; free-text unit parity with "reps"; no live timer observable anywhere). Vacuous-pass-guarded per M4a–M4e pattern.
- **A11y (axe via Playwright)** — `tests/e2e/m4f.a11y.spec.ts`: 4 IDs per AC #43 (dialog role + labelledby; input accessible name; disabled-Save describedby + sr-only; axe zero violations on three sheet states). Vacuous-pass-guarded.

### Migration / obsolete IDs

- All M4c test IDs (U-m4c-_, C-m4c-_, A-m4c-_, E-m4c-_) RETIRE with a one-line "RETIRED by M4f per ADR-043" pointer in tests.md. The corresponding files (`lib/timer.test.ts`, `components/TimerSheet.test.tsx`, `app/(building)/BuildingClient.m4c.test.tsx`) are deleted outright.
- All M4b stepper-on-chip test IDs (those that specifically assert ±1 buttons, scale-press, long-press auto-repeat, clamp haptic) RETIRE with the same pointer. M4b's reducer-level test IDs that asserted `LOG_GOAL_BRICK` semantics RE-POINT to assert `SET_UNITS_DONE` semantics (absolute-value, not delta) and renumber as M4f IDs.
- M2 IDs U-m2-004 and U-m2-005 RE-POINT to `lib/overlap.ts:intervalsOverlap` per SG-m4f-03; IDs stay stable; only the imported symbol in the test changes.
- M4e test IDs that exercised the duration toggle on `kind: "time"` RE-POINT to `kind: "units"` with `unit: "minutes"`. IDs stay stable per AC #37.
- The `[obsolete]` test files (`components/Brick.test.tsx`, `components/ui/BrickChip.test.tsx`) RETIRE outright — their subjects (already-dead components) are deleted.

### Open questions for VERIFIER

Only one item the spec does not lock verbatim:

1. ~~**Audio cleanup scope.**~~ **RESOLVED** (user decision 2026-05-14; spec corrected in commit `55c00b6`). Audio is retained: `lib/audio.ts`, `lib/audio.test.ts`, `public/sounds/chime.mp3`, and every `playChime()` call site (M4a block-complete + day-complete chimes) all stay. M4f does no audio-cleanup work — the M4c timer's own chime invocation is removed for free when `lib/timer.ts` is deleted. AC #14 (corrected) locks this. No open question remains.

2. **Phase A migration ordering.** § Migration ordering recommends a single bulk-migration commit for the schema collapse (test pre-write red, then bulk-migrate green) rather than strict per-test red/green. The deviation is justified by the schema's irreducible coupling — no single test passes in isolation under a half-collapsed type. VERIFIER may PASS this phasing or insist on strict per-test discipline; if the latter, BUILDER's Phase A becomes ~30 small commits instead of 2, with no behavioral difference. Plan-locked preference: bulk migrate per the M3 precedent.

Everything else (schema collapse, reducer shape, sheet design, kind-selector reduction, deletions, ordering of Phases B–G, test-fixture migration tactic) resolves under ADR-043, ADR-042, ADR-006, ADR-019, ADR-027, ADR-031, ADR-035, ADR-039, ADR-041, the spec's locked schema, or one of the SG-m4f-0N resolutions above.

### ADR needed

None new. ADR-043 (Accepted 2026-05-14) is the controlling decision for the entire milestone. ADR-042's prose is harmonized in-place per SG-m4f-08 (a docs edit, not a new ADR). No conditional caveats.

## Milestone 4g — Timer-era dead-code sweep — Plan

> **Pillars:** § 0.9 (data model — no schema change). ADR-043 (the M4f collapse — M4g finishes the cleanup ADR-043 began). No new ADR.

### Context

M4f collapsed bricks to two kinds and ripped the timer, but parked a layer of inert `@deprecated` props on five components as "backwards-compat prop shape" placeholders. No caller passes them, no component reads them — they are dead weight. M5 (block/brick edit + delete) rewires these exact components, so the dead props are removed now, before M5, so they cannot entangle that work. M4g is **pure subtraction with zero behavior change**: it deletes the dead props plus two cosmetic nits the M4f EVALUATOR logged. It adds nothing and changes no rendering, scoring, or user-visible behavior.

### File structure

All edits are deletions/renames inside existing files. **No file is created or removed.** No `app/` page, no `lib/types.ts`, no reducer touched.

```
EDIT  components/BrickChip.tsx           (delete 5 @deprecated props from Props)
EDIT  components/TimelineBlock.tsx       (delete 5 @deprecated props from Props)
EDIT  components/Timeline.tsx            (delete 2 @deprecated props from Props)
EDIT  components/LooseBricksTray.tsx     (delete 2 @deprecated props from Props)
EDIT  components/TimedLooseBrickCard.tsx (delete 2 @deprecated props from Props)
EDIT  lib/blockValidation.test.ts        (rename one mislabelled describe ID)
EDIT  lib/data.ts                        (fix one stale comment line)
```

### Data model

**None.** No schema change. The `Brick` / `AppState` / `Action` unions in `lib/types.ts` are untouched — M4f locked them (§ Locked schema, post-M4f). M4g touches only `Props` interfaces inside component files, plus one test ID string and one comment. No design tokens are added or changed; this milestone has no token surface.

### File-by-file change list

The pre-edit grep is decisive and must be quoted in the BUILDER's commit message as the basis for the bulk deviation: **`grep -rn` for `onUnitsLog`, `onGoalLog`, `runningTimerBrickId`, `onTimerToggle`, `onTimerOpenSheet` across `app/` `components/` `lib/` (excluding doc/comment strings) returns ZERO call-site hits.** Every hit is either the `Props` declaration being deleted, a one-line history/migration comment, or a test-file narrative comment. No parent component, no `BuildingClient.tsx`, no `HarnessClient.tsx`, and no test render passes any of the five props. The call graph is therefore clean: nothing is threaded live, nothing downstream needs an argument removed.

**1. `components/BrickChip.tsx`** — delete these five `Props` lines (current lines 25–34, the JSDoc tag + its signature for each):

- `onUnitsLog?: (brickId: string, delta: 1 | -1) => void;`
- `onGoalLog?: (brickId: string, delta: 1 | -1) => void;`
- `runningTimerBrickId` — **note:** BrickChip's timer-state prop is declared as `running?: boolean;` (line 30), NOT `runningTimerBrickId`. The spec's Inputs list names `runningTimerBrickId` for BrickChip; the actual inert prop on this file is `running`. **Resolution: delete `running?: boolean;` — it is the same dead M4c timer-state prop the spec intends; the spec's prop name is imprecise for this one file.** Flag noted under § Risks. AC #1 ("declares none of: ... `runningTimerBrickId` ...") is satisfied trivially because BrickChip never declared `runningTimerBrickId`; the substantive deletion is `running`.
- `onTimerToggle?: (brickId: string) => void;`
- `onTimerOpenSheet?: (brickId: string) => void;`
- Net: BrickChip `Props` keeps `brick`, `categories`, `size`, `onTickToggle`, `onUnitsOpenSheet`. The destructure at lines 113–119 already omits all five — no destructure edit needed. The one-line history comment at the top (lines 2–9) **stays** (SG-m4g-02).
- Call sites: `TimelineBlock`, `LooseBricksTray`, `TimedLooseBrickCard`, and `HarnessClient.tsx` (lines 256/270/283) all render `<BrickChip>` passing only `brick`/`categories`/`size`/`onTickToggle`/`onUnitsOpenSheet`. **No call-site edit.**

**2. `components/TimelineBlock.tsx`** — delete these five `Props` lines (current lines 28–37):

- `onUnitsLog`, `onGoalLog`, `runningTimerBrickId?: string | null;`, `onTimerToggle`, `onTimerOpenSheet`.
- Net: `Props` keeps `block`, `categories`, `onAddBrick`, `onTickToggle`, `onUnitsOpenSheet`. Destructure (lines 40–46) already omits all five — no destructure edit.
- Call site: `Timeline.tsx` lines 124–131 renders `<TimelineBlock>` passing only `block`/`categories`/`onAddBrick`/`onTickToggle`/`onUnitsOpenSheet`. **No call-site edit.**

**3. `components/Timeline.tsx`** — delete two `Props` lines (current lines 40–43): `onUnitsLog`, `onGoalLog`.

- Net: `Props` keeps `items`, `categories`, `now`, `onSlotTap`, `onAddBrick`, `onTickToggle`, `onUnitsOpenSheet`, `hasLooseBricks`. Destructure (lines 50–59) already omits both — no destructure edit.
- Call site: `BuildingClient.tsx` lines 284–293 renders `<Timeline>` passing `items`/`categories`/`now`/`onSlotTap`/`onAddBrick`/`onTickToggle`/`onUnitsOpenSheet`/`hasLooseBricks` only. **No call-site edit.** The `// - M4f: onGoalLog → onUnitsLog; timer props removed (ADR-043).` history comment at line 11 **stays** (SG-m4g-02).

**4. `components/LooseBricksTray.tsx`** — delete two `Props` lines (current lines 22–25): `onUnitsLog`, `onGoalLog`.

- Net: `Props` keeps `looseBricks`, `categories`, `onAddBrick`, `onTickToggle`, `onUnitsOpenSheet`, `blocksExist`. Destructure (lines 34–41) already omits both — no destructure edit.
- Call site: `BuildingClient.tsx` lines 296–303 renders `<LooseBricksTray>` passing only the live props. **No call-site edit.**

**5. `components/TimedLooseBrickCard.tsx`** — delete two `Props` lines (current lines 24–27): `onUnitsLog`, `onGoalLog`.

- Net: `Props` keeps `brick`, `categories`, `onTickToggle`, `onUnitsOpenSheet`. Destructure (lines 36–41) already omits both — no destructure edit.
- Call site: `Timeline.tsx` lines 133–139 renders `<TimedLooseBrickCard>` passing only the live props. **No call-site edit.** The `// M4f: onGoalLog → onUnitsLog; timer props removed (ADR-043).` history comment at line 11 **stays** (SG-m4g-02). The line-7 comment fragment "`onTickToggle/onUnitsLog pass-through`" inside the header block narrates an inaccurate symbol — BUILDER may correct `onUnitsLog` → `onUnitsOpenSheet` in that comment for accuracy, but this is optional polish, not required by any AC.

**Call-graph summary.** Threading paths: `BuildingClient → Timeline → TimelineBlock → BrickChip` and `BuildingClient → Timeline → TimedLooseBrickCard → BrickChip` and `BuildingClient → LooseBricksTray → BrickChip`. At every hop, only `onTickToggle` and `onUnitsOpenSheet` are threaded. **None of the ten removed prop declarations is threaded by any parent.** They were inert from the moment M4f parked them.

### SG-m4g-01 resolution — renamed test ID

**Decision: rename the mislabelled `describe` at `lib/blockValidation.test.ts:199` to `U-m3-013`.**

Rationale, and why this beats `U-m4f-016b`:

- The `describe` at line 199 tests `isValidBrickUnitsTarget` (integer ≥ 1). That function is the M4f rename of `isValidBrickGoal`. Its **canonical, already-existing test ID in `docs/tests.md` is `U-m3-013`** (tests.md line 2307: `U-m3-013` — "`lib/blockValidation.ts:isValidBrickGoal` (integer ≥ 1)"). The assertion at line 199 is literally the M4f-renamed body of `U-m3-013`. The current label collides with `U-m4f-016`, which `docs/tests.md` (line 5271) reserves for the `intervalsOverlap` re-point.
- The file's own line-197 banner comment already gestures at the dual identity: `// ─── U-m4f-016 / U-m3-013: isValidBrickUnitsTarget (renamed from isValidBrickGoal) ───`. The mislabel is purely the `describe` string; the comment already knows the truth.
- `U-m3-013` is therefore not a "brand-new detached ID" (the trade-off the spec warned against) — it is the test's **true ancestral ID**, already documented in tests.md for this exact function. A fabricated `U-m4f-016b` suffix would invent an ID that exists nowhere; `U-m3-013` re-attaches the assertion to its real M3 origin and removes the collision in one move. The spec's lean ("keep it in the M4f ID space") was a fallback when no clean prior ID exists — but one does.
- The renamed `describe` string becomes exactly:
  `describe("U-m3-013: isValidBrickUnitsTarget validates target is integer ≥ 1", () => {`
  Only the leading `U-m4f-016` token changes to `U-m3-013`. **The two `it()` blocks and every `expect` assertion inside are preserved verbatim** (AC #5: assertion unchanged, stays green). No collision: `U-m3-013` appears in tests.md as a Unit ID for this function and nowhere else in `lib/blockValidation.test.ts`; `U-m4f-016` / `U-m4f-017` (lines 66, 177 of the same file — the `intervalsOverlap` re-points) are left untouched.
- The line-197 banner comment may be tidied to `// ─── U-m3-013: isValidBrickUnitsTarget (renamed from isValidBrickGoal at M4f) ───` to drop the now-misleading `U-m4f-016` cross-reference; optional, not AC-required.

### SG-m4g-02 resolution — migration-comment policy

**Decision: keep the one-line history/migration comments; delete only the `@deprecated` JSDoc tags and their prop signatures.**

The narrative header comments at the top of `BrickChip.tsx` (lines 2–9), `Timeline.tsx` (line 11), and `TimedLooseBrickCard.tsx` (line 11) — e.g. `// M4f: onGoalLog → onUnitsLog; timer props removed (ADR-043).` — **stay**. They document milestone history, are not `@deprecated` tags, and aid future archaeology (esp. M5, which rewires these files). They are explicitly exempted by AC #4 ("migration comments that intentionally narrate the removal"). The only things deleted from each component file are the `@deprecated` JSDoc lines and the prop signatures they annotate. Grep for a removed prop name will still hit these history comments — that is expected and AC-sanctioned.

### `lib/data.ts` comment fix (AC #6)

The `findUnitsBrickById` doc comment (current lines 44–48) opens:

```
 * findUnitsBrickById — M4f helper (mirrors deleted findTimeBrickById from lib/timer.ts).
```

`lib/timer.ts` and `findTimeBrickById` were both deleted in M4f; the reference is stale. **Replace that line with:**

```
 * findUnitsBrickById — M4f helper. Searches state for a units-kind brick by id.
```

The remaining two lines of the comment ("Searches looseBricks first, then block.bricks. Returns the units-kind brick with / the given id, or null if not found or if the brick is a tick kind.") stay verbatim. Separately, the file-header comment at `lib/data.ts` line 9 (`M4f: ... Adds findUnitsBrickById.`) is a history line — it does not name `lib/timer.ts`/`findTimeBrickById`, so it needs no edit and stays. After the fix, AC #6 holds: `grep -n "timer\.ts\|findTimeBrickById" lib/data.ts` returns zero.

### Components

No component is added, removed, or changes its props _contract_ in any observable way — the deleted props were already absent from every destructure, so the rendered output and behavior are byte-identical to the M4f ship. There is nothing new to specify here.

### Dependencies

**None.** No new package. `package.json` is untouched.

### Edge cases

- **A removed prop turns out to be threaded live.** The pre-edit grep says no call site passes any of the ten props, but the BUILDER must not rely solely on the grep — `npx tsc --noEmit` and the full Vitest suite are the binding proof. If deleting a prop produces a `tsc` error or a red test, that reveals a secretly-live prop and must be **investigated, not silently worked around** (do not re-add the prop to "fix" the build without understanding why; report it). Per the spec's third edge case, no test should fail from these removals — any failure is a finding.
- **`running` vs `runningTimerBrickId` name mismatch on BrickChip.** Resolved above: delete `running?: boolean;`. The spec's Inputs list is imprecise for this single file; AC #1's literal text is still satisfied (BrickChip never declared `runningTimerBrickId`).
- **Grep false positives in docs/comments.** AC #4 excludes `CHANGELOG.md`, `docs/`, and migration comments. The post-edit verification grep must be scoped to non-comment source: a hit inside a kept history comment is expected and not a failure.
- **No-op renders.** Some component tests render these components; none passes a removed prop (confirmed by grep — test-file hits are all comments, e.g. `LooseBricksTray.test.tsx:292`, `TimelineBlock.test.tsx:550/602`). So no test render call needs an argument dropped. If a stray render is later found passing one, that argument is removed in the same change (AC #7/#8 — "at most a dead prop dropped from a render call inside a still-passing test").
- **Test-count regression.** AC #7 forbids net test-count drop. The `U-m3-013` rename changes a `describe` string only — same two `it()` blocks, same count. No test is added or removed in M4g.

### Ordering / commit strategy (BUILDER guidance)

This milestone is ~12 prop-line deletions plus two one-line nits, all verified by `tsc` + the existing suite — there is no new behavior to drive red→green. Strict per-test TDD does not apply because **M4g writes no new test**; it only renames one existing test's ID. A per-component red/green pair would mean writing throwaway "prop is absent" type-probe tests with no lasting value.

**Sanctioned deviation (written basis for the EVALUATOR's commit-boundary gate):** M4g is authorized to ship as **two commits**, not strict per-test:

1. `feat(m4g): remove inert @deprecated timer-era props from five components` — all ten prop-line deletions across the five component files in one commit. The commit body must quote the zero-hit pre-edit grep as the safety basis, and state that `npx tsc --noEmit` + full Vitest pass post-deletion is the regression proof (AC #7, #8). This is a refactor with no behavior change; bundling the five files mirrors the M4f Phase-A precedent (a single coupled-edit commit when splitting yields no behavioral isolation and only churn).
2. `fix(m4g): correct mislabelled U-m4f-016 test ID and stale lib/data.ts comment` — the `U-m3-013` rename in `lib/blockValidation.test.ts` plus the `findUnitsBrickById` comment fix in `lib/data.ts`. Two cosmetic nits, no behavior change.

Optionally the BUILDER may split commit 1 into one-commit-per-component (five commits) if it prefers tighter boundaries — both are acceptable; the bundled form is the plan-locked preference. The `U-m3-013` rename and the `lib/data.ts` comment fix may also be folded into commit 1 if the BUILDER prefers a single commit — but keeping the test-ID rename legible as its own `fix(m4g):` commit is the plan-locked preference so the EVALUATOR's test-integrity review can see it cleanly. **What is NOT acceptable:** a commit that touches `lib/types.ts` or the reducer (out of scope), or one that re-adds any deleted prop.

Commit prefixes per ADR-027: deletions are a refactor with no bug → `feat(m4g):` (`refactor` is not in the ADR-027 table; ADR-027 maps green/non-test work to `feat`/`fix`). The test-ID rename + comment fix is corrective → `fix(m4g):`.

### Decisions to honor

- **ADR-043** — the controlling decision. M4g finishes the cleanup ADR-043's M4f implementation deferred. No superseding, no new ADR.
- **M4f locked schema** (plan.md § "Locked schema, post-M4f") — `Brick` / `AppState` / `Action` are **untouched**. M4g must not modify `lib/types.ts` or `lib/data.ts`'s reducer logic (only the one `findUnitsBrickById` comment line).
- **ADR-027** — commit prefixes: `docs(plan-m4g):` for this plan, `docs(tests-m4g):` for the tests dispatch, `feat(m4g):` / `fix(m4g):` for BUILDER commits.
- **ADR-041** — no Gate #1; VERIFIER audits this plan + the m4g tests before BUILDER. One human gate (preview) only.

### Risks

- **R1 — A prop that looks dead is secretly threaded live.** Mitigation: the pre-edit grep returns zero call-site hits, but the **binding** proof is `npx tsc --noEmit` (zero errors) plus the **full** Vitest suite green. The BUILDER must run both and treat any new error/failure as a finding to investigate — never re-add a prop to silence the build, never `// @ts-expect-error` around it. The spec's edge case is explicit: any failure "reveals a prop that was secretly live and must be investigated, not silently deleted."
- **R2 — `running` vs `runningTimerBrickId` mismatch.** Already resolved (delete `running` on BrickChip). Called out so the VERIFIER does not flag a spec↔plan inconsistency: it is a deliberate, documented reconciliation of an imprecise spec Inputs line, not scope creep.
- **R3 — Grep verification false positives.** AC #4's grep will hit kept history comments. Mitigation: the verification grep must be read as "zero hits in non-comment source," with the history comments (SG-m4g-02) and `docs/` / `CHANGELOG.md` explicitly excluded — as AC #4 itself states.
- **R4 — Lint warning budget.** AC #7 caps lint at ≤13 warnings. Removing unused prop declarations can only reduce or hold the warning count. No risk of exceeding the budget; the BUILDER confirms via `npm run lint`.

### Out of scope

- Any schema change (`Brick` / `AppState` / `Action` unions — M4f-locked, untouched).
- Any new component, new prop, or new behavior.
- Any edit-mode or delete behavior — that is **M5**, which M4g deliberately precedes so the dead props do not entangle M5's rewiring.
- Refactoring component internals beyond deleting the unused prop declarations (no destructure changes are even needed — they already omit the dead props).
- Deleting the one-line history/migration comments (SG-m4g-02: they stay).
- Replacing the `chime.mp3` placeholder, vacuous-pass cleanup, or any other open `docs/status.md` loop — none is in M4g's scope.
- A new ADR — none is needed; ADR-043 governs.

### ADR needed

None. ADR-043 (Accepted 2026-05-14) controls. M4g is pure subtraction with no decision surface beyond SG-m4g-01 and SG-m4g-02, both resolved above.

---

## Milestone 8 — Persistence — Plan

### Context

Every page refresh currently wipes the user's day: `BuildingClient` holds `AppState` in a `useReducer` with an in-memory `defaultState()` initializer, so blocks, categories, loose bricks, and brick completion vanish on reload. M8 makes the day durable by serializing `AppState` to a single `localStorage` key `dharma:v1` after every mutation and rehydrating two-pass on boot. It also stamps a once-only `programStart` ISO date that retires M1's `dayOfYear()` placeholder in favor of `programStart`-relative day numbering. M8 changes **no UI surface** — the only observable effect is reload-survives-state.

### Feature grouping

This plan is **one feature group: `m8`** (one BUILDER dispatch). Test IDs in `tests.md` group under the same `m8` slug. Sub-sections below (persist module / hydration / day-number) are organizational, not separate features.

### File structure

**New files**

| Path                       | Change                                                                                                                                                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `lib/persist.ts`           | NEW. Exports `STORAGE_KEY = "dharma:v1"`, `SCHEMA_VERSION = 1`, the `PersistedState` type, `defaultPersisted()` factory, `loadState(): PersistedState`, `saveState(state: PersistedState): void`, and `migrate(raw: unknown): PersistedState                                    | null` (migrator scaffold per ADR-044). Pure module — no React. |
| `lib/usePersistedState.ts` | NEW. Exports the `usePersistedState()` hook owning the two-pass `mounted`-flag load + save-on-change effect. Resolves SG-m8-02 (hook, not inline effect). Wraps `useReducer` so `BuildingClient` stays thin and the hydration behavior is unit/component-testable in isolation. |

**Modified files**

| Path                                | Change                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/types.ts`                      | `AppState` gains `programStart: string` (ISO `YYYY-MM-DD`). `Block`/`Category`/`Brick`/`Recurrence`/`Action` unions are **untouched** (schema-locked since M2 — see Data model). Add a one-line M8 history comment.                                                                                                                                                                                   |
| `lib/data.ts`                       | `defaultState()` adds `programStart: today()` (imported from `lib/dharma`). Reducer arms unchanged — no new `Action`. Update the header comment ("M8 lands localStorage rehydration" → "M8: persistence wired").                                                                                                                                                                                      |
| `app/(building)/BuildingClient.tsx` | Replace the bare `useReducer(reducer, undefined, …)` lazy initializer with `usePersistedState()` (which internally calls `useReducer` + owns hydration + save effect). Replace `dayNumberValue = dayOfYear(new Date())` / `totalDays = daysInYear(new Date())` (lines 110-113) with `programStart`-relative computation (see Day-number design). Drop the now-unused `dayOfYear`/`daysInYear` import. |
| `components/Hero.tsx`               | **No prop signature change.** `dayNumber?: number` + `totalDays: number` stay; M8 only changes the _values_ passed in. Confirmed: `Hero` renders `Building {dayNumber} of {totalDays}` and is the live `dayOfYear()` consumer.                                                                                                                                                                        |
| `lib/dayOfYear.ts`                  | **Kept, untouched.** `daysInYear()` is still used for `totalDays` (the program runs one calendar year). `dayOfYear()` itself is no longer called by `BuildingClient` after M8 but stays for its existing unit tests (`lib/dayOfYear.test.ts`) — deleting it is out of scope (a dead-export sweep belongs to a future M4g-style pass, not M8).                                                         |

### Data model

**`PersistedState` (the on-disk JSON shape, ADR-044 — defined in `lib/persist.ts`):**

```ts
export type PersistedState = {
  schemaVersion: 1; // migration anchor
  programStart: string; // ISO YYYY-MM-DD, stamped once on first run
  blocks: Block[];
  categories: Category[];
  looseBricks: Brick[];
};
```

**Post-M8 in-memory `AppState` (`lib/types.ts`):**

```ts
export type AppState = {
  blocks: Block[];
  categories: Category[];
  looseBricks: Brick[];
  programStart: string; // NEW in M8 — ISO YYYY-MM-DD
};
```

**SG-m8-04 resolution — placement.** `programStart` **joins the in-memory `AppState`**; `schemaVersion` is a **persist-boundary-only wrapper key** (added by `saveState`, stripped by `loadState`, never present on `AppState`).

- Rationale: the running app needs `programStart` for the day number (the Hero re-reads it every render), so it belongs in runtime state. `schemaVersion` is pure storage metadata with no runtime consumer — leaking it into `AppState` would invite a dead field that every reducer arm must spread. Keep the storage concern at the boundary.
- Mapping is mechanical: `saveState(s: AppState)` writes `{ schemaVersion: 1, programStart: s.programStart, blocks, categories, looseBricks }`; `loadState()` returns a `PersistedState`, and `usePersistedState` projects it to `AppState` by dropping `schemaVersion`.

**Schema lock honored.** `Block`, `Category`, `Brick`, `Recurrence`, `Action` are byte-identical to M4f. The lock permits `AppState` to gain `programStart` (`AppState` is not itself a locked object schema — only the nested `Block`/`Category` shapes are, per the M2 lock; M3 already grew `AppState` with `looseBricks`, M4f shrank it by removing `runningTimerBrickId` — both precedent for additive `AppState` evolution). VERIFIER: this is an additive `AppState` field, not a `Block`/`Category` schema edit.

**Persistence requirement:** `localStorage` only (ADR-018 transport retained; no IndexedDB, no cookies, no server).

### `lib/persist.ts` API

```ts
export const STORAGE_KEY = "dharma:v1";
export const SCHEMA_VERSION = 1 as const;
export type PersistedState = {
  schemaVersion: 1;
  programStart: string;
  blocks: Block[];
  categories: Category[];
  looseBricks: Brick[];
};
```

- **`defaultPersisted(): PersistedState`** — returns `{ schemaVersion: 1, programStart: today(), blocks: [], categories: [], looseBricks: [] }`. `today()` from `lib/dharma` (the DST-safe local-date helper already used project-wide). This is the empty-state default for first run and every failure path. _Note:_ `programStart` is read from the system clock at call time — `loadState` calls `defaultPersisted()` only on the no-key / corrupt / unknown-version paths, so a fresh stamp is correct there (AC #3, #12).
- **`saveState(state: PersistedState): void`** — `JSON.stringify` the state, `localStorage.setItem(STORAGE_KEY, json)`. Entire body wrapped in `try/catch`; on throw (quota exceeded, storage disabled) the catch is empty — error is swallowed, no rethrow (AC #11, SG-m8-05). Synchronous, no debounce (SG-m8-01).
- **`loadState(): PersistedState`** — read `localStorage.getItem(STORAGE_KEY)` inside `try/catch`:
  - `getItem` throws (storage unavailable) → return `defaultPersisted()` (AC #11).
  - value is `null` (no key, first run) → return `defaultPersisted()` (AC #3, #12).
  - value present → `JSON.parse` inside the same `try`; parse throws (malformed) → return `defaultPersisted()` (AC #8, SG-m8-05 — passive: do **not** `removeItem`; the next `saveState` overwrites).
  - parsed object → pass to `migrate()`; if `migrate` returns `null` → return `defaultPersisted()` (AC #9, unknown version).
- **`migrate(raw: unknown): PersistedState | null`** — the migrator **scaffold** (ADR-044 — version field + scaffold, no actual v0→v1 migration since v1 has no on-disk predecessor):
  - `raw` not a non-null object → return `null`.
  - `raw.schemaVersion !== 1` → return `null` (AC #9 — unknown/future version is not guessed at). _This is the single `switch (raw.schemaVersion)` site M5 will extend to a `case 2:` + a real `migrateV1toV2`._
  - `raw.schemaVersion === 1` → coerce defensively to `PersistedState`: `blocks`, `categories`, `looseBricks` each `Array.isArray(...) ? value : []` (AC #10 — partial object fills missing collections with `[]`); `programStart` is `typeof raw.programStart === "string" ? raw.programStart : today()`. Return the coerced object. (Brick-level field validation is **out of scope** — M8 trusts well-versioned data beyond collection presence; deep validation is a future hardening pass.)

**`migrate` is the only place version logic lives** — `loadState` stays a thin transport wrapper. This keeps the M5 `schemaVersion: 2` bump a one-function change.

### Hydration design (SG-m8-02 — `usePersistedState()` hook)

`lib/usePersistedState.ts` exports `usePersistedState(): [AppState, Dispatch<Action>]`. It is the single hydration owner; `BuildingClient` calls it exactly where it currently calls `useReducer`.

**Two-pass `mounted`-flag pattern (the M1 auto-scroll / M3 `<HeroRing>` precedent):**

1. `useReducer(reducer, undefined, () => projectToAppState(defaultPersisted()))` — the lazy initializer is the **empty default**. SSR and the client's first paint both render this → server HTML === first client HTML → no hydration-mismatch warning (AC #4). `projectToAppState` drops `schemaVersion`.
2. `const [mounted, setMounted] = useState(false)`.
3. `useEffect(() => { dispatch(...hydrate from loadState()...); setMounted(true); }, [])` — runs **once, post-mount, client only**. Loads the persisted state and replaces the in-memory state with it (AC #5, #7).
4. `useEffect(() => { if (!mounted) return; saveState(toPersisted(state)); }, [mounted, state])` — the save effect. **The `if (!mounted) return` guard is load-bearing** (see Risks R2): it ensures `saveState` never fires on the empty-default first render and never fires before hydration completes. The first `saveState` can only happen after pass-2 hydration has run.

**How hydration replaces state without a new `Action`:** the reducer has no `HYDRATE` action and M8 adds none (no `Action` union change — schema lock). The hook performs the swap by passing a custom dispatch wrapper, OR — preferred, simplest — by `useReducer`'s state being re-seeded via a one-shot `dispatch` of the existing actions is _not_ viable. **Decision:** the hook owns a `useState<AppState>` seeded from `defaultPersisted()` projection, and a `dispatch` that on every call computes `reducer(currentState, action)` AND `setState`; the post-mount hydration effect calls `setState(loadedAppState)` directly. This keeps `reducer` (pure, `lib/data.ts`) untouched and adds zero `Action` variants. The hook's returned tuple is `[state, dispatch]` — `BuildingClient`'s call sites (`dispatch({ type: "ADD_BLOCK", ... })` etc.) are **byte-identical**, so no `BuildingClient` handler changes beyond the one-line `useReducer` → `usePersistedState` swap.

**Save-on-every-dispatch (SG-m8-01):** wired via the `[mounted, state]`-deps effect in step 4 — every reducer-produced new `state` reference triggers exactly one synchronous `saveState`. Covers all five mutating actions (`ADD_BLOCK`, `ADD_CATEGORY`, `ADD_BRICK`, `LOG_TICK_BRICK`, `SET_UNITS_DONE` — AC #6) with no per-handler wiring. Identity short-circuits in the reducer (e.g. `SET_UNITS_DONE` no-op) return the same `state` reference → the effect does not re-run → no redundant write (a free optimization, not a requirement).

### Day-number design (SG-m8-03 — AC #13 full swap **IS in scope**)

**Grep finding:** `app/(building)/BuildingClient.tsx:112` actively computes `dayNumberValue = dayOfYear(new Date())` and line 113 `totalDays = daysInYear(new Date())`; both feed `<Hero dayNumber={dayNumberValue} totalDays={totalDays}>` (lines 271-276), and `components/Hero.tsx:33-34` renders `Building {dayNumber} of {totalDays}`. A live consumer exists → **AC #13 stands in full**; M8 swaps it.

- Add a pure helper `dayNumber(programStart: string, today: string): number` to `lib/dharma.ts` (the existing date-helper home of `today`, `dateLabel`, `dayPct`): returns the 1-based count of days from `programStart` to `today` inclusive (`programStart` itself = day 1). Clamp to `>= 1` (defends against a `programStart` in the future, e.g. clock skew or a hand-edited key — edge case).
- In `BuildingClient`: `const dayNumberValue = dayNumber(state.programStart, todayIso);` (`todayIso` already in scope, line 108). `state.programStart` is the persisted value post-hydration, the freshly-stamped today on first run.
- `totalDays` keeps `daysInYear(new Date())` — the program is a one-year arc; "Building N of 365|366" semantics are unchanged. `daysInYear` import stays; only `dayOfYear` import is dropped.

### Dependencies

**None.** No new packages. `localStorage`, `JSON`, `crypto.randomUUID` (via existing `lib/uuid.ts`), and React hooks cover M8 entirely.

### Design tokens

**None.** M8 is pure persistence wiring — zero new colors, fonts, spacing, motion, or shadows. No `app/globals.css` change. AC #14 ("no UI surface, component, or interaction changes") is a hard constraint; the only visual delta is that the Hero day number now counts from `programStart` instead of Jan 1 — same component, same tokens, different integer.

### Edge cases

- **First run, no `dharma:v1`** → `loadState` returns `defaultPersisted()`; `programStart` stamped to today; `schemaVersion: 1` written on first `saveState`.
- **Malformed JSON** → `JSON.parse` throws inside `loadState`'s `try` → `defaultPersisted()` returned; no throw escapes; next `saveState` overwrites (AC #8, SG-m8-05).
- **Unknown / future `schemaVersion`** → `migrate` returns `null` → `loadState` returns `defaultPersisted()` (AC #9). Forward-incompatible data is never guessed at.
- **Partial persisted object** (missing `blocks`/`categories`/`looseBricks`) → `migrate` fills each absent collection with `[]` (AC #10).
- **`localStorage` unavailable** (Safari private mode, quota, disabled) → `getItem`/`setItem` throw → `loadState` returns default, `saveState` swallows; app runs in-memory for the session, never crashes (AC #11).
- **SSR / first paint** → server render and client first paint both = empty default (lazy initializer); persisted state arrives only in the post-mount effect → zero hydration-mismatch warning (AC #4).
- **`programStart` already set** → preserved verbatim through `migrate` (string passthrough); never re-stamped (AC #12).
- **Two tabs open** → last writer wins; no cross-tab `storage`-event sync in M8 (ADR-018).
- **`programStart` in the future** (clock skew / hand-edited key) → `dayNumber` clamps to `>= 1`.
- **Very large state** → not a concern at Phase-1 scale (one day's blocks/bricks); `setItem` quota failure is already handled by the `saveState` catch.

### Risks

- **R1 — SSR hydration mismatch (top risk).** If the persisted state were read during render (or in the lazy `useReducer` initializer), server HTML (no `localStorage`) would diverge from client HTML → React hydration-mismatch warning, violating AC #4. **Mitigation:** the `loadState()` call lives **only** inside a `useEffect` (pass two), never in render or the initializer. The lazy initializer is unconditionally `defaultPersisted()`-projected. This is the established M1/M3 `mounted`-flag pattern; the BUILDER must not "optimize" the load into render.
- **R2 — `saveState` clobbering a real persisted value before hydration.** Without the `if (!mounted) return` guard, the save effect would fire on the empty-default first render and overwrite the user's real `dharma:v1` with `[]` _before_ the pass-two hydration effect runs. **Mitigation:** the save effect's first statement is `if (!mounted) return;`; `mounted` flips to `true` only inside the hydration effect, _after_ `setState(loadedAppState)`. Ordering: pass-2 load+`setMounted(true)` strictly precedes any `saveState`. The BUILDER must keep these two effects in this order and must not merge them.
- **R3 — Accidental `Action` / schema change.** A naive "add a `HYDRATE` action" would break the M4f-locked `Action` union and force a reducer arm. **Mitigation:** the hook re-seeds state via `setState` directly (Hydration design above) — `reducer`, `Action`, `Block`, `Category` are all untouched. VERIFIER checks the schema lock holds.
- **R4 — Dropping `dayOfYear` import breaks an unseen consumer.** **Mitigation:** `dayOfYear` is removed only from `BuildingClient`'s _import line_; the function itself stays in `lib/dayOfYear.ts` with its tests. `tsc --noEmit` + full Vitest green is the binding proof (AC #15). `daysInYear` import is retained — do not drop it.

### Test surface preview

(IDs assigned by the separate `mode: TESTS` dispatch — this is the surface sketch only.)

- **Unit (Vitest, mock `localStorage`)** — `lib/persist.ts`: `defaultPersisted` shape; `saveState` writes the ADR-044 JSON shape under `dharma:v1` (AC #2); `loadState` round-trips a valid value (AC #3 happy path) and returns default on no-key (AC #3), malformed JSON (AC #8), unknown `schemaVersion` (AC #9), partial object → `[]`-fill (AC #10), throwing `getItem`/`setItem` (AC #11); `migrate` scaffold version-gate; `dayNumber()` in `lib/dharma.ts` — `programStart` day = 1, multi-day count, future-`programStart` clamp (AC #13).
- **Component / integration (Vitest + Testing Library)** — `usePersistedState` / `BuildingClient`: pass-one renders empty default (AC #4); post-mount hydration renders persisted blocks/categories/loose bricks (AC #5); each mutating dispatch updates `dharma:v1` (AC #6); `mounted`-guard prevents empty-default clobber (R2); Hero shows `programStart`-relative day number (AC #13); the M1–M4g suite passes unmodified (AC #14).
- **E2E (Playwright, deferred-to-preview, `localStorage` cleared per case — ADR-018)** — first-run-empty; mutate-then-reload-persists, including brick `done` values (AC #7); corrupt-key-recovers without crash (AC #8/#11).
- **Accessibility (axe)** — no new surface; an axe pass on the unchanged building page confirms no regression (AC #14). Likely a single smoke assertion; TESTS dispatch decides.

### Out of scope

- A backend, cloud sync, or multi-device merge / conflict resolution (Phase 2+). M8 is last-writer-wins within one browser.
- The `deletions` map — M5 (Edit Mode + delete) adds it via a `schemaVersion: 2` bump + a real migrator (ADR-044). Adding it now would be a speculative empty field.
- Cross-tab `storage`-event synchronization.
- Debounced / batched / flush-on-unload writes — synchronous save per dispatch (SG-m8-01); revisit only if M7 profiling shows jank.
- IndexedDB or any store other than `localStorage`.
- A settings screen to export / clear / reset data (M6+).
- Recurrence resolution against past dates (M9).
- Deleting the now-unused `dayOfYear()` export — a dead-export sweep is a separate pass; `dayOfYear` stays with its tests.
- Deep per-brick field validation of persisted data — `migrate` validates collection presence only.
- A new ADR — ADR-044 (M8 schema) + ADR-018 (transport) govern; M8 introduces no new decision surface.

### ADR needed

None. ADR-044 (Accepted 2026-05-15) defines the persisted schema; ADR-018 (Accepted 2026-04-29) supplies the retained transport (single `dharma:v1` key, two-pass load, `lib/persist.ts`). All five SG-m8 gaps are resolved within this plan (SG-m8-01: synchronous save per dispatch; SG-m8-02: `usePersistedState()` hook; SG-m8-03: AC #13 full swap in scope; SG-m8-04: `programStart` on `AppState`, `schemaVersion` boundary-only; SG-m8-05: passive overwrite-on-next-save). No decision exceeds those ADRs.
