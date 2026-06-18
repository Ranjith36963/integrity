/**
 * lib/celebrations.m7d.test.ts — M7d unit tests for new hooks + celebrate shim.
 *
 * Covers: U-m7d-001..014
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ── Audio + haptics mocks (applied per-test where needed) ─────────────────────
vi.mock("@/lib/audio", () => ({ playChime: vi.fn() }));
vi.mock("@/lib/haptics", () => ({
  haptics: {
    success: vi.fn(),
    notification: vi.fn(),
    light: vi.fn(),
    medium: vi.fn(),
  },
}));

// Lazy imports so mocks are applied before module evaluation
async function getHooks() {
  const mod = await import("./celebrations");
  return {
    useBlockCelebrationOnce: mod.useBlockCelebrationOnce,
    useDayCelebrationOnce: mod.useDayCelebrationOnce,
    celebrate: mod.celebrate,
  };
}

async function getAudioMock() {
  const { playChime } = await import("@/lib/audio");
  return playChime as ReturnType<typeof vi.fn>;
}

async function getHapticsMock() {
  const { haptics } = await import("@/lib/haptics");
  return haptics as {
    success: ReturnType<typeof vi.fn>;
    notification: ReturnType<typeof vi.fn>;
    light: ReturnType<typeof vi.fn>;
    medium: ReturnType<typeof vi.fn>;
  };
}

// ── U-m7d-001: useBlockCelebrationOnce — initial pct=99 does NOT lock id ──────

describe("U-m7d-001: useBlockCelebrationOnce(A, 99) returns false on first render, true on 99→100", () => {
  it("returns false on initial pct=99, then true on rerender to pct=100", async () => {
    const { useBlockCelebrationOnce } = await getHooks();

    const { result, rerender } = renderHook(
      ({ id, pct }: { id: string; pct: number }) =>
        useBlockCelebrationOnce(id, pct),
      { initialProps: { id: "A", pct: 99 } },
    );

    expect(result.current).toBe(false);

    act(() => {
      rerender({ id: "A", pct: 100 });
    });

    expect(result.current).toBe(true);
  });
});

// ── U-m7d-002: hydration into 100% — returns false AND locks id ───────────────

describe("U-m7d-002: useBlockCelebrationOnce(A, 100) on first render returns false AND locks id", () => {
  it("returns false on hydration-into-100%, false on drop, false on re-cross", async () => {
    const { useBlockCelebrationOnce } = await getHooks();

    const { result, rerender } = renderHook(
      ({ id, pct }: { id: string; pct: number }) =>
        useBlockCelebrationOnce(id, pct),
      { initialProps: { id: "A", pct: 100 } },
    );

    expect(result.current).toBe(false); // hydration-into-100% is silent

    act(() => {
      rerender({ id: "A", pct: 99 }); // cross-down
    });
    expect(result.current).toBe(false);

    act(() => {
      rerender({ id: "A", pct: 100 }); // re-cross — id was locked
    });
    expect(result.current).toBe(false); // still false — sparing semantics
  });
});

// ── U-m7d-003: 99→100→99→100 within one mount fires EXACTLY once ──────────────

describe("U-m7d-003: useBlockCelebrationOnce 99→100→99→100 fires exactly once", () => {
  it("fires only on the first crossing; second crossing is suppressed", async () => {
    const { useBlockCelebrationOnce } = await getHooks();

    const { result, rerender } = renderHook(
      ({ id, pct }: { id: string; pct: number }) =>
        useBlockCelebrationOnce(id, pct),
      { initialProps: { id: "A", pct: 99 } },
    );

    expect(result.current).toBe(false);

    act(() => {
      rerender({ id: "A", pct: 100 }); // first crossing fires
    });
    expect(result.current).toBe(true);

    act(() => {
      rerender({ id: "A", pct: 99 }); // cross-down
    });
    expect(result.current).toBe(false);

    act(() => {
      rerender({ id: "A", pct: 100 }); // second crossing — locked
    });
    expect(result.current).toBe(false); // must be false — sparing semantics
  });
});

// ── U-m7d-004: two block ids are gate-independent (Set vs single flag) ─────────

describe("U-m7d-004: two block ids are gate-independent within the same mount", () => {
  it("blocks A and B fire independently; Set-vs-single-flag mutation test", async () => {
    const { useBlockCelebrationOnce } = await getHooks();

    const { result, rerender } = renderHook(
      ({ pctA, pctB }: { pctA: number; pctB: number }) => {
        const a = useBlockCelebrationOnce("A", pctA);
        const b = useBlockCelebrationOnce("B", pctB);
        return [a, b] as [boolean, boolean];
      },
      { initialProps: { pctA: 99, pctB: 99 } },
    );

    expect(result.current).toEqual([false, false]);

    act(() => {
      rerender({ pctA: 100, pctB: 100 }); // both cross simultaneously
    });
    expect(result.current).toEqual([true, true]); // both fire

    act(() => {
      rerender({ pctA: 100, pctB: 100 }); // subsequent render at 100 — both locked
    });
    expect(result.current).toEqual([false, false]);
  });
});

// ── U-m7d-005: remount resets the Set ────────────────────────────────────────

describe("U-m7d-005: second mount fires again — Set is component-instance-local", () => {
  it("fires true on 99→100 after unmount+remount with same id", async () => {
    const { useBlockCelebrationOnce } = await getHooks();

    // First mount
    const { result, rerender, unmount } = renderHook(
      ({ id, pct }: { id: string; pct: number }) =>
        useBlockCelebrationOnce(id, pct),
      { initialProps: { id: "A", pct: 99 } },
    );

    act(() => {
      rerender({ id: "A", pct: 100 }); // first crossing on mount 1
    });
    expect(result.current).toBe(true);

    unmount(); // simulate Day→Week→Day remount

    // Second mount — fresh hook instance, fresh Set
    const { result: result2, rerender: rerender2 } = renderHook(
      ({ id, pct }: { id: string; pct: number }) =>
        useBlockCelebrationOnce(id, pct),
      { initialProps: { id: "A", pct: 99 } },
    );

    expect(result2.current).toBe(false);

    act(() => {
      rerender2({ id: "A", pct: 100 }); // second crossing on mount 2
    });
    expect(result2.current).toBe(true); // fires again — Set was reset
  });
});

// ── U-m7d-006: intermediate drop to 80 between crossings still fires once ─────

describe("U-m7d-006: 99→100→99→80→100 fires exactly once (first crossing)", () => {
  it("intermediate drop to 80 does not enable a second bloom", async () => {
    const { useBlockCelebrationOnce } = await getHooks();

    const { result, rerender } = renderHook(
      ({ id, pct }: { id: string; pct: number }) =>
        useBlockCelebrationOnce(id, pct),
      { initialProps: { id: "A", pct: 99 } },
    );

    expect(result.current).toBe(false);

    act(() => {
      rerender({ id: "A", pct: 100 }); // first crossing fires
    });
    expect(result.current).toBe(true);

    act(() => {
      rerender({ id: "A", pct: 99 }); // cross-down
    });
    expect(result.current).toBe(false);

    act(() => {
      rerender({ id: "A", pct: 80 }); // intermediate drop (new brick added)
    });
    expect(result.current).toBe(false);

    act(() => {
      rerender({ id: "A", pct: 100 }); // re-crosses 100 — still locked
    });
    expect(result.current).toBe(false); // no second bloom
  });
});

// ── U-m7d-007: useDayCelebrationOnce — canonical fire path ───────────────────

describe("U-m7d-007: useDayCelebrationOnce(99→100) returns true on the first crossing", () => {
  it("returns false on pct=99, true on pct=100", async () => {
    const { useDayCelebrationOnce } = await getHooks();

    const { result, rerender } = renderHook(
      ({ pct }: { pct: number }) => useDayCelebrationOnce(pct),
      { initialProps: { pct: 99 } },
    );

    expect(result.current).toBe(false);

    act(() => {
      rerender({ pct: 100 });
    });

    expect(result.current).toBe(true);
  });
});

// ── U-m7d-008: hydration-into-100% suppression for day hook ──────────────────

describe("U-m7d-008: useDayCelebrationOnce(100) on first render returns false AND locks mount-shot", () => {
  it("hydration-into-100% is silent; re-cross after drop is also silent", async () => {
    const { useDayCelebrationOnce } = await getHooks();

    const { result, rerender } = renderHook(
      ({ pct }: { pct: number }) => useDayCelebrationOnce(pct),
      { initialProps: { pct: 100 } },
    );

    expect(result.current).toBe(false); // hydration-into-100% is silent

    act(() => {
      rerender({ pct: 99 }); // cross-down
    });
    expect(result.current).toBe(false);

    act(() => {
      rerender({ pct: 100 }); // re-cross — mount-shot already set
    });
    expect(result.current).toBe(false); // still false
  });
});

// ── U-m7d-009: 99→100→99→100 within one mount fires EXACTLY once (day hook) ──

describe("U-m7d-009: useDayCelebrationOnce 99→100→99→100 fires exactly once", () => {
  it("second 100 crossing is suppressed after mount-shot is set", async () => {
    const { useDayCelebrationOnce } = await getHooks();

    const { result, rerender } = renderHook(
      ({ pct }: { pct: number }) => useDayCelebrationOnce(pct),
      { initialProps: { pct: 99 } },
    );

    expect(result.current).toBe(false);

    act(() => {
      rerender({ pct: 100 }); // fires — mount-shot set
    });
    expect(result.current).toBe(true);

    act(() => {
      rerender({ pct: 99 }); // cross-down
    });
    expect(result.current).toBe(false);

    act(() => {
      rerender({ pct: 100 }); // second crossing — mount-shot is set
    });
    expect(result.current).toBe(false); // suppressed
  });
});

// ── U-m7d-010: remount resets the boolean (day hook) ─────────────────────────

describe("U-m7d-010: second mount (Day→Week→Day) fires useDayCelebrationOnce again", () => {
  it("boolean is component-instance-local; remount resets it", async () => {
    const { useDayCelebrationOnce } = await getHooks();

    // Mount 1
    const { result, rerender, unmount } = renderHook(
      ({ pct }: { pct: number }) => useDayCelebrationOnce(pct),
      { initialProps: { pct: 99 } },
    );

    act(() => {
      rerender({ pct: 100 });
    });
    expect(result.current).toBe(true);

    unmount(); // Day→Week navigation

    // Mount 2 — fresh instance
    const { result: result2, rerender: rerender2 } = renderHook(
      ({ pct }: { pct: number }) => useDayCelebrationOnce(pct),
      { initialProps: { pct: 99 } },
    );

    expect(result2.current).toBe(false);

    act(() => {
      rerender2({ pct: 100 }); // fires again on second mount
    });
    expect(result2.current).toBe(true);
  });
});

// ── U-m7d-011: celebrate("block", { withAudio: false }) fires haptics.success, no playChime ──

describe("U-m7d-011: celebrate(block, withAudio:false) fires haptics.success, zero playChime calls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("haptics.success called once; playChime called zero times; haptics.notification called zero times", async () => {
    const { celebrate } = await getHooks();
    const audio = await getAudioMock();
    const hap = await getHapticsMock();

    celebrate("block", { withAudio: false });

    expect(hap.success).toHaveBeenCalledTimes(1);
    expect(audio).toHaveBeenCalledTimes(0);
    expect(hap.notification).toHaveBeenCalledTimes(0);
  });
});

// ── U-m7d-012: celebrate("day", { withAudio: false }) fires haptics.notification, no playChime ──

describe("U-m7d-012: celebrate(day, withAudio:false) fires haptics.notification, zero playChime calls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("haptics.notification called once; playChime called zero times; haptics.success called zero times", async () => {
    const { celebrate } = await getHooks();
    const audio = await getAudioMock();
    const hap = await getHapticsMock();

    celebrate("day", { withAudio: false });

    expect(hap.notification).toHaveBeenCalledTimes(1);
    expect(audio).toHaveBeenCalledTimes(0);
    expect(hap.success).toHaveBeenCalledTimes(0);
  });
});

// ── U-m7d-013: celebrate() with NO opts defaults withAudio to false ──────────

describe("U-m7d-013: celebrate(block) with no opts defaults withAudio to false", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calling celebrate with no second argument does NOT call playChime", async () => {
    const { celebrate } = await getHooks();
    const audio = await getAudioMock();
    const hap = await getHapticsMock();

    celebrate("block"); // no opts — defaults withAudio to false

    expect(hap.success).toHaveBeenCalledTimes(1);
    expect(audio).toHaveBeenCalledTimes(0);
  });
});

// ── U-m7d-014: celebrate("block", { withAudio: true }) DOES call playChime ────

describe("U-m7d-014: celebrate(block, withAudio:true) calls playChime (M7f forward-compat)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("withAudio:true exercises the playChime branch — proves M7f is a one-line change", async () => {
    const { celebrate } = await getHooks();
    const audio = await getAudioMock();
    const hap = await getHapticsMock();

    celebrate("block", { withAudio: true });

    expect(hap.success).toHaveBeenCalledTimes(1);
    expect(audio).toHaveBeenCalledTimes(1); // the playChime branch IS reachable
  });
});

// ── afterEach: restore mocks ──────────────────────────────────────────────────
afterEach(() => {
  vi.clearAllMocks();
});
