/**
 * app/manifest.test.ts — PWA web-app-manifest contract.
 *
 * The manifest must advertise real raster icons (not only the SVG) so Android
 * Chrome and the install prompt get a proper home-screen icon, plus a dedicated
 * `maskable` icon so the launcher can mask it without clipping the artwork.
 * iOS ignores the manifest icons entirely (it uses apple-touch-icon, asserted
 * in the layout metadata) — but Android relies on exactly these entries.
 */
import { describe, it, expect } from "vitest";
import manifest from "./manifest";

const m = manifest();

describe("web app manifest", () => {
  it("is a standalone, portrait installable app", () => {
    expect(m.display).toBe("standalone");
    expect(m.orientation).toBe("portrait");
    expect(m.start_url).toBe("/");
    expect(m.name).toBe("Dharma");
  });

  it("declares 192 and 512 PNG icons for Android install", () => {
    const png = (m.icons ?? []).filter((i) => i.type === "image/png");
    const sizes = png.map((i) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });

  it("declares at least one maskable icon", () => {
    const maskable = (m.icons ?? []).filter((i) =>
      (i.purpose ?? "").includes("maskable"),
    );
    expect(maskable.length).toBeGreaterThanOrEqual(1);
    expect(maskable[0].sizes).toBe("512x512");
  });

  it("keeps the scalable SVG icon", () => {
    const svg = (m.icons ?? []).find((i) => i.type === "image/svg+xml");
    expect(svg).toBeTruthy();
    expect(svg!.src).toBe("/icon.svg");
  });

  it("theme + background colors match the app shell", () => {
    expect(m.theme_color).toBe("#0a1628");
    expect(m.background_color).toBe("#0a1628");
  });
});
