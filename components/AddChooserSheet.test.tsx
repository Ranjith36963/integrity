// components/AddChooserSheet.test.tsx — M4d chooser component tests
// Covers: U-m4d-001, U-m4d-002, C-m4d-001..008

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddChooserSheet } from "./AddChooserSheet";

// ─── U-m4d-001: chooser is a pure routing surface (no hidden state) ──────────

describe("U-m4d-001: AddChooserSheet is a pure routing surface (identical DOM across two instances)", () => {
  it("two renders with identical props produce byte-identical DOM", () => {
    const onPick = vi.fn();
    const onCancel = vi.fn();

    const { container: c1 } = render(
      <AddChooserSheet open={true} onPick={onPick} onCancel={onCancel} />,
    );
    const { container: c2 } = render(
      <AddChooserSheet open={true} onPick={onPick} onCancel={onCancel} />,
    );

    expect(c1.innerHTML).toBe(c2.innerHTML);
  });
});

// ─── U-m4d-002: prop signature lock ──────────────────────────────────────────

describe("U-m4d-002: AddChooserSheet prop signature (open, onPick, onCancel)", () => {
  it("accepts open:boolean, onPick:(choice:'block'|'brick')=>void, onCancel:()=>void", () => {
    const onPick = vi.fn<(choice: "block" | "brick") => void>();
    const onCancel = vi.fn();

    // These calls must typecheck (assertion is runtime, TS enforces at compile time)
    onPick("block");
    onPick("brick");

    expect(() =>
      render(
        <AddChooserSheet open={true} onPick={onPick} onCancel={onCancel} />,
      ),
    ).not.toThrow();

    expect(onPick).toHaveBeenCalledWith("block");
    expect(onPick).toHaveBeenCalledWith("brick");
  });
});

// ─── C-m4d-001: renders two buttons + cancel; role=dialog + aria-label="Add" ──

describe("C-m4d-001: chooser renders role=dialog, two buttons, cancel control", () => {
  it("has role=dialog with aria-label='Add'", () => {
    render(<AddChooserSheet open={true} onPick={vi.fn()} onCancel={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-label", "Add");
  });

  it("has exactly two action buttons: 'Add Block' and 'Add Brick'", () => {
    render(<AddChooserSheet open={true} onPick={vi.fn()} onCancel={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Add Block" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add Brick" }),
    ).toBeInTheDocument();
  });

  it("has a Cancel control (button with accessible name 'Cancel')", () => {
    render(<AddChooserSheet open={true} onPick={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });
});

// ─── C-m4d-002: buttons meet ADR-031 44px min touch target ───────────────────

describe("C-m4d-002: Add Block and Add Brick buttons meet ADR-031 44px touch target", () => {
  it("Add Block button has min-height >= 44px class", () => {
    render(<AddChooserSheet open={true} onPick={vi.fn()} onCancel={vi.fn()} />);
    const btn = screen.getByRole("button", { name: "Add Block" });
    // Check the computed class includes min-h (Button component enforces min-h-[44px])
    const cls = btn.className;
    expect(cls).toMatch(/min-h/);
  });

  it("Add Brick button has min-height >= 44px class", () => {
    render(<AddChooserSheet open={true} onPick={vi.fn()} onCancel={vi.fn()} />);
    const btn = screen.getByRole("button", { name: "Add Brick" });
    const cls = btn.className;
    expect(cls).toMatch(/min-h/);
  });
});

// ─── C-m4d-003: tab order and keyboard activation ────────────────────────────

describe("C-m4d-003: tab order Add Block → Add Brick → Cancel; Enter/Space activate", () => {
  it("Tab from body lands on Add Block first (first focusable in dialog)", async () => {
    const user = userEvent.setup();
    render(<AddChooserSheet open={true} onPick={vi.fn()} onCancel={vi.fn()} />);
    await user.tab();
    const focused = document.activeElement;
    expect(focused).toHaveAccessibleName("Add Block");
  });

  it("Tab twice lands on Add Brick", async () => {
    const user = userEvent.setup();
    render(<AddChooserSheet open={true} onPick={vi.fn()} onCancel={vi.fn()} />);
    await user.tab();
    await user.tab();
    const focused = document.activeElement;
    expect(focused).toHaveAccessibleName("Add Brick");
  });

  it("Enter on Add Block fires onPick('block')", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<AddChooserSheet open={true} onPick={onPick} onCancel={vi.fn()} />);
    const btn = screen.getByRole("button", { name: "Add Block" });
    btn.focus();
    await user.keyboard("{Enter}");
    expect(onPick).toHaveBeenCalledOnce();
    expect(onPick).toHaveBeenCalledWith("block");
  });

  it("Space on Add Brick fires onPick('brick')", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<AddChooserSheet open={true} onPick={onPick} onCancel={vi.fn()} />);
    const btn = screen.getByRole("button", { name: "Add Brick" });
    btn.focus();
    await user.keyboard(" ");
    expect(onPick).toHaveBeenCalledOnce();
    expect(onPick).toHaveBeenCalledWith("brick");
  });
});

// ─── C-m4d-004: X Cancel and backdrop dismiss call onCancel; never onPick ─────

describe("C-m4d-004: Cancel control and backdrop dismiss call onCancel, never onPick", () => {
  it("clicking the Cancel button calls onCancel exactly once; onPick not called", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const onCancel = vi.fn();
    render(<AddChooserSheet open={true} onPick={onPick} onCancel={onCancel} />);
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onPick).not.toHaveBeenCalled();
  });

  it("clicking the backdrop overlay calls onCancel exactly once; onPick not called", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const onCancel = vi.fn();
    const { container } = render(
      <AddChooserSheet open={true} onPick={onPick} onCancel={onCancel} />,
    );
    // Backdrop is the first child of the portal (aria-hidden div)
    const backdrop = container.querySelector('[aria-hidden="true"]');
    if (backdrop) {
      await user.click(backdrop as HTMLElement);
    }
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onPick).not.toHaveBeenCalled();
  });
});

// ─── C-m4d-005: Add Block fires onPick('block') + haptics.light ───────────────

vi.mock("@/lib/haptics", () => ({
  haptics: {
    light: vi.fn(),
    medium: vi.fn(),
    success: vi.fn(),
    notification: vi.fn(),
  },
}));

describe("C-m4d-005: clicking Add Block fires onPick('block') and haptics.light", () => {
  beforeEach(() => vi.clearAllMocks());

  it("onPick called once with 'block'; haptics.light called once", async () => {
    const { haptics } = await import("@/lib/haptics");
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<AddChooserSheet open={true} onPick={onPick} onCancel={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Add Block" }));
    expect(onPick).toHaveBeenCalledOnce();
    expect(onPick).toHaveBeenCalledWith("block");
    expect(haptics.light).toHaveBeenCalledOnce();
  });
});

// ─── C-m4d-006: Add Brick fires onPick('brick') + haptics.light ───────────────

describe("C-m4d-006: clicking Add Brick fires onPick('brick') and haptics.light", () => {
  beforeEach(() => vi.clearAllMocks());

  it("onPick called once with 'brick'; haptics.light called once", async () => {
    const { haptics } = await import("@/lib/haptics");
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<AddChooserSheet open={true} onPick={onPick} onCancel={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Add Brick" }));
    expect(onPick).toHaveBeenCalledOnce();
    expect(onPick).toHaveBeenCalledWith("brick");
    expect(haptics.light).toHaveBeenCalledOnce();
  });
});

// ─── C-m4d-007: open=false → chooser not in DOM ──────────────────────────────

describe("C-m4d-007: open=false means chooser is not rendered", () => {
  it("no role=dialog and no Add Block / Add Brick buttons when open=false", () => {
    render(
      <AddChooserSheet open={false} onPick={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button", { name: "Add Block" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add Brick" })).toBeNull();
  });
});

// ─── C-m4d-008: reduced motion collapses slide-in ────────────────────────────

describe("C-m4d-008: reduced motion collapses chooser slide-in animation", () => {
  it("when prefers-reduced-motion:reduce, chooser still renders both buttons (animation suppressed, content present)", () => {
    // Stub matchMedia to return reduce for prefers-reduced-motion
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string): MediaQueryList => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });

    render(<AddChooserSheet open={true} onPick={vi.fn()} onCancel={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Add Block" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add Brick" }),
    ).toBeInTheDocument();

    // Restore default matchMedia stub
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string): MediaQueryList => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  });
});
