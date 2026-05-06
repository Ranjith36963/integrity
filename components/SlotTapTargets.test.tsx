import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SlotTapTargets } from "./SlotTapTargets";
import { HOUR_HEIGHT_PX } from "@/lib/timeOffset";

// C-m2-013: SlotTapTargets — 24 transparent buttons, each calls onSlotTap(hour)
describe("C-m2-013: SlotTapTargets 24 transparent buttons (plan.md SG-m2-08)", () => {
  it("renders exactly 24 buttons with aria-label matching 'Add block at HH:00'", () => {
    render(<SlotTapTargets onSlotTap={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(24);
    expect(buttons[0]).toHaveAttribute("aria-label", "Add block at 00:00");
    expect(buttons[9]).toHaveAttribute("aria-label", "Add block at 09:00");
    expect(buttons[23]).toHaveAttribute("aria-label", "Add block at 23:00");
  });

  it("each button has height = HOUR_HEIGHT_PX and is absolutely positioned", () => {
    const { container } = render(<SlotTapTargets onSlotTap={vi.fn()} />);
    const buttons = container.querySelectorAll(
      "button",
    ) as NodeListOf<HTMLElement>;
    expect(buttons).toHaveLength(24);
    buttons.forEach((btn, i) => {
      expect(btn.style.position).toBe("absolute");
      expect(btn.style.top).toBe(`${i * HOUR_HEIGHT_PX}px`);
      expect(btn.style.height).toBe(`${HOUR_HEIGHT_PX}px`);
    });
  });

  it("clicking 'Add block at 09:00' calls onSlotTap(9)", async () => {
    const mockSlotTap = vi.fn();
    const user = userEvent.setup();
    render(<SlotTapTargets onSlotTap={mockSlotTap} />);
    const btn9 = screen.getByRole("button", { name: "Add block at 09:00" });
    await user.click(btn9);
    expect(mockSlotTap).toHaveBeenCalledWith(9);
    expect(mockSlotTap).toHaveBeenCalledTimes(1);
  });

  it("clicking 'Add block at 23:00' calls onSlotTap(23)", async () => {
    const mockSlotTap = vi.fn();
    const user = userEvent.setup();
    render(<SlotTapTargets onSlotTap={mockSlotTap} />);
    const btn23 = screen.getByRole("button", { name: "Add block at 23:00" });
    await user.click(btn23);
    expect(mockSlotTap).toHaveBeenCalledWith(23);
  });

  it("returns null (no buttons) when editMode=true", () => {
    render(<SlotTapTargets onSlotTap={vi.fn()} editMode={true} />);
    const buttons = screen.queryAllByRole("button");
    expect(buttons).toHaveLength(0);
  });
});
