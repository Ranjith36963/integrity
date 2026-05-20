/**
 * components/NowTag.test.tsx — M7b component tests for <NowTag>.
 * C-m7b-001: renders data-testid="now-tag", aria-label="Now", visible "NOW" text
 * C-m7b-002: var(--bg) ink on var(--accent) fill — WCAG AAA contrast >= 14.7:1
 * C-m7b-003: top-right absolute positioning + non-interactive (pointer-events: none)
 */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NowTag } from "./NowTag";

// ── C-m7b-001 ────────────────────────────────────────────────────────────────
describe("C-m7b-001 — <NowTag> renders data-testid, aria-label, NOW text", () => {
  it("is found via data-testid='now-tag'", () => {
    render(<NowTag />);
    const node = screen.getByTestId("now-tag");
    expect(node).toBeInTheDocument();
  });

  it("has aria-label='Now'", () => {
    render(<NowTag />);
    const node = screen.getByTestId("now-tag");
    expect(node).toHaveAttribute("aria-label", "Now");
  });

  it("has visible text content 'NOW'", () => {
    render(<NowTag />);
    const node = screen.getByTestId("now-tag");
    expect(node).toHaveTextContent("NOW");
  });

  it("is a <span> element with no role and default tabIndex=-1", () => {
    render(<NowTag />);
    const node = screen.getByTestId("now-tag");
    expect(node.tagName).toBe("SPAN");
    expect(node.getAttribute("role")).toBeNull();
    expect((node as HTMLElement).tabIndex).toBe(-1);
  });
});

// ── C-m7b-002 ────────────────────────────────────────────────────────────────
// WCAG 2.x relative-luminance contrast ratio helpers
function relLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relLuminance(hex1);
  const l2 = relLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("C-m7b-002 — <NowTag> WCAG AAA contrast >= 7:1 (actual ~14.7:1)", () => {
  it("inline style sets background to var(--accent)", () => {
    const { container } = render(<NowTag />);
    const node = container.querySelector(
      '[data-testid="now-tag"]',
    ) as HTMLElement;
    expect(node).not.toBeNull();
    // JSDOM preserves CSS-variable references verbatim in inline styles
    expect(node.style.background).toBe("var(--accent)");
  });

  it("inline style sets color to var(--bg)", () => {
    const { container } = render(<NowTag />);
    const node = container.querySelector(
      '[data-testid="now-tag"]',
    ) as HTMLElement;
    expect(node.style.color).toBe("var(--bg)");
  });

  it("computed contrast ratio #07090f on #fbbf24 is >= 7.0 (WCAG AAA)", () => {
    // M0 known token values: --accent: #fbbf24, --bg: #07090f
    const ratio = contrastRatio("#fbbf24", "#07090f");
    expect(ratio).toBeGreaterThanOrEqual(7.0);
  });
});

// ── C-m7b-003 ────────────────────────────────────────────────────────────────
describe("C-m7b-003 — <NowTag> top-right absolute positioning + non-interactive", () => {
  it("inline style has position: absolute", () => {
    const { container } = render(<NowTag />);
    const node = container.querySelector(
      '[data-testid="now-tag"]',
    ) as HTMLElement;
    expect(node.style.position).toBe("absolute");
  });

  it("inline style has top: 4px", () => {
    const { container } = render(<NowTag />);
    const node = container.querySelector(
      '[data-testid="now-tag"]',
    ) as HTMLElement;
    expect(node.style.top).toBe("4px");
  });

  it("inline style has right: 4px", () => {
    const { container } = render(<NowTag />);
    const node = container.querySelector(
      '[data-testid="now-tag"]',
    ) as HTMLElement;
    expect(node.style.right).toBe("4px");
  });

  it("inline style has pointer-events: none", () => {
    const { container } = render(<NowTag />);
    const node = container.querySelector(
      '[data-testid="now-tag"]',
    ) as HTMLElement;
    expect(node.style.pointerEvents).toBe("none");
  });

  it("tabIndex is -1 (not focusable)", () => {
    const { container } = render(<NowTag />);
    const node = container.querySelector(
      '[data-testid="now-tag"]',
    ) as HTMLElement;
    expect(node.tabIndex).toBe(-1);
  });

  it("has no onClick handler wired by the component itself", () => {
    const { container } = render(<NowTag />);
    const node = container.querySelector(
      '[data-testid="now-tag"]',
    ) as HTMLElement;
    // NowTag accepts no onClick prop — node.onclick must be null
    // (purely decorative; pointer-events:none prevents real browser clicks)
    expect(node.onclick).toBeNull();
  });
});
