/**
 * C-m0-023: components/ui/index.ts re-exports exactly the 10 primitives
 *           and their associated cva variant functions.
 */
import { describe, it, expect } from "vitest";
import * as ui from "./index";

describe("C-m0-023: barrel export re-exports all 10 primitives", () => {
  it("exports Button and buttonVariants", () => {
    // Button uses React.forwardRef so typeof is "object" with render function
    expect(ui.Button).toBeTruthy();
    expect(typeof ui.buttonVariants).toBe("function");
  });

  it("exports Modal", () => {
    expect(typeof ui.Modal).toBe("function");
  });

  it("exports Sheet", () => {
    expect(typeof ui.Sheet).toBe("function");
  });

  it("exports Chip and chipVariants", () => {
    expect(typeof ui.Chip).toBe("function");
    expect(typeof ui.chipVariants).toBe("function");
  });

  it("exports Input", () => {
    expect(typeof ui.Input).toBe("function");
  });

  it("exports Stepper", () => {
    expect(typeof ui.Stepper).toBe("function");
  });

  it("exports Toggle", () => {
    expect(typeof ui.Toggle).toBe("function");
  });

  it("exports EmptyState", () => {
    expect(typeof ui.EmptyState).toBe("function");
  });

  it("exports BlockCard", () => {
    expect(typeof ui.BlockCard).toBe("function");
  });

  it("exports BrickChip", () => {
    expect(typeof ui.BrickChip).toBe("function");
  });

  it("exports exactly the named exports and no unlisted extras", () => {
    const exported = Object.keys(ui);
    const expected = [
      "Button",
      "buttonVariants",
      "Modal",
      "Sheet",
      "Chip",
      "chipVariants",
      "Input",
      "Stepper",
      "Toggle",
      "EmptyState",
      "BlockCard",
      "BrickChip",
    ];
    for (const name of expected) {
      expect(exported).toContain(name);
    }
  });
});
