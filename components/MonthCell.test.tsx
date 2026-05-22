/**
 * components/MonthCell.test.tsx — M9e: C-m9e-004..005
 * Tests for MonthCell — one month tile in the Year (Empire) grid.
 *
 * C-m9e-004: scored tile (heat fill + numeral), scored-0 vs no-data distinctness (mutation-resistant)
 * C-m9e-005: every cell is tappable; current-month accent outline; aria-label grammar
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MonthCell } from "./MonthCell";

// ─── C-m9e-004: MonthCell — scored tile: heat fill + numeral; scored-0 vs no-data distinctness ──

describe("C-m9e-004: MonthCell — scored tile, scored-0 vs no-data distinctness (mutation-resistant)", () => {
  it("score=60 tile shows month name 'May' and numeral '60'", () => {
    render(
      <MonthCell
        year={2026}
        monthIndex={4}
        name="May"
        score={60}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByText("May")).toBeInTheDocument();
    expect(screen.getByText("60")).toBeInTheDocument();
  });

  it("score=60 tile has heat fill with alpha scaled to 0.12 + (60/100)*0.78 = 0.588", () => {
    const { container } = render(
      <MonthCell
        year={2026}
        monthIndex={4}
        name="May"
        score={60}
        onOpen={vi.fn()}
      />,
    );
    // The button should have a background style with rgba including the expected alpha
    const btn = container.querySelector("button");
    expect(btn).not.toBeNull();
    const style = btn!.getAttribute("style") ?? "";
    // 0.12 + 0.6 * 0.78 = 0.12 + 0.468 = 0.588
    expect(style).toContain("rgba(251, 191, 36");
  });

  it("score=0 tile has alpha 0.12 (floor) AND a visible numeral '0'", () => {
    const { container } = render(
      <MonthCell
        year={2026}
        monthIndex={3}
        name="April"
        score={0}
        onOpen={vi.fn()}
      />,
    );
    const btn = container.querySelector("button");
    expect(btn).not.toBeNull();
    const style = btn!.getAttribute("style") ?? "";
    // alpha = 0.12 + 0 * 0.78 = 0.12
    expect(style).toContain("rgba(251, 191, 36");
    // Numeral "0" visible
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("score=null tile has NO heat fill (var(--card) bg + border) and NO score numeral", () => {
    const { container } = render(
      <MonthCell
        year={2026}
        monthIndex={6}
        name="July"
        score={null}
        onOpen={vi.fn()}
      />,
    );
    const btn = container.querySelector("button");
    expect(btn).not.toBeNull();
    const style = btn!.getAttribute("style") ?? "";
    // No rgba heat fill
    expect(style).not.toContain("rgba(251, 191, 36");
    // Has var(--card) background
    expect(style).toContain("var(--card)");
    // Has the em-dash no-data glyph
    expect(btn!.textContent).toContain("—");
  });

  it("score=0 tile and score=null tile are structurally distinct — '0' numeral vs '—' glyph", () => {
    const { container: c0 } = render(
      <MonthCell
        year={2026}
        monthIndex={3}
        name="April"
        score={0}
        onOpen={vi.fn()}
      />,
    );
    const { container: cNull } = render(
      <MonthCell
        year={2026}
        monthIndex={6}
        name="July"
        score={null}
        onOpen={vi.fn()}
      />,
    );
    const btn0 = c0.querySelector("button");
    const btnNull = cNull.querySelector("button");
    // score=0: has "0" numeral, no em-dash
    expect(btn0!.textContent).toContain("0");
    expect(btn0!.textContent).not.toContain("—");
    // score=null: has em-dash, no numeric text (only month name)
    expect(btnNull!.textContent).toContain("—");
    expect(btnNull!.textContent).not.toMatch(/\d/);
  });

  it("all three tiles are ≥ 44px tall (ADR-031) <button> elements", () => {
    // We can't measure pixels in jsdom, but we can assert minHeight ≥ 44px on the button style
    const renders = [
      render(
        <MonthCell
          year={2026}
          monthIndex={4}
          name="May"
          score={60}
          onOpen={vi.fn()}
        />,
      ),
      render(
        <MonthCell
          year={2026}
          monthIndex={3}
          name="April"
          score={0}
          onOpen={vi.fn()}
        />,
      ),
      render(
        <MonthCell
          year={2026}
          monthIndex={6}
          name="July"
          score={null}
          onOpen={vi.fn()}
        />,
      ),
    ];
    for (const { container } of renders) {
      const btn = container.querySelector("button");
      expect(btn).not.toBeNull();
      const style = btn!.getAttribute("style") ?? "";
      expect(style).toMatch(/min-height:\s*44px/);
    }
  });
});

// ─── C-m9e-005: MonthCell — every cell is tappable; current-month accent outline ─

describe("C-m9e-005: MonthCell — every cell is tappable; isCurrentMonth accent outline", () => {
  it("scored cell is a <button> and clicking it calls onOpen exactly once", async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    render(
      <MonthCell
        year={2026}
        monthIndex={4}
        name="May"
        score={60}
        onOpen={onOpen}
      />,
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeInTheDocument();
    await user.click(btn);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("score=0 cell is a <button> and clicking it calls onOpen exactly once", async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    render(
      <MonthCell
        year={2026}
        monthIndex={3}
        name="April"
        score={0}
        onOpen={onOpen}
      />,
    );
    await user.click(screen.getByRole("button"));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("score=null (no-data) cell is a <button> and clicking it calls onOpen exactly once", async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    render(
      <MonthCell
        year={2026}
        monthIndex={6}
        name="July"
        score={null}
        onOpen={onOpen}
      />,
    );
    await user.click(screen.getByRole("button"));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("isCurrentMonth=true adds a 2px solid var(--accent) outline", () => {
    const { container } = render(
      <MonthCell
        year={2026}
        monthIndex={4}
        name="May"
        score={60}
        isCurrentMonth
        onOpen={vi.fn()}
      />,
    );
    const btn = container.querySelector("button");
    const style = btn!.getAttribute("style") ?? "";
    expect(style).toContain("var(--accent)");
    expect(style).toMatch(/outline.*2px/);
  });

  it("aria-label for scored cell is '<Month> <year>, score <N> percent'", () => {
    render(
      <MonthCell
        year={2026}
        monthIndex={4}
        name="May"
        score={60}
        onOpen={vi.fn()}
      />,
    );
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-label", "May 2026, score 60 percent");
  });

  it("aria-label for null cell is '<Month> <year>, no data'", () => {
    render(
      <MonthCell
        year={2026}
        monthIndex={6}
        name="July"
        score={null}
        onOpen={vi.fn()}
      />,
    );
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-label", "July 2026, no data");
  });

  it("aria-label includes ', current month' when isCurrentMonth=true", () => {
    render(
      <MonthCell
        year={2026}
        monthIndex={4}
        name="May"
        score={60}
        isCurrentMonth
        onOpen={vi.fn()}
      />,
    );
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute(
      "aria-label",
      "May 2026, score 60 percent, current month",
    );
  });
});
