import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BuildingClient } from "./BuildingClient";

// C-bld-034: BuildingClient mounts with blocks=[] and EmptyBlocks copy is visible
describe("C-bld-034: BuildingClient initializes with empty blocks", () => {
  it("renders EmptyBlocks copy when no blocks are present", () => {
    render(<BuildingClient />);
    expect(
      screen.getByText("No blocks yet. Tap + to add your first block."),
    ).toBeInTheDocument();
  });
});

// C-bld-035: No blocks → BlueprintBar is NOT in the DOM
describe("C-bld-035: BlueprintBar absent when blocks is empty", () => {
  it("BlueprintBar is not in the DOM with empty blocks", () => {
    const { container } = render(<BuildingClient />);
    const segments = container.querySelectorAll(
      "[data-testid='blueprint-segment']",
    );
    expect(segments).toHaveLength(0);
  });
});

// C-bld-036: No blocks → NowCard is NOT in the DOM
describe("C-bld-036: NowCard absent when blocks is empty", () => {
  it("NowCard now-glow element is not in the DOM with empty blocks", () => {
    const { container } = render(<BuildingClient />);
    const nowGlow = container.querySelector(".now-glow");
    expect(nowGlow).toBeNull();
  });
});
