# Changelog — M3

## [unreleased]

### Added (M3)

- **M3 — Add Brick Flow + Live Scoring + Visual Fill:** first interactive verb on bricks.
  Add a brick inside a block (tap block → expand → "+ Add brick") OR standalone via the
  Loose Bricks tray. Three brick kinds — tick / goal / time — with per-type validation.
  Single-instance `<Sheet>` with `view: 'brick' | 'newCategory'` (mirrors M2's
  AddBlockSheet pattern). 57 test IDs closed (`U-m3-001..014`, `C-m3-001..024`,
  `E-m3-001..013`, `A-m3-001..006`); 3 deferred-by-design (AC #38 state injection;
  AC #47/#48 composite gates).
- `components/AddBrickSheet.tsx`, `components/BrickChip.tsx` (re-authored from
  `[obsolete]`), `components/HeroRing.tsx`, `components/LooseBricksTray.tsx` — new.
- `lib/celebrations.ts` — `useCrossUpEffect` hook for one-shot cross-up detection.
  Powers block 100% bloom and day 100% fireworks (wired in M3; user-driven trigger
  arrives with M4 logging).
- `lib/blockValidation.ts:isValidBrickGoal`, `isValidBrickTime` (integer >= 1
  validators).
- Locked Phase-1 Brick discriminated union (`kind` discriminator; `id` / `categoryId` /
  `parentBlockId` FKs; goal `count`/`target`/`unit`; time `minutesDone`/`durationMin`).
- `categoryDayPct(state, categoryId)` in `lib/dharma.ts` — bricks attribute to THEIR
  own category (not parent block's); null-category loose bricks excluded from category
  queries but counted in `dayPct(state)`.

### Changed (M3)

- `lib/types.ts` — Brick stub from M2 REPLACED with locked discriminated union;
  `AppState.looseBricks: Brick[]` added; `Action` union extends with `ADD_BRICK`.
- `lib/data.ts` — `defaultState()` returns `{ blocks:[], categories:[], looseBricks:[] }`.
  Reducer routes `ADD_BRICK` by `brick.parentBlockId` (null -> looseBricks;
  non-null -> block.bricks). Immutable updates throughout. `assertNever` preserved.
- `lib/dharma.ts` — `brickPct` updated for renamed schema. `dayPct(blocks: Block[])`
  REPLACED by `dayPct(state: AppState)` — averages over `(blocks union looseBricks)`.
  Empty-state floor `0`. New `categoryDayPct`.
- `components/Hero.tsx` — wraps the numeral inside `<HeroRing>`. Consumes
  `dayPct(state)` (new signature).
- `components/TimelineBlock.tsx` — left scaffold bar (height = blockPct%; color =
  category or `--text-dim`); tap-to-expand reveals `<BrickChip>` list + "+ Add brick"
  ghost button; cross-up bloom hook wired (M4 triggers it).
- `components/BlueprintBar.tsx` — segment opacity = `0.3 + (blockPct/100 x 0.7)`
  clamped `[0.3, 1]`. Aggregation logic preserved from M2.
- `app/(building)/BuildingClient.tsx` — wires AddBrickSheet open/close + ADD_BRICK
  reducer dispatch; mounts `<LooseBricksTray>` between Timeline and BottomBar (gated by
  visibility predicate); wires day-100 cross-up.

### Notes (M3)

- M3 ships the cross-up hook + bloom wiring + HeroRing visual fill; the `fireworks`
  motion token + `public/sounds/chime.mp3` chime asset are **deferred to M4** when
  logging UX arrives to actually drive crossings.
- Two `aria-expanded` lint warnings (`LooseBricksTray.tsx:43`, `TimelineBlock.tsx:62`)
  on `role="region"` / `role="article"` are spec-mandated by AC #44 + #45 and
  intentionally remain as warnings (not suppressed).
- Playwright + axe-core deferred to Vercel preview (sandbox `next dev` socket bind
  failure — M1/M2 pattern). Test files at `tests/e2e/m3.spec.ts` (13 IDs) and
  `tests/e2e/m3.a11y.spec.ts` (6 IDs).
