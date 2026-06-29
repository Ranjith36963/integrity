// components/VoiceCaptureOverlay.test.tsx
// Component tests: C-m10-006..013
// Covers: VoiceCaptureOverlay — dialog semantics, interim text, cancel, ESC, backdrop, PRM, focus.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VoiceCaptureOverlay } from "./VoiceCaptureOverlay";

// ─── C-m10-006: dialog semantics + empty interim placeholder ─────────────────

describe("C-m10-006: VoiceCaptureOverlay — dialog + 'Listening…' placeholder", () => {
  it("dialog role, aria-modal, aria-label, and 'Listening…' placeholder when interim empty", () => {
    render(
      <VoiceCaptureOverlay
        open
        interim=""
        onCancel={vi.fn()}
        prefersReducedMotion={false}
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "Listening");
    expect(screen.getByText("Listening…")).toBeInTheDocument();
  });
});

// ─── C-m10-007: interim text shown in live region ────────────────────────────

describe("C-m10-007: VoiceCaptureOverlay — interim text shown in live region", () => {
  it("role=status aria-live=polite region contains the interim text", () => {
    render(
      <VoiceCaptureOverlay
        open
        interim="morning workout"
        onCancel={vi.fn()}
        prefersReducedMotion={false}
      />,
    );
    const liveRegion = screen.getByRole("status");
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
    expect(liveRegion).toHaveTextContent("morning workout");
  });
});

// ─── C-m10-008: Cancel button fires onCancel ─────────────────────────────────

describe("C-m10-008: VoiceCaptureOverlay — Cancel button fires onCancel", () => {
  it("clicking Cancel calls onCancel exactly once", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <VoiceCaptureOverlay
        open
        interim="x"
        onCancel={onCancel}
        prefersReducedMotion={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

// ─── C-m10-009: ESC key fires onCancel ───────────────────────────────────────

describe("C-m10-009: VoiceCaptureOverlay — ESC fires onCancel", () => {
  it("pressing Escape calls onCancel", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <VoiceCaptureOverlay
        open
        interim=""
        onCancel={onCancel}
        prefersReducedMotion={false}
      />,
    );
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

// ─── C-m10-010: backdrop click fires onCancel ────────────────────────────────

describe("C-m10-010: VoiceCaptureOverlay — backdrop click fires onCancel", () => {
  it("clicking the backdrop calls onCancel", () => {
    const onCancel = vi.fn();
    render(
      <VoiceCaptureOverlay
        open
        interim=""
        onCancel={onCancel}
        prefersReducedMotion={false}
      />,
    );
    const backdrop = screen.getByTestId("voice-overlay-backdrop");
    fireEvent.click(backdrop);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

// ─── C-m10-011: PRM=true → static ring (no pulse class) ──────────────────────

describe("C-m10-011: VoiceCaptureOverlay — PRM=true → static ring", () => {
  it("no pulse animation class when prefersReducedMotion=true", () => {
    const { container } = render(
      <VoiceCaptureOverlay
        open
        interim=""
        onCancel={vi.fn()}
        prefersReducedMotion={true}
      />,
    );
    // The pulse indicator must NOT have the animate class
    const pulseEl = container.querySelector("[data-testid='voice-ring']");
    expect(pulseEl).not.toBeNull();
    expect(pulseEl!.className).not.toMatch(/animate-/);
    // Should have static ring class
    expect(pulseEl!.getAttribute("data-prm")).toBe("true");
  });
});

// ─── C-m10-012: PRM=false → animated ring ────────────────────────────────────

describe("C-m10-012: VoiceCaptureOverlay — PRM=false → animated ring", () => {
  it("pulse animation class present when prefersReducedMotion=false", () => {
    const { container } = render(
      <VoiceCaptureOverlay
        open
        interim=""
        onCancel={vi.fn()}
        prefersReducedMotion={false}
      />,
    );
    const pulseEl = container.querySelector("[data-testid='voice-ring']");
    expect(pulseEl).not.toBeNull();
    expect(pulseEl!.getAttribute("data-prm")).toBe("false");
  });
});

// ─── C-m10-013: focus moves to Cancel on open ────────────────────────────────

describe("C-m10-013: VoiceCaptureOverlay — focus moves to Cancel on mount", () => {
  it("Cancel button receives focus when overlay opens", async () => {
    render(
      <VoiceCaptureOverlay
        open
        interim=""
        onCancel={vi.fn()}
        prefersReducedMotion={false}
      />,
    );
    // Wait for the focus effect
    await new Promise((r) => setTimeout(r, 20));
    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    expect(document.activeElement).toBe(cancelBtn);
  });
});
