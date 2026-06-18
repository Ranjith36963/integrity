/**
 * components/YearHeatmapPreview.test.tsx — M7e: C-m7e-012..014
 * Tests for the year heatmap preview overlay.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { YearHeatmapPreview } from "./YearHeatmapPreview";
import type { AppState } from "@/lib/types";
import * as fs from "node:fs";
import * as path from "node:path";

const fixtureState: AppState = {
  blocks: [],
  categories: [],
  looseBricks: [],
  programStart: "2026-01-01",
  currentDate: "2026-05-20",
  history: {},
  deletions: {},
  firstBrickShown: true,
};

// C-m7e-012: renders 12 MonthCell instances (via data-month-index attributes)
describe("C-m7e-012: <YearHeatmapPreview> renders 12 cells; imports MonthCell NOT YearView", () => {
  it("mounts year-heatmap-preview with 12 [data-month-index] cells (0..11)", () => {
    render(<YearHeatmapPreview state={fixtureState} />);
    const overlay = screen.getByTestId("year-heatmap-preview");
    expect(overlay).toBeTruthy();

    const cells = overlay.querySelectorAll("[data-month-index]");
    expect(cells).toHaveLength(12);
    // Each index from 0..11 is present
    for (let i = 0; i < 12; i++) {
      expect(overlay.querySelector(`[data-month-index="${i}"]`)).toBeTruthy();
    }
  });

  it("source file imports MonthCell and does NOT import YearView", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "components/YearHeatmapPreview.tsx"),
      "utf8",
    );
    expect(src).toContain("MonthCell");
    expect(src).not.toContain("YearView");
  });
});

// C-m7e-013: reads from state only — no clock calls
describe("C-m7e-013: <YearHeatmapPreview> reads from state only — ADR-046 clock-purity", () => {
  it("source file has zero clock-read calls (Date.now, new Date, useNow)", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "components/YearHeatmapPreview.tsx"),
      "utf8",
    );
    // No direct clock reads in the component
    expect(src).not.toMatch(/Date\.now\b/);
    expect(src).not.toMatch(/new Date\b/);
    expect(src).not.toMatch(/useNow\b/);
  });

  it("rendered output is deterministic regardless of wall-clock setting", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T00:00:00"));

    const { container: c1 } = render(
      <YearHeatmapPreview state={fixtureState} />,
    );
    const cells1Count = c1.querySelectorAll("[data-month-index]").length;

    vi.setSystemTime(new Date("2026-01-01T00:00:00"));

    const { container: c2 } = render(
      <YearHeatmapPreview state={fixtureState} />,
    );
    const cells2Count = c2.querySelectorAll("[data-month-index]").length;

    expect(cells1Count).toBe(12);
    expect(cells2Count).toBe(12);

    vi.useRealTimers();
  });
});

// C-m7e-014: overlay has dialog role/aria-modal/aria-label; grid is aria-hidden
describe("C-m7e-014: overlay has role=dialog, aria-modal, aria-label; grid aria-hidden", () => {
  it("overlay root has role=dialog, aria-modal=true, aria-label=Year heatmap preview", () => {
    render(<YearHeatmapPreview state={fixtureState} />);
    const overlay = screen.getByTestId("year-heatmap-preview");
    expect(overlay.getAttribute("role")).toBe("dialog");
    expect(overlay.getAttribute("aria-modal")).toBe("true");
    expect(overlay.getAttribute("aria-label")).toBe("Year heatmap preview");
  });

  it("inner grid container has aria-hidden=true", () => {
    render(<YearHeatmapPreview state={fixtureState} />);
    const overlay = screen.getByTestId("year-heatmap-preview");
    const grid = overlay.querySelector("[aria-hidden]");
    expect(grid).toBeTruthy();
    expect(grid!.getAttribute("aria-hidden")).toBe("true");
  });
});
