/**
 * components/CommandPalette.test.tsx — ⌘K palette contract.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPalette, type Command } from "./CommandPalette";

function makeCommands(): Command[] {
  return [
    {
      id: "view-day",
      label: "Go to Day",
      hint: "Today's timeline",
      shortcut: "1",
      keywords: ["today", "now"],
      run: vi.fn(),
    },
    {
      id: "view-week",
      label: "Go to Week",
      shortcut: "2",
      keywords: ["castle"],
      run: vi.fn(),
    },
    {
      id: "freeze-today",
      label: "Freeze today (protect streak)",
      hint: "2 of 2 remaining",
      keywords: ["freeze", "rest"],
      run: vi.fn(),
    },
  ];
}

describe("CommandPalette", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders nothing when open=false", () => {
    render(
      <CommandPalette
        open={false}
        onClose={vi.fn()}
        commands={makeCommands()}
      />,
    );
    expect(screen.queryByTestId("command-palette")).toBeNull();
  });

  it("renders the input + the list when open=true", () => {
    render(<CommandPalette open onClose={vi.fn()} commands={makeCommands()} />);
    expect(screen.getByTestId("command-palette")).toBeInTheDocument();
    expect(screen.getByTestId("command-palette-input")).toBeInTheDocument();
    expect(
      screen.getByTestId("command-palette-item-view-day"),
    ).toBeInTheDocument();
  });

  it("filters by label substring", async () => {
    const user = userEvent.setup();
    render(<CommandPalette open onClose={vi.fn()} commands={makeCommands()} />);
    await user.type(screen.getByTestId("command-palette-input"), "week");
    expect(
      screen.getByTestId("command-palette-item-view-week"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("command-palette-item-view-day")).toBeNull();
  });

  it("filters by keyword (typing 'castle' finds Week)", async () => {
    const user = userEvent.setup();
    render(<CommandPalette open onClose={vi.fn()} commands={makeCommands()} />);
    await user.type(screen.getByTestId("command-palette-input"), "castle");
    expect(
      screen.getByTestId("command-palette-item-view-week"),
    ).toBeInTheDocument();
  });

  it("Enter activates the first item and calls run()", async () => {
    const user = userEvent.setup();
    const cmds = makeCommands();
    const onClose = vi.fn();
    render(<CommandPalette open onClose={onClose} commands={cmds} />);
    const input = screen.getByTestId("command-palette-input");
    await user.type(input, "week");
    await user.keyboard("{Enter}");
    // run() is dispatched via setTimeout(0) — flush it
    await act(async () => {
      await new Promise((r) => setTimeout(r, 5));
    });
    expect(cmds[1].run).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalled();
  });

  it("Escape closes the palette", () => {
    const onClose = vi.fn();
    render(<CommandPalette open onClose={onClose} commands={makeCommands()} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clicking the backdrop closes the palette", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CommandPalette open onClose={onClose} commands={makeCommands()} />);
    await user.click(screen.getByTestId("command-palette"));
    expect(onClose).toHaveBeenCalled();
  });

  it("recent commands surface first on next open", async () => {
    const user = userEvent.setup();
    const cmds = makeCommands();
    const { unmount } = render(
      <CommandPalette open onClose={vi.fn()} commands={cmds} />,
    );
    await user.click(screen.getByTestId("command-palette-item-freeze-today"));
    unmount();
    // Re-open with the same id — freeze-today should appear first
    render(<CommandPalette open onClose={vi.fn()} commands={cmds} />);
    const list = screen.getByTestId("command-palette-list");
    const firstItem = list.firstElementChild as HTMLElement | null;
    expect(firstItem?.getAttribute("data-testid")).toBe(
      "command-palette-item-freeze-today",
    );
  });

  it("shows a 'no match' row when no commands match the query", async () => {
    const user = userEvent.setup();
    render(<CommandPalette open onClose={vi.fn()} commands={makeCommands()} />);
    await user.type(screen.getByTestId("command-palette-input"), "zzzzz");
    expect(screen.getByText(/No commands match/)).toBeInTheDocument();
  });
});
