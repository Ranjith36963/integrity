import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BuildingClient } from "./BuildingClient";

// C-bld-034 (re-authored M1): BuildingClient mounts with blocks=[] and shows locked SPEC copy
describe("C-bld-034 (re-authored M1): BuildingClient initializes with empty blocks", () => {
  it("renders locked SPEC empty-state copy when no blocks are present", () => {
    render(<BuildingClient />);
    expect(
      screen.getByText("Tap any slot to lay your first block."),
    ).toBeInTheDocument();
  });
});

// C-bld-035 (re-authored M1): BlueprintBar IS in the DOM (unconditional in M1)
// Note: Previously tested BlueprintBar was absent. M1 makes it unconditional per SPEC AC #8.
describe("C-bld-035 (re-authored M1): BlueprintBar always present even with empty blocks", () => {
  it("BlueprintBar section (aria-label='Day blueprint') is in the DOM with empty blocks", () => {
    const { container } = render(<BuildingClient />);
    const blueprint = container.querySelector('[aria-label="Day blueprint"]');
    expect(blueprint).not.toBeNull();
  });
});

// C-bld-036: NowCard is NOT in the DOM (confirmed via now-glow check)
describe("C-bld-036: NowCard absent when blocks is empty", () => {
  it("NowCard now-glow element is not in the DOM with empty blocks", () => {
    const { container } = render(<BuildingClient />);
    const nowGlow = container.querySelector(".now-glow");
    expect(nowGlow).toBeNull();
  });
});

// C-bld-039: BuildingClient uses live clock
describe("C-bld-039: BuildingClient shows live dateLabel and now pin", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders live dateLabel 'Wed, May 6' (not the wipe-demo placeholder '')", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-06T08:30:00"));
    render(<BuildingClient />);
    expect(screen.getByText("Wed, May 6")).toBeInTheDocument();
    expect(screen.queryByLabelText("Now 00:00")).not.toBeInTheDocument();
  });
});

// C-bld-040 (re-authored M1): BuildingClient shows 'Building 126 of 365' for May 6, 2026
// M1 uses dayOfYear(new Date()) instead of dayNumber(programStart, today).
describe("C-bld-040 (re-authored M1): BuildingClient shows 'Building 126 of 365' on May 6, 2026", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("Hero renders 'Building 126 of 365' for dayOfYear on May 6, 2026", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-06T08:30:00"));
    const { container } = render(<BuildingClient />);
    // M1 uses dayOfYear: May 6, 2026 = day 126 of 365
    const dayCounter = container.querySelector("section .mt-1");
    expect(dayCounter).not.toBeNull();
    const text = dayCounter?.textContent?.replace(/\s+/g, " ").trim();
    expect(text).toBe("Building 126 of 365");
  });
});

// C-m1-019: NowCard NOT in DOM (no import, no data-component)
describe("C-m1-019: BuildingClient does not render NowCard", () => {
  it("no element with data-component='now-card' is in the DOM", () => {
    const { container } = render(<BuildingClient />);
    expect(
      container.querySelector('[data-component="now-card"]'),
    ).toBeNull();
  });
});

// C-m1-020: No block cards or brick chips in DOM
describe("C-m1-020: BuildingClient renders no block cards or brick chips", () => {
  it("has zero timeline-block, block-card, and brick-chip elements", () => {
    const { container } = render(<BuildingClient />);
    expect(
      container.querySelectorAll('[data-component="timeline-block"]'),
    ).toHaveLength(0);
    expect(
      container.querySelectorAll('[data-component="brick-chip"]'),
    ).toHaveLength(0);
    expect(
      container.querySelectorAll('[data-component="block-card"]'),
    ).toHaveLength(0);
  });

  it("timeline column contains only hour-grid, NowLine, and EmptyBlocks card", () => {
    const { container } = render(<BuildingClient />);
    // Hour grid is present
    expect(container.querySelector('[data-testid="hour-grid"]')).not.toBeNull();
    // NowLine is present
    expect(container.querySelector('[data-testid="now-line"]')).not.toBeNull();
    // EmptyState card is present
    expect(container.querySelector('[data-testid="empty-state"]')).not.toBeNull();
  });
});

// C-m1-021: BlueprintBar always rendered (unconditional in M1)
describe("C-m1-021: BlueprintBar is rendered unconditionally with empty blocks", () => {
  it("exactly one element with aria-label='Day blueprint' is in the DOM", () => {
    const { container } = render(<BuildingClient />);
    const blueprints = container.querySelectorAll('[aria-label="Day blueprint"]');
    expect(blueprints).toHaveLength(1);
  });
});
