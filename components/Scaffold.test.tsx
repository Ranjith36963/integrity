import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { Scaffold } from "./Scaffold";

// C-bld-020: after 80ms mount delay, scaffold__fill has height: 50%
describe("C-bld-020: Scaffold fill animates to pct after 80ms delay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("scaffold__fill height becomes 50% after the 80ms delay", async () => {
    const { container } = render(
      <Scaffold pct={50} category="health" height={48} />,
    );
    const fill = container.querySelector(".scaffold__fill") as HTMLElement;
    // Before delay fires, height should be 0%
    expect(fill.style.height).toBe("0%");
    // Advance past the 80ms timeout
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(fill.style.height).toBe("50%");
  });
});

// C-bld-021: Scaffold wrapper has aria-label "75 percent"
describe("C-bld-021: Scaffold has correct aria-label", () => {
  it("aria-label is Math.round(pct) + ' percent'", () => {
    const { container } = render(<Scaffold pct={75} category="health" />);
    const wrapper = container.querySelector(".scaffold") as HTMLElement;
    expect(wrapper).toHaveAttribute("aria-label", "75 percent");
  });
});
