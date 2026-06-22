import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BottomBar } from "./BottomBar";

// Polish pass: Voice Log was the only stranded "coming in a later release"
// label after Settings shipped. Replaced with "Log Brick" (fast-path that
// bypasses the chooser). Two entry points stay: the big pill (direct brick
// add) and the small + circle (chooser).

describe("BottomBar — quick-brick pill + add chooser", () => {
  it("renders both dock buttons with their accessible labels", () => {
    render(<BottomBar />);
    expect(
      screen.getByRole("button", { name: "Log brick" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("Add brick pill has h-12 and amber gradient", () => {
    render(<BottomBar />);
    const quick = screen.getByRole("button", { name: "Log brick" });
    expect(quick.className).toMatch(/h-12/);
    const style = quick.getAttribute("style") ?? "";
    expect(style).toContain("var(--amber)");
  });

  it("both buttons are enabled (no aria-disabled)", () => {
    render(<BottomBar />);
    const quick = screen.getByRole("button", { name: "Log brick" });
    const add = screen.getByRole("button", { name: "Add" });
    expect(quick).not.toHaveAttribute("aria-disabled");
    expect(add).not.toHaveAttribute("aria-disabled");
  });

  it("quick-brick pill calls onQuickBrick exactly once", async () => {
    const onQuickBrick = vi.fn();
    const user = userEvent.setup();
    render(<BottomBar onQuickBrick={onQuickBrick} />);
    await user.click(screen.getByRole("button", { name: "Log brick" }));
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
    expect(
      screen.getByRole("button", { name: "Log brick" }).className,
    ).toMatch(/h-12/);
    expect(screen.getByRole("button", { name: "Add" }).className).toMatch(
      /h-12/,
    );
  });
});
