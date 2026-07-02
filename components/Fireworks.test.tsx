// components/Fireworks.test.tsx — M4a Fireworks overlay tests + M7d source-inspection regression
// Covers: C-m4a-013, C-m4a-014, C-m7d-015

import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { Fireworks } from "./Fireworks";

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return {
    ...actual,
    useReducedMotion: vi.fn(() => false),
  };
});

// ─── C-m4a-013: Fireworks renders overlay with aria-hidden + bounded particles ─

describe("C-m4a-013: Fireworks active=true renders overlay with aria-hidden and bounded particles", () => {
  it("renders fireworks overlay with aria-hidden='true' and pointer-events:none", () => {
    const { container } = render(<Fireworks active={true} />);
    const overlay = container.querySelector(
      "[data-testid='fireworks']",
    ) as HTMLElement;
    expect(overlay).not.toBeNull();
    expect(overlay.getAttribute("aria-hidden")).toBe("true");
    expect(overlay.style.pointerEvents).toBe("none");
  });

  it("particle count is bounded (≤ 16 child nodes)", () => {
    const { container } = render(<Fireworks active={true} />);
    const overlay = container.querySelector("[data-testid='fireworks']");
    expect(overlay).not.toBeNull();
    // The overlay itself + its children (particles)
    const particles = overlay!.children;
    expect(particles.length).toBeLessThanOrEqual(16);
  });
});

// ─── C-m4a-014: reduced-motion suppresses Fireworks overlay ───────────────────

describe("C-m4a-014: Fireworks renders null when useReducedMotion=true", () => {
  it("returns null (nothing rendered) when useReducedMotion is true", async () => {
    const { useReducedMotion } = await import("motion/react");
    vi.mocked(useReducedMotion).mockReturnValue(true);
    const { container } = render(<Fireworks active={true} />);
    expect(container.firstChild).toBeNull();
  });
});

// ─── C-m7d-015: Fireworks.tsx unchanged by M7d; no new public assets ──────────

describe("C-m7d-015: components/Fireworks.tsx is UNCHANGED by M7d; no new assets under public/", () => {
  it("Fireworks.tsx contains PARTICLE_COUNT = 12", () => {
    const src = readFileSync(
      join(process.cwd(), "components/Fireworks.tsx"),
      "utf-8",
    );
    expect(src).toContain("PARTICLE_COUNT = 12");
  });

  it("Fireworks.tsx COLORS array has 6 string literal entries (M4a-known)", () => {
    const src = readFileSync(
      join(process.cwd(), "components/Fireworks.tsx"),
      "utf-8",
    );
    // COLORS array has exactly 6 string entries — count quoted string literals inside the array
    // Note: use [\s\S] instead of . with /s flag (target ES2017, /s requires ES2018)
    const match = src.match(/const COLORS\s*=\s*\[([\s\S]*?)\]/);
    expect(match).not.toBeNull();
    // Count entries by counting occurrences of quoted strings (both single and double quotes)
    const stringLiterals = match![1].match(/["'][^"']+["']/g);
    expect(stringLiterals).not.toBeNull();
    expect(stringLiterals!).toHaveLength(6);
  });

  it("Fireworks.tsx contains the M4a-known 1700ms setTimeout constant", () => {
    const src = readFileSync(
      join(process.cwd(), "components/Fireworks.tsx"),
      "utf-8",
    );
    expect(src).toContain("1700");
  });

  it("public/sounds/chime.mp3 exists with 431 bytes (M4a placeholder, UNCHANGED)", () => {
    const chimePath = join(process.cwd(), "public/sounds/chime.mp3");
    const stat = statSync(chimePath);
    expect(stat.size).toBe(431);
  });

  it("public/ contains no unexpected assets (no Lottie/audio/font bloat; only the known app + PWA set)", () => {
    // M7d is forbidden from adding Lottie files, new SVGs, new audio, new fonts.
    // The PWA-hardening feature legitimately adds the offline service worker and
    // the raster/maskable/apple icons — those are enumerated here. The guard
    // still fails loudly if ANY other unexpected asset appears under public/.
    const publicDir = join(process.cwd(), "public");
    const entries = (
      readdirSync(publicDir, { recursive: false }) as string[]
    ).sort();
    const known = [
      "icon.svg", // app icon (M0)
      "sounds", // M4a chime placeholder
      "sw.js", // PWA offline service worker
      "icon-192.png", // PWA install icon
      "icon-512.png", // PWA install icon
      "icon-maskable-512.png", // PWA maskable icon
      "apple-touch-icon.png", // iOS home-screen icon
    ].sort();
    expect(entries).toEqual(known);
  });
});
