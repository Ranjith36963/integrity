import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditModeProvider, useEditMode } from "./EditModeProvider";

// Helper consumer component
function Consumer() {
  const { editMode, toggle } = useEditMode();
  return (
    <>
      <span data-testid="state">{String(editMode)}</span>
      <button onClick={toggle}>Toggle</button>
    </>
  );
}

describe("EditModeProvider", () => {
  it("starts with editMode=false", () => {
    render(
      <EditModeProvider>
        <Consumer />
      </EditModeProvider>,
    );
    expect(screen.getByTestId("state")).toHaveTextContent("false");
  });

  it("toggle flips editMode to true", async () => {
    const user = userEvent.setup();
    render(
      <EditModeProvider>
        <Consumer />
      </EditModeProvider>,
    );
    await user.click(screen.getByRole("button", { name: /toggle/i }));
    expect(screen.getByTestId("state")).toHaveTextContent("true");
  });

  it("toggle flips back to false on second click", async () => {
    const user = userEvent.setup();
    render(
      <EditModeProvider>
        <Consumer />
      </EditModeProvider>,
    );
    await user.click(screen.getByRole("button", { name: /toggle/i }));
    await user.click(screen.getByRole("button", { name: /toggle/i }));
    expect(screen.getByTestId("state")).toHaveTextContent("false");
  });

  it("provides default no-op context without a provider", () => {
    // useEditMode without provider should return defaults (editMode=false, toggle no-op)
    function Standalone() {
      const { editMode, toggle } = useEditMode();
      return (
        <>
          <span data-testid="state">{String(editMode)}</span>
          <button onClick={toggle}>Toggle</button>
        </>
      );
    }
    render(<Standalone />);
    expect(screen.getByTestId("state")).toHaveTextContent("false");
    // Clicking toggle should not throw
    act(() => {
      screen.getByRole("button", { name: /toggle/i }).click();
    });
    expect(screen.getByTestId("state")).toHaveTextContent("false");
  });
});
