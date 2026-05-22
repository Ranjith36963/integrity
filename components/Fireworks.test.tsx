// components/Fireworks.test.tsx — M4a Fireworks overlay tests
// Covers: C-m4a-013, C-m4a-014

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { Fireworks } from "./Fireworks";

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return {
    ...actual,
    useReducedMotion: vi.fn(() => false),
  };
});

// ─── C-m4a-013: Fireworks renders overlay with aria-hidden + bounded particles ─

describe("C-m4a-013: Fireworks active=true renders overlay with aria-hidden and bounded particles", () => {
  it("renders fireworks overlay with aria-hidden='true' and pointer-events:none", () => {
    const { container } = render(<Fireworks active={true} />);
    const overlay = container.querySelector(
      "[data-testid='fireworks']",
    ) as HTMLElement;
    expect(overlay).not.toBeNull();
    expect(overlay.getAttribute("aria-hidden")).toBe("true");
    expect(overlay.style.pointerEvents).toBe("none");
  });

  it("particle count is bounded (≤ 16 child nodes)", () => {
    const { container } = render(<Fireworks active={true} />);
    const overlay = container.querySelector("[data-testid='fireworks']");
    expect(overlay).not.toBeNull();
    // The overlay itself + its children (particles)
    const particles = overlay!.children;
    expect(particles.length).toBeLessThanOrEqual(16);
  });
});

// ─── C-m4a-014: reduced-motion suppresses Fireworks overlay ───────────────────

describe("C-m4a-014: Fireworks renders null when useReducedMotion=true", () => {
  it("returns null (nothing rendered) when useReducedMotion is true", async () => {
    const { useReducedMotion } = await import("motion/react");
    vi.mocked(useReducedMotion).mockReturnValue(true);
    const { container } = render(<Fireworks active={true} />);
    expect(container.firstChild).toBeNull();
  });
});
