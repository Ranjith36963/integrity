# Changelog — M11 (Durable History)

## [unreleased]

### Fixed — sync audit: three data-loss holes closed (`8c855d4`)

A dedicated deep review of the cloud-sync path (sign-in → pull → reconcile → push) found and
fixed three ways data could be lost or clobbered. Each is pinned by a new test
(`components/CloudSync.test.tsx`, +transport/engine tests; suite 1860 → 1866).

1. **Un-gated push race (HIGH).** The 6-second interval and the `visibilitychange` handler could
   push local state to the cloud _before_ the initial pull-and-reconcile finished — and
   `visibilitychange` fires during sign-in itself (switching to the email app for the code). A
   device with stale data could upsert it over a newer cloud copy with a fresh timestamp. All
   pushes are now gated behind a completed initial reconcile; the interval retries the initial
   sync until it succeeds (so an offline sign-in heals instead of disabling backup).
2. **Version-skew clobber (HIGH).** `migrate()` returns null for a future `schemaVersion` — and
   the transport treated that as "no cloud copy", which `decideSync` answers with a push,
   overwriting newer-format cloud data with an old-format blob. Plausible in practice because the
   PWA's service worker can serve stale app code against newer data. Now: an unrecognizable remote
   row makes `pull()` throw (whole pass no-ops), and unrecognizable _local_ data freezes sync for
   the session — never overwritten by remote, never pushed.
3. **Stranded signed-out edits (MEDIUM).** Edits made while signed out don't advance the local
   timestamp, so the next sign-in's reconcile read "equal timestamps → already in sync" and marked
   the changed content as pushed — leaving those edits cloud-absent until the _next_ edit. A noop
   verdict now also compares content (via the canonical `migrate()` path on both sides); a mismatch
   pushes on the next tick.
4. **(LOW, bookkeeping.)** Adopting a remote copy now stamps the local timestamp with the
   _remote's_ `updated_at` (and a push stamps the pushed time), so the next app open reads "in
   sync" instead of echo-pulling/pushing with a reload.

Deliberately NOT changed (documented limitations): whole-blob last-write-wins means simultaneous
edits on two devices resolve to whichever pushes last (per-field merge remains a future
refinement, per `lib/cloudSync.ts` design note); and signing in with a _different_ account on the
same device would upload the previous account's local data to the new account's row — acceptable
for a single-user app, revisit if accounts are ever shared. A save-time timestamp stamp was
considered for #3 and rejected: the boot-time rollover mutates state, so stamping every save would
make a stale device claim "newest" and clobber real edits — the fix belongs in the sync layer.

### Fixed — sign in with a 6-digit code, not a magic link (session now sticks)

- **The bug:** after tapping the emailed magic link, Settings still showed the signed-out form —
  the app kept asking to sign in even though the link "worked". Root cause: a magic link tapped
  inside the Gmail app opens in a _different_ browser context (Gmail's in-app browser, or a fresh
  Safari tab, or — on iOS — a completely separate storage box from a home-screen PWA) than the one
  the app runs in. Supabase created + stored the session **there**, and the app's browser never saw
  it. Switching to implicit flow earlier didn't help because the problem isn't the flow — it's that
  the session lands in the wrong browser entirely.
- **The fix:** email a **6-digit code** instead of a link. `signInWithOtp` is now called **without**
  `emailRedirectTo` (so Supabase emails the `{{ .Token }}` code, not a link), and a new
  `verifyCode` wraps `supabase.auth.verifyOtp({ email, token, type: "email" })`. The user types the
  code **back into the app**, so the session is created in the _same_ browser the app lives in — and
  therefore persists. On success `onAuthStateChange` fires `SIGNED_IN` and the UI flips to the
  signed-in state automatically.
- Both entry points updated: `components/Welcome.tsx` (the first-brick sign-in) and
  `components/CloudSyncSettings.tsx` (Settings → Cloud backup) now show **email → "Email me a code"
  → 6-digit code input → "Verify"**. Copy no longer mentions magic links.
- **User action required (one-time):** in the Supabase dashboard → Authentication → Email templates
  → **Magic Link**, include `{{ .Token }}` in the body so the email carries the 6-digit code.
- Tests: full suite green (1860 vitest, 0 type/lint errors); `Welcome.test.tsx` still passes (single
  button; tapping reveals the email step, then the code step). Live end-to-end sign-in remains the
  user's to confirm — the sandbox is firewalled from Supabase and the built-in email sender is
  rate-limited project-wide.

### Changed — signed-in cloud copy names both facts

- The Settings signed-in line now reads **"✓ You're signed in as <email>. Your data is backed up to
  this Gmail."** — stating both that the user is signed in and that the data is backed up, to the
  exact address they entered (per user request).

### Changed — "Lay your first brick" IS the sign-in (one button, required)

- Final call (per user): the Welcome screen has **one** button. Tapping **"Lay your first brick"**
  reveals an inline email field → **"Email me a magic link"** → "check your email"; the emailed link
  brings the user back **signed in**, and Welcome auto-dismisses to the Day view. So the routine is
  backed up **from day one** — sign-in is the first brick, no skip, no second button. Settings still
  reads "Signed in as … Your data backs up automatically." If cloud is not configured, the button
  simply enters the app (never a hard lock). Removed the secondary "Sign in to back up" link and the
  Settings-jump. Tests: `Welcome.test.tsx` (single button; tapping reveals the email step and does
  not skip into the app). 1860 vitest green; browser-verified.

### Superseded — Option 3 refinement: inline sign-in on the Welcome screen

- The Welcome "Sign in to back up" link no longer jumps to Settings. Tapping it now reveals an
  **inline email field + "Email me a magic link"** right on the Welcome screen; after sending it
  shows a "Check your email" confirmation with a Continue button. Simpler, one flow, no context
  switch (per user feedback). `components/Welcome.tsx` gained the inline sign-in mode via
  `useSupabaseSession`; the `onSignIn`→Settings prop was removed. Settings still shows "Signed in
  as …". Tests updated (`Welcome.test.tsx`: secondary link present; tap reveals inline email).

### Added — Step 4 (part 3): cloud offered from day one, skippable (Option 3)

- Backup is now surfaced up front instead of hiding in Settings — without a login wall.
  `components/Welcome.tsx` gains a subtle, skippable **"Sign in to back up & sync across devices"**
  link under the primary CTA (only when cloud is configured; tapping it dismisses Welcome and opens
  the cloud sign-in). `components/CloudBackupBanner.tsx` shows a gentle, **dismissible** "back up
  your data" nudge in the Day view once the user has built a routine and is signed out; "Back up"
  opens sign-in, "×" hides it forever (persisted in `dharma:cloud-nudge-dismissed`). Never blocks
  anything; never shown when cloud is off or the user is already signed in.
- Tests: `components/CloudBackupBanner.test.tsx` (shows only when signed-out + has-data + not
  dismissed; dismissal persists). 1860 vitest green, 0 type/lint errors, prod build clean; browser
  smoke confirmed the Welcome link + the appear/dismiss/stays-gone banner flow.

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
