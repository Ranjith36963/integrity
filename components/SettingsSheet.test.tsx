/**
 * components/SettingsSheet.test.tsx — settings panel contract.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsSheet } from "./SettingsSheet";
import type { AppState } from "@/lib/types";

vi.mock("@/lib/haptics", () => ({
  haptics: { light: vi.fn(), medium: vi.fn(), success: vi.fn(), notification: vi.fn() },
}));

function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    blocks: [],
    categories: [],
    looseBricks: [],
    programStart: "2026-01-01",
    currentDate: "2026-06-22",
    history: {},
    deletions: {},
    ...overrides,
  };
}

describe("SettingsSheet", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders nothing when open=false", () => {
    render(
      <SettingsSheet
        open={false}
        state={makeState()}
        onClose={vi.fn()}
        onResetAll={vi.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens with title 'Settings' when open=true", () => {
    render(
      <SettingsSheet
        open
        state={makeState()}
        onClose={vi.fn()}
        onResetAll={vi.fn()}
      />,
    );
    expect(screen.getByRole("dialog")).toHaveAttribute(
      "aria-label",
      "Settings",
    );
  });

  it("Export button is present and clickable (download wiring deferred to integration)", async () => {
    const user = userEvent.setup();
    render(
      <SettingsSheet
        open
        state={makeState()}
        onClose={vi.fn()}
        onResetAll={vi.fn()}
      />,
    );
    const exp = screen.getByTestId("settings-export");
    expect(exp).toBeInTheDocument();
    // Clicking should NOT throw (will silently create+revoke a blob URL).
    await user.click(exp);
  });

  it("Reset is two-tap: first tap reveals confirm, Cancel hides it", async () => {
    const user = userEvent.setup();
    const onResetAll = vi.fn();
    render(
      <SettingsSheet
        open
        state={makeState()}
        onClose={vi.fn()}
        onResetAll={onResetAll}
      />,
    );

    // First state — no confirm
    expect(screen.queryByTestId("settings-reset-confirm")).toBeNull();

    // First tap — reveals confirm
    await user.click(screen.getByTestId("settings-reset"));
    expect(screen.getByTestId("settings-reset-confirm")).toBeInTheDocument();
    expect(onResetAll).not.toHaveBeenCalled();

    // Cancel — hides confirm without resetting
    await user.click(screen.getByTestId("settings-reset-cancel"));
    expect(screen.queryByTestId("settings-reset-confirm")).toBeNull();
    expect(onResetAll).not.toHaveBeenCalled();
  });

  it("Reset confirm-button calls onResetAll exactly once", async () => {
    const user = userEvent.setup();
    const onResetAll = vi.fn();
    render(
      <SettingsSheet
        open
        state={makeState()}
        onClose={vi.fn()}
        onResetAll={onResetAll}
      />,
    );
    await user.click(screen.getByTestId("settings-reset"));
    await user.click(screen.getByTestId("settings-reset-confirm-button"));
    expect(onResetAll).toHaveBeenCalledTimes(1);
  });

  it("Import button is present", () => {
    render(
      <SettingsSheet
        open
        state={makeState()}
        onClose={vi.fn()}
        onResetAll={vi.fn()}
      />,
    );
    expect(screen.getByTestId("settings-import")).toBeInTheDocument();
  });

  it("Import shows an error toast when the file is not valid JSON", async () => {
    const user = userEvent.setup();
    render(
      <SettingsSheet
        open
        state={makeState()}
        onClose={vi.fn()}
        onResetAll={vi.fn()}
      />,
    );
    const input = screen.getByTestId(
      "settings-import-input",
    ) as HTMLInputElement;
    const garbage = new File(["not valid {json"], "garbage.json", {
      type: "application/json",
    });
    await user.upload(input, garbage);
    // Allow the async handler to settle
    await new Promise((r) => setTimeout(r, 50));
    expect(
      screen.getByTestId("settings-import-error"),
    ).toBeInTheDocument();
  });

  it("Import shows an error when the JSON shape is not recognised", async () => {
    const user = userEvent.setup();
    render(
      <SettingsSheet
        open
        state={makeState()}
        onClose={vi.fn()}
        onResetAll={vi.fn()}
      />,
    );
    const input = screen.getByTestId(
      "settings-import-input",
    ) as HTMLInputElement;
    // Valid JSON, wrong shape (no schemaVersion)
    const wrong = new File(['{"hello":"world"}'], "wrong.json", {
      type: "application/json",
    });
    await user.upload(input, wrong);
    await new Promise((r) => setTimeout(r, 50));
    const err = screen.getByTestId("settings-import-error");
    expect(err.textContent).toMatch(/recognised|recognized/i);
  });

  it("About panel renders state summary (programStart, counts)", () => {
    render(
      <SettingsSheet
        open
        state={makeState({
          programStart: "2026-05-01",
          blocks: [
            {
              id: "b1",
              name: "n",
              start: "07:00",
              recurrence: { kind: "every-day" },
              categoryId: null,
              bricks: [],
            } as unknown as AppState["blocks"][number],
          ],
          looseBricks: [],
          history: { "2026-06-20": {} as AppState["history"][string] },
        })}
        onClose={vi.fn()}
        onResetAll={vi.fn()}
      />,
    );
    const about = screen.getByTestId("settings-about");
    expect(about.textContent).toContain("2026-05-01");
    expect(about.textContent).toContain("1"); // 1 block
  });
});
