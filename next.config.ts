import type { NextConfig } from "next";

// Capacitor build mode: when CAPACITOR_BUILD=true, emit a fully-static
// export so the WebView (iOS / Android) can serve from file://. Vercel
// dev/preview never sets this flag, so the standard Next.js build path
// (image optimization, future ISR, etc.) is unaffected.
const isCapacitorBuild = process.env.CAPACITOR_BUILD === "true";

const baseConfig: NextConfig = {
  // Disable the Next.js dev toolbar so Playwright button-count tests
  // are not affected by framework-injected UI (E-m0-003).
  devIndicators: false,
};

const capacitorOverrides: Partial<NextConfig> = {
  // Switch the output to a static export only for native builds.
  // Side effects of "export": no /api routes, no next/image optimization
  // (use direct <img>), and no headers/redirects from next.config.
  // Dharma doesn't use any of those, so the trade is free.
  output: "export",
  // Capacitor serves via capacitor://localhost — relative paths required.
  trailingSlash: true,
  images: { unoptimized: true },
};

const nextConfig: NextConfig = isCapacitorBuild
  ? { ...baseConfig, ...capacitorOverrides }
  : baseConfig;

export default nextConfig;
