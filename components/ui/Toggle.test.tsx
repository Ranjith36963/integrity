/**
 * C-m0-014: Toggle fires onPressedChange with next value, has correct a11y attrs and ≥44×44px.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toggle } from "./Toggle";

describe("C-m0-014: Toggle a11y wiring and 44px", () => {
  it("calls onPressedChange with true when pressed=false and clicked", async () => {
    const spy = vi.fn();
    render(<Toggle pressed={false} onPressedChange={spy} label="Edit mode" />);
    const btn = screen.getByRole("switch", { name: "Edit mode" });
    await userEvent.click(btn);
    expect(spy).toHaveBeenCalledWith(true);
  });

  it("has aria-checked='false' initially (role=switch requires aria-checked)", () => {
    render(
      <Toggle pressed={false} onPressedChange={vi.fn()} label="Edit mode" />,
    );
    const btn = screen.getByRole("switch", { name: "Edit mode" });
    expect(btn).toHaveAttribute("aria-checked", "false");
  });

  it("has aria-checked='true' when pressed=true", () => {
    render(<Toggle pressed onPressedChange={vi.fn()} label="Edit mode" />);
    const btn = screen.getByRole("switch", { name: "Edit mode" });
    expect(btn).toHaveAttribute("aria-checked", "true");
  });

  it("has accessible name from label prop", () => {
    render(
      <Toggle pressed={false} onPressedChange={vi.fn()} label="Edit mode" />,
    );
    // aria-label is set so screen readers hear "Edit mode"
    const btn = screen.getByRole("switch", { name: "Edit mode" });
    expect(btn).toBeInTheDocument();
  });

  it("has h-11 and w-11 classes (≥44×44px touch target)", () => {
    render(<Toggle pressed={false} onPressedChange={vi.fn()} label="Edit" />);
    const btn = screen.getByRole("switch", { name: "Edit" });
    expect(btn.className).toContain("h-11");
    expect(btn.className).toContain("w-11");
  });
});
