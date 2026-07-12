import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BottomBar } from "./BottomBar";

vi.mock("@/lib/haptics", () => ({
  haptics: { light: vi.fn(), medium: vi.fn(), success: vi.fn() },
}));

// Polish pass: Voice Log was the only stranded "coming in a later release"
// label after Settings shipped. Replaced with "Log Brick" (fast-path that
// bypasses the chooser). Two entry points stay: the big pill (direct brick
// add) and the small + circle (chooser).

describe("BottomBar — quick-brick pill + add chooser", () => {
  it("renders both dock buttons with their accessible labels", () => {
    render(<BottomBar />);
    expect(screen.getByRole("button", { name: "Log" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("Add brick pill has h-12 and the glass-primary treatment", () => {
    render(<BottomBar />);
    const quick = screen.getByRole("button", { name: "Log" });
    expect(quick.className).toMatch(/h-12/);
    // M12 glass buttons: translucent amber via hud-glass-primary, not an
    // opaque gradient slab.
    expect(quick.className).toMatch(/hud-glass-primary/);
  });

  it("both buttons are enabled (no aria-disabled)", () => {
    render(<BottomBar />);
    const quick = screen.getByRole("button", { name: "Log" });
    const add = screen.getByRole("button", { name: "Add" });
    expect(quick).not.toHaveAttribute("aria-disabled");
    expect(add).not.toHaveAttribute("aria-disabled");
  });

  it("quick-brick pill calls onQuickBrick exactly once", async () => {
    const onQuickBrick = vi.fn();
    const user = userEvent.setup();
    render(<BottomBar onQuickBrick={onQuickBrick} />);
    await user.click(screen.getByRole("button", { name: "Log" }));
    expect(onQuickBrick).toHaveBeenCalledTimes(1);
  });

  it("+ button calls onAddPress exactly once", async () => {
    const onAddPress = vi.fn();
    const user = userEvent.setup();
    render(<BottomBar onAddPress={onAddPress} />);
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(onAddPress).toHaveBeenCalledTimes(1);
  });

  it("wrapper paddingBottom references var(--safe-bottom)", () => {
    const { container } = render(<BottomBar />);
    const wrapper = container.querySelector("[style*='--safe-bottom']");
    expect(wrapper).not.toBeNull();
    const style = (wrapper as HTMLElement).getAttribute("style") ?? "";
    expect(style).toMatch(/var\(--safe-bottom,\s*0px\)/);
  });

  it("both buttons meet the 44px touch target via h-12", () => {
    render(<BottomBar />);
    expect(screen.getByRole("button", { name: "Log" }).className).toMatch(
      /h-12/,
    );
    expect(screen.getByRole("button", { name: "Add" }).className).toMatch(
      /h-12/,
    );
  });
});

// ─── C-m10-014: mic button appears when micSupported=true ────────────────────

describe("C-m10-014: BottomBar micSupported=true — mic button present and callable", () => {
  it("mic button is present between Log Brick pill and + and clicking it calls onMicPress", async () => {
    const onMicPress = vi.fn();
    const user = userEvent.setup();
    render(
      <BottomBar
        micSupported={true}
        listening={false}
        onMicPress={onMicPress}
      />,
    );
    // Mic button visible
    const micBtn = screen.getByRole("button", { name: "Start voice log" });
    expect(micBtn).toBeInTheDocument();
    await user.click(micBtn);
    expect(onMicPress).toHaveBeenCalledTimes(1);
  });
});

// ─── C-m10-015: mic button absent when micSupported=false ────────────────────

describe("C-m10-015: BottomBar micSupported=false — no mic button, existing buttons intact", () => {
  it("no mic button; Log Brick and + buttons still present", () => {
    render(<BottomBar micSupported={false} />);
    expect(
      screen.queryByRole("button", { name: /voice log/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("mic button also absent when micSupported is omitted", () => {
    render(<BottomBar />);
    expect(
      screen.queryByRole("button", { name: /voice log/i }),
    ).not.toBeInTheDocument();
  });
});
