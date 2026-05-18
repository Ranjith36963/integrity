/**
 * components/ViewSwitcher.test.tsx — M9c: C-m9c-012 (amended for M9d, then M9e)
 * Tests for ViewSwitcher — Day·Week·Month·Year segmented control.
 *
 * M9d amendment (C-m9c-012): Week is now a live segment (AC #8, M9d).
 *   - "Week disabled" sub-test inverted: Week is now live, fires onSelect("week"), aria-selected toggles.
 *   - "Week and Year disabled buttons" sub-test narrowed: only Year is disabled.
 * M9e amendment (C-m9c-012, C-m9d-010): Year is now a live segment (AC #8, M9e).
 *   - Year-disabled sub-tests inverted: Year is now live, fires onSelect("year"), not disabled.
 *   - All other C-m9c-012 sub-tests (4-segment render, tablist, aria-label, Day/Month/Week live) verbatim.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ViewSwitcher } from "./ViewSwitcher";

// ─── C-m9c-012: ViewSwitcher — 4 segments, aria-selected, all four live (amended M9e) ─────────

describe("C-m9c-012: ViewSwitcher — 4 segments, active indicator, all four tabs live (M9e: Year enabled)", () => {
  it("renders a tablist with aria-label='Calendar view' containing 4 tabs", () => {
    render(<ViewSwitcher view="day" onSelect={vi.fn()} />);
    const tablist = screen.getByRole("tablist");
    expect(tablist).toHaveAttribute("aria-label", "Calendar view");
    expect(screen.getAllByRole("tab")).toHaveLength(4);
  });

  it("shows Day, Week, Month, Year segments in that order", () => {
    render(<ViewSwitcher view="day" onSelect={vi.fn()} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveTextContent("Day");
    expect(tabs[1]).toHaveTextContent("Week");
    expect(tabs[2]).toHaveTextContent("Month");
    expect(tabs[3]).toHaveTextContent("Year");
  });

  it("Day segment has aria-selected=true when view='day'", () => {
    render(<ViewSwitcher view="day" onSelect={vi.fn()} />);
    const dayTab = screen.getByRole("tab", { name: "Day" });
    const monthTab = screen.getByRole("tab", { name: "Month" });
    expect(dayTab).toHaveAttribute("aria-selected", "true");
    expect(monthTab).toHaveAttribute("aria-selected", "false");
  });

  it("Month segment has aria-selected=true when view='month'", () => {
    render(<ViewSwitcher view="month" onSelect={vi.fn()} />);
    const dayTab = screen.getByRole("tab", { name: "Day" });
    const monthTab = screen.getByRole("tab", { name: "Month" });
    expect(dayTab).toHaveAttribute("aria-selected", "false");
    expect(monthTab).toHaveAttribute("aria-selected", "true");
  });

  it("clicking Month calls onSelect('month') exactly once", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ViewSwitcher view="day" onSelect={onSelect} />);
    await user.click(screen.getByRole("tab", { name: "Month" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("month");
  });

  it("clicking Day calls onSelect('day') exactly once", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ViewSwitcher view="month" onSelect={onSelect} />);
    await user.click(screen.getByRole("tab", { name: "Day" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("day");
  });

  // M9d amendment: Week is now a LIVE segment (AC #8) — inverted from M9c "Week disabled" sub-test.
  // Week no longer carries aria-disabled; clicking it fires onSelect("week") exactly once.
  it("Week segment is LIVE (no aria-disabled) — clicking it calls onSelect('week') exactly once", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ViewSwitcher view="day" onSelect={onSelect} />);
    const weekTab = screen.getByRole("tab", { name: "Week" });
    expect(weekTab).not.toHaveAttribute("aria-disabled", "true");
    await user.click(weekTab);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("week");
  });

  // Week aria-selected toggles when view="week" (M9d amendment).
  it("Week segment has aria-selected=true when view='week'", () => {
    render(<ViewSwitcher view="week" onSelect={vi.fn()} />);
    const weekTab = screen.getByRole("tab", { name: "Week" });
    expect(weekTab).toHaveAttribute("aria-selected", "true");
  });

  // M9e amendment: Year is now a LIVE segment (AC #8, M9e) — inverted from "Year disabled" sub-test.
  // Year no longer carries aria-disabled; clicking it fires onSelect("year") exactly once.
  it("Year segment is LIVE (no aria-disabled) — clicking it calls onSelect('year') exactly once", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ViewSwitcher view="day" onSelect={onSelect} />);
    const yearTab = screen.getByRole("tab", { name: "Year" });
    expect(yearTab).not.toHaveAttribute("aria-disabled", "true");
    expect(yearTab).not.toBeDisabled();
    await user.click(yearTab);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("year");
  });

  // M9e amendment: all four tabs are live — no disabled button (Year now enabled).
  it("all four tabs are live buttons (no segment is disabled)", () => {
    render(<ViewSwitcher view="day" onSelect={vi.fn()} />);
    const yearTab = screen.getByRole("tab", { name: "Year" });
    const weekTab = screen.getByRole("tab", { name: "Week" });
    const monthTab = screen.getByRole("tab", { name: "Month" });
    const dayTab = screen.getByRole("tab", { name: "Day" });
    expect(yearTab).not.toBeDisabled();
    expect(weekTab).not.toBeDisabled();
    expect(monthTab).not.toBeDisabled();
    expect(dayTab).not.toBeDisabled();
  });

  // Year aria-selected toggles when view="year" (M9e amendment).
  it("Year segment has aria-selected=true when view='year'", () => {
    render(<ViewSwitcher view="year" onSelect={vi.fn()} />);
    const yearTab = screen.getByRole("tab", { name: "Year" });
    expect(yearTab).toHaveAttribute("aria-selected", "true");
  });
});

// ─── C-m9d-010: ViewSwitcher — Week segment enabled; Year now enabled (M9e amendment) ────────────

describe("C-m9d-010: ViewSwitcher — Week segment enabled, selectable, fires onSelect; Year now enabled", () => {
  it("four segments render — Day, Week, Month, Year — inside role='tablist'", () => {
    render(<ViewSwitcher view="day" onSelect={vi.fn()} />);
    const tablist = screen.getByRole("tablist");
    expect(tablist).toHaveAttribute("aria-label", "Calendar view");
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(4);
    expect(tabs[0]).toHaveTextContent("Day");
    expect(tabs[1]).toHaveTextContent("Week");
    expect(tabs[2]).toHaveTextContent("Month");
    expect(tabs[3]).toHaveTextContent("Year");
  });

  it("Day, Week, and Month are live role='tab' buttons — no aria-disabled", () => {
    render(<ViewSwitcher view="day" onSelect={vi.fn()} />);
    const dayTab = screen.getByRole("tab", { name: "Day" });
    const weekTab = screen.getByRole("tab", { name: "Week" });
    const monthTab = screen.getByRole("tab", { name: "Month" });
    expect(dayTab).not.toHaveAttribute("aria-disabled", "true");
    expect(weekTab).not.toHaveAttribute("aria-disabled", "true");
    expect(monthTab).not.toHaveAttribute("aria-disabled", "true");
    expect(dayTab).not.toBeDisabled();
    expect(weekTab).not.toBeDisabled();
    expect(monthTab).not.toBeDisabled();
  });

  it("clicking Week calls onSelect('week') exactly once", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ViewSwitcher view="day" onSelect={onSelect} />);
    await user.click(screen.getByRole("tab", { name: "Week" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("week");
  });

  it("re-rendering with view='week' sets Week tab aria-selected='true' and filled accent style", () => {
    render(<ViewSwitcher view="week" onSelect={vi.fn()} />);
    const weekTab = screen.getByRole("tab", { name: "Week" });
    expect(weekTab).toHaveAttribute("aria-selected", "true");
    // Day and Month are not selected
    const dayTab = screen.getByRole("tab", { name: "Day" });
    const monthTab = screen.getByRole("tab", { name: "Month" });
    expect(dayTab).toHaveAttribute("aria-selected", "false");
    expect(monthTab).toHaveAttribute("aria-selected", "false");
  });

  // M9e amendment: Year is now a LIVE segment — inverted from "Year is the lone remaining
  // disabled button". Year is now enabled: not disabled, no aria-disabled, fires onSelect("year").
  it("Year is now a live tab — not disabled, clicking it fires onSelect('year') exactly once", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ViewSwitcher view="day" onSelect={onSelect} />);
    const yearTab = screen.getByRole("tab", { name: "Year" });
    expect(yearTab).not.toBeDisabled();
    expect(yearTab).not.toHaveAttribute("aria-disabled", "true");
    await user.click(yearTab);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("year");
  });
});

// ─── C-m9e-007: ViewSwitcher — Year enabled; ALL FOUR segments live, none disabled ─────────────

describe("C-m9e-007: ViewSwitcher — Year enabled; all four segments live, none disabled", () => {
  it("all four segments render inside role='tablist' aria-label='Calendar view'", () => {
    render(<ViewSwitcher view="day" onSelect={vi.fn()} />);
    const tablist = screen.getByRole("tablist");
    expect(tablist).toHaveAttribute("aria-label", "Calendar view");
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(4);
    expect(tabs[0]).toHaveTextContent("Day");
    expect(tabs[1]).toHaveTextContent("Week");
    expect(tabs[2]).toHaveTextContent("Month");
    expect(tabs[3]).toHaveTextContent("Year");
  });

  it("NO segment carries aria-disabled='true' and NO segment is disabled", () => {
    render(<ViewSwitcher view="day" onSelect={vi.fn()} />);
    const tabs = screen.getAllByRole("tab");
    for (const tab of tabs) {
      expect(tab).not.toHaveAttribute("aria-disabled", "true");
      expect(tab).not.toBeDisabled();
    }
  });

  it("clicking Day/Week/Month/Year each fires onSelect with the matching value", async () => {
    const values = ["day", "week", "month", "year"] as const;
    for (const value of values) {
      const onSelect = vi.fn();
      const user = userEvent.setup();
      render(<ViewSwitcher view="day" onSelect={onSelect} />);
      const tab = screen
        .getAllByRole("tab")
        .find(
          (t) =>
            t.textContent === value.charAt(0).toUpperCase() + value.slice(1),
        );
      expect(tab).toBeDefined();
      await user.click(tab!);
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(value);
    }
  });

  it("re-rendering with view='year' sets Year tab aria-selected='true', others 'false'", () => {
    render(<ViewSwitcher view="year" onSelect={vi.fn()} />);
    const yearTab = screen.getByRole("tab", { name: "Year" });
    expect(yearTab).toHaveAttribute("aria-selected", "true");
    const dayTab = screen.getByRole("tab", { name: "Day" });
    const weekTab = screen.getByRole("tab", { name: "Week" });
    const monthTab = screen.getByRole("tab", { name: "Month" });
    expect(dayTab).toHaveAttribute("aria-selected", "false");
    expect(weekTab).toHaveAttribute("aria-selected", "false");
    expect(monthTab).toHaveAttribute("aria-selected", "false");
  });
});
