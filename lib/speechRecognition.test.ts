// lib/speechRecognition.test.ts
// Unit tests: U-m10-001..012
// Covers: isSpeechSupported(), createSpeechSession() — the mockable Web Speech API façade.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isSpeechSupported, createSpeechSession } from "./speechRecognition";
import type {
  SpeechHandlers,
  SpeechRecognitionEventLocal,
  SpeechRecognitionErrorEventLocal,
} from "./speechRecognition";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** A minimal SpeechRecognition constructor stub for JSDOM. */
function makeFakeSpeechRecognitionClass() {
  return class FakeSpeechRecognition {
    continuous = true;
    interimResults = false;
    lang = "";
    onresult: ((e: SpeechRecognitionEventLocal) => void) | null = null;
    onerror: ((e: SpeechRecognitionErrorEventLocal) => void) | null = null;
    onend: (() => void) | null = null;
    start = vi.fn();
    stop = vi.fn();
    abort = vi.fn();
  };
}

// ─── U-m10-001: isSpeechSupported returns true when SpeechRecognition exists ─

describe("U-m10-001: isSpeechSupported — SpeechRecognition defined", () => {
  let original: unknown;
  beforeEach(() => {
    original = (window as unknown as Record<string, unknown>).SpeechRecognition;
    (window as unknown as Record<string, unknown>).SpeechRecognition =
      makeFakeSpeechRecognitionClass();
  });
  afterEach(() => {
    if (original === undefined) {
      delete (window as unknown as Record<string, unknown>).SpeechRecognition;
    } else {
      (window as unknown as Record<string, unknown>).SpeechRecognition =
        original;
    }
  });

  it("returns true when window.SpeechRecognition is defined", () => {
    expect(isSpeechSupported()).toBe(true);
  });
});

// ─── U-m10-002: isSpeechSupported returns false when neither API is defined ──

describe("U-m10-002: isSpeechSupported — neither SpeechRecognition nor webkitSpeechRecognition", () => {
  let origSpeech: unknown;
  let origWebkit: unknown;
  beforeEach(() => {
    origSpeech = (window as unknown as Record<string, unknown>)
      .SpeechRecognition;
    origWebkit = (window as unknown as Record<string, unknown>)
      .webkitSpeechRecognition;
    delete (window as unknown as Record<string, unknown>).SpeechRecognition;
    delete (window as unknown as Record<string, unknown>)
      .webkitSpeechRecognition;
  });
  afterEach(() => {
    if (origSpeech !== undefined) {
      (window as unknown as Record<string, unknown>).SpeechRecognition =
        origSpeech;
    }
    if (origWebkit !== undefined) {
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition =
        origWebkit;
    }
  });

  it("returns false and does not throw", () => {
    expect(() => isSpeechSupported()).not.toThrow();
    expect(isSpeechSupported()).toBe(false);
  });
});

// ─── U-m10-003: isSpeechSupported returns true for webkit prefix ─────────────

describe("U-m10-003: isSpeechSupported — webkitSpeechRecognition only", () => {
  let origSpeech: unknown;
  let origWebkit: unknown;
  beforeEach(() => {
    origSpeech = (window as unknown as Record<string, unknown>)
      .SpeechRecognition;
    origWebkit = (window as unknown as Record<string, unknown>)
      .webkitSpeechRecognition;
    delete (window as unknown as Record<string, unknown>).SpeechRecognition;
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition =
      makeFakeSpeechRecognitionClass();
  });
  afterEach(() => {
    if (origSpeech !== undefined) {
      (window as unknown as Record<string, unknown>).SpeechRecognition =
        origSpeech;
    } else {
      delete (window as unknown as Record<string, unknown>).SpeechRecognition;
    }
    if (origWebkit !== undefined) {
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition =
        origWebkit;
    } else {
      delete (window as unknown as Record<string, unknown>)
        .webkitSpeechRecognition;
    }
  });

  it("returns true when only webkitSpeechRecognition is defined", () => {
    expect(isSpeechSupported()).toBe(true);
  });
});

// ─── U-m10-004: isSpeechSupported returns false in SSR (window undefined) ────

describe("U-m10-004: isSpeechSupported — SSR (window undefined)", () => {
  it("returns false without throwing when window APIs are absent", () => {
    // In JSDOM, window always exists. We test the guard by deleting both APIs —
    // the function must guard typeof window !== 'undefined' and Boolean(...) safely.
    const origSpeech = (window as unknown as Record<string, unknown>)
      .SpeechRecognition;
    const origWebkit = (window as unknown as Record<string, unknown>)
      .webkitSpeechRecognition;
    delete (window as unknown as Record<string, unknown>).SpeechRecognition;
    delete (window as unknown as Record<string, unknown>)
      .webkitSpeechRecognition;
    expect(() => isSpeechSupported()).not.toThrow();
    expect(isSpeechSupported()).toBe(false);
    if (origSpeech !== undefined)
      (window as unknown as Record<string, unknown>).SpeechRecognition =
        origSpeech;
    if (origWebkit !== undefined)
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition =
        origWebkit;
  });
});

// ─── U-m10-005..012: createSpeechSession ─────────────────────────────────────

/** Install a fake SpeechRecognition and return the last created instance. */
function installFakeSR() {
  let lastInstance: InstanceType<
    ReturnType<typeof makeFakeSpeechRecognitionClass>
  > | null = null;
  const Cls = makeFakeSpeechRecognitionClass();
  const OriginalCls = Cls;
  class Capturing extends OriginalCls {
    constructor() {
      super();
      // eslint-disable-next-line @typescript-eslint/no-this-alias -- capture for test assertions
      lastInstance = this;
    }
  }
  (window as unknown as Record<string, unknown>).SpeechRecognition = Capturing;
  return {
    getLastInstance: () => lastInstance,
    restore: () => {
      delete (window as unknown as Record<string, unknown>).SpeechRecognition;
    },
  };
}

function makeHandlers(): SpeechHandlers & {
  onInterimMock: ReturnType<typeof vi.fn>;
  onFinalMock: ReturnType<typeof vi.fn>;
  onErrorMock: ReturnType<typeof vi.fn>;
  onEndMock: ReturnType<typeof vi.fn>;
} {
  const onInterimMock = vi.fn();
  const onFinalMock = vi.fn();
  const onErrorMock = vi.fn();
  const onEndMock = vi.fn();
  return {
    onInterim: onInterimMock,
    onFinal: onFinalMock,
    onError: onErrorMock,
    onEnd: onEndMock,
    onInterimMock,
    onFinalMock,
    onErrorMock,
    onEndMock,
  };
}

/** Build a minimal SpeechRecognitionEvent-like object */
function makeSpeechResultEvent(
  text: string,
  isFinal: boolean,
): SpeechRecognitionEventLocal {
  const result = {
    isFinal,
    0: { transcript: text, confidence: 1 },
    length: 1,
    item: () => ({ transcript: text, confidence: 1 }),
  };
  const results = {
    0: result,
    length: 1,
    item: () => result,
  };
  return { results, resultIndex: 0 } as unknown as SpeechRecognitionEventLocal;
}

/** Build a minimal SpeechRecognitionErrorEvent-like object */
function makeSpeechErrorEvent(error: string): SpeechRecognitionErrorEventLocal {
  return { error, message: "" } as unknown as SpeechRecognitionErrorEventLocal;
}

describe("U-m10-005: createSpeechSession configuration", () => {
  let restore: () => void;
  let getLastInstance: () => InstanceType<
    ReturnType<typeof makeFakeSpeechRecognitionClass>
  > | null;

  beforeEach(() => {
    const sr = installFakeSR();
    restore = sr.restore;
    getLastInstance = sr.getLastInstance;
    // Clear navigator.language for deterministic test
    Object.defineProperty(navigator, "language", {
      value: "",
      configurable: true,
    });
  });
  afterEach(() => {
    restore();
    Object.defineProperty(navigator, "language", {
      value: "en-US",
      configurable: true,
    });
  });

  it("sets continuous=false, interimResults=true, lang fallback en-US", () => {
    const handlers = makeHandlers();
    createSpeechSession(handlers);
    const inst = getLastInstance();
    expect(inst).not.toBeNull();
    expect(inst!.continuous).toBe(false);
    expect(inst!.interimResults).toBe(true);
    expect(inst!.lang).toBe("en-US");
  });
});

describe("U-m10-006: createSpeechSession onresult — interim segment", () => {
  let restore: () => void;
  let getLastInstance: () => InstanceType<
    ReturnType<typeof makeFakeSpeechRecognitionClass>
  > | null;

  beforeEach(() => {
    const sr = installFakeSR();
    restore = sr.restore;
    getLastInstance = sr.getLastInstance;
  });
  afterEach(() => restore());

  it("calls onInterim and NOT onFinal for isFinal=false", () => {
    const handlers = makeHandlers();
    createSpeechSession(handlers);
    const inst = getLastInstance()!;
    inst.onresult!(makeSpeechResultEvent("morning wo", false));
    expect(handlers.onInterimMock).toHaveBeenCalledWith("morning wo");
    expect(handlers.onFinalMock).not.toHaveBeenCalled();
  });
});

describe("U-m10-007: createSpeechSession onresult — final segment", () => {
  let restore: () => void;
  let getLastInstance: () => InstanceType<
    ReturnType<typeof makeFakeSpeechRecognitionClass>
  > | null;

  beforeEach(() => {
    const sr = installFakeSR();
    restore = sr.restore;
    getLastInstance = sr.getLastInstance;
  });
  afterEach(() => restore());

  it("calls onFinal with the transcript text for isFinal=true", () => {
    const handlers = makeHandlers();
    createSpeechSession(handlers);
    const inst = getLastInstance()!;
    inst.onresult!(makeSpeechResultEvent("morning workout", true));
    expect(handlers.onFinalMock).toHaveBeenCalledWith("morning workout");
  });
});

describe("U-m10-008: createSpeechSession onerror — not-allowed", () => {
  let restore: () => void;
  let getLastInstance: () => InstanceType<
    ReturnType<typeof makeFakeSpeechRecognitionClass>
  > | null;

  beforeEach(() => {
    const sr = installFakeSR();
    restore = sr.restore;
    getLastInstance = sr.getLastInstance;
  });
  afterEach(() => restore());

  it("maps not-allowed error to onError('not-allowed')", () => {
    const handlers = makeHandlers();
    createSpeechSession(handlers);
    const inst = getLastInstance()!;
    inst.onerror!(makeSpeechErrorEvent("not-allowed"));
    expect(handlers.onErrorMock).toHaveBeenCalledWith("not-allowed");
  });
});

describe("U-m10-009: createSpeechSession onerror — no-speech", () => {
  let restore: () => void;
  let getLastInstance: () => InstanceType<
    ReturnType<typeof makeFakeSpeechRecognitionClass>
  > | null;

  beforeEach(() => {
    const sr = installFakeSR();
    restore = sr.restore;
    getLastInstance = sr.getLastInstance;
  });
  afterEach(() => restore());

  it("maps no-speech error to onError('no-speech')", () => {
    const handlers = makeHandlers();
    createSpeechSession(handlers);
    const inst = getLastInstance()!;
    inst.onerror!(makeSpeechErrorEvent("no-speech"));
    expect(handlers.onErrorMock).toHaveBeenCalledWith("no-speech");
  });
});

describe("U-m10-010: createSpeechSession onerror — unrecognized → other", () => {
  let restore: () => void;
  let getLastInstance: () => InstanceType<
    ReturnType<typeof makeFakeSpeechRecognitionClass>
  > | null;

  beforeEach(() => {
    const sr = installFakeSR();
    restore = sr.restore;
    getLastInstance = sr.getLastInstance;
  });
  afterEach(() => restore());

  it("maps audio-capture to onError('other')", () => {
    const handlers = makeHandlers();
    createSpeechSession(handlers);
    const inst = getLastInstance()!;
    inst.onerror!(makeSpeechErrorEvent("audio-capture"));
    expect(handlers.onErrorMock).toHaveBeenCalledWith("other");
  });
});

describe("U-m10-011: createSpeechSession onend", () => {
  let restore: () => void;
  let getLastInstance: () => InstanceType<
    ReturnType<typeof makeFakeSpeechRecognitionClass>
  > | null;

  beforeEach(() => {
    const sr = installFakeSR();
    restore = sr.restore;
    getLastInstance = sr.getLastInstance;
  });
  afterEach(() => restore());

  it("fires onEnd when the recognition ends", () => {
    const handlers = makeHandlers();
    createSpeechSession(handlers);
    const inst = getLastInstance()!;
    inst.onend!();
    expect(handlers.onEndMock).toHaveBeenCalledTimes(1);
  });
});

describe("U-m10-012: createSpeechSession start/stop/abort proxy", () => {
  let restore: () => void;
  let getLastInstance: () => InstanceType<
    ReturnType<typeof makeFakeSpeechRecognitionClass>
  > | null;

  beforeEach(() => {
    const sr = installFakeSR();
    restore = sr.restore;
    getLastInstance = sr.getLastInstance;
  });
  afterEach(() => restore());

  it("proxies start, stop, abort each exactly once", () => {
    const handlers = makeHandlers();
    const session = createSpeechSession(handlers);
    const inst = getLastInstance()!;
    session.start();
    session.stop();
    session.abort();
    expect(inst.start).toHaveBeenCalledTimes(1);
    expect(inst.stop).toHaveBeenCalledTimes(1);
    expect(inst.abort).toHaveBeenCalledTimes(1);
  });
});
