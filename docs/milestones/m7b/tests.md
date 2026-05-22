## Milestone 7b — Live now-line glow + active-block pulsing glow + NOW tag — Tests

This entry covers M7b — the second item in the Polish Layer: a soft amber halo on the existing now-line, a pulsing CSS-keyframe glow on the unique block whose half-open `[start, end)` interval contains `useNow()`'s current time, and a small `NOW` badge anchored top-right of that block's card. M7b is render-layer only — no schema bump, no new persisted field, no new `Action` union member, no new `motionTokens` entry (the pulse cadence is a CSS variable `--motion-now-pulse-duration: 1800ms`, not a JS token), no new clock (it consumes the existing `useNow()` tick threaded as `now` into `<Timeline>` from `BuildingClient` per ADR-023). It is derived from the `plan.md` M7b entry (`## Milestone 7b — Live now-line glow + active-block pulsing glow + NOW tag — Plan`, commit `71b9c8f`). Feature slug: `m7b`. ID prefixes: `U-m7b-`, `C-m7b-`, `E-m7b-`, `A-m7b-`. M7b has a small but mutation-resistant pure-logic surface (`activeBlockId(blocks, now)` truth table — half-open semantics, boundary cases, `end === undefined` skip, deletions/appliesOn-suppressed forward-compatibility, defensive multiple-overlap ordering), a real UI surface (`<NowTag>`; `isActive?: boolean` prop on `<TimelineBlock>` / `<DraggableTimelineBlock>`; `<Timeline>`'s activeId computation + threading to all four render permutations; `<NowLine>`'s larger box-shadow halo; `app/globals.css`'s new `--motion-now-pulse-duration` custom property + `@keyframes nowPulse` + `.is-active` class + reduced-motion override), and a deferred-to-preview perf + a11y surface (Lighthouse Perf ≥ 90; pulse animation ≥ 55 fps over a 5 s trace; axe-clean NOW badge contrast + non-text contrast on the pulse halo), so it has the full four-layer test mix — unit (Vitest), component (Vitest + Testing Library), accessibility (axe via Playwright, deferred-to-preview), and E2E (Playwright, deferred-to-preview).

### Testing approach — what is bespoke vs gate-verified

M7b has a **modest genuine unit + component surface** — the `activeBlockId(blocks, now)` pure helper (`lib/activeBlock.ts`), the new `<NowTag>` presentational component (`components/NowTag.tsx`), the additive `isActive?: boolean` prop on `<TimelineBlock>` / `<DraggableTimelineBlock>`, the `<Timeline>` activeId computation + threading, the `<NowLine>` larger-halo `boxShadow` token, and the new `.is-active` CSS class + `@keyframes nowPulse` + `--motion-now-pulse-duration: 1800ms` custom property + reduced-motion `@media` override in `app/globals.css`. Real GIVEN/WHEN/THEN `it()` / `test()` blocks are authored for all of it under Vitest. Two ACs are honestly part-gate-verified, consistent with the M5/M6/M8/M9a–M9e/M7a precedent:

- **AC #9 (`tsc --noEmit` clean; ESLint 0 errors (≤13 warnings); full Vitest suite green; `test:tz` green)** → the lint / typecheck / full-suite-green / `test:tz` half is gate-verified by `npm run eval`; the four named Vitest scenarios in AC #9 (`activeBlockId` truth table; the Timeline applies `is-active` to exactly one block; the reduced-motion path renders no keyframe animation in CSS; deletions/appliesOn suppression of active candidates) are anchored as bespoke IDs (`U-m7b-001..010`, `C-m7b-010`, `C-m7b-011`, `C-m7b-013`).
- **AC #10 (E2E Playwright, deferred-to-preview: Lighthouse Performance ≥ 90; pulse animation runs at ≥ 55 fps over a 5 s trace; the NOW badge text is `aria-label`'d for screen readers)** → authored as real `test()` blocks under `e2e/` (`E-m7b-001..005`) but executed on the preview deployment (the sandbox cannot run a real Lighthouse audit or a frame-rate trace; the M5b/M9a–M9e/M7a precedent for deferred-to-preview E2E + a11y carries forward).

All other 9 ACs map to at least one concrete bespoke `m7b` test ID below.

### Mutation-resistance notes (read before reviewing the IDs)

Per the established M5/M6/M8/M9a–M9e/M7a discipline, these tests are written to fail against a plausible buggy implementation, not merely an empty one:

- **`U-m7b-001` (`activeBlockId` — boundary `now === block.start` returns the block; boundary `now === block.end` does NOT) asserts the EXACT half-open `[start, end)` contract** at both boundaries on the same fixture: `activeBlockId([{ id: "A", start: "09:00", end: "10:00", … }], "09:00") === "A"` (start belongs to A); `activeBlockId([{ id: "A", start: "09:00", end: "10:00", … }], "10:00") === null` (end does NOT belong to A; the next block — or null — wins). A mutant using closed `[start, end]` (`n <= e`) fails the `"10:00" === null` assertion; a mutant using open `(start, end)` (`n > s`) fails the `"09:00" === "A"` assertion. ADR-006 is the primary decision honored.
- **`U-m7b-002` (`activeBlockId` — mid-block / before / after / between) asserts the EXACT predicate value across a 4-block fixture** at `now = "06:30"` (before all) → `null`; `now = "08:30"` (mid blk-B `08:00–09:00`) → `"blk-B"`; `now = "10:30"` (between blk-B's end and blk-C's start) → `null`; `now = "23:30"` (after all) → `null`. A mutant returning the first block whose `start <= now` (ignoring `end`) fails the "after all" and "between" cases; a mutant returning the closest block by start distance fails the "between" case.
- **`U-m7b-003` (`activeBlockId` — block with `end === undefined`) asserts** `activeBlockId([{ id: "open", start: "08:00", end: undefined, … }], "09:00") === null` AND `activeBlockId([{ id: "open", start: "08:00", end: undefined, … }, { id: "closed", start: "09:00", end: "10:00", … }], "09:30") === "closed"` (the open block is skipped; the closed block wins). A mutant treating `end === undefined` as "extends to infinity" returns `"open"` on the first case and fails; a mutant throwing on `undefined` fails with a runtime error (the helper must be defensive — render-layer code must never crash).
- **`U-m7b-004` (`activeBlockId` — empty block list / all blocks open-ended) asserts** `activeBlockId([], "09:00") === null` AND `activeBlockId([{ id: "x", start: "08:00", end: undefined, … }, { id: "y", start: "09:00", end: undefined, … }], "09:30") === null`. AC #3 verbatim ("Returns `null` when no block contains `now` or when every visible block has `end === undefined`"). A mutant returning the first block in non-empty inputs (regardless of `end === undefined`) fails the second case.
- **`U-m7b-005` (`activeBlockId` — defensive multiple-overlap returns first by source order) asserts** on a forbidden-by-schema-but-defensively-handled fixture `[{ id: "first", start: "09:00", end: "10:00", … }, { id: "second", start: "09:00", end: "10:00", … }]`, `activeBlockId(..., "09:30") === "first"` — first match in array source order wins, no throw, no log. A mutant returning the last block (`for (let i = blocks.length - 1; ...)`) fails; a mutant throwing on overlap fails with a runtime error.
- **`U-m7b-006` (`activeBlockId` — purity: no clock read, no mutation of input array, deterministic across repeated calls) asserts** the helper is referentially transparent — repeated calls with the same `(blocks, now)` return the same id; the input `blocks` array is not mutated (`Object.freeze(blocks)` does not throw, and a deep-equal comparison before/after the call passes); the helper makes zero `Date.now()` or `localStorage` reads (a `vi.spyOn(Date, "now")` and a `vi.spyOn(global.localStorage, "getItem")` record zero invocations). A mutant calling `Date.now()` to derive `now` (ignoring the argument) fails the spy assertion AND fails the "different now arguments return different ids" assertion.
- **`U-m7b-007` (`activeBlockId` — TZ-irrelevant) asserts** that across three `process.env.TZ` settings (`UTC`, `America/Los_Angeles`, `Asia/Kolkata` — the M7a `test:tz` triad), `activeBlockId([blk-A 08:00–09:00], "08:30") === "blk-A"` in all three. The helper takes HH:MM strings and never touches `Date` constructors, so TZ has zero effect. A mutant calling `new Date()` to parse `now` fails the cross-TZ consistency assertion in at least one TZ.
- **`U-m7b-008` (`activeBlockId` — `now` exactly at midnight boundary `00:00` and day-anchor `04:00`) asserts** that `now = "00:00"` and `now = "04:00"` both work as plain HH:MM minute values — `activeBlockId([{ id: "A", start: "00:00", end: "01:00", … }], "00:00") === "A"` (start at minute 0); `activeBlockId([{ id: "A", start: "03:00", end: "05:00", … }], "04:00") === "A"` (the helper does not treat `04:00` as a day-anchor reset; it is `toMin("04:00") = 240`). A mutant subtracting the M0 day anchor (`240`) from `toMin(now)` before comparing fails both assertions.
- **`C-m7b-001` (`<NowTag>` — renders `data-testid="now-tag"`, `aria-label="Now"`, visible "NOW" text) asserts the EXACT three DOM attributes**: `node.dataset.testid === "now-tag"` (the test-fixture selector m7b uses); `node.getAttribute("aria-label") === "Now"` (AT-only label — concise, overrides the visible text per ARIA name-computation rules); the rendered text content includes `"NOW"` (case-preserved — though CSS `text-transform: uppercase` may render it lowercased in source if a mutant authors `<span>now</span>` and lets the CSS cap it; the test asserts the rendered `textContent` after CSS application is `"NOW"`). A mutant rendering only the visible text without `aria-label` fails the aria-label assertion; a mutant rendering only `aria-label` with no visible text fails the textContent assertion; a mutant rendering the wrong `data-testid` fails the selector lookup.
- **`C-m7b-002` (`<NowTag>` — WCAG AAA contrast: `var(--bg)` ink on `var(--accent)` fill ≥ 7:1) asserts** the rendered inline style sets `background: var(--accent)` AND `color: var(--bg)`. A separate computed-contrast assertion (using a tiny JS helper or hardcoded numeric check) verifies `#07090f` on `#fbbf24` yields contrast ratio ≥ 14.7:1 (WCAG AAA = ≥ 7:1 for normal text; AAA passes by a comfortable margin). A mutant swapping `color: var(--ink)` (= `#e8eaf0`) on `var(--accent)` fill (= `#fbbf24`) drops contrast to ≈ 2.3:1 — fails WCAG AA / AAA both. SG-m7b-02 resolution anchor.
- **`C-m7b-003` (`<NowTag>` — top-right absolute positioning + non-interactive) asserts** the rendered inline style includes `position: absolute`, `top: 4px`, `right: 4px`, AND `pointer-events: none`. The badge is a `<span>` with no `role`, no `tabindex`, no `onClick` — the test asserts `node.tabIndex === -1` (default), `node.onclick === null`, and that a synthetic `userEvent.click(node)` triggers no handler invocation. A mutant rendering an interactive `<button>` would fail `tabIndex === -1`; a mutant positioning at `top-left` would fail the `top/right` style check; a mutant with `pointer-events: auto` would fail the pointer-events assertion (the underlying card's click semantics must reach through the badge).
- **`C-m7b-004` (`<TimelineBlock isActive={true}>` — adds `is-active` class to outer `motion.div` + renders `<NowTag>` child) asserts** the outer wrapper carrying `data-component="timeline-block"` has `node.className.includes("is-active")` AND a child element with `data-testid="now-tag"` is present in its subtree. A mutant adding `is-active` to a nested inner element (not the outer card) fails the className-lookup-on-outer-wrapper assertion; a mutant adding the class but forgetting `<NowTag />` fails the testid assertion; a mutant adding `<NowTag />` but forgetting the class fails the className assertion.
- **`C-m7b-005` (`<TimelineBlock isActive={false}>` (default) — byte-identical to today: no `is-active` class, no `<NowTag>` in DOM, no other DOM diff) asserts** the rendered outer wrapper does NOT carry `is-active` in its `className` AND `screen.queryByTestId("now-tag")` returns `null` AND the rendered subtree's `outerHTML` is byte-identical to the same component rendered without the `isActive` prop at all (omitted, defaulting to `false`). A mutant making `is-active` a default-applied class fails the className-absence assertion; a mutant always rendering `<NowTag />` regardless of `isActive` fails the testid-null assertion; a mutant changing any unrelated DOM markup as a side-effect of adding the new prop fails the byte-identity assertion.
- **`C-m7b-006` (`<TimelineBlock>` under reduced motion — `is-active` class STILL applied; the suppression is CSS-only, not JSX) asserts** with `usePrefersReducedMotion()` mocked to return `true`, `<TimelineBlock isActive={true}>` STILL renders the `is-active` class on its outer wrapper AND STILL renders `<NowTag />` in the DOM. The CSS `@media (prefers-reduced-motion: reduce)` rule that suppresses `animation: nowPulse …` is verified at the globals.css level (`U-m7b-009`) and by axe on the preview (`A-m7b-003`); the React layer must NOT branch on PRM. A mutant adding a JS check `if (prefersReducedMotion) return null` around `<NowTag />` fails the testid-presence assertion under mocked-true PRM; a mutant stripping `is-active` from className when PRM is true fails the className assertion.
- **`C-m7b-007` (`<DraggableTimelineBlock isActive={true}>` — threads `isActive` to inner `<TimelineBlock>`) asserts** the rendered subtree includes a `<TimelineBlock>` (data-attribute-spied via the existing `data-component="timeline-block"` selector) carrying the `is-active` class AND the `<NowTag />` child. A mutant accepting `isActive` but not threading it (a typo `isActive={isCurrent}` or omitting the prop pass) fails the inner-wrapper className assertion.
- **`C-m7b-008` (`<DraggableTimelineBlock isActive={false}>` (default) — byte-identical to today) asserts** the same byte-identity contract as `C-m7b-005` but at the DraggableTimelineBlock outer wrapper: no `is-active` on the inner TimelineBlock, no `<NowTag>` in DOM, no other DOM diff vs. a render that omits the `isActive` prop entirely.
- **`C-m7b-009` (`<Timeline>` — applies `isActive={true}` to EXACTLY ONE block — the one whose `[start, end)` contains `now`) asserts** on a 4-block fixture (`stateFourBlocks` — blk-A `08:00–09:00`, blk-B `09:00–10:00`, blk-C `10:00–11:00`, blk-D `11:00–12:00`) with `now = "09:30"`, exactly one block in the rendered DOM carries the `is-active` class — `document.querySelectorAll(".is-active").length === 1` AND that node's text/id corresponds to blk-B; every other block does NOT carry the class. A mutant applying `is-active` to all blocks fails the `length === 1` assertion; a mutant applying it to none fails too; a mutant applying it to the wrong block (off-by-one in the predicate) fails the id correspondence.
- **`C-m7b-010` (`<Timeline>` — when no block contains `now`, applies `isActive={false}` to every block; no `.is-active` in DOM; no `<NowTag>` anywhere) asserts** on the same 4-block fixture with `now = "06:30"` (before all), `document.querySelectorAll(".is-active").length === 0` AND `document.querySelectorAll('[data-testid="now-tag"]').length === 0`. A mutant defaulting to "first block is active when nothing matches" would fail both length-zero assertions.
- **`C-m7b-011` (`<Timeline>` — `is-active` migrates with the `now` prop tick) asserts** the same 4-block fixture, initial render with `now = "09:30"` → blk-B carries `is-active`; rerender with `now = "10:30"` (one minute past blk-B's end into blk-C's mid) → blk-C carries `is-active`, blk-B no longer does; rerender with `now = "11:00"` (boundary — blk-D starts, blk-C ends; half-open ⇒ blk-D is active, NOT blk-C) → blk-D carries `is-active`. Three sequential `rerender` calls; three sequential `querySelectorAll(".is-active")` assertions. This is the AC #7 anchor — "Exactly one block at a time carries the `is-active` styling; when `now` crosses into the next block's interval (within the 60 s tick budget), the styling migrates." A mutant memoizing the activeId by mount (not by render) fails the migration assertions; a mutant using closed `[start, end]` at boundaries fails the `now === "11:00"` rerender (would mark blk-C, not blk-D).
- **`C-m7b-012` (`<Timeline>` — empty `items` list does not throw) asserts** `<Timeline items={[]} now="09:30" … />` renders without throwing AND `document.querySelectorAll(".is-active").length === 0`. A mutant calling `blocks[0].id` unconditionally inside the activeId computation would throw on the empty fixture; the helper's `for` loop over an empty array is the safe path.
- **`C-m7b-013` (`<Timeline>` — block deleted via `deletions` for today is NOT a candidate for active) asserts** on a fixture where `state.blocks = [blk-A 09:00–10:00, blk-B 09:30–10:30]` (overlap forbidden by schema but the test constructs them via direct fixture assembly — i.e., a deleted blk-A + a remaining blk-B; the `currentDayBlocks` filter is consumed by `BuildingClient` which passes the post-filter list as `items`), and `now = "09:45"`: only the un-deleted blk-B is in the `items` prop; only blk-B is rendered; blk-B carries `is-active`; blk-A is not in the DOM at all. A mutant computing activeId against `state.blocks` (raw) instead of `visibleBlockList` (derived from `items` per plan § Active-block wiring) would still find blk-A first (source-order) and pick it — but blk-A is not in the DOM, so the `.is-active` class would attach to a non-existent node, and `querySelectorAll(".is-active").length === 0` would fail the expectation of one match on blk-B. This anchors the "visibleBlockList NOT state.blocks" plan decision.
- **`C-m7b-014` (`<NowLine>` — rendered `boxShadow` style string includes the new larger-halo token `12px rgba(251, 191, 36`) asserts** `<NowLine now="09:30" />` renders with `style.boxShadow` matching the regex `/0 0 12px rgba\(251,\s*191,\s*36,/` (the larger soft outer halo); the existing 6px inner halo `0 0 6px var(--accent)` is also present (the test uses two substring checks). The `top`, `aria-label`, `role`, and `data-testid` attributes remain byte-identical to today (regression-free per plan § Regression surface NowLine row). A mutant keeping the old `0 0 4px var(--accent)` token fails the 12px substring check; a mutant using a different alpha (e.g., `0.6` instead of `0.45`) fails the literal-substring check on the test's regex.
- **`U-m7b-009` (globals.css — `--motion-now-pulse-duration: 1800ms` is declared in `:root` AND `@keyframes nowPulse` AND `.is-active` class AND PRM override exist) asserts** by reading the production `app/globals.css` file contents (Vitest's `readFileSync` against the file path, same pattern as the M0 design-token tests): the string `--motion-now-pulse-duration: 1800ms` appears in a `:root` block; the string `@keyframes nowPulse` appears as a top-level CSS rule with `0%, 100% { box-shadow: …` and `50% { box-shadow: …` keyframe stops; `.is-active { animation: nowPulse var(--motion-now-pulse-duration)` appears as a class rule; INSIDE the `@media (prefers-reduced-motion: reduce)` block, the substring `.is-active` appears with `animation: none !important` AND `box-shadow: 0 0 0 1.5px var(--accent)` (the static-outline fallback). A mutant declaring the variable in the wrong selector (e.g., `body { … }`) fails the `:root`-block-substring assertion; a mutant forgetting the PRM override fails the `@media`-substring assertion; a mutant using a different cadence (e.g., `2000ms`) fails the literal-substring assertion.

### Test ID layout

| Layer                                 | IDs              | Count  |
| ------------------------------------- | ---------------- | ------ |
| Unit (Vitest)                         | `U-m7b-001..009` | 9      |
| Component (Vitest + Testing Library)  | `C-m7b-001..014` | 14     |
| Accessibility (axe via Playwright)    | `A-m7b-001..003` | 3      |
| E2E (Playwright, deferred-to-preview) | `E-m7b-001..005` | 5      |
| **Total**                             |                  | **31** |

ID series start values were supplied by the orchestrator as the running totals for the four `m7b` prefixes; m7b introduces four fresh prefixes (`U-m7b-`, `C-m7b-`, `E-m7b-`, `A-m7b-`), so each series begins at `001`. IDs are unique, stable, and gap-free so VERIFIER can map AC → test ID.

**Fixture vocabulary (used across the m7b IDs unless a test overrides it):**

- A standing `AppState` fixture: `programStart: "2026-05-01"`, `currentDate: "2026-05-18"`, `deletions: {}`, `history: {}`, `schemaVersion: 3`. The blocks set varies per test.
- **`stateFourBlocks`** — `blocks: [blk-A 08:00–09:00, blk-B 09:00–10:00, blk-C 10:00–11:00, blk-D 11:00–12:00]`, all closed half-open intervals; one tick brick each; `looseBricks: []`. The canonical Timeline fixture for `C-m7b-009..013`.
- **`stateOpenEnded`** — `blocks: [blk-open start=08:00 end=undefined]`. Drives `U-m7b-003`/`U-m7b-004` and a Timeline render where no block is active despite a block "starting" earlier in the day.
- **`stateOverlap`** — defensive fixture `[blk-first 09:00–10:00, blk-second 09:00–10:00]` (forbidden by M4e schema but the unit helper must be deterministic). Drives `U-m7b-005`.
- **`stateBoundary`** — single block `[blk-A 09:00–10:00]` used at three `now` values: `"09:00"` (start boundary → active), `"09:30"` (mid → active), `"10:00"` (end boundary → NOT active). Drives `U-m7b-001`.
- **`stateDeletionFiltered`** — `state.blocks = [blk-A 09:00–10:00, blk-B 09:30–10:30]` with `deletions: { "2026-05-18": ["blk-A"] }`; the consumer (`BuildingClient` → `currentDayBlocks`) yields `visibleBlocks = [blk-B]` passed as `items` to `<Timeline>`. Drives `C-m7b-013`. (The overlap is unreachable in the running app because M4e forbids construction; the fixture is hand-assembled for the test.)

### Unit (Vitest)

`U-m7b-001..008` exercise the `activeBlockId(blocks, now)` truth table — boundaries, mid-block, before/after/between, `end === undefined` skip, empty list, defensive multiple-overlap, purity, TZ-irrelevance, midnight + day-anchor. `U-m7b-009` exercises the `app/globals.css` declarative surface (CSS variable + keyframe + class + PRM override).

#### U-m7b-001 — boundary (`activeBlockId` — half-open `[start, end)` honored at both boundaries; mutation-resistant)

Target file: `lib/activeBlock.test.ts` (NEW — m7b creates this file)
Layer: Unit
**GIVEN** the `activeBlockId(blocks: Block[], now: string): string | null` helper from `lib/activeBlock.ts`, called with a single-block fixture `[{ id: "A", start: "09:00", end: "10:00", … }]`
**WHEN** `activeBlockId` is called three times — `now = "09:00"` (start boundary), `now = "09:30"` (mid-block), `now = "10:00"` (end boundary)
**THEN** the returned ids are **EXACTLY**: `"09:00"` → `"A"` (start belongs to A per ADR-006 half-open `[start, …)`); `"09:30"` → `"A"` (mid); `"10:00"` → `null` (end does NOT belong to A per ADR-006 half-open `[…, end)`).
**AND** a parameterized boundary table across three additional fixtures (`08:59`, `09:00:001` → covered by minute-level rounding via `toMin`; the helper takes HH:MM strings only, so sub-minute is N/A) re-asserts the EXACT contract: just-before-start (`08:59`) → `null`; exactly-start → `"A"`; exactly-end (`10:00`) → `null`; just-after-end (`10:01`) → `null`.
Proves: plan.md § `activeBlockId` contract — "Half-open per ADR-006. `n >= s && n < e`. A block whose `start === now` IS active. A block whose `end === now` is NOT." — covers SPEC AC #2 ("uses half-open `[start, end)` semantics: a block whose `start === now` is active; a block whose `end === now` is NOT").
Tag: boundary.

#### U-m7b-002 — success (`activeBlockId` — mid-block / before-all / after-all / between-blocks truth table on 4-block fixture; mutation-resistant)

Target file: `lib/activeBlock.test.ts`
Layer: Unit
**GIVEN** the 4-block fixture `stateFourBlocks` (blk-A `08:00–09:00`, blk-B `09:00–10:00`, blk-C `10:00–11:00`, blk-D `11:00–12:00`) but with a deliberate gap between blk-B and blk-C — re-encoded for this test as `[blk-A 08:00–09:00, blk-B 09:00–10:00, blk-C 10:30–11:30, blk-D 12:00–13:00]` so the "between blocks" case is reachable
**WHEN** `activeBlockId` is called with `now = "06:30"` (before all), `"08:30"` (mid-A), `"09:30"` (mid-B), `"10:15"` (gap between blk-B and blk-C), `"10:45"` (mid-C), `"11:45"` (gap between blk-C and blk-D), `"12:30"` (mid-D), `"23:30"` (after all)
**THEN** the returned ids are **EXACTLY**: `"06:30"` → `null`; `"08:30"` → `"blk-A"`; `"09:30"` → `"blk-B"`; `"10:15"` → `null`; `"10:45"` → `"blk-C"`; `"11:45"` → `null`; `"12:30"` → `"blk-D"`; `"23:30"` → `null`.
Proves: plan.md § Edge cases — "Before / between / after all blocks → `activeBlockId(visibleBlockList, now)` returns `null`" + spec § Edge cases ("Before the first block, between blocks, after the last block → `activeBlockId` returns `null`") — covers SPEC AC #1, AC #3 and the "Before the first block, between blocks, after the last block" edge case.
Tag: success / edge.

#### U-m7b-003 — edge (`activeBlockId` — block with `end === undefined` is never active; later closed blocks still win)

Target file: `lib/activeBlock.test.ts`
Layer: Unit
**GIVEN** the helper called on two fixtures: (a) `[{ id: "open", start: "08:00", end: undefined, … }]` (single open-ended block); (b) `[{ id: "open", start: "08:00", end: undefined, … }, { id: "closed", start: "09:00", end: "10:00", … }]` (open-ended + a later closed block)
**WHEN** `activeBlockId` is called on fixture (a) with `now = "09:00"`, and on fixture (b) with `now = "09:30"`
**THEN** fixture (a) returns `null` (the open block has no defined end so it is never active — ADR-006 half-open requires a finite end); fixture (b) returns `"closed"` (the open block is skipped; the closed block's `[09:00, 10:00)` contains `09:30`).
**AND** the helper does NOT throw on `end === undefined` — a defensive `if (b.end === undefined) continue;` is required (M2 schema allows `end?` undefined; the predicate must be crash-free).
Proves: plan.md § `activeBlockId` contract — "No-end blocks return `null` participation. A block with `end === undefined` has no defined interval; per the spec's edge case it is never active." — covers SPEC AC #3 ("Returns `null` when no block contains `now` or when every visible block has `end === undefined`") and the "Block whose `end` is `undefined`" edge case.
Tag: edge.

#### U-m7b-004 — edge (`activeBlockId` — empty block list returns `null`; all-open-ended returns `null`)

Target file: `lib/activeBlock.test.ts`
Layer: Unit
**GIVEN** the helper called on two pathological fixtures: (a) `[]` (empty); (b) `[{ id: "x", start: "08:00", end: undefined }, { id: "y", start: "09:00", end: undefined }]` (all open-ended)
**WHEN** `activeBlockId` is called with `now = "09:30"` on each
**THEN** both return `null`. The helper does not throw on the empty array (the `for` loop iterates zero times and returns `null`); the helper does not throw on the all-open-ended array (every block hits the `continue` branch).
Proves: plan.md § `activeBlockId` contract — "Returns `null` when no block contains `now` or when every visible block has `end === undefined`" — covers SPEC AC #3 verbatim.
Tag: edge.

#### U-m7b-005 — defensive (`activeBlockId` — multiple blocks claim `now` → returns first by source order; no throw, no log)

Target file: `lib/activeBlock.test.ts`
Layer: Unit
**GIVEN** the helper called on the defensive `stateOverlap` fixture `[{ id: "first", start: "09:00", end: "10:00" }, { id: "second", start: "09:00", end: "10:00" }]` (forbidden by M4e `intervalsOverlap` block↔block enforcement, but `activeBlockId` must be deterministic if a corrupted state import or a future bug ever produces this)
**WHEN** `activeBlockId(stateOverlap, "09:30")` is called
**THEN** the returned id is **EXACTLY** `"first"` — the for-loop iterates in array source order and returns on the first match.
**AND** the helper does NOT throw and does NOT log a warning (no `console.warn`, no `console.error`, no `assert` invocation — verified via `vi.spyOn(console, "warn")` + `vi.spyOn(console, "error")` recording zero invocations). Defensive ordering is sufficient — render-layer code must not crash, and an invariant log on a state the schema forbids would be noise.
Proves: plan.md § `activeBlockId` contract — "Multiple-overlap defensive ordering. … It returns the first match in `blocks` source order. … No invariant log, no throw — defensive ordering is sufficient" + spec § Edge cases ("Multiple blocks claiming `now` … → `activeBlockId` returns the first by source order").
Tag: defensive / edge.

#### U-m7b-006 — invariant (`activeBlockId` — pure: no clock read, no `localStorage`, no input mutation; deterministic across repeated calls)

Target file: `lib/activeBlock.test.ts`
Layer: Unit
**GIVEN** the helper with the canonical `stateBoundary` fixture `[{ id: "A", start: "09:00", end: "10:00" }]` and `now = "09:30"`
**WHEN** `activeBlockId` is called 100 times in sequence with the same `(blocks, now)`
**THEN** every call returns `"A"` (referential transparency); a `vi.spyOn(Date, "now")` invocation count is `0` across the 100 calls (no clock read); a `vi.spyOn(globalThis.localStorage, "getItem")` invocation count is `0` (no persistence read).
**AND** the input `blocks` array is byte-identical before and after the call (deep equality check; `Object.freeze(blocks)` BEFORE the call does NOT cause the call to throw — the helper does not mutate). The `now` argument is the sole source of "time" — a mutant calling `Date.now()` to derive `now` (ignoring the argument) fails the spy assertion AND fails the "different `now` arguments return different ids" sub-assertion (`activeBlockId([blk-A], "08:30")` returns `null` while `activeBlockId([blk-A], "09:30")` returns `"A"`).
Proves: plan.md § Data model — "A pure helper. … No clock, no `localStorage`, no mutation. Safely SSR-importable." + § Decisions honored — "ADR-023 (`useNow()` is the sole clock): M7b consumes the existing `now` prop … No new clock, no new interval, no new `useEffect` reading `Date.now()`." — covers SPEC AC #1 ("pure (no clock reads, no `localStorage`, no mutation)").
Tag: invariant / purity.

#### U-m7b-007 — invariant (`activeBlockId` — TZ-irrelevant: same answer across UTC, Los_Angeles, Kolkata)

Target file: `lib/activeBlock.test.ts`
Layer: Unit
**GIVEN** the helper with `[{ id: "A", start: "08:00", end: "09:00" }]` and `now = "08:30"`
**WHEN** `activeBlockId` is called under three `process.env.TZ` settings — `"UTC"`, `"America/Los_Angeles"`, `"Asia/Kolkata"` — by re-importing the helper in a fresh module context per TZ (the test uses `vi.resetModules()` + `vi.stubEnv("TZ", ...)` per case)
**THEN** all three calls return `"A"` (the helper compares HH:MM strings via `toMin`, never constructs a `Date`, so TZ has zero effect).
**AND** the helper passes the same `(blocks, now)` → same-result contract that the M7a `test:tz` triad expects — m7b's `lib/activeBlock.test.ts` is included in the `test:tz` Vitest run (no special wiring; standard Vitest TZ rotation pattern).
Proves: plan.md § Edge cases — "TZ skew across boundaries. `useNow()` is local-clock (ADR-023). `activeBlockId` compares `toMin(now)` with `toMin(b.start)` / `toMin(b.end)` — all are local HH:MM strings; no TZ math. Inherits ADR-023's bounded-skew acceptance." — covers SPEC AC #9 (`test:tz` green portion).
Tag: invariant / cross-TZ.

#### U-m7b-008 — edge (`activeBlockId` — midnight `00:00` and day-anchor `04:00` are plain minute values, not reset points)

Target file: `lib/activeBlock.test.ts`
Layer: Unit
**GIVEN** the helper with two fixtures: (a) `[{ id: "midnight", start: "00:00", end: "01:00" }]`; (b) `[{ id: "anchor", start: "03:00", end: "05:00" }]`
**WHEN** `activeBlockId(midnight, "00:00")` and `activeBlockId(anchor, "04:00")` are called
**THEN** fixture (a) returns `"midnight"` (start at minute 0 is a normal half-open start — `toMin("00:00") = 0`, `0 >= 0 && 0 < 60` ⇒ active); fixture (b) returns `"anchor"` (the helper does NOT treat `04:00` as a day-anchor reset; `toMin("04:00") = 240`, `240 >= 180 && 240 < 300` ⇒ active). The helper deliberately does not consume the existing `currentBlockIndex(blocks, now)` from `lib/dharma.ts` (line 96) which DOES subtract the 04:00 anchor; m7b's predicate is absolute HH:MM containment.
Proves: plan.md § `activeBlockId` contract — "`currentBlockIndex` NOT consumed. The existing `currentBlockIndex(blocks, now)` … computes from sequential duration accumulation starting at `04:00` (the day anchor), and is structurally different from M7b's needs … M7b uses absolute `[start, end)` containment instead." — covers SPEC AC #2 (half-open semantics, applied uniformly without day-anchor offset).
Tag: edge.

#### U-m7b-009 — invariant (globals.css — `--motion-now-pulse-duration: 1800ms` in `:root`; `@keyframes nowPulse` + `.is-active` class + reduced-motion override present)

Target file: `lib/globals-tokens.test.ts` (EXISTS — M0 design-token test file; m7b appends m7b-specific assertions, byte-identical existing assertions preserved per plan § Regression surface). Alternatively NEW `lib/m7b-globals.test.ts` if the existing file is too crowded; PLANNER suggests appending to the existing file to keep one source of truth for "what tokens live in globals.css."
Layer: Unit
**GIVEN** the production `app/globals.css` file, read via `fs.readFileSync` (M0 test infrastructure pattern)
**WHEN** the test inspects the file contents
**THEN** the following substrings are **ALL** present (each asserted via `expect(css).toContain(...)` or a regex match): (a) `--motion-now-pulse-duration: 1800ms` (the CSS custom property, declared inside a `:root` block — verified via `:root\s*\{[^}]*--motion-now-pulse-duration:\s*1800ms` regex); (b) `@keyframes nowPulse` (the new keyframe rule); (c) a keyframe stop at `0%, 100%` and at `50%` (both contain a `box-shadow` line — verified via two regex matches inside the `nowPulse` block); (d) `.is-active` as a CSS class rule containing `animation: nowPulse var(--motion-now-pulse-duration)` and `border-color: var(--accent)`; (e) INSIDE the `@media (prefers-reduced-motion: reduce)` block, the substring `.is-active` co-occurs with `animation: none` AND `box-shadow: 0 0 0 1.5px var(--accent)` (the static-outline fallback).
**AND** no `var(--surface-2)` reference is added to the m7b-touched CSS lines (the status.md latent bug must not propagate — verified by a "the new lines do NOT contain `--surface-2`" substring check on the new keyframe + class + media-override lines).
Proves: plan.md § File structure — `app/globals.css` modification row (the keyframe + class + variable + PRM override) + § Design tokens — "`--motion-now-pulse-duration: 1800ms` (SG-m7b-01 resolution — 1.8 s `ease-in-out`). Lives in `:root` next to `--motion-stagger`" + § Edge cases — "`prefers-reduced-motion: reduce`: (a) Now-line halo unchanged. (b) `.is-active` class still applied. (c) CSS `@media (prefers-reduced-motion: reduce)` rule replaces `animation: nowPulse …` with `animation: none !important;` and sets a static `box-shadow: 0 0 0 1.5px var(--accent);`" — covers SG-m7b-01 + SPEC AC #8 (reduced-motion path) + the no-`--surface-2` discipline.
Tag: invariant / design-token.

### Component (Vitest + Testing Library)

`C-m7b-001..003` exercise `<NowTag>` per-attribute rendering. `C-m7b-004..006` exercise `<TimelineBlock>` with the new `isActive` prop (true / false-default / PRM-still-applied). `C-m7b-007..008` exercise `<DraggableTimelineBlock>` threading. `C-m7b-009..013` exercise `<Timeline>`'s activeId computation (exactly-one, none, migration, empty, deletions-filtered). `C-m7b-014` exercises `<NowLine>`'s larger halo regression.

#### C-m7b-001 — success (`<NowTag>` renders `data-testid="now-tag"`, `aria-label="Now"`, visible "NOW" text)

Target file: `components/NowTag.test.tsx` (NEW — m7b creates this file)
Layer: Component
**GIVEN** the `<NowTag />` component from `components/NowTag.tsx`, rendered into JSDOM with no props
**WHEN** the test queries the rendered DOM via Testing Library
**THEN** the rendered node is found via `screen.getByTestId("now-tag")`; its `aria-label` attribute is **EXACTLY** `"Now"` (`expect(node).toHaveAttribute("aria-label", "Now")`); its rendered text content is `"NOW"` (`expect(node).toHaveTextContent("NOW")`); the visible text and the aria-label coexist (AT users hear "Now"; sighted users see "NOW").
**AND** the node is a `<span>` (no role, no tabindex — the test asserts `node.tagName === "SPAN"` AND `node.tabIndex === -1` AND `node.getAttribute("role") === null`). A mutant rendering a `<button>` or a `<div role="status">` fails the tagName / role assertion.
Proves: plan.md § Components — `<NowTag>` "Renders: a single `<span data-testid='now-tag' aria-label='Now' />` with text `NOW`" + § Accessibility — "NOW badge a11y: `aria-label='Now'` — concise label preferred over the visible 'NOW' text" — covers SPEC AC #6 ("a `NOW` text badge in its top-right corner") + AC #10 ("the `NOW` badge text is `aria-label`'d for screen readers").
Tag: success.

#### C-m7b-002 — success (`<NowTag>` — `var(--bg)` ink on `var(--accent)` fill = WCAG AAA contrast ≥ 14.7:1)

Target file: `components/NowTag.test.tsx`
Layer: Component
**GIVEN** the `<NowTag />` component rendered into JSDOM
**WHEN** the test inspects `node.style.background` and `node.style.color` (inline-style — m7b's plan baseline uses inline `style` per `components/NowTag.tsx` § Components)
**THEN** `node.style.background` resolves to `"var(--accent)"` (substring match — JSDOM preserves CSS-variable references verbatim) AND `node.style.color` resolves to `"var(--bg)"`.
**AND** a numeric contrast assertion: using the M0 known token values `--accent: #fbbf24` and `--bg: #07090f`, the test computes the WCAG-2.x relative-luminance contrast ratio (small helper inline in the test file: a 6-line `relLuminance` + `contrastRatio` pair, the canonical formula) and asserts the result `>= 7.0` (WCAG AAA for normal text; the actual ratio is ≈ 14.7:1, comfortably above). A mutant swapping `color: var(--ink)` (= `#e8eaf0`) on `var(--accent)` (= `#fbbf24`) drops contrast to ≈ 2.3:1 and fails the `>= 7.0` assertion. SG-m7b-02 resolution anchor.
Proves: plan.md § Design tokens — "NOW badge fill: `background: var(--accent)`. NOW badge text: `color: var(--bg)` (= `#07090f`). Contrast vs. `--accent` (`#fbbf24`) ≈ 14.7:1 — WCAG AAA" + § Resolutions to the 3 Open Spec Gaps (SG-m7b-02 RESOLVED) — covers SG-m7b-02 + SPEC § Accessibility (WCAG AAA on NOW badge contrast).
Tag: success / a11y.

#### C-m7b-003 — success (`<NowTag>` — top-right absolute positioning + non-interactive: `pointer-events: none`, no tab focus, no click handler)

Target file: `components/NowTag.test.tsx`
Layer: Component
**GIVEN** the `<NowTag />` component rendered into JSDOM
**WHEN** the test inspects `node.style.position`, `node.style.top`, `node.style.right`, `node.style.pointerEvents`
**THEN** `node.style.position === "absolute"`; `node.style.top === "4px"`; `node.style.right === "4px"`; `node.style.pointerEvents === "none"`. The 4 px offset from each edge yields an effective ~8 px corner inset (per SG-m7b-02 resolution).
**AND** `node.tabIndex === -1` AND a synthetic click (`userEvent.click(node)`) does NOT trigger any onClick handler (`<NowTag />` accepts no `onClick` prop; the test asserts no spy is invoked). The underlying card's click semantics reach through the badge unchanged (verified at the integration layer by `C-m7b-004` — the outer TimelineBlock's expand/collapse still works when isActive=true).
Proves: plan.md § Components — `<NowTag>` "position: absolute; top: 4px; right: 4px; … pointer-events: none — purely decorative; the underlying card retains all click semantics" + § Design tokens — "NOW badge geometry: position: absolute; top: 4px; right: 4px; … 8 px corner inset from card edges per SG-m7b-02" — covers SPEC AC #6 (top-right placement) + plan § Accessibility ("The badge is non-interactive (no role; no `tabindex`; `pointer-events: none`)").
Tag: success.

#### C-m7b-004 — success (`<TimelineBlock isActive={true}>` adds `is-active` class to outer `motion.div` + renders `<NowTag>` child)

Target file: `components/TimelineBlock.test.tsx` (EXISTS — m7b appends `isActive`-prop cases; existing prop-omitting cases stay byte-identical per plan § Regression surface)
Layer: Component
**GIVEN** the `<TimelineBlock>` component with a standing `Block` prop (closed `08:00–09:00`, one tick brick), `expanded={false}`, and the new prop `isActive={true}` — all other M0/M2/M3/M5/M6 props at their existing test-fixture defaults
**WHEN** rendered into JSDOM
**THEN** the outer `motion.div` carrying `data-component="timeline-block"` has its `className` containing the substring `"is-active"` (`expect(outer).toHaveClass("is-active")`); a child element with `data-testid="now-tag"` is present in the subtree (`expect(screen.getByTestId("now-tag")).toBeInTheDocument()`).
**AND** the existing card semantics (the title, the brick chips, the × delete button, the drag handle, the `aria-expanded` attribute) are unchanged — the test asserts each of these elements is still queryable by its existing M0/M2/M3/M5/M6 selector (regression-free check).
**AND** the badge is a direct child of the outer `motion.div` (not nested inside the inner card body — verified via `outer.contains(screen.getByTestId("now-tag"))` AND `outer.querySelector('[data-testid="now-tag"]')` returns the same node — so the badge survives the card's expand/collapse/edit-mode state changes).
Proves: plan.md § Components — `<TimelineBlock>` "When `isActive === true`: (1) add the CSS class `is-active` to the outer `<motion.div data-component='timeline-block'>`; (2) render `<NowTag />` in the card's top-right corner (absolute-positioned inside the existing relative card)." — covers SPEC AC #6.
Tag: success.

#### C-m7b-005 — regression (`<TimelineBlock isActive={false}>` (default) — byte-identical to today: no `is-active` class, no `<NowTag>` in DOM)

Target file: `components/TimelineBlock.test.tsx`
Layer: Component
**GIVEN** the `<TimelineBlock>` component with the same standing `Block` prop but `isActive={false}` (explicit), and a SECOND render with the `isActive` prop OMITTED ENTIRELY (defaulting to `false`)
**WHEN** rendered into JSDOM in both modes
**THEN** in BOTH modes: the outer `motion.div` className does NOT contain `"is-active"` (`expect(outer).not.toHaveClass("is-active")`); `screen.queryByTestId("now-tag")` returns `null`; the rendered `outer.outerHTML` is byte-identical between the two modes (the explicit `isActive={false}` and the omitted prop produce identical DOM — this is the "default to false" contract).
**AND** every pre-M7b TimelineBlock test (jiggle, scaffold fill, bloom overlay, × delete button, drag handle, brick chip render, + Add brick button, `aria-expanded`, `data-edit-mode`) passes unchanged when the test omits `isActive` — the test runs an existing M5/M6 fixture and asserts each existing assertion still holds.
Proves: plan.md § Regression surface — "every existing test constructs a `<TimelineBlock>` without an `isActive` prop. The default `false` keeps existing tests byte-identical (no `is-active` class, no NOW badge)" + § Components — `<TimelineBlock>` "When `isActive === false` (default): no `is-active` class, no `<NowTag />`. Renders **byte-identical** to pre-M7b." — covers SPEC AC #11 ("No regression to M1–M9e / M5b / M7a behavior") for the TimelineBlock surface.
Tag: regression.

#### C-m7b-006 — edge (`<TimelineBlock isActive={true}>` under `prefers-reduced-motion: reduce` — `is-active` class STILL applied; `<NowTag>` STILL rendered; CSS layer handles suppression)

Target file: `components/TimelineBlock.test.tsx`
Layer: Component
**GIVEN** the `<TimelineBlock isActive={true}>` component, with `usePrefersReducedMotion()` mocked via `vi.mock` to return `true` (the existing M7a / M5b PRM-mock pattern; the mock returns the boolean synchronously without subscribing to a real `matchMedia`)
**WHEN** rendered into JSDOM
**THEN** the outer `motion.div` STILL carries the `is-active` className (`expect(outer).toHaveClass("is-active")`) AND `screen.getByTestId("now-tag")` STILL returns the badge node. The React layer does NOT branch on PRM — the suppression of the pulse keyframe lives entirely in `app/globals.css`'s `@media (prefers-reduced-motion: reduce) { .is-active { animation: none !important; … } }` rule.
**AND** the mock's return value is verified to be `true` during the render (a sanity check — the mock is correctly wired); a parallel render with the mock returning `false` produces identical JSX (the className + `<NowTag>` are unchanged) — the only difference between PRM-true and PRM-false is the CSS-level animation, verified by `U-m7b-009`.
Proves: plan.md § Components — `<TimelineBlock>` "The `prefersReducedMotion` branch is handled by the CSS `@media` rule in `globals.css` (the JS doesn't need a branch — the pulse keyframe is suppressed in CSS)" + § Edge cases — "`prefers-reduced-motion: reduce` … (b) `.is-active` class still applied (the JSX does not branch on PRM)" — covers SPEC AC #8 ("With `prefers-reduced-motion: reduce`, the pulse collapses to a static amber outline; the `NOW` badge remains") at the JSX layer.
Tag: edge / a11y.

#### C-m7b-007 — success (`<DraggableTimelineBlock isActive={true}>` threads `isActive` to inner `<TimelineBlock>`)

Target file: `components/DraggableTimelineBlock.test.tsx` (EXISTS — m7b appends `isActive`-prop cases)
Layer: Component
**GIVEN** the `<DraggableTimelineBlock>` component with `isActive={true}` and the standing M6 drag-context wrapper (`DndContext` mock per M6 precedent)
**WHEN** rendered into JSDOM
**THEN** the inner `<TimelineBlock>` (queryable via the existing `data-component="timeline-block"` selector) has its `className` containing `"is-active"` AND a child `data-testid="now-tag"` is present in the subtree (the prop is threaded byte-identically).
**AND** when the test re-renders with `isActive={false}`, the inner TimelineBlock no longer has the class and no longer renders the badge — the prop flows through correctly in both directions.
Proves: plan.md § Components — `<DraggableTimelineBlock>` "New optional prop `isActive?: boolean` (default `false`). Passes through to `<TimelineBlock isActive={isActive} … />`. No other change." — covers SPEC AC #6 (active styling threads through the drag wrapper) + § Edge cases ("Active block is being drag-reordered (M6) — The `is-active` class follows the card").
Tag: success.

#### C-m7b-008 — regression (`<DraggableTimelineBlock isActive={false}>` (default) — byte-identical to today)

Target file: `components/DraggableTimelineBlock.test.tsx`
Layer: Component
**GIVEN** the `<DraggableTimelineBlock>` component with the `isActive` prop OMITTED (defaulting to `false`) AND with `isActive={false}` explicit
**WHEN** rendered into JSDOM in both modes
**THEN** in BOTH modes: the inner TimelineBlock has no `is-active` class; no `<NowTag>` in DOM; the rendered subtree's `outerHTML` matches the pre-M7b baseline; every existing M5/M6 DraggableTimelineBlock test passes unchanged.
Proves: plan.md § Regression surface — "DraggableTimelineBlock.test.tsx — same pattern; `isActive` defaults to `false`; existing tests unchanged" — covers SPEC AC #11.
Tag: regression.

#### C-m7b-009 — success (`<Timeline>` — applies `isActive={true}` to EXACTLY ONE block — the one whose `[start, end)` contains `now`)

Target file: `components/Timeline.test.tsx` (EXISTS — m7b appends active-block cases; existing tests using `now` values that fall in a block remain green per plan § Regression surface)
Layer: Component
**GIVEN** the `<Timeline>` component with the `stateFourBlocks` fixture (4 blocks: blk-A `08:00–09:00`, blk-B `09:00–10:00`, blk-C `10:00–11:00`, blk-D `11:00–12:00`) and `now = "09:30"` (mid-blk-B)
**WHEN** rendered into JSDOM
**THEN** `document.querySelectorAll('[data-component="timeline-block"].is-active').length === 1` AND that one node corresponds to blk-B (verified by reading its `data-testid` or its rendered title, depending on the M5/M6 test selector convention).
**AND** the other three block nodes (blk-A, blk-C, blk-D) do NOT carry `is-active` AND do NOT render a `<NowTag>` child (`document.querySelectorAll('[data-testid="now-tag"]').length === 1`).
**AND** the test additionally asserts that the activeId computation respects the half-open contract by re-rendering with `now = "09:00"` (blk-B's start boundary) → blk-B is active; `now = "10:00"` (blk-B's end / blk-C's start) → blk-C is active (NOT blk-B); `now = "08:00"` (blk-A's start) → blk-A is active. These three sub-assertions reuse the same fixture; they prove the boundary contract holds end-to-end (not just at the unit level).
Proves: plan.md § Components — `<Timeline>` "compute `const activeId = activeBlockId(visibleBlockList, now);` once per render at the top of the component … Thread `isActive={item.block.id === activeId}` into every `<TimelineBlock>` / `<DraggableTimelineBlock>` render path" + § Active-block wiring at the Timeline level — covers SPEC AC #6 + AC #7 ("Exactly one block at a time carries the `is-active` styling").
Tag: success.

#### C-m7b-010 — edge (`<Timeline>` — when no block contains `now`, applies `isActive={false}` to every block; no `.is-active` in DOM; no `<NowTag>` anywhere)

Target file: `components/Timeline.test.tsx`
Layer: Component
**GIVEN** the `<Timeline>` with `stateFourBlocks` (08:00–12:00 coverage) and `now = "06:30"` (before all)
**WHEN** rendered into JSDOM
**THEN** `document.querySelectorAll('.is-active').length === 0` AND `document.querySelectorAll('[data-testid="now-tag"]').length === 0`.
**AND** the test re-renders with `now = "23:30"` (after all) — same assertions hold (no active block, no badge).
**AND** the test re-renders with `now = "12:00"` (boundary — exactly at blk-D's end; half-open ⇒ no block active) — same assertions hold.
Proves: plan.md § Edge cases — "Before / between / after all blocks: `activeBlockId(visibleBlockList, now)` returns `null`. No block receives `isActive={true}`; no card has `.is-active`; no `<NowTag />` renders." — covers SPEC AC #6 + the "Before the first block, between blocks, after the last block" edge case.
Tag: edge.

#### C-m7b-011 — success (`<Timeline>` — `is-active` migrates with the `now` prop tick — blk-B → blk-C → blk-D across three sequential rerenders)

Target file: `components/Timeline.test.tsx`
Layer: Component
**GIVEN** the `<Timeline>` with `stateFourBlocks` and initial `now = "09:30"` (mid-blk-B)
**WHEN** the test calls `rerender` with `now = "10:30"` (mid-blk-C) then `rerender` with `now = "11:00"` (boundary — blk-D's start; half-open ⇒ blk-D is active, NOT blk-C)
**THEN** at the initial render: blk-B carries `is-active`; blk-A/C/D do not. After the first rerender (`now = "10:30"`): blk-C carries `is-active`; blk-B no longer does. After the second rerender (`now = "11:00"`): blk-D carries `is-active`; blk-C no longer does.
**AND** the migration happens cleanly — the test asserts `document.querySelectorAll('.is-active').length === 1` at every step (exactly one block carries the class, even mid-transition).
**AND** the `<NowTag>` migrates with the class — `screen.getByTestId("now-tag")` is contained in the active block's subtree at every step (verified by `outer.contains(badge)` where `outer` is the `.is-active` node).
Proves: plan.md § Active-block wiring + § Components — `<Timeline>` "The Timeline does NOT compute or render the NOW badge itself — that responsibility belongs to TimelineBlock so the badge inherits the card's expand/jiggle/edit lifecycle" — covers SPEC AC #7 ("when `now` crosses into the next block's interval (within the 60 s tick budget), the styling migrates") + the "Block exactly at the boundary (`now == block.end`)" edge case.
Tag: success / migration.

#### C-m7b-012 — edge (`<Timeline>` — empty `items` list does not throw; no `.is-active` in DOM)

Target file: `components/Timeline.test.tsx`
Layer: Component
**GIVEN** the `<Timeline>` with `items={[]}` (no blocks, no timed loose bricks) and `now = "09:30"`
**WHEN** rendered into JSDOM
**THEN** the render does NOT throw; `document.querySelectorAll('.is-active').length === 0`; `document.querySelectorAll('[data-testid="now-tag"]').length === 0`; the Timeline's static chrome (hour grid, SlotTapTargets, NowLine, EmptyBlocks fallback) still renders byte-identical to the existing empty-items test.
Proves: plan.md § Active-block wiring at the Timeline level — `visibleBlockList = items.filter(…).map(…)` yields `[]` when items is empty; `activeBlockId([], now)` returns `null`; no block receives `isActive={true}` + § Performance — "Per-render cost: `activeBlockId` is `O(n)` over `visibleBlockList`" (O(0) when empty) — covers SPEC AC #1 + the empty-Day edge case (no regression to the Empty Day path).
Tag: edge.

#### C-m7b-013 — edge (`<Timeline>` — block deleted via `deletions` (M5) for today is NOT a candidate; appliesOn-suppressed (post-M5b) forward-compatible)

Target file: `components/Timeline.test.tsx`
Layer: Component
**GIVEN** the `stateDeletionFiltered` fixture (`state.blocks = [blk-A 09:00–10:00, blk-B 09:30–10:30]` with `deletions: { "2026-05-18": ["blk-A"] }`); BuildingClient runs `currentDayBlocks(state)` and passes `items = [{ kind: "block", block: blk-B }]` to `<Timeline>` (the test hand-assembles this — blk-A is intentionally absent from `items` to simulate the M5 deletions filter); `now = "09:45"` (would-have-been inside blk-A's `[09:00, 10:00)` AND IS inside blk-B's `[09:30, 10:30)`)
**WHEN** rendered into JSDOM
**THEN** only blk-B is rendered (no DOM node corresponds to blk-A); blk-B carries `is-active`; `document.querySelectorAll('.is-active').length === 1`; the `<NowTag>` is a child of blk-B's subtree.
**AND** a separate parallel sub-assertion: a future-state fixture where the `items` prop already excludes a block (simulating the post-M5b `appliesOn`-suppression case once M5b ships — `currentDayBlocks` will also filter by `appliesOn`); the same contract holds — the suppressed block is not in the DOM, is not a candidate for active, and the next valid block (if any) takes the badge.
**AND** the test documents the plan's "visibleBlockList NOT state.blocks" decision: the activeId computation reads from `items` (post-filter), never from `state.blocks` directly. A mutant computing activeId against raw `state.blocks` would pick blk-A first (source order) but blk-A is not in the DOM, so the `.is-active` class would attach to nothing, and `querySelectorAll('.is-active').length === 1` would fail (the count would be `0`).
Proves: plan.md § Active-block wiring — "Why `visibleBlockList` not `state.blocks`: the spec mandates the active-block predicate runs against `visibleBlocks` (i.e., the post-`deletions` filter from M5's `currentDayBlocks`) — a block deleted 'just today' must not pulse today" + § Edge cases — "Block deleted via `deletions` for today: filtered out by `currentDayBlocks(state)` before reaching `<Timeline>`" + "Block where `appliesOn` returns false today (post-M5b): same automatic exclusion. M7b is forward-compatible" — covers SPEC § Edge cases ("A block deleted via `deletions` for today → does not appear in `visibleBlocks` so cannot be the active block" + "A block whose `appliesOn` returns false for today (post-M5b) → does not appear in `visibleBlocks` so cannot be the active block").
Tag: edge / M5b-forward-compatibility.

#### C-m7b-014 — regression (`<NowLine>` — rendered `boxShadow` style string includes the new larger-halo token `0 0 12px rgba(251, 191, 36`)

Target file: `components/NowLine.test.tsx` (EXISTS — m7b appends the larger-halo regression case; existing position-update tests stay byte-identical per plan § Regression surface)
Layer: Component
**GIVEN** the `<NowLine now="09:30" />` component rendered into JSDOM
**WHEN** the test inspects `node.style.boxShadow`
**THEN** the string contains BOTH substrings: `0 0 6px var(--accent)` (the inner amber halo — small) AND `0 0 12px rgba(251, 191, 36` (the outer larger soft halo — `0.45` alpha — verified via regex `/0 0 12px rgba\(251,\s*191,\s*36,\s*0\.45\)/`). The exact comma+whitespace pattern is browser/JSDOM-normalized — the regex tolerates `rgba(251, 191, 36, 0.45)` or `rgba(251,191,36,0.45)` (both forms appear in JSDOM-computed styles depending on the engine version).
**AND** the existing position assertion (the `top: …px` derived via `timeToOffsetPx(now, HOUR_HEIGHT_PX)`) is byte-identical to today — the larger halo is a `box-shadow` token change ONLY; the positioning math is unchanged.
**AND** the `data-testid="now-line"`, `role="img"`, `aria-label="Now 09:30"` (the existing M1 `aria-label` with `{now}` interpolation), and class chain are byte-identical to today — only the `boxShadow` inline-style string differs.
Proves: plan.md § File structure — `components/NowLine.tsx` "change the inline `boxShadow: '0 0 4px var(--accent)'` to a larger, softer `boxShadow: '0 0 6px var(--accent), 0 0 12px rgba(251, 191, 36, 0.45)'`" + § Design tokens — "Now-line halo (M7b): `box-shadow: 0 0 6px var(--accent), 0 0 12px rgba(251, 191, 36, 0.45)` — small inner + larger soft outer. Static." — covers SPEC AC #4 ("The Timeline's now-line renders with a soft amber drop-shadow / box-shadow visible on dark theme") + SG-m7b-03 (visual-hierarchy resolution — small inner halo + larger outer).
Tag: regression / success.

### Accessibility (axe via Playwright) — deferred to preview

`A-m7b-001..003` exercise the axe-clean contract on the active-block + NOW badge + reduced-motion paths. All three IDs are authored as real `test()` blocks under `e2e/m7b-a11y.spec.ts` but executed on the Vercel preview (consistent with M5b/M9a/M9b/M9c/M9d/M9e/M7a precedent — the sandbox lacks the throttled preview-axe harness).

#### A-m7b-001 — success (axe-clean Day view with one active block — NOW badge contrast + non-text box-shadow contrast pass; existing TimelineBlock a11y tree shape unchanged)

Target file: `e2e/m7b-a11y.spec.ts` (NEW — deferred-to-preview)
Layer: Accessibility (axe via Playwright)
**GIVEN** the deployed Day view at the preview URL, with the test fixture pre-seeded via `localStorage` (the M8/M9b/M7a pattern) such that `useNow()` returns a time inside one of the visible blocks (e.g., fixture `stateFourBlocks` + Playwright clock override to `"09:30"`)
**WHEN** the Playwright test injects `@axe-core/playwright` and runs `new AxeBuilder({ page }).analyze()`
**THEN** the returned `violations` array is **empty** (zero violations). The axe rules of interest: `color-contrast` (the NOW badge text on accent fill — must pass AAA at ≥ 7:1, well above the AA 4.5:1 threshold axe checks); `aria-valid-attr` (the badge's `aria-label="Now"` is a valid attribute on a `<span>`); `region` (the TimelineBlock's existing `aria-expanded` chain is unaffected); `presentation-role-conflict` (the badge's default generic role is consistent with `pointer-events: none`).
**AND** a separate axe run with `now` forced past all blocks (`"23:30"` → no active block) is also zero-violations — the no-active state is a11y-clean (the existing M1–M9e selectors and a11y tree are unchanged in the no-pulse case).
Proves: plan.md § Accessibility — "axe: zero violations expected on a TimelineBlock with `isActive={true}`. VERIFIER runs axe on the preview" + § Design tokens — "NOW badge text: `color: var(--bg)` (= `#07090f`). Contrast vs. `--accent` (`#fbbf24`) ≈ 14.7:1 — WCAG AAA" — covers SPEC AC #10 ("the `NOW` badge text is `aria-label`'d for screen readers") + AC #6 (a11y of the active-block surface).
Tag: success / a11y / preview-deferred.

#### A-m7b-002 — success (NOW badge `aria-label="Now"` is announced by the AT surface; the visible "NOW" text is decorative and not double-announced)

Target file: `e2e/m7b-a11y.spec.ts`
Layer: Accessibility (axe via Playwright)
**GIVEN** the deployed Day view with one active block (same fixture as `A-m7b-001`)
**WHEN** Playwright queries the rendered accessibility tree via `page.accessibility.snapshot()` (the Chromium-DevTools-Protocol-backed snapshot of the a11y tree) and locates the `<span data-testid="now-tag">` node
**THEN** the snapshot entry for the badge node has `name === "Now"` (the `aria-label` is what AT users hear) — NOT `"NOW"` (the visible text is overridden by the explicit `aria-label` per ARIA name-computation rules, so AT users hear "Now" once, not "Now NOW" or "NOW").
**AND** the badge is NOT in the focusable set (`page.keyboard.press("Tab")` repeatedly through the page's focusable chain never lands on the badge — the badge has no `tabindex` and is `pointer-events: none`).
Proves: plan.md § Accessibility — "NOW badge a11y: `aria-label='Now'` — concise label preferred over the visible 'NOW' text (the visible string is decorative; AT users hear 'Now')" + "The badge is non-interactive (no role; no `tabindex`; `pointer-events: none`); it does not enter the focus chain" — covers SPEC AC #10 + § Accessibility (Tab order unchanged).
Tag: success / a11y / preview-deferred.

#### A-m7b-003 — edge (reduced-motion path on the preview — no animation runs but the `.is-active` static outline + NOW badge remain; axe-clean)

Target file: `e2e/m7b-a11y.spec.ts`
Layer: Accessibility (axe via Playwright)
**GIVEN** the deployed Day view with one active block, with Playwright's `page.emulateMedia({ reducedMotion: "reduce" })` activated BEFORE the page loads (CDP-level forced media query)
**WHEN** the Playwright test inspects the rendered DOM via `page.evaluate(() => getComputedStyle(document.querySelector('.is-active')).animationName)` AND inspects `getComputedStyle` for the static box-shadow
**THEN** the computed `animation-name` for the `.is-active` element is `"none"` (the PRM `@media` override took effect; the `nowPulse` keyframe is suppressed); the computed `box-shadow` includes the static `0 0 0 1.5px` amber outline substring (the fallback outline survives so the user can still see which block is current).
**AND** the NOW badge is still present in the DOM (`page.locator('[data-testid="now-tag"]').count() === 1`); axe runs zero violations on the PRM-active page.
**AND** the now-line's halo is byte-identical to non-PRM (the now-line halo is a static `box-shadow`, not motion — the test asserts the same `0 0 12px rgba(251, 191, 36` substring is in the now-line's computed style under PRM).
Proves: plan.md § Edge cases — "`prefers-reduced-motion: reduce`: (a) Now-line halo unchanged (it's not motion). (b) `.is-active` class still applied. (c) CSS `@media (prefers-reduced-motion: reduce)` rule replaces `animation: nowPulse …` with `animation: none !important;` and sets a static `box-shadow: 0 0 0 1.5px var(--accent);`. (d) `<NowTag />` renders unchanged." + § Design tokens — "Reduced motion (PRM)" row — covers SPEC AC #8 verbatim.
Tag: edge / a11y / preview-deferred.

### E2E (Playwright) — deferred to preview

`E-m7b-001..005` exercise the live preview-deployment behavior — Lighthouse Performance, pulse frame rate, multi-block migration via Playwright clock override, now-line halo visibility, badge migration on a real tick. All five IDs are authored as real `test()` blocks under `e2e/m7b.spec.ts` but executed on the Vercel preview (the sandbox lacks Lighthouse and the frame-rate trace harness; the M5b/M9a–M9e/M7a precedent for deferred-to-preview E2E carries forward).

#### E-m7b-001 — success (preview Day view — exactly one block carries `.is-active` matching the active-block predicate against `useNow()`'s current value)

Target file: `e2e/m7b.spec.ts` (NEW — deferred-to-preview)
Layer: E2E (Playwright)
**GIVEN** the deployed Day view at the preview URL, with the test fixture pre-seeded via `localStorage.setItem("dharma:v3", JSON.stringify(stateFourBlocks))` (the M8/M9b/M7a pattern) AND the Playwright clock overridden via `page.clock.setFixedTime(new Date("2026-05-18T09:30:00"))` so `useNow()` deterministically returns `"09:30"` on first tick
**WHEN** the page loads and the post-hydration first paint completes
**THEN** `page.locator('[data-component="timeline-block"].is-active').count() === 1` AND the one match's text content matches blk-B's title; `page.locator('[data-testid="now-tag"]').count() === 1` AND it is contained within the `.is-active` element's subtree.
**AND** the test takes a screenshot (visual diff baseline for VERIFIER inspection) at the moment of stable pulse — the screenshot captures the active block with its outline glow + NOW badge in the top-right (sanity check for SG-m7b-02 placement + SG-m7b-03 visual hierarchy).
Proves: plan.md § Active-block wiring + § Components — `<Timeline>` activeId thread — covers SPEC AC #6 + AC #7 on the live preview.
Tag: success / preview-deferred.

#### E-m7b-002 — success (preview — when `now` is forced past blk-B's end via Playwright clock tick, the NOW badge + `.is-active` class migrate to the next block within the 60 s tick budget)

Target file: `e2e/m7b.spec.ts`
Layer: E2E (Playwright)
**GIVEN** the deployed Day view with `stateFourBlocks` pre-seeded; Playwright clock set initially to `"09:30"` (mid-blk-B)
**WHEN** the test advances the clock via `page.clock.fastForward(1860 * 1000)` (31 minutes — past blk-B's end `10:00` and into blk-C's mid-interval at `10:01` ... wait, that's actually `10:01`, which is mid-blk-C `[10:00, 11:00)` ✓; the 31-minute advance is chosen to cross the boundary while staying well inside the 60 s tick budget at both endpoints)
**THEN** within 65 seconds of the clock advance (the `useNow()` tick is 60 s; allow 5 s for the next render to commit), `page.locator('[data-component="timeline-block"].is-active')` now matches blk-C (NOT blk-B); the NOW badge is contained in blk-C's subtree; exactly one block carries the class throughout the transition (no flicker, no two-block-active state).
**AND** the test further advances the clock past blk-D's end (`page.clock.fastForward((23 * 60 + 30) * 60 * 1000)` — to `23:30`); after the next tick, no block carries `.is-active` (the no-active state — AC for "after the last block").
Proves: plan.md § Edge cases — "Tick frequency (60 s `useNow`): `now` changes once per minute … The active-block migration is per-tick, not real-time" + spec § Edge cases — "Tick frequency → `useNow()` ticks every 60 s; the `NOW` tag may linger up to 59 s past a block end before it migrates" — covers SPEC AC #7 on the live preview.
Tag: success / migration / preview-deferred.

#### E-m7b-003 — success (preview — pulse animation runs at ≥ 55 fps over a 5 s trace; `box-shadow` is the only animated property)

Target file: `e2e/m7b.spec.ts`
Layer: E2E (Playwright)
**GIVEN** the deployed Day view with one active block (fixture pre-seeded; clock set to a mid-block value); the Chromium DevTools tracing API enabled via `page.context().tracing.start({ screenshots: false, snapshots: false })`
**WHEN** the test records a 5-second trace covering the pulse animation; the trace captures all `RasterTask` and `CompositeLayers` events on the compositor thread
**THEN** the measured frame rate over the 5 s window is **≥ 55 fps** (the M7b plan's perf budget — see plan § Performance "The pulse keyframe animates `box-shadow` only — compositor-cheap on modern browsers. No reflow. No main-thread spike."). The measurement uses `performance.getEntriesByType("frame")` or the trace's per-frame paint count divided by elapsed time.
**AND** the trace's main-thread `Recalculate Style` and `Layout` events triggered BY the `nowPulse` keyframe specifically are **zero** (the keyframe animates `box-shadow` only — no reflow, no style-recalc cascade). A mutant animating `border-width` instead of `box-shadow` would trigger per-frame layout passes and would fail this assertion.
Proves: plan.md § Performance — "CSS keyframe: `box-shadow` animation runs on the compositor in modern engines. No reflow; no main-thread cost." + spec AC #10 ("the pulse animation runs at ≥ 55 fps over a 5 s trace") — covers SPEC AC #10 verbatim.
Tag: success / perf / preview-deferred.

#### E-m7b-004 — success (preview — Lighthouse Performance ≥ 90 on the Day view with one active block pulsing)

Target file: `e2e/m7b-lighthouse.spec.ts` (NEW — deferred-to-preview; pattern matches M5b/M7a Lighthouse E2E)
Layer: E2E (Playwright + Lighthouse)
**GIVEN** the deployed Day view at the preview URL, with one active block (fixture pre-seeded; clock at a mid-block value) and the pulse animation running
**WHEN** the test invokes the Lighthouse CI runner (or the `playwright-lighthouse` package, per M7a precedent) against the preview URL with the standard mobile preset
**THEN** the reported Performance score is **≥ 90** (matching the spec AC #10 budget and the M7a/M5b precedent). The score breakdown shows zero new long tasks attributable to the pulse keyframe (the per-keyframe cost is compositor-cheap).
**AND** the Lighthouse Accessibility score remains **100** (the NOW badge a11y is clean per `A-m7b-001..003`).
Proves: plan.md § Performance — "Lighthouse: zero new asset weight … Perf budget delta: negligible" + spec AC #10 ("Lighthouse Performance ≥ 90") — covers SPEC AC #10 verbatim.
Tag: success / perf / preview-deferred.

#### E-m7b-005 — success (preview — now-line halo is visible on the dark theme; the new outer 12px halo renders alongside the inner 6px halo)

Target file: `e2e/m7b.spec.ts`
Layer: E2E (Playwright)
**GIVEN** the deployed Day view at the preview URL, with any non-empty state seeded (the now-line renders regardless of active-block presence)
**WHEN** the test inspects the rendered `<NowLine>` via `page.locator('[data-testid="now-line"]').first().evaluate(node => getComputedStyle(node).boxShadow)`
**THEN** the computed `boxShadow` string contains BOTH substrings: `12px` (the outer larger halo radius) AND `rgba(251, 191, 36` (the outer halo color with alpha) AND `6px` (the inner halo radius). The test does NOT pixel-diff the halo — JSDOM and headless Chromium produce slightly different `box-shadow` serialization formats; the substring approach is robust.
**AND** under Playwright's `page.emulateMedia({ reducedMotion: "reduce" })`, the halo computed style is **byte-identical** — the now-line's halo is a `box-shadow`, not motion, so PRM does not affect it (verified for the parallel cross-check to `A-m7b-003`).
Proves: plan.md § File structure — `components/NowLine.tsx` modification row + § Design tokens — "Now-line halo (M7b)" row + § Components — `<NowLine>` "Under reduced motion the halo is unchanged — `box-shadow` is not motion" — covers SPEC AC #4 ("The Timeline's now-line renders with a soft amber drop-shadow / box-shadow visible on dark theme") on the live preview.
Tag: success / preview-deferred.

### Sandbox / preview note

Five E2E IDs and all three A11y IDs are explicitly **deferred to the Vercel preview run**: `E-m7b-001..005` require either a real Lighthouse audit (`E-m7b-004`), a real Chromium frame-rate trace (`E-m7b-003`), a real `localStorage`-seeding + `page.clock` setup (`E-m7b-001..002`, `E-m7b-005`), or a real headless-Chromium computed-style inspection (`E-m7b-005`). `A-m7b-001..003` require axe scans against a deployed build (the sandbox's local dev server has the `devIndicators: false` setting per ADR-029, but axe runs more reliably against the production-build output served by Vercel). The 23 Vitest IDs (`U-m7b-001..009` + `C-m7b-001..014`) run in the sandbox under `npm test` and `npm run test:tz`. Authoring all eight preview-deferred IDs as real `test()` blocks is mandatory (M5b/M9c/M7a precedent — preview-deferred ≠ untested).

### Retired / amended test IDs

M7b is **additive at every seam.** The plan's § Regression surface flags four narrow sanctioned amendments and two byte-identical additive surfaces; the TESTS author honors them exactly:

- **`components/TimelineBlock.test.tsx`** — gains new `isActive`-prop cases (`C-m7b-004..006`). Existing M0/M2/M3/M5/M6 tests do NOT pass `isActive` explicitly; the default `false` keeps them byte-identical (no `is-active` class, no `<NowTag>` in DOM). Zero existing assertion is rewritten.
- **`components/DraggableTimelineBlock.test.tsx`** — gains new `isActive`-prop cases (`C-m7b-007..008`). Same pattern; default `false`; existing tests unchanged.
- **`components/Timeline.test.tsx`** — gains new active-block cases (`C-m7b-009..013`). Existing M2/M3/M5b/M6/M7a Timeline tests render with various `now` values; the new activeId computation runs on every render but is a no-op when none of the existing fixtures' blocks contain the test's `now`. If any pre-M7b Timeline test fixture's `now` happens to fall inside a block's `[start, end)`, the rendered block will gain the `is-active` class — that is **correct M7b behavior**, not a regression; the test only fails if it asserts the absence of `is-active`, which no pre-M7b test does (verified by inspection of the file per plan § Regression surface). New M7b tests assert `is-active` presence/absence explicitly.
- **`components/NowLine.test.tsx`** — gains the larger-halo regression case (`C-m7b-014`). Existing position-update tests stay byte-identical; the inline `boxShadow` string changes but no pre-M7b test snapshots the full inline `style` object (verified by inspection). Zero existing assertion is rewritten.
- **`lib/globals-tokens.test.ts`** (or NEW `lib/m7b-globals.test.ts`, PLANNER's choice) — gains the `--motion-now-pulse-duration` + `@keyframes nowPulse` + `.is-active` + PRM override assertions (`U-m7b-009`). If appended to the existing M0 file, the M0 assertions stay byte-identical.
- **No other M0–M9e / M5b / M6 / M7a test** asserts the absence of an `is-active` class on TimelineBlock, the absence of a `<NowTag>` in DOM, the absence of an `isActive` prop on Timeline/TimelineBlock/DraggableTimelineBlock, the smaller 4px halo on NowLine, the absence of `--motion-now-pulse-duration` in globals.css, or the absence of the `@keyframes nowPulse` rule. Additive everywhere.

**VERIFIER: please ratify the box-shadow halo intensity pulse variant (over literal opacity dim on the whole card) as expected, sanctioned M7b collateral** — exactly as M7a's `BuildingClient` `hydrated?: boolean` default-to-`true` amendment was ratified. The plan's § Open questions for VERIFIER surfaces this as the first of two non-blocking ratification questions; the tests (`U-m7b-009`, `E-m7b-003`) are written against the box-shadow halo variant. If VERIFIER prefers the literal-opacity alternative, `U-m7b-009`'s keyframe substring assertion is amendable (the keyframe would assert `opacity: 0.6` and `opacity: 1.0` substrings instead of the two `box-shadow` levels), and `E-m7b-003`'s "box-shadow is the only animated property" assertion would swap to "opacity is the only animated property"; the AC #6/AC #7 assertions are identical either way. **No ADR-binding decision; VERIFIER picks freely.**

**VERIFIER: please ratify the `activeId` compute location — inside `<Timeline>` vs. inside `<BuildingClient>`** — as the second non-blocking ratification question. Plan baseline computes `activeId` inside `<Timeline>` (the predicate lives near the component that uses it); `C-m7b-009..013` are written against this baseline (they render `<Timeline now="..." items={...} />` and assert the activeId is computed internally). If VERIFIER prefers the BuildingClient alternative, the tests are amendable to render `<Timeline now="..." items={...} activeId="blk-B" />` (an explicit prop) and assert the threading is byte-identical; the AC assertions are identical either way (still exactly one block carries `is-active`, still migrates with `now`). **No ADR-binding decision; VERIFIER picks freely.**

### Spec gaps surfaced for VERIFIER

The plan resolves **all three** of the spec's named gaps in-plan (SG-m7b-01..03 — see plan.md § Resolutions to the 3 Open Spec Gaps; all three RESOLVED verbatim per the spec recommendation) and the TESTS phase covers the plan faithfully. Each SG resolution is anchored to at least one test ID:

| SG        | Resolution (per plan.md § Resolutions)                                                                                                                                                                                                          | Anchoring test ID(s)                                            |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| SG-m7b-01 | Pulse cadence — 1.8 s `ease-in-out`, declared as CSS variable `--motion-now-pulse-duration: 1800ms` in `:root` next to `--motion-stagger`; keyframe animates `box-shadow` halo intensity (plan baseline variant — VERIFIER may swap to opacity) | `U-m7b-009`, `E-m7b-003`                                        |
| SG-m7b-02 | NOW badge — top-right (4 px from each edge ≈ 8 px corner inset), `var(--accent)` fill, `var(--bg)` ink (WCAG AAA ≥ 14.7:1), `--fs-10` JetBrains Mono caps, `aria-label="Now"`                                                                   | `C-m7b-001`, `C-m7b-002`, `C-m7b-003`, `A-m7b-001`, `A-m7b-002` |
| SG-m7b-03 | Now-line halo is small (6px inner + 12px outer at 0.45 alpha) and static; active-block pulse is larger (14–22px) and breathing — visual hierarchy: eye lands on active block first, now-line reads as "exact moment within"                     | `C-m7b-014`, `E-m7b-005`, `E-m7b-001` (visual diff)             |

Two **non-blocking mechanism choices** are surfaced for VERIFIER ratification (plan-level, not ADR-binding):

1. **Pulse variant — box-shadow halo intensity (plan baseline) vs. literal opacity 0.6 → 1.0 → 0.6 (spec's literal wording).** Plan baseline animates `box-shadow` so the card content remains fully visible while the halo "breathes"; alternative dims the whole card per the spec's literal text. Both are testable; switching is a 4-line CSS change. `U-m7b-009` + `E-m7b-003` written against the box-shadow variant; amendable to opacity with substring swap if VERIFIER chooses. **Pass-through to VERIFIER per plan § Open questions.**
2. **`activeId` compute location — inside `<Timeline>` (plan baseline) vs. inside `<BuildingClient>` (alternative — pass `activeId` as a Timeline prop).** Plan baseline is locally cohesive (predicate lives near consumer); alternative is "data flows down" — matches BuildingClient's existing `visibleBlocks` derivation pattern. `C-m7b-009..013` written against the baseline; amendable to the BuildingClient-computed variant with the same AC outcomes. **Pass-through to VERIFIER per plan § Open questions.**

No ADR is reversed: **ADR-006** (half-open `[start, end)` block intervals) — `U-m7b-001` + `C-m7b-009..011` enforce it end-to-end at the boundaries; **ADR-023** (`useNow()` is the sole clock; 60 s tick budget) — `U-m7b-006` (no clock read), `E-m7b-002` (60 s tick migration on preview); **ADR-013 / ADR-022** (one-feature-per-dispatch) — m7b is one feature group, one BUILDER dispatch (per plan § Feature grouping); **ADR-018** (overrides keyed map) — irrelevant for m7b (no AppState mutation; documented as inapplicable in plan); **ADR-031** (≥ 44 px touch targets) — no new interactive element; NOW badge is `pointer-events: none` (`C-m7b-003` asserts); **ADR-043** (`assertNever` exhaustiveness) — no new `Action` union member; **ADR-044 / ADR-045** (`schemaVersion` discipline; `history` read-only) — m7b introduces NO `schemaVersion` bump (still `3`); **ADR-046** (period-aggregate helpers pure) — unaffected (m7b does no aggregation); **ADR-047** (M5 `currentDayBlocks` resolves `deletions` only) — `C-m7b-013` consumes the M5 filter and asserts forward-compatibility with M5b's `appliesOn` filter.

### AC → test-ID coverage map (all 11 ACs accounted for)

| AC# | Acceptance criterion (paraphrased)                                                                                                                                                                                                                                                                                                                                        | Test ID(s)                                                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #1  | `lib/activeBlock.ts` exports `activeBlockId(blocks, now): string \| null` — pure (no clock reads, no `localStorage`, no mutation)                                                                                                                                                                                                                                         | `U-m7b-001..008`, especially `U-m7b-006` (purity), `C-m7b-012` (empty-list call)                                                                                                                      |
| #2  | The predicate uses half-open `[start, end)`: a block whose `start === now` is active; a block whose `end === now` is NOT                                                                                                                                                                                                                                                  | `U-m7b-001`, `U-m7b-008`, `C-m7b-009` (boundary sub-assertions), `C-m7b-011` (`now = "11:00"` boundary migration)                                                                                     |
| #3  | Returns `null` when no block contains `now` or when every visible block has `end === undefined`                                                                                                                                                                                                                                                                           | `U-m7b-002`, `U-m7b-003`, `U-m7b-004`, `C-m7b-010`, `C-m7b-012`                                                                                                                                       |
| #4  | The Timeline's now-line renders with a soft amber drop-shadow / box-shadow visible on dark theme                                                                                                                                                                                                                                                                          | `C-m7b-014`, `E-m7b-005`                                                                                                                                                                              |
| #5  | The glow position updates with `useNow()`'s tick; M7b does not introduce a second clock                                                                                                                                                                                                                                                                                   | `U-m7b-006` (no `Date.now` call in helper) + structural (the NowLine consumes `now` prop; existing M1 NowLine test fixture; no new clock added per plan)                                              |
| #6  | The block card whose id matches `activeBlockId(visibleBlocks, now)` renders with a pulsing CSS keyframe on its outline (or border) and a `NOW` text badge in its top-right corner                                                                                                                                                                                         | `C-m7b-001..003` (NowTag render + a11y + position), `C-m7b-004` (TimelineBlock isActive=true), `C-m7b-009` (Timeline picks exactly one block), `U-m7b-009` (CSS keyframe + class exists), `E-m7b-001` |
| #7  | Exactly one block at a time carries the `is-active` styling; when `now` crosses into the next block's interval (within the 60 s tick budget), the styling migrates                                                                                                                                                                                                        | `C-m7b-009`, `C-m7b-011`, `E-m7b-002`                                                                                                                                                                 |
| #8  | With `prefers-reduced-motion: reduce`, the pulse collapses to a static amber outline; the `NOW` badge remains                                                                                                                                                                                                                                                             | `C-m7b-006`, `U-m7b-009` (PRM override in globals.css), `A-m7b-003`                                                                                                                                   |
| #9  | `tsc --noEmit` clean; ESLint 0 errors (≤13 warnings); full Vitest suite green; `test:tz` green. Vitest covers: `activeBlockId` truth table (before/after blocks, mid-block, on-boundary `start` and `end`, empty `end`, deletions-suppressed, appliesOn-suppressed); Timeline applies `is-active` to exactly one block; reduced-motion path renders no keyframe animation | `U-m7b-001..009`, `C-m7b-006`, `C-m7b-009..013`, `U-m7b-007` (`test:tz` triad) + **gate (`npm run eval`)**                                                                                            |
| #10 | E2E (Playwright, deferred-to-preview): Lighthouse Performance ≥ 90; the pulse animation runs at ≥ 55 fps over a 5 s trace; the `NOW` badge text is `aria-label`'d for screen readers                                                                                                                                                                                      | `E-m7b-003`, `E-m7b-004`, `A-m7b-001`, `A-m7b-002`                                                                                                                                                    |
| #11 | No regression to M1–M9e / M5b / M7a behavior                                                                                                                                                                                                                                                                                                                              | `C-m7b-005`, `C-m7b-008`, `C-m7b-012`, `C-m7b-014` (all byte-identical default-prop paths) + § Retired / amended amendments + **gate (`npm run eval`)**                                               |

**Gate-verified portion:** AC #9's quality-gate half (`tsc` / ESLint / full-Vitest / `test:tz`) — consistent with the M5/M6/M8/M9a/M9b/M9c/M9d/M9e/M7a precedent. AC #11's no-regression half is anchored by the sanctioned amendments in § Retired / amended test IDs (all six surfaces are byte-identical at the existing-test level: TimelineBlock/DraggableTimelineBlock/Timeline default `isActive` to `false` so existing tests are unchanged, NowLine's `boxShadow` string change is not snapshotted by any existing test, globals.css token additions are appended to the existing M0 design-token file) plus `C-m7b-005`/`C-m7b-008`/`C-m7b-012`/`C-m7b-014` (each asserts the default-prop branch is byte-identical to today). All other 9 ACs map to at least one bespoke `m7b` test ID; every `m7b` test ID maps back to at least one AC.

**Edge-case coverage (plan.md § Edge cases table):** Before / between / after all blocks → `U-m7b-002`, `C-m7b-010`; block with `end === undefined` → `U-m7b-003`, `U-m7b-004`; boundary `now === block.start` → `U-m7b-001`, `C-m7b-009`; boundary `now === block.end` → `U-m7b-001`, `C-m7b-011`; deletions-filtered → `C-m7b-013`; appliesOn-suppressed (post-M5b forward-compatibility) → `C-m7b-013` (parallel sub-assertion); 60 s tick budget → `E-m7b-002`; multiple blocks claim `now` (defensive) → `U-m7b-005`; `prefers-reduced-motion: reduce` → `C-m7b-006`, `U-m7b-009`, `A-m7b-003`; active block first/last on timeline → `C-m7b-009` (parameterized boundary cases re-render); active block collapsed vs. expanded → not separately covered (the badge is anchored to the outer `motion.div` which is the same node regardless of `expanded` — structurally covered by `C-m7b-004` which renders with `expanded={false}` and asserts the badge is a child of the outer wrapper); active block in Edit Mode (jiggling) → not separately covered (the badge is a child of the outer `motion.div`; the existing M5/M6 edit-mode jiggle animation is on the same wrapper; structurally inherits); active block drag-reordered → not separately covered (`C-m7b-007` asserts the prop threads through DraggableTimelineBlock; the drag-following behavior is M6's surface and inherits); state update during pulse (brick logged mid-pulse) → not separately covered (the pulse is CSS-only; React re-render preserves `is-active` class as long as `activeId` is unchanged; documented in plan § Edge cases); Lighthouse Performance → `E-m7b-004`; TZ skew across boundaries → `U-m7b-007`; first paint pre-hydration (M7a skeleton) → not separately covered (the m7a skeleton tests `C-m7a-009` already prove `<Timeline>` is not mounted while `hydrated === false`; once mounted, `<Timeline>` consumes the real `now` per `C-m7b-009..013`). Edge cases not separately covered are documented as structurally inherited or out-of-band — VERIFIER may ask for additional IDs if any inherit case warrants its own GIVEN/WHEN/THEN.
