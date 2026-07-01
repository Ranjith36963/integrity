/**
 * C-m0-001: Button renders with primary+md defaults.
 * C-m0-002: Button renders all (variant, size) pairs with distinct classes.
 * C-m0-003: Button loading state shows spinner, sets aria-busy.
 * C-m0-004: Button disabled prevents click, applies opacity classes.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button, buttonVariants } from "./Button";

// C-m0-001
describe("C-m0-001: Button renders with primary+md defaults", () => {
  it("renders a <button> with primary+md variant classes and min-w-[44px] and h-11", () => {
    render(<Button>Tap</Button>);
    const btn = screen.getByRole("button", { name: "Tap" });
    expect(btn.tagName).toBe("BUTTON");
    const classes = btn.className;
    // Verify the default variant classes from cva are present
    const primaryMdClasses = buttonVariants({ variant: "primary", size: "md" });
    // Split and check key classes
    expect(classes).toContain("bg-[var(--accent)]");
    expect(classes).toContain("h-[48px]");
    expect(classes).toContain("min-w-[44px]");
    expect(primaryMdClasses).toContain("bg-[var(--accent)]");
    expect(primaryMdClasses).toContain("h-[48px]");
  });
});

// C-m0-002
describe("C-m0-002: Button renders all variant+size pairs with distinct classes", () => {
  const variants = ["primary", "secondary", "ghost"] as const;
  const sizes = ["sm", "md", "lg"] as const;
  // sm uses min-h-[44px] (tap target compliant); md/lg both use h-[48px]
  const sizeHeights: Record<(typeof sizes)[number], string> = {
    sm: "min-h-[44px]",
    md: "h-[48px]",
    lg: "h-[48px]",
  };

  it("all 9 combinations produce distinct class strings", () => {
    const classSets = new Set<string>();
    for (const variant of variants) {
      for (const size of sizes) {
        const classes = buttonVariants({ variant, size });
        classSets.add(classes);
      }
    }
    expect(classSets.size).toBe(9);
  });

  it.each(sizes)("size=%s maps to correct height token", (size) => {
    const classes = buttonVariants({ size });
    expect(classes).toContain(sizeHeights[size]);
  });
});

// C-m0-003
describe("C-m0-003: Button loading state", () => {
  it("shows spinner element and hides children text when loading", () => {
    render(<Button loading>Tap</Button>);
    const btn = screen.getByRole("button");
    // Children text should not be accessible
    expect(btn).not.toHaveTextContent("Tap");
    // Spinner element present
    expect(btn.querySelector("[data-loading='true']")).toBeTruthy();
    // aria-busy set
    expect(btn).toHaveAttribute("aria-busy", "true");
  });

  it("retains height ≥44px in loading state (h-[48px] class present)", () => {
    render(<Button loading>Tap</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("h-[48px]");
  });
});

// C-m0-004
describe("C-m0-004: Button disabled state", () => {
  it("does not call onClick when disabled", async () => {
    const spy = vi.fn();
    render(
      <Button disabled onClick={spy}>
        Tap
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Tap" });
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(spy).not.toHaveBeenCalled();
  });

  it("has disabled:pointer-events-none and disabled:opacity-50 classes", () => {
    render(<Button disabled>Tap</Button>);
    const btn = screen.getByRole("button", { name: "Tap" });
    expect(btn.className).toContain("disabled:pointer-events-none");
    expect(btn.className).toContain("disabled:opacity-50");
  });
});

// C-m0-024 — BT-1 mutation guard: disabled || loading, not ??
describe("C-m0-024: loading=true with explicit disabled=false still disables", () => {
  it("does not call onClick when loading=true and disabled=false (was BT-1)", async () => {
    const spy = vi.fn();
    render(
      <Button loading disabled={false} onClick={spy}>
        Save
      </Button>,
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    await userEvent.click(btn);
    expect(spy).not.toHaveBeenCalled();
  });
});

// C-m0-025 — BT-2 mutation guard: nameless busy button with non-string children
describe("C-m0-025: loading button with non-string children + no aria-label gets a fallback name", () => {
  it("renders aria-label='Loading' when loading + non-string children + no aria-label", () => {
    render(
      <Button loading>
        <span>Save</span>
      </Button>,
    );
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-label", "Loading");
  });

  it("uses string children as aria-label even with loading", () => {
    render(<Button loading>Save</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-label", "Save");
  });

  it("explicit aria-label wins over fallback", () => {
    render(
      <Button loading aria-label="Saving">
        <span>Save</span>
      </Button>,
    );
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-label", "Saving");
  });
});
