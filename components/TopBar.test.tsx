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

// C-m1-001: TopBar renders wordmark + amber tile + Edit + Settings inside a <header>
describe("C-m1-001: TopBar renders all required M1 elements", () => {
  it("has DHARMA wordmark, amber logo tile, Edit button, Settings button in a header landmark", () => {
    renderWithProvider();
    // DHARMA wordmark
    expect(screen.getByText("DHARMA")).toBeInTheDocument();
    // header landmark
    const header = document.querySelector("header");
    expect(header).not.toBeNull();
    // Edit button
    const editBtn = screen.getByRole("button", { name: /edit/i });
    expect(header).toContainElement(editBtn);
    // Settings button
    const settingsBtn = screen.getByRole("button", { name: /settings/i });
    expect(header).toContainElement(settingsBtn);
    // amber logo tile: verify it has background referencing amber via inline style
    const tile = header?.querySelector("[aria-hidden]") as HTMLElement | null;
    expect(tile).not.toBeNull();
    const style = (tile as HTMLElement).getAttribute("style") ?? "";
    expect(style).toContain("var(--amber)");
  });
});

// C-m1-002: TopBar Edit button has aria-pressed="false" initially, no role="switch" (SG-m1-05)
describe("C-m1-002: TopBar Edit button aria-pressed and toggle semantics", () => {
  it("has aria-pressed=false initially and does NOT have role=switch", async () => {
    const user = userEvent.setup();
    renderWithProvider();
    const editBtn = screen.getByRole("button", { name: /edit/i });
    expect(editBtn).toHaveAttribute("aria-pressed", "false");
    expect(editBtn).not.toHaveAttribute("role", "switch");
    // clicking does not throw
    await user.click(editBtn);
    // state changes to true (visible state change is M5's job — just confirm no throw)
    expect(editBtn).toHaveAttribute("aria-pressed", "true");
  });
});

// C-m1-003: TopBar Settings button (aria-label, gear icon, keyboard-focusable) (SG-m1-06)
describe("C-m1-003: TopBar Settings button has correct accessibility attrs", () => {
  it("has aria-label=Settings, is a button element, and is keyboard-focusable", async () => {
    const user = userEvent.setup();
    renderWithProvider();
    const settingsBtn = screen.getByRole("button", { name: "Settings" });
    expect(settingsBtn).toHaveAttribute("aria-label", "Settings");
    expect(settingsBtn.tagName).toBe("BUTTON");
    // clicking does not throw
    await user.click(settingsBtn);
    // Has h-11 w-11 classes (44px = meets >=44px bounding box requirement)
    expect(settingsBtn.className).toMatch(/h-11/);
    expect(settingsBtn.className).toMatch(/w-11/);
  });
});
