"use client";
/**
 * lib/useVoiceCapture.ts — voice-session lifecycle hook.
 *
 * Owns: idle → listening → resolved/error state machine.
 * Wraps lib/speechRecognition.ts; accepts an injectable factory for tests (SG-m10-04).
 * No-speech timer (default 5 s) arms on start, resets on each interim result.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  isSpeechSupported,
  createSpeechSession,
  type SpeechSessionFactory,
  type SpeechSession,
  type SpeechErrorKind,
} from "./speechRecognition";

export type VoiceStatus = "idle" | "listening";

export interface UseVoiceCaptureResult {
  supported: boolean;
  status: VoiceStatus;
  /** Live partial transcript ("" when idle) */
  interim: string;
  start: () => void;
  cancel: () => void;
  toggle: () => void;
}

const ERROR_MESSAGES: Record<SpeechErrorKind, string> = {
  "not-allowed": "Microphone access denied. Allow it in your browser settings.",
  "no-speech": "No speech detected. Try again.",
  unsupported: "Voice capture is not supported in this browser.",
  other: "Voice capture failed. Try again.",
};

const DEFAULT_NO_SPEECH_TIMEOUT_MS = 5000;

export function useVoiceCapture(opts: {
  onTranscript: (finalText: string) => void;
  noSpeechTimeoutMs?: number;
  factory?: SpeechSessionFactory;
  /** Called with (kind, message) on any error path */
  onError?: (kind: SpeechErrorKind, message: string) => void;
}): UseVoiceCaptureResult {
  const {
    onTranscript,
    noSpeechTimeoutMs = DEFAULT_NO_SPEECH_TIMEOUT_MS,
    factory = createSpeechSession,
    onError,
  } = opts;

  const supported = isSpeechSupported();
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [interim, setInterim] = useState("");

  // Refs to avoid stale-closure issues in callbacks
  const sessionRef = useRef<SpeechSession | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable ref to onError/onTranscript to avoid re-creating session on prop changes
  const onErrorRef = useRef(onError);
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  function clearNoSpeechTimer() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function armNoSpeechTimer() {
    clearNoSpeechTimer();
    timerRef.current = setTimeout(() => {
      // No speech within the window — abort and report
      sessionRef.current?.abort();
      sessionRef.current = null;
      setStatus("idle");
      setInterim("");
      onErrorRef.current?.("no-speech", ERROR_MESSAGES["no-speech"]);
    }, noSpeechTimeoutMs);
  }

  function fireError(kind: SpeechErrorKind) {
    clearNoSpeechTimer();
    sessionRef.current = null;
    setStatus("idle");
    setInterim("");
    onErrorRef.current?.(kind, ERROR_MESSAGES[kind]);
  }

  const start = useCallback(() => {
    if (!supported || status === "listening") return;
    const session = factory({
      onInterim: (text) => {
        setInterim(text);
        armNoSpeechTimer();
      },
      onFinal: (text) => {
        clearNoSpeechTimer();
        const trimmed = text.trim();
        sessionRef.current = null;
        setStatus("idle");
        setInterim("");
        if (trimmed.length === 0) {
          // Treat as no-speech
          onErrorRef.current?.("no-speech", ERROR_MESSAGES["no-speech"]);
        } else {
          onTranscriptRef.current(trimmed);
        }
      },
      onError: (kind) => {
        fireError(kind);
      },
      onEnd: () => {
        // onEnd fires after onFinal or after abort; clean up if still set
        clearNoSpeechTimer();
        sessionRef.current = null;
        // Only reset to idle if still listening (not already reset by onFinal/onError)
        setStatus((prev) => (prev === "listening" ? "idle" : prev));
      },
    });
    sessionRef.current = session;
    setStatus("listening");
    setInterim("");
    session.start();
    armNoSpeechTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally excluded: armNoSpeechTimer closure over noSpeechTimeoutMs which is stable per render; capturing it here would rebuild on every render.
  }, [supported, status, factory]);

  const cancel = useCallback(() => {
    clearNoSpeechTimer();
    sessionRef.current?.abort();
    sessionRef.current = null;
    setStatus("idle");
    setInterim("");
  }, []);

  const toggle = useCallback(() => {
    if (status === "listening") {
      cancel();
    } else {
      start();
    }
  }, [status, cancel, start]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearNoSpeechTimer();
      sessionRef.current?.abort();
    };
  }, []);

  return { supported, status, interim, start, cancel, toggle };
}
