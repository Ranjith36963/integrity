/**
 * components/TimelineBlock.m7d.test.tsx — M7d component tests for TimelineBlock.
 *
 * Covers: C-m7d-001, C-m7d-002, C-m7d-003, C-m7d-004, C-m7d-005
 */

import React from "react";
import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { act } from "@testing-library/react";
import { TimelineBlock } from "./TimelineBlock";
import type { Block, Category } from "@/lib/types";

// ── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("@/lib/audio", () => ({ playChime: vi.fn() }));
vi.mock("@/lib/haptics", () => ({
  haptics: {
    success: vi.fn(),
    notification: vi.fn(),
    light: vi.fn(),
    medium: vi.fn(),
  },
}));

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return {
    ...actual,
    useReducedMotion: vi.fn(() => false),
  };
});

// ── Fixtures ─────────────────────────────────────────────────────────────────

const cat1: Category = { id: "c1", name: "Health", color: "#34d399" };

/** Block at 100%: all bricks done */
const blockAt100: Block = {
  id: "b-100",
  name: "Full Block",
  start: "09:00",
  end: "10:00",
  recurrence: { kind: "just-today", date: "2026-05-01" },
  categoryId: "c1",
  bricks: [
    {
      id: "br-1",
      name: "Brick A",
      kind: "tick",
      hasDuration: false,
      done: true,
      categoryId: "c1",
      parentBlockId: "b-100",
      recurrence: { kind: "just-today", date: "2026-05-01" },
    },
  ],
};

/** Block at <100%: one tick brick not done → blockPct = 0. */
const blockAt0: Block = {
  id: "b-trans",
  name: "Transition Block",
  start: "09:00",
  end: "10:00",
  recurrence: { kind: "just-today", date: "2026-05-01" },
  categoryId: "c1",
  bricks: [
    {
      id: "br-undone",
      name: "Undone Brick",
      kind: "tick",
      hasDuration: false,
      done: false,
      categoryId: "c1",
      parentBlockId: "b-trans",
      recurrence: { kind: "just-today", date: "2026-05-01" },
    },
  ],
};

/** Same block id as blockAt0, but now at 100%: all bricks done */
const blockAt100v2: Block = {
  id: "b-trans", // same id as blockAt0
  name: "Transition Block",
  start: "09:00",
  end: "10:00",
  recurrence: { kind: "just-today", date: "2026-05-01" },
  categoryId: "c1",
  bricks: [
    {
      id: "br-undone",
      name: "Undone Brick",
      kind: "tick",
      hasDuration: false,
      done: true,
      categoryId: "c1",
      parentBlockId: "b-trans",
      recurrence: { kind: "just-today", date: "2026-05-01" },
    },
  ],
};

/** Block back to <100%: same id, brick undone again */
const blockBackToLow: Block = {
  id: "b-trans",
  name: "Transition Block",
  start: "09:00",
  end: "10:00",
  recurrence: { kind: "just-today", date: "2026-05-01" },
  categoryId: "c1",
  bricks: [
    {
      id: "br-undone",
      name: "Undone Brick",
      kind: "tick",
      hasDuration: false,
      done: false,
      categoryId: "c1",
      parentBlockId: "b-trans",
      recurrence: { kind: "just-today", date: "2026-05-01" },
    },
  ],
};

// ── C-m7d-001: hydration into 100% does NOT mount bloom-overlay ───────────────

describe("C-m7d-001: <TimelineBlock> hydration-into-100% does NOT mount bloom-overlay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders without bloom-overlay on first render at 100%", async () => {
    render(<TimelineBlock block={blockAt100} categories={[cat1]} />);

    // No bloom-overlay on initial render at 100% — hydration suppression
    await act(async () => {
      // Allow any effects to settle
    });

    expect(screen.queryByTestId("bloom-overlay")).toBeNull();
    expect(screen.queryByTestId("bloom-overlay-reduced")).toBeNull();

    // Advance fake timers — still no bloom
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.queryByTestId("bloom-overlay")).toBeNull();
    expect(screen.queryByTestId("bloom-overlay-reduced")).toBeNull();
  });
});

// ── C-m7d-002: 99→100 transition mounts bloom-overlay exactly once ───────────

describe("C-m7d-002: <TimelineBlock> mounts bloom-overlay on 99→100 transition", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("bloom-overlay mounts after 0%→100% prop change", async () => {
    const { rerender } = render(
      <TimelineBlock block={blockAt0} categories={[cat1]} />,
    );

    // Initially no bloom
    expect(screen.queryByTestId("bloom-overlay")).toBeNull();
    expect(screen.queryByTestId("bloom-overlay-reduced")).toBeNull();

    // Transition to 100%
    await act(async () => {
      rerender(<TimelineBlock block={blockAt100v2} categories={[cat1]} />);
    });

    // bloom-overlay should now be in DOM (bloomKey bumped to 1)
    expect(screen.queryByTestId("bloom-overlay")).not.toBeNull();
  });
});

// ── C-m7d-003: 100→99→100 does NOT re-mount bloom-overlay (sparing) ──────────

describe("C-m7d-003: <TimelineBlock> does NOT re-mount bloom-overlay on 100→99→100 cycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("haptics.success fires exactly once on first crossing; not on second", async () => {
    const { rerender } = render(
      <TimelineBlock block={blockAt0} categories={[cat1]} />,
    );

    // First crossing: 0%→100%
    await act(async () => {
      rerender(<TimelineBlock block={blockAt100v2} categories={[cat1]} />);
    });

    // Bloom overlay present after first crossing
    expect(screen.queryByTestId("bloom-overlay")).not.toBeNull();

    // Cross back to 0%
    await act(async () => {
      rerender(<TimelineBlock block={blockBackToLow} categories={[cat1]} />);
    });

    // Cross back to 100% — second crossing should NOT re-fire
    await act(async () => {
      rerender(<TimelineBlock block={blockAt100v2} categories={[cat1]} />);
    });

    // haptics.success was called exactly once — sparing semantics
    const { haptics } = await import("@/lib/haptics");
    expect(haptics.success).toHaveBeenCalledTimes(1);
  });
});

// ── C-m7d-004: PRM — bloom-overlay-reduced mounts on 99→100 (not spring overlay) ──

describe("C-m7d-004: under PRM, bloom-overlay-reduced mounts on 99→100; bloom-overlay does not", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("PRM path: bloom-overlay-reduced present, bloom-overlay absent after transition", async () => {
    const { useReducedMotion } = await import("motion/react");
    vi.mocked(useReducedMotion).mockReturnValue(true);

    const { rerender } = render(
      <TimelineBlock block={blockAt0} categories={[cat1]} />,
    );

    expect(screen.queryByTestId("bloom-overlay")).toBeNull();
    expect(screen.queryByTestId("bloom-overlay-reduced")).toBeNull();

    // Transition to 100%
    await act(async () => {
      rerender(<TimelineBlock block={blockAt100v2} categories={[cat1]} />);
    });

    // Under PRM: spring motion.div does NOT render (bloom-overlay absent)
    expect(screen.queryByTestId("bloom-overlay")).toBeNull();

    // But the CSS opacity-flash overlay DOES render (bloom-overlay-reduced present)
    const reduced = screen.queryByTestId("bloom-overlay-reduced");
    expect(reduced).not.toBeNull();

    // The reduced overlay has the required style properties
    expect(reduced!.className).toContain("bloom-reduced");
    expect(reduced!.style.position).toBe("absolute");
    expect(reduced!.style.inset).toBe("0px");
    expect(reduced!.style.pointerEvents).toBe("none");
  });
});

// ── C-m7d-005: 99→100 fires haptics.success once + playChime once (M7f: audio enabled) ──

describe("C-m7d-005: <TimelineBlock> 99→100 fires haptics.success once; playChime called once (M7f)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("haptics.success called once, playChime called once on 0%→100%", async () => {
    const { haptics } = await import("@/lib/haptics");
    const { playChime } = await import("@/lib/audio");

    const { rerender } = render(
      <TimelineBlock block={blockAt0} categories={[cat1]} />,
    );

    await act(async () => {
      rerender(<TimelineBlock block={blockAt100v2} categories={[cat1]} />);
    });

    expect(haptics.success).toHaveBeenCalledTimes(1);
    // M7f: withAudio:true — playChime is now called once per block celebration
    expect(playChime).toHaveBeenCalledTimes(1);
    expect(haptics.notification).toHaveBeenCalledTimes(0);
  });

  it("TimelineBlock source does NOT import playChime directly", () => {
    // Source-inspection assertion: verify the component no longer imports playChime.
    // This proves the audio gate is routed through celebrate() only.
    const src = readFileSync(join(__dirname, "./TimelineBlock.tsx"), "utf-8");
    // Should NOT have a direct import of playChime from audio
    expect(/import.*playChime.*from.*audio/.test(src)).toBe(false);
  });
});
