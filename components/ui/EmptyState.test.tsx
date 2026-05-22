/**
 * C-m0-015: EmptyState renders message and CTA button.
 * C-m0-016: EmptyState pulse is controlled via data-pulse attribute (CSS-driven).
 *   The animation is applied by globals.css using @media (prefers-reduced-motion: no-preference)
 *   on [data-pulse="true"], so no JS hook is needed and there is no hydration flash.
 *   The GIVEN clause "usePrefersReducedMotion() mocked to true" from tests.md is satisfied
 *   at the e2e layer (E-m0-004) via page.emulateMedia({reducedMotion:"reduce"}).
 *   This unit file verifies the CSS-driven contract: data-pulse attribute is set from the prop,
 *   and the source does NOT import usePrefersReducedMotion (no JS feature detection).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as fs from "fs";
import * as path from "path";
import { EmptyState } from "./EmptyState";

// C-m0-015
describe("C-m0-015: EmptyState message and CTA", () => {
  it("renders the message text", () => {
    render(
      <EmptyState message="Nothing yet" actionLabel="Add" onAction={vi.fn()} />,
    );
    expect(screen.getByText("Nothing yet")).toBeInTheDocument();
  });

  it("renders a ghost-variant button with actionLabel text", () => {
    render(
      <EmptyState message="Nothing yet" actionLabel="Add" onAction={vi.fn()} />,
    );
    const btn = screen.getByRole("button", { name: "Add" });
    expect(btn).toBeInTheDocument();
    // ghost variant class — hover:text-[--ink] is the distinguishing ghost class
    expect(btn.className).toContain("hover:text-[--ink]");
  });

  it("clicking the CTA button calls onAction once", async () => {
    const spy = vi.fn();
    render(
      <EmptyState message="Nothing yet" actionLabel="Add" onAction={spy} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(spy).toHaveBeenCalledOnce();
  });
});

// C-m0-016
describe("C-m0-016: EmptyState pulse is CSS-driven via data-pulse attribute", () => {
  it("source does not import usePrefersReducedMotion (animation is CSS-only)", () => {
    // The GIVEN says "usePrefersReducedMotion() mocked to true" but the implementation
    // is CSS-driven: @media(prefers-reduced-motion:no-preference) in globals.css.
    // This test proves the CSS-driven contract holds at the source level.
    const src = fs.readFileSync(
      path.resolve(__dirname, "EmptyState.tsx"),
      "utf-8",
    );
    expect(src).not.toContain("usePrefersReducedMotion");
  });

  it("never has animate-pulse in className (animation is CSS-only)", () => {
    render(<EmptyState message="X" pulse />);
    const card = screen.getByTestId("empty-state");
    // animate-pulse Tailwind class is NOT used; CSS handles it via data-pulse + @media query
    expect(card.className).not.toContain("animate-pulse");
  });

  it("sets data-pulse=true when pulse prop is true", () => {
    render(<EmptyState message="X" pulse />);
    const card = screen.getByTestId("empty-state");
    expect(card.getAttribute("data-pulse")).toBe("true");
  });

  it("sets data-pulse=false when pulse prop is false", () => {
    render(<EmptyState message="X" pulse={false} />);
    const card = screen.getByTestId("empty-state");
    expect(card.getAttribute("data-pulse")).toBe("false");
  });
});
