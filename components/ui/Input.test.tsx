/**
 * C-m0-009: Input number type renders label, inputMode="numeric", height ≥44px, aria-invalid=false.
 * C-m0-010: Input with error renders error text, aria-invalid=true, aria-describedby, accent-deep color.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Input } from "./Input";

// C-m0-009
describe("C-m0-009: Input number variant with label wiring", () => {
  it("renders a label with htmlFor matching the input id", () => {
    render(
      <Input id="x" type="number" value="3" onChange={vi.fn()} label="Reps" />,
    );
    const label = screen.getByText("Reps");
    expect(label.tagName).toBe("LABEL");
    expect(label).toHaveAttribute("for", "x");
  });

  it("input has inputMode='numeric' for type=number", () => {
    render(
      <Input id="x" type="number" value="3" onChange={vi.fn()} label="Reps" />,
    );
    const input = screen.getByRole("spinbutton"); // type=number
    expect(input).toHaveAttribute("inputmode", "numeric");
  });

  it("input has aria-invalid='false' when no error", () => {
    render(
      <Input id="x" type="number" value="3" onChange={vi.fn()} label="Reps" />,
    );
    const input = screen.getByRole("spinbutton");
    expect(input).toHaveAttribute("aria-invalid", "false");
  });

  it("input has h-11 class (≥44px)", () => {
    render(<Input id="x" type="text" value="" onChange={vi.fn()} />);
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("h-11");
  });
});

// C-m0-010
describe("C-m0-010: Input error state", () => {
  it("renders error text in the DOM", () => {
    render(
      <Input
        id="x"
        type="text"
        value=""
        onChange={vi.fn()}
        label="X"
        error="Required"
      />,
    );
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("input has aria-invalid='true' when error is provided", () => {
    render(
      <Input
        id="x"
        type="text"
        value=""
        onChange={vi.fn()}
        label="X"
        error="Required"
      />,
    );
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("input has aria-describedby pointing to the error element's id", () => {
    render(
      <Input
        id="x"
        type="text"
        value=""
        onChange={vi.fn()}
        label="X"
        error="Required"
      />,
    );
    const input = screen.getByRole("textbox");
    const errorId = input.getAttribute("aria-describedby");
    expect(errorId).toBeTruthy();
    const errorEl = document.getElementById(errorId!);
    expect(errorEl).toBeTruthy();
    expect(errorEl!.textContent).toBe("Required");
  });

  it("error element's color references --accent-deep", () => {
    render(
      <Input
        id="x"
        type="text"
        value=""
        onChange={vi.fn()}
        label="X"
        error="Required"
      />,
    );
    const errorEl = screen.getByText("Required");
    expect(errorEl.style.color).toContain("--accent-deep");
  });
});
