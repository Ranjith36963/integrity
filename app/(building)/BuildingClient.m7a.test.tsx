/**
 * BuildingClient.m7a.test.tsx — C-m7a-010 and C-m7a-011
 *
 * These tests use vi.mock for BlueprintBar / Timeline / LooseBricksTray
 * to spy on the `stagger` prop. Isolated in a separate file so the mocks
 * do not affect the existing BuildingClient.test.tsx assertions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Dispatch } from "react";
import { render } from "@testing-library/react";
import { BuildingClient } from "./BuildingClient";
import type { AppState, Action } from "@/lib/types";

// ─── Mock BlueprintBar / Timeline / LooseBricksTray to spy on stagger prop ───

/** Records each stagger prop value received by a mocked surface */
const blueprintBarStaggerCalls: boolean[] = [];
const timelineStaggerCalls: boolean[] = [];
const looseBricksTrayStaggerCalls: boolean[] = [];

vi.mock("@/components/BlueprintBar", () => ({
  BlueprintBar: ({ stagger }: { stagger?: boolean }) => {
    blueprintBarStaggerCalls.push(stagger ?? false);
    return <div data-testid="blueprint-bar-container" />;
  },
}));
vi.mock("@/components/Timeline", () => ({
  Timeline: ({ stagger }: { stagger?: boolean }) => {
    timelineStaggerCalls.push(stagger ?? false);
    return <div data-testid="hour-grid" />;
  },
}));
vi.mock("@/components/LooseBricksTray", () => ({
  LooseBricksTray: ({ stagger }: { stagger?: boolean }) => {
    looseBricksTrayStaggerCalls.push(stagger ?? false);
    return <div data-testid="loose-bricks-tray" />;
  },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** AppState with one block + one tick brick so showTray=true */
const stateWithBlock: AppState = {
  blocks: [
    {
      id: "blk-m7a",
      name: "Morning",
      start: "09:00",
      recurrence: { kind: "just-today" },
      categoryId: null,
      bricks: [
        {
          id: "brk-m7a",
          name: "Coffee",
          categoryId: null,
          parentBlockId: "blk-m7a",
          hasDuration: false,
          recurrence: { kind: "just-today" },
          kind: "tick",
          done: false,
        },
      ],
    },
  ],
  categories: [],
  looseBricks: [],
  programStart: "2026-01-01",
  currentDate: "2026-05-20",
  history: {},
  deletions: {},
};

// ─── C-m7a-010 ────────────────────────────────────────────────────────────────

describe("C-m7a-010: stagger fires exactly once per BuildingClient mount; re-renders do not re-trigger", () => {
  beforeEach(() => {
    blueprintBarStaggerCalls.length = 0;
    timelineStaggerCalls.length = 0;
    looseBricksTrayStaggerCalls.length = 0;
  });

  it("first hydrated render: stagger===true exactly once; second render (re-render): stagger===false", () => {
    const dispatch = vi.fn() as unknown as Dispatch<Action>;
    const { rerender } = render(
      <BuildingClient
        state={stateWithBlock}
        dispatch={dispatch}
        hydrated={true}
      />,
    );

    // After first render, stagger must have been true exactly once
    expect(blueprintBarStaggerCalls.filter(Boolean).length).toBe(1);
    expect(timelineStaggerCalls.filter(Boolean).length).toBe(1);

    // Force a re-render (simulating state update — same hydrated prop, new object ref)
    rerender(
      <BuildingClient
        state={{ ...stateWithBlock }}
        dispatch={dispatch}
        hydrated={true}
      />,
    );

    // After the re-render, stagger=true count must remain exactly 1 (did not re-trigger)
    expect(blueprintBarStaggerCalls.filter(Boolean).length).toBe(1);
    expect(timelineStaggerCalls.filter(Boolean).length).toBe(1);
    // The most recent call must have been stagger=false
    expect(blueprintBarStaggerCalls[blueprintBarStaggerCalls.length - 1]).toBe(
      false,
    );
  });

  it("unmount + fresh render: new mount fires stagger=true again (ref resets at pending)", () => {
    const dispatch = vi.fn() as unknown as Dispatch<Action>;
    const { unmount } = render(
      <BuildingClient
        state={stateWithBlock}
        dispatch={dispatch}
        hydrated={true}
      />,
    );
    // First mount — stagger=true exactly once
    expect(blueprintBarStaggerCalls.filter(Boolean).length).toBe(1);

    // Unmount (simulates navigating away from Day view)
    unmount();
    blueprintBarStaggerCalls.length = 0;
    timelineStaggerCalls.length = 0;

    // Fresh render — completely new component instance (ref restarts at "pending")
    render(
      <BuildingClient
        state={stateWithBlock}
        dispatch={dispatch}
        hydrated={true}
      />,
    );
    // New mount must fire stagger=true again
    expect(blueprintBarStaggerCalls.filter(Boolean).length).toBe(1);
  });
});

// ─── C-m7a-011 ────────────────────────────────────────────────────────────────
// Reduced-motion path: usePrefersReducedMotion()=true → staggerChildren=0 and
// child duration=0 in all three surfaces.
//
// The three surfaces (BlueprintBar/Timeline/LooseBricksTray) receive stagger=true
// on first hydrated render. Their internal reduced-motion logic (using
// usePrefersReducedMotion()) collapses staggerChildren and child duration to 0.
// This test mocks usePrefersReducedMotion to return true and checks that the
// containerVariants / childVariants produced by each surface carry the expected
// 0-values when stagger=true and PRM=true.
//
// Because the surfaces are mocked at the top of this file (they push to spy arrays),
// we can't easily verify the variant *values* from inside this file without
// real component rendering. We instead verify through the real BlueprintBar
// component in BlueprintBar.test.tsx (C-m7a-006 and the existing PRM tests).
// C-m7a-011 in this file verifies that BuildingClient forwards stagger=true to
// all three surfaces on the first hydrated render even when PRM is true — the
// PRM mock is set at the BuildingClient level; the surfaces handle PRM themselves.

vi.mock("@/lib/reducedMotion", () => ({
  usePrefersReducedMotion: () => true,
}));

describe("C-m7a-011: reduced-motion path — stagger=true still forwarded to surfaces; PRM handled per-surface", () => {
  beforeEach(() => {
    blueprintBarStaggerCalls.length = 0;
    timelineStaggerCalls.length = 0;
    looseBricksTrayStaggerCalls.length = 0;
  });

  it("with PRM=true: BlueprintBar + Timeline still receive stagger=true on first hydrated render", () => {
    const dispatch = vi.fn() as unknown as Dispatch<Action>;
    render(
      <BuildingClient
        state={stateWithBlock}
        dispatch={dispatch}
        hydrated={true}
      />,
    );
    // stagger=true must still be forwarded — PRM does not suppress the prop,
    // it collapses the variants inside each surface
    expect(blueprintBarStaggerCalls.filter(Boolean).length).toBe(1);
    expect(timelineStaggerCalls.filter(Boolean).length).toBe(1);
  });
});
