/**
 * components/EmpireGlimpse.test.tsx — milestone cinematic contract.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  EmpireGlimpse,
  hasMilestoneBeenShown,
  markMilestoneShown,
} from "./EmpireGlimpse";

describe("EmpireGlimpse", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });

  it("renders nothing when milestone is null", () => {
    render(<EmpireGlimpse milestone={null} onClose={vi.fn()} />);
    expect(screen.queryByTestId("empire-glimpse")).toBeNull();
  });

  it("renders the 7-day milestone copy when milestone=7", () => {
    render(<EmpireGlimpse milestone={7} onClose={vi.fn()} />);
    expect(screen.getByTestId("empire-glimpse")).toBeInTheDocument();
    expect(screen.getByText(/First Castle Stands/i)).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("renders the 365-day milestone copy when milestone=365", () => {
    render(<EmpireGlimpse milestone={365} onClose={vi.fn()} />);
    expect(screen.getByText(/One Year of Bricks/i)).toBeInTheDocument();
    expect(screen.getByText("365")).toBeInTheDocument();
  });

  it("auto-dismisses after 4000ms", () => {
    const onClose = vi.fn();
    render(<EmpireGlimpse milestone={30} onClose={onClose} />);
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Escape closes it", () => {
    const onClose = vi.fn();
    render(<EmpireGlimpse milestone={30} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clicking the dismiss button closes (event does not bubble to backdrop)", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<EmpireGlimpse milestone={100} onClose={onClose} />);
    await user.click(screen.getByTestId("empire-glimpse-dismiss"));
    expect(onClose).toHaveBeenCalled();
  });

  it("clicking the backdrop also closes", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<EmpireGlimpse milestone={100} onClose={onClose} />);
    await user.click(screen.getByTestId("empire-glimpse"));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("milestone-shown gate", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("hasMilestoneBeenShown returns false initially", () => {
    expect(hasMilestoneBeenShown(7)).toBe(false);
    expect(hasMilestoneBeenShown(30)).toBe(false);
  });

  it("markMilestoneShown flips the gate for ONE milestone, not all", () => {
    markMilestoneShown(7);
    expect(hasMilestoneBeenShown(7)).toBe(true);
    expect(hasMilestoneBeenShown(30)).toBe(false);
    expect(hasMilestoneBeenShown(100)).toBe(false);
    expect(hasMilestoneBeenShown(365)).toBe(false);
  });

  it("uses the namespaced key 'dharma:milestone-shown:N'", () => {
    markMilestoneShown(30);
    expect(window.localStorage.getItem("dharma:milestone-shown:30")).toBe(
      "true",
    );
  });
});
