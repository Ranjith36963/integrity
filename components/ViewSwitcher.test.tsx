/**
 * components/ViewSwitcher.test.tsx — M9c: C-m9c-012 (amended for M9d)
 * Tests for ViewSwitcher — Day·Week·Month·Year segmented control.
 *
 * M9d amendment (C-m9c-012): Week is now a live segment (AC #8).
 *   - "Week disabled" sub-test inverted: Week is now live, fires onSelect("week"), aria-selected toggles.
 *   - "Week and Year disabled buttons" sub-test narrowed: only Year is disabled.
 *   - Year-disabled sub-test preserved verbatim.
 *   - All other C-m9c-012 sub-tests (4-segment render, tablist, aria-label, Day/Month live) verbatim.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ViewSwitcher } from "./ViewSwitcher";

// ─── C-m9c-012: ViewSwitcher — 4 segments, aria-selected, Day/Month/Week live, Year disabled ──

describe("C-m9c-012: ViewSwitcher — 4 segments, active indicator, Day/Month live, Week/Year disabled", () => {
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

  // Year-disabled sub-test preserved verbatim (Year stays live: false in M9d).
  it("Year segment is disabled (aria-disabled=true) — clicking it does NOT call onSelect", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ViewSwitcher view="day" onSelect={onSelect} />);
    const yearTab = screen.getByRole("tab", { name: "Year" });
    expect(yearTab).toHaveAttribute("aria-disabled", "true");
    await user.click(yearTab);
    expect(onSelect).not.toHaveBeenCalled();
  });

  // M9d amendment: narrowed to assert only Year is the disabled button (Week is now live).
  it("only the Year tab is rendered as a disabled button (no crash)", () => {
    render(<ViewSwitcher view="day" onSelect={vi.fn()} />);
    const yearTab = screen.getByRole("tab", { name: "Year" });
    expect(yearTab).toBeDisabled();
    // Week is now a live tab — not disabled
    const weekTab = screen.getByRole("tab", { name: "Week" });
    expect(weekTab).not.toBeDisabled();
  });
});

// ─── C-m9d-010: ViewSwitcher — Week now enabled, aria-selected, fires onSelect; Year stays disabled ──

describe("C-m9d-010: ViewSwitcher — Week segment enabled, selectable, fires onSelect; Year stays disabled", () => {
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

  it("Year is the lone remaining disabled button — clicking it fires onSelect zero times", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ViewSwitcher view="day" onSelect={onSelect} />);
    const yearTab = screen.getByRole("tab", { name: "Year" });
    expect(yearTab).toBeDisabled();
    expect(yearTab).toHaveAttribute("aria-disabled", "true");
    await user.click(yearTab);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
