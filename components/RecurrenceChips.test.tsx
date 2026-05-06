import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RecurrenceChips } from "./RecurrenceChips";
import type { Recurrence } from "@/lib/types";

// C-m2-007: RecurrenceChips — 4-chip single-select with custom-range sub-form
describe("C-m2-007: RecurrenceChips 4-chip single-select with custom-range sub-form", () => {
  it("renders exactly 4 chips with correct accessible names", () => {
    render(
      <RecurrenceChips
        value={{ kind: "just-today", date: "2026-05-06" }}
        onChange={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("radio", { name: /Just today/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /Every weekday/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /Every day/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /Custom range/i }),
    ).toBeInTheDocument();
  });

  it("wrapper has role='radiogroup'; just-today chip has aria-checked=true, others false", () => {
    render(
      <RecurrenceChips
        value={{ kind: "just-today", date: "2026-05-06" }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Just today/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(
      screen.getByRole("radio", { name: /Every weekday/i }),
    ).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: /Every day/i })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(
      screen.getByRole("radio", { name: /Custom range/i }),
    ).toHaveAttribute("aria-checked", "false");
  });

  it("clicking 'Custom range' calls onChange with custom-range default", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <RecurrenceChips
        value={{ kind: "just-today", date: "2026-05-06" }}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("radio", { name: /Custom range/i }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "custom-range",
        weekdays: [],
      }),
    );
  });

  it("shows date inputs and 7 weekday buttons when value.kind=custom-range", () => {
    const customVal: Recurrence = {
      kind: "custom-range",
      start: "2026-05-01",
      end: "2026-05-31",
      weekdays: [1, 2, 3, 4, 5],
    };
    render(<RecurrenceChips value={customVal} onChange={vi.fn()} />);
    // Date inputs — type="date" renders as a non-textbox in some browsers;
    // query by aria-label as a reliable fallback
    expect(
      screen.getByLabelText(/Custom range start date/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Custom range end date/i)).toBeInTheDocument();
    // 7 weekday buttons
    const weekdayGroup = screen.getByRole("group", { name: /Weekdays/i });
    expect(weekdayGroup).toBeInTheDocument();
    const dayBtns = weekdayGroup.querySelectorAll("button");
    expect(dayBtns).toHaveLength(7);
  });

  it("sub-form is NOT in DOM when value.kind !== custom-range", () => {
    render(
      <RecurrenceChips
        value={{ kind: "just-today", date: "2026-05-06" }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole("group", { name: /Weekdays/i })).toBeNull();
  });
});
