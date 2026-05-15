// components/LooseBricksTray.test.tsx — M3 component tests
// Covers: C-m3-010, C-m3-011, C-m3-012

import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LooseBricksTray } from "./LooseBricksTray";
import type { Brick, Category } from "@/lib/types";

const cat1: Category = { id: "c1", name: "category 1", color: "#34d399" };

const looseBrickA: Brick = {
  id: "r1",
  name: "brick A",
  kind: "tick",
  hasDuration: false,
  done: false,
  categoryId: null,
  parentBlockId: null,
};

// ─── C-m3-010: collapsed default; "+ Brick" pill in trailing position ──────────

describe("C-m3-010: LooseBricksTray collapsed default", () => {
  it("aria-expanded is false when collapsed (default)", () => {
    render(
      <LooseBricksTray
        looseBricks={[looseBrickA]}
        categories={[cat1]}
        onAddBrick={vi.fn()}
      />,
    );
    const region = screen.getByRole("region", { name: /loose bricks/i });
    expect(region.getAttribute("aria-expanded")).toBe("false");
  });

  it("renders BrickChip for 'brick A' in collapsed row", () => {
    render(
      <LooseBricksTray
        looseBricks={[looseBrickA]}
        categories={[cat1]}
        onAddBrick={vi.fn()}
      />,
    );
    // BrickChip renders as button with aria-label containing 'brick A'
    expect(
      screen.getByRole("button", { name: /brick A/i }),
    ).toBeInTheDocument();
  });

  it("+ Brick pill is the LAST button in the collapsed row (DOM order)", () => {
    render(
      <LooseBricksTray
        looseBricks={[looseBrickA]}
        categories={[cat1]}
        onAddBrick={vi.fn()}
      />,
    );
    const region = screen.getByRole("region", { name: /loose bricks/i });
    const buttons = within(region).getAllByRole("button");
    // Last interactive element (excluding chevron at top-right) is the "+ Brick" pill
    const addBrickButton = buttons.find(
      (b) => b.getAttribute("aria-label") === "Add loose brick",
    );
    expect(addBrickButton).toBeTruthy();
    // Verify it appears after the brick chip buttons
    const addBrickIdx = buttons.indexOf(addBrickButton!);
    const chipIdx = buttons.findIndex((b) =>
      b.getAttribute("aria-label")?.includes("brick A"),
    );
    expect(addBrickIdx).toBeGreaterThan(chipIdx);
  });
});

// ─── C-m3-011: chevron toggles expanded; aria-expanded updates ────────────────

describe("C-m3-011: LooseBricksTray chevron toggles expanded", () => {
  it("clicking chevron changes aria-expanded to true", async () => {
    const user = userEvent.setup();
    render(
      <LooseBricksTray
        looseBricks={[looseBrickA]}
        categories={[cat1]}
        onAddBrick={vi.fn()}
      />,
    );
    const region = screen.getByRole("region", { name: /loose bricks/i });
    // Find chevron toggle button
    const chevron = screen.getByRole("button", {
      name: /expand loose bricks|collapse loose bricks/i,
    });
    await user.click(chevron);
    expect(region.getAttribute("aria-expanded")).toBe("true");
  });

  it("when expanded, bricks render as md chips in vertical list (role='list')", async () => {
    const user = userEvent.setup();
    render(
      <LooseBricksTray
        looseBricks={[looseBrickA]}
        categories={[cat1]}
        onAddBrick={vi.fn()}
      />,
    );
    const chevron = screen.getByRole("button", {
      name: /expand loose bricks|collapse loose bricks/i,
    });
    await user.click(chevron);
    // Should have a list role
    const list = screen.getByRole("list");
    expect(list).toBeTruthy();
    expect(within(list).getByRole("listitem")).toBeTruthy();
  });

  it("when expanded, a '+ Brick' ghost button is at the TOP of expanded view", async () => {
    const user = userEvent.setup();
    render(
      <LooseBricksTray
        looseBricks={[looseBrickA]}
        categories={[cat1]}
        onAddBrick={vi.fn()}
      />,
    );
    const chevron = screen.getByRole("button", {
      name: /expand loose bricks|collapse loose bricks/i,
    });
    await user.click(chevron);
    const addBrickBtns = screen.getAllByRole("button", {
      name: /add loose brick|add brick|\+ brick/i,
    });
    expect(addBrickBtns.length).toBeGreaterThan(0);
  });

  it("clicking chevron again returns to collapsed (aria-expanded=false)", async () => {
    const user = userEvent.setup();
    render(
      <LooseBricksTray
        looseBricks={[looseBrickA]}
        categories={[cat1]}
        onAddBrick={vi.fn()}
      />,
    );
    const region = screen.getByRole("region", { name: /loose bricks/i });
    const chevron = screen.getByRole("button", {
      name: /expand loose bricks|collapse loose bricks/i,
    });
    await user.click(chevron);
    expect(region.getAttribute("aria-expanded")).toBe("true");
    await user.click(chevron);
    expect(region.getAttribute("aria-expanded")).toBe("false");
  });
});

// ─── C-m3-012: "+ Brick" pill always visible; calls onAddBrick ────────────────

describe("C-m3-012: LooseBricksTray + Brick pill calls onAddBrick", () => {
  it("clicking + Brick pill in collapsed row calls onAddBrick once", async () => {
    const user = userEvent.setup();
    const onAddBrick = vi.fn();
    render(
      <LooseBricksTray
        looseBricks={[looseBrickA]}
        categories={[cat1]}
        onAddBrick={onAddBrick}
      />,
    );
    const addBrick = screen.getByRole("button", { name: /add loose brick/i });
    await user.click(addBrick);
    expect(onAddBrick).toHaveBeenCalledTimes(1);
  });

  it("with looseBricks=[] (tray visible), + Brick pill is still present", () => {
    render(
      <LooseBricksTray looseBricks={[]} categories={[]} onAddBrick={vi.fn()} />,
    );
    const addBrick = screen.getByRole("button", { name: /add loose brick/i });
    expect(addBrick).toBeInTheDocument();
  });
});

// ─── C-m4b-021: LooseBricksTray threads onUnitsOpenSheet to inner units BrickChip ─
// M4f: goal→units rename; stepper removed (ADR-043).
// Tap now opens UnitsEntrySheet via onUnitsOpenSheet prop chain.

describe("C-m4b-021: LooseBricksTray threads onUnitsOpenSheet down to BrickChip (M4f)", () => {
  const looseUnits: Brick = {
    id: "loose-g1",
    name: "pushups",
    kind: "units",
    hasDuration: false,
    done: 3,
    target: 10,
    unit: "reps",
    categoryId: "c1",
    parentBlockId: null,
  };

  it("tapping loose units chip calls onUnitsOpenSheet with brick.id", async () => {
    const user = userEvent.setup();
    const onUnitsOpenSheet = vi.fn();
    render(
      <LooseBricksTray
        looseBricks={[looseUnits]}
        categories={[cat1]}
        onAddBrick={vi.fn()}
        onUnitsOpenSheet={onUnitsOpenSheet}
      />,
    );
    // Expand the tray (collapsed mode shows sm chips; expand for default md path)
    const expand = screen.getByRole("button", { name: /expand loose bricks/i });
    await user.click(expand);

    // M4f: units chip is a single button (no stepper), tap opens sheet
    const chipBtn = screen.getByRole("button", { name: /pushups.*units/i });
    await user.click(chipBtn);
    expect(onUnitsOpenSheet).toHaveBeenCalledWith("loose-g1");
  });
});

// ─── C-m4e-022: LooseBricksTray renders only pre-filtered hasDuration:false bricks

describe("C-m4e-022: LooseBricksTray renders pre-filtered list (no timed bricks)", () => {
  it("renders exactly 2 chips when passed 2 hasDuration:false bricks; no brick-time-window", () => {
    const brickA: Brick = {
      id: "r1",
      name: "Walk",
      kind: "tick",
      hasDuration: false,
      done: false,
      categoryId: null,
      parentBlockId: null,
    };
    const brickB: Brick = {
      id: "r2",
      name: "Read",
      kind: "tick",
      hasDuration: false,
      done: false,
      categoryId: null,
      parentBlockId: null,
    };
    render(
      <LooseBricksTray
        looseBricks={[brickA, brickB]}
        categories={[]}
        onAddBrick={vi.fn()}
      />,
    );
    // Both chips are accessible buttons
    expect(screen.getByRole("button", { name: /walk/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /read/i })).toBeInTheDocument();
    // No time-window badge (bricks have hasDuration:false)
    expect(
      document.querySelector("[data-testid='brick-time-window']"),
    ).toBeNull();
  });
});

// ─── C-m4e-023: LooseBricksTray hidden when filtered list is empty + no blocks

describe("C-m4e-023: LooseBricksTray hidden when empty+no blocks; shown when empty+blocks exist", () => {
  it("queryByTestId('loose-bricks-tray') is null when looseBricks=[] and blocksExist=false", () => {
    render(
      <LooseBricksTray
        looseBricks={[]}
        blocksExist={false}
        categories={[]}
        onAddBrick={vi.fn()}
      />,
    );
    expect(
      document.querySelector("[data-testid='loose-bricks-tray']"),
    ).toBeNull();
  });

  it("tray IS in DOM when looseBricks=[] and blocksExist=true", () => {
    render(
      <LooseBricksTray
        looseBricks={[]}
        blocksExist={true}
        categories={[]}
        onAddBrick={vi.fn()}
      />,
    );
    expect(
      document.querySelector("[data-testid='loose-bricks-tray']"),
    ).not.toBeNull();
  });
});

// C-m4c-020: LooseBricksTray timer pass-through — RETIRED in M4f (ADR-043).
// kind:"time" removed; runningTimerBrickId removed from AppState.
// Coverage replaced by C-m4b-021 units chip thread-through above.

vi.mock("@/lib/haptics", () => ({
  haptics: {
    light: vi.fn(),
    medium: vi.fn(),
    success: vi.fn(),
    notification: vi.fn(),
  },
}));

// Regression: onTickToggle still works for tick bricks in tray
describe("M4f regression: onTickToggle still works for tick bricks in tray", () => {
  const looseTickBrick: Brick = {
    id: "tick1",
    name: "Morning stretch",
    kind: "tick",
    hasDuration: false,
    done: false,
    categoryId: null,
    parentBlockId: null,
  };

  it("onTickToggle fires when tick chip in expanded tray is clicked", async () => {
    const user = userEvent.setup();
    const onTickToggle = vi.fn();
    render(
      <LooseBricksTray
        looseBricks={[looseTickBrick]}
        categories={[]}
        onAddBrick={vi.fn()}
        onTickToggle={onTickToggle}
      />,
    );
    const expand = screen.getByRole("button", {
      name: /expand loose bricks/i,
    });
    await user.click(expand);

    // Find the tick chip
    const tickChip = screen.getByRole("button", {
      name: /Morning stretch/,
    });
    await user.click(tickChip);
    expect(onTickToggle).toHaveBeenCalledWith("tick1");
  });
});
