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
