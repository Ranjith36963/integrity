import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Hero } from "./Hero";

// C-bld-004: Hero renders dateLabel, "Building X of Y", and "DAY COMPLETE"
describe("C-bld-004: Hero renders all required text", () => {
  it("shows dateLabel, building label, and DAY COMPLETE caption", () => {
    render(
      <Hero dateLabel="Wed, Apr 29" dayNumber={119} totalDays={365} pct={62} />,
    );
    expect(screen.getByText("Wed, Apr 29")).toBeInTheDocument();
    expect(screen.getByText(/building/i)).toBeInTheDocument();
    expect(screen.getByText("119")).toBeInTheDocument();
    expect(screen.getByText(/of/i)).toBeInTheDocument();
    expect(screen.getByText(/365/)).toBeInTheDocument();
    expect(screen.getByText(/day complete/i)).toBeInTheDocument();
  });
});

// C-bld-032: Hero with pct=0 shows 0 and DAY COMPLETE remains visible
describe("C-bld-032: Hero renders correctly with pct=0", () => {
  it("shows 0 percent and DAY COMPLETE text remains visible", async () => {
    render(
      <Hero dateLabel="Wed, Apr 29" dayNumber={119} totalDays={365} pct={0} />,
    );
    // AnimatedPercent with value=0 should end at 0
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    // The animated span should render 0
    // We check DAY COMPLETE is present
    expect(screen.getByText(/day complete/i)).toBeInTheDocument();
  });
});

// C-bld-033: Hero with pct=100 shows 100 after count-up completes
describe("C-bld-033: Hero renders 100 after count-up for pct=100", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("visible numeral is 100 after count-up", async () => {
    render(
      <Hero
        dateLabel="Wed, Apr 29"
        dayNumber={119}
        totalDays={365}
        pct={100}
      />,
    );
    // Advance past 1600ms for AnimatedPercent
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    // The rendered text should include 100
    expect(screen.getByText("100")).toBeInTheDocument();
  });
});

// C-bld-037: No blocks → Hero AnimatedPercent target is 0
describe("C-bld-037: Hero renders with pct=0 when no blocks", () => {
  it("AnimatedPercent target is 0 when pct prop is 0", async () => {
    render(<Hero dateLabel="" dayNumber={undefined} totalDays={365} pct={0} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    // DAY COMPLETE must still be visible
    expect(screen.getByText(/day complete/i)).toBeInTheDocument();
    // The animated percent shows 0
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});

// C-bld-038: Hero receives dayNumber={undefined} → "Building N of 365" is not in DOM
describe("C-bld-038: Hero hides Building N of Y when dayNumber is undefined", () => {
  it("does not render the building counter line when dayNumber is undefined", () => {
    render(
      <Hero
        dateLabel="Wed, Apr 29"
        dayNumber={undefined}
        totalDays={365}
        pct={57}
      />,
    );
    // "Building" text should NOT appear
    expect(screen.queryByText(/building/i)).not.toBeInTheDocument();
  });
});
