# M10 — Voice Log — Tests

> Derived from `docs/milestones/m10/plan.md`. Every spec AC (#1–#19) maps to ≥1 test ID below.
> Test seams (SG-m10-04): `isSpeechSupported()` toggled by stubbing `window.SpeechRecognition` in JSDOM; `useVoiceCapture({ factory })` accepts a fake `SpeechSessionFactory` whose `start/stop/abort` are spies and whose `handlers` are driven manually; `noSpeechTimeoutMs` overridable + fake timers.
> E2E (AC #19): real Playwright blocks guarded with the ADR-022 sandbox pattern `if ((await x.count()) === 0) return;` — Web Speech API is absent in headless Playwright, so these are deferred-to-preview.

---

### Unit (Vitest)

- ID: U-m10-001
  GIVEN a JSDOM `window` with `window.SpeechRecognition` defined
  WHEN `isSpeechSupported()` is called
  THEN it returns `true`.
  Covers: AC #4 (precondition), SG-m10-04. Tested by: `lib/speechRecognition.test.ts`

- ID: U-m10-002
  GIVEN a JSDOM `window` with neither `window.SpeechRecognition` nor `window.webkitSpeechRecognition` defined
  WHEN `isSpeechSupported()` is called
  THEN it returns `false` and throws no error.
  Covers: AC #3. Tested by: `lib/speechRecognition.test.ts`

- ID: U-m10-003
  GIVEN a JSDOM `window` with only `window.webkitSpeechRecognition` defined (Chromium-prefixed)
  WHEN `isSpeechSupported()` is called
  THEN it returns `true`.
  Covers: AC #4 (precondition). Tested by: `lib/speechRecognition.test.ts`

- ID: U-m10-004
  GIVEN `window` is undefined (SSR context simulated)
  WHEN `isSpeechSupported()` is called
  THEN it returns `false` and does not throw.
  Covers: AC #3 (no JS error). Tested by: `lib/speechRecognition.test.ts`

- ID: U-m10-005
  GIVEN a fake `SpeechRecognition` constructor installed on `window` and a `SpeechHandlers` object
  WHEN `createSpeechSession(handlers)` constructs the session
  THEN the underlying recognition instance is configured `continuous = false`, `interimResults = true`, and `lang` falls back to `"en-US"` when `navigator.language` is empty.
  Covers: AC #4, out-of-scope (continuous dictation off, no language UI). Tested by: `lib/speechRecognition.test.ts`

- ID: U-m10-006
  GIVEN a session from `createSpeechSession(handlers)` and a fired `onresult` event whose latest segment has `isFinal: false` with text "morning wo"
  WHEN the event is dispatched
  THEN `handlers.onInterim("morning wo")` is called and `handlers.onFinal` is NOT called.
  Covers: AC #5, edge#5 (interim never committed). Tested by: `lib/speechRecognition.test.ts`

- ID: U-m10-007
  GIVEN a session from `createSpeechSession(handlers)` and a fired `onresult` event whose segment has `isFinal: true` with text "morning workout"
  WHEN the event is dispatched
  THEN `handlers.onFinal("morning workout")` is called.
  Covers: AC #9, edge#5. Tested by: `lib/speechRecognition.test.ts`

- ID: U-m10-008
  GIVEN a session from `createSpeechSession(handlers)` and a fired `onerror` event with `error: "not-allowed"`
  WHEN the event is dispatched
  THEN `handlers.onError("not-allowed")` is called.
  Covers: AC #12. Tested by: `lib/speechRecognition.test.ts`

- ID: U-m10-009
  GIVEN a session from `createSpeechSession(handlers)` and a fired `onerror` event with `error: "no-speech"`
  WHEN the event is dispatched
  THEN `handlers.onError("no-speech")` is called.
  Covers: AC #13. Tested by: `lib/speechRecognition.test.ts`

- ID: U-m10-010
  GIVEN a session from `createSpeechSession(handlers)` and a fired `onerror` event with an unrecognised `error: "audio-capture"`
  WHEN the event is dispatched
  THEN `handlers.onError("other")` is called (mapped to the fallback kind).
  Covers: AC #14. Tested by: `lib/speechRecognition.test.ts`

- ID: U-m10-011
  GIVEN a session from `createSpeechSession(handlers)` and a fired `onend` event
  WHEN the event is dispatched
  THEN `handlers.onEnd()` is called.
  Covers: AC #7. Tested by: `lib/speechRecognition.test.ts`

- ID: U-m10-012
  GIVEN a session from `createSpeechSession(handlers)`
  WHEN `session.start()`, `session.stop()`, and `session.abort()` are called
  THEN the underlying recognition's `start`, `stop`, and `abort` are each invoked exactly once.
  Covers: AC #4, AC #8. Tested by: `lib/speechRecognition.test.ts`

- ID: U-m10-013
  GIVEN `useVoiceCapture({ onTranscript, factory })` with a fake factory and supported speech
  WHEN the hook first renders
  THEN `supported` is `true`, `status` is `"idle"`, and `interim` is `""`.
  Covers: AC #4 (precondition), AC #5 (idle interim empty). Tested by: `lib/useVoiceCapture.test.ts`

- ID: U-m10-014
  GIVEN `useVoiceCapture` with a fake factory and `status === "idle"`
  WHEN `start()` (or `toggle()`) is called
  THEN the fake session's `start` spy is invoked once and `status` becomes `"listening"`.
  Covers: AC #4, AC #8. Tested by: `lib/useVoiceCapture.test.ts`

- ID: U-m10-015
  GIVEN `useVoiceCapture` listening with a fake factory
  WHEN the captured `handlers.onInterim("face wa")` is invoked
  THEN the hook's `interim` value updates to `"face wa"`.
  Covers: AC #5. Tested by: `lib/useVoiceCapture.test.ts`

- ID: U-m10-016
  GIVEN `useVoiceCapture({ onTranscript })` listening with a fake factory
  WHEN the captured `handlers.onFinal("  face wash  ")` is invoked
  THEN `onTranscript` is called with the trimmed value `"face wash"` and `status` returns to `"idle"`, `interim` resets to `""`.
  Covers: AC #9, AC #7. Tested by: `lib/useVoiceCapture.test.ts`

- ID: U-m10-017
  GIVEN `useVoiceCapture({ onTranscript })` listening with a fake factory
  WHEN the captured `handlers.onFinal("   ")` is invoked (whitespace-only / empty final)
  THEN `onTranscript` is NOT called, no sheet-open transcript is emitted, and the hook routes to the "No speech detected" path (status returns to `"idle"`).
  Covers: AC #13 (empty-final edge: "Final fires but transcript empty"). Tested by: `lib/useVoiceCapture.test.ts`

- ID: U-m10-018
  GIVEN `useVoiceCapture` listening with a fake factory
  WHEN `toggle()` is called a second time (while `status === "listening"`)
  THEN the fake session's `abort` spy is invoked, `status` returns to `"idle"`, and `onTranscript` is NOT called.
  Covers: AC #8, edge#7. Tested by: `lib/useVoiceCapture.test.ts`

- ID: U-m10-019
  GIVEN `useVoiceCapture` listening with a fake factory
  WHEN `cancel()` is called mid-speech (interim non-empty)
  THEN the fake session's `abort` spy is invoked, `interim` is discarded, `status` is `"idle"`, and `onTranscript` is NOT called.
  Covers: AC #8, edge#4. Tested by: `lib/useVoiceCapture.test.ts`

- ID: U-m10-020
  GIVEN `useVoiceCapture` listening with a fake factory and the captured handlers
  WHEN `handlers.onError("not-allowed")` is invoked
  THEN the permission-denied failure callback fires with copy "Microphone access denied. Allow it in your browser settings.", `status` returns to `"idle"`, and `onTranscript` is NOT called.
  Covers: AC #12. Tested by: `lib/useVoiceCapture.test.ts`

- ID: U-m10-021
  GIVEN `useVoiceCapture` listening with a fake factory
  WHEN `handlers.onError("no-speech")` is invoked
  THEN the no-speech failure callback fires with copy "No speech detected. Try again.", `status` is `"idle"`, no sheet transcript emitted.
  Covers: AC #13. Tested by: `lib/useVoiceCapture.test.ts`

- ID: U-m10-022
  GIVEN `useVoiceCapture` listening with a fake factory
  WHEN `handlers.onError("other")` is invoked
  THEN the generic failure callback fires with a generic fallback message (e.g. "Voice capture failed. Try again."), `status` is `"idle"`, and no crash/throw occurs.
  Covers: AC #14. Tested by: `lib/useVoiceCapture.test.ts`

- ID: U-m10-023
  GIVEN `useVoiceCapture({ noSpeechTimeoutMs: 5000, factory })` with fake timers, started, and NO interim/final received
  WHEN 5000 ms elapse
  THEN the fake session's `abort` spy is invoked, the no-speech failure callback fires ("No speech detected. Try again."), and `status` returns to `"idle"`.
  Covers: AC #13, SG-m10-03. Tested by: `lib/useVoiceCapture.test.ts`

- ID: U-m10-024
  GIVEN `useVoiceCapture({ noSpeechTimeoutMs: 5000, factory })` with fake timers, started
  WHEN an interim result arrives at 4000 ms and then no further input
  THEN the no-speech timer is reset by the interim (so it does NOT fire at 5000 ms) and fires only at 9000 ms.
  Covers: AC #13, SG-m10-03 (timer resets on interim so a natural pause does not abort). Tested by: `lib/useVoiceCapture.test.ts`

- ID: U-m10-025
  GIVEN `useVoiceCapture({ factory })` where `isSpeechSupported()` is stubbed `false`
  WHEN the hook renders
  THEN `supported` is `false`, `status` is `"idle"`, and calling `start()` is a no-op (fake factory never constructs a session).
  Covers: AC #3. Tested by: `lib/useVoiceCapture.test.ts`

---

### Component (Vitest + Testing Library)

- ID: C-m10-001
  GIVEN `<MicButton supported={false} listening={false} onPress={fn} />`
  WHEN it renders
  THEN nothing is rendered (component returns `null`) and no button/aria-label is queryable.
  Covers: AC #3. Tested by: `components/MicButton.test.tsx`

- ID: C-m10-002
  GIVEN `<MicButton supported listening={false} onPress={fn} />`
  WHEN it renders
  THEN a `<button>` with `aria-label="Start voice log"` and `aria-pressed="false"` is present.
  Covers: AC #1, AC #2. Tested by: `components/MicButton.test.tsx`

- ID: C-m10-003
  GIVEN `<MicButton supported listening onPress={fn} />`
  WHEN it renders
  THEN the button has `aria-label="Stop voice log"` and `aria-pressed="true"`.
  Covers: AC #2, AC #8 (toggle visual state). Tested by: `components/MicButton.test.tsx`

- ID: C-m10-004
  GIVEN `<MicButton supported listening={false} onPress={spy} />`
  WHEN the user clicks the button
  THEN `onPress` is called once.
  Covers: AC #1, AC #4 (tap starts capture path). Tested by: `components/MicButton.test.tsx`

- ID: C-m10-005
  GIVEN `<MicButton supported listening={false} onPress={spy} />`
  WHEN the button receives focus and the user presses Enter/Space
  THEN `onPress` is invoked (native `<button>` keyboard operability).
  Covers: AC #2 (keyboard-operable). Tested by: `components/MicButton.test.tsx`

- ID: C-m10-006
  GIVEN `<VoiceCaptureOverlay open interim="" onCancel={fn} prefersReducedMotion={false} />`
  WHEN it renders
  THEN a `role="dialog"` element with `aria-modal="true"` and `aria-label="Listening"` is present, and placeholder copy "Listening…" is shown in the live region.
  Covers: AC #4, AC #5 (empty-interim placeholder). Tested by: `components/VoiceCaptureOverlay.test.tsx`

- ID: C-m10-007
  GIVEN `<VoiceCaptureOverlay open interim="morning workout" onCancel={fn} prefersReducedMotion={false} />`
  WHEN it renders
  THEN the interim text "morning workout" is displayed inside a `role="status" aria-live="polite"` region.
  Covers: AC #5. Tested by: `components/VoiceCaptureOverlay.test.tsx`

- ID: C-m10-008
  GIVEN `<VoiceCaptureOverlay open interim="x" onCancel={spy} prefersReducedMotion={false} />`
  WHEN the user clicks the Cancel button
  THEN `onCancel` is called once.
  Covers: AC #8, edge#4. Tested by: `components/VoiceCaptureOverlay.test.tsx`

- ID: C-m10-009
  GIVEN an open `<VoiceCaptureOverlay onCancel={spy} />`
  WHEN the user presses Escape
  THEN `onCancel` is called.
  Covers: AC #8 (dismiss → idle). Tested by: `components/VoiceCaptureOverlay.test.tsx`

- ID: C-m10-010
  GIVEN an open `<VoiceCaptureOverlay onCancel={spy} />`
  WHEN the user taps the backdrop
  THEN `onCancel` is called.
  Covers: AC #8. Tested by: `components/VoiceCaptureOverlay.test.tsx`

- ID: C-m10-011
  GIVEN `<VoiceCaptureOverlay open ... prefersReducedMotion={true} />`
  WHEN it renders
  THEN the listening indicator is the static-ring variant (no pulse/animation class applied).
  Covers: AC #6, edge#8. Tested by: `components/VoiceCaptureOverlay.test.tsx`

- ID: C-m10-012
  GIVEN `<VoiceCaptureOverlay open ... prefersReducedMotion={false} />`
  WHEN it renders
  THEN the animated pulsing-ring indicator is applied (pulse class/keyframe present).
  Covers: AC #6 (animation present when PRM off). Tested by: `components/VoiceCaptureOverlay.test.tsx`

- ID: C-m10-013
  GIVEN an open `<VoiceCaptureOverlay />`
  WHEN it mounts
  THEN focus moves to the Cancel button.
  Covers: AC #2/#16 (focus management). Tested by: `components/VoiceCaptureOverlay.test.tsx`

- ID: C-m10-014
  GIVEN `<BottomBar micSupported={true} listening={false} onMicPress={spy} ... />`
  WHEN it renders
  THEN the mic button is present between the "Log Brick" pill and the `+` chooser button, and clicking it calls `onMicPress`.
  Covers: AC #1, SG-m10-01. Tested by: `components/BottomBar.test.tsx`

- ID: C-m10-015
  GIVEN `<BottomBar micSupported={false} ... />` (or `micSupported` omitted)
  WHEN it renders
  THEN no mic button is rendered and the existing "Log Brick" + `+` two-button layout is intact (no chooser regression).
  Covers: AC #3, AC #17 (chooser untouched). Tested by: `components/BottomBar.test.tsx`

- ID: C-m10-016
  GIVEN `<AddBrickSheet open defaultTitle="  morning workout  " ... />`
  WHEN the sheet opens
  THEN the brick-name field is pre-filled with the trimmed value "morning workout".
  Covers: AC #9, AC #10. Tested by: `components/AddBrickSheet.test.tsx`

- ID: C-m10-017
  GIVEN `<AddBrickSheet open defaultTitle="morning workout" ... />` that is pre-filled
  WHEN the user clears the name field
  THEN the Save control is disabled (existing empty-name validation applies unchanged).
  Covers: AC #10, edge#6. Tested by: `components/AddBrickSheet.test.tsx`

- ID: C-m10-018
  GIVEN `<AddBrickSheet open defaultTitle="" ... />` (or `defaultTitle` omitted)
  WHEN the sheet opens
  THEN the name field is empty exactly as the pre-M10 typed flow (no regression).
  Covers: AC #17. Tested by: `components/AddBrickSheet.test.tsx`

---

### E2E (Playwright)

> All blocks use the ADR-022 sandbox guard `if ((await x.count()) === 0) return;` because the Web Speech API is unavailable in headless Playwright (AC #19, deferred-to-preview).

- ID: E-m10-001
  GIVEN the Day view loaded in a browser where the mic button is present
  WHEN the page is inspected for the mic trigger (`if ((await micBtn.count()) === 0) return;`)
  THEN the mic button is visible and tappable from the Day view without opening any sheet.
  Covers: AC #1. Tested by: `e2e/m10-voice-log.spec.ts`

- ID: E-m10-002
  GIVEN the Day view and the mic button present
  WHEN its accessibility attributes are read (guarded)
  THEN the button exposes `aria-label="Start voice log"` and is reachable by keyboard Tab focus.
  Covers: AC #2. Tested by: `e2e/m10-voice-log.spec.ts`

- ID: E-m10-003
  GIVEN a browser/context where `window.SpeechRecognition` is unavailable
  WHEN the Day view loads (guarded — if mic present, return)
  THEN no mic button is shown, no console JS error is thrown, and the typed Add Brick flow still works.
  Covers: AC #3, AC #17. Tested by: `e2e/m10-voice-log.spec.ts`

- ID: E-m10-004
  GIVEN the mic button is present
  WHEN the user taps it (guarded)
  THEN the VoiceCaptureOverlay (`role="dialog"` "Listening") appears with a visible Cancel affordance.
  Covers: AC #4. Tested by: `e2e/m10-voice-log.spec.ts`

- ID: E-m10-005
  GIVEN the listening overlay is open (guarded)
  WHEN the user taps the mic button again
  THEN the overlay closes, no AddBrickSheet opens, and the view returns to idle.
  Covers: AC #8, edge#7. Tested by: `e2e/m10-voice-log.spec.ts`

- ID: E-m10-006
  GIVEN the listening overlay is open (guarded)
  WHEN the user taps Cancel
  THEN the overlay closes cleanly and no AddBrickSheet opens.
  Covers: AC #8, edge#4. Tested by: `e2e/m10-voice-log.spec.ts`

- ID: E-m10-007
  GIVEN an AddBrickSheet opened pre-filled with a transcript name (guarded; simulated via the mic→final path when supported)
  WHEN the user taps Save without editing
  THEN a brick is created exactly as if typed — same validation, dispatch, and cascade.
  Covers: AC #11. Tested by: `e2e/m10-voice-log.spec.ts`

- ID: E-m10-008
  GIVEN the Day view at the 430px mobile viewport
  WHEN the dock renders with the mic button present (guarded)
  THEN the "Log Brick" pill, mic button, and `+` button fit with no horizontal layout overflow.
  Covers: AC #15. Tested by: `e2e/m10-voice-log.spec.ts`

- ID: E-m10-009
  GIVEN the Day view at 430px with the listening overlay open (guarded)
  WHEN the overlay renders
  THEN the overlay and its interim transcript area fit within the viewport with no horizontal overflow.
  Covers: AC #15. Tested by: `e2e/m10-voice-log.spec.ts`

- ID: E-m10-010
  GIVEN the existing M1–M9e typed Add Brick / Add Block / chooser flows
  WHEN the M10 build is loaded and those flows are exercised
  THEN they behave identically to before (no regression to chooser, typed brick, persistence, or scoring).
  Covers: AC #17. Tested by: `e2e/m10-voice-log.spec.ts`

---

### Accessibility (axe via Playwright)

- ID: A-m10-001
  GIVEN the Day view with the mic button present (guarded)
  WHEN axe runs on the dock
  THEN there are zero a11y violations and the mic button has an accessible name.
  Covers: AC #2, AC #16. Tested by: `e2e/m10-voice-log.a11y.spec.ts`

- ID: A-m10-002
  GIVEN the VoiceCaptureOverlay open in the listening state (guarded)
  WHEN axe runs on the overlay UI
  THEN there are zero a11y violations (dialog has accessible name, live region announced, focus trapped).
  Covers: AC #16. Tested by: `e2e/m10-voice-log.a11y.spec.ts`

- ID: A-m10-003
  GIVEN the VoiceCaptureOverlay open with `prefers-reduced-motion: reduce` emulated (guarded)
  WHEN axe runs and the indicator is inspected
  THEN there are zero a11y violations and no motion animation is applied.
  Covers: AC #6, AC #16. Tested by: `e2e/m10-voice-log.a11y.spec.ts`

---

### AC → test-ID coverage map

| AC  | Subject                                  | Test IDs                                                                                          |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------------------- |
| #1  | Mic visible/tappable from Day view       | C-m10-002, C-m10-004, C-m10-014, E-m10-001                                                        |
| #2  | Accessible label + keyboard-operable     | C-m10-002, C-m10-003, C-m10-005, E-m10-002, A-m10-001                                             |
| #3  | Unsupported → hidden, no JS error        | U-m10-002, U-m10-004, U-m10-025, C-m10-001, C-m10-015, E-m10-003                                  |
| #4  | Tap starts session + listening indicator | U-m10-005, U-m10-012, U-m10-013, U-m10-014, C-m10-004, C-m10-006, E-m10-004                       |
| #5  | Interim transcript shown live            | U-m10-006, U-m10-013, U-m10-015, C-m10-006, C-m10-007                                             |
| #6  | Respects prefers-reduced-motion          | C-m10-011, C-m10-012, A-m10-003                                                                   |
| #7  | Session ends on onend                    | U-m10-011, U-m10-016                                                                              |
| #8  | Second tap cancels (toggle), no sheet    | U-m10-012, U-m10-018, U-m10-019, C-m10-003, C-m10-008, C-m10-009, C-m10-010, E-m10-005, E-m10-006 |
| #9  | Final → AddBrickSheet pre-filled trimmed | U-m10-007, U-m10-016, C-m10-016                                                                   |
| #10 | Pre-fill editable                        | C-m10-016, C-m10-017                                                                              |
| #11 | Save behaves identically to typed        | E-m10-007                                                                                         |
| #12 | Permission denied toast, no sheet        | U-m10-008, U-m10-020                                                                              |
| #13 | No speech → toast, no sheet              | U-m10-009, U-m10-017, U-m10-021, U-m10-023, U-m10-024                                             |
| #14 | Other error → generic toast, no crash    | U-m10-010, U-m10-022                                                                              |
| #15 | 430px no overflow                        | E-m10-008, E-m10-009                                                                              |
| #16 | axe clean on listening UI                | A-m10-001, A-m10-002, A-m10-003                                                                   |
| #17 | No regression to M1–M9e / typed flow     | C-m10-015, C-m10-018, E-m10-003, E-m10-010                                                        |
| #18 | Quality gates (tsc/lint/vitest/test:tz)  | (gate-level, enforced by EVALUATOR `npm run eval`; proven green by the full U/C suite above)      |
| #19 | E2E authored with sandbox guard          | E-m10-001..010, A-m10-001..003 (all use `if ((await x.count()) === 0) return;`)                   |
