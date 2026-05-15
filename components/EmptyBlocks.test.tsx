import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock usePrefersReducedMotion at module level so vi.mock hoisting works
vi.mock("@/lib/reducedMotion", () => ({
  usePrefersReducedMotion: vi.fn(() => false),
}));

import { usePrefersReducedMotion } from "@/lib/reducedMotion";
import { EmptyBlocks } from "./EmptyBlocks";

// C-m1-014 (EmptyBlocks): locked SPEC copy and M0 EmptyState primitive
describe("C-m1-014 (EmptyBlocks): renders locked SPEC copy using M0 EmptyState primitive", () => {
  it("renders 'Tap any slot to lay your first block.' verbatim", () => {
    render(<EmptyBlocks />);
    expect(
      screen.getByText("Tap any slot to lay your first block."),
    ).toBeInTheDocument();
  });

  it("uses the M0 <EmptyState> primitive (data-testid=empty-state)", () => {
    const { container } = render(<EmptyBlocks />);
    expect(container.querySelector('[data-testid="empty-state"]')).not.toBeNull();
  });
});

// C-m1-015: reduced-motion disables pulse animation
describe("C-m1-015: EmptyBlocks pulse collapses under prefers-reduced-motion", () => {
  // The EmptyState component uses CSS media query for pulse animation.
  // In jsdom, we mock usePrefersReducedMotion to simulate the query.
  // The CSS gate is: @media (prefers-reduced-motion: no-preference) { .empty-state-root[data-pulse="true"] { animation: pulse ... } }
  // Under reduced motion, the class is still applied but the animation rule doesn't fire.
  // We test the data-pulse attribute since CSS media queries aren't fully evaluated in jsdom.

  it("has data-pulse=true by default (pulse enabled when motion is allowed)", () => {
    const { container } = render(<EmptyBlocks />);
    const root = container.querySelector('[data-testid="empty-state"]');
    expect(root).not.toBeNull();
    expect((root as HTMLElement).getAttribute("data-pulse")).toBe("true");
  });

  it("renders without animation class when usePrefersReducedMotion returns true", () => {
    // Set usePrefersReducedMotion to return true for this test
    vi.mocked(usePrefersReducedMotion).mockReturnValue(true);

    const { container } = render(<EmptyBlocks />);
    const root = container.querySelector('[data-testid="empty-state"]');
    expect(root).not.toBeNull();
    // data-pulse=false when reducedMotion=true (pulse is disabled)
    expect((root as HTMLElement).getAttribute("data-pulse")).toBe("false");

    // Reset to default
    vi.mocked(usePrefersReducedMotion).mockReturnValue(false);
  });
});
