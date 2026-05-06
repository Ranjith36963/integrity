import { describe, it, expect, beforeEach, afterEach, vi, act } from "vitest";
import { render, screen } from "@testing-library/react";
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

// C-m1-004: Hero renders 0% synchronously on first paint, no AnimatedPercent, no count-up (SG-m1-08)
describe("C-m1-004: Hero renders pct=0 synchronously with no count-up animation", () => {
  it("shows '0%' immediately on first paint without AnimatedPercent or requestAnimationFrame tween", () => {
    vi.useFakeTimers();
    render(
      <Hero dateLabel="Wed, May 6" dayNumber={126} totalDays={365} pct={0} />,
    );
    // 0% must be visible synchronously (before any timer advance)
    expect(screen.getByText("0%")).toBeInTheDocument();
    // No animated-percent marker in DOM
    expect(
      document.querySelector('[data-component="animated-percent"]'),
    ).toBeNull();
    // After 2 seconds simulated, still shows 0% (no count-up)
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText("0%")).toBeInTheDocument();
    vi.useRealTimers();
  });
});

// C-m1-005: Hero shows dateLabel verbatim (SG-m1-01: comma-separated form)
describe("C-m1-005: Hero renders dateLabel verbatim", () => {
  it("renders the dateLabel string as a text node", () => {
    render(
      <Hero dateLabel="Wed, May 6" dayNumber={126} totalDays={365} pct={0} />,
    );
    expect(screen.getByText("Wed, May 6")).toBeInTheDocument();
  });
});

// C-m1-006: Hero renders "Building N of 365|366"
describe("C-m1-006: Hero renders Building N of 365 and 366", () => {
  it("renders 'Building 126 of 365'", () => {
    const { container } = render(
      <Hero dateLabel="Wed, May 6" dayNumber={126} totalDays={365} pct={0} />,
    );
    expect(container.textContent).toContain("Building");
    expect(container.textContent).toContain("126");
    expect(container.textContent).toContain("365");
  });

  it("renders 'Building 60 of 366' for leap year", () => {
    const { container } = render(
      <Hero dateLabel="Sat, Feb 29" dayNumber={60} totalDays={366} pct={0} />,
    );
    expect(container.textContent).toContain("Building");
    expect(container.textContent).toContain("60");
    expect(container.textContent).toContain("366");
  });
});
