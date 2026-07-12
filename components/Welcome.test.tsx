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

  it("'Lay your first brick' reveals the email+password sign-in (sign-in required, not skipped)", async () => {
    const user = userEvent.setup();
    const onBegin = vi.fn();
    render(<Welcome onBegin={onBegin} />);
    expect(screen.queryByTestId("welcome-email")).toBeNull();
    await user.click(screen.getByTestId("welcome-begin"));
    expect(screen.getByTestId("welcome-email")).toBeTruthy();
    expect(screen.getByTestId("welcome-password")).toBeTruthy();
    expect(screen.getByTestId("welcome-submit")).toBeTruthy();
    // must NOT skip into the app — cloud is configured, so sign-in is required
    expect(onBegin).not.toHaveBeenCalled();
  });

  it("offers the emailed sign-in link as a secondary option (needs only the email)", async () => {
    const user = userEvent.setup();
    render(<Welcome onBegin={vi.fn()} />);
    await user.click(screen.getByTestId("welcome-begin"));
    const link = screen.getByTestId("welcome-magic-link");
    expect(link).toHaveTextContent(/email me a sign-in link/i);
    expect(link).toBeDisabled(); // no email yet
    await user.type(screen.getByTestId("welcome-email"), "me@example.com");
    expect(link).not.toBeDisabled(); // email alone is enough for the link
  });

  it("submit stays disabled until the password has 6+ characters", async () => {
    const user = userEvent.setup();
    render(<Welcome onBegin={vi.fn()} />);
    await user.click(screen.getByTestId("welcome-begin"));
    await user.type(screen.getByTestId("welcome-email"), "me@example.com");
    await user.type(screen.getByTestId("welcome-password"), "12345");
    expect(screen.getByTestId("welcome-submit")).toBeDisabled();
    await user.type(screen.getByTestId("welcome-password"), "6");
    expect(screen.getByTestId("welcome-submit")).not.toBeDisabled();
  });

  it("calls onBegin when Escape is pressed (keyboard dismiss)", () => {
    const onBegin = vi.fn();
    render(<Welcome onBegin={onBegin} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onBegin).toHaveBeenCalledTimes(1);
  });

  it("has a single button — no secondary skip/sign-in link", () => {
    render(<Welcome onBegin={vi.fn()} />);
    expect(screen.getByTestId("welcome-begin")).toHaveTextContent(
      /lay your first brick/i,
    );
    expect(screen.queryByTestId("welcome-signin")).toBeNull();
  });
});
