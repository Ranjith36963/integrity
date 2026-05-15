/**
 * C-m0-008: Chip renders all tone×selected×size combos with correct classes.
 *           size="sm" instances have a wrapper enforcing min-w/h-[44px].
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Chip, chipVariants } from "./Chip";
import type { ChipTone } from "./Chip";

// C-m0-008
describe("C-m0-008: Chip variant matrix", () => {
  const tones: ChipTone[] = [
    "neutral",
    "category-health",
    "category-mind",
    "category-career",
    "category-passive",
  ];
  it("selected=true shows filled bg class, unselected shows bg-transparent", () => {
    for (const tone of tones) {
      const selectedClasses = chipVariants({ tone, selected: true });
      const unselectedClasses = chipVariants({ tone, selected: false });
      // Selected must have a bg- class for the tone
      expect(selectedClasses).toMatch(/bg-\[--/);
      // Unselected should be transparent
      expect(unselectedClasses).toContain("bg-transparent");
    }
  });

  it("size='sm' wrapper enforces min-w-[44px] min-h-[44px]", () => {
    render(
      <Chip size="sm" tone="neutral">
        SM
      </Chip>,
    );
    const btn = screen.getByRole("button", { name: "SM" });
    const wrapper = btn.parentElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper!.className).toContain("min-h-[44px]");
    expect(wrapper!.className).toContain("min-w-[44px]");
  });

  it("size='md' does not add extra wrapper", () => {
    render(
      <Chip size="md" tone="neutral">
        MD
      </Chip>,
    );
    const btn = screen.getByRole("button", { name: "MD" });
    // Parent should be the test container, not a wrapper span
    expect(btn.parentElement?.tagName).not.toBe("SPAN");
  });

  it("all 10 tone combos produce different class strings", () => {
    const classSets = new Set<string>();
    for (const tone of tones) {
      classSets.add(chipVariants({ tone, selected: false }));
      classSets.add(chipVariants({ tone, selected: true }));
    }
    expect(classSets.size).toBe(10);
  });
});
