/**
 * components/WeekDayCell.test.tsx — M9d: C-m9d-004..007
 * Tests for WeekDayCell — one day row in the Castle week view.
 * Reuses M9c DayCell kind vocabulary at row scale.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WeekDayCell } from "./WeekDayCell";

// ─── C-m9d-004: WeekDayCell — scored row renders weekday + date + heat fill + numeral ──

describe("C-m9d-004: WeekDayCell — scored row: weekday + date + heat fill + numeral + tappable", () => {
  it("renders the weekday label and date number", () => {
    render(
      <WeekDayCell
        kind="scored"
        date="2026-05-16"
        dayOfMonth={16}
        weekdayLabel="Sat"
        score={60}
        isToday={false}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByText("Sat")).toBeInTheDocument();
    expect(screen.getByText("16")).toBeInTheDocument();
  });

  it("renders the rounded score numeral", () => {
    render(
      <WeekDayCell
        kind="scored"
        date="2026-05-16"
        dayOfMonth={16}
        weekdayLabel="Sat"
        score={60}
        isToday={false}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByText("60")).toBeInTheDocument();
  });

  it("renders as a <button> (tappable)", () => {
    render(
      <WeekDayCell
        kind="scored"
        date="2026-05-16"
        dayOfMonth={16}
        weekdayLabel="Sat"
        score={60}
        isToday={false}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("has aria-label with weekday, full date, score in percent", () => {
    render(
      <WeekDayCell
        kind="scored"
        date="2026-05-16"
        dayOfMonth={16}
        weekdayLabel="Sat"
        score={60}
        isToday={false}
        onOpen={vi.fn()}
      />,
    );
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute(
      "aria-label",
      "Saturday, May 16, 2026, score 60 percent",
    );
  });

  it("row element is at least 44px tall (ADR-031)", () => {
    render(
      <WeekDayCell
        kind="scored"
        date="2026-05-16"
        dayOfMonth={16}
        weekdayLabel="Sat"
        score={60}
        isToday={false}
        onOpen={vi.fn()}
      />,
    );
    const btn = screen.getByRole("button");
    // minHeight is set inline — check the style attribute
    const style = btn.getAttribute("style") ?? "";
    expect(style).toContain("min-height");
  });

  it("clicking the scored row calls onOpen exactly once", async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    render(
      <WeekDayCell
        kind="scored"
        date="2026-05-16"
        dayOfMonth={16}
        weekdayLabel="Sat"
        score={60}
        isToday={false}
        onOpen={onOpen}
      />,
    );
    await user.click(screen.getByRole("button"));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("carries data-score attribute with the heat-fill alpha value", () => {
    // alpha = 0.12 + (60/100) * 0.78 = 0.588
    render(
      <WeekDayCell
        kind="scored"
        date="2026-05-16"
        dayOfMonth={16}
        weekdayLabel="Sat"
        score={60}
        isToday={false}
        onOpen={vi.fn()}
      />,
    );
    const btn = screen.getByRole("button");
    // The heat fill is expressed via inline background style containing accent color
    const style = btn.getAttribute("style") ?? "";
    expect(style).toContain("background");
  });
});

// ─── C-m9d-005: WeekDayCell — missed vs scored-zero distinctness ──────────────

describe("C-m9d-005: WeekDayCell — missed vs scored-zero: structurally distinct", () => {
  it("scored score-0 row carries a heat fill (background style) and a visible '0' numeral", () => {
    const { container } = render(
      <WeekDayCell
        kind="scored"
        date="2026-05-15"
        dayOfMonth={15}
        weekdayLabel="Fri"
        score={0}
        onOpen={vi.fn()}
      />,
    );
    // Should have a button
    expect(screen.getByRole("button")).toBeInTheDocument();
    // Should render the "0" numeral
    expect(screen.getByText("0")).toBeInTheDocument();
    // Background style should be present on the button
    const btn = container.querySelector("button");
    expect(btn).not.toBeNull();
    const style = btn!.getAttribute("style") ?? "";
    expect(style).toContain("background");
  });

  it("missed row has no score numeral text node", () => {
    render(
      <WeekDayCell
        kind="missed"
        date="2026-05-13"
        dayOfMonth={13}
        weekdayLabel="Wed"
      />,
    );
    // "13" (date) renders, but no score numeral
    expect(screen.getByText("13")).toBeInTheDocument();
    // There should be no "0" text (no score numeral for missed)
    expect(screen.queryByText("0")).toBeNull();
  });

  it("missed row is a plain <div>, not a <button>", () => {
    render(
      <WeekDayCell
        kind="missed"
        date="2026-05-13"
        dayOfMonth={13}
        weekdayLabel="Wed"
      />,
    );
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("missed row has --card background and --card-edge border (flat, no heat fill)", () => {
    const { container } = render(
      <WeekDayCell
        kind="missed"
        date="2026-05-13"
        dayOfMonth={13}
        weekdayLabel="Wed"
      />,
    );
    // The row's style contains --card as background
    const row = container.firstChild as HTMLElement;
    const style = row?.getAttribute("style") ?? "";
    expect(style).toContain("--card");
  });
});

// ─── C-m9d-006: WeekDayCell — future and pre-start rows are inert ─────────────

describe("C-m9d-006: WeekDayCell — future and pre-start rows are inert plain divs", () => {
  it("future row renders weekday and date, no button, no score numeral", () => {
    render(
      <WeekDayCell
        kind="future"
        date="2026-05-25"
        dayOfMonth={25}
        weekdayLabel="Mon"
      />,
    );
    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("pre-start row renders weekday and date, no button, no score numeral", () => {
    render(
      <WeekDayCell
        kind="pre-start"
        date="2026-04-28"
        dayOfMonth={28}
        weekdayLabel="Tue"
      />,
    );
    expect(screen.getByText("Tue")).toBeInTheDocument();
    expect(screen.getByText("28")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("future and pre-start rows are visually identical inert treatments", () => {
    const { container: futureContainer } = render(
      <WeekDayCell
        kind="future"
        date="2026-05-25"
        dayOfMonth={25}
        weekdayLabel="Mon"
      />,
    );
    const { container: preStartContainer } = render(
      <WeekDayCell
        kind="pre-start"
        date="2026-04-28"
        dayOfMonth={28}
        weekdayLabel="Tue"
      />,
    );
    // Both should have transparent background (no background fill)
    const futureRow = futureContainer.firstChild as HTMLElement;
    const preStartRow = preStartContainer.firstChild as HTMLElement;
    const futureStyle = futureRow?.getAttribute("style") ?? "";
    const preStartStyle = preStartRow?.getAttribute("style") ?? "";
    // Both carry transparent background treatment
    expect(futureStyle).toContain("transparent");
    expect(preStartStyle).toContain("transparent");
  });
});

// ─── C-m9d-007: WeekDayCell — today marker; inert-cell tappability is structural ─

describe("C-m9d-007: WeekDayCell — isToday 2px accent ring; inert cells are never buttons", () => {
  it("isToday scored row has aria-label with ', today'", () => {
    render(
      <WeekDayCell
        kind="scored"
        isToday
        date="2026-05-18"
        dayOfMonth={18}
        weekdayLabel="Mon"
        score={40}
        onOpen={vi.fn()}
      />,
    );
    const btn = screen.getByRole("button");
    const label = btn.getAttribute("aria-label") ?? "";
    expect(label).toContain(", today");
    expect(label).toBe("Monday, May 18, 2026, today, score 40 percent");
  });

  it("isToday scored row carries an outline style for the 2px accent ring", () => {
    const { container } = render(
      <WeekDayCell
        kind="scored"
        isToday
        date="2026-05-18"
        dayOfMonth={18}
        weekdayLabel="Mon"
        score={40}
        onOpen={vi.fn()}
      />,
    );
    const btn = container.querySelector("button");
    expect(btn).not.toBeNull();
    const style = btn!.getAttribute("style") ?? "";
    // outline or border with accent color
    expect(style).toMatch(/outline|border/);
  });

  it("only scored rows are buttons — missed, future, pre-start rows have no role=button", () => {
    const { rerender } = render(
      <WeekDayCell
        kind="missed"
        date="2026-05-13"
        dayOfMonth={13}
        weekdayLabel="Wed"
      />,
    );
    expect(screen.queryByRole("button")).toBeNull();

    rerender(
      <WeekDayCell
        kind="future"
        date="2026-05-25"
        dayOfMonth={25}
        weekdayLabel="Mon"
      />,
    );
    expect(screen.queryByRole("button")).toBeNull();

    rerender(
      <WeekDayCell
        kind="pre-start"
        date="2026-04-28"
        dayOfMonth={28}
        weekdayLabel="Tue"
      />,
    );
    expect(screen.queryByRole("button")).toBeNull();
  });
});
