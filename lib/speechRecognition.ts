/**
 * lib/speechRecognition.ts — mockable Web Speech API façade.
 *
 * The ONLY module that touches window.SpeechRecognition / webkitSpeechRecognition.
 * All consumers receive a SpeechSessionFactory (defaulting to createSpeechSession)
 * so unit tests can inject a fake without touching any browser API.
 *
 * Resolves SG-m10-04.
 */

export type SpeechErrorKind =
  | "not-allowed"
  | "no-speech"
  | "unsupported"
  | "other";

export interface SpeechHandlers {
  /** Partial transcript — live, not committed */
  onInterim: (text: string) => void;
  /** isFinal segment — the committed name */
  onFinal: (text: string) => void;
  /** Mapped from SpeechRecognitionErrorEvent */
  onError: (kind: SpeechErrorKind) => void;
  /** Session closed (any reason) */
  onEnd: () => void;
}

export interface SpeechSession {
  start: () => void;
  /** Graceful stop (commit interim if any) */
  stop: () => void;
  /** Hard cancel (discard, no final) */
  abort: () => void;
}

export type SpeechSessionFactory = (handlers: SpeechHandlers) => SpeechSession;

/**
 * Returns true when the browser supports the Web Speech API.
 * Safe to call in SSR — returns false when window is undefined.
 */
export function isSpeechSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as Record<string, unknown>).SpeechRecognition ||
    (window as Record<string, unknown>).webkitSpeechRecognition,
  );
}

/**
 * Creates a real SpeechRecognition session.
 * Configure: continuous=false, interimResults=true, lang=navigator.language||"en-US".
 * Maps browser events to the SpeechHandlers interface.
 */
export function createSpeechSession(handlers: SpeechHandlers): SpeechSession {
  const SpeechRecognitionCtor =
    (window as Record<string, unknown>).SpeechRecognition ||
    (window as Record<string, unknown>).webkitSpeechRecognition;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SpeechRecognition is not in the standard TS lib; cast via any to construct it
  const recognition = new (SpeechRecognitionCtor as any)() as SpeechRecognition;

  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang =
    (typeof navigator !== "undefined" && navigator.language) || "en-US";

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const result = event.results[event.results.length - 1];
    const transcript = result[0].transcript;
    if (result.isFinal) {
      handlers.onFinal(transcript);
    } else {
      handlers.onInterim(transcript);
    }
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    const error = event.error;
    if (error === "not-allowed") {
      handlers.onError("not-allowed");
    } else if (error === "no-speech") {
      handlers.onError("no-speech");
    } else {
      handlers.onError("other");
    }
  };

  recognition.onend = () => {
    handlers.onEnd();
  };

  return {
    start: () => recognition.start(),
    stop: () => recognition.stop(),
    abort: () => recognition.abort(),
  };
}
