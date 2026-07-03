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

  it("explains the full unit chain — habits → years", () => {
    render(<Welcome onBegin={vi.fn()} />);
    expect(screen.getByText(/Bricks are habits/i)).toBeInTheDocument();
    expect(screen.getByText(/Blocks are routines/i)).toBeInTheDocument();
    expect(screen.getByText(/Buildings are days/i)).toBeInTheDocument();
    expect(screen.getByText(/Castles are weeks/i)).toBeInTheDocument();
    expect(screen.getByText(/Kingdoms are months/i)).toBeInTheDocument();
    expect(screen.getByText(/Empires are years/i)).toBeInTheDocument();
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

  it("primary CTA is 'Lay your first brick'; secondary is the skippable cloud sign-in (M11 Option 3)", () => {
    render(<Welcome onBegin={vi.fn()} />);
    // Primary action is unchanged and prominent.
    expect(screen.getByTestId("welcome-begin")).toHaveTextContent(
      /lay your first brick/i,
    );
    // Option 3 adds one secondary, skippable "sign in to back up" link.
    expect(screen.getByTestId("welcome-signin")).toBeTruthy();
  });

  it("tapping the sign-in link reveals an inline email field (no jump to Settings)", async () => {
    const user = userEvent.setup();
    render(<Welcome onBegin={vi.fn()} />);
    expect(screen.queryByTestId("welcome-email")).toBeNull();
    await user.click(screen.getByTestId("welcome-signin"));
    expect(screen.getByTestId("welcome-email")).toBeTruthy();
    expect(screen.getByTestId("welcome-send-link")).toBeTruthy();
  });
});
