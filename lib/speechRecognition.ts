/**
 * lib/speechRecognition.ts — mockable Web Speech API façade.
 *
 * The ONLY module that touches window.SpeechRecognition / webkitSpeechRecognition.
 * All consumers receive a SpeechSessionFactory (defaulting to createSpeechSession)
 * so unit tests can inject a fake without touching any browser API.
 *
 * Resolves SG-m10-04.
 */

// Web Speech API is not in the default TypeScript lib. Declare a local interface
// for the shape we use so tsc does not complain, without merging with any global.
// These are structurally accurate to the W3C Web Speech API spec.
interface SpeechRecognitionResultAlternativeLocal {
  readonly transcript: string;
  readonly confidence: number;
}
interface SpeechRecognitionResultLocal {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionResultAlternativeLocal;
  [index: number]: SpeechRecognitionResultAlternativeLocal;
}
interface SpeechRecognitionResultListLocal {
  readonly length: number;
  item(index: number): SpeechRecognitionResultLocal;
  [index: number]: SpeechRecognitionResultLocal;
}
export interface SpeechRecognitionEventLocal extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLocal;
}
export interface SpeechRecognitionErrorEventLocal extends Event {
  readonly error: string;
  readonly message: string;
}
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: SpeechRecognitionEventLocal) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEventLocal) => void) | null;
  onend: ((ev: Event) => void) | null;
  abort(): void;
  start(): void;
  stop(): void;
}

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

type WindowWithSpeech = Window &
  typeof globalThis & {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };

/**
 * Returns true when the browser supports the Web Speech API.
 * Safe to call in SSR — returns false when window is undefined.
 */
export function isSpeechSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as WindowWithSpeech;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

/**
 * Creates a real SpeechRecognition session.
 * Configure: continuous=false, interimResults=true, lang=navigator.language||"en-US".
 * Maps browser events to the SpeechHandlers interface.
 */
export function createSpeechSession(handlers: SpeechHandlers): SpeechSession {
  const w = window as WindowWithSpeech;
  const SpeechRecognitionCtor =
    w.SpeechRecognition || w.webkitSpeechRecognition;

  if (!SpeechRecognitionCtor) {
    // Should not be called when unsupported, but guard defensively
    throw new Error("SpeechRecognition not supported");
  }

  const recognition = new SpeechRecognitionCtor();

  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang =
    (typeof navigator !== "undefined" && navigator.language) || "en-US";

  recognition.onresult = (event: SpeechRecognitionEventLocal) => {
    const result = event.results[event.results.length - 1];
    const transcript = result[0].transcript;
    if (result.isFinal) {
      handlers.onFinal(transcript);
    } else {
      handlers.onInterim(transcript);
    }
  };

  recognition.onerror = (event: SpeechRecognitionErrorEventLocal) => {
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
