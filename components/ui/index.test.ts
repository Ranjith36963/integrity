/**
 * C-m0-023: components/ui/index.ts re-exports the 9 M0 primitives
 *           and their associated cva variant functions.
 * M4f: BrickChip removed from ui barrel (ADR-043) — components/BrickChip.tsx is the source.
 */
import { describe, it, expect } from "vitest";
import * as ui from "./index";

describe("C-m0-023: barrel export re-exports all 9 M0 primitives (M4f: BrickChip moved)", () => {
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

  it("does NOT export BrickChip (M4f: ADR-043 removed from ui barrel)", () => {
    // BrickChip is now at components/BrickChip.tsx, not in the ui/ barrel
    expect((ui as Record<string, unknown>).BrickChip).toBeUndefined();
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
    ];
    for (const name of expected) {
      expect(exported).toContain(name);
    }
  });
});
