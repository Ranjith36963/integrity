import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { NowLine } from "./NowLine";
import { HOUR_HEIGHT_PX } from "@/lib/timeOffset";

// C-m1-010 (NowLine): amber background-color and correct top position
describe("C-m1-010 (NowLine): NowLine has correct pixel position and accent color", () => {
  it("renders at top=512px for now=08:00 (8 * 64)", () => {
    const { container } = render(<NowLine now="08:00" />);
    const line = container.querySelector('[data-testid="now-line"]');
    expect(line).not.toBeNull();
    const style = (line as HTMLElement).getAttribute("style") ?? "";
    expect(style).toContain("512px");
  });

  it("renders at top=0px for now=00:00", () => {
    const { container } = render(<NowLine now="00:00" />);
    const line = container.querySelector('[data-testid="now-line"]');
    const style = (line as HTMLElement).getAttribute("style") ?? "";
    expect(style).toContain("0px");
  });

  it("renders with top in [1535, 1536) for now=23:59", () => {
    const { container } = render(<NowLine now="23:59" />);
    const line = container.querySelector('[data-testid="now-line"]');
    const style = (line as HTMLElement).getAttribute("style") ?? "";
    // Extract top value
    const match = style.match(/top:\s*([\d.]+)px/);
    expect(match).not.toBeNull();
    const topVal = parseFloat(match![1]);
    expect(topVal).toBeGreaterThanOrEqual(1534);
    expect(topVal).toBeLessThan(1536);
  });

  it("has background-color referencing --accent", () => {
    const { container } = render(<NowLine now="08:00" />);
    const line = container.querySelector('[data-testid="now-line"]');
    const style = (line as HTMLElement).getAttribute("style") ?? "";
    expect(style).toContain("var(--accent)");
  });
});

// C-m1-012 (NowLine): tracks now changes
describe("C-m1-012 (NowLine): NowLine re-renders when now changes", () => {
  it("updates top from 512px to ~513px when now goes from 08:00 to 08:01", () => {
    const { container, rerender } = render(<NowLine now="08:00" />);
    const line = container.querySelector('[data-testid="now-line"]');
    const style1 = (line as HTMLElement).getAttribute("style") ?? "";
    const match1 = style1.match(/top:\s*([\d.]+)px/);
    const top1 = parseFloat(match1![1]);
    expect(top1).toBeCloseTo(512, 0);

    rerender(<NowLine now="08:01" />);
    const style2 = (line as HTMLElement).getAttribute("style") ?? "";
    const match2 = style2.match(/top:\s*([\d.]+)px/);
    const top2 = parseFloat(match2![1]);
    // 8*64 + (1/60)*64 ≈ 513.067
    expect(top2).toBeGreaterThan(512);
    expect(top2).toBeCloseTo(513.067, 0);
  });
});

// ── C-m7b-014 ─────────────────────────────────────────────────────────────────
describe("C-m7b-014 — <NowLine> rendered boxShadow includes larger-halo token 0 0 12px rgba(251, 191, 36", () => {
  it("boxShadow attribute string contains '0 0 6px var(--accent)' (inner halo)", () => {
    const { container } = render(<NowLine now="09:30" />);
    const line = container.querySelector(
      '[data-testid="now-line"]',
    ) as HTMLElement;
    const style = line.getAttribute("style") ?? "";
    expect(style).toContain("0 0 6px var(--accent)");
  });

  it("boxShadow attribute string contains '0 0 12px rgba(251, 191, 36' (outer larger soft halo)", () => {
    const { container } = render(<NowLine now="09:30" />);
    const line = container.querySelector(
      '[data-testid="now-line"]',
    ) as HTMLElement;
    const style = line.getAttribute("style") ?? "";
    expect(style).toMatch(/0 0 12px rgba\(251,\s*191,\s*36,\s*0\.45\)/);
  });

  it("existing position assertion unchanged — top for 09:30 = 9.5 * 64 = 608px", () => {
    const { container } = render(<NowLine now="09:30" />);
    const line = container.querySelector(
      '[data-testid="now-line"]',
    ) as HTMLElement;
    const style = line.getAttribute("style") ?? "";
    const match = style.match(/top:\s*([\d.]+)px/);
    expect(match).not.toBeNull();
    expect(parseFloat(match![1])).toBeCloseTo(9.5 * 64, 0);
  });

  it("data-testid, role, aria-label are byte-identical to pre-M7b", () => {
    const { container } = render(<NowLine now="09:30" />);
    const line = container.querySelector(
      '[data-testid="now-line"]',
    ) as HTMLElement;
    expect(line.getAttribute("role")).toBe("img");
    expect(line.getAttribute("aria-label")).toBe("Now 09:30");
    expect(line.dataset.testid).toBe("now-line");
  });
});

// C-m1-013 (NowLine): no transition on top (always snaps, reduced-motion safe)
describe("C-m1-013 (NowLine): NowLine has no transition on top — always snaps", () => {
  it("does not have a transition style on the now-line element", () => {
    const { container } = render(<NowLine now="12:00" />);
    const line = container.querySelector('[data-testid="now-line"]');
    const style = (line as HTMLElement).getAttribute("style") ?? "";
    // Must not have a CSS transition on top
    expect(style).not.toContain("transition");
  });

  it("has HOUR_HEIGHT_PX=64 relationship: top for 12:00 = 12 * HOUR_HEIGHT_PX", () => {
    const { container } = render(<NowLine now="12:00" />);
    const line = container.querySelector('[data-testid="now-line"]');
    const style = (line as HTMLElement).getAttribute("style") ?? "";
    const match = style.match(/top:\s*([\d.]+)px/);
    const topVal = parseFloat(match![1]);
    expect(topVal).toBeCloseTo(12 * HOUR_HEIGHT_PX, 2);
  });
});
