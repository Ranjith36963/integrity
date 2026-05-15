import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// C-m1-022 (re-authored M2): BuildingClient.tsx import graph checks
// M2: TimelineBlock IS now expected (via Timeline import chain)
// M2: NowCard / Brick / BrickStepper / Scaffold / EmptyBricks still absent
describe("C-m1-022 (re-authored M2): BuildingClient.tsx has clean imports", () => {
  const rawSource = readFileSync(
    resolve(process.cwd(), "app/(building)/BuildingClient.tsx"),
    "utf-8",
  );

  // Strip comments to avoid false positives from comment text
  const source = rawSource
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");

  it("does not import NowCard", () => {
    expect(source).not.toMatch(/\bNowCard\b/);
  });

  it("does NOT directly import TimelineBlock (via Timeline instead)", () => {
    // TimelineBlock is in the render path via Timeline.tsx, not directly imported
    // BuildingClient imports Timeline, not TimelineBlock directly.
    expect(source).not.toMatch(/from.*components\/TimelineBlock/);
  });

  it("does not import Brick component", () => {
    expect(source).not.toMatch(/from.*components\/Brick/);
  });

  it("does not import BrickStepper", () => {
    expect(source).not.toMatch(/\bBrickStepper\b/);
  });

  it("does not import Scaffold", () => {
    expect(source).not.toMatch(/\bScaffold\b/);
  });

  it("does not import EmptyBricks", () => {
    expect(source).not.toMatch(/\bEmptyBricks\b/);
  });

  it("does import usePersistedState (M8: replaces useReducer+defaultState direct import)", () => {
    // M8: BuildingClient delegates state + hydration to usePersistedState hook.
    // reducer and defaultState are now used inside usePersistedState, not directly by BuildingClient.
    expect(source).toMatch(/usePersistedState/);
    expect(source).toMatch(/from.*lib\/usePersistedState/);
  });

  it("does import AddBlockSheet (M2 new component)", () => {
    expect(source).toMatch(/\bAddBlockSheet\b/);
  });
});
