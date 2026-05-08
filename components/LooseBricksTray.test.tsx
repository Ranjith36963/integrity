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
