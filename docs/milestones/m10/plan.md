# M10 — Voice Log — Plan

### Context

M10 activates voice capture: the user taps a mic trigger, the browser's **Web Speech API** transcribes speech to text, and the final transcript pre-fills the existing **AddBrickSheet** brick-name field. The user reviews/edits and taps Save — identical to typing. **No AI parsing layer** (no Claude/Whisper/backend); the user is the intelligence. Three failure paths (permission denied, no speech, unsupported browser) each surface a toast, never a crash (resolves SG-bld-19).

> **Drift flags for VERIFIER (not blockers — spec is the source of truth):**
>
> 1. `docs/status.md` milestone table still says M10 = "Claude API round-trip". The **spec.md explicitly forbids any AI/backend round-trip** (Intent + "What this is NOT"). This plan follows spec.md. SHIPPER must correct the status.md row at ship time.
> 2. The spec's premise that "a mic placeholder has been in the dock since M2" is **stale**. The 2026-06-22 polish pass (status.md "Last ship") **removed** the Voice Log placeholder and replaced it with the amber "Log Brick" quick-brick pill (`components/BottomBar.tsx`). There is no placeholder to activate. M10 therefore **adds a new mic trigger** rather than wiring an existing one. AC #1–#3 are satisfied by the new trigger described below.

### File structure

**New files**

| Path                                 | Purpose                                                                                                                                                                                                                                                           |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/speechRecognition.ts`           | Mockable façade over `window.SpeechRecognition` / `webkitSpeechRecognition`. Exports `isSpeechSupported()`, `createSpeechSession(handlers)`, and the `SpeechSession` / `SpeechHandlers` types. The ONLY module that touches the browser API (resolves SG-m10-04). |
| `lib/useVoiceCapture.ts`             | React hook that owns the voice-session lifecycle (idle → listening → resolved/error), interim transcript, and the no-speech timeout. Wraps `lib/speechRecognition.ts`; injectable factory param for tests.                                                        |
| `components/VoiceCaptureOverlay.tsx` | The listening-UI surface (modal overlay) — animated listening indicator, live interim transcript, Cancel affordance. PRM-aware. Resolves SG-m10-02.                                                                                                               |
| `components/MicButton.tsx`           | The dock mic trigger button. Hidden when `isSpeechSupported()` is false. Toggles capture. Resolves SG-m10-01.                                                                                                                                                     |

**Modified files**

| Path                                | Change                                                                                                                                                                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/BottomBar.tsx`          | Add an optional mic trigger slot between the "Log Brick" pill and the `+` chooser button. New optional props `onMicPress?`, `micSupported?`, `listening?`. When `micSupported !== true` the mic button is not rendered (AC #3).                               |
| `app/(building)/BuildingClient.tsx` | Wire `useVoiceCapture`; render `<VoiceCaptureOverlay>`; pass mic props to `<BottomBar>`; on a final transcript call the existing `openBrickSheet(null, null)` with the trimmed transcript as the new `defaultTitle`; route failure callbacks to `toast(...)`. |
| `components/AddBrickSheet.tsx`      | Add optional `defaultTitle?: string` prop; seed `title` from it on open (currently always resets to `""`). Trimmed pre-fill. No other behavior change.                                                                                                        |

### Data model

No `AppState`/`PersistedState` change. **No schema bump — stays v3.** Voice capture is ephemeral UI state; nothing persists. ADR-044/045/052/055 untouched.

New (non-persisted) types in `lib/speechRecognition.ts`:

```ts
export type SpeechErrorKind =
  | "not-allowed"
  | "no-speech"
  | "unsupported"
  | "other";

export interface SpeechHandlers {
  onInterim: (text: string) => void; // partial transcript, live
  onFinal: (text: string) => void; // isFinal segment — the committed name
  onError: (kind: SpeechErrorKind) => void; // mapped from SpeechRecognitionErrorEvent
  onEnd: () => void; // session closed (any reason)
}

export interface SpeechSession {
  start: () => void;
  stop: () => void; // graceful stop (commit interim if any)
  abort: () => void; // hard cancel (discard, no final)
}

export type SpeechSessionFactory = (handlers: SpeechHandlers) => SpeechSession;
```

Hook state shape in `lib/useVoiceCapture.ts`:

```ts
type VoiceStatus = "idle" | "listening";

interface UseVoiceCaptureResult {
  supported: boolean; // isSpeechSupported()
  status: VoiceStatus;
  interim: string; // live partial transcript ("" when idle)
  start: () => void; // begin a session (no-op if listening — see toggle below)
  cancel: () => void; // abort current session → idle, no sheet
  toggle: () => void; // AC #8: start if idle, cancel if listening
}
```

Hook constructor (test seam — SG-m10-04):

```ts
function useVoiceCapture(opts: {
  onTranscript: (finalText: string) => void; // wired to openBrickSheet pre-fill
  noSpeechTimeoutMs?: number; // default 5000 (SG-m10-03)
  factory?: SpeechSessionFactory; // default = real createSpeechSession; tests inject a fake
}): UseVoiceCaptureResult;
```

### Components

**`MicButton`** (`components/MicButton.tsx`)

| Prop        | Type         | Notes                                                               |
| ----------- | ------------ | ------------------------------------------------------------------- |
| `supported` | `boolean`    | When false, component returns `null` (AC #3 — hidden, no JS error). |
| `listening` | `boolean`    | Drives the active/idle visual + `aria-pressed`.                     |
| `onPress`   | `() => void` | Calls the toggle handler.                                           |

- Renders a circular icon button (`Mic` from lucide-react) matching the `+` button footprint (`h-12 w-12`).
- `aria-label="Start voice log"` when idle, `aria-label="Stop voice log"` when listening (AC #2).
- `aria-pressed={listening}`. Keyboard-operable (native `<button>`).
- `haptics.light()` on press (reuse `@/lib/haptics`).

**`VoiceCaptureOverlay`** (`components/VoiceCaptureOverlay.tsx`)

| Prop                   | Type         | Notes                                           |
| ---------------------- | ------------ | ----------------------------------------------- |
| `open`                 | `boolean`    | Mounted/visible while `status === "listening"`. |
| `interim`              | `string`     | Live partial transcript text (AC #5).           |
| `onCancel`             | `() => void` | Cancel affordance → hook `cancel()` (AC #8).    |
| `prefersReducedMotion` | `boolean`    | PRM → static indicator, no animation (AC #6).   |

- Centered modal overlay (z-50, sibling of sheets; above dock z-20, above toast z-30). Backdrop dims the timeline.
- `role="dialog"` + `aria-label="Listening"` + `aria-modal="true"`. Focus moves to the Cancel button on open; ESC and backdrop tap both cancel.
- Animated listening indicator: pulsing ring around a mic glyph (reuse the existing `@keyframes nowPulse` cadence or a sibling keyframe in globals.css). Under PRM: a static amber ring, no pulse.
- Interim transcript shown live in a `role="status" aria-live="polite"` region below the indicator; placeholder copy "Listening…" when interim is empty.
- A visible **Cancel** button (mirrors the chooser Cancel styling).

**`BottomBar`** (modified) — mic button inserted before the `+` chooser button; rendered only when `micSupported === true`. Layout: `[ Log Brick pill (flex-1) ] [ Mic h-12 w-12 ] [ + h-12 w-12 ]`. Must not overflow at 430px (AC #15) — the pill stays `flex-1`, two 48px circles + two 8px gaps fit within `max-w-[430px]` minus `px-5`.

**`BuildingClient`** (modified) — owns the wiring:

- `const voice = useVoiceCapture({ onTranscript: (t) => openBrickSheet(null, null, t) })` (see AddBrickSheet pre-fill below; `openBrickSheet` gains a 3rd optional `defaultTitle` arg threaded into `brickSheetState`).
- Failure routing inside the hook's `factory` handlers maps to `toast(...)` (see Edge cases for exact copy).
- Pass `onMicPress={voice.toggle}`, `micSupported={voice.supported}`, `listening={voice.status === "listening"}` to `<BottomBar>`.
- Render `<VoiceCaptureOverlay open={voice.status === "listening"} interim={voice.interim} onCancel={voice.cancel} prefersReducedMotion={Boolean(prefersReducedMotion)} />` (`prefersReducedMotion` already in scope in BuildingClient).

**`AddBrickSheet`** (modified) — add `defaultTitle?: string`. In the on-open reset effect, replace `setTitle("")` with `setTitle((defaultTitle ?? "").trim())` (AC #9 — trimmed pre-fill). All existing validation/dispatch/cascade unchanged (AC #10, #11). Add `defaultTitle` to the reset effect dep array.

### `lib/speechRecognition.ts` — the mockable wrapper (critical for TDD)

The single seam that makes the feature testable in JSDOM (where the browser API is absent).

- `isSpeechSupported(): boolean` — returns `typeof window !== "undefined" && Boolean(window.SpeechRecognition || (window as any).webkitSpeechRecognition)`. Pure read; safe in SSR (returns false).
- `createSpeechSession(handlers: SpeechHandlers): SpeechSession` — constructs the real `SpeechRecognition`, sets `continuous = false`, `interimResults = true`, `lang = navigator.language || "en-US"`, and binds:
  - `onresult` → split interim vs final by `result.isFinal`; interim → `handlers.onInterim`, final → `handlers.onFinal`.
  - `onerror` → map `event.error` to `SpeechErrorKind` (`"not-allowed"` → `not-allowed`; `"no-speech"` → `no-speech`; anything else → `other`).
  - `onend` → `handlers.onEnd`.
  - `.start()` / `.stop()` / `.abort()` proxied through `SpeechSession`.
- **Test seam:** consumers receive a `SpeechSessionFactory` (defaulting to `createSpeechSession`). Unit/component tests inject a **fake factory** that returns a `SpeechSession` whose `start/stop/abort` are spies and which the test drives by calling the captured `handlers.onInterim/onFinal/onError/onEnd` directly. This exercises the hook + components without any real `SpeechRecognition`. `isSpeechSupported()` is overridable by stubbing `window.SpeechRecognition` in JSDOM. BUILDER implements the fake under `lib/` test fixtures or inline in the spec files.

### Mic button placement (resolves SG-m10-01)

**Decision: dedicated mic button in the dock** (candidate a), placed between the "Log Brick" pill and the `+` chooser button — NOT a "Voice" row inside `AddChooserSheet`.

Rationale: voice is a one-tap capture verb; burying it one level inside the chooser adds friction to the app's hot path and contradicts AC #1 ("tappable from the Day view without navigating into any sheet"). The chooser flow (`AddChooserSheet` Block/Brick/Cancel) is left **untouched** — VERIFIER can confirm no chooser regression. The mic button self-hides when unsupported, so on Firefox/Safari-without-flag the dock degrades to the existing two-button layout (AC #3).

### Listening UI surface (resolves SG-m10-02)

**Decision: centered modal overlay** (`VoiceCaptureOverlay`), not a bottom sheet or inline-above-dock card.

Rationale at 430px: a modal overlay (a) gives the interim transcript full width and clear focus, (b) reuses the established focus-trap + backdrop pattern (Sheet/CommandPalette), (c) avoids competing with the dock's three buttons at the bottom edge. It mounts at z-50 (sheet tier), dims the timeline, traps focus on the Cancel button, and dismisses on ESC/backdrop/Cancel/second-mic-tap. The animated pulse uses the M0/M7b amber pulse vocabulary; PRM collapses it to a static ring (AC #6).

### No-speech timeout (resolves SG-m10-03)

**Decision: 5 s** (`noSpeechTimeoutMs = 5000`). Timer arms when the session starts and **resets on every interim result** (so a natural mid-sentence pause does not abort). If 5 s elapse with no new interim and no final, the hook calls `session.abort()`, returns to idle, and fires the "No speech detected" toast (AC #13). 5 s is comfortably longer than a natural speaking pause and matches the spec's stated default. Note: the Web Speech API also fires its own `no-speech` error on silence — both paths converge on the same toast + idle reset; the explicit timer is the deterministic, testable guard.

### Test mockability (resolves SG-m10-04)

Covered by the `SpeechSessionFactory` injection above. Summary of the three seams BUILDER uses:

1. `isSpeechSupported()` — toggle by stubbing `window.SpeechRecognition` in JSDOM (`true`/absent).
2. `factory` param on `useVoiceCapture` — inject a fake `SpeechSession`; assert `start/abort` called; drive `onInterim/onFinal/onError/onEnd` manually.
3. `noSpeechTimeoutMs` param — pass a small value (or use fake timers) to assert the no-speech path without waiting 5 s.
   E2E (Playwright headless has no Web Speech API) is **deferred-to-preview** and authored with the `if ((await x.count()) > 0) return` sandbox guard (ADR-022 / AC #19).

### Dependencies

**None.** Web Speech API is a built-in browser global — zero npm deps (the explicit point of choosing it over Whisper/Claude). lucide-react (`Mic`), `motion/react`, `@/lib/haptics`, and the `toast()` emitter all already exist.

### Design tokens

All from `app/globals.css` (M0 + M7b). No new tokens.

| Element                            | Token / value                                                                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mic button idle bg / border / icon | `var(--card)` / `1px var(--card-edge)` / `var(--ink)` (matches the `+` button exactly)                                                                 |
| Mic button listening accent        | `var(--accent)` (#fbbf24) ring + `var(--accent-glow)` halo                                                                                             |
| Overlay backdrop                   | `rgba(7,9,15,0.72)` (over `var(--bg)` #07090f)                                                                                                         |
| Listening-ring pulse               | reuse `@keyframes nowPulse` cadence (`var(--now-pulse-*)` from M7b) or a sibling keyframe; amber halo via `var(--accent-glow)` / `var(--accent-bloom)` |
| Interim transcript text            | `var(--ink)`; placeholder "Listening…" in `var(--ink-dim)`                                                                                             |
| Cancel button                      | mirrors `AddChooserSheet` Cancel: border `var(--ink-dim)`, mono uppercase `var(--fs-14)`                                                               |
| Focus ring                         | `focus-visible:outline-[var(--accent)]` (project-wide pattern)                                                                                         |
| Motion                             | `motion/react` fade/scale for overlay; **all motion gated behind `prefers-reduced-motion: no-preference`** (AC #6)                                     |

### Edge cases

| Case                              | Handling                                                                                                   | AC         |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------- |
| Browser unsupported               | `isSpeechSupported()` false → MicButton returns `null`; dock shows two-button layout; no JS error          | #3, edge#1 |
| Permission denied (`not-allowed`) | hook → `toast("Microphone access denied. Allow it in your browser settings.", "error")`; idle; no sheet    | #12        |
| No speech within 5 s              | timer (or API `no-speech`) → `abort()` → `toast("No speech detected. Try again.", "info")`; idle; no sheet | #13        |
| Any other error (`other`)         | `toast("Voice capture failed. Try again.", "error")`; idle; no crash                                       | #14        |
| Cancel mid-speech                 | `cancel()` → `abort()`, discard interim, idle, **no sheet**                                                | edge#4, #8 |
| Second mic tap while listening    | `toggle()` cancels active session (same as Cancel)                                                         | #8, edge#7 |
| Noisy interim                     | only the `isFinal: true` segment becomes the brick name; interim shown live, never committed               | edge#5     |
| Final transcript whitespace       | trimmed before pre-fill (`(text).trim()`)                                                                  | #9         |
| Pre-filled then cleared           | normal empty-name validation; Save disabled (existing AddBrickSheet behavior, unchanged)                   | edge#6     |
| PRM on                            | overlay pulse → static ring; overlay fade/scale → instant                                                  | #6, edge#8 |
| 430px viewport                    | pill `flex-1` + two 48px circles + 8px gaps fit; overlay max-w-[430px]; no overflow                        | #15        |
| Final fires but transcript empty  | treat as no-speech: no sheet, "No speech detected" toast                                                   | #13        |

### Out of scope

- Any AI intent-parsing, Claude/Haiku/Whisper call, or backend round-trip (spec "What this is NOT").
- Automatic brick-kind detection, duration extraction, or category inference from speech.
- Offline/on-device transcription.
- Any change to the Add **Block** flow, the chooser sheet, persistence, scoring, rollover, or history.
- Voice for editing existing bricks/blocks, or voice anywhere outside the Day view dock.
- Continuous/multi-utterance dictation (`continuous = false`; one utterance → one brick name).
- Language selection UI (uses `navigator.language` fallback `en-US`).
- Re-introducing or relocating the removed "Voice Log" placeholder copy.
