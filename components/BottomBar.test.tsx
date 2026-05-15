import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BottomBar } from "./BottomBar";

// C-bld-029: BottomBar has Voice Log button with amber gradient and + Add button
describe("C-bld-029: BottomBar renders Voice Log and Add buttons", () => {
  it("shows Voice Log button with amber gradient and + button with aria-label Add", () => {
    render(<BottomBar />);
    expect(screen.getByText(/Voice Log/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add/i })).toBeInTheDocument();
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
    const voiceLogBtn = screen.getByRole("button", { name: /Voice Log/i });
    const addBtn = screen.getByRole("button", { name: /Add/i });
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
    expect(tabIndex).not.toBe("-1");
  });

  it("clicking Voice button does not throw", async () => {
    const user = userEvent.setup();
    render(<BottomBar />);
    const voiceBtn = screen.getByRole("button", { name: /Voice Log/i });
    await user.click(voiceBtn);
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

  it("clicking Add button does not throw and opens no dialog when no onAddPress", async () => {
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
    const wrapper = container.querySelector("[style*='--safe-bottom']");
    expect(wrapper).not.toBeNull();
    const style = (wrapper as HTMLElement).getAttribute("style") ?? "";
    expect(style).toContain("var(--safe-bottom)");
  });
});

// C-m2-001: BottomBar + button wires onAddPress — re-authored M2
describe("C-m2-001: BottomBar + button calls onAddPress (re-authored M2)", () => {
  it("clicking + calls mockHandler exactly once", async () => {
    const mockHandler = vi.fn();
    const user = userEvent.setup();
    render(<BottomBar onAddPress={mockHandler} />);
    const addBtn = screen.getByRole("button", { name: "Add" });
    await user.click(addBtn);
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  it("Voice button M1 visibly-disabled treatment is unchanged", () => {
    render(<BottomBar onAddPress={vi.fn()} />);
    const voiceBtn = screen.getByRole("button", { name: /Voice Log/i });
    expect(voiceBtn).toHaveAttribute("aria-disabled", "true");
    expect(voiceBtn).not.toHaveAttribute("disabled");
    expect(voiceBtn.className).toMatch(/opacity-50/);
  });

  it("+ button has aria-label='Add' and h-12 class", () => {
    render(<BottomBar onAddPress={vi.fn()} />);
    const addBtn = screen.getByRole("button", { name: "Add" });
    expect(addBtn).toHaveAttribute("aria-label", "Add");
    expect(addBtn.className).toMatch(/h-12/);
  });
});
