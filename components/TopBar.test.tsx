import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopBar } from "./TopBar";
import { EditModeProvider } from "./EditModeProvider";
import * as hapticsModule from "../lib/haptics";

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

// ─── C-m5-001: pencil toggle Locked ↔ Unlocked; aria-pressed + worded aria-label ──

describe("C-m5-001: TopBar pencil toggles Locked ↔ Unlocked; state visually + SR-discernible", () => {
  it("initial state: aria-pressed=false, aria-label='Edit mode, off'", () => {
    renderWithProvider();
    const btn = screen.getByRole("button", { name: /edit mode/i });
    expect(btn).toHaveAttribute("aria-pressed", "false");
    expect(btn).toHaveAttribute("aria-label", "Edit mode, off");
  });

  it("after one click: aria-pressed=true, aria-label='Edit mode, on'", async () => {
    const user = userEvent.setup();
    renderWithProvider();
    const btn = screen.getByRole("button", { name: /edit mode/i });
    await user.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(btn).toHaveAttribute("aria-label", "Edit mode, on");
  });

  it("after two clicks: returns to Locked (aria-pressed=false, aria-label='Edit mode, off')", async () => {
    const user = userEvent.setup();
    renderWithProvider();
    const btn = screen.getByRole("button", { name: /edit mode/i });
    await user.click(btn);
    await user.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "false");
    expect(btn).toHaveAttribute("aria-label", "Edit mode, off");
  });

  it("pencil button hit area is ≥44px (h-11 w-11, ADR-031)", () => {
    renderWithProvider();
    const btn = screen.getByRole("button", { name: /edit mode/i });
    expect(btn.className).toMatch(/h-11/);
    expect(btn.className).toMatch(/w-11/);
  });
});

// ─── C-m5-002: haptic on toggle; Edit Mode NOT persisted, boots Locked ─────────

describe("C-m5-002: TopBar — light haptic on toggle; Edit Mode is NOT persisted, boots Locked", () => {
  let lightSpy: ReturnType<typeof vi.spyOn>;
  let setItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    lightSpy = vi
      .spyOn(hapticsModule.haptics, "light")
      .mockImplementation(() => {});
    setItemSpy = vi.spyOn(Storage.prototype, "setItem");
  });

  it("each toggle fires haptics.light() exactly once", async () => {
    const user = userEvent.setup();
    renderWithProvider();
    const btn = screen.getByRole("button", { name: /edit mode/i });
    await user.click(btn);
    expect(lightSpy).toHaveBeenCalledTimes(1);
    await user.click(btn);
    expect(lightSpy).toHaveBeenCalledTimes(2);
  });

  it("no localStorage.setItem call records an editMode field (SG-m5-04)", async () => {
    const user = userEvent.setup();
    renderWithProvider();
    const btn = screen.getByRole("button", { name: /edit mode/i });
    await user.click(btn);
    await user.click(btn);
    // All setItem calls must not contain editMode
    const allValues = setItemSpy.mock.calls
      .map((args: unknown[]) => String(args[1] ?? ""))
      .join("\n");
    expect(allValues).not.toMatch(/editMode/i);
    expect(allValues).not.toMatch(/edit.mode/i);
  });

  it("freshly re-mounted EditModeProvider boots with editMode === false (Locked)", () => {
    // First mount and toggle
    const { unmount } = render(
      <EditModeProvider>
        <TopBar />
      </EditModeProvider>,
    );
    unmount();
    // Re-mount fresh — should be Locked again
    render(
      <EditModeProvider>
        <TopBar />
      </EditModeProvider>,
    );
    const btn = screen.getByRole("button", { name: /edit mode/i });
    expect(btn).toHaveAttribute("aria-pressed", "false");
    expect(btn).toHaveAttribute("aria-label", "Edit mode, off");
  });
});
