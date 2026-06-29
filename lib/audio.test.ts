// lib/audio.test.ts — Web Audio API chime tests (M7f)
// Covers: U-audio-001..003
// Supersedes U-m4a-008..010 (HTMLAudioElement approach replaced by Web Audio API)

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Test helpers: minimal Web Audio API mock ─────────────────────────────────

type OscillatorMock = {
  type: string;
  frequency: { value: number };
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
};

type GainMock = {
  gain: {
    setValueAtTime: ReturnType<typeof vi.fn>;
    exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
  };
  connect: ReturnType<typeof vi.fn>;
};

type AudioContextMock = {
  currentTime: number;
  destination: object;
  createOscillator: ReturnType<typeof vi.fn>;
  createGain: ReturnType<typeof vi.fn>;
  oscillators: OscillatorMock[];
};

function makeAudioContextMock(): AudioContextMock {
  const oscillators: OscillatorMock[] = [];

  const ctx: AudioContextMock = {
    currentTime: 0,
    destination: {},
    createOscillator: vi.fn(() => {
      const osc: OscillatorMock = {
        type: "sine",
        frequency: { value: 0 },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      oscillators.push(osc);
      return osc;
    }),
    createGain: vi.fn(() => {
      const gain: GainMock = {
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      };
      return gain;
    }),
    oscillators,
  };

  return ctx;
}

// ─── U-audio-001: SSR guard — no-op when window.AudioContext is undefined ─────

describe("U-audio-001: playChime is a no-op when window.AudioContext is undefined (SSR/no-gesture)", () => {
  beforeEach(() => {
    vi.resetModules();
    // Simulate SSR or pre-gesture environment: no AudioContext on window
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only global manipulation
    delete (globalThis as any).AudioContext;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only global manipulation
    delete (globalThis as any).webkitAudioContext;
    // Ensure window is defined (jsdom) but has no AudioContext
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only global manipulation
      delete (window as any).AudioContext;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only global manipulation
      delete (window as any).webkitAudioContext;
    }
  });

  it("GIVEN window.AudioContext is undefined THEN playChime('block') returns without throwing", async () => {
    const { playChime } = await import("./audio");
    expect(() => playChime("block")).not.toThrow();
  });

  it("GIVEN window.AudioContext is undefined THEN playChime('day') returns without throwing", async () => {
    const { playChime } = await import("./audio");
    expect(() => playChime("day")).not.toThrow();
  });
});

// ─── U-audio-002: AudioContext constructor throws → silent catch ───────────────

describe("U-audio-002: playChime catches and returns silently when AudioContext throws on construction", () => {
  beforeEach(() => {
    vi.resetModules();
    class ThrowingAudioContext {
      constructor() {
        throw new DOMException("NotAllowedError", "NotAllowedError");
      }
    }
    vi.stubGlobal("AudioContext", ThrowingAudioContext);
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only global manipulation
      (window as any).AudioContext = ThrowingAudioContext;
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("GIVEN AudioContext throws on construction THEN playChime('block') does not throw or reject", async () => {
    const { playChime } = await import("./audio");
    expect(() => playChime("block")).not.toThrow();
  });
});

// ─── U-audio-003: oscillator node counts ─────────────────────────────────────

describe("U-audio-003: playChime creates correct number of oscillator nodes", () => {
  let ctxMock: AudioContextMock;

  beforeEach(() => {
    vi.resetModules();
    ctxMock = makeAudioContextMock();
    // Stub AudioContext as a constructor that returns the mock
    const CtxClass = vi.fn(() => ctxMock);
    vi.stubGlobal("AudioContext", CtxClass);
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only global manipulation
      (window as any).AudioContext = CtxClass;
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("GIVEN a working AudioContext mock WHEN playChime('block') is called THEN exactly 1 oscillator is created", async () => {
    const { playChime } = await import("./audio");
    playChime("block");
    expect(ctxMock.createOscillator).toHaveBeenCalledTimes(1);
    expect(ctxMock.oscillators).toHaveLength(1);
  });

  it("GIVEN a working AudioContext mock WHEN playChime('day') is called THEN exactly 4 oscillators are created", async () => {
    const { playChime } = await import("./audio");
    playChime("day");
    expect(ctxMock.createOscillator).toHaveBeenCalledTimes(4);
    expect(ctxMock.oscillators).toHaveLength(4);
  });
});
