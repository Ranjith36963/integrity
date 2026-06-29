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

type AudioContextState = {
  oscillators: OscillatorMock[];
  createOscillator: ReturnType<typeof vi.fn>;
  createGain: ReturnType<typeof vi.fn>;
};

function makeAudioContextState(): AudioContextState {
  const oscillators: OscillatorMock[] = [];
  return {
    oscillators,
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
    createGain: vi.fn(
      (): GainMock => ({
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      }),
    ),
  };
}

// ─── U-audio-001: SSR guard — no-op when window.AudioContext is undefined ─────

describe("U-audio-001: playChime is a no-op when window.AudioContext is undefined (SSR/no-gesture)", () => {
  beforeEach(() => {
    vi.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only: simulate SSR/pre-gesture where AudioContext is absent
    delete (globalThis as any).AudioContext;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only: clear webkitAudioContext fallback as well
    delete (globalThis as any).webkitAudioContext;
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only: clear window.AudioContext
      delete (window as any).AudioContext;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only: clear window.webkitAudioContext
      delete (window as any).webkitAudioContext;
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only: set window.AudioContext to a throwing constructor
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
  let state: AudioContextState;

  beforeEach(() => {
    vi.resetModules();
    state = makeAudioContextState();
    // Must use a real class (not arrow fn) because playChime calls `new AudioCtx()`
    class MockAudioContext {
      createOscillator = state.createOscillator;
      createGain = state.createGain;
      destination = {};
      currentTime = 0;
    }
    vi.stubGlobal("AudioContext", MockAudioContext);
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only: set window.AudioContext to the mock class
      (window as any).AudioContext = MockAudioContext;
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("GIVEN a working AudioContext mock WHEN playChime('block') is called THEN exactly 1 oscillator is created", async () => {
    const { playChime } = await import("./audio");
    playChime("block");
    expect(state.createOscillator).toHaveBeenCalledTimes(1);
    expect(state.oscillators).toHaveLength(1);
  });

  it("GIVEN a working AudioContext mock WHEN playChime('day') is called THEN exactly 4 oscillators are created", async () => {
    const { playChime } = await import("./audio");
    playChime("day");
    expect(state.createOscillator).toHaveBeenCalledTimes(4);
    expect(state.oscillators).toHaveLength(4);
  });
});
