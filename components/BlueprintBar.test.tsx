import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BlueprintBar } from "./BlueprintBar";
import { BLOCKS } from "@/lib/data";
import { duration, nowOffsetPct } from "@/lib/dharma";
import { CATEGORY_COLOR } from "@/lib/types";

// C-bld-008: renders exactly BLOCKS.length segments with correct widths
describe("C-bld-008: BlueprintBar renders correct number of segments", () => {
  it("renders 16 segments with proportional widths", () => {
    const { container } = render(<BlueprintBar blocks={BLOCKS} now="11:47" />);
    const segments = container.querySelectorAll(
      "[data-testid='blueprint-segment']",
    );
    expect(segments).toHaveLength(BLOCKS.length);

    const total = BLOCKS.reduce((s, b) => s + duration(b), 0);
    segments.forEach((seg, i) => {
      const expectedPct = (duration(BLOCKS[i]) / total) * 100;
      const style = (seg as HTMLElement).style.width;
      expect(style).toBe(`${expectedPct}%`);
    });
  });
});

// Helper: convert #rrggbb hex to "rgb(r, g, b)" for jsdom-normalised comparison
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

// C-bld-009: each segment's gradient base color matches CATEGORY_COLOR
describe("C-bld-009: BlueprintBar segments use correct category colors", () => {
  it("each segment background includes the category color", () => {
    const { container } = render(<BlueprintBar blocks={BLOCKS} now="11:47" />);
    const segments = container.querySelectorAll(
      "[data-testid='blueprint-segment']",
    );
    segments.forEach((seg, i) => {
      const hex = CATEGORY_COLOR[BLOCKS[i].category];
      // jsdom normalises hex to rgb() in computed styles
      const rgb = hexToRgb(hex);
      const bg = (seg as HTMLElement).style.background;
      expect(bg).toContain(rgb);
    });
  });
});

// C-bld-010: NOW pin is positioned at nowOffsetPct% and has correct aria-label
describe("C-bld-010: BlueprintBar NOW pin position and aria-label", () => {
  it("NOW pin has correct left style and aria-label", () => {
    const { container } = render(<BlueprintBar blocks={BLOCKS} now="11:47" />);
    const pin = container.querySelector("[data-testid='now-pin']");
    expect(pin).not.toBeNull();
    const offsetPct = nowOffsetPct(BLOCKS, "11:47");
    const style = (pin as HTMLElement).style.left;
    expect(style).toBe(`${offsetPct}%`);
    expect(pin).toHaveAttribute("aria-label", "Now 11:47");
  });
});

// C-bld-011: legend shows four chips in order: HEALTH, MIND, CAREER, PASSIVE
describe("C-bld-011: BlueprintBar legend has four chips in correct order", () => {
  it("renders HEALTH, MIND, CAREER, PASSIVE legend chips", () => {
    render(<BlueprintBar blocks={BLOCKS} now="11:47" />);
    const legendTexts = ["HEALTH", "MIND", "CAREER", "PASSIVE"];
    legendTexts.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });
});
