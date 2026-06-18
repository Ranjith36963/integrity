/**
 * components/DayCompleteCard.test.tsx — M7d standalone tests for DayCompleteCard.
 *
 * Covers: C-m7d-011, C-m7d-012
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DayCompleteCard } from "./DayCompleteCard";

// ── C-m7d-011: active=true renders card with correct attributes ───────────────

describe("C-m7d-011: <DayCompleteCard active={true} /> renders 'Day complete.' with role='status' + aria-live='polite'", () => {
  it("renders data-testid='day-complete-card' with required attributes", () => {
    render(<DayCompleteCard active={true} />);

    const card = screen.queryByTestId("day-complete-card");
    expect(card).not.toBeNull();
    expect(card!.textContent).toContain("Day complete.");
    expect(card!.getAttribute("role")).toBe("status");
    expect(card!.getAttribute("aria-live")).toBe("polite");
  });

  it("card has pointer-events: none and z-index: 50", () => {
    render(<DayCompleteCard active={true} />);

    const card = screen.queryByTestId("day-complete-card");
    expect(card).not.toBeNull();
    expect(card!.style.pointerEvents).toBe("none");
    expect(card!.style.zIndex).toBe("50");
  });

  it("inner text element uses var(--font-display) and var(--fs-24)", () => {
    const { container } = render(<DayCompleteCard active={true} />);

    // The inner div with the text should have font-family referencing var(--font-display)
    const inner = container.querySelector("[style*='--font-display']");
    expect(inner).not.toBeNull();
    expect(inner!.getAttribute("style")).toContain("var(--font-display)");
    expect(inner!.getAttribute("style")).toContain("var(--fs-24)");
  });
});

// ── C-m7d-012: active=false renders null (zero DOM nodes) ────────────────────

describe("C-m7d-012: <DayCompleteCard active={false} /> renders null", () => {
  it("renders null — container.firstChild is null", () => {
    const { container } = render(<DayCompleteCard active={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("queryByTestId('day-complete-card') returns null when active=false", () => {
    render(<DayCompleteCard active={false} />);
    expect(screen.queryByTestId("day-complete-card")).toBeNull();
  });
});
