// lib/useVoiceCapture.test.ts
// Unit tests: U-m10-013..025
// Covers: useVoiceCapture hook — session lifecycle, interim, error routing, no-speech timer.

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
} from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useVoiceCapture } from "./useVoiceCapture";
import type { SpeechSessionFactory, SpeechHandlers } from "./speechRecognition";

// ─── Fake factory ─────────────────────────────────────────────────────────────

/** Creates a fake SpeechSessionFactory whose last-captured handlers can be driven manually. */
function makeFakeFactory(): {
  factory: SpeechSessionFactory;
  lastHandlers: () => SpeechHandlers | null;
  lastStart: () => ReturnType<typeof vi.fn>;
  lastStop: () => ReturnType<typeof vi.fn>;
  lastAbort: () => ReturnType<typeof vi.fn>;
} {
  let handlers: SpeechHandlers | null = null;
  let startSpy = vi.fn();
  let stopSpy = vi.fn();
  let abortSpy = vi.fn();

  const factory: SpeechSessionFactory = (h) => {
    handlers = h;
    startSpy = vi.fn();
    stopSpy = vi.fn();
    abortSpy = vi.fn();
    return {
      start: startSpy,
      stop: stopSpy,
      abort: abortSpy,
    };
  };

  return {
    factory,
    lastHandlers: () => handlers,
    lastStart: () => startSpy,
    lastStop: () => stopSpy,
    lastAbort: () => abortSpy,
  };
}

// ─── Stub isSpeechSupported ──────────────────────────────────────────────────

// For tests that need supported=true, install a fake SpeechRecognition on window.
beforeAll(() => {
  class FakeSR {
    continuous = false;
    interimResults = false;
    lang = "";
    start = vi.fn();
    stop = vi.fn();
    abort = vi.fn();
    onresult: null = null;
    onerror: null = null;
    onend: null = null;
  }
  (window as unknown as Record<string, unknown>).SpeechRecognition = FakeSR;
});

// ─── U-m10-013: initial render state ─────────────────────────────────────────

describe("U-m10-013: useVoiceCapture — initial state with supported speech", () => {
  it("supported=true, status='idle', interim=''", () => {
    const { factory } = makeFakeFactory();
    const { result } = renderHook(() =>
      useVoiceCapture({ onTranscript: vi.fn(), factory }),
    );
    expect(result.current.supported).toBe(true);
    expect(result.current.status).toBe("idle");
    expect(result.current.interim).toBe("");
  });
});

// ─── U-m10-014: start / toggle starts session ────────────────────────────────

describe("U-m10-014: useVoiceCapture — start() transitions to listening", () => {
  it("start spy called once, status becomes listening", () => {
    const fake = makeFakeFactory();
    const { result } = renderHook(() =>
      useVoiceCapture({ onTranscript: vi.fn(), factory: fake.factory }),
    );
    act(() => {
      result.current.start();
    });
    expect(fake.lastStart()).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("listening");
  });

  it("toggle() from idle also starts and sets listening", () => {
    const fake = makeFakeFactory();
    const { result } = renderHook(() =>
      useVoiceCapture({ onTranscript: vi.fn(), factory: fake.factory }),
    );
    act(() => {
      result.current.toggle();
    });
    expect(result.current.status).toBe("listening");
    expect(fake.lastStart()).toHaveBeenCalledTimes(1);
  });
});

// ─── U-m10-015: interim updates live ─────────────────────────────────────────

describe("U-m10-015: useVoiceCapture — interim updates from onInterim handler", () => {
  it("interim value updates to the reported text", () => {
    const fake = makeFakeFactory();
    const { result } = renderHook(() =>
      useVoiceCapture({ onTranscript: vi.fn(), factory: fake.factory }),
    );
    act(() => {
      result.current.start();
    });
    act(() => {
      fake.lastHandlers()!.onInterim("face wa");
    });
    expect(result.current.interim).toBe("face wa");
  });
});

// ─── U-m10-016: onFinal trims and calls onTranscript ─────────────────────────

describe("U-m10-016: useVoiceCapture — onFinal triggers onTranscript (trimmed), resets", () => {
  it("calls onTranscript with trimmed text; status → idle; interim → ''", () => {
    const onTranscript = vi.fn();
    const fake = makeFakeFactory();
    const { result } = renderHook(() =>
      useVoiceCapture({ onTranscript, factory: fake.factory }),
    );
    act(() => result.current.start());
    act(() => fake.lastHandlers()!.onInterim("face wash"));
    act(() => fake.lastHandlers()!.onFinal("  face wash  "));
    expect(onTranscript).toHaveBeenCalledWith("face wash");
    expect(result.current.status).toBe("idle");
    expect(result.current.interim).toBe("");
  });
});

// ─── U-m10-017: empty final → no-speech path ─────────────────────────────────

describe("U-m10-017: useVoiceCapture — whitespace-only final → no-speech path", () => {
  it("onTranscript NOT called; status → idle", () => {
    const onTranscript = vi.fn();
    const onError = vi.fn();
    const fake = makeFakeFactory();
    const { result } = renderHook(() =>
      useVoiceCapture({ onTranscript, onError, factory: fake.factory }),
    );
    act(() => result.current.start());
    act(() => fake.lastHandlers()!.onFinal("   "));
    expect(onTranscript).not.toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
  });
});

// ─── U-m10-018: toggle while listening → abort ───────────────────────────────

describe("U-m10-018: useVoiceCapture — toggle() while listening aborts", () => {
  it("abort spy called; status → idle; onTranscript NOT called", () => {
    const onTranscript = vi.fn();
    const fake = makeFakeFactory();
    const { result } = renderHook(() =>
      useVoiceCapture({ onTranscript, factory: fake.factory }),
    );
    act(() => result.current.toggle()); // start
    expect(result.current.status).toBe("listening");
    act(() => result.current.toggle()); // second tap → abort
    expect(fake.lastAbort()).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("idle");
    expect(onTranscript).not.toHaveBeenCalled();
  });
});

// ─── U-m10-019: cancel() mid-speech ──────────────────────────────────────────

describe("U-m10-019: useVoiceCapture — cancel() aborts, discards interim", () => {
  it("abort called; interim cleared; status → idle; onTranscript NOT called", () => {
    const onTranscript = vi.fn();
    const fake = makeFakeFactory();
    const { result } = renderHook(() =>
      useVoiceCapture({ onTranscript, factory: fake.factory }),
    );
    act(() => result.current.start());
    act(() => fake.lastHandlers()!.onInterim("some partial"));
    expect(result.current.interim).toBe("some partial");
    act(() => result.current.cancel());
    expect(fake.lastAbort()).toHaveBeenCalledTimes(1);
    expect(result.current.interim).toBe("");
    expect(result.current.status).toBe("idle");
    expect(onTranscript).not.toHaveBeenCalled();
  });
});

// ─── U-m10-020: permission denied error callback ─────────────────────────────

describe("U-m10-020: useVoiceCapture — not-allowed fires error callback with copy", () => {
  it("onError called with 'not-allowed' kind and correct copy; status → idle", () => {
    const onError = vi.fn();
    const onTranscript = vi.fn();
    const fake = makeFakeFactory();
    const { result } = renderHook(() =>
      useVoiceCapture({ onTranscript, onError, factory: fake.factory }),
    );
    act(() => result.current.start());
    act(() => fake.lastHandlers()!.onError("not-allowed"));
    expect(onError).toHaveBeenCalledWith(
      "not-allowed",
      "Microphone access denied. Allow it in your browser settings.",
    );
    expect(result.current.status).toBe("idle");
    expect(onTranscript).not.toHaveBeenCalled();
  });
});

// ─── U-m10-021: no-speech error callback ─────────────────────────────────────

describe("U-m10-021: useVoiceCapture — no-speech fires error callback", () => {
  it("onError called with 'no-speech' and correct copy; status → idle", () => {
    const onError = vi.fn();
    const onTranscript = vi.fn();
    const fake = makeFakeFactory();
    const { result } = renderHook(() =>
      useVoiceCapture({ onTranscript, onError, factory: fake.factory }),
    );
    act(() => result.current.start());
    act(() => fake.lastHandlers()!.onError("no-speech"));
    expect(onError).toHaveBeenCalledWith(
      "no-speech",
      "No speech detected. Try again.",
    );
    expect(result.current.status).toBe("idle");
    expect(onTranscript).not.toHaveBeenCalled();
  });
});

// ─── U-m10-022: other error callback ─────────────────────────────────────────

describe("U-m10-022: useVoiceCapture — other error fires generic callback", () => {
  it("onError called with 'other' and generic copy; status → idle; no throw", () => {
    const onError = vi.fn();
    const fake = makeFakeFactory();
    const { result } = renderHook(() =>
      useVoiceCapture({
        onTranscript: vi.fn(),
        onError,
        factory: fake.factory,
      }),
    );
    act(() => result.current.start());
    expect(() => {
      act(() => fake.lastHandlers()!.onError("other"));
    }).not.toThrow();
    expect(onError).toHaveBeenCalledWith(
      "other",
      "Voice capture failed. Try again.",
    );
    expect(result.current.status).toBe("idle");
  });
});

// ─── U-m10-023: no-speech timer fires after timeout ──────────────────────────

describe("U-m10-023: useVoiceCapture — no-speech timer fires after noSpeechTimeoutMs", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("abort called, no-speech error fired, status → idle after 5000ms with no input", () => {
    const onError = vi.fn();
    const fake = makeFakeFactory();
    const { result } = renderHook(() =>
      useVoiceCapture({
        onTranscript: vi.fn(),
        onError,
        noSpeechTimeoutMs: 5000,
        factory: fake.factory,
      }),
    );
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(5000));
    expect(fake.lastAbort()).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      "no-speech",
      "No speech detected. Try again.",
    );
    expect(result.current.status).toBe("idle");
  });
});

// ─── U-m10-024: interim resets no-speech timer ───────────────────────────────

describe("U-m10-024: useVoiceCapture — interim resets no-speech timer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("interim at 4000ms resets timer; timer fires at 9000ms not 5000ms", () => {
    const onError = vi.fn();
    const fake = makeFakeFactory();
    const { result } = renderHook(() =>
      useVoiceCapture({
        onTranscript: vi.fn(),
        onError,
        noSpeechTimeoutMs: 5000,
        factory: fake.factory,
      }),
    );
    act(() => result.current.start());
    // Advance to 4000ms — interim arrives, resets timer
    act(() => vi.advanceTimersByTime(4000));
    act(() => fake.lastHandlers()!.onInterim("face wa"));
    // Original timer would have fired at 5000ms (1000ms later); should NOT fire
    act(() => vi.advanceTimersByTime(1000));
    expect(onError).not.toHaveBeenCalled();
    // Timer reset to 5000ms from the interim; fires at 9000ms total (4000+5000)
    act(() => vi.advanceTimersByTime(4000));
    expect(onError).toHaveBeenCalledWith(
      "no-speech",
      "No speech detected. Try again.",
    );
  });
});

// ─── U-m10-025: unsupported → start is no-op ─────────────────────────────────

describe("U-m10-025: useVoiceCapture — unsupported speech API", () => {
  let origSpeech: unknown;

  beforeEach(() => {
    origSpeech = (window as unknown as Record<string, unknown>)
      .SpeechRecognition;
    delete (window as unknown as Record<string, unknown>).SpeechRecognition;
    delete (window as unknown as Record<string, unknown>)
      .webkitSpeechRecognition;
  });
  afterEach(() => {
    if (origSpeech !== undefined) {
      (window as unknown as Record<string, unknown>).SpeechRecognition =
        origSpeech;
    }
  });

  it("supported=false, status='idle', start() is a no-op (factory never called)", () => {
    const factory = vi.fn() as unknown as SpeechSessionFactory;
    const { result } = renderHook(() =>
      useVoiceCapture({ onTranscript: vi.fn(), factory }),
    );
    expect(result.current.supported).toBe(false);
    expect(result.current.status).toBe("idle");
    act(() => result.current.start());
    expect(factory).not.toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
  });
});
