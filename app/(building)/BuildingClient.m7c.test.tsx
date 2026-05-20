/**
 * BuildingClient.m7c.test.tsx — C-m7c-013
 *
 * Tests that BuildingClient threads firstPaintCountUp={stagger} to <Hero>
 * reusing the SAME stagger variable from useFirstPaintAfterHydration — no parallel
 * ref machine. Isolated in a separate file so mocks do not affect the existing
 * BuildingClient.test.tsx or BuildingClient.m7a.test.tsx assertions.
 *
 * Mechanism: mock <Hero> to record the firstPaintCountUp prop it receives.
 * This is the BUILDER's pick (data-attribute spy vs. mock-<Hero>) per VERIFIER
 * binding ratification on C-m7c-013.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import type { Dispatch } from "react";
import { render } from "@testing-library/react";
import { BuildingClient } from "./BuildingClient";
import type { AppState, Action } from "@/lib/types";

// ─── Mock <Hero> to record firstPaintCountUp prop ────────────────────────────
// This lets us assert that BuildingClient threads firstPaintCountUp={stagger}
// without needing to render the full Hero + HeroRing subtree.

const heroFirstPaintCountUpCalls: boolean[] = [];

vi.mock("@/components/Hero", () => ({
  Hero: ({
    firstPaintCountUp,
  }: {
    pct?: number;
    dateLabel?: string;
    dayNumber?: number;
    totalDays?: number;
    firstPaintCountUp?: boolean;
  }) => {
    heroFirstPaintCountUpCalls.push(firstPaintCountUp ?? false);
    return <div data-testid="mock-hero" />;
  },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** Minimal AppState with dayPct=30 */
const stateWithPct: AppState = {
  blocks: [
    {
      id: "blk-m7c",
      name: "Morning",
      start: "09:00",
      recurrence: { kind: "just-today", date: "2026-05-20" },
      categoryId: null,
      bricks: [
        {
          id: "brk-m7c",
          name: "Coffee",
          categoryId: null,
          parentBlockId: "blk-m7c",
          hasDuration: false,
          recurrence: { kind: "just-today", date: "2026-05-20" },
          kind: "tick",
          done: true,
        },
      ],
    },
  ],
  categories: [],
  looseBricks: [],
  programStart: "2026-05-01",
  currentDate: "2026-05-20",
  history: {},
  deletions: {},
  schemaVersion: 3,
};

// ─── C-m7c-013: BuildingClient threads firstPaintCountUp={stagger} to Hero ───

describe("C-m7c-013 — BuildingClient threads firstPaintCountUp={stagger} to Hero; no parallel ref machine", () => {
  beforeEach(() => {
    heroFirstPaintCountUpCalls.length = 0;
    localStorage.clear();
  });

  it("first hydrated render: Hero receives firstPaintCountUp={true}", () => {
    const dispatch = vi.fn() as unknown as Dispatch<Action>;
    render(
      <BuildingClient
        state={stateWithPct}
        dispatch={dispatch}
        hydrated={true}
      />,
    );

    // The mocked Hero should have been called with firstPaintCountUp=true on first render
    // (stagger=true because useFirstPaintAfterHydration returns true on first hydrated render)
    const trueCount = heroFirstPaintCountUpCalls.filter(Boolean).length;
    expect(trueCount).toBeGreaterThanOrEqual(1);
  });

  it("after re-render: Hero receives firstPaintCountUp={false}", () => {
    const dispatch = vi.fn() as unknown as Dispatch<Action>;
    const { rerender } = render(
      <BuildingClient
        state={stateWithPct}
        dispatch={dispatch}
        hydrated={true}
      />,
    );

    // First render: stagger=true (one true call)
    const trueCountBefore = heroFirstPaintCountUpCalls.filter(Boolean).length;
    expect(trueCountBefore).toBeGreaterThanOrEqual(1);

    // Reset the spy
    heroFirstPaintCountUpCalls.length = 0;

    // Force a re-render (simulating a state update — same hydrated prop, new object ref)
    // useFirstPaintAfterHydration returns false after the first render
    rerender(
      <BuildingClient
        state={{ ...stateWithPct }}
        dispatch={dispatch}
        hydrated={true}
      />,
    );

    // After re-render: stagger=false (tri-state ref machine is in "done" state)
    const trueCountAfter = heroFirstPaintCountUpCalls.filter(Boolean).length;
    expect(trueCountAfter).toBe(0);
    // The last call was false
    expect(
      heroFirstPaintCountUpCalls[heroFirstPaintCountUpCalls.length - 1],
    ).toBe(false);
  });

  it("source file has EXACTLY ONE invocation of useFirstPaintAfterHydration (no parallel ref machine)", () => {
    const sourcePath = join(process.cwd(), "app/(building)/BuildingClient.tsx");
    const source = readFileSync(sourcePath, "utf-8");
    // Verify there is exactly 1 call site (not counting the import line)
    // The call site should be: const stagger = useFirstPaintAfterHydration(hydrated)
    const nonImportMatches = source
      .split("\n")
      .filter(
        (line) =>
          line.includes("useFirstPaintAfterHydration(") &&
          !line.includes("import"),
      );
    expect(nonImportMatches.length).toBe(1);
    // And that call site uses the `stagger` variable (not a new variable)
    expect(nonImportMatches[0]).toMatch(/const stagger\s*=/);
  });

  it("source file Hero call site includes firstPaintCountUp={stagger} (no new variable)", () => {
    const sourcePath = join(process.cwd(), "app/(building)/BuildingClient.tsx");
    const source = readFileSync(sourcePath, "utf-8");
    // The Hero call site must use the stagger variable (not countUpRef.current, didCountUp, etc.)
    expect(source).toMatch(/firstPaintCountUp=\{stagger\}/);
    // Must NOT have a parallel count-up state variable
    const hasParallelState =
      /const\s+\[.*countUp.*,.*setCountUp.*\]\s*=\s*useState/.test(source) ||
      /const\s+countUpRef\s*=\s*useRef/.test(source);
    expect(hasParallelState).toBe(false);
  });
});
