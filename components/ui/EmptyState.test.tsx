/**
 * C-m0-015: EmptyState renders message and CTA button.
 * C-m0-016: EmptyState with pulse and reduced-motion removes animation.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
describe("C-m0-016: EmptyState pulse is disabled under reduced-motion", () => {
  it("omits animate-pulse class when usePrefersReducedMotion returns true", () => {
    // Mock matchMedia to return prefers-reduced-motion: reduce
    Object.defineProperty(window, "matchMedia", {
      value: vi.fn().mockReturnValue({
        matches: true,
        media: "(prefers-reduced-motion: reduce)",
        addEventListener: vi.fn((_, handler) => handler({ matches: true })),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }),
      writable: true,
      configurable: true,
    });

    render(<EmptyState message="X" pulse />);
    const card = screen.getByTestId("empty-state");
    expect(card.className).not.toContain("animate-pulse");
  });

  it("has animate-pulse class when reduced-motion is off and pulse=true", () => {
    Object.defineProperty(window, "matchMedia", {
      value: vi.fn().mockReturnValue({
        matches: false,
        media: "(prefers-reduced-motion: reduce)",
        addEventListener: vi.fn((_, handler) => handler({ matches: false })),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }),
      writable: true,
      configurable: true,
    });

    render(<EmptyState message="X" pulse />);
    const card = screen.getByTestId("empty-state");
    expect(card.className).toContain("animate-pulse");
  });
});
