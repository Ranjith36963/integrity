/**
 * components/Welcome.test.tsx — first-launch hero screen contract.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Welcome } from "./Welcome";

describe("Welcome", () => {
  it("renders the signature 'Build your day' line", () => {
    render(<Welcome onBegin={vi.fn()} />);
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(
      screen.getByText((t) => t.includes("Build your day")),
    ).toBeInTheDocument();
  });

  it("explains the brick → block → building chain in plain language", () => {
    render(<Welcome onBegin={vi.fn()} />);
    expect(screen.getByText(/Bricks are habits/i)).toBeInTheDocument();
    expect(screen.getByText(/Blocks are routines/i)).toBeInTheDocument();
    expect(screen.getByText(/Buildings are days/i)).toBeInTheDocument();
  });

  it("calls onBegin when the primary CTA is tapped", async () => {
    const user = userEvent.setup();
    const onBegin = vi.fn();
    render(<Welcome onBegin={onBegin} />);
    await user.click(screen.getByTestId("welcome-begin"));
    expect(onBegin).toHaveBeenCalledTimes(1);
  });

  it("calls onBegin when Escape is pressed (keyboard dismiss)", () => {
    const onBegin = vi.fn();
    render(<Welcome onBegin={onBegin} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onBegin).toHaveBeenCalledTimes(1);
  });

  it("renders exactly one primary CTA — no skip link, no secondary", () => {
    render(<Welcome onBegin={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveTextContent(/lay your first brick/i);
  });
});
