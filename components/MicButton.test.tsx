// components/MicButton.test.tsx
// Component tests: C-m10-001..005
// Covers: MicButton rendering, aria attributes, keyboard operability, supported/unsupported.

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MicButton } from "./MicButton";

vi.mock("@/lib/haptics", () => ({
  haptics: { light: vi.fn(), medium: vi.fn(), success: vi.fn() },
}));

// ─── C-m10-001: unsupported → null ───────────────────────────────────────────

describe("C-m10-001: MicButton supported=false → renders null", () => {
  it("nothing is rendered; no button or aria-label queryable", () => {
    const { container } = render(
      <MicButton supported={false} listening={false} onPress={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
    expect(
      screen.queryByRole("button", { name: /voice log/i }),
    ).not.toBeInTheDocument();
  });
});

// ─── C-m10-002: idle state aria ──────────────────────────────────────────────

describe("C-m10-002: MicButton supported, listening=false — idle aria", () => {
  it("renders button with aria-label='Start voice log' and aria-pressed='false'", () => {
    render(<MicButton supported={true} listening={false} onPress={vi.fn()} />);
    const btn = screen.getByRole("button", { name: "Start voice log" });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });
});

// ─── C-m10-003: listening state aria ─────────────────────────────────────────

describe("C-m10-003: MicButton supported, listening=true — active aria", () => {
  it("renders button with aria-label='Stop voice log' and aria-pressed='true'", () => {
    render(<MicButton supported={true} listening={true} onPress={vi.fn()} />);
    const btn = screen.getByRole("button", { name: "Stop voice log" });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });
});

// ─── C-m10-004: click fires onPress ──────────────────────────────────────────

describe("C-m10-004: MicButton click fires onPress", () => {
  it("clicking the button calls onPress exactly once", async () => {
    const onPress = vi.fn();
    const user = userEvent.setup();
    render(<MicButton supported={true} listening={false} onPress={onPress} />);
    await user.click(screen.getByRole("button", { name: "Start voice log" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

// ─── C-m10-005: keyboard operability ─────────────────────────────────────────

describe("C-m10-005: MicButton keyboard operability", () => {
  it("Enter key fires onPress (native button)", async () => {
    const onPress = vi.fn();
    const user = userEvent.setup();
    render(<MicButton supported={true} listening={false} onPress={onPress} />);
    const btn = screen.getByRole("button", { name: "Start voice log" });
    btn.focus();
    await user.keyboard("{Enter}");
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("Space key fires onPress (native button)", async () => {
    const onPress = vi.fn();
    const user = userEvent.setup();
    render(<MicButton supported={true} listening={false} onPress={onPress} />);
    const btn = screen.getByRole("button", { name: "Start voice log" });
    btn.focus();
    await user.keyboard(" ");
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
