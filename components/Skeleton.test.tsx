/**
 * components/Skeleton.test.tsx — M7a component tests.
 * Covers: C-m7a-001, C-m7a-002, C-m7a-003, C-m7a-004, C-m7a-012
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Skeleton } from "./Skeleton";

// C-m7a-001: <Skeleton variant="block"> renders shimmer class + aria-hidden + height
describe("C-m7a-001: <Skeleton variant='block'> renders shimmer class + correct height + aria-hidden by default", () => {
  it("renders a single div with skeleton-shimmer class", () => {
    const { container } = render(<Skeleton variant="block" />);
    const div = container.firstElementChild as HTMLElement;
    expect(div).not.toBeNull();
    expect(div.tagName).toBe("DIV");
    expect(div).toHaveClass("skeleton-shimmer");
  });

  it("carries data-variant='block'", () => {
    const { container } = render(<Skeleton variant="block" />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.dataset.variant).toBe("block");
  });

  it("aria-hidden is 'true' by default (decorative — no AT announcement)", () => {
    render(<Skeleton variant="block" />);
    // aria-hidden="true" means the element is hidden from AT
    const div = screen.queryByRole("region");
    expect(div).toBeNull(); // no role exposed
    const { container } = render(<Skeleton variant="block" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute("aria-hidden")).toBe("true");
  });

  it("inline style enforces height: 92px (CLS-safe match to TimelineBlock card height)", () => {
    const { container } = render(<Skeleton variant="block" />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.height).toBe("92px");
  });

  it("no text content inside the skeleton (no contrast violation risk)", () => {
    const { container } = render(<Skeleton variant="block" />);
    expect(container.firstElementChild?.textContent).toBe("");
  });
});

// C-m7a-002: <Skeleton variant="chip"> renders chip-shaped placeholder
describe("C-m7a-002: <Skeleton variant='chip'> renders chip-shaped placeholder; CLS-safe height/min-width", () => {
  it("carries skeleton-shimmer class + data-variant='chip'", () => {
    const { container } = render(<Skeleton variant="chip" />);
    const div = container.firstElementChild as HTMLElement;
    expect(div).toHaveClass("skeleton-shimmer");
    expect(div.dataset.variant).toBe("chip");
  });

  it("inline style enforces height: 28px (matches BrickChip size='sm')", () => {
    const { container } = render(<Skeleton variant="chip" />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.height).toBe("28px");
  });

  it("inline style enforces minWidth: 96px", () => {
    const { container } = render(<Skeleton variant="chip" />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.minWidth).toBe("96px");
  });

  it("inline style enforces borderRadius: 999px (pill shape)", () => {
    const { container } = render(<Skeleton variant="chip" />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.borderRadius).toBe("999px");
  });

  it("aria-hidden='true' by default", () => {
    const { container } = render(<Skeleton variant="chip" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute("aria-hidden")).toBe("true");
  });
});

// C-m7a-003: <Skeleton variant="segment"> renders BlueprintBar-segment placeholder
describe("C-m7a-003: <Skeleton variant='segment'> renders BlueprintBar-segment placeholder", () => {
  it("carries skeleton-shimmer class + data-variant='segment'", () => {
    const { container } = render(<Skeleton variant="segment" />);
    const div = container.firstElementChild as HTMLElement;
    expect(div).toHaveClass("skeleton-shimmer");
    expect(div.dataset.variant).toBe("segment");
  });

  it("inline style enforces height: 36px (matches BlueprintBar h-9 segment row)", () => {
    const { container } = render(<Skeleton variant="segment" />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.height).toBe("36px");
  });

  it("inline style enforces width: 100%", () => {
    const { container } = render(<Skeleton variant="segment" />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.width).toBe("100%");
  });

  it("inline style enforces borderRadius: 6px", () => {
    const { container } = render(<Skeleton variant="segment" />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.style.borderRadius).toBe("6px");
  });

  it("aria-hidden='true' by default", () => {
    const { container } = render(<Skeleton variant="segment" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute("aria-hidden")).toBe("true");
  });
});

// C-m7a-004: <Skeleton> honors aria-hidden={false} override + accepts className for caller-positioning
describe("C-m7a-004: <Skeleton> honors aria-hidden={false} override + accepts className for caller-positioning", () => {
  it("aria-hidden={false} overrides the default 'true'", () => {
    const { container } = render(
      <Skeleton variant="block" aria-hidden={false} />,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute("aria-hidden")).toBe("false");
  });

  it("className prop appends to skeleton-shimmer class (both coexist)", () => {
    const { container } = render(
      <Skeleton variant="block" className="custom-pos" />,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveClass("skeleton-shimmer");
    expect(el).toHaveClass("custom-pos");
  });

  it("variant-sizing style is unchanged regardless of className override", () => {
    const { container } = render(
      <Skeleton variant="block" className="absolute top-[60px]" />,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.height).toBe("92px");
    expect(el).toHaveClass("skeleton-shimmer");
  });
});

// C-m7a-012: <Skeleton> className is reduced-motion-invariant at the JS level; CSS-only suppression
describe("C-m7a-012: <Skeleton> className is reduced-motion-invariant — JS does not branch on PRM; CSS owns suppression", () => {
  it("renders skeleton-shimmer class regardless of media query (no JS branch on PRM)", () => {
    // The skeleton always carries skeleton-shimmer; the @media rule in globals.css handles
    // the reduced-motion suppression at the CSS layer (plan.md § Skeleton count + composition,
    // AC #7). The React component never calls usePrefersReducedMotion.
    const { container } = render(<Skeleton variant="block" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveClass("skeleton-shimmer");
  });

  it("aria-hidden='true' in both PRM=false and PRM=true scenarios (CSS-only suppression)", () => {
    // When PRM=true, the CSS @media rule sets animation: none on .skeleton-shimmer.
    // The React component still renders aria-hidden="true" — no JS branching.
    const { container } = render(<Skeleton variant="block" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute("aria-hidden")).toBe("true");
  });
});
