/**
 * components/ViewSwitcher.test.tsx — M9c: C-m9c-012
 * Tests for ViewSwitcher — Day·Week·Month·Year segmented control.
 * Day and Month are live segments; Week and Year are disabled.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ViewSwitcher } from "./ViewSwitcher";

// ─── C-m9c-012: ViewSwitcher — 4 segments, aria-selected, Day/Month live, Week/Year disabled ──

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

  it("Week segment is disabled (aria-disabled=true) — clicking it does NOT call onSelect", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ViewSwitcher view="day" onSelect={onSelect} />);
    const weekTab = screen.getByRole("tab", { name: "Week" });
    expect(weekTab).toHaveAttribute("aria-disabled", "true");
    await user.click(weekTab);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("Year segment is disabled (aria-disabled=true) — clicking it does NOT call onSelect", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ViewSwitcher view="day" onSelect={onSelect} />);
    const yearTab = screen.getByRole("tab", { name: "Year" });
    expect(yearTab).toHaveAttribute("aria-disabled", "true");
    await user.click(yearTab);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("Week and Year tabs are rendered as disabled buttons (no crash)", () => {
    render(<ViewSwitcher view="day" onSelect={vi.fn()} />);
    const weekTab = screen.getByRole("tab", { name: "Week" });
    const yearTab = screen.getByRole("tab", { name: "Year" });
    expect(weekTab).toBeDisabled();
    expect(yearTab).toBeDisabled();
  });
});
