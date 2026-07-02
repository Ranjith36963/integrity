# Changelog — M11 (Durable History)

## [unreleased]

### Added — Step 4 (part 2): Supabase cloud backup wired in (magic-link login + sync)

- Email **magic-link login** + **automatic cloud backup/sync** across devices, all behind Supabase.
  New: `lib/supabaseConfig.ts` (public URL + anon key baked in — env vars win if present),
  `lib/supabaseClient.ts` (lazy, client-only, null when unconfigured), `lib/useSupabaseSession.ts`
  (auth hook), `lib/supabaseTransport.ts` (the `SyncTransport` over the `dharma_state` row),
  `components/CloudSync.tsx` (background last-write-wins sync — pull-on-signin, debounced push),
  `components/CloudSyncSettings.tsx` (the "Cloud backup" login UI in Settings).
- **Fail-safe by construction:** every network call is wrapped so any error (offline, policy, RLS)
  is a silent no-op with localStorage as the source of truth — nothing is ever lost. When signed
  out / unconfigured the app behaves exactly as before.
- Tests: `lib/supabaseTransport.test.ts` (adapter over a mock client — table/columns, migrate,
  empty-row → null, error surfacing, upsert-on-user_id). 1854 vitest green, 0 type/lint errors,
  production build clean; a browser smoke confirmed the app is stable with the client initialized
  and the login form renders.
- **Live proof is the user's:** this sandbox is network-policy-blocked from Supabase (403), so the
  end-to-end login + cross-device sync is verified in the deployed app. Requires the one-time
  Supabase table (SQL in spec Step 4) — already created by the user.

### Added — Step 4 (part 1): backend-agnostic sync engine (Supabase groundwork)

- `lib/cloudSync.ts` — the correctness-critical, backend-independent core of cross-device backup:
  `decideSync(localUpdatedAt, remote)` implements **last-write-wins** by ISO timestamp and
  `syncOnce(local, localUpdatedAt, now, transport)` orchestrates pull → decide → push over a thin
  `SyncTransport` seam. Pure — never reads the clock or storage.
- Proven by `lib/cloudSync.test.ts` (8): first sync pushes; a fresh device with a newer cloud copy
  **adopts remote and does NOT clobber it**; local-newer pushes; equal → noop. This is the part that
  can lose data if wrong, so it is fully tested here without a backend.
- **Remaining (needs the user's action):** the live Supabase hookup — a `SyncTransport` adapter
  against one `dharma_state` row per authenticated user (jsonb `state` + `updated_at`, row-level
  security), plus a login screen — requires the user to create a free Supabase project and provide
  the **Project URL + anon public key**. Until then the app runs exactly as today (localStorage
  only); no unverified auth/network code is shipped. Tracked in `spec.md` Step 4.

### Added — Step 3b: "Editing past days" setting + gated back-logging (DEC-2)

- A Settings control **"Editing past days"** (read-only / yesterday / up-to-3-days) persisted as an
  additive optional `pastEditDays` (0 | 1 | 3) on the state + v3 schema; default 0 = read-only, and
  0 is never written (so the honest default costs nothing). `SET_PAST_EDIT_DAYS` reducer action.
- `lib/pastEdit.ts` — the single gate `canEditPastDay(state, iso)`: a day is editable only when the
  window > 0, the day is an archived past day (`iso` in history and strictly before `currentDate`),
  and it falls within the chosen window. Pure (no clock read). Plus `pastEditDaysOf`/`daysBetween`.
- `TOGGLE_ARCHIVED_TICK` reducer action back-logs a tick brick on an archived day — **guarded by
  `canEditPastDay`** (a no-op otherwise), immutable (clones the day). `PastDayDetail` renders tick
  bricks as toggles when `canEdit`, threaded from `AppShell` → `WeekView`/`MonthView` via
  `onToggleArchivedTick`. Default stays strictly read-only.
- Back-logging covers **all three brick kinds**: tick (`TOGGLE_ARCHIVED_TICK`), units count
  (`SET_ARCHIVED_UNITS_DONE`, clamped 0..target) and timer minutes (`SET_ARCHIVED_TIMER_ELAPSED`,
  clamped 0..targetMin·60), routed through one unified `ArchivedBrickEdit` callback
  (`AppShell.handleEditArchivedBrick` → reducer). `PastDayDetail` renders a tick toggle and ±
  steppers for units/timer when `canEdit`; all gated by `canEditPastDay` (a no-op otherwise) and
  immutable (clones only the touched day) via a shared `editArchivedBrick` reducer helper.
- Tests: `lib/pastEdit.test.ts` (window matrix + reducer gating for all three kinds + clamping),
  `C-m11-002` (tick toggle + units/timer steppers), a `persist.test.ts` round-trip. 1849 vitest green.

### Added — Step 3a: browsing honesty — missed days read "No entry" (DEC-1)

- The Week/Month/Year views and the tap-a-date drill-down already existed; the data behind them is
  now complete (Steps 1–2). This step makes a backfilled missed day read **"No entry · 0%"** in the
  read-only day detail (`components/PastDayDetail.tsx`) instead of a bare "0%", so a
  zero-by-omission is legible and distinct from a worked-then-scored-0 day — while still counting as
  0% in every average (DEC-1). A normal day keeps its numeric score.
- Tests: `C-m11-001` in `components/PastDayDetail.test.tsx` (missed → "No entry"; normal → numeric).
- Note: the **"Editing past days" setting (DEC-2)** and retroactive back-logging are a separate,
  larger build (past days are strictly read-only today — there is no edit path to gate yet); tracked
  as Step 3b. Off-device cloud backup (Supabase) is Step 4 and requires the user's Supabase project.

### Added — Step 2: backfill missed days + honest archived scores (defect D3, DEC-1)

- **No more holes in history.** Rollover previously archived only the single last-open day and
  jumped to today, so days the user never opened the app simply vanished. Now `rollover` backfills
  every skipped day between (exclusive) the last-open date and today as a **missed day** — an
  immutable snapshot of the routine that applied that date, all completion reset → **0%** — with a
  new optional `missed: true` flag on `ArchivedDay` so the UI can label it **"No entry"** (DEC-1).
- **Past scores are no longer diluted.** Because M11 Step 1 keeps the whole routine in
  `state.blocks`, archiving the raw set would let a past weekday's score be dragged down by
  weekend-only blocks. The archive step now stores the recurrence-**filtered** day the user
  actually saw (deletions + `appliesOn(currentDate)`), so a stored day scores exactly what the live
  hero showed.
- `lib/history.ts` — new `nextISO`, `resetCompletion`, `missedDaySnapshot` helpers; backfill loop
  in `rollover`. `lib/types.ts` + `lib/persistSchemas.ts` — additive optional `missed` on
  `ArchivedDay` (old archived days still validate).
- The existing week/month/year aggregates already counted an in-range missing day as 0%; backfilled
  missed days now score a real 0% for the same result, and each day is individually inspectable.
- Tests: rewrote U-m9b-013 (multi-day skip now backfills); new `lib/backfillMissed.test.ts` proves
  AC-6 (every skipped day backfilled, none beyond today), AC-8 (honest averages over a gap), and the
  archive-not-diluted fix. Verified in a production build: a 5-day gap fills 06-27..07-01 with the
  right missed flags and keeps the routine.

### Fixed — Step 1: rollover preserves the whole routine (defects D1 + D2)

- The nightly rollover dropped every non-timed brick (`seedBrick` returned `null` for
  `hasDuration === false`) and every empty block, silently erasing a routine built from empty
  recurring time-blocks. Empirically: a 32-block routine dated yesterday returned 0 blocks after one
  rollover.
- `lib/history.ts` — `seedFreshDay`/`seedBrick` now treat blocks and bricks as persistent recurring
  templates: each carries forward by its OWN recurrence (a brick inherits its parent block's when it
  has none), independent of `hasDuration`, with completion reset (tick→false, units→0, timer→0).
  Empty recurring blocks carry. New `recurrenceExpired()` drops only a past `just-today` or an ended
  `custom-range`; every-day/weekday/weekend never expire (the Day view filters per date). The
  archive step is unchanged (immutable snapshot of the ending day).
- Tests: the 6 M9b rollover tests that encoded the old drop-behavior were rewritten to the M11
  contract; new `lib/rolloverDurable.test.ts` proves AC-1..AC-4 and that a routine survives **30
  consecutive nightly rollovers** with definitions intact and completion reset. 1817 vitest green.
- Verified in a production build: a routine created, backdated, and reopened days later now
  persists on the timeline and archives the old day (was: every block lost).
