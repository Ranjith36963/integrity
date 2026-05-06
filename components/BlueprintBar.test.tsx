import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BlueprintBar } from "./BlueprintBar";

// C-m1-007: BlueprintBar renders empty-outline path with zero segments (SG-m1-02)
describe("C-m1-007: BlueprintBar empty-outline path with blocks=[]", () => {
  it("renders section with aria-label, outlined container, zero segments, no NaN/Infinity, no legend", () => {
    const { container } = render(<BlueprintBar blocks={[]} now="12:00" />);

    // aria-label on section
    const section = container.querySelector('[aria-label="Day blueprint"]');
    expect(section).not.toBeNull();

    // Zero blueprint-segment elements
    const segments = container.querySelectorAll('[data-testid="blueprint-segment"]');
    expect(segments).toHaveLength(0);

    // No legend (no hardcoded category labels)
    expect(screen.queryByText(/HEALTH/i)).toBeNull();
    expect(screen.queryByText(/MIND/i)).toBeNull();
    expect(screen.queryByText(/CAREER/i)).toBeNull();
    expect(screen.queryByText(/PASSIVE/i)).toBeNull();

    // No NaN / Infinity / empty % value
    const text = container.textContent ?? "";
    expect(text).not.toContain("NaN");
    expect(text).not.toContain("Infinity");
    expect(text).not.toMatch(/%\s*$/); // no bare % at end

    // Faint grid: either non-empty background-image OR blueprint-grid element
    const barContainer = container.querySelector(
      '[data-testid="blueprint-bar-container"]',
    );
    const gridEl = container.querySelector('[data-testid="blueprint-grid"]');
    if (barContainer) {
      const style = (barContainer as HTMLElement).getAttribute("style") ?? "";
      const hasGradient = style.includes("linear-gradient");
      const hasGrid = gridEl !== null;
      expect(hasGradient || hasGrid).toBe(true);
    } else {
      // Grid element is present
      expect(gridEl).not.toBeNull();
    }
  });
});

// C-m1-008: BlueprintBar NOW pin at 12:00 = 50%, at 06:00 = 25%
describe("C-m1-008: BlueprintBar NOW pin position for empty blocks", () => {
  it("now-pin at 12:00 resolves to left=50% (time-based fallback for empty blocks)", () => {
    const { container } = render(<BlueprintBar blocks={[]} now="12:00" />);
    const nowPin = container.querySelector('[data-testid="now-pin"]');
    expect(nowPin).not.toBeNull();
    const style = (nowPin as HTMLElement).getAttribute("style") ?? "";
    // left should contain 50 (either "50%" or "50.0%")
    expect(style).toMatch(/left:\s*50%/);
    // No NaN or Infinity in left
    expect(style).not.toContain("NaN");
    expect(style).not.toContain("Infinity");
  });

  it("now-pin at 06:00 resolves to left=25%", () => {
    const { container } = render(<BlueprintBar blocks={[]} now="06:00" />);
    const nowPin = container.querySelector('[data-testid="now-pin"]');
    expect(nowPin).not.toBeNull();
    const style = (nowPin as HTMLElement).getAttribute("style") ?? "";
    expect(style).toMatch(/left:\s*25%/);
    expect(style).not.toContain("NaN");
    expect(style).not.toContain("Infinity");
  });
});
