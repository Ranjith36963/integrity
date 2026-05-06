import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BottomBar } from "./BottomBar";

// C-bld-029: BottomBar has Voice Log button with amber gradient and + Add button
describe("C-bld-029: BottomBar renders Voice Log and Add buttons", () => {
  it("shows Voice Log button with amber gradient and + button with aria-label Add", () => {
    render(<BottomBar />);
    // Voice Log button
    expect(screen.getByText(/Voice Log/i)).toBeInTheDocument();
    // + Add button
    expect(screen.getByRole("button", { name: /Add/i })).toBeInTheDocument();
    // Voice Log button has amber gradient background
    const voiceLogBtn = screen.getByText(/Voice Log/i).closest("button");
    expect(voiceLogBtn).not.toBeNull();
    const style = (voiceLogBtn as HTMLElement).getAttribute("style") ?? "";
    expect(style).toContain("var(--amber)");
  });
});

// C-bld-030 (re-authored M1): Both BottomBar buttons are at least 44x44px
describe("C-bld-030 (re-authored M1): BottomBar buttons meet 44px touch target", () => {
  it("Voice Log and Add buttons have h-12 (48px >= 44px) classes", () => {
    render(<BottomBar />);
    // Voice Log button — now queried by aria-label
    const voiceLogBtn = screen.getByRole("button", { name: /Voice Log/i });
    const addBtn = screen.getByRole("button", { name: /Add/i });
    // Both buttons use h-12 which is 48px, meeting the 44px floor
    expect(voiceLogBtn.className).toMatch(/h-12/);
    expect(addBtn.className).toMatch(/h-12/);
  });
});

// C-m1-016: Voice button is aria-disabled, no native disabled, label, opacity-50 (SG-m1-04)
describe("C-m1-016: BottomBar Voice button is visibly disabled per SG-m1-04", () => {
  it("is a <button> with aria-disabled=true and no native disabled attribute", () => {
    render(<BottomBar />);
    const voiceBtn = screen.getByRole("button", { name: /Voice Log/i });
    expect(voiceBtn.tagName).toBe("BUTTON");
    expect(voiceBtn).toHaveAttribute("aria-disabled", "true");
    expect(voiceBtn).not.toHaveAttribute("disabled");
  });

  it("has aria-label matching the locked SPEC copy (SG-m1-04)", () => {
    render(<BottomBar />);
    const voiceBtn = screen.getByRole("button", {
      name: "Voice Log (coming in a later release)",
    });
    expect(voiceBtn).not.toBeNull();
  });

  it("has opacity-50 class (visibly disabled)", () => {
    render(<BottomBar />);
    const voiceBtn = screen.getByRole("button", { name: /Voice Log/i });
    expect(voiceBtn.className).toMatch(/opacity-50/);
  });

  it("is keyboard-focusable (not tabIndex=-1)", () => {
    render(<BottomBar />);
    const voiceBtn = screen.getByRole("button", { name: /Voice Log/i });
    const tabIndex = voiceBtn.getAttribute("tabindex");
    // tabIndex should be null (default 0) or explicitly "0", never "-1"
    expect(tabIndex).not.toBe("-1");
  });

  it("clicking Voice button does not throw", async () => {
    const user = userEvent.setup();
    render(<BottomBar />);
    const voiceBtn = screen.getByRole("button", { name: /Voice Log/i });
    await user.click(voiceBtn);
    // No dialog should appear
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});

// C-m1-017: Add (+) button is enabled, no aria-disabled, aria-label="Add"
describe("C-m1-017: BottomBar Add button is enabled and no-op", () => {
  it("has aria-label=Add, is enabled (no aria-disabled, no disabled), opacity-1", () => {
    render(<BottomBar />);
    const addBtn = screen.getByRole("button", { name: "Add" });
    expect(addBtn).toHaveAttribute("aria-label", "Add");
    expect(addBtn).not.toHaveAttribute("aria-disabled");
    expect(addBtn).not.toHaveAttribute("disabled");
  });

  it("clicking Add button does not throw and opens no dialog", async () => {
    const user = userEvent.setup();
    render(<BottomBar />);
    const addBtn = screen.getByRole("button", { name: "Add" });
    await user.click(addBtn);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});

// C-m1-018: BottomBar safe-area inset padding-bottom
describe("C-m1-018: BottomBar outer wrapper has safe-area padding-bottom", () => {
  it("wrapper paddingBottom references var(--safe-bottom)", () => {
    const { container } = render(<BottomBar />);
    // Find the wrapper div with the paddingBottom style
    const wrapper = container.querySelector("[style*='--safe-bottom']");
    expect(wrapper).not.toBeNull();
    const style = (wrapper as HTMLElement).getAttribute("style") ?? "";
    expect(style).toContain("var(--safe-bottom)");
  });
});
