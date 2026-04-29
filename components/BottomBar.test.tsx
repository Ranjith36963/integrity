import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BottomBar } from "./BottomBar";

// C-bld-029: BottomBar has Voice Log button with amber gradient and + Add button
describe("C-bld-029: BottomBar renders Voice Log and Add buttons", () => {
  it("shows Voice Log button with amber gradient and + button with aria-label Add", () => {
    const { container } = render(<BottomBar />);
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

// C-bld-030: Both BottomBar buttons are at least 44x44px
describe("C-bld-030: BottomBar buttons are at least 44x44px", () => {
  it("Voice Log and Add buttons have h-12 (48px >= 44px) classes", () => {
    render(<BottomBar />);
    const voiceLogBtn = screen.getByText(/Voice Log/i).closest("button")!;
    const addBtn = screen.getByRole("button", { name: /Add/i });
    // Both buttons use h-12 which is 48px, meeting the 44px floor
    expect(voiceLogBtn.className).toMatch(/h-12/);
    expect(addBtn.className).toMatch(/h-12/);
  });
});
