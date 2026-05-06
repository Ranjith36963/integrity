import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// C-m1-022: BuildingClient.tsx does NOT import forbidden M1 components
// per plan.md § File structure — [obsolete: not-imported-in-M1] migration.
describe("C-m1-022: BuildingClient.tsx has clean imports (no forbidden M1 dependencies)", () => {
  const rawSource = readFileSync(
    resolve(process.cwd(), "app/(building)/BuildingClient.tsx"),
    "utf-8",
  );

  // Strip comments to avoid false positives from "// - Removed: NowCard" style notes
  const source = rawSource
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");

  it("does not import NowCard", () => {
    expect(source).not.toMatch(/\bNowCard\b/);
  });

  it("does not import TimelineBlock", () => {
    expect(source).not.toMatch(/\bTimelineBlock\b/);
  });

  it("does not import Brick component", () => {
    // Brick type can be imported; the Brick component from components/ must not be
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

  it("does not use currentBlockIndex or dayPct (not needed in M1 empty path)", () => {
    expect(source).not.toMatch(/\bcurrentBlockIndex\b/);
    expect(source).not.toMatch(/\bdayPct\b/);
  });
});
