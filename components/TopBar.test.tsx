import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopBar } from "./TopBar";
import { EditModeProvider } from "./EditModeProvider";

function renderWithProvider() {
  return render(
    <EditModeProvider>
      <TopBar />
    </EditModeProvider>,
  );
}

// C-bld-001: clicking Edit button flips aria-pressed
describe("C-bld-001: TopBar edit button toggles aria-pressed", () => {
  it("aria-pressed flips from false to true on click", async () => {
    const user = userEvent.setup();
    renderWithProvider();
    const editBtn = screen.getByRole("button", { name: /edit/i });
    expect(editBtn).toHaveAttribute("aria-pressed", "false");
    await user.click(editBtn);
    expect(editBtn).toHaveAttribute("aria-pressed", "true");
  });
});

// C-bld-002: TopBar renders DHARMA, Edit button, Settings button
describe("C-bld-002: TopBar renders DHARMA, Edit, Settings", () => {
  it("shows DHARMA text and both buttons", () => {
    renderWithProvider();
    expect(screen.getByText("DHARMA")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /settings/i }),
    ).toBeInTheDocument();
  });
});

// C-bld-003: Edit and Settings buttons are at least 44x44 CSS px
describe("C-bld-003: TopBar buttons are at least 44x44px", () => {
  it("Edit and Settings buttons meet 44px touch target", () => {
    renderWithProvider();
    const editBtn = screen.getByRole("button", { name: /edit/i });
    const settingsBtn = screen.getByRole("button", { name: /settings/i });

    // jsdom doesn't lay out elements, but we can check computed dimensions
    // via CSS class. We verify the element has h-11 w-11 classes (44px each).
    expect(editBtn.className).toMatch(/h-11/);
    expect(editBtn.className).toMatch(/w-11/);
    expect(settingsBtn.className).toMatch(/h-11/);
    expect(settingsBtn.className).toMatch(/w-11/);
  });
});
