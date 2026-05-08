// lib/audio.test.ts — M4a audio helper tests
// Covers: U-m4a-008..010

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// We must re-import playChime each time so the module cache is reset.
// Use vi.resetModules() before each test group to isolate the singleton.

// ─── U-m4a-008: lazy construct + cache (Audio called once for two plays) ───────

describe("U-m4a-008: playChime lazily constructs one Audio element and calls .play() twice", () => {
  let mockPlay: ReturnType<typeof vi.fn>;
  let MockAudio: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    mockPlay = vi.fn().mockResolvedValue(undefined);
    MockAudio = vi.fn(() => ({ play: mockPlay }));
    // Install on globalThis so the SSR guard passes
    globalThis.Audio = MockAudio as unknown as typeof Audio;
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- restoring test-modified global
    delete (globalThis as any).Audio;
  });

  it("Audio constructor called once; .play() called twice when playChime is invoked twice", async () => {
    const { playChime } = await import("./audio");
    playChime();
    playChime();
    expect(MockAudio).toHaveBeenCalledTimes(1);
    expect(MockAudio).toHaveBeenCalledWith("/sounds/chime.mp3");
    expect(mockPlay).toHaveBeenCalledTimes(2);
  });
});

// ─── U-m4a-009: try/catch swallows play() rejection ─────────────────────────

describe("U-m4a-009: playChime swallows play() rejection silently", () => {
  let MockAudio: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    const mockPlay = vi
      .fn()
      .mockRejectedValue(new DOMException("blocked", "NotAllowedError"));
    MockAudio = vi.fn(() => ({ play: mockPlay }));
    globalThis.Audio = MockAudio as unknown as typeof Audio;
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- restoring test-modified global
    delete (globalThis as any).Audio;
  });

  it("playChime does not throw even when .play() rejects", async () => {
    const { playChime } = await import("./audio");
    // Should not throw; promise rejection is swallowed by try/catch
    expect(() => playChime()).not.toThrow();
  });
});

// ─── U-m4a-010: SSR guard — no-op when Audio is undefined ────────────────────

describe("U-m4a-010: playChime is a no-op when globalThis.Audio is undefined (SSR)", () => {
  beforeEach(() => {
    vi.resetModules();
    // Simulate SSR: Audio is not defined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- simulating SSR environment
    delete (globalThis as any).Audio;
  });

  it("playChime returns without throwing when Audio is undefined", async () => {
    const { playChime } = await import("./audio");
    expect(() => playChime()).not.toThrow();
  });
});
